# ADR 010: Lưu riêng tư ảnh minh chứng báo cáo

## Trạng thái
Đã chấp thuận cho phần ảnh minh chứng báo cáo.

## Bối cảnh
Người dân cần đính kèm ảnh; người dân và điều phối viên chỉ được xem theo quyền truy cập báo cáo. URL công khai có thể bỏ qua bước phân quyền. Pha 1 dùng modular monolith, PostgreSQL và lưu trữ cục bộ, nên cần cổng nhỏ, tường minh thay vì dịch vụ lưu trữ hay hệ thống truyền thông điệp mới.

## Quyết định
- Lưu siêu dữ liệu trong `reporting_report_attachments`, tệp nhị phân dưới `REPORT_ATTACHMENT_STORAGE_ROOT` có thể cấu hình. Thư mục nằm ngoài gốc phục vụ tệp tĩnh; cơ sở dữ liệu chỉ lưu khóa sinh từ UUID.
- Chỉ nhận JPEG/PNG, tối đa năm ảnh mỗi báo cáo, mỗi ảnh 5 MiB. Adapter kiểm tra MIME khai báo và định dạng thực do bộ đọc ảnh nhận diện trước khi chuyển tệp tạm sang khóa cuối.
- Dùng API Reporting có xác thực cho siêu dữ liệu và nội dung. Ứng dụng đọc báo cáo trước; thiếu hoặc không được truy cập đều trả `404`, rồi tìm ảnh theo cả ID báo cáo và ID ảnh. Nội dung truyền trực tiếp với kiểu ảnh đã xác minh, riêng tư và `no-store`; không trả URL công khai hoặc URL ký sẵn để bỏ qua phân quyền.
- Chủ báo cáo được tải lên/xóa khi báo cáo `PENDING`. Điều phối viên được liệt kê/tải ảnh của báo cáo hiển thị. Điều phối viên và người dân khác không được sửa ảnh của chủ báo cáo.
- Xóa sẽ ẩn siêu dữ liệu trước khi xóa tệp vật lý. Lỗi lưu trữ không để nội dung tiếp tục truy cập qua API; dòng ẩn và tệp mồ côi có thể được dọn sau.

## Hệ quả
Adapter phụ thuộc đĩa cục bộ, cần sao lưu hoặc thay thế trước khi triển khai nhiều bản sao ứng dụng. Cổng giữ thay đổi này ngoài miền và quy tắc ứng dụng. Lỗi tải lên được ánh xạ thành mã API ổn định cho thiếu tệp, định dạng không hỗ trợ, giới hạn kích thước, trạng thái báo cáo, số lượng ảnh và lỗi lưu trữ.
