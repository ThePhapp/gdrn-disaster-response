# GDRN D3 full benchmark evidence

- Kaggle job: [thphap/gdrn-d3-server-cpu/4](https://www.kaggle.com/code/thphap/gdrn-d3-server-cpu)
- Runtime Dataset: [thphap/gdrn-d3-offline-runtime-v2](https://www.kaggle.com/datasets/thphap/gdrn-d3-offline-runtime-v2)
- Source commit: `2545bba2da7ec26830f7372369f05a6186876059`
- Profile: `full`, 1,000 reports, seed `20261024`
- Matrix: 4 workloads × 4 VU levels (1/10/50/100) × 3 repetitions = **48/48 runs**
- Workloads: `write`, `read-page`, `read-radius`, `mixed`
- Window per run: 10s warm-up, 30s steady, 10s ramp-down

## Result

| Check | Result |
|---|---|
| Manifest status | `complete` |
| Run exit codes | All `0` |
| Cleanup | `complete` |
| Resource metrics | Available for all runs |
| Artifact integrity | 315/315 SHA-256 hashes matched |
| Credential redaction | No JWT found in exported evidence |

## Performance summary

Values are the mean of the three repetitions in each workload/VU cell. Throughput
is business requests per second; latency is endpoint p95 in milliseconds.

| Workload | 1 VU | 10 VU | 50 VU | 100 VU |
|---|---:|---:|---:|---:|
| `write` | 211.58 req/s, 4.66 ms | 1,388.13 req/s, 7.90 ms | 1,666.58 req/s, 59.49 ms | 1,732.34 req/s, 126.40 ms |
| `read-page` | 265.97 req/s, 3.76 ms | 993.64 req/s, 13.08 ms | 1,103.59 req/s, 95.44 ms | 1,064.69 req/s, 223.38 ms |
| `read-radius` | 124.29 req/s, 6.63 ms | 353.07 req/s, 34.84 ms | 372.29 req/s, 245.73 ms | 374.24 req/s, 514.22 ms |
| `mixed` | 177.20 req/s, 10.88 ms | 427.61 req/s, 69.65 ms | 446.36 req/s, 252.47 ms | 447.03 req/s, 521.66 ms |

Across all 48 runs there were 1,675,588 business requests and a 0% business
request error rate. The 100 VU results show the shared CPU saturation pattern:
write throughput continues to rise, while read-page plateaus and the spatial
radius/mixed workloads show higher latency.

## Runtime

- Java `21.0.12.1`
- PostgreSQL `16.15`
- PostGIS `3.4.2`
- k6 `v1.3.0`
- Kaggle CPU image: 4 logical CPUs, 4-core quota, 30 GiB memory limit
- Internet disabled; backend, PostgreSQL/PostGIS and k6 executed inside Kaggle

The complete `manifest.json` and download verification are stored beside this
report. Large raw k6 streams and logs remain in the ignored local results folder.
