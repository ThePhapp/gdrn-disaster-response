# Kịch bản tải Reporting của GDRN

`reporting.js` là kịch bản k6 của D3 cho các hợp đồng Reporting hiện có:

- `write`: E07 `POST /api/reports` bằng tài khoản người dân.
- `read-page`: E08 `GET /api/reports`, phân trang và sắp xếp ổn định.
- `read-radius`: E08 `GET /api/reports` với `lat`, `lon`, `radiusMeters`.
- `mixed`: 20% ghi, 60% đọc phân trang, 20% đọc bán kính.

Công cụ không có URL môi trường thật hay thông tin xác thực dự phòng. Truyền toàn bộ kết nối/tài khoản qua biến môi trường. JWT ngắn hạn được lấy một lần trong `setup()`; từ chối lượt có thời lượng dự kiến vượt tuổi thọ token để không nhận nhầm lỗi hết hạn thành điểm nghẽn nghiệp vụ.

Ví dụ với k6 cài trực tiếp:

```powershell
$env:BASE_URL = 'http://127.0.0.1:8080'
$env:BENCHMARK_EMAIL = 'citizen@example.test'
$env:BENCHMARK_PASSWORD = 'set-locally'
$env:WORKLOAD = 'read-page'
$env:VUS = '10'
$env:DURATION = '30s'
$env:WARMUP = '10s'
$env:RAMP_DOWN = '10s'
$env:HTTP_TIMEOUT = '5s'
k6 run --out json=benchmark/results/raw.json --summary-export benchmark/results/summary.json benchmark/k6/reporting.js
```

Không đưa thông tin xác thực hoặc dữ liệu thô vào Git. Công cụ ghi JSON thô và tổng kết vào thư mục riêng mỗi lượt dưới `benchmark/results/`, được Git bỏ qua. Đặt lại và tạo mẫu trên cơ sở dữ liệu kiểm thử dùng tạm giữa các lần lặp; xem [hướng dẫn chung](../README.md).
