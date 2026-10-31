# ADR 003: Sử dụng PostgreSQL và PostGIS

## Trạng thái
Đã chấp thuận.

## Bối cảnh
Các ca điều phối cần tính nhất quán quan hệ và truy vấn địa lý. Nền tảng ban đầu cần hạ tầng cơ sở dữ liệu có thể tái lập, chưa cần schema nghiệp vụ.

## Quyết định
Dùng PostgreSQL 16 với PostGIS 3.5, Docker Compose cho phát triển cục bộ, Flyway để quản lý thay đổi schema và Testcontainers để kiểm thử tích hợp. Bản chuyển đổi đầu tiên chỉ bật PostGIS. Hibernate kiểm tra schema. Chỉ thêm thư viện ORM không gian khi thuộc tính ánh xạ cần đến. Thông tin kết nối lấy từ biến môi trường.

## Phương án đã cân nhắc
- PostgreSQL thuần: thiếu phép toán không gian PostGIS mà yêu cầu dự kiến cần.
- H2 để kiểm thử tích hợp: không xác minh được hành vi PostgreSQL/PostGIS.
- Mỗi module một cơ sở dữ liệu: tăng chi phí vận hành và nhất quán không cần thiết ở giai đoạn này.

## Hệ quả
Cần Docker để kiểm tra đầy đủ và quyền cơ sở dữ liệu phù hợp để cài phần mở rộng. Truy cập dữ liệu dùng chung phải tôn trọng ownership của module. Schema tương lai theo phân tích nghiệp vụ; lựa chọn truy vấn/chỉ mục cần tải thực tế.
