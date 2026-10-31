#!/usr/bin/env python3
"""Prepare a self-contained private CPU notebook, submit it, and retrieve D3 evidence."""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import io
import json
import re
import subprocess
import sys
import tarfile
import time
from pathlib import Path

from kaggle_server import configuration, file_checksum, validate_config

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATHS = ["pom.xml", "mvnw", ".mvn", "src/main",
                "benchmark/generate_reports.py", "benchmark/k6/reporting.js"]


def dump(value):
    print(json.dumps(value, ensure_ascii=True), flush=True)


def source_bundle(root=ROOT):
    """Package committed app files plus the explicitly named new native harness."""
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    archive = subprocess.check_output(["git", "archive", "--format=tar", commit, "--", *SOURCE_PATHS], cwd=root)
    target = io.BytesIO()
    with tarfile.open(fileobj=io.BytesIO(archive)) as original, tarfile.open(fileobj=target, mode="w") as result:
        for member in original:
            if member.isdir():
                continue
            if not member.isfile():
                raise ValueError(f"Unsupported source archive member: {member.name}")
            result.addfile(member, original.extractfile(member))
        runtime = root / "benchmark/kaggle_server.py"
        payload = runtime.read_bytes()
        member = tarfile.TarInfo("benchmark/kaggle_server.py")
        member.size, member.mode = len(payload), 0o644
        result.addfile(member, io.BytesIO(payload))
    content = gzip.compress(target.getvalue(), mtime=0)
    return {
        "appCommit": commit,
        "runtimeSha256": hashlib.sha256(payload).hexdigest(),
        "bundleSha256": hashlib.sha256(content).hexdigest(),
        "bundle": base64.b64encode(content).decode("ascii"),
    }


def prepare(kernel, folder, profile="smoke", config_file=None, root=ROOT,
            runtime_dataset=None, runtime_manifest=None):
    if not re.fullmatch(r"[a-z0-9_-]+/[a-z0-9-]+", kernel):
        raise ValueError("Kernel must be owner/notebook-slug")
    config = json.loads(Path(config_file).read_text()) if config_file else configuration(profile)
    validate_config(config)
    folder = Path(folder).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    notebook = json.loads((root / "benchmark/kaggle_server_cpu.ipynb").read_text(encoding="utf-8"))
    job = source_bundle(root) | {"configuration": config}
    if runtime_dataset:
        if not re.fullmatch(r"[a-z0-9_-]+/[a-z0-9-]+", runtime_dataset) or not runtime_manifest:
            raise ValueError("Offline runtime needs owner/dataset-slug and --runtime-manifest")
        runtime = json.loads(Path(runtime_manifest).read_text())
        if runtime.get("kind") != "gdrn-offline-runtime" or runtime.get("appCommit") != job["appCommit"]:
            raise ValueError("Offline JAR must be built from the same committed application")
        job.update({"runtimeDataset": runtime_dataset, "runtimeArchiveSha256": runtime["archiveSha256"]})
    found = 0
    for cell in notebook["cells"]:
        if "gdrn-job-config" in cell.get("metadata", {}).get("tags", []):
            cell["source"] = ["import json\n", f"JOB = json.loads({json.dumps(job)!r})\n"]
            found += 1
        if cell["cell_type"] == "code":
            cell["execution_count"], cell["outputs"] = None, []
    if found != 1:
        raise ValueError("Notebook must have exactly one tagged job configuration cell")
    filename = "kaggle_server_cpu.ipynb"
    metadata = {
        "id": kernel, "title": kernel.split("/")[1].replace("-", " ").title(),
        "code_file": filename, "language": "python", "kernel_type": "notebook",
        "is_private": True, "enable_gpu": False, "enable_tpu": False,
        "enable_internet": not bool(runtime_dataset),
        "dataset_sources": [runtime_dataset] if runtime_dataset else [], "competition_sources": [],
        "kernel_sources": [], "model_sources": [],
    }
    (folder / filename).write_text(json.dumps(notebook, indent=2) + "\n", encoding="utf-8")
    (folder / "kernel-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    provenance = {key: value for key, value in job.items() if key != "bundle"}
    (folder / "job.json").write_text(json.dumps(provenance, indent=2) + "\n")
    return {"folder": str(folder), "kernel": kernel, **provenance}


def kaggle():
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
    except ImportError as cause:
        raise RuntimeError("Install benchmark/requirements-kaggle.txt in a dedicated environment") from cause
    api = KaggleApi()
    api.authenticate()
    return api


def upload_runtime(api, dataset, folder):
    """Upload only the named dependency archive/manifest, always as a private Dataset."""
    if not re.fullmatch(r"[a-z0-9_-]+/[a-z0-9-]+", dataset):
        raise ValueError("Dataset must be owner/dataset-slug")
    folder = Path(folder).resolve()
    manifest = json.loads((folder / "runtime-manifest.json").read_text())
    archive = folder / manifest["archive"]
    if (manifest.get("kind") != "gdrn-offline-runtime" or archive.parent != folder
            or archive.name != "gdrn-offline-runtime.bin"
            or file_checksum(archive) != manifest["archiveSha256"]):
        raise ValueError("Invalid offline runtime package or archive checksum")
    expected = {archive.name, "runtime-manifest.json", "dataset-metadata.json"}
    if any(path.name not in expected or not path.is_file() for path in folder.iterdir()):
        raise ValueError("Runtime upload folder must contain only archive, manifest and Dataset metadata")
    metadata = {
        "id": dataset, "title": "GDRN D3 private offline CPU runtime",
        "licenses": [{"name": "other"}],
        "description": "Private runtime for GDRN D3. Bundled third-party components retain their original licenses. "
                       "JAR built locally; Java backend, PostgreSQL/PostGIS and k6 run on Kaggle CPU.",
    }
    (folder / "dataset-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    response = api.dataset_create_new(str(folder), public=False, quiet=True, convert_to_csv=False)
    if response.error or getattr(response, "status", "").lower() in {"error", "failed"}:
        raise RuntimeError("Kaggle rejected private Dataset: " + response.error)
    return {"dataset": dataset, "private": True, "archiveSha256": manifest["archiveSha256"],
            "apiStatus": getattr(response, "status", None), "apiReference": getattr(response, "ref", None),
            "url": getattr(response, "url", None),
            "note": "Dataset ingestion may take several minutes; check kaggle datasets status before submitting."}


def submit(api, folder, timeout=3600):
    metadata = json.loads((Path(folder) / "kernel-metadata.json").read_text())
    if (metadata.get("is_private") is not True or metadata.get("enable_gpu") is not False
            or metadata.get("enable_tpu") is not False):
        raise ValueError("Submission must be explicitly private and CPU-only")
    response = api.kernels_push(str(folder), timeout=timeout)
    if response is None or response.error:
        raise RuntimeError("Kaggle rejected notebook: " + str(getattr(response, "error", "empty response")))
    version = response.versionNumber
    if not version:
        raise RuntimeError("Kaggle did not return a version; cannot track the exact submitted job")
    return {"kernel": metadata["id"], "version": version,
            "reference": f"{metadata['id']}/{version}", "url": response.url}


def status(api, reference):
    response = api.kernels_status(reference)
    state = str(getattr(response.status, "name", response.status)).rsplit(".", 1)[-1].lower()
    return {"reference": reference, "status": state,
            "failureMessage": response.failure_message or None}


def completed_evidence(manifest, folder):
    if not manifest or manifest.get("kind") != "gdrn-d3-server-on-kaggle":
        return False
    if manifest.get("status") != "complete" or manifest.get("cleanup", {}).get("status") != "complete":
        return False
    runs = manifest.get("runs", [])
    if not runs:
        return False
    hashes = manifest.get("artifactSha256", {})
    if not hashes:
        return False
    for name, digest in hashes.items():
        path = (folder / name).resolve()
        if not path.is_relative_to(folder.resolve()) or not path.is_file() or file_checksum(path) != digest:
            return False
    for run in runs:
        if run.get("exitCode") != 0 or run.get("workload") not in {"write", "read-page", "read-radius", "mixed"}:
            return False
        case = folder / f"{run['workload']}-{int(run['vus'])}vu-r{int(run['repetition'])}"
        if not all((case / name).is_file() and (case / name).stat().st_size > 0
                   for name in ("raw.json", "summary.json", "run.json", "process-stats.csv")):
            return False
        summary = json.loads((case / "summary.json").read_text())
        requests = summary.get("metrics", {}).get("benchmark_requests", {})
        if "setup_data" in summary or requests.get("values", requests).get("count", 0) < 1:
            return False
        if run["workload"] != "write" and not (case / "seed.json").is_file():
            return False
    return True


def download(api, reference, output, resume=False):
    output = Path(output).resolve()
    if output.exists() and any(output.iterdir()) and not resume:
        raise ValueError("Use a new/empty output directory to retain previous run evidence")
    files, _ = api.kernels_output(reference, str(output), quiet=True)
    manifests = list(output.rglob("manifest.json"))
    benchmark = json.loads(manifests[0].read_text()) if len(manifests) == 1 else None
    # A green kernel alone is not evidence of a completed benchmark.
    complete = completed_evidence(benchmark, manifests[0].parent) if benchmark else False
    evidence = {"reference": reference, "output": str(output), "downloadedFiles": len(files),
                "benchmarkComplete": complete,
                "benchmarkStatus": benchmark.get("status") if benchmark else "manifest-missing"}
    (output / "kaggle-download.json").write_text(json.dumps(evidence, indent=2) + "\n")
    return evidence


def wait_for(api, reference, output, timeout=3600, poll_seconds=20, resume=False):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        current = status(api, reference)
        dump(current)
        if current["status"] in {"complete", "error", "failed", "cancelled", "canceled", "cancel_ack"}:
            evidence = download(api, reference, output, resume=resume)
            dump(evidence)
            return 0 if current["status"] == "complete" and evidence["benchmarkComplete"] else 1
        time.sleep(max(1, min(poll_seconds, 60)))
    dump({"status": "local-wait-timeout", "reference": reference,
          "note": "Remote job is not cancelled; use status/download on this exact reference."})
    return 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    command = sub.add_parser("upload-runtime")
    command.add_argument("--dataset", required=True)
    command.add_argument("--folder", type=Path, required=True)
    for name in ("prepare", "run"):
        command = sub.add_parser(name)
        command.add_argument("--kernel", required=True)
        command.add_argument("--folder", type=Path, default=ROOT / ".tools/kaggle/submission")
        command.add_argument("--profile", choices=["smoke", "ladder", "full"], default="smoke")
        command.add_argument("--config", type=Path)
        command.add_argument("--runtime-dataset")
        command.add_argument("--runtime-manifest", type=Path)
        if name == "run":
            command.add_argument("--output", type=Path, required=True)
            command.add_argument("--timeout", type=int, default=3600)
            command.add_argument("--poll-seconds", type=int, default=20)
    command = sub.add_parser("submit")
    command.add_argument("--folder", type=Path, default=ROOT / ".tools/kaggle/submission")
    command.add_argument("--timeout", type=int, default=3600)
    for name in ("status", "download", "wait"):
        command = sub.add_parser(name)
        command.add_argument("--kernel", required=True, help="owner/slug/version pins the intended job")
        if name in {"download", "wait"}:
            command.add_argument("--output", type=Path, required=True)
            command.add_argument("--resume", action="store_true",
                                 help="keep already downloaded files after a transient download failure")
        if name == "wait":
            command.add_argument("--timeout", type=int, default=3600)
            command.add_argument("--poll-seconds", type=int, default=20)
    args = parser.parse_args()
    try:
        if args.action in {"run", "wait", "download"} and args.output.exists() and any(args.output.iterdir()) \
                and not getattr(args, "resume", False):
            raise ValueError("Use a new/empty output directory before starting a job or downloading evidence")
        if args.action in {"prepare", "run"}:
            prepared = prepare(args.kernel, args.folder, args.profile, args.config,
                               runtime_dataset=args.runtime_dataset, runtime_manifest=args.runtime_manifest)
            dump({"stage": "prepared", **prepared})
            if args.action == "prepare":
                return 0
        api = kaggle()
        if args.action == "upload-runtime":
            dump(upload_runtime(api, args.dataset, args.folder))
            return 0
        if args.action in {"submit", "run"}:
            submitted = submit(api, args.folder, args.timeout)
            (args.folder / "submission.json").write_text(json.dumps(submitted, indent=2) + "\n")
            dump({"stage": "submitted", **submitted})
            if args.action == "submit":
                return 0
            return wait_for(api, submitted["reference"], args.output, args.timeout, args.poll_seconds)
        if args.action == "status":
            dump(status(api, args.kernel))
            return 0
        if args.action == "wait":
            return wait_for(api, args.kernel, args.output, args.timeout, args.poll_seconds,
                            resume=args.resume)
        evidence = download(api, args.kernel, args.output, resume=args.resume)
        dump(evidence)
        return 0 if evidence["benchmarkComplete"] else 1
    except Exception as cause:
        dump({"status": "error", "type": type(cause).__name__, "message": str(cause)})
        return 1


if __name__ == "__main__":
    sys.exit(main())
