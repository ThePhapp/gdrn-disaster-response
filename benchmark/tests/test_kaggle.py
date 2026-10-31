import base64
import enum
import io
import json
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import kaggle_api
from kaggle_server import cases, configuration, redact, sanitize_summary, validate_config


class NativeConfigurationTests(unittest.TestCase):
    def test_smoke_and_ladder_cover_real_contracts(self):
        self.assertEqual(cases(configuration()), [("write", 1), ("read-page", 1), ("read-radius", 1)])
        self.assertEqual(cases(configuration("ladder"))[-3:], [("read-page", 10), ("read-page", 50), ("read-page", 100)])

    def test_full_profile_has_the_complete_d3_matrix(self):
        config = configuration("full")
        self.assertEqual(config["repetitions"], 3)
        self.assertEqual(len(cases(config)) * config["repetitions"], 48)
        self.assertEqual(set(cases(config)), {
            (workload, vus) for workload in ("write", "read-page", "read-radius", "mixed")
            for vus in (1, 10, 50, 100)
        })

    def test_rejects_expired_token_window_and_invalid_dataset(self):
        for change in ({"duration": "15m"}, {"datasetSize": 0}, {"repetitions": True}, {"k6Version": "latest"}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_config(configuration() | change)

    def test_credentials_and_setup_token_are_removed(self):
        payload = {"setup_data": {"token": "private"}, "metrics": {"http_reqs": {"rate": 12}}}
        self.assertEqual(sanitize_summary(payload), {"metrics": {"http_reqs": {"rate": 12}}})
        self.assertEqual(redact("password=private eyJabc.def.ghi", ["private"]), "password=<redacted> <redacted-jwt>")


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "repo"
        self.root.mkdir()
        fixtures = {
            "pom.xml": "<project/>", "mvnw": "#!/bin/sh\n",
            ".mvn/settings-central.xml": "<settings/>",
            "src/main/java/Example.java": "class Committed {}",
            "benchmark/generate_reports.py": "print('seed')",
            "benchmark/k6/reporting.js": "export default function() {}",
        }
        for name, content in fixtures.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        subprocess.run(["git", "add", "--", *fixtures], cwd=self.root, check=True)
        subprocess.run(["git", "-c", "user.name=Test", "-c", "user.email=test@example.test",
                        "commit", "-qm", "fixture"], cwd=self.root, check=True)
        for name in ("kaggle_server.py", "kaggle_server_cpu.ipynb"):
            (self.root / "benchmark" / name).write_bytes((kaggle_api.ROOT / "benchmark" / name).read_bytes())

    def test_bundle_contains_committed_app_and_explicit_harness_only(self):
        (self.root / ".env").write_text("PASSWORD=never-upload")
        (self.root / "src/main/java/Example.java").write_text("class Uncommitted {}")
        bundle = kaggle_api.source_bundle(self.root)
        self.assertEqual(bundle["bundleSha256"], kaggle_api.source_bundle(self.root)["bundleSha256"])
        with tarfile.open(fileobj=io.BytesIO(base64.b64decode(bundle["bundle"]))) as archive:
            self.assertNotIn(".env", archive.getnames())
            self.assertIn("benchmark/kaggle_server.py", archive.getnames())
            self.assertEqual(archive.extractfile("src/main/java/Example.java").read(), b"class Committed {}")

    def test_prepared_notebook_is_private_cpu_only_and_executable_python(self):
        output = self.root.parent / "submission"
        kaggle_api.prepare("someone/gdrn-cpu", output, root=self.root)
        metadata = json.loads((output / "kernel-metadata.json").read_text())
        self.assertTrue(metadata["is_private"])
        self.assertFalse(metadata["enable_gpu"])
        self.assertFalse(metadata["enable_tpu"])
        notebook = json.loads((output / metadata["code_file"]).read_text())
        for cell in notebook["cells"]:
            if cell["cell_type"] == "code":
                compile("".join(cell["source"]), "<cell>", "exec")
                self.assertEqual(cell["outputs"], [])
                self.assertIsNone(cell["execution_count"])
        scope = {}
        cell = next(cell for cell in notebook["cells"] if "gdrn-job-config" in cell["metadata"].get("tags", []))
        exec("".join(cell["source"]), scope)
        self.assertEqual(scope["JOB"]["configuration"]["profile"], "smoke")
        self.assertTrue(scope["JOB"]["bundle"])

    def test_offline_runtime_disables_internet_and_requires_matching_source(self):
        manifest = self.root.parent / "runtime-manifest.json"
        commit = kaggle_api.source_bundle(self.root)["appCommit"]
        metadata = {"kind": "gdrn-offline-runtime", "appCommit": commit, "archiveSha256": "a" * 64}
        manifest.write_text(json.dumps(metadata))
        output = self.root.parent / "offline"
        kaggle_api.prepare("someone/gdrn-cpu", output, root=self.root,
                           runtime_dataset="someone/gdrn-runtime", runtime_manifest=manifest)
        prepared = json.loads((output / "kernel-metadata.json").read_text())
        self.assertFalse(prepared["enable_internet"])
        self.assertTrue(prepared["is_private"])
        self.assertEqual(prepared["dataset_sources"], ["someone/gdrn-runtime"])
        manifest.write_text(json.dumps(metadata | {"appCommit": "different-source"}))
        with self.assertRaisesRegex(ValueError, "same committed application"):
            kaggle_api.prepare("someone/gdrn-cpu", output, root=self.root,
                               runtime_dataset="someone/gdrn-runtime", runtime_manifest=manifest)


class ApiEvidenceTests(unittest.TestCase):
    def test_runtime_upload_is_private_and_does_not_upload_unexpected_files(self):
        import hashlib
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / "gdrn-offline-runtime.bin").write_bytes(b"runtime")
            (folder / "runtime-manifest.json").write_text(json.dumps({
                "kind": "gdrn-offline-runtime", "archive": "gdrn-offline-runtime.bin",
                "archiveSha256": hashlib.sha256(b"runtime").hexdigest(),
            }))
            calls = []
            def create(*args, **kwargs):
                calls.append(kwargs)
                return SimpleNamespace(error=None)
            api = SimpleNamespace(dataset_create_new=create)
            kaggle_api.upload_runtime(api, "someone/gdrn-runtime", folder)
            self.assertFalse(calls[0]["public"])
            (folder / ".env").write_text("secret")
            with self.assertRaisesRegex(ValueError, "only archive"):
                kaggle_api.upload_runtime(api, "someone/gdrn-runtime", folder)
            self.assertEqual(len(calls), 1)

    def test_downloaded_manifest_requires_nonempty_raw_summary_and_resource_files(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            manifest = {"kind": "gdrn-d3-server-on-kaggle", "status": "complete",
                        "cleanup": {"status": "complete"},
                        "runs": [{"workload": "write", "vus": 1, "repetition": 1, "exitCode": 0}]}
            self.assertFalse(kaggle_api.completed_evidence(manifest, folder))
            case = folder / "write-1vu-r1"
            case.mkdir()
            for name in ("raw.json", "run.json", "process-stats.csv"):
                (case / name).write_text("evidence")
            summary = case / "summary.json"
            summary.write_text(json.dumps({"metrics": {"benchmark_requests": {"count": 2}}}))
            manifest["artifactSha256"] = {
                path.relative_to(folder).as_posix(): kaggle_api.file_checksum(path) for path in case.iterdir()
            }
            self.assertTrue(kaggle_api.completed_evidence(manifest, folder))
            (case / "raw.json").write_text("corrupted")
            self.assertFalse(kaggle_api.completed_evidence(manifest, folder))
            manifest["artifactSha256"]["write-1vu-r1/raw.json"] = kaggle_api.file_checksum(case / "raw.json")
            summary.write_text(json.dumps({"setup_data": {"token": "private"},
                                          "metrics": {"benchmark_requests": {"count": 2}}}))
            manifest["artifactSha256"]["write-1vu-r1/summary.json"] = kaggle_api.file_checksum(summary)
            self.assertFalse(kaggle_api.completed_evidence(manifest, folder))

    def test_sdk_status_enum_is_normalized_for_automation(self):
        worker = enum.Enum("KernelWorkerStatus", ["QUEUED", "RUNNING", "COMPLETE", "ERROR"])
        for member in worker:
            api = SimpleNamespace(kernels_status=lambda ref: SimpleNamespace(status=member, failure_message=None))
            self.assertEqual(kaggle_api.status(api, "someone/gdrn-cpu/7")["status"], member.name.lower())

    def test_submit_refuses_public_or_gpu_notebook(self):
        with tempfile.TemporaryDirectory() as folder:
            metadata = {"is_private": False, "enable_gpu": False, "enable_tpu": False}
            (Path(folder) / "kernel-metadata.json").write_text(json.dumps(metadata))
            with self.assertRaises(ValueError):
                kaggle_api.submit(None, folder)

    def test_submission_is_pinned_to_returned_version(self):
        with tempfile.TemporaryDirectory() as folder:
            metadata = {"id": "someone/gdrn-cpu", "is_private": True, "enable_gpu": False, "enable_tpu": False}
            (Path(folder) / "kernel-metadata.json").write_text(json.dumps(metadata))
            api = SimpleNamespace(kernels_push=lambda *args, **kwargs: SimpleNamespace(
                error=None, versionNumber=7, url="https://www.kaggle.com/code/someone/gdrn-cpu"))
            self.assertEqual(kaggle_api.submit(api, folder)["reference"], "someone/gdrn-cpu/7")

    def test_download_does_not_accept_green_notebook_without_measurements(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "output"
            output.mkdir()
            def fetch(*args, **kwargs):
                (output / "manifest.json").write_text(json.dumps({
                    "kind": "gdrn-d3-server-on-kaggle", "status": "complete",
                    "cleanup": {"status": "complete"}, "runs": [],
                }))
                return ["manifest.json"], None
            result = kaggle_api.download(SimpleNamespace(kernels_output=fetch), "someone/gdrn-cpu/7", output)
            self.assertFalse(result["benchmarkComplete"])

    def test_failed_or_nonzero_measurements_are_not_complete(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "output"
            def fetch(*args, **kwargs):
                output.mkdir()
                (output / "manifest.json").write_text(json.dumps({
                    "kind": "gdrn-d3-server-on-kaggle", "status": "failed",
                    "cleanup": {"status": "complete"}, "runs": [{"exitCode": 99}],
                }))
                return ["manifest.json"], None
            result = kaggle_api.download(SimpleNamespace(kernels_output=fetch), "someone/gdrn-cpu/7", output)
            self.assertFalse(result["benchmarkComplete"])


if __name__ == "__main__":
    unittest.main()
