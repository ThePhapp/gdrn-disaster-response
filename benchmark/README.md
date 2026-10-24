# D3 — Reproducible reporting benchmark

This directory owns the D3 benchmark artifacts. It measures only contracts that
exist in the current application: E07 report creation and E08 report listing with
pagination or a radius filter. It does not add a seed endpoint, Redis, a broker,
or a performance-oriented application code path.

## Isolation and prerequisites

Use a disposable Compose project and database. Do not run the reset command against
the normal local demo database.

```powershell
Copy-Item .env.example .env.benchmark
# Edit .env.benchmark locally: use POSTGRES_DB=gdrn_benchmark,
# DB_PORT=55432, APP_PORT=18080, unique local credentials and SPRING_PROFILES_ACTIVE=demo.

docker compose -p gdrn-benchmark --env-file .env.benchmark up -d --build database backend
$env:BASE_URL = 'http://127.0.0.1:18080'
$env:BENCHMARK_EMAIL = '<demo citizen email from .env.benchmark>'
$env:BENCHMARK_PASSWORD = '<demo citizen password from .env.benchmark>'
```

The benchmark credential is a citizen because E07 is citizen-only. The authority
read path is a separate authorization concern and is not mixed into this workload.
The values above are examples only; no real credential belongs in Git, a notebook,
or a result file.

Native k6 is preferred. When it is unavailable, the runner can use a local Docker
image:

```powershell
docker pull grafana/k6:latest
```

Kaggle is not assumed to have a Docker daemon. The Kaggle notebook below performs a
preflight and reports which parts are available; it does not publish a database,
service or tunnel.

## Reset, seed and run

Reset is explicit and guarded by both a project name and a database name containing
`bench`, `test`, `ci` or `kaggle`:

```powershell
.\benchmark\reset-reporting.ps1 `
  -ComposeFile .\docker-compose.yml `
  -EnvFile .\.env.benchmark `
  -ProjectName gdrn-benchmark `
  -ConfirmReset
```

Seed data goes through `POST /api/reports` (E07), so validation and persistence stay
on the public contract. The generator is deterministic: 70% of rows form a dense
cluster around `CENTER_LAT`/`CENTER_LON`, 30% use a wider regional spread, and all
five current report types are cycled. It writes a non-secret `seed.json` manifest.

Run one isolated repetition with the Docker k6 runner:

```powershell
.\benchmark\run-reporting-benchmark.ps1 `
  -K6Mode docker -Workload read-page -Vus 10 -Duration 30s -Warmup 10s `
  -Repetitions 1 -DatasetSize 1000 -Reset -SeedData `
  -ComposeFile .\docker-compose.yml -BenchmarkEnvFile .\.env.benchmark `
  -ProjectName gdrn-benchmark -CollectDockerStats
```

For a radius run, use `-Workload read-radius`. For a write-only run, reset first
and omit `-SeedData`; for `mixed`, seed if the read branches need a populated
dataset. A run directory contains `raw.json`, `summary.json`, `run.json`, the seed
manifest and optional Docker CPU/RAM samples.

The intended load ladder is smoke, then 10, 50 and 100 VUs when the machine permits.
Do not raise the level solely to obtain a larger number: stop when CPU, memory,
database saturation or error-rate evidence requires it, record the reason, and
repeat the lower level for comparison. Repetitions must reset and seed the same
dataset before each run. No artificial sleep or delay is added by the workload.

## Interpreting the output

Report throughput (requests/second), average latency, p50/p95/p99, error rate, and
CPU/RAM when the optional collector has usable Docker samples. Keep k6 setup/login
outside the domain interpretation; the script checks the 900-second JWT lifetime
against the complete run window and refuses a run that could expire its token.

Results are local baseline measurements until the X1 integration gate is complete
on the measured commit. They are not portable performance claims. Each handoff must
include dataset size/distribution, query mix, warm-up, repetitions, reset method,
topology, commit, UTC start/end and limitations. Any Phase 2 candidate (cache,
read replica, queue, or other infrastructure) is a hypothesis only and must not be
implemented as part of D3.
