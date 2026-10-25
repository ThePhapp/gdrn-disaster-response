#!/usr/bin/env python3
"""Generate deterministic reporting data through the public E07 contract.

This is intentionally a benchmark-data generator, not an application seed endpoint.
It must target a disposable benchmark database/application instance.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


REPORT_TYPES = ("EARTHQUAKE", "FLOOD", "TYPHOON", "WILDFIRE", "TSUNAMI")


@dataclass(frozen=True)
class Config:
    base_url: str
    email: str
    password: str
    count: int
    seed: int
    concurrency: int
    center_lat: float
    center_lon: float
    output: Path


def env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def request_json(url: str, method: str, payload: dict, headers: dict[str, str]) -> tuple[int, dict]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, method=method, headers={
        "Content-Type": "application/json",
        "Accept": "application/json",
        **headers,
    })
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        return error.code, {}


def login(config: Config) -> tuple[str, int]:
    status, body = request_json(
        f"{config.base_url}/api/auth/login",
        "POST",
        {"email": config.email, "password": config.password},
        {},
    )
    if status != 200 or not body.get("accessToken"):
        raise SystemExit(f"Benchmark login failed with HTTP {status}; verify the disposable benchmark credentials.")
    return str(body["accessToken"]), int(body.get("expiresIn", 900))


def report_payload(config: Config, index: int) -> dict:
    source = random.Random(config.seed + index * 7919)
    # 70% of records are a dense urban cluster; 30% are a wider regional spread.
    spread = 0.04 if index % 10 < 7 else 0.25
    latitude = max(-90.0, min(90.0, config.center_lat + (source.random() - 0.5) * spread))
    longitude = max(-180.0, min(180.0, config.center_lon + (source.random() - 0.5) * spread))
    report_type = REPORT_TYPES[index % len(REPORT_TYPES)]
    return {
        "type": report_type,
        "description": f"Benchmark report {config.seed}-{index:06d} ({report_type.lower()})",
        "latitude": round(latitude, 6),
        "longitude": round(longitude, 6),
    }


def create_one(config: Config, token: str, index: int) -> dict:
    started = time.perf_counter()
    status, _ = request_json(
        f"{config.base_url}/api/reports",
        "POST",
        report_payload(config, index),
        {"Authorization": f"Bearer {token}"},
    )
    return {"index": index, "status": status, "durationMs": round((time.perf_counter() - started) * 1000, 2)}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=int(os.getenv("DATASET_SIZE", "1000")))
    parser.add_argument("--seed", type=int, default=int(os.getenv("DATA_SEED", "20261024")))
    parser.add_argument("--concurrency", type=int, default=int(os.getenv("SEED_CONCURRENCY", "8")))
    parser.add_argument("--output", type=Path, default=Path(os.getenv("SEED_OUTPUT", "benchmark/results/seed.json")))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.count < 1 or args.concurrency < 1:
        raise SystemExit("--count and --concurrency must be positive")
    config = Config(
        base_url=env("BASE_URL").rstrip("/"),
        email=env("BENCHMARK_EMAIL"),
        password=env("BENCHMARK_PASSWORD"),
        count=args.count,
        seed=args.seed,
        concurrency=args.concurrency,
        center_lat=float(os.getenv("CENTER_LAT", "21.028511")),
        center_lon=float(os.getenv("CENTER_LON", "105.804817")),
        output=args.output,
    )
    token, expires_in = login(config)
    if expires_in < 60:
        raise SystemExit(f"JWT lifetime is only {expires_in}s; seed setup needs at least 60 seconds.")

    started_at = datetime.now(timezone.utc)
    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=config.concurrency) as executor:
        futures = [executor.submit(create_one, config, token, index) for index in range(config.count)]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
            if len(results) % 100 == 0 or len(results) == config.count:
                print(f"seeded {len(results)}/{config.count}", flush=True)

    failed = [item for item in results if item["status"] != 201]
    config.output.parent.mkdir(parents=True, exist_ok=True)
    manifest = {
        "kind": "gdrn-reporting-seed",
        "baseUrl": config.base_url,
        "datasetSizeRequested": config.count,
        "datasetSizeCreated": config.count - len(failed),
        "seed": config.seed,
        "distribution": {"denseClusterShare": 0.7, "wideRegionalShare": 0.3},
        "reportTypes": list(REPORT_TYPES),
        "center": {"latitude": config.center_lat, "longitude": config.center_lon},
        "concurrency": config.concurrency,
        "startedAt": started_at.isoformat(),
        "finishedAt": datetime.now(timezone.utc).isoformat(),
        "failed": failed,
    }
    config.output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    if failed:
        print(f"seed failed for {len(failed)} requests; manifest: {config.output}", file=sys.stderr)
        return 1
    print(f"seed complete: {config.count} reports; manifest: {config.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
