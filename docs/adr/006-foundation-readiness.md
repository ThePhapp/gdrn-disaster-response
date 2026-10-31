# ADR 006: Kiểm tra mức sẵn sàng có xét cơ sở dữ liệu

- Trạng thái: Đã chấp thuận.
- Phạm vi: Nền tảng vận hành kỹ thuật; không bổ sung API nghiệp vụ hay hạ tầng.

## Bối cảnh
Compose chỉ được báo ứng dụng sẵn sàng khi có thể nhận yêu cầu và dùng cơ sở dữ liệu. JVM còn chạy chưa đủ chứng minh điều đó. Ngược lại, mất kết nối dữ liệu tạm thời không nên khiến kiểm tra tiến trình còn sống thất bại.

## Quyết định
Dùng các phép kiểm tra Spring Boot Actuator trong mọi môi trường. `/actuator/health/liveness` chỉ gồm `livenessState`; `/actuator/health/readiness` gồm `readinessState` và `db`. Docker dùng mức sẵn sàng để `docker compose up --wait` chờ ứng dụng sẵn sàng dùng PostgreSQL. Flyway và kiểm tra JPA vẫn chạy lúc khởi động; không cần controller nghiệp vụ hay chỉ báo sức khỏe riêng.

Chỉ công khai GET tới đường dẫn sức khỏe tổng hợp và đúng hai đường dẫn trên, bên cạnh Swagger/OpenAPI hiện có. Ẩn chi tiết; chặn đường dẫn thành phần trực tiếp và phương thức ghi. Không thêm chính sách tự khởi động lại khi mất cơ sở dữ liệu hay nền tảng điều phối mới.

## Hệ quả và kiểm chứng
Mất cơ sở dữ liệu khiến mức sẵn sàng trả HTTP 503 trong khi trạng thái còn sống vẫn là HTTP 200. Chủ động từ chối lưu lượng cũng trả mức sẵn sàng 503 dù còn kết nối dữ liệu. Khôi phục trả mức sẵn sàng về 200. Kiểm thử chỉ tạm dừng/tiếp tục PostGIS Testcontainer riêng; thời gian chờ kết nối ngắn chỉ áp dụng cho kiểm thử, không dừng cơ sở dữ liệu của lập trình viên hay xóa dữ liệu.

Chỉ báo `db` kiểm tra kết nối, không kiểm tra mọi bất biến nghiệp vụ hoặc độ đúng truy vấn PostGIS; kiểm thử chuyển đổi schema/không gian đảm nhiệm phần đó. Phép kiểm tra công khai chỉ lộ trạng thái, không lộ kết nối hoặc thông tin xác thực.

Tham khảo: [Nhóm sức khỏe và phép kiểm tra tính sẵn sàng Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html).
