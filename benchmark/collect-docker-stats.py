#!/usr/bin/env python3
"""Sample Docker CPU/RAM metrics while a benchmark is running."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--container", action="append", default=[])
    parser.add_argument("--duration-seconds", type=float, required=True)
    parser.add_argument("--interval-seconds", type=float, default=1.0)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)

    fields = ["sampledAt", "container", "cpuPercent", "memoryUsage", "memoryLimit", "memoryPercent"]
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        if not args.container or not shutil.which("docker"):
            print("Docker or container names unavailable; resource metrics marked unavailable.")
            return 0

        end = time.monotonic() + args.duration_seconds
        while time.monotonic() < end:
            completed = subprocess.run(
                ["docker", "stats", "--no-stream", "--format", "{{json .}}", *args.container],
                check=False,
                capture_output=True,
                text=True,
            )
            sampled_at = datetime.now(timezone.utc).isoformat()
            for line in completed.stdout.splitlines():
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    continue
                writer.writerow({
                    "sampledAt": sampled_at,
                    "container": item.get("Name", ""),
                    "cpuPercent": item.get("CPUPerc", ""),
                    "memoryUsage": item.get("MemUsage", ""),
                    "memoryLimit": "",
                    "memoryPercent": item.get("MemPerc", ""),
                })
            handle.flush()
            time.sleep(min(args.interval_seconds, max(0.0, end - time.monotonic())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
