# ADR 001: Sử dụng kiến trúc modular monolith

## Trạng thái
Đã chấp thuận.

## Bối cảnh
Nhóm đồ án gồm bốn người cần nền tảng Pha 1 dễ quản lý và ranh giới nghiệp vụ rõ ràng trước khi đo điểm nghẽn. Chưa có yêu cầu triển khai phân tán.

## Quyết định
Dùng một ứng dụng Spring Boot, các module dưới `com.gdrn` và một hạ tầng cơ sở dữ liệu. Dự kiến các module identity, thảm họa, reporting, rescue, tài nguyên, alert, geo và dùng chung. Kiểm soát quan hệ phụ thuộc bằng ArchUnit và rà soát mã nguồn.

## Phương án đã cân nhắc
- Nguyên khối chỉ chia theo tầng: đơn giản nhưng khó thấy ranh giới trách nhiệm nghiệp vụ.
- Microservices: phát sinh chi phí triển khai và bảo đảm nhất quán khi chưa có bằng chứng cần thiết.

## Hệ quả
Triển khai và giao dịch vẫn diễn ra cục bộ. Các module dùng chung tiến trình, cơ sở dữ liệu và chu kỳ phát hành nên phải tuân thủ ranh giới. Chưa hỗ trợ mở rộng độc lập. Việc tách dịch vụ về sau cần ADR và bằng chứng đo hiệu năng; chưa khẳng định khả năng tăng tốc.
