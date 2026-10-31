# D3: backend + PostGIS + k6 cùng chạy trên Kaggle CPU

Notebook chạy toàn bộ topology trong một phiên Linux CPU của Kaggle: Java 21,
PostgreSQL 16/PostGIS và k6 native. Không cần Docker daemon, backend/database bên
ngoài, tunnel hoặc public port.

## 1. Cài công cụ điều khiển trên Windows

Từ root repo:

```powershell
python -m venv .tools/kaggle-api
& .\.tools\kaggle-api\Scripts\python.exe -m pip install -r benchmark/requirements-kaggle.txt
& .\.tools\kaggle-api\Scripts\kaggle.exe auth login
```

Chấp thuận đăng nhập trên trình duyệt. OAuth được lưu trên máy; không đưa token
vào Git hoặc notebook. Chỉ cần đăng nhập lại khi credentials hết hạn/bị thu hồi.

## 2. AI chuẩn bị và chạy job

Thay `YOUR_USER` bằng username Kaggle. Lệnh sau tạo notebook **private**, CPU-only,
Internet bật, gửi job, theo dõi đúng version đã gửi và tải kết quả:

```powershell
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py run `
  --kernel YOUR_USER/gdrn-d3-server-cpu `
  --profile smoke `
  --output benchmark/results/kaggle-smoke-01
```

Output phải là thư mục mới/rỗng. `smoke` tạo 100 reports cho mỗi phép đọc và chạy
ba phép đo ở 1 VU: E07 write, E08 page và E08 radius. Mặc định warm-up 2s,
steady 5s, ramp-down 2s. Mỗi phép đo tự reset database tạm riêng của job.

Sau smoke thành công, chạy đầy đủ 48 lượt:

```powershell
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py run `
  --kernel YOUR_USER/gdrn-d3-server-cpu `
  --profile full `
  --runtime-dataset YOUR_USER/gdrn-d3-offline-runtime-v2 `
  --runtime-manifest .tools/kaggle/offline-runtime/runtime-manifest.json `
  --output benchmark/results/kaggle-full-01
```

`full` dùng 1.000 reports, warm-up 10s/steady 30s/ramp-down 10s, chạy 4 workload
(write, page, radius, mixed) ở 1/10/50/100 VUs, mỗi tổ hợp 3 lần = 48 lượt.
Threshold lỗi từ 1% trở lên làm phép đo/job thất bại, dừng benchmark và giữ kết quả
đã có. Profile/config được lưu vào manifest.

Có thể duyệt notebook trước khi gửi hoặc điều khiển từng bước:

```powershell
# Local only; chưa gọi API, chưa dùng quota Kaggle
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py prepare `
  --kernel YOUR_USER/gdrn-d3-server-cpu --profile smoke

# Tạo một version mới và chạy
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py submit

# Dùng đúng reference owner/slug/version do submit trả về
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py status `
  --kernel YOUR_USER/gdrn-d3-server-cpu/1

& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py download `
  --kernel YOUR_USER/gdrn-d3-server-cpu/1 `
  --output benchmark/results/kaggle-version-01
```

Mỗi lệnh xuất JSON. `run` timeout cục bộ không tự hủy job bên Kaggle; dùng reference
đã in để kiểm tra/tải tiếp. Gói chuẩn bị và `submission.json` nằm trong
`.tools/kaggle/submission/` (ignored). `--config file.json` có thể thay cấu hình
profile; lấy các trường từ `job.json`, chỉ truyền object `configuration`.

## 3. Chạy offline khi Kaggle không có DNS

Nếu job không truy cập được Maven/GitHub dù Internet đã bật, dùng Dataset runtime
riêng tư. Cả backend, PostgreSQL/PostGIS và k6 vẫn **thực thi trên Kaggle CPU**;
JAR được **biên dịch trước trên Linux bên ngoài Kaggle**. Chế độ này tắt Internet
trong notebook và kiểm tra SHA-256 của archive/từng file trước khi chạy.

Chuẩn bị trên Ubuntu 24.04 x86_64 có Python 3, Git, quyền root/apt và Internet
(có thể là container Docker cục bộ). Từ root repo, đóng gói đúng source commit:

```bash
python3 - <<'PY'
import base64, json, sys
from pathlib import Path
sys.path.insert(0, 'benchmark')
from kaggle_api import source_bundle
job = source_bundle()
Path('/tmp/gdrn-source.tar.gz').write_bytes(base64.b64decode(job['bundle']))
Path('/tmp/gdrn-commit.txt').write_text(job['appCommit'])
PY
mkdir /tmp/gdrn-committed-source
tar -xzf /tmp/gdrn-source.tar.gz -C /tmp/gdrn-committed-source
python3 benchmark/package_kaggle_runtime.py \
  --source /tmp/gdrn-committed-source \
  --app-commit "$(cat /tmp/gdrn-commit.txt)" \
  --output .tools/kaggle/offline-runtime
```

Script cài toolchain, Maven package (skip tests), tạo JRE21 bằng jlink và thu thập
các thư viện native. Output gồm archive và `runtime-manifest.json`; giữ nguyên
hai file này khi chuyển về máy Windows. Archive tar/gzip dùng đuôi `.bin` để
Kaggle giữ nguyên bytes, tránh tự giải nén tiếp các `.gz` bên trong. Không đổi
đuôi file trước khi upload. Chỉ phù hợp image Linux tương thích
Ubuntu 24.04/glibc 2.39; cần đóng gói lại nếu Kaggle đổi image.

Upload qua API một lần (Dataset mới, **private**, không tự ghi đè Dataset cũ):

```powershell
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py upload-runtime `
  --dataset YOUR_USER/gdrn-d3-offline-runtime `
  --folder .tools/kaggle/offline-runtime
& .\.tools\kaggle-api\Scripts\kaggle.exe datasets status YOUR_USER/gdrn-d3-offline-runtime
```

Khi Dataset đã sẵn sàng:

```powershell
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py run `
  --kernel YOUR_USER/gdrn-d3-server-cpu --profile smoke `
  --runtime-dataset YOUR_USER/gdrn-d3-offline-runtime `
  --runtime-manifest .tools/kaggle/offline-runtime/runtime-manifest.json `
  --output benchmark/results/kaggle-offline-smoke-01
```

Có thể dùng cùng hai tham số runtime với `--profile ladder`. JAR và source phải
cùng commit; client từ chối nếu HEAD đã đổi. Khi đổi ứng dụng, đóng gói runtime
mới và dùng Dataset slug mới. Runtime không chứa mật khẩu/JWT; job sinh credentials
mới cho database và demo accounts. Không tải `.env` hay thư mục user lên Dataset.

## 4. Notebook làm gì?

- Đóng gói **mã ứng dụng đã commit** qua `git archive`, không lấy `.env`, file
  untracked hay sửa đổi ứng dụng chưa commit. Native harness hiện tại được thêm
  riêng, có SHA-256. Không cần chờ push code lên GitHub.
- Chế độ online kiểm tra Linux/root/apt, cài JDK21 và PostgreSQL16/PostGIS. Dùng PostgreSQL apt
  repository chính thức nếu distro chưa có PostgreSQL16. k6 được tải theo version
  cố định, ghi version và archive SHA-256 vào manifest.
- Chế độ online build JAR bằng Maven Wrapper; offline dùng JAR đã build trên Linux
  ngoài Kaggle cùng source commit. `-DskipTests` chỉ dùng cho package;
  đây **không phải clean verify hoặc bằng chứng CI**.
- Tạo cluster `initdb` mới trong `/tmp`, chạy PostgreSQL dưới user `postgres`
  (hoặc `nobody` nếu image offline chưa có user đó),
  dùng SCRAM và mật khẩu ngẫu nhiên. PostgreSQL/backend chỉ bind `127.0.0.1`.
- Tạo JWT signing key và ba tài khoản demo ngẫu nhiên; chờ backend readiness `UP`.
- Seed qua E07, dùng k6 script D3 hiện có. Reset chỉ tác động database vừa tạo.
- Lấy CPU/RSS theo nhóm process backend/database/k6 qua `/proc`. Dừng các process
  do job tạo và xuất logs đã redaction; không xuất data directory/password file.

[Template thực thi](../../benchmark/kaggle_server_cpu.ipynb) cần qua `prepare`/`run`
để có source bundle. Upload trực tiếp template rỗng sẽ dừng với hướng dẫn.
[Notebook theo Dataset hiện có](../../benchmark/kaggle_cpu_preflight.ipynb) được
giữ nguyên cùng `setup-cpu.sh`/`run_cpu.py`. Luồng API đóng gói nguồn trực tiếp vào
notebook; chỉ chế độ offline cần Dataset chứa runtime.

## 5. Kết quả và giới hạn

Output tải về có thư mục `d3-results/`:

- `manifest.json`: source commit, hash harness/bundle, versions, topology,
  cấu hình, từng phép đo, lỗi nếu có và kết quả cleanup.
- Mỗi phép đo: `raw.json`, `summary.json` đã xóa `setup_data`, `run.json`,
  `process-stats.csv`; phép đọc có thêm `seed.json`.
- Logs build/setup/backend/PostgreSQL/k6 đã loại mật khẩu và JWT.
- `kaggle-download.json`: reference Kaggle version và kết luận benchmark hoàn tất.

Client chỉ báo hoàn tất khi có manifest `complete`, các phép đo exit code 0,
artifact SHA-256 khớp và cleanup hoàn tất. Preflight thành công hoặc notebook xanh nhưng thiếu phép đo
không đủ để kết luận D3 đạt.

Máy phát tải và server dùng chung CPU/RAM: số đo phản ánh topology này, không phải
năng lực server được cô lập. RSS cộng các process PostgreSQL có thể tính trùng
shared pages; không so trực tiếp với Docker memory statistics. PostgreSQL major
giữ ở 16; PostGIS/package thực cài được ghi trong manifest. Kaggle thay image,
thiếu quyền apt/Internet hoặc hết quota có thể làm job không chạy được; giữ lỗi
thực tế, không đổi nhãn thành PASS.

Profile API `smoke`/`ladder` dùng để kiểm tra nhanh; `full` mới là ma trận D3 đầy đủ
48 lượt.

## 6. Full D3 đã thực thi trên Kaggle ngày 30–31/10/2026

- Tài khoản: `thphap`. [Notebook private](https://www.kaggle.com/code/thphap/gdrn-d3-server-cpu),
  API reference chính xác: `thphap/gdrn-d3-server-cpu/4`.
- [Dataset runtime private](https://www.kaggle.com/datasets/thphap/gdrn-d3-offline-runtime-v2).
  CPU-only, GPU/TPU tắt, Internet tắt; image Kaggle có 4 logical CPUs,
  CPU quota 4 cores và giới hạn RAM 30 GiB.
- Source ứng dụng: `2545bba2da7ec26830f7372369f05a6186876059`.
  JAR build trên Linux cục bộ; **backend + database + k6 thực thi trên Kaggle**.
- Cấu hình: 1.000 reports, 4 workload (`write`, `read-page`, `read-radius`, `mixed`),
  4 mức tải (1/10/50/100 VUs), 3 repetitions = **48/48 run**.
- Thời gian thực thi: `2026-10-30T16:47:22Z` đến `2026-10-30T17:28:44Z` (UTC).
  Manifest `complete`, mọi run exit code 0, resource metrics available, cleanup complete.
  Tải về 318 file, kiểm tra khớp 315 artifact SHA-256; không phát hiện JWT trong output.
- Java `21.0.12.1`, PostgreSQL `16.15`, PostGIS `3.4.2`, k6 `v1.3.0`.

Kết quả local (ignored):
`benchmark/results/kaggle-server-full-20261030-01/d3-results/`.
File xác nhận tải và kiểm tra:
`benchmark/results/kaggle-server-full-20261030-01/kaggle-download.json`.

Đây là bằng chứng hoàn thành ma trận benchmark D3 trên topology một CPU dùng chung;
không phải capacity của một server độc lập. Các metric bao gồm warm-up/steady/ramp-down
và loại login khỏi metric nghiệp vụ.

## 7. Smoke đã thực thi trên Kaggle ngày 30/10/2026

- Tài khoản: `thphap`. [Notebook private](https://www.kaggle.com/code/thphap/gdrn-d3-server-cpu),
  API reference chính xác: `thphap/gdrn-d3-server-cpu/3`.
- [Dataset runtime private](https://www.kaggle.com/datasets/thphap/gdrn-d3-offline-runtime-v2).
  CPU-only, GPU/TPU tắt, Internet tắt; image Kaggle có 4 logical CPUs,
  CPU quota 4 cores và giới hạn RAM 30 GiB.
- Source ứng dụng: `2545bba2da7ec26830f7372369f05a6186876059`.
  JAR build trên Linux cục bộ; **backend + database + k6 thực thi trên Kaggle**.
- Java `21.0.12.1`, PostgreSQL `16.15`, PostGIS `3.4.2`, k6 `v1.3.0`.
- Thời gian thực thi: `2026-10-30T16:34:53Z` đến `16:35:50Z` (UTC).
  Manifest `complete`, 3 run exit code 0, resource metrics available, cleanup complete.
  Tải về 24 file, kiểm tra khớp 22 artifact SHA-256; không phát hiện JWT trong output.

| Workload | VUs | Reports seed | Requests nghiệp vụ | Lỗi nghiệp vụ | p95 (ms) |
|---|---:|---:|---:|---:|---:|
| E07 write | 1 | 0 | 755 | 0% | 14.30 |
| E08 page | 1 | 100 | 1.237 | 0% | 8.32 |
| E08 radius | 1 | 100 | 1.500 | 0% | 5.18 |

Warm-up 2s, steady 5s, ramp-down 2s; summary gồm cả các giai đoạn này, không gồm
login trong các metric nghiệp vụ. Đây là smoke lịch sử; full matrix ở mục 6 mới là
kết quả hoàn thành D3.

Kết quả local (ignored):
`benchmark/results/kaggle-server-offline-smoke-20261030-02/d3-results/`.
Tải lại bằng API reference `/3` vào thư mục mới nếu chưa có kết quả trên máy.
Archive SHA-256:
`c14ed4701f33d7c798c7917f45f072b1a1bbedb8c9a5394ef75f5688731bee2c`.

Version 1 thất bại vì DNS Maven/GitHub; version 2 thất bại vì Kaggle tự giải nén
file `.gz` lồng bên trong archive. Cả hai được giữ là failed. Version 3 dùng
archive `.bin` giữ nguyên bytes và đã vượt kiểm tra toàn bộ phép đo.

Nguồn: [Kaggle kernels API](https://github.com/Kaggle/kaggle-cli/blob/main/docs/kernels.md),
[Kaggle OAuth](https://github.com/Kaggle/kaggle-cli/blob/main/skills/references/auth.md),
[PostgreSQL apt](https://www.postgresql.org/download/linux/ubuntu/),
[initdb](https://www.postgresql.org/docs/16/app-initdb.html).
