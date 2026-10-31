# ADR 007: Ánh xạ dữ liệu PostGIS cho Reporting

## Trạng thái
Đã triển khai khi tích hợp B1/C1. V4 theo sau V3 của C1; cấu hình bảo mật tập trung mở E07–E09.

## Bối cảnh
E07 tạo báo cáo PENDING từ người dân đã xác thực; E08/E09 đọc theo quyền sở hữu. B2 sẽ bổ sung xác minh, rút báo cáo và lọc bán kính. Reporting cần điểm WGS84, nhưng B1 không phụ trách thư viện cấp gốc hay bảo mật tập trung.

## Quyết định
Dùng mô hình Java thuần Report/Coordinates và cổng ứng dụng ReportStore. JdbcReportStore ánh xạ dữ liệu tường minh bằng Spring JDBC hiện có; không thêm Hibernate Spatial hoặc thư viện cấp gốc. SQL, ResultSet và PostGIS chỉ nằm trong hạ tầng. DTO HTTP và mô hình miền không chứa kiểu lưu trữ. Giữ ánh xạ JPA của Identity.

Lưu `geography(Point,4326)`, kinh độ là X, vĩ độ là Y theo [hợp đồng PostGIS 3.5](https://www.postgis.net/docs/manual-3.5/ST_MakePoint.html). Tham chiếu UUID đơn, không có khóa ngoại, phép nối hay truy cập kho dữ liệu xuyên mô-đun. Lược đồ B1 chỉ cho phép PENDING và disaster_id chưa liên kết; điều kiện disasterId vì thế không khớp dòng B1 nào.

Đếm và lấy danh sách trong cùng giao dịch chỉ đọc REPEATABLE READ tại bộ chuyển đổi. Cổng ứng dụng bảo đảm ảnh chụp dữ liệu nhất quán trong một yêu cầu. [Mức cô lập PostgreSQL](https://www.postgresql.org/docs/16/transaction-iso.html) hỗ trợ điều này mà không khóa bên ghi; kiểm thử chèn đồng thời xác minh hành vi. Sắp xếp luôn bổ sung id ASC; không bảo đảm cùng ảnh chụp qua nhiều yêu cầu HTTP. Tạo báo cáo dùng một INSERT nguyên tử. Thời gian UTC được cắt tới micro giây trước khi chèn để kết quả tạo/đọc khớp độ chính xác PostgreSQL.

## Hệ quả
Flyway V4 tạo lược đồ Reporting sau V3 Disaster. Kiểm thử chạy bản chuyển đổi thật và JWT tập trung; nâng V3→V4 giữ dữ liệu cũ. OpenAPI khi chạy công bố phần Reporting đã triển khai, chưa gồm bộ lọc không gian B2.

B2 phải mở rộng khôi phục mô hình/ánh xạ DTO cho VERIFIED/REJECTED, thêm bản chuyển đổi cho trạng thái, xác minh và rút báo cáo, thay ràng buộc chỉ PENDING. Mọi truy vấn thường phải loại dòng đã rút; ghi chuyển trạng thái phải nguyên tử; thêm chỉ mục không gian cùng truy vấn bán kính thực tế. B1 không đưa vào lệnh B2 hay phần hiện thực ReportingQuery công khai.

JDBC đòi hỏi bảo trì SQL/ánh xạ và cấu hình giao dịch tường minh. Hibernate Spatial vẫn là lựa chọn khi ca sử dụng sau này cần; không tạo mô hình lưu trữ thứ hai chỉ để theo quy ước ORM.
