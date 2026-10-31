# D3: ứng dụng phía máy chủ + PostGIS + k6 cùng chạy trên Kaggle CPU

Notebook chạy toàn bộ cấu trúc triển khai trong một phiên Linux CPU của Kaggle: Java 21,
PostgreSQL 16/PostGIS và k6 cài trực tiếp. Không cần Docker daemon, ứng dụng/cơ sở dữ liệu bên
ngoài, đường hầm mạng hoặc công khai cổng.

## 1. Cài công cụ điều khiển trên Windows

Từ gốc kho mã:

```powershell
python -m venv .tools/kaggle-api
& .\.tools\kaggle-api\Scripts\python.exe -m pip install -r benchmark/requirements-kaggle.txt
& .\.tools\kaggle-api\Scripts\kaggle.exe auth login
```

Chấp thuận đăng nhập trên trình duyệt. OAuth được lưu trên máy; không đưa token
vào Git hoặc notebook. Chỉ cần đăng nhập lại khi thông tin xác thực hết hạn/bị thu hồi.

## 2. AI chuẩn bị và chạy tác vụ

Thay `YOUR_USER` bằng tên người dùng Kaggle. Lệnh sau tạo notebook **riêng tư**, chỉ CPU,
Internet bật, gửi tác vụ, theo dõi đúng phiên bản đã gửi và tải kết quả:

```powershell
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py run `
  --kernel YOUR_USER/gdrn-d3-server-cpu `
  --profile smoke `
  --output benchmark/results/kaggle-smoke-01
```

Đầu ra phải là thư mục mới/rỗng. `smoke` tạo 100 báo cáo cho mỗi phép đọc và chạy
ba phép đo ở 1 VU: E07 ghi, E08 trang và E08 bán kính. Mặc định làm nóng 2s,
giữ tải 5s, giảm tải 2s. Mỗi phép đo tự đặt lại cơ sở dữ liệu tạm riêng của tác vụ.

Sau kiểm tra nhanh thành công, chạy đầy đủ 48 lượt:

```powershell
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py run `
  --kernel YOUR_USER/gdrn-d3-server-cpu `
  --profile full `
  --runtime-dataset YOUR_USER/gdrn-d3-offline-runtime-v2 `
  --runtime-manifest .tools/kaggle/offline-runtime/runtime-manifest.json `
  --output benchmark/results/kaggle-full-01
```

`full` dùng 1.000 báo cáo, làm nóng 10s/steady 30s/ramp-down 10s, chạy 4 kịch bản tải
(ghi, trang, bán kính, mixed) ở 1/10/50/100 VUs, mỗi tổ hợp 3 lần = 48 lượt.
Ngưỡng lỗi từ 1% trở lên làm phép đo/job thất bại, dừng đo hiệu năng và giữ kết quả
đã có. Profile/config được lưu vào bản kê.

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

Mỗi lệnh xuất JSON. `run` timeout cục bộ không tự hủy tác vụ bên Kaggle; dùng tham chiếu
đã in để kiểm tra/tải tiếp. Gói chuẩn bị và `submission.json` nằm trong
`.tools/kaggle/submission/` (được Git bỏ qua). `--config file.json` có thể thay cấu hình
cấu hình; lấy các trường từ `job.json`, chỉ truyền object `configuration`.

## 3. Chạy ngoại tuyến khi Kaggle không có DNS

Nếu tác vụ không truy cập được Maven/GitHub dù Internet đã bật, dùng Bộ dữ liệu khi chạy
riêng tư. Cả ứng dụng phía máy chủ, PostgreSQL/PostGIS và k6 vẫn **thực thi trên Kaggle CPU**;
JAR được **biên dịch trước trên Linux bên ngoài Kaggle**. Chế độ này tắt Internet
trong notebook và kiểm tra SHA-256 của archive/từng tệp trước khi chạy.

Chuẩn bị trên Ubuntu 24.04 x86_64 có Python 3, Git, quyền root/apt và Internet
(có thể là container Docker cục bộ). Từ gốc kho mã, đóng gói đúng mã nguồn commit:

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

Script cài bộ công cụ biên dịch, Maven package (bỏ qua kiểm thử), tạo JRE21 bằng jlink và thu thập
các thư viện cài trực tiếp. Đầu ra gồm gói nén và `runtime-manifest.json`; giữ nguyên
hai tệp này khi chuyển về máy Windows. Archive tar/gzip dùng đuôi `.bin` để
Kaggle giữ nguyên byte, tránh tự giải nén tiếp các `.gz` bên trong. Không đổi
đuôi tệp trước khi tải lên. Chỉ phù hợp ảnh môi trường Linux tương thích
Ubuntu 24.04/glibc 2.39; cần đóng gói lại nếu Kaggle đổi ảnh môi trường.

Upload qua API một lần (Bộ dữ liệu mới, **riêng tư**, không tự ghi đè Bộ dữ liệu cũ):

```powershell
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py upload-runtime `
  --dataset YOUR_USER/gdrn-d3-offline-runtime `
  --folder .tools/kaggle/offline-runtime
& .\.tools\kaggle-api\Scripts\kaggle.exe datasets status YOUR_USER/gdrn-d3-offline-runtime
```

Khi Bộ dữ liệu đã sẵn sàng:

```powershell
& .\.tools\kaggle-api\Scripts\python.exe benchmark/kaggle_api.py run `
  --kernel YOUR_USER/gdrn-d3-server-cpu --profile smoke `
  --runtime-dataset YOUR_USER/gdrn-d3-offline-runtime `
  --runtime-manifest .tools/kaggle/offline-runtime/runtime-manifest.json `
  --output benchmark/results/kaggle-offline-smoke-01
```

Có thể dùng cùng hai tham số khi chạy với `--profile ladder`. JAR và mã nguồn phải
cùng commit; máy khách từ chối nếu HEAD đã đổi. Khi đổi ứng dụng, đóng gói khi chạy
mới và dùng Bộ dữ liệu slug mới. Môi trường chạy không chứa mật khẩu/JWT; tác vụ sinh thông tin xác thực
mới cho cơ sở dữ liệu và trình diễn accounts. Không tải `.env` hay thư mục người dùng lên Bộ dữ liệu.

## 4. Notebook làm gì?

- Đóng gói **mã ứng dụng đã commit** qua `git archive`, không lấy `.env`, tệp
  chưa được Git theo dõi hay sửa đổi ứng dụng chưa commit. Native bộ công cụ đo hiện tại được thêm
  riêng, có SHA-256. Không cần chờ đẩy mã mã nguồn lên GitHub.
- Chế độ trực tuyến kiểm tra Linux/root/apt, cài JDK21 và PostgreSQL16/PostGIS. Dùng PostgreSQL apt
  kho mã chính thức nếu distro chưa có PostgreSQL16. k6 được tải theo phiên bản
  cố định, ghi phiên bản và gói nén SHA-256 vào bản kê.
- Chế độ trực tuyến biên dịch JAR bằng Maven Wrapper; ngoại tuyến dùng JAR đã biên dịch trên Linux
  ngoài Kaggle cùng mã nguồn commit. `-DskipTests` chỉ dùng cho package;
  đây **không phải clean xác minh hoặc bằng chứng CI**.
- Tạo cluster `initdb` mới trong `/tmp`, chạy PostgreSQL dưới người dùng `postgres`
  (hoặc `nobody` nếu ảnh môi trường ngoại tuyến chưa có người dùng đó),
  dùng SCRAM và mật khẩu ngẫu nhiên. PostgreSQL/backend chỉ bind `127.0.0.1`.
- Tạo JWT signing key và ba tài khoản trình diễn ngẫu nhiên; chờ ứng dụng phía máy chủ mức sẵn sàng `UP`.
- Seed qua E07, dùng k6 tập lệnh D3 hiện có. Reset chỉ tác động cơ sở dữ liệu vừa tạo.
- Lấy CPU/RSS theo nhóm tiến trình backend/database/k6 qua `/proc`. Dừng các tiến trình
  do tác vụ tạo và xuất nhật ký đã loại thông tin nhạy cảm; không xuất data directory/password tệp.

[Template thực thi](../../benchmark/kaggle_server_cpu.ipynb) cần qua `prepare`/`run`
để có mã nguồn gói. Upload trực tiếp template rỗng sẽ dừng với hướng dẫn.
[Notebook theo Bộ dữ liệu hiện có](../../benchmark/kaggle_cpu_preflight.ipynb) được
giữ nguyên cùng `setup-cpu.sh`/`run_cpu.py`. Luồng API đóng gói nguồn trực tiếp vào
notebook; chỉ chế độ ngoại tuyến cần Bộ dữ liệu chứa khi chạy.

## 5. Kết quả và giới hạn

Đầu ra tải về có thư mục `d3-results/`:

- `manifest.json`: mã nguồn commit, hash harness/bundle, versions, cấu trúc triển khai,
  cấu hình, từng phép đo, lỗi nếu có và kết quả dọn dẹp.
- Mỗi phép đo: `raw.json`, `summary.json` đã xóa `setup_data`, `run.json`,
  `process-stats.csv`; phép đọc có thêm `seed.json`.
- Logs build/setup/backend/PostgreSQL/k6 đã loại mật khẩu và JWT.
- `kaggle-download.json`: tham chiếu Kaggle phiên bản và kết luận đo hiệu năng hoàn tất.

Client chỉ báo hoàn tất khi có bản kê `complete`, các phép đo exit mã nguồn 0,
tệp kết quả SHA-256 khớp và dọn dẹp hoàn tất. Preflight thành công hoặc notebook xanh nhưng thiếu phép đo
không đủ để kết luận D3 đạt.

Máy phát tải và máy chủ dùng chung CPU/RAM: số đo phản ánh cấu trúc triển khai này, không phải
năng lực máy chủ được cô lập. RSS cộng các tiến trình PostgreSQL có thể tính trùng
dùng chung pages; không so trực tiếp với Docker bộ nhớ statistics. PostgreSQL major
giữ ở 16; PostGIS/package thực cài được ghi trong bản kê. Kaggle thay ảnh môi trường,
thiếu quyền apt/Internet hoặc hết quota có thể làm tác vụ không chạy được; giữ lỗi
thực tế, không đổi nhãn thành ĐẠT.

Profile API `smoke`/`ladder` dùng để kiểm tra nhanh; `full` mới là ma trận D3 đầy đủ
48 lượt.

## 6. Đầy đủ D3 đã thực thi trên Kaggle

- Tài khoản: `thphap`. [Notebook riêng tư](https://www.kaggle.com/code/thphap/gdrn-d3-server-cpu),
  API tham chiếu chính xác: `thphap/gdrn-d3-server-cpu/4`.
- [Bộ dữ liệu khi chạy riêng tư](https://www.kaggle.com/datasets/thphap/gdrn-d3-offline-runtime-v2).
  chỉ CPU, GPU/TPU tắt, Internet tắt; ảnh môi trường Kaggle có 4 logical CPUs,
  CPU quota 4 cores và giới hạn RAM 30 GiB.
- Source ứng dụng: `2545bba2da7ec26830f7372369f05a6186876059`.
  JAR biên dịch trên Linux cục bộ; **ứng dụng phía máy chủ + cơ sở dữ liệu + k6 thực thi trên Kaggle**.
- Cấu hình: 1.000 báo cáo, 4 kịch bản tải (`write`, `read-page`, `read-radius`, `mixed`),
  4 mức tải (1/10/50/100 VUs), 3 lần lặp = **48/48 lượt chạy**.
  Manifest `complete`, mọi lượt chạy exit mã nguồn 0, có số đo tài nguyên, dọn dẹp hoàn tất.
  Tải về 318 tệp, kiểm tra khớp 315 tệp kết quả SHA-256; không phát hiện JWT trong đầu ra.
- Java `21.0.12.1`, PostgreSQL `16.15`, PostGIS `3.4.2`, k6 `v1.3.0`.

Kết quả cục bộ (được Git bỏ qua):
`benchmark/results/kaggle-server-full-20261030-01/d3-results/`.
Tệp xác nhận tải và kiểm tra:
`benchmark/results/kaggle-server-full-20261030-01/kaggle-download.json`.

Đây là bằng chứng hoàn thành ma trận đo hiệu năng D3 trên cấu trúc triển khai một CPU dùng chung;
không phải năng lực của một máy chủ độc lập. Các số đo bao gồm warm-up/steady/ramp-down
và loại đăng nhập khỏi số đo nghiệp vụ.

## 7. Kiểm tra nhanh đã thực thi trên Kaggle

- Tài khoản: `thphap`. [Notebook riêng tư](https://www.kaggle.com/code/thphap/gdrn-d3-server-cpu),
  API tham chiếu chính xác: `thphap/gdrn-d3-server-cpu/3`.
- [Bộ dữ liệu khi chạy riêng tư](https://www.kaggle.com/datasets/thphap/gdrn-d3-offline-runtime-v2).
  chỉ CPU, GPU/TPU tắt, Internet tắt; ảnh môi trường Kaggle có 4 logical CPUs,
  CPU quota 4 cores và giới hạn RAM 30 GiB.
- Source ứng dụng: `2545bba2da7ec26830f7372369f05a6186876059`.
  JAR biên dịch trên Linux cục bộ; **ứng dụng phía máy chủ + cơ sở dữ liệu + k6 thực thi trên Kaggle**.
- Java `21.0.12.1`, PostgreSQL `16.15`, PostGIS `3.4.2`, k6 `v1.3.0`.
  Manifest `complete`, 3 lượt chạy exit mã nguồn 0, có số đo tài nguyên, dọn dẹp hoàn tất.
  Tải về 24 tệp, kiểm tra khớp 22 tệp kết quả SHA-256; không phát hiện JWT trong đầu ra.

| Kịch bản tải | VUs | Báo cáo tạo dữ liệu mẫu | Requests nghiệp vụ | Lỗi nghiệp vụ | p95 (ms) |
|---|---:|---:|---:|---:|---:|
| E07 ghi | 1 | 0 | 755 | 0% | 14.30 |
| E08 trang | 1 | 100 | 1.237 | 0% | 8.32 |
| E08 bán kính | 1 | 100 | 1.500 | 0% | 5.18 |

Warm-up 2s, giữ tải 5s, giảm tải 2s; tổng kết gồm cả các giai đoạn này, không gồm
đăng nhập trong các số đo nghiệp vụ. Đây là kiểm tra nhanh lịch sử; đầy đủ matrix ở mục 6 mới là
kết quả hoàn thành D3.

Kết quả cục bộ (được Git bỏ qua):
`benchmark/results/kaggle-server-offline-smoke-20261030-02/d3-results/`.
Tải lại bằng API tham chiếu `/3` vào thư mục mới nếu chưa có kết quả trên máy.
Archive SHA-256:
`c14ed4701f33d7c798c7917f45f072b1a1bbedb8c9a5394ef75f5688731bee2c`.

Version 1 thất bại vì DNS Maven/GitHub; phiên bản 2 thất bại vì Kaggle tự giải nén
tệp `.gz` lồng bên trong gói nén. Cả hai được giữ là thất bại. Version 3 dùng
gói nén `.bin` giữ nguyên byte và đã vượt kiểm tra toàn bộ phép đo.

Nguồn: [Kaggle kernels API](https://github.com/Kaggle/kaggle-cli/blob/main/docs/kernels.md),
[Kaggle OAuth](https://github.com/Kaggle/kaggle-cli/blob/main/skills/references/auth.md),
[PostgreSQL apt](https://www.postgresql.org/download/linux/ubuntu/),
[initdb](https://www.postgresql.org/docs/16/app-initdb.html).
