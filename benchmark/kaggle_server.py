#!/usr/bin/env python3
"""Run GDRN/PostGIS/k6 together on a disposable Linux CPU runtime."""
from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import json
import math
import os
import platform
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

JWT_PATTERN = re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")


def utc():
    return datetime.now(timezone.utc).isoformat()


def seconds(value):
    match = re.fullmatch(r"(\d+(?:\.\d+)?)(ms|s|m|h)", value)
    if not match:
        raise ValueError(f"Invalid duration: {value}")
    return float(match[1]) * {"ms": .001, "s": 1, "m": 60, "h": 3600}[match[2]]


def configuration(profile="smoke"):
    if profile not in {"smoke", "ladder", "full"}:
        raise ValueError("Profile must be smoke, ladder or full")
    if profile == "full":
        return {
            "profile": profile, "datasetSize": 1000, "seed": 20261024,
            "repetitions": 3, "warmup": "10s", "duration": "30s",
            "rampDown": "10s", "k6Version": "v1.3.0",
        }
    return {
        "profile": profile, "datasetSize": 100 if profile == "smoke" else 1000,
        "seed": 20261024, "repetitions": 1, "warmup": "2s" if profile == "smoke" else "10s",
        "duration": "5s" if profile == "smoke" else "30s",
        "rampDown": "2s" if profile == "smoke" else "10s", "k6Version": "v1.3.0",
    }


def validate_config(config):
    configuration(config["profile"])
    for field in ("datasetSize", "repetitions"):
        if type(config[field]) is not int or config[field] < 1:
            raise ValueError(f"{field} must be a positive integer")
    window = sum(seconds(config[key]) for key in ("warmup", "duration", "rampDown"))
    if window <= 0 or window + 30 > 900:
        raise ValueError("Run duration must fit the 900-second JWT lifetime")
    if not re.fullmatch(r"v\d+\.\d+\.\d+", config["k6Version"]):
        raise ValueError("Use an explicit k6 release version")


def cases(config):
    result = [("write", 1), ("read-page", 1), ("read-radius", 1)]
    if config["profile"] == "ladder":
        result += [("read-page", vu) for vu in (10, 50, 100)]
    if config["profile"] == "full":
        result = [(workload, vu) for vu in (1, 10, 50, 100)
                  for workload in ("write", "read-page", "read-radius", "mixed")]
    return result


def redact(text, values=()):
    for value in values:
        if value:
            text = text.replace(value, "<redacted>")
    return JWT_PATTERN.sub("<redacted-jwt>", text)


def sanitize_summary(payload):
    payload.pop("setup_data", None)
    return payload


def file_checksum(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def process_snapshot():
    """Linux process-group samples; RSS can count shared PostgreSQL pages twice."""
    result = {}
    for path in Path("/proc").glob("[0-9]*/stat"):
        try:
            fields = path.read_text().rsplit(")", 1)[1].split()
            result[int(path.parent.name)] = (
                int(fields[1]), int(fields[11]) + int(fields[12]),
                int(fields[21]) * os.sysconf("SC_PAGE_SIZE"),
            )
        except (OSError, ValueError, IndexError, ProcessLookupError):
            continue
    return result


class ResourceSampler:
    def __init__(self, roots, output):
        self.roots, self.output = roots, output
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self.sample, daemon=True)
        self.error = None

    def sample(self):
        try:
            previous, previous_time = {}, time.monotonic()
            with self.output.open("w", newline="") as handle:
                writer = csv.writer(handle)
                writer.writerow(["sampledAt", "component", "cpuPercent", "rssBytes", "processCount"])
                while not self.stop_event.is_set():
                    all_processes = process_snapshot()
                    now = time.monotonic()
                    for name, root in self.roots.items():
                        group = {root}
                        while True:
                            children = {pid for pid, (ppid, _, _) in all_processes.items() if ppid in group}
                            if children <= group:
                                break
                            group |= children
                        selected = {pid: all_processes[pid] for pid in group if pid in all_processes}
                        delta = sum(max(0, item[1] - previous.get((name, pid), item[1])) for pid, item in selected.items())
                        cpu = delta / os.sysconf("SC_CLK_TCK") / max(.001, now - previous_time) * 100
                        writer.writerow([utc(), name, round(cpu, 3), sum(item[2] for item in selected.values()), len(selected)])
                        previous.update({(name, pid): item[1] for pid, item in selected.items()})
                    previous_time = now
                    handle.flush()
                    self.stop_event.wait(1)
        except Exception as cause:
            self.error = str(cause)

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *_):
        self.stop_event.set()
        self.thread.join(timeout=5)


class NativeBenchmark:
    def __init__(self, source, output, config, app_commit="unknown", install=True, offline_runtime=None):
        validate_config(config)
        self.source, self.output = Path(source).resolve(), Path(output).resolve()
        if self.output.exists() and any(self.output.iterdir()):
            raise ValueError("Output must be new or empty; do not overwrite benchmark evidence")
        self.output.mkdir(parents=True, exist_ok=True)
        self.config, self.install_packages = config, install
        self.offline_runtime = Path(offline_runtime) if offline_runtime else None
        self.scratch = Path(tempfile.mkdtemp(prefix="gdrn-kaggle-", dir="/tmp"))
        self.logs = self.scratch / "logs"
        self.logs.mkdir()
        self.private_values = []
        self.backend = None
        self.database_started = False
        self.pg = ((self.offline_runtime / "usr/lib/postgresql/16/bin") if self.offline_runtime
                   else Path("/usr/lib/postgresql/16/bin"))
        self.database = "gdrn_kaggle_" + secrets.token_hex(5)
        self.pg_port, self.http_port = free_port(), free_port()
        while self.pg_port == self.http_port:
            self.http_port = free_port()
        self.base_url = f"http://127.0.0.1:{self.http_port}"
        self.manifest = {
            "kind": "gdrn-d3-server-on-kaggle", "status": "prepared",
            "executionEnvironment": "kaggle" if Path("/kaggle/working").is_dir() else "other-linux",
            "appCommit": app_commit, "configuration": config, "startedAt": utc(),
            "topology": "native Java backend + PostgreSQL/PostGIS + k6 on one CPU runtime",
            "externalServer": False, "dockerRequired": False, "runs": [],
            "host": {"platform": platform.platform(), "python": platform.python_version(),
                     "logicalCpus": os.cpu_count()},
            "limitations": [
                "Generator and server share CPU/RAM; results are not isolated server capacity.",
                "Process-group RSS can count shared pages more than once; not Docker memory metrics.",
                "App package build skips tests; benchmark completion does not certify the test suite.",
            ],
        }
        self.env = {key: value for key, value in os.environ.items()
                    if key in {"PATH", "HOME", "JAVA_HOME", "LANG", "LC_ALL", "TMPDIR", "SSL_CERT_FILE", "SSL_CERT_DIR"}}
        self.env.update({"LANG": "C.UTF-8", "LC_ALL": "C.UTF-8", "DEBIAN_FRONTEND": "noninteractive"})
        if self.offline_runtime:
            self.env["JAVA_HOME"] = str(self.offline_runtime / "java")
            self.env["PATH"] = str(self.offline_runtime / "java/bin") + os.pathsep + self.env.get("PATH", "")
            self.env["LD_LIBRARY_PATH"] = str(self.offline_runtime / "lib")
            self.manifest["packageBuildLocation"] = "local Linux; processes execute on this runtime"
        for name, path in {
            "cpuQuota": "/sys/fs/cgroup/cpu.max", "memoryLimit": "/sys/fs/cgroup/memory.max",
            "cpuQuotaV1": "/sys/fs/cgroup/cpu/cpu.cfs_quota_us",
            "cpuPeriodV1": "/sys/fs/cgroup/cpu/cpu.cfs_period_us",
            "memoryLimitV1": "/sys/fs/cgroup/memory/memory.limit_in_bytes",
        }.items():
            try:
                self.manifest["host"][name] = Path(path).read_text().strip()
            except OSError:
                pass

    def save(self, status):
        self.manifest["status"] = status
        (self.output / "manifest.json").write_text(json.dumps(self.manifest, indent=2), encoding="utf-8")
        print(json.dumps({"stage": status, "at": utc()}), flush=True)

    def command(self, args, log="setup.log", env=None, timeout=600):
        with (self.logs / log).open("a", encoding="utf-8") as handle:
            result = subprocess.run([str(arg) for arg in args], cwd=self.source,
                                    env=env or self.env, stdout=handle, stderr=subprocess.STDOUT, timeout=timeout)
        if result.returncode:
            tail = (self.logs / log).read_text(errors="replace")[-3000:]
            raise RuntimeError(f"{Path(str(args[0])).name} failed ({result.returncode}): {redact(tail, self.private_values)}")

    def query(self, sql):
        return subprocess.check_output([
            str(self.pg / "psql"), "-h", "127.0.0.1", "-p", str(self.pg_port),
            "-U", "gdrn_bench", "-d", self.database, "-v", "ON_ERROR_STOP=1", "-Atc", sql,
        ], env=self.pg_env, text=True).strip()

    def install(self):
        if platform.system() != "Linux":
            raise RuntimeError("Native execution requires Linux; prepare/submit can run on Windows")
        if self.offline_runtime:
            self.k6 = str(self.offline_runtime / "bin/k6")
            self.save("using-offline-runtime")
            return
        if not self.install_packages:
            self.k6 = shutil.which("k6")
            if not self.k6:
                raise RuntimeError("k6 is absent and package installation is disabled")
            return
        if os.geteuid() != 0 or not shutil.which("apt-get"):
            raise RuntimeError("This runtime needs root + apt-get to install native PostgreSQL/PostGIS and Java")
        self.save("installing")
        self.command(["apt-get", "update", "-qq"])
        self.command(["apt-get", "install", "-y", "--no-install-recommends", "ca-certificates", "curl", "unzip"])
        candidate = subprocess.run(["apt-cache", "show", "postgresql-16"], capture_output=True)
        if candidate.returncode:
            release = dict(line.split("=", 1) for line in Path("/etc/os-release").read_text().splitlines() if "=" in line)
            codename = release.get("VERSION_CODENAME", "").strip('"')
            if not re.fullmatch(r"[a-z]+", codename):
                raise RuntimeError("Cannot determine distribution codename for official PostgreSQL apt repository")
            key = Path("/usr/share/keyrings/gdrn-postgresql.asc")
            key.write_bytes(urllib.request.urlopen("https://www.postgresql.org/media/keys/ACCC4CF8.asc", timeout=60).read())
            Path("/etc/apt/sources.list.d/gdrn-postgresql.list").write_text(
                f"deb [signed-by={key}] https://apt.postgresql.org/pub/repos/apt {codename}-pgdg main\n")
            self.command(["apt-get", "update", "-qq"])
        # Avoid starting distro-managed services; this runner owns its own initdb cluster.
        policy = Path("/usr/sbin/policy-rc.d")
        created_policy = not policy.exists()
        if created_policy:
            policy.write_text("#!/bin/sh\nexit 101\n")
            policy.chmod(0o755)
        try:
            self.command(["apt-get", "install", "-y", "--no-install-recommends",
                          "openjdk-21-jdk-headless", "postgresql-16", "postgresql-client-16",
                          "postgresql-16-postgis-3"], timeout=900)
        finally:
            if created_policy:
                policy.unlink()
        arch = {"x86_64": "amd64", "aarch64": "arm64"}.get(platform.machine())
        if not arch:
            raise RuntimeError(f"Unsupported k6 architecture: {platform.machine()}")
        filename = f"k6-{self.config['k6Version']}-linux-{arch}.tar.gz"
        url = f"https://github.com/grafana/k6/releases/download/{self.config['k6Version']}/{filename}"
        archive = self.scratch / filename
        urllib.request.urlretrieve(url, archive)
        self.manifest["k6ArchiveSha256"] = hashlib.sha256(archive.read_bytes()).hexdigest()
        bin_dir = self.scratch / "bin"
        bin_dir.mkdir()
        self.k6 = str(bin_dir / "k6")
        with tarfile.open(archive) as tar:
            member = next(item for item in tar if item.isfile() and Path(item.name).name == "k6")
            with tar.extractfile(member) as src, open(self.k6, "wb") as target:
                shutil.copyfileobj(src, target)
        Path(self.k6).chmod(0o755)

    def build(self):
        self.save("building")
        homes = [] if self.offline_runtime else sorted(Path("/usr/lib/jvm").glob("java-21-openjdk-*"))
        if homes:
            self.env["JAVA_HOME"] = str(homes[0])
            self.env["PATH"] = str(homes[0] / "bin") + os.pathsep + self.env.get("PATH", "")
        self.manifest["versions"] = {}
        for name, command in {"java": ["java", "-version"], "postgres": [self.pg / "postgres", "--version"],
                              "k6": [self.k6, "version"]}.items():
            text = subprocess.check_output([str(arg) for arg in command], env=self.env, stderr=subprocess.STDOUT, text=True)
            self.manifest["versions"][name] = text.strip()
        if not re.search(r'version "21(?:[."]|$)', self.manifest["versions"]["java"]):
            raise RuntimeError("Java 21 is required for the committed app")
        if not re.search(r"\bk6 " + re.escape(self.config["k6Version"]) + r"(?:\s|$)", self.manifest["versions"]["k6"]):
            raise RuntimeError("Runtime k6 version does not match the requested configuration")
        if not self.offline_runtime:
            self.command(["bash", "mvnw", "-B", "-ntp", "-s", ".mvn/settings-central.xml",
                          "-DskipTests", "package"], log="build.log", timeout=1200)
        jars = [self.offline_runtime / "app.jar"] if self.offline_runtime else list((self.source / "target").glob("gdrn-*.jar"))
        if len(jars) != 1:
            raise RuntimeError("Expected exactly one packaged application JAR")
        self.jar = jars[0]
        self.manifest["jarSha256"] = hashlib.sha256(self.jar.read_bytes()).hexdigest()

    def start_database(self):
        self.save("starting-database")
        db_password = secrets.token_urlsafe(32)
        self.private_values.append(db_password)
        self.pg_env = self.env | {"PGPASSWORD": db_password}
        self.pg_dir = self.scratch / "postgres"
        self.pg_dir.mkdir()
        self.password_file = self.pg_dir / "password"
        self.password_file.write_text(db_password)
        self.password_file.chmod(0o600)
        self.as_postgres = []
        if os.geteuid() == 0:
            import pwd
            try:
                account = pwd.getpwnam("postgres")
            except KeyError:
                account = pwd.getpwnam("nobody")
            self.scratch.chmod(0o711)
            for path in (self.pg_dir, self.password_file):
                os.chown(path, account.pw_uid, account.pw_gid)
            self.as_postgres = ["runuser", "-u", account.pw_name, "--"]
            if self.offline_runtime:
                # runuser may remove loader variables before switching accounts.
                self.as_postgres += ["env", "LD_LIBRARY_PATH=" + self.env["LD_LIBRARY_PATH"]]
        share = ([str(self.pg / "initdb"), "-L", str(self.offline_runtime / "usr/share/postgresql/16")]
                 if self.offline_runtime else [str(self.pg / "initdb")])
        self.command(self.as_postgres + [
            *share, "-D", self.pg_dir / "data", "-U", "gdrn_bench",
            "--auth-local=scram-sha-256", "--auth-host=scram-sha-256",
            "--pwfile", self.password_file, "--encoding=UTF8", "--locale=C.UTF-8",
        ])
        self.password_file.unlink()
        self.command(self.as_postgres + [
            self.pg / "pg_ctl", "-D", self.pg_dir / "data", "-l", self.pg_dir / "postgres.log",
            "-o", f"-p {self.pg_port} -h 127.0.0.1 -k {self.pg_dir}", "-w", "start",
        ])
        self.database_started = True
        self.command([self.pg / "createdb", "-h", "127.0.0.1", "-p", str(self.pg_port),
                      "-U", "gdrn_bench", self.database], env=self.pg_env)
        self.query("CREATE EXTENSION postgis")
        self.manifest["versions"]["postgis"] = self.query("SELECT postgis_full_version()")
        self.pg_pid = int((self.pg_dir / "data/postmaster.pid").read_text().splitlines()[0])

    def start_backend(self):
        self.save("starting-backend")
        self.app_env = self.env | {
            "SERVER_ADDRESS": "127.0.0.1", "SERVER_PORT": str(self.http_port),
            "DB_URL": f"jdbc:postgresql://127.0.0.1:{self.pg_port}/{self.database}",
            "DB_USERNAME": "gdrn_bench", "DB_PASSWORD": self.pg_env["PGPASSWORD"],
            "SPRING_PROFILES_ACTIVE": "demo", "REPORT_ATTACHMENT_STORAGE_ROOT": str(self.scratch / "attachments"),
            "JWT_SECRET_BASE64": base64.b64encode(secrets.token_bytes(32)).decode(),
        }
        for prefix, email in (("DEMO_CITIZEN_ONE", "bench.one@example.test"),
                              ("DEMO_CITIZEN_TWO", "bench.two@example.test"),
                              ("DEMO_AUTHORITY", "bench.authority@example.test")):
            password = secrets.token_urlsafe(24)
            self.app_env[prefix + "_EMAIL"], self.app_env[prefix + "_PASSWORD"] = email, password
            self.private_values.append(password)
        self.private_values.append(self.app_env["JWT_SECRET_BASE64"])
        with (self.logs / "backend.log").open("w") as log:
            self.backend = subprocess.Popen(["java", "-jar", str(self.jar)], cwd=self.source, env=self.app_env,
                                            stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            if self.backend.poll() is not None:
                raise RuntimeError("Backend exited before readiness; inspect redacted backend.log")
            try:
                with urllib.request.urlopen(self.base_url + "/actuator/health/readiness", timeout=2) as response:
                    if json.load(response)["status"] == "UP":
                        return
            except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError):
                pass
            time.sleep(1)
        raise RuntimeError("Backend did not become ready within 180 seconds")

    def measure(self):
        self.save("running")
        for repetition in range(1, self.config["repetitions"] + 1):
            for workload, vus in cases(self.config):
                name = f"{workload}-{vus}vu-r{repetition}"
                out = self.output / name
                out.mkdir()
                self.query("TRUNCATE TABLE reporting_reports RESTART IDENTITY CASCADE")
                run_env = self.env | {
                    "BASE_URL": self.base_url, "BENCHMARK_EMAIL": self.app_env["DEMO_CITIZEN_ONE_EMAIL"],
                    "BENCHMARK_PASSWORD": self.app_env["DEMO_CITIZEN_ONE_PASSWORD"],
                    "WORKLOAD": workload, "VUS": str(vus), "DATA_SEED": str(self.config["seed"]),
                    "DURATION": self.config["duration"], "WARMUP": self.config["warmup"],
                    "RAMP_DOWN": self.config["rampDown"], "HTTP_TIMEOUT": "5s",
                    "K6_NO_USAGE_REPORT": "true",
                    "READ_PAGE_COUNT": str(min(20, math.ceil(self.config["datasetSize"] / 20))),
                }
                if workload != "write":
                    self.command([sys.executable, "benchmark/generate_reports.py", "--count", str(self.config["datasetSize"]),
                                  "--seed", str(self.config["seed"]), "--output", out / "seed.json"],
                                 env=run_env, log=name + "-seed.log")
                raw_summary = self.scratch / "summary-unredacted.json"
                run = {"workload": workload, "vus": vus, "repetition": repetition, "startedAt": utc(),
                       "datasetSize": 0 if workload == "write" else self.config["datasetSize"],
                       "warmup": self.config["warmup"], "duration": self.config["duration"],
                       "rampDown": self.config["rampDown"], "dataSeed": self.config["seed"],
                       "appCommit": self.manifest["appCommit"], "topology": self.manifest["topology"]}
                with (self.logs / (name + "-k6.log")).open("w") as log:
                    process = subprocess.Popen([self.k6, "run", "--out", f"json={out / 'raw.json'}",
                                                "--summary-export", str(raw_summary), "benchmark/k6/reporting.js"],
                                               cwd=self.source, env=run_env, stdout=log, stderr=subprocess.STDOUT)
                    with ResourceSampler({"backend": self.backend.pid, "database": self.pg_pid, "k6": process.pid},
                                         out / "process-stats.csv") as sampler:
                        try:
                            code = process.wait(timeout=sum(seconds(self.config[key]) for key in ("warmup", "duration", "rampDown")) + 90)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            process.wait()
                            raise RuntimeError(f"k6 timed out: {name}")
                if raw_summary.exists():
                    payload = json.loads(raw_summary.read_text())
                    token = payload.get("setup_data", {}).get("token")
                    if token:
                        self.private_values.append(token)
                    (out / "summary.json").write_text(json.dumps(sanitize_summary(payload), indent=2))
                    raw_summary.unlink()
                else:
                    raise RuntimeError(f"k6 did not export a summary: {name}")
                requests = payload.get("metrics", {}).get("benchmark_requests", {})
                if requests.get("values", requests).get("count", 0) < 1:
                    raise RuntimeError(f"k6 did not measure any business requests: {name}")
                run.update({"finishedAt": utc(), "exitCode": code,
                            "resourceMetrics": "available" if not sampler.error else "unavailable",
                            "resourceError": sampler.error})
                (out / "run.json").write_text(json.dumps(run, indent=2))
                self.manifest["runs"].append(run)
                self.save("running")
                if code:
                    raise RuntimeError(f"k6 failed or a threshold was exceeded: {name}")

    def cleanup(self):
        errors = []
        if self.backend and self.backend.poll() is None:
            self.backend.terminate()
            try:
                self.backend.wait(timeout=20)
            except subprocess.TimeoutExpired:
                self.backend.kill()
                self.backend.wait()
        if self.database_started:
            try:
                self.command(self.as_postgres + [self.pg / "pg_ctl", "-D", self.pg_dir / "data", "-m", "fast", "-w", "stop"])
            except Exception as cause:
                errors.append(redact(str(cause), self.private_values))
        self.manifest["cleanup"] = {"status": "complete" if not errors else "failed", "errors": errors}
        if hasattr(self, "pg_dir") and (self.pg_dir / "postgres.log").exists():
            shutil.copyfile(self.pg_dir / "postgres.log", self.logs / "postgres.log")
        for path in self.logs.glob("*.log"):
            (self.output / path.name).write_text(redact(path.read_text(errors="replace"), self.private_values))
        for path in self.output.rglob("*.json"):
            if path.name != "raw.json":
                path.write_text(redact(path.read_text(), self.private_values))
        self.manifest["finishedAt"] = utc()
        self.manifest["artifactSha256"] = {
            path.relative_to(self.output).as_posix(): file_checksum(path)
            for path in self.output.rglob("*") if path.is_file() and path.name != "manifest.json"
        }
        if not errors and self.scratch.resolve().parent == Path("/tmp") and self.scratch.name.startswith("gdrn-kaggle-"):
            shutil.rmtree(self.scratch)
        return errors

    def execute(self):
        failed = None
        try:
            self.install()
            self.build()
            self.start_database()
            self.start_backend()
            self.measure()
        except BaseException as cause:
            failed = cause
            self.manifest["failure"] = {"type": type(cause).__name__, "message": redact(str(cause), self.private_values)}
        finally:
            cleanup_errors = self.cleanup()
            if cleanup_errors and failed is None:
                failed = RuntimeError("Runtime cleanup did not finish")
            self.save("failed" if failed else "complete")
        if failed:
            raise failed
        return self.manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--profile", choices=["smoke", "ladder", "full"], default="smoke")
    parser.add_argument("--config", type=Path)
    parser.add_argument("--no-install", action="store_true")
    parser.add_argument("--app-commit", default="local-validation")
    args = parser.parse_args()
    config = json.loads(args.config.read_text()) if args.config else configuration(args.profile)
    NativeBenchmark(args.source, args.output, config, args.app_commit, not args.no_install).execute()


if __name__ == "__main__":
    main()
