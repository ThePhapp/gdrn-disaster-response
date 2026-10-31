# Kết quả kiểm thử CPU cục bộ

## Kết quả 16 tổ hợp trên Ryzen 7

Đã chạy **16/16 tổ hợp**, mỗi tổ hợp **1 lần**: 4 kịch bản tải × 1/10/50/100 VUs.
Môi trường là Ubuntu 24.04 trong Docker Desktop, AMD Ryzen 7 6800H, 16 CPU logic,
RAM VM 6.62 GiB; Java 21, PostgreSQL 16.15/PostGIS 3.4.2, k6 1.6.1. Backend,
DB và k6 dùng chung VM; backend giới hạn heap 1 GiB.

Mỗi lượt gồm **5s làm nóng + 15s giữ tải + 5s giảm tải**. DB được đặt lại trước
mỗi lượt; `write` bắt đầu từ rỗng, các kịch bản tải còn lại tạo dữ liệu mẫu 1.000 báo cáo. Bảng
tính cả cửa sổ chạy nhưng bỏ yêu cầu đăng nhập; lỗi gồm cả trạng thái HTTP và kiểm tra nội dung phản hồi.

| Kịch bản tải | VUs | Yêu cầu/giây | TB (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Lỗi |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `write` | 1 | 131.85 | 5.57 | 4.12 | 8.54 | 13.35 | 0.00% |
| `read-page` | 1 | 133.58 | 5.39 | 5.14 | 7.48 | 9.49 | 0.00% |
| `read-radius` | 1 | 96.97 | 7.64 | 7.26 | 10.28 | 12.70 | 0.00% |
| `mixed` | 1 | 158.61 | 4.53 | 3.52 | 9.51 | 12.38 | 0.00% |
| `write` | 10 | 2156.13 | 3.40 | 3.19 | 4.76 | 6.69 | 0.00% |
| `read-page` | 10 | 1830.62 | 3.81 | 3.67 | 5.42 | 7.22 | 0.00% |
| `read-radius` | 10 | 838.19 | 8.93 | 8.60 | 12.35 | 16.15 | 0.00% |
| `mixed` | 10 | 839.14 | 8.89 | 5.02 | 29.99 | 39.58 | 0.00% |
| `write` | 50 | 3317.85 | 11.69 | 11.53 | 25.37 | 37.70 | 0.00% |
| `read-page` | 50 | 2637.27 | 14.31 | 12.70 | 33.98 | 47.30 | 0.00% |
| `read-radius` | 50 | 1133.20 | 34.54 | 38.31 | 71.32 | 93.93 | 0.00% |
| `mixed` | 50 | 1103.01 | 35.50 | 33.74 | 83.17 | 116.48 | 0.00% |
| `write` | 100 | 3483.39 | 22.57 | 23.29 | 51.71 | 75.64 | 0.00% |
| `read-page` | 100 | 2748.57 | 28.22 | 23.51 | 77.08 | 112.54 | 0.00% |
| `read-radius` | 100 | 1116.21 | 70.76 | 79.50 | 160.76 | 225.85 | 0.00% |
| `mixed` | 100 | 1172.43 | 67.47 | 68.43 | 159.46 | 217.92 | 0.00% |

Ở kịch bản tải đọc trang, tăng từ 10 lên 100 VUs làm throughput tăng **1.50 lần**,
nhưng p95 tăng **14.22 lần**. Cần đo chuyên sâu và chạy lặp trước khi quyết định dùng
cache hoặc thay đổi kiến trúc.

Tổng cộng có **575.066 yêu cầu nghiệp vụ**, tất cả ngưỡng lỗi dưới 1% đều đạt.
Checksum đã được kiểm tra và các số yêu cầu, trung bình, p50/p95/p99 được tính lại
từ raw. CPU máy cục bộ cao nhất trong mẫu là **84.3%**, RSS backend cao nhất **656.0 MiB**.

Thời lượng cục bộ ngắn và chỉ có một lần lặp, ngoài ra Docker Desktop còn có các
dịch vụ nền. Vì vậy bảng này chỉ dùng làm baseline, không dùng để kết luận năng lực
hay điểm nghẽn. Kaggle chạy ba lần lặp cho mỗi tổ hợp để có bộ số liệu ổn định hơn.

Bằng chứng tổng hợp: [JSON kết quả và cấu hình](cpu-local-2026-10-30.json).

## Kết quả cơ sở trên Intel i5

Nguồn: [biên bản D3](../handoffs/D3.md). Đây là số đo lịch sử trên Windows/
Docker Desktop, Intel i5-12500H, 16 bộ xử lý logic, RAM 15,7 GiB.

| Kịch bản tải | Dữ liệu ban đầu | VUs | Yêu cầu/giây | TB (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Lỗi |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| E07 ghi | 0 | 1 | 164,57 | 3,81 | 3,67 | 4,98 | 5,82 | 0% |
| E08 đọc trang — kiểm tra nhanh | 100 | 1 | 137,71 | 5,00 | 4,73 | 6,73 | 10,85 | 0% |
| E08 đọc bán kính — kiểm tra nhanh | 100 | 1 | 156,06 | 4,31 | 4,10 | 5,85 | 7,78 | 0% |
| E08 đọc trang | 1.000 | 10 | 928,17 | 7,23 | 6,49 | 12,58 | 17,55 | 0% |
| E08 đọc trang | 1.000 | 50 | 1.439,13 | 18,93 | 17,35 | 36,35 | 48,63 | 0% |
| E08 đọc trang | 1.000 | 100 | 1.996,98 | 34,93 | 30,19 | 78,70 | 105,28 | 0% |

**Ghi chú:** VUs là số người dùng ảo chạy đồng thời; request/s là throughput;
p95/p99 là thời gian hoàn thành của 95%/99% yêu cầu. Ở kịch bản tải đọc trang,
tăng từ 10 lên 100 VUs làm throughput tăng khoảng 2,15 lần, còn p95 tăng khoảng
6,26 lần. Bảng này chưa đủ để chỉ ra điểm nghẽn; cần xem thêm CPU/RAM, truy vấn và
chạy lặp. Một vòng lặp ở 50 VUs dừng trong giảm tải dù HTTP và các kiểm tra vẫn đạt.
