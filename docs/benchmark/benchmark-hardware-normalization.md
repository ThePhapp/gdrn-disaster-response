# Hướng Dẫn Chuẩn Hóa Phần Cứng & Giải Thích Số Liệu Benchmark (D3)

## 1. Mục Đích

Tài liệu này cung cấp nguyên tắc chuẩn hóa và phương pháp luận giải thích các chỉ số hiệu năng thực nghiệm thu được từ [Handoff D3](../handoffs/D3.md) và [D3 Contract](D3.md), giúp hội đồng bảo vệ và các kỹ sư đánh giá khách quan kết quả đo tải trên các cấu hình phần cứng khác nhau.

---

## 2. Quy Ước Đo Lường CPU & Bộ Nhớ Trong Docker Stats

### 2.1. Đơn Vị Tỷ Lệ Phần Trăm CPU (Multi-core CPU Percentage)
Trong cơ chế cgroups của Linux container (và Docker Desktop WSL2 backend):
- **100% CPU** tương đương với **1 lõi logic (logical core / vCPU)** hoạt động đầy tải (100% single-core saturation).
- Trên máy trạm đo kiểm của D3 (Intel Core i5-12500H, 12 nhân vật lý, **16 logical processors**):
  - Mức CPU trần lý thuyết là **1,600%**.
  - **Diễn giải số liệu thực nghiệm:**
    - Tải 10 VU: CPU trung bình `208.68%` $\rightarrow$ Sử dụng xấp xỉ **2.08 lõi logic** (~13.0% tổng công suất vi xử lý của máy host).
    - Tải 50 VU: CPU trung bình `306.05%` $\rightarrow$ Sử dụng xấp xỉ **3.06 lõi logic** (~19.1% tổng công suất máy host).
    - Tải 100 VU: CPU trung bình `238.21%` $\rightarrow$ Sử dụng xấp xỉ **2.38 lõi logic** (~14.8% tổng công suất máy host).
  - Mức đỉnh ngắn hạn (Peak `790.33%` tại 10 VU) phản ánh giai đoạn **Warm-up và JVM JIT C2 Compilation** khi Tomcat thread pool và HikariCP pool đồng thời khởi tạo luồng song song.

### 2.2. Mức Chiếm Dụng RAM (Memory RSS)
- Backend container duy trì ổn định trong khoảng **1.18 GiB – 1.45 GiB** (7.56% – 9.22% của 15.7 GiB host RAM).
- Database container (PostGIS) duy trì ổn định ở mức **~344 MiB – 345 MiB** (2.14% – 2.15%), chứng minh GiST index của PostGIS và shared buffers hoạt động tối ưu, không có rò rỉ bộ đệm ngoài ý muốn.

---

## 3. Phân Tích Phổ Độ Trễ (Latency Distribution)

| Mức tải | Throughput | Độ trễ p50 | Độ trễ p95 | Độ trễ p99 | Tỷ lệ lỗi | Đánh giá |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1 VU (Smoke)** | 137.71 req/s | 4.73 ms | 7.67 ms | 10.85 ms | 0.00% | Đáp ứng gần như tức thì |
| **10 VU** | 928.17 req/s | 6.49 ms | 12.58 ms | 17.55 ms | 0.00% | Thông lượng tuyến tính cao |
| **50 VU** | 1,439.13 req/s | 17.35 ms | 36.35 ms | 48.63 ms | 0.00% | Điểm cân bằng tải tối ưu |
| **100 VU** | 1,996.98 req/s | 30.19 ms | 78.70 ms | 105.28 ms | 0.00% | Bắt đầu bão hòa hàng đợi CPU |

### Nhận định:
1. **Zero Error Rate (0.00%):** Ở mức gần 2,000 req/s với 100 VU đồng thời, hệ thống không làm rớt bất kỳ request nào (không gặp HTTP 5xx, không nghẽn kết nối DB).
2. **Graceful Latency Degradation:** Độ trễ p99 tại 100 VU là **105.28 ms**, vẫn thấp hơn rất nhiều so với ngưỡng tiêu chuẩn chấp nhận của Web API thông thường (< 500 ms).

---

## 4. Hướng Dẫn Tái Lập Trên Phần Cứng Khác Nhau

Khi tái lập kịch bản k6 trên các thiết bị có cấu hình khác:
- **Thiết bị 4-core / 8GB RAM (Laptop cá nhân phổ thông):**
  - Khuyến nghị thang đo VU thích ứng: 1 VU $\rightarrow$ 5 VU $\rightarrow$ 20 VU.
  - Tránh đẩy ngay 100 VU nếu Docker Desktop WSL2 chỉ được cấp 2 GB RAM (có thể gây OOM Killer ở cấp OS).
- **Môi trường Cloud / Kaggle Notebooks:**
  - Cần đảm bảo kết nối mạng nội bộ giữa client k6 và backend có độ trễ < 1 ms (không đo qua VPN hoặc mạng WAN công cộng để tránh làm sai lệch độ trễ mạng).
