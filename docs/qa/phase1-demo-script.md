# Kịch Bản Trình diễn Hệ Thống GDRN Pha 1 (Pha 1 Kịch bản trình diễn trực tiếp)

> **Thời lượng dự kiến:** 8 – 10 phút
> **Phiên bản:** Pha 1 (Nguyên khối theo mô-đun MVP)
> **Nhánh cơ sở:** `feat/c3-architecture-docs` | **Commit:** `c99ebd5`
> **Đối tượng:** Giảng viên & Hội đồng đánh giá môn Kiến trúc Phần mềm
> **Mục tiêu:** Trình diễn trực tiếp luồng nghiệp vụ cứu trợ xuyên suốt trên 6 màn hình người dùng, chứng minh tính toàn vẹn của mô hình phân quyền theo vai trò (Role-Based Access Control), kiểm chứng xử lý xung đột đồng thời (Kiểm soát tranh chấp đồng thời / Race Condition), khả năng cách ly dữ liệu cá nhân (Data Isolation) và đối chiếu kết quả đo kiểm chuẩn hiệu năng (Công việc D3).

---

## 1. Chuẩn Bị Môi Trường và Tài Khoản Trình diễn

### 1.1. Khởi động hệ thống

Trước buổi thuyết trình hoặc trình diễn, khởi chạy toàn bộ hệ thống bằng Docker Compose (Production stack):

```powershell
# Tại thư mục gốc repository
.\scripts\dev.ps1 up -WaitTimeout 180
.\scripts\dev.ps1 status
```

- **Giao diện Web SPA (Nginx Proxy):** `http://127.0.0.1:5173/login` (hoặc cổng cấu hình `FRONTEND_PORT`)
- **Tài liệu API Swagger UI:** `http://127.0.0.1:8080/swagger-ui/index.html` (hoặc cổng cấu hình `APP_PORT`)

### 1.2. Nguồn tài khoản lấy từ môi trường `.env`

Theo nguyên tắc bảo mật của dự án ([CONTRIBUTING.md](../../CONTRIBUTING.md) và [P01_LOCAL.md](../P01_LOCAL.md)), thông tin đăng nhập không được hard-mã nguồn mà được cấu hình trong tệp `.env` cục bộ (được sinh ngẫu nhiên an toàn qua `scripts/local.ps1 -Action setup`):

| Vai trò (Role) | Biến Email trong `.env` | Biến Mật khẩu trong `.env` | Mục đích trong kịch bản Trình diễn |
|---|---|---|---|
| **Người dân 1 (Người dân 1)** | `DEMO_CITIZEN_ONE_EMAIL` | `DEMO_CITIZEN_ONE_PASSWORD` | Gửi báo cáo chính, rút báo cáo chờ duyệt, theo dõi tiến độ hoàn thành cứu hộ. |
| **Người dân 2 (Người dân 2)** | `DEMO_CITIZEN_TWO_EMAIL` | `DEMO_CITIZEN_TWO_PASSWORD` | Kiểm chứng cách ly dữ liệu (Cross-user isolation): không thể xem/sửa báo cáo của Người dân 1. |
| **Điều phối viên (Điều phối viên)** | `DEMO_AUTHORITY_EMAIL` | `DEMO_AUTHORITY_PASSWORD` | Khởi tạo thảm họa, duyệt/từ chối báo cáo, phân công đội cứu hộ, cập nhật nhiệm vụ. |

> [!TIP]
> **Mẹo chuẩn bị:** Mở sẵn **hai cửa sổ trình duyệt độc lập** (ví dụ: Chrome thông thường dành cho **Người dân 1** và **Người dân 2**; Cửa sổ ẩn danh / Incognito hoặc Edge dành cho **Điều phối viên**). Do phiên làm việc JWT được lưu trong `sessionStorage` tách biệt theo tab/cửa sổ, bạn có thể dễ dàng chuyển đổi qua lại để mô phỏng tương tác người dân – điều phối viên trong thời gian thực.

---

## 2. Bảng Phân Bổ Thời Lượng và 6 Màn Hình Nghiệp Vụ

| Mốc thời gian | Màn hình | Đường dẫn Route | Vai trò thực hiện | Trọng tâm nghiệp vụ & Ca kiểm thử cốt lõi |
|:---:|---|---|:---:|---|
| **00:00 – 01:00**<br/>*(1.0 phút)* | **Tổng quan** | `/login`<br/>`/swagger-ui` | Diễn giả | Giới thiệu hệ thống GDRN, kiến trúc Nguyên khối theo mô-đun, Docker stack và trạng thái kiểm thử. |
| **01:00 – 02:30**<br/>*(1.5 phút)* | **S01 — Đăng nhập**<br/>**S02 — Gửi báo cáo** | `/login`<br/>`/reports/new` | **Người dân 1** | - Đăng nhập tài khoản công dân.<br/>- Gửi Báo cáo 1 (ngập lụt, chọn tọa độ bản đồ).<br/>- Gửi Báo cáo 2 (sự cố nhẹ để kiểm thử rút đơn). |
| **02:30 – 04:00**<br/>*(1.5 phút)* | **S03 — Báo cáo của tôi** | `/my-reports` | **Người dân 1**<br/>& **Người dân 2** | - **Ca 1 (Pending Withdraw):** Người dân 1 rút Báo cáo 2 thành công.<br/>- **Ca 2 (Cross-User Denied):** Người dân 2 truy cập không thấy và không mở được Báo cáo 1 (chặn 404). |
| **04:00 – 05:15**<br/>*(1.25 phút)* | **S05 — Quản lý thảm họa** | `/operations/disasters` | **Điều phối viên** | - Đăng nhập quyền điều phối.<br/>- Khởi tạo Thảm họa mới (`ACTIVE`) tại khu vực Hà Nội. |
| **05:15 – 06:45**<br/>*(1.5 phút)* | **S04 — Điều phối duyệt báo cáo** | `/operations/reports` | **Điều phối viên** | - Lọc báo cáo người dân theo trạng thái và bán kính PostGIS.<br/>- Xem chi tiết và duyệt (`VERIFIED`) Báo cáo 1 gắn vào thảm họa. |
| **06:45 – 08:15**<br/>*(1.5 phút)* | **S06 — Phân công cứu hộ** | `/operations/rescue` | **Điều phối viên** | - **Ca 3 (Assignment Conflict):** Mô phỏng tranh chấp 2 điều phối cùng phân 1 đội cứu hộ (chặn `409 TEAM_BUSY`).<br/>- **Ca 4 (Report Already Assigned):** Chặn phân công lặp (chặn `409 REPORT_ALREADY_ASSIGNED`).<br/>- **Ca 5 (Mission Vòng đời):** Cập nhật `ASSIGNED` → `IN_PROGRESS` → `COMPLETED`. |
| **08:15 – 09:15**<br/>*(1.0 phút)* | **S03 — Báo cáo của tôi**<br/>*(Khép kín vòng đời)* | `/my-reports` | **Người dân 1** | - Người dân 1 kiểm tra lại Báo cáo 1: hiển thị nhãn `COMPLETED`.<br/>- Đối chiếu kết quả đo kiểm tải **Công việc D3** (k6: 1,996 req/s). |
| **09:15 – 10:00**<br/>*(0.75 phút)* | **Tổng kết** | Terminal / Docs | Diễn giả | - Hướng dẫn quy trình Reset an toàn môi trường trình diễn.<br/>- Hỏi đáp với Hội đồng (Q&A). |

---

## 3. Kịch Bản Chi Tiết Từng Bước

### Bước 1: Giới thiệu kiến trúc & Khởi động (00:00 – 01:00)

1. **Lời thoại gợi ý:**
   *"Kính thưa Thầy/Cô và Hội đồng, hệ thống GDRN (Global Disaster Response Network) được thiết kế theo kiến trúc Nguyên khối theo mô-đun chuẩn Miền nghiệp vụ-Driven Design (DDD) và Clean Kiến trúc trên nền Java 21, Spring Boot và PostGIS. Hệ thống đã đóng gói trọn vẹn bằng Docker Compose gồm Database, Ứng dụng phía máy chủ và Nginx SPA. Sau đây em xin bắt đầu kịch bản trình diễn trực tiếp các tính năng nghiệp vụ xuyên suốt."*
2. **Thao tác:**
   - Mở trình duyệt tại `http://127.0.0.1:5173/login`.
   - Mở sẵn tab Swagger UI tại `http://127.0.0.1:8080/swagger-ui/index.html` để minh chứng 20 endpoints nghiệp vụ đã được tài liệu hóa chuẩn OpenAPI 3.0.

---

### Bước 2: S01 Đăng nhập & S02 Gửi báo cáo sự cố (01:00 – 02:30)

#### 2.1. Đăng nhập Người dân 1 (S01`/login`)
- **Thao tác:**
  - Nhập Email: lấy giá trị của `DEMO_CITIZEN_ONE_EMAIL` trong `.env`.
  - Nhập Password: lấy giá trị của `DEMO_CITIZEN_ONE_PASSWORD` trong `.env`.
  - Nhấn nút **Đăng nhập**.
- **Kết quả kỳ vọng (Expected Result):**
  - Đăng nhập thành công, token Bearer JWT được lưu trong bộ nhớ phiên (`sessionStorage`).
  - Hệ thống tự động chuyển hướng đến màn hình **Báo cáo của tôi** (`/my-reports`).
  - Thanh Header hiển thị vai trò **Người dân (CITIZEN)** cùng menu: *Gửi báo cáo*, *Báo cáo của tôi*.

#### 2.2. Gửi Báo cáo 1 — Sự cố ngập lụt khẩn cấp (S02`/reports/new`)
- **Thao tác:**
  - Nhấp vào mục **Gửi báo cáo** (`/reports/new`) trên thanh điều hướng.
  - Chọn **Loại thảm họa:** `Lũ lụt / Ngập úng (FLOOD)`.
  - Nhập **Mô tả sự cố:** `"Nước ngập sâu hơn 1.5m tại ngõ 120 đường Hoàng Quốc Việt, có người già cần cứu nạn gấp."`
  - Chọn vị trí trên bản đồ tương tác `LocationMap` hoặc nhập tọa độ:
    - **Vĩ độ (Latitude):** `21.0285`
    - **Kinh độ (Longitude):** `105.8542`
  - Đính kèm hình ảnh minh chứng sự cố (JPEG/PNG <= 5 MiB): Tải ảnh hiện trường ngập lụt minh chứng tính năng lưu trữ tệp tin riêng tư theo [ADR-010](../adr/010-report-evidence-private-storage.md) và Migration Flyway V7 (`E17 POST /api/reports/{id}/attachments`).
  - Nhấn nút **Gửi báo cáo**.
- **Kết quả kỳ vọng:**
  - Hệ thống gọi API `POST /api/reports` tạo báo cáo thành công (`201 Created`), sau đó tải lên ảnh minh chứng an toàn vào filesystem riêng tư (`REPORT_ATTACHMENT_STORAGE_ROOT`).
  - Tự động chuyển hướng về trang `/my-reports`. Báo cáo 1 xuất hiện trên đầu danh sách với trạng thái huy hiệu màu vàng: **`Đang chờ duyệt (PENDING)`**, có biểu tượng đính kèm tệp minh chứng.

#### 2.3. Gửi Báo cáo 2 — Sự cố phụ để kiểm thử rút đơn (S02`/reports/new`)
- **Thao tác:**
  - Nhấn nút **Gửi báo cáo mới**.
  - Chọn loại: `Bão / Gió lốc (TYPHOON)`.
  - Mô tả: `"Cây đổ chắn ngõ nhỏ, nước đã rút, xin hủy nếu không cần thiết."`
  - Tọa độ: Vĩ độ `21.0300`, Kinh độ `105.8500`.
  - Nhấn **Gửi báo cáo**.
- **Kết quả kỳ vọng:**
  - Báo cáo 2 được tạo thành công, trạng thái **`PENDING`**.

---

### Bước 3: S03 Báo cáo của tôi — Ca kiểm thử Pending Withdraw & Data Isolation (02:30 – 04:00)

#### 3.1. Ca kiểm thử 1: Rút báo cáo đang chờ duyệt
- **Thao tác:**
  - Tại màn hình `/my-reports`, tìm thẻ Báo cáo 2 vừa tạo.
  - Nhấp vào nút **Rút báo cáo** (Withdraw).
  - Hộp thoại xác nhận hiện ra: *"Bạn có chắc chắn muốn rút báo cáo này không?"* → Nhấn **Đồng ý**.
- **Kết quả kỳ vọng:**
  - Hệ thống gọi API `DELETE /api/reports/{id}` trả về HTTP `204 No Content`.
  - Báo cáo 2 biến mất khỏi danh sách (hoặc cập nhật trạng thái đã rút), hiển thị thông báo thành công.
  - Báo cáo 1 vẫn giữ nguyên trạng thái `PENDING`.

#### 3.2. Ca kiểm thử 2: Cách ly dữ liệu người dùng
- **Thao tác:**
  - Nhấn nút **Đăng xuất** (Logout) trên góc phải.
  - Đăng nhập bằng tài khoản **Người dân 2**: `DEMO_CITIZEN_TWO_EMAIL` / `DEMO_CITIZEN_TWO_PASSWORD`.
  - Quan sát danh sách `/my-reports` của Người dân 2.
  - Thử mở URL chi tiết Báo cáo 1 của Người dân 1 bằng cách dán ID báo cáo vào thanh địa chỉ trình duyệt.
- **Kết quả kỳ vọng:**
  - Danh sách `/my-reports` của Người dân 2 hoàn toàn trống (không thấy Báo cáo 1 của Người dân 1).
  - Khi truy cập trực tiếp ID của Người dân 1: Hệ thống trả về lỗi **`404 Not Found`** (bảo vệ thông tin cá nhân, không trả `403` để tránh lộ sự tồn tại của ID tài nguyên).
  - Đăng xuất khỏi Người dân 2.

---

### Bước 4: S05 Quản lý thảm họa — Điều phối viên tạo thảm họa mới (04:00 – 05:15)

- **Thao tác:**
  - Trên cửa sổ trình duyệt thứ hai (hoặc ẩn danh), truy cập `/login`.
  - Đăng nhập bằng tài khoản **Điều phối viên**: `DEMO_AUTHORITY_EMAIL` / `DEMO_AUTHORITY_PASSWORD`.
  - Thanh Header xuất hiện giao diện đặc quyền Điều phối: *Báo cáo*, *Thảm họa*, *Cứu hộ*, *Dashboard*.
  - Nhấp vào mục **Thảm họa** (`/operations/disasters`).
  - Nhấn nút **Tạo thảm họa mới** và điền biểu mẫu:
    - **Tên thảm họa:** `"Đợt ngập lụt diện rộng Cầu Giấy - Ba Đình 10/2026"`
    - **Loại thảm họa:** `Lũ lụt / Ngập úng (FLOOD)`
    - **Mức độ nghiêm trọng:** `Cao (HIGH)`
    - **Tọa độ tâm ảnh hưởng:** Vĩ độ `21.0280`, Kinh độ `105.8540`
    - **Mô tả:** `"Mưa lớn liên tục gây ngập úng nghiêm trọng nhiều tuyến phố."`
  - Nhấn **Lưu thảm họa**.
- **Kết quả kỳ vọng:**
  - Hệ thống gọi API `POST /api/disasters` trả về HTTP `201 Created`.
  - Thảm họa xuất hiện trong danh sách với trạng thái **`Đang diễn ra (ACTIVE)`** kèm huy hiệu cảnh báo màu đỏ.

---

### Bước 5: S04 Điều phối duyệt báo cáo — Lọc & Xác minh báo cáo (05:15 – 06:45)

- **Thao tác:**
  - Nhấp vào mục **Báo cáo** (`/operations/reports`) trên thanh điều hướng.
  - **Trình diễn bộ lọc không gian PostGIS:**
    - Sử dụng bộ lọc trạng thái: chọn `Đang chờ duyệt (PENDING)`.
    - Thử nghiệm lọc theo bán kính: nhập tâm `21.0280`, `105.8540` và bán kính `5 km`.
    - Danh sách lọc tức thì hiển thị đúng Báo cáo 1 của Người dân 1 nằm trong vùng ảnh hưởng.
  - Nhấp vào Báo cáo 1 để mở màn hình chi tiết duyệt:
    - Xem tọa độ, mô tả của người dân trên bản đồ trực quan.
    - **Xem ảnh minh chứng hiện trường:** Kiểm tra hình ảnh ngập lụt được tải qua luồng dữ liệu bảo mật (`E18 GET /api/reports/{id}/attachments` và `E19 GET /api/reports/{id}/attachments/{id}/content`), chứng minh dữ liệu được kiểm soát quyền chặt chẽ, không sinh URL công khai lộ lọt ra ngoài.
  - **Thực hiện Duyệt báo cáo (Kiểm chứng):**
    - Tại mục *Gán thảm họa liên quan*, chọn: `"Đợt ngập lụt diện rộng Cầu Giấy - Ba Đình 10/2026"`.
    - Nhấn nút **Duyệt báo cáo** (Verify Report).
- **Kết quả kỳ vọng:**
  - Hệ thống gọi API `PATCH /api/reports/{id}/verification` trả về HTTP `200 OK`.
  - Trạng thái Báo cáo 1 chuyển từ `PENDING` sang **`Đã xác minh (VERIFIED)`** kèm tên thảm họa liên kết.
  - *(Ghi chú thêm: Nếu bấm "Từ chối báo cáo", hệ thống yêu cầu lý do từ chối và chuyển trạng thái sang `REJECTED`).*

---

### Bước 6: S06 Phân công cứu hộ — Concurrency Conflict & Hoàn thành nhiệm vụ (06:45 – 08:15)

#### 6.1. Mở màn hình Phân công cứu hộ (S06`/operations/rescue`)
- **Thao tác:**
  - Nhấp vào mục **Cứu hộ** (`/operations/rescue`).
  - Quan sát 2 khối thông tin:
    - Khối bên trái: Danh sách các báo cáo đã duyệt (`VERIFIED`) cần cứu hộ (có Báo cáo 1).
    - Khối bên phải: Danh sách các đội cứu hộ (`Rescue Teams`) với trạng thái **`Sẵn sàng (AVAILABLE)`** hoặc **`Đang bận (BUSY)`**.

#### 6.2. Ca kiểm thử 3: Tranh chấp phân công cùng một đội cứu hộ (Race Condition / 409 TEAM_BUSY)
- **Thao tác giải thích và mô phỏng:**
  - *Giải thích cho Hội đồng:* Hệ thống áp dụng kỹ thuật *Atomic Conditional Update* (`UPDATE ... WHERE status = 'AVAILABLE'`) ở tầng persistence để chống xung đột khi nhiều điều phối viên cùng thao tác phân công đồng thời.
  - Chọn Báo cáo 1 và chọn **Đội cứu hộ số 1 (Rescue Team 1)** đang `AVAILABLE`.
  - Nhấn nút **Phân công đội cứu hộ**.
  - Để mô phỏng xung đột: Mở tab thứ 2 của Điều phối viên và cùng chọn Đội cứu hộ số 1 để phân công cho một sự cố khác.
- **Kết quả kỳ vọng:**
  - Lần phân công đầu tiên thành công: Tạo nhiệm vụ mới (Mission) trạng thái **`Đã phân công (ASSIGNED)`**, Đội cứu hộ số 1 chuyển trạng thái sang **`BUSY`**.
  - Lần phân công thứ hai thất bại: Hệ thống chặn với thông báo lỗi HTTP **`409 Conflict (TEAM_BUSY)`**: *"Đội cứu hộ đã được phân công cho nhiệm vụ khác, vui lòng chọn đội khả dụng."*

#### 6.3. Ca kiểm thử 4: Chặn phân công lặp cho cùng một báo cáo (409 REPORT_ALREADY_ASSIGNED)
- **Thao tác:**
  - Thử chọn lại Báo cáo 1 và chọn một Đội cứu hộ khác (ví dụ: Đội cứu hộ số 2 đang `AVAILABLE`).
  - Nhấn nút **Phân công**.
- **Kết quả kỳ vọng:**
  - Hệ thống chặn ngay lập tức nhờ chỉ mục bán phần `uq_rescue_active_report` tại cơ sở dữ liệu.
  - Báo lỗi HTTP **`409 Conflict (REPORT_ALREADY_ASSIGNED)`**: *"Báo cáo sự cố này đã có nhiệm vụ cứu hộ đang hoạt động."*

#### 6.4. Ca kiểm thử 5: Cập nhật tiến độ nhiệm vụ cứu hộ
- **Thao tác:**
  - Tại danh sách nhiệm vụ đang hoạt động, chọn nhiệm vụ vừa tạo cho Báo cáo 1.
  - Nhấn nút **Bắt đầu thực hiện** → Trạng thái chuyển sang **`Đang xử lý (IN_PROGRESS)`**.
  - Nhấn nút **Hoàn thành nhiệm vụ** → Trạng thái chuyển sang **`Hoàn thành (COMPLETED)`**.
- **Kết quả kỳ vọng:**
  - Nhiệm vụ được ghi nhận `COMPLETED` tại thời điểm hiện tại.
  - Đội cứu hộ số 1 tự động được hệ thống giải phóng trở lại trạng thái **`Sẵn sàng (AVAILABLE)`**.

---

### Bước 7: Khép kín vòng đời & Đối chiếu đo kiểm tải D3 (08:15 – 09:15)

#### 7.1. Người dân kiểm tra trạng thái cứu trợ
- **Thao tác:**
  - Chuyển về cửa sổ trình duyệt của **Người dân 1**.
  - Tải lại trang **Báo cáo của tôi** (`/my-reports`).
- **Kết quả kỳ vọng:**
  - Báo cáo 1 hiển thị rõ:
    - Trạng thái xác minh: **`VERIFIED`**
    - Thảm họa liên kết: *"Đợt ngập lụt diện rộng Cầu Giấy - Ba Đình 10/2026"*
    - Trạng thái cứu hộ: **`COMPLETED`** (Đã hoàn thành cứu nạn).
  - Chứng minh quy trình cứu trợ khép kín 100% từ lúc người dân gửi tin báo đến khi hoàn tất giải cứu.

#### 7.2. Đối chiếu số liệu đo lường hiệu năng Công việc D3
- **Thao tác thuyết minh:**
  - Trình chiếu tệp kết quả đo hiệu năng k6 tại [docs/benchmark/D3.md](../benchmark/D3.md) và [docs/handoffs/D3.md](../handoffs/D3.md).
  - Nêu rõ các số liệu đo kiểm thực tế trên số đo cơ sở phần cứng cố định (16 CPUs, 15.7 GiB RAM, Docker 27.3.1):
    - **Throughput ghi (E07 Write - 1 VU):** **164.57 req/s**, avg 3.81 ms, p99 = **5.82 ms**, lỗi **0%**.
    - **Truy vấn bán kính PostGIS GiST (E08 Radius - 1 VU):** **156.06 req/s**, avg 4.31 ms, p99 = **7.78 ms**, lỗi **0%**.
    - **Thang tải đọc phân trang (E08 Page Load Ladder trên 1,000 báo cáo):**
      - **10 VU:** **928.17 req/s**, avg 7.23 ms, p99 = 17.55 ms, lỗi 0% (Ứng dụng phía máy chủ CPU 208.68%, DB CPU 69.92%).
      - **50 VU:** **1,439.13 req/s**, avg 18.93 ms, p99 = 48.63 ms, lỗi 0% (Ứng dụng phía máy chủ CPU 306.05%, DB CPU 142.44%).
      - **100 VU:** **1,996.98 req/s**, avg 34.93 ms, p99 = **105.28 ms**, lỗi 0% (Ứng dụng phía máy chủ CPU 238.21%, DB CPU 194.88%).
  - **Phân tích cơ sở khoa học:** Nêu rõ độ trễ p99 tăng lên 105.28 ms tại 100 VU phản ánh giới hạn khớp nối đồng bộ HTTP của thread pool máy chủ, làm tiền đề khoa học vững chắc để đề xuất Hàng đợi thông điệp cho Pha 2.

---

### Bước 8: Kết thúc & Hướng dẫn Reset môi trường an toàn (09:15 – 10:00)

1. **Lời kết luận:**
   *"Như vậy, qua 8 phút trình diễn trực tiếp, nhóm đã chứng minh hệ thống GDRN Pha 1 đáp ứng đầy đủ 100% các tiêu chí kỹ thuật: Nguyên khối theo mô-đun rõ ràng ranh giới, phân quyền vai trò nghiêm ngặt, cách ly dữ liệu cá nhân, xử lý đồng thời chống xung đột dữ liệu bằng nguyên tử cập nhật có điều kiện, và khả năng chịu tải cao trên nền cơ sở dữ liệu không gian PostGIS."*
2. **Quy trình Reset môi trường Trình diễn có kiểm soát (Safe Disposable Reset):**
   - Giải thích rõ cho Hội đồng quy trình dọn dẹp dữ liệu thử nghiệm để sẵn sàng cho phiên đánh giá tiếp theo:

```powershell
# 1. Tùy chọn 1: Chỉ xóa các báo cáo mô phỏng trong database benchmark/demo (An toàn nhất)
pwsh -File ./benchmark/reset-reporting.ps1 -ProjectName gdrn -Database gdrn

# 2. Tùy chọn 2: Dừng stack giữ nguyên volume dữ liệu
.\scripts\dev.ps1 down

# LƯU Ý BẢO VỆ DỮ LIỆU:
# Tuyệt đối KHÔNG dùng 'docker compose down -v' như lệnh thường ngày,
# vì cờ '-v' sẽ xóa sạch toàn bộ named volumes và dữ liệu cấu hình phát triển.
```

---

## 4. Bảng Kế Hoạch Diễn Tập Thử

Trước khi thuyết trình chính thức, nhóm có thể diễn tập tự động toàn bộ luồng trên bằng các công cụ kiểm thử tích hợp sẵn:

| Bước diễn tập | Công cụ / Lệnh kiểm thử | Kết quả kiểm chứng tự động |
|---|---|---|
| **Diễn tập xác thực & 6 màn hình** | `.\scripts\browser-e2e.ps1` | 23/23 Playwright kiểm thử ĐẠT trên Chromium thật. |
| **Diễn tập luồng nghiệp vụ Người dân** | `npx playwright test frontend/e2e/b3-citizen.spec.ts` | Tự động điền biểu mẫu, ghim tọa độ, rút đơn chờ duyệt. |
| **Diễn tập điều phối & xung đột cứu hộ** | `npx playwright test frontend/e2e/rescue.spec.ts` | Tự động kích hoạt tranh chấp phân công `409 TEAM_BUSY`. |
| **Diễn tập kiểm tra nhanh toàn hệ thống** | `.\scripts\dev.ps1 smoke` | Kiểm tra trạng thái còn sống, mức sẵn sàng, OpenAPI và Swagger điểm cuối API. |

---

## 5. Danh Mục Đối Chiếu Tiêu Chí Hoàn Tất (Completion Danh sách kiểm tra)

- [x] Thời lượng kịch bản chuẩn hóa trong khoảng 8–10 phút.
- [x] Sử dụng thông tin tài khoản lấy từ biến môi trường `.env` (`DEMO_*`).
- [x] Đi qua đầy đủ 6 màn hình người dùng (S01, S02, S03, S04, S05, S06).
- [x] Bao phủ ca kiểm thử rút đơn đang chờ duyệt (Pending Withdrawal).
- [x] Bao phủ ca kiểm thử cách ly dữ liệu giữa các công dân (Cross-User Denied / 404).
- [x] Bao phủ ca kiểm thử xung đột phân công đồng thời (Assignment Conflict / 409).
- [x] Bao phủ ca kiểm thử hoàn thành vòng đời nhiệm vụ cứu hộ (`COMPLETED`).
- [x] Liên kết số liệu đo kiểm hiệu năng thực tế từ Công việc D3 (không tự điền số).
- [x] Hướng dẫn quy trình đặt lại an toàn cho môi trường disposable, không lạm dụng `down -v`.
