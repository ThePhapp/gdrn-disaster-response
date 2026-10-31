# Thẻ Gợi Ý Thuyết Trình & Phân Vai Báo Cáo 4 Thành Viên

Tài liệu hướng dẫn phối hợp và phân vai thuyết trình trực tiếp cho nhóm 4 người trong phiên bảo vệ đồ án Kiến trúc Phần mềm GDRN Pha 1 (Thời lượng: 8 – 10 phút).

---

## 1. Bảng Phân Bổ Thời Lượng và Phân Vai

| Mốc thời gian | Người trình bày | Vai trò phụ trách | Nội dung trọng tâm | Màn hình thao tác |
|---|---|---|---|---|
| **00:00 – 01:30**<br/>*(1.5 phút)* | **Người 1**<br/>*(System Lead)* | Kiến trúc tổng quan & Nền tảng kỹ thuật | - Giới thiệu bài toán cứu hộ khẩn cấp.<br/>- Kiến trúc Modular Monolith, Hexagonal/Clean Architecture, Java 21, Spring Boot, PostGIS.<br/>- Trình diễn Docker Compose stack 3 container và Swagger UI OpenAPI 3.0. | `/login`<br/>`/swagger-ui` |
| **01:30 – 03:30**<br/>*(2.0 phút)* | **Người 2**<br/>*(Reporting & Geo)* | Luồng Công dân (Citizen Flow) & Không gian địa lý | - Đăng nhập tài khoản Người dân (Citizen 1).<br/>- Gửi báo cáo ngập lụt kèm tọa độ bản đồ WGS84 và ảnh minh chứng.<br/>- Kiểm chứng rút đơn chờ duyệt (Pending Withdrawal).<br/>- Kiểm chứng cô lập dữ liệu cá nhân giữa Citizen 1 và Citizen 2 (chặn 404). | `S01` (`/login`)<br/>`S02` (`/reports/new`)<br/>`S03` (`/my-reports`) |
| **03:30 – 05:30**<br/>*(2.0 phút)* | **Người 3**<br/>*(Disaster & Operations)* | Luồng Điều phối (Authority Workbench) | - Đăng nhập tài khoản Điều phối viên (Authority).<br/>- Khởi tạo thảm họa diện rộng (`ACTIVE`).<br/>- Lọc tin báo theo bán kính PostGIS `ST_DWithin` và thẩm định báo cáo (`VERIFIED`).<br/>- Giới thiệu màn hình Dashboard tổng hợp số liệu thực (`S07`). | `S05` (`/operations/disasters`)<br/>`S04` (`/operations/reports`)<br/>`S07` (`/operations/dashboard`) |
| **05:30 – 07:30**<br/>*(2.0 phút)* | **Người 4**<br/>*(Rescue & Benchmark)* | Điều phối cứu hộ & Đo kiểm hiệu năng | - Phân công đội cứu hộ cho báo cáo đã duyệt.<br/>- Trình diễn và giải thích cơ chế chống xung đột đồng thời (`409 TEAM_BUSY` & `409 REPORT_ALREADY_ASSIGNED`).<br/>- Cập nhật tiến độ `IN_PROGRESS` → `COMPLETED` và giải phóng đội.<br/>- Thuyết minh kết quả đo tải k6 (1,996 req/s tại 100 VU) và đề xuất Pha 2. | `S06` (`/operations/rescue`)<br/>`S03` (`/my-reports`)<br/>`docs/benchmark/D3.md` |
| **07:30 – 09:00**<br/>*(1.5 phút)* | **Cả nhóm** | Kết luận & Trả lời phản biện (Q&A) | - Tóm tắt các mục tiêu kiến trúc đã đạt được trong Pha 1.<br/>- Sẵn sàng trả lời 7 câu hỏi phản biện kỹ thuật của Hội đồng. | Slide / Terminal |

---

## 2. Thẻ Lời Thoại Gợi Ý Cho Từng Thành Viên

### Thẻ 1 — Người 1: 00:00 – 01:30
- **Mở đầu:** *"Kính thưa Thầy/Cô trong Hội đồng, nhóm chúng em xin trình bày đồ án Hệ thống Điều phối Cứu hộ Thiên tai GDRN Pha 1. Hệ thống được xây dựng theo phong cách kiến trúc Modular Monolith kết hợp Hexagonal Architecture, đảm bảo ranh giới module độc lập tuyệt đối ở tầng domain mà không cần chi phí vận hành phức tạp của microservices ở giai đoạn đầu."*
- **Thao tác:** Mở trình duyệt tại cổng 5173 và mở tab Swagger UI tại cổng 8080 để chỉ rõ 20 endpoints nghiệp vụ đã được chuẩn hóa OpenAPI.
- **Chuyển giao:** *"Sau đây, bạn [Tên Người 2] sẽ đại diện nhóm trình diễn luồng trải nghiệm thực tế của người dân trong vùng thiên tai."*

### Thẻ 2 — Người 2: 01:30 – 03:30
- **Mở đầu:** *"Em xin phép đăng nhập bằng tài khoản Người dân (Citizen 1). Giao diện người dân được thiết kế theo phong cách Crisis Command với gam màu sáng, giảm áp lực nhận thức và tập trung vào một hành động chính."*
- **Thao tác:**
  1. Vào `/reports/new`, chọn loại thảm họa Ngập úng, chọn tọa độ Hoàng Quốc Việt trên bản đồ, đính kèm ảnh minh chứng hiện trường và bấm Gửi.
  2. Về `/my-reports`, giải thích trạng thái `PENDING`.
  3. Gửi thêm một tin báo phụ và thực hiện thao tác **Rút đơn** (`DELETE`), nhấn mạnh hệ thống thu hồi tin báo an toàn để không lãng phí nguồn lực cứu hộ.
  4. Đăng nhập thử bằng Citizen 2 để chứng minh tính năng cô lập dữ liệu cá nhân (trả về 404 khi truy cập ID của người khác).
- **Chuyển giao:** *"Tiếp theo, bạn [Tên Người 3] sẽ trình bày góc nhìn điều phối tại cơ quan chức năng."*

### Thẻ 3 — Người 3: 03:30 – 05:30
- **Mở đầu:** *"Tại trung tâm điều hành, tài khoản Authority sở hữu giao diện thanh điều hướng navy với mật độ thông tin cao. Em tiến hành công bố Thảm họa ngập lụt Hà Nội ở trạng thái ACTIVE."*
- **Thao tác:**
  1. Vào `/operations/disasters`, tạo thảm họa mới.
  2. Sang `/operations/reports`, minh diễn tính năng lọc tin báo trong bán kính 5 km bằng hàm không gian địa lý PostGIS `ST_DWithin`.
  3. Mở chi tiết tin báo của Citizen 1, kiểm tra ảnh minh chứng được stream bảo mật từ server riêng tư, và bấm Duyệt (`VERIFIED`) gắn vào thảm họa.
  4. Giới thiệu nhanh màn hình `/operations/dashboard` hiển thị số liệu thống kê thời gian thực.
- **Chuyển giao:** *"Sau khi tin báo được duyệt, bạn [Tên Người 4] sẽ điều phối đội cứu hộ và phân tích hiệu năng hệ thống."*

### Thẻ 4 — Người 4: 05:30 – 07:30
- **Mở đầu:** *"Tại màn hình Cứu hộ `/operations/rescue`, hệ thống áp dụng kỹ thuật Atomic Conditional Update ở tầng database để ngăn ngừa hoàn toàn tình trạng hai điều phối viên cùng phân công một đội cứu trợ."*
- **Thao tác:**
  1. Chọn báo cáo của Citizen 1 và Đội cứu hộ số 1, nhấn phân công nhiệm vụ (`ASSIGNED`).
  2. Giải thích: Nếu có thao tác tranh chấp đồng thời, hệ thống sẽ chặn với lỗi `409 TEAM_BUSY`. Nếu cố tình phân công thêm nhiệm vụ cho cùng báo cáo, chỉ mục bán phần `uq_rescue_active_report` sẽ chặn với `409 REPORT_ALREADY_ASSIGNED`.
  3. Cập nhật trạng thái nhiệm vụ `ASSIGNED → IN_PROGRESS → COMPLETED`. Đội cứu hộ được tự động giải phóng về trạng thái `AVAILABLE`.
  4. Mở tài liệu `docs/benchmark/D3.md`, trình bày biểu đồ đo tải k6: hệ thống đạt thông lượng 1,996 req/s tại 100 VU với độ trễ p99 là 105 ms.
- **Chuyển giao:** *"Nhóm chúng em đã hoàn thành phần trình diễn luồng cứu hộ khép kín và xin sẵn sàng đón nhận câu hỏi từ Hội đồng."*
