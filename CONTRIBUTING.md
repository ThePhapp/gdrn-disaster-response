# Hướng dẫn đóng góp cho GDRN

Đọc [bối cảnh dự án](GDRN_PROJECT_CONTEXT.md) để hiểu định hướng dài hạn và
[tổng quan kiến trúc](docs/architecture/architecture-overview.md) để nắm hệ thống hiện tại.
Đối chiếu [tiến độ Pha 1](docs/phase1-progress.md) với code trước khi kết luận một tính năng đã hoàn tất.
Ví dụ trong bối cảnh dài hạn không phải bằng chứng triển khai.

[Kế hoạch Pha 1](docs/PHASE1_PLAN.md) là danh mục công việc duy nhất. Contract và ADR quy định
yêu cầu kỹ thuật; tiến độ và handoff ghi lại bằng chứng, không tạo kế hoạch thay thế.

## Quy tắc bắt buộc

- Giữ một ứng dụng modular monolith và ranh giới module dưới `com.gdrn`.
- Theo DDD và Hexagonal/Clean Architecture; dependency hướng vào trong.
- Domain là Java thuần, độc lập với Spring, persistence, JSON và HTTP.
- Đặt business rule trong domain, orchestration trong application; dùng port và adapter.
- Chỉ thêm package và abstraction khi có use case thực tế.
- Triển khai theo thứ tự yêu cầu → domain model → persistence model → schema → Flyway migration.
- Gọi xuyên module qua contract đã được review và ghi tài liệu cho contract mới.
- Test domain không cần Spring, test orchestration qua mock port, test adapter bằng Testcontainers.
- Cập nhật tài liệu kiến trúc và ADR khi quyết định kiến trúc thay đổi.
- Chạy `./mvnw clean verify` (Windows: `.\mvnw.cmd clean verify`) trước khi hoàn tất thay đổi code;
  ghi kết quả thực tế và trở ngại môi trường. Integration test cần Docker.
- Đặt credential trong cấu hình môi trường; không đưa `.env` thật vào Git.

## Những việc không được làm

- Thêm microservices khi chưa có quyết định kiến trúc được chấp thuận.
- Thêm RabbitMQ, Kafka, Redis hoặc hạ tầng Pha 2 trong Pha 1 khi chưa có bằng chứng và chấp thuận.
- Gắn annotation JPA vào domain model hoặc trả persistence entity qua REST.
- Đặt business logic trong controller, hoặc chi tiết persistence/framework trong application.
- Truy cập trực tiếp infrastructure hoặc class nội bộ của module khác.
- Bỏ qua architecture test, âm thầm bỏ integration test hoặc che lỗi để build báo xanh.
- Thêm business class giả, base class dự phòng hoặc bảng nghiệp vụ mẫu.

`shared` chỉ dành cho phần kỹ thuật nhỏ có lý do rõ ràng. In-process event là lựa chọn tương lai;
transaction và failure semantics phải được quyết định, test khi xuất hiện use case đầu tiên.
Cải tiến Pha 2 cần dựa trên số đo thực tế.
