# Phương Án Dự Phòng & Ứng Phó Sự Cố Khi Demo Trực Tiếp (Live Demo Contingency Matrix)

Tài liệu hướng dẫn xử lý sự cố kỹ thuật trong buổi bảo vệ đồ án Kiến trúc Phần mềm GDRN Pha 1.

---

## 1. Ma Trận Xử Lý Sự Cố Khi Trình Diễn

| Tình huống sự cố | Biểu hiện trên màn hình | Nguyên nhân tiềm ẩn | Quy trình xử lý nhanh trong 15–30 giây | Phương án thay thế (Fallback Plan) |
|---|---|---|---|---|
| **Sự cố 1: Lỗi xác thực tài khoản đăng nhập** | Giao diện hiển thị nhãn đỏ `401 Unauthorized` hoặc báo mật khẩu sai. | Mật khẩu tài khoản demo trong bộ nhớ khác với biến môi trường `.env`. | Mở tệp `.env` trên IDE, sao chép chính xác giá trị của `DEMO_CITIZEN_ONE_PASSWORD` hoặc `DEMO_AUTHORITY_PASSWORD` và dán lại vào form. | Sử dụng tài khoản Citizen 2 (`DEMO_CITIZEN_TWO_EMAIL`) hoặc chuyển sang tab Swagger UI đã cấu hình sẵn Bearer Token. |
| **Sự cố 2: Bản đồ MapLibre không tải được Tile vệ tinh** | Vùng bản đồ xám hoặc hiện thông báo `Map provider unavailable`. | Mất kết nối Internet tới máy chủ MapTiler hoặc mạng hội trường chặn CDN. | Giữ nguyên bình tĩnh, giải thích cho Hội đồng: *"Hệ thống đã lường trước kịch bản mất mạng tại vùng bão lũ và kích hoạt chế độ Fallback"* → Sử dụng các ô nhập tọa độ vĩ độ/kinh độ thủ công. | Hệ thống vẫn gửi và xử lý báo cáo bình thường 100% nhờ lớp trừu tượng `LocationMap` cách ly lỗi. |
| **Sự cố 3: Không còn Đội cứu hộ rảnh (`AVAILABLE`)** | Bảng danh sách đội cứu hộ tại `S06` chỉ hiện trạng thái `BUSY`. | Các lượt demo thử nghiệm trước đó đã phân công hết 3 đội cứu hộ. | Chọn bất kỳ nhiệm vụ nào trong bảng `Active Missions` bên phải, nhấn nút **"Hoàn thành nhiệm vụ (COMPLETED)"** → Đội cứu hộ lập tức được giải phóng về `AVAILABLE`. | Chạy nhanh lệnh reset dữ liệu báo cáo: `powershell -File ./benchmark/reset-reporting.ps1` (chỉ xóa dữ liệu tạm, giữ nguyên tài khoản và cấu hình). |
| **Sự cố 4: Container bị crash hoặc mất kết nối database** | Trình duyệt báo `Network Error` hoặc `502 Bad Gateway`. | Docker Desktop bị tạm dừng hoặc tài nguyên máy host quá tải. | Mở terminal PowerShell và thực hiện lệnh restart nhanh: `docker compose restart backend database`. | Trình chiếu bộ video kiểm chứng tự động Playwright Chromium 23/23 tests đã ghi hình trước tại `frontend/e2e/`. |

---

## 2. Quy Tắc Ứng Xử Của Nhóm Khi Gặp Sự Cố
1. **Không lúng túng, không đổ lỗi:** Một thành viên thao tác sửa lỗi kỹ thuật, thành viên đang nói tiếp tục giải thích kiến trúc hoặc nguyên lý thiết kế cho Hội đồng.
2. **Tuyệt đối không chạy lệnh phá hủy:** Không dùng `docker compose down -v` trong buổi bảo vệ vì cờ `-v` sẽ xóa sạch dữ liệu và buộc hệ thống phải khởi tạo lại từ đầu.
3. **Biến sự cố thành điểm cộng kiến trúc:** Tận dụng tình huống mất mạng hoặc xung đột đồng thời để chứng minh tính chịu lỗi (Fault Tolerance) và cơ chế khóa lạc quan (Optimistic Concurrency) của hệ thống.
