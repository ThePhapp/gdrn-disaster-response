#!/usr/bin/env python3
"""Build a credential-free Linux runtime package for Kaggle sessions without DNS."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile

from kaggle_server import NativeBenchmark, configuration, file_checksum


def package(source, output, commit):
    output = Path(output).resolve()
    if output.exists() and any(output.iterdir()):
        raise ValueError("Runtime package output must be new/empty")
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="gdrn-runtime-build-", dir="/tmp") as temporary:
        temporary = Path(temporary)
        build = NativeBenchmark(source, temporary / "logs", configuration(), commit)
        build.manifest["kind"] = "gdrn-offline-runtime-build"
        try:
            build.install()
            build.build()
            build.command(["apt-get", "install", "-y", "--no-install-recommends", "binutils",
                           "libx11-6", "libxext6", "libxrender1", "libxtst6", "libxi6", "libasound2t64",
                           "libharfbuzz0b"])
            runtime = temporary / "runtime"
            runtime.mkdir()
            subprocess.run([
                str(Path(build.env["JAVA_HOME"]) / "bin/jlink"), "--add-modules",
                "java.se,jdk.unsupported,jdk.crypto.ec,jdk.management",
                "--strip-debug", "--no-header-files", "--no-man-pages", "--compress=2",
                "--output", str(runtime / "java"),
            ], env=build.env, check=True)
            shutil.copy2(build.jar, runtime / "app.jar")
            (runtime / "bin").mkdir()
            shutil.copy2(build.k6, runtime / "bin/k6")
            pg_bin = runtime / "usr/lib/postgresql/16/bin"
            pg_bin.mkdir(parents=True)
            for name in ("postgres", "initdb", "pg_ctl", "createdb", "psql"):
                shutil.copy2(build.pg / name, pg_bin / name)
            pg_lib = runtime / "usr/lib/postgresql/16/lib"
            pg_lib.mkdir()
            for name in ("plpgsql.so", "postgis-3.so", "dict_snowball.so"):
                shutil.copy2(build.pg.parent / "lib" / name, pg_lib / name)
            shutil.copytree("/usr/share/postgresql/16", runtime / "usr/share/postgresql/16", symlinks=False)
            libraries = runtime / "lib"
            libraries.mkdir()
            # Keep the base libc/loader supplied by Ubuntu 24; relocate the other ELF dependencies.
            system = {"libc.so.6", "libm.so.6", "libpthread.so.0", "libdl.so.2", "librt.so.1",
                      "libresolv.so.2", "ld-linux-x86-64.so.2", "ld-linux-aarch64.so.1"}
            elf_files = list(pg_bin.iterdir()) + list(pg_lib.glob("*.so")) + list((runtime / "java").rglob("*.so"))
            elf_files.append(runtime / "java/bin/java")
            loader_env = build.env | {"LD_LIBRARY_PATH": str(runtime / "java/lib/server") + ":" + str(runtime / "java/lib")}
            for elf in elf_files:
                dependencies = subprocess.run(["ldd", str(elf)], capture_output=True, text=True, env=loader_env)
                if "not found" in dependencies.stdout:
                    raise RuntimeError(f"Missing build dependency for {elf}: {dependencies.stdout}")
                for name in re.findall(r"=>\s+(/[^\s]+)|^\s*(/[^\s]+)", dependencies.stdout, re.M):
                    dependency = Path(next(part for part in name if part))
                    if dependency.name in system or dependency.resolve().is_relative_to(runtime.resolve()):
                        continue
                    destination = libraries / dependency.name
                    if destination.exists() and file_checksum(destination) != file_checksum(dependency):
                        raise RuntimeError(f"Conflicting portable library: {dependency.name}")
                    if not destination.exists():
                        shutil.copy2(dependency, destination)
            checksums = {path.relative_to(runtime).as_posix(): file_checksum(path)
                         for path in runtime.rglob("*") if path.is_file()}
            # Kaggle recursively expands .gz files in uploaded archives; .bin preserves exact bytes.
            archive = output / "gdrn-offline-runtime.bin"
            with tarfile.open(archive, "w:gz", dereference=True) as tar:
                for path in sorted(runtime.rglob("*")):
                    if path.is_file():
                        tar.add(path, arcname="runtime/" + path.relative_to(runtime).as_posix(), recursive=False)
            manifest = {
                "kind": "gdrn-offline-runtime", "appCommit": commit,
                "target": "Ubuntu 24.04 x86_64/compatible glibc", "buildLocation": "local Linux",
                "archive": archive.name, "archiveSha256": file_checksum(archive),
                "jarSha256": file_checksum(runtime / "app.jar"), "files": checksums,
                "versions": build.manifest["versions"],
                "k6ArchiveSha256": build.manifest["k6ArchiveSha256"],
                "note": "JAR compiled outside Kaggle; backend, PostgreSQL/PostGIS and k6 execute inside Kaggle.",
            }
            (output / "runtime-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
            print(json.dumps({"status": "packaged", "output": str(output),
                              "archiveBytes": archive.stat().st_size,
                              "archiveSha256": manifest["archiveSha256"]}), flush=True)
        finally:
            build.cleanup()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--app-commit", required=True)
    args = parser.parse_args()
    package(args.source, args.output, args.app_commit)
