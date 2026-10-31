#!/usr/bin/env python3
"""Isolated Linux CPU benchmark: own PostGIS cluster, backend and k6 process.

Run setup-cpu.sh first. No existing application or database is used or reset.
"""
from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import json
import os
from pathlib import Path
import platform
import secrets
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def checksum(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def command(args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)


def output(args):
    return command(args, capture_output=True, text=True).stdout.strip()


def metric(summary, name, key):
    value = summary.get("metrics", {}).get(name, {})
    return value.get("values", value).get(key)


def result_row(summary, workload, vus, repetition, code):
    return dict(workload=workload, vus=vus, repetition=repetition, exitCode=code,
                requestsPerSecond=metric(summary, "benchmark_requests", "rate"),
                averageMs=metric(summary, "benchmark_endpoint_latency", "avg"),
                p50Ms=metric(summary, "benchmark_endpoint_latency", "med"),
                p95Ms=metric(summary, "benchmark_endpoint_latency", "p(95)"),
                p99Ms=metric(summary, "benchmark_endpoint_latency", "p(99)"),
                errorRate=metric(summary, "benchmark_request_errors", "value")
                if "values" not in summary.get("metrics", {}).get("benchmark_request_errors", {})
                else metric(summary, "benchmark_request_errors", "rate"))


def save_report(directory, rows):
    write_json(directory / "results.json", rows)
    lines = ["# CPU benchmark results", "", "Full run window includes warm-up and ramp-down; login excluded.", "",
             "| Workload | VUs | Repeat | req/s | avg ms | p50 ms | p95 ms | p99 ms | errors | Exit |",
             "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for row in rows:
        values = [row[k] for k in ("workload", "vus", "repetition", "requestsPerSecond", "averageMs", "p50Ms", "p95Ms", "p99Ms", "errorRate", "exitCode")]
        lines.append("| " + " | ".join("N/A" if v is None else f"{v:.4f}" if isinstance(v, float) else str(v) for v in values) + " |")
    (directory / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "benchmark/results")
    parser.add_argument("--vus", nargs="+", type=int, default=[1, 10, 50, 100])
    parser.add_argument("--workloads", nargs="+", choices=["write", "read-page", "read-radius", "mixed"], default=["write", "read-page", "read-radius", "mixed"])
    parser.add_argument("--repetitions", type=int, default=3)
    parser.add_argument("--dataset-size", type=int, default=1000)
    parser.add_argument("--duration", type=int, default=30, help="Steady duration in seconds")
    parser.add_argument("--warmup", type=int, default=10)
    parser.add_argument("--ramp-down", type=int, default=10)
    args = parser.parse_args()
    if platform.system() != "Linux" or os.geteuid() != 0:
        parser.error("Use a disposable Linux CPU notebook/container as root.")
    if min(*args.vus, args.repetitions, args.dataset_size, args.duration, args.warmup, args.ramp_down) < 1:
        parser.error("Counts and durations must be positive.")
    if args.duration + args.warmup + args.ramp_down + 30 > 900:
        parser.error("Run window exceeds the 900-second JWT lifetime.")
    import psutil
    pg_bins = sorted(Path("/usr/lib/postgresql").glob("*/bin"), key=lambda p: int(p.parent.name))
    if not pg_bins or not shutil.which("k6"):
        parser.error("Run setup-cpu.sh first.")
    pg = pg_bins[-1]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    directory = args.output.resolve() / stamp
    directory.mkdir(parents=True)
    scratch = Path(tempfile.mkdtemp(prefix="gdrn-bench-"))
    os.chmod(scratch, 0o755)
    cluster = scratch / "postgres"
    cluster.mkdir()
    shutil.chown(cluster, user="postgres", group="postgres")
    pg_run = ["runuser", "-u", "postgres", "--"]
    env = os.environ.copy()
    password = secrets.token_urlsafe(24)
    env.update(DB_URL="jdbc:postgresql://127.0.0.1:55432/gdrn_benchmark", DB_USERNAME="postgres", DB_PASSWORD=password,
               JWT_SECRET_BASE64=base64.b64encode(secrets.token_bytes(32)).decode(), SPRING_PROFILES_ACTIVE="demo",
               SERVER_PORT="18080", SERVER_ADDRESS="127.0.0.1", BASE_URL="http://127.0.0.1:18080",
               BENCHMARK_EMAIL="bench-citizen@example.test", BENCHMARK_PASSWORD=password,
               DATA_SEED="20261024", PAGE_SIZE="20", READ_PAGE_COUNT=str(max(1, (args.dataset_size + 19) // 20)),
               RADIUS_METERS="50000", CENTER_LAT="21.028511", CENTER_LON="105.804817",
               REPORT_ATTACHMENT_STORAGE_ROOT=str(scratch / "attachments"))
    for prefix, email in [("DEMO_CITIZEN_ONE", env["BENCHMARK_EMAIL"]), ("DEMO_CITIZEN_TWO", "bench-two@example.test"), ("DEMO_AUTHORITY", "bench-authority@example.test")]:
        env[prefix + "_EMAIL"] = email
        env[prefix + "_PASSWORD"] = password
    java_home = next(Path("/usr/lib/jvm").glob("java-21-openjdk-*"))
    env["JAVA_HOME"] = str(java_home)
    env["PATH"] = str(java_home / "bin") + os.pathsep + env["PATH"]
    source_files = [ROOT / "pom.xml", ROOT / "mvnw"]
    for folder in ("src", "benchmark", ".mvn"):
        source_files.extend(p for p in (ROOT / folder).rglob("*") if p.is_file()
                            and "results" not in p.relative_to(ROOT).parts and "__pycache__" not in p.parts)
    source_hash = hashlib.sha256()
    for path in sorted(source_files):
        source_hash.update(path.relative_to(ROOT).as_posix().encode() + b"\0" + path.read_bytes())
    manifest = dict(startedAt=now(), status="running", environment="Kaggle CPU" if Path("/kaggle/working").is_dir() else "local Linux CPU",
                    topology="k6 + Spring Boot + PostGIS on same host, loopback only", cpuCount=psutil.cpu_count(),
                    memoryBytes=psutil.virtual_memory().total, platform=platform.platform(),
                    sourceSha256=source_hash.hexdigest(), config={k: str(v) if isinstance(v, Path) else v for k, v in vars(args).items()},
                    seed=20261024, query={k: env[k] for k in ["PAGE_SIZE", "READ_PAGE_COUNT", "RADIUS_METERS", "CENTER_LAT", "CENTER_LON"]},
                    k6=output(["k6", "version"]), postgres=output([pg / "postgres", "--version"]),
                    limitations="Shared CPU; resources measured on host/processes, not an independent load generator. Entire ramp window included.")
    manifest["cpuModel"] = next((line.split(":", 1)[1].strip() for line in Path("/proc/cpuinfo").read_text().splitlines() if line.startswith("model name")), "unknown")
    manifest["java"] = command([java_home / "bin/java", "-version"], capture_output=True, text=True).stderr.strip()
    manifest["cgroupLimits"] = {name: (Path("/sys/fs/cgroup") / name).read_text().strip()
                               for name in ("cpu.max", "memory.max") if (Path("/sys/fs/cgroup") / name).exists()}
    if (ROOT / ".git").exists():
        manifest.update(commit=output(["git", "-C", ROOT, "rev-parse", "HEAD"]), dirty=bool(output(["git", "-C", ROOT, "status", "--porcelain"])))
    elif (ROOT / "source-revision.json").exists():
        manifest.update(json.loads((ROOT / "source-revision.json").read_text()))
    write_json(directory / "manifest.json", manifest)
    app = None
    pg_started = False
    rows = []
    try:
        with (directory / "build.log").open("w") as log:
            command(["bash", ROOT / "mvnw", "-B", "-DskipTests", "package"], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
        command(pg_run + [pg / "initdb", "-D", cluster, "--auth=trust", "--no-locale", "--encoding=UTF8"], stdout=subprocess.DEVNULL)
        command(pg_run + [pg / "pg_ctl", "-D", cluster, "-l", cluster / "server.log", "-o", f"-h 127.0.0.1 -p 55432 -k {cluster}", "-w", "start"], stdout=subprocess.DEVNULL)
        pg_started = True
        sql_cmd = [pg / "psql", "-h", "127.0.0.1", "-p", "55432", "-U", "postgres", "-v", "ON_ERROR_STOP=1"]
        command(sql_cmd + ["-d", "postgres", "-c", "CREATE DATABASE gdrn_benchmark"], stdout=subprocess.DEVNULL)
        command(sql_cmd + ["-d", "gdrn_benchmark", "-c", "CREATE EXTENSION IF NOT EXISTS postgis"], stdout=subprocess.DEVNULL)
        manifest["postgis"] = output(sql_cmd + ["-d", "gdrn_benchmark", "-Atc", "SELECT postgis_full_version()"])
        jar = next(p for p in (ROOT / "target").glob("*.jar") if not p.name.endswith(".original"))
        manifest["jarSha256"] = hashlib.sha256(jar.read_bytes()).hexdigest()
        with (directory / "backend.log").open("w") as log:
            app = subprocess.Popen([str(java_home / "bin/java"), "-Xms256m", "-Xmx1g", "-jar", str(jar)], cwd=scratch, env=env, stdout=log, stderr=subprocess.STDOUT)
        deadline = time.monotonic() + 180
        while True:
            if app.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError("Backend failed readiness; inspect backend.log")
            try:
                with urllib.request.urlopen(env["BASE_URL"] + "/actuator/health/readiness", timeout=2) as response:
                    if response.status == 200:
                        break
            except (urllib.error.URLError, TimeoutError):
                pass
            time.sleep(1)
        for vus in args.vus:
            for workload in args.workloads:
                for repetition in range(1, args.repetitions + 1):
                    run = directory / f"{workload}-{vus}vu-{repetition}"
                    run.mkdir()
                    record = dict(workload=workload, vus=vus, repetition=repetition, startedAt=now(), reset="TRUNCATE reporting_reports RESTART IDENTITY CASCADE", datasetSize=0 if workload == "write" else args.dataset_size)
                    write_json(run / "run.json", record)
                    command(sql_cmd + ["-d", "gdrn_benchmark", "-c", "TRUNCATE reporting_reports RESTART IDENTITY CASCADE"], stdout=subprocess.DEVNULL)
                    if workload != "write":
                        with (run / "seed.log").open("w") as log:
                            command(["python3", ROOT / "benchmark/generate_reports.py", "--count", args.dataset_size, "--output", run / "seed.json"], env=env, stdout=log, stderr=subprocess.STDOUT)
                    run_env = dict(env, WORKLOAD=workload, VUS=str(vus), DURATION=f"{args.duration}s", WARMUP=f"{args.warmup}s", RAMP_DOWN=f"{args.ramp_down}s", K6_SUMMARY_PATH=str(run / "summary.json"))
                    print(f"Running {workload}, {vus} VUs, repetition {repetition}", flush=True)
                    with (run / "k6.log").open("w") as log, (run / "resources.csv").open("w", newline="") as resource_file:
                        writer = csv.writer(resource_file)
                        writer.writerow(["utc", "hostCpuPercent", "hostMemoryPercent", "backendRssBytes", "k6RssBytes", "postgresRssBytes"])
                        proc = subprocess.Popen(["k6", "run", "--out", f"json={run / 'raw.json.gz'}", str(ROOT / "benchmark/k6/reporting-cpu.js")], env=run_env, stdout=log, stderr=subprocess.STDOUT)
                        try:
                            while proc.poll() is None:
                                cpu = psutil.cpu_percent(interval=1)
                                def rss(pid):
                                    try:
                                        return psutil.Process(pid).memory_info().rss
                                    except psutil.NoSuchProcess:
                                        return 0
                                postgres_rss = sum(p.info["memory_info"].rss for p in psutil.process_iter(["name", "memory_info"]) if p.info["name"] == "postgres" and p.info["memory_info"])
                                writer.writerow([now(), cpu, psutil.virtual_memory().percent, rss(app.pid), rss(proc.pid), postgres_rss])
                        finally:
                            if proc.poll() is None:
                                proc.terminate()
                            proc.wait(timeout=30)
                    summary = json.loads((run / "summary.json").read_text()) if (run / "summary.json").exists() else {}
                    row = result_row(summary, workload, vus, repetition, proc.returncode)
                    rows.append(row)
                    record.update(finishedAt=now(), exitCode=proc.returncode)
                    write_json(run / "run.json", record)
                    save_report(directory, rows)
                    if proc.returncode or not row["requestsPerSecond"]:
                        raise RuntimeError("Load ladder stopped: failed threshold, setup error or missing measurements; inspect k6.log")
        manifest["status"] = "completed"
        return 0
    finally:
        if app is not None and app.poll() is None:
            app.terminate()
            try:
                app.wait(timeout=30)
            except subprocess.TimeoutExpired:
                app.kill()
                app.wait()
        if pg_started:
            command(pg_run + [pg / "pg_ctl", "-D", cluster, "-m", "fast", "-w", "stop"], stdout=subprocess.DEVNULL)
        if (cluster / "server.log").exists():
            shutil.copyfile(cluster / "server.log", directory / "postgres.log")
        if manifest["status"] != "completed":
            manifest["status"] = "incomplete"
        manifest["finishedAt"] = now()
        write_json(directory / "manifest.json", manifest)
        save_report(directory, rows)
        checksums = {p.relative_to(directory).as_posix(): checksum(p) for p in directory.rglob("*") if p.is_file()}
        write_json(directory / "checksums.json", checksums)
        print(f"Artifacts: {directory}", flush=True)


if __name__ == "__main__":
    raise SystemExit(main())
