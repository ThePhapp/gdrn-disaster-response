# Bằng chứng kiểm thử hiệu năng đầy đủ GDRN D3

- Tác vụ Kaggle: [thphap/gdrn-d3-server-cpu/4](https://www.kaggle.com/code/thphap/gdrn-d3-server-cpu)
- Bộ dữ liệu môi trường chạy: [thphap/gdrn-d3-offline-runtime-v2](https://www.kaggle.com/datasets/thphap/gdrn-d3-offline-runtime-v2)
- Commit mã nguồn: `2545bba2da7ec26830f7372369f05a6186876059`
- Cấu hình: `full`, 1.000 báo cáo, hạt giống `20261024`
- Ma trận: 4 kịch bản × 4 mức VU (1/10/50/100) × 3 lần lặp = **48/48 lượt**
- Kịch bản: `write`, `read-page`, `read-radius`, `mixed`
- Mỗi lượt: 10 giây làm nóng, 30 giây giữ tải, 10 giây giảm tải

## Kết quả

| Kiểm tra | Kết quả |
|---|---|
| Trạng thái bản kê | `complete` |
| Mã thoát các lượt | Tất cả `0` |
| Dọn dẹp | `complete` |
| Số đo tài nguyên | Có ở mọi lượt |
| Tính toàn vẹn tệp | 315/315 mã SHA-256 khớp |
| Loại thông tin xác thực | Không thấy JWT trong bằng chứng xuất ra |

## Tổng hợp hiệu năng

Mỗi ô là trung bình ba lần lặp theo kịch bản/mức VU. Thông lượng là yêu cầu nghiệp vụ mỗi giây; độ trễ là p95 của API, tính bằng mili giây.

| Kịch bản tải | 1 VU | 10 VU | 50 VU | 100 VU |
|---|---:|---:|---:|---:|
| `write` | 211.58 req/s, 4.66 ms | 1,388.13 req/s, 7.90 ms | 1,666.58 req/s, 59.49 ms | 1,732.34 req/s, 126.40 ms |
| `read-page` | 265.97 req/s, 3.76 ms | 993.64 req/s, 13.08 ms | 1,103.59 req/s, 95.44 ms | 1,064.69 req/s, 223.38 ms |
| `read-radius` | 124.29 req/s, 6.63 ms | 353.07 req/s, 34.84 ms | 372.29 req/s, 245.73 ms | 374.24 req/s, 514.22 ms |
| `mixed` | 177.20 req/s, 10.88 ms | 427.61 req/s, 69.65 ms | 446.36 req/s, 252.47 ms | 447.03 req/s, 521.66 ms |

Tổng 48 lượt có 1.675.588 yêu cầu nghiệp vụ, tỷ lệ lỗi 0%. Ở 100 VU, thông lượng ghi tiếp tục tăng, đọc phân trang chững lại, còn đọc bán kính/hỗn hợp có độ trễ cao hơn. Mẫu kết quả gợi ý bão hòa tài nguyên dùng chung; cần đo sâu để xác định điểm nghẽn.

## Môi trường chạy

- Java `21.0.12.1`
- PostgreSQL `16.15`
- PostGIS `3.4.2`
- k6 `v1.3.0`
- Ảnh môi trường Kaggle CPU: 4 CPU logic, hạn mức 4 lõi, giới hạn bộ nhớ 30 GiB
- Tắt Internet; ứng dụng, PostgreSQL/PostGIS và k6 thực thi trong Kaggle

`manifest.json` đầy đủ và xác nhận tải về nằm cạnh báo cáo. Dữ liệu k6 thô lớn và nhật ký nằm trong thư mục kết quả cục bộ được Git bỏ qua.
