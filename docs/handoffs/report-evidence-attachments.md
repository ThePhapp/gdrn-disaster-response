# Bàn giao ảnh minh chứng báo cáo

## Phạm vi

Nhánh `feat/report-evidence-attachments`, tạo từ `main`.

Reporting hỗ trợ ảnh minh chứng riêng tư:

- Chủ báo cáo CITIZEN được tải lên/xóa khi báo cáo `PENDING`.
- Chủ báo cáo và `AUTHORITY` được liệt kê/tải ảnh hiển thị.
- Chỉ JPEG/PNG, 5 MiB mỗi ảnh, năm ảnh mỗi báo cáo.
- Siêu dữ liệu thuộc Flyway V7; nội dung dùng cổng lưu tệp tại `REPORT_ATTACHMENT_STORAGE_ROOT`, ngoài gốc tệp tĩnh giao diện.
- Nội dung truyền qua API có xác thực sau kiểm tra quyền sở hữu; không trả URL công khai hoặc ký sẵn để bỏ qua quyền.
- Xóa ẩn siêu dữ liệu trước khi xóa vật lý. Tải lên thất bại sẽ dọn tệp tạm khi lưu trữ không thể giữ chỗ cho ảnh.

## Hợp đồng

- `E17 POST /api/reports/{id}/attachments`: chủ CITIZEN, báo cáo đang chờ.
- `E18 GET /api/reports/{id}/attachments`: chủ hoặc AUTHORITY.
- `E19 GET /api/reports/{id}/attachments/{attachmentId}/content`: chủ hoặc AUTHORITY.
- `E20 DELETE /api/reports/{id}/attachments/{attachmentId}`: chủ CITIZEN, báo cáo đang chờ.

Xem [OpenAPI Reporting](../../src/main/resources/openapi/reporting.json), [ADR 010](../adr/010-report-evidence-private-storage.md) và [sổ chuyển đổi lược đồ](../architecture/phase1-module-contracts.md).

## Kiểm chứng

- `mvn test`: đạt, 73 kiểm thử đơn vị/miền/kiến trúc.
- `npm run typecheck`: đạt.
- `npm test`: đạt, 20 tệp / 93 kiểm thử.
- `npm run build`: đạt.
- `mvn clean verify`: phần đơn vị đạt; phần tích hợp chưa chạy vì Testcontainers không tìm được Docker daemon hợp lệ (`dockerDesktopLinuxEngine` trả lỗi máy chủ nội bộ). Không khẳng định kết quả tích hợp ở lượt này.

## Ảnh minh chứng khi tạo báo cáo

- `/reports/new` cho chọn JPEG/PNG tùy chọn trước khi gửi, chọn nhiều ảnh, xem trước/xóa cục bộ và giữ giới hạn năm ảnh/5 MiB.
- Gửi sẽ tạo báo cáo qua E07 rồi tải ảnh qua E17; chỉ chuyển trang sau khi tải xong. Nếu lỗi một phần, giữ báo cáo đã lưu và ảnh còn lại trong biểu mẫu; thử lại chỉ gửi ảnh còn lại. Khóa trường báo cáo sau khi tạo; người dân có thể mở báo cáo đã lưu.
- Giữ hợp đồng ứng dụng, quy tắc miền, lược đồ và ranh giới mô-đun.
- Bộ kiểm thử giao diện Reporting đạt 20 ca; kiểm tra kiểu/biên dịch giao diện đạt; `mvnw.cmd clean verify` đạt 73 đơn vị/kiến trúc, 57 tích hợp, không bỏ qua.
- Chromium và ứng dụng thật: hai PNG, mô phỏng lỗi ảnh thứ hai, thử lại và đọc ảnh riêng tư đều đạt. Ghi nhận một yêu cầu tạo và ba lần tải ảnh. Đã xóa ảnh thử và rút báo cáo sau đó.
- Rà soát hình ảnh và công cụ kiểm tra giao diện tại 375/1280px, gồm bàn phím/di chuột. Ảnh xem trước vừa khung, không tràn ngang. P1–P3 ghi nhận phần đầu trang di động xuống dòng có sẵn; điều hướng vẫn hiện đầy đủ. P4 ghi nhận hiệu ứng di chuột bộ đổi ngôn ngữ có sẵn. Các điểm này thuộc đầu trang chung, không yêu cầu đổi nút tải ảnh. Ghi chú khác liên quan viền thẻ, cột tọa độ và kiểu tiêu điểm có sẵn. Thiếu cấu hình bản đồ cục bộ thì dùng nhập tọa độ thủ công hiện có.
