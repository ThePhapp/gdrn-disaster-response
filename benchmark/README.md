# D3 — Kiểm thử hiệu năng báo cáo có thể tái lập

Thư mục này chứa công cụ và bằng chứng đo D3, chỉ đo hợp đồng đã có: E07 tạo báo cáo và E08 liệt kê có pagination hoặc lọc bán kính. Không bổ sung API tạo dữ liệu mẫu, Redis, broker hay luồng xử lý ứng dụng riêng để đo hiệu năng.

## Chạy toàn bộ hệ thống trên Kaggle CPU

Xem [hướng dẫn cài đặt và chạy qua API](../docs/benchmark/KAGGLE_CPU.md) để chạy tác vụ Kaggle riêng tư với Java 21, PostgreSQL 16/PostGIS và k6, không cần Docker hay máy chủ ngoài. Mẫu `kaggle_server_cpu.ipynb` được chuẩn bị bằng `kaggle_api.py`. Quy trình tải Dataset bên dưới vẫn được giữ.

Phiên bản notebook riêng tư số 4 đã hoàn tất **48/48 lượt** trên Kaggle CPU. Hướng dẫn liên kết ghi mã nguồn, bằng chứng và giới hạn. Phiên bản 3 là bằng chứng kiểm tra nhanh ba kịch bản.

## Kaggle CPU: quy trình thực thi đầy đủ

`kaggle_cpu_preflight.ipynb` chạy ứng dụng, cụm PostGIS riêng và k6 trực tiếp trong notebook CPU. Giữ tên tệp để các liên kết cũ hoạt động; notebook đã thực thi thật. Không cần Docker hay thông tin xác thực bên ngoài; cần Internet và quyền gốc trên môi trường Linux dùng tạm.

1. Chạy `python benchmark/package_cpu_source.py` trên máy cục bộ.
2. Tải `benchmark/results/gdrn-cpu-source.zip` lên **Dataset Kaggle riêng tư**.
3. Nhập notebook, chọn **Add Input** với Dataset đó, đặt **Accelerator: None**, **Internet: On**, rồi **Run All**.
4. Tải `gdrn-cpu-results.zip` từ **Output**. Kiểm tra `manifest.json`: `environment` là `Kaggle CPU`, `status` là `completed`, ma trận mặc định đủ 48 lượt (4 kịch bản × 4 mức VU × 3 lần lặp).

Notebook cài Java 21, PostgreSQL/PostGIS và k6 1.6.1 đã đối chiếu checksum, biên dịch nguồn, tạo tài khoản tạm và chạy trên địa chỉ vòng lặp. Mỗi lần lặp chỉ đặt lại cơ sở dữ liệu riêng; đọc/hỗn hợp tạo 1.000 dòng mẫu, ghi bắt đầu rỗng. Mặc định 1/10/50/100 VU, 10 giây làm nóng, 30 giây giữ tải, 10 giây giảm tải. Lỗi chuẩn bị hoặc vượt ngưỡng k6 sẽ dừng tăng tải và giữ bằng chứng chưa hoàn tất. Chạy lại tạo cơ sở dữ liệu mới.

Kết quả gồm `manifest.json` (mã băm nguồn/JAR, phiên bản, cấu trúc triển khai, cấu hình), `run.json`, `seed.json`, `raw.json.gz`, `summary.json` chỉ chứa số đo, `resources.csv` cho từng lượt, cùng `results.json`, `REPORT.md` và checksum. Số đo loại đăng nhập nhưng gồm làm nóng/giảm tải. Lấy mẫu mỗi giây: CPU/bộ nhớ máy và RSS ứng dụng/k6/Postgres. Cộng RSS Postgres có thể tính trùng trang dùng chung. Máy phát tải dùng chung CPU nên số đo không xác lập năng lực máy chủ độc lập. Bước biên dịch bỏ kiểm thử; đo tải không thay thế `mvnw clean verify`.

Để kiểm chứng tương đương trên **Linux cục bộ**, chạy với quyền gốc trong container dùng tạm:

```bash
bash benchmark/setup-cpu.sh
python3 benchmark/run_cpu.py --repetitions 1
```

Gắn đúng nhãn cục bộ cho kết quả Linux. Có quy trình chưa đủ chứng minh đã chạy thành công trên Kaggle.

Tham khảo: [Cài đặt notebook Kaggle](https://www.kaggle.com/docs/notebooks), [tùy chỉnh tổng kết k6](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/).

## Cô lập và điều kiện chuẩn bị

Dùng dự án Compose và cơ sở dữ liệu dùng tạm. Không đặt lại cơ sở dữ liệu trình diễn thông thường.

```powershell
Copy-Item .env.example .env.benchmark
# Sửa .env.benchmark trên máy: dùng POSTGRES_DB=gdrn_benchmark,
# DB_PORT=55432, APP_PORT=18080, thông tin xác thực riêng và SPRING_PROFILES_ACTIVE=demo.

docker compose -p gdrn-benchmark --env-file .env.benchmark up -d --build database backend
$env:BASE_URL = 'http://127.0.0.1:18080'
$env:BENCHMARK_EMAIL = '<email người dân từ .env.benchmark>'
$env:BENCHMARK_PASSWORD = '<mật khẩu người dân từ .env.benchmark>'
```

Dùng tài khoản người dân vì E07 chỉ dành cho người dân. Luồng đọc của điều phối viên thuộc phạm vi phân quyền riêng, không trộn vào tải này. Giá trị trên chỉ là ví dụ; không đưa thông tin xác thực thật vào Git, notebook hay kết quả.

Ưu tiên k6 cài trực tiếp; nếu thiếu có thể dùng ảnh Docker cục bộ:

```powershell
docker pull grafana/k6:latest
```

Không giả định Kaggle có Docker daemon. Quy trình Linux phía trên không công khai cơ sở dữ liệu, dịch vụ hay đường hầm mạng.

## Đặt lại dữ liệu, tạo mẫu và chạy

Phải xác nhận đặt lại; cả tên dự án và cơ sở dữ liệu phải chứa `bench`, `test`, `ci` hoặc `kaggle`:

```powershell
.\benchmark\reset-reporting.ps1 `
  -ComposeFile .\docker-compose.yml `
  -EnvFile .\.env.benchmark `
  -ProjectName gdrn-benchmark `
  -ConfirmReset
```

Dữ liệu mẫu đi qua `POST /api/reports` (E07), giữ kiểm tra và lưu trữ theo published contract. Bộ sinh có tính xác định: 70% dòng gần `CENTER_LAT`/`CENTER_LON`, 30% phân bố rộng, luân phiên cả năm loại báo cáo. Tệp `seed.json` không chứa bí mật.

Chạy một lần lặp cô lập bằng k6 trong Docker:

```powershell
.\benchmark\run-reporting-benchmark.ps1 `
  -K6Mode docker -Workload read-page -Vus 10 -Duration 30s -Warmup 10s `
  -Repetitions 1 -DatasetSize 1000 -Reset -SeedData `
  -ComposeFile .\docker-compose.yml -BenchmarkEnvFile .\.env.benchmark `
  -ProjectName gdrn-benchmark -CollectDockerStats
```

Đọc bán kính dùng `-Workload read-radius`. Chỉ ghi thì đặt lại trước và bỏ `-SeedData`; `mixed` cần tạo mẫu nếu nhánh đọc cần dữ liệu. Thư mục lượt chạy gồm `raw.json`, `summary.json`, `run.json`, manifest dữ liệu mẫu và mẫu CPU/RAM Docker nếu bật.

Bắt đầu kiểm tra nhanh, sau đó 10, 50, 100 VU nếu máy cho phép. Dừng khi CPU, bộ nhớ, cơ sở dữ liệu bão hòa hoặc tỷ lệ lỗi yêu cầu; ghi lý do và lặp mức thấp hơn để đối chiếu. Mỗi lần lặp phải đặt lại và tạo cùng dữ liệu. Kịch bản không thêm thời gian ngủ hay latency nhân tạo.

## Diễn giải kết quả

Báo cáo throughput (yêu cầu/giây), latency trung bình, p50/p95/p99, tỷ lệ lỗi, CPU/RAM nếu có mẫu Docker dùng được. Tách chuẩn bị/đăng nhập khỏi số đo nghiệp vụ. Công cụ đối chiếu toàn bộ thời lượng với tuổi thọ JWT 900 giây và từ chối lượt có thể hết hạn token.

Kết quả cục bộ chỉ là baseline cho tới khi hoàn tất kiểm tra tích hợp X1 trên đúng commit được đo; không suy rộng sang mọi máy. Bàn giao phải có kích thước/phân bố dữ liệu, tỷ lệ truy vấn, làm nóng, số lần lặp, cách đặt lại, cấu trúc triển khai, commit và giới hạn. Giữ siêu dữ liệu thời gian trong bằng chứng gốc. Bộ nhớ đệm, bản sao đọc, queue hay hạ tầng Pha 2 chỉ là giả thuyết, không triển khai trong D3.
