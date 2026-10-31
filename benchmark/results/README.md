# Quy ước kết quả kiểm thử hiệu năng cục bộ

`run_cpu.py` tạo thư mục riêng cho từng phiên, gồm `manifest.json`, `results.json`, `REPORT.md`, nhật ký và `checksums.json`. Mỗi thư mục con `<workload>-<VUs>vu-<repetition>/` chứa `run.json`, `raw.json.gz`, `summary.json` chỉ có số đo, `resources.csv` và bằng chứng tạo mẫu nếu có. Lượt chưa xong giữ nhãn `incomplete`; đọc nhật ký, không coi số đo thiếu là 0. Mỗi dòng là một lần lặp, không phải trung bình phân vị của nhiều lần. Giữ cả thư mục khi chia sẻ.

`gdrn-cpu-source.zip` do `package_cpu_source.py` tạo là gói mã nguồn tải lên, không phải bằng chứng đo. Kaggle xuất kết quả riêng trong `gdrn-cpu-results.zip`. Cả hai được Git bỏ qua.

## Công cụ PowerShell/Docker

Mỗi lần gọi `run-reporting-benchmark.ps1` tạo thư mục chứa:

- `run.json`: commit, kịch bản, VU, thời lượng, bộ dữ liệu/hạt giống và siêu dữ liệu thời gian.
- `raw.json`: mẫu k6 thô.
- `summary.json`: thông lượng, phân vị độ trễ và tỷ lệ lỗi.
- `seed.json`: phân bố và kết quả tạo mẫu khi dùng `-SeedData`.
- `docker-stats.csv`: mẫu CPU/RAM khi dùng `-CollectDockerStats`.

Git bỏ qua kết quả vì chúng phụ thuộc máy và có thể lớn. Giữ thư mục làm bằng chứng D3 bên ngoài, tham chiếu đường dẫn/mã kiểm tra trong bàn giao. Công cụ loại JWT chuẩn bị khỏi `summary.json` trước khi lưu; chỉ giữ dữ liệu thô từ lệnh tự chạy sau khi kiểm tra không lộ thông tin xác thực.
