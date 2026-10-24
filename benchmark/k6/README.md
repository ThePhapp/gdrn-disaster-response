# GDRN reporting workloads

`reporting.js` is the D3 k6 workload for the existing reporting contracts:

- `write`: E07 `POST /api/reports` as a citizen;
- `read-page`: E08 `GET /api/reports` with pagination and stable sort;
- `read-radius`: E08 `GET /api/reports` with `lat`, `lon` and `radiusMeters`;
- `mixed`: 20% writes, 60% paginated reads and 20% radius reads.

The script has no production URL or credential fallback. Supply all connection and
credential values through the environment. A short-lived JWT is obtained once in
`setup()`, and the run is rejected when its planned duration could outlive the
token. This prevents expired-token failures from being misreported as a domain
bottleneck.

Example (native k6):

```powershell
$env:BASE_URL = 'http://127.0.0.1:8080'
$env:BENCHMARK_EMAIL = 'citizen@example.test'
$env:BENCHMARK_PASSWORD = 'set-locally'
$env:WORKLOAD = 'read-page'
$env:VUS = '10'
$env:DURATION = '30s'
$env:WARMUP = '10s'
$env:RAMP_DOWN = '10s'
k6 run --out json=benchmark/results/raw.json --summary-export benchmark/results/summary.json benchmark/k6/reporting.js
```

Do not commit credentials or raw results. The repository runner writes raw JSON and
summary JSON below a timestamped directory under `benchmark/results/`, which is
ignored by Git. The dataset must be reset and seeded on a disposable benchmark
database between repetitions; see the parent benchmark README.
