# Local benchmark result convention

Each `run-reporting-benchmark.ps1` invocation creates a timestamped directory
containing:

- `run.json`: commit, workload, VUs, durations, dataset/seed and start/end;
- `raw.json`: k6 raw samples;
- `summary.json`: k6 summary with throughput, latency percentiles and error rate;
- `seed.json`: dataset distribution and seed outcome when `-SeedData` is used;
- `docker-stats.csv`: optional CPU/RAM samples when `-CollectDockerStats` is used.

Result data is intentionally ignored by Git because it is machine-specific and
can be large. Preserve the directory as an external D3 evidence artifact and
reference its path/checksum in the handoff.
