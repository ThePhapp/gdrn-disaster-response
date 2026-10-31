#!/usr/bin/env python3
"""Package only benchmark/build source (never .env or previous results) for Kaggle."""
import json
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
destination = root / "benchmark/results/gdrn-cpu-source.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
files = [root / name for name in ("pom.xml", "mvnw")]
for directory in ("src", ".mvn", "benchmark"):
    files.extend(p for p in (root / directory).rglob("*") if p.is_file()
                 and "results" not in p.relative_to(root).parts
                 and "__pycache__" not in p.parts)
with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(path, path.relative_to(root).as_posix())
    def git(*args):
        return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()
    archive.writestr("source-revision.json", json.dumps({"commit": git("rev-parse", "HEAD"), "dirty": bool(git("status", "--porcelain"))}))
print(destination)
