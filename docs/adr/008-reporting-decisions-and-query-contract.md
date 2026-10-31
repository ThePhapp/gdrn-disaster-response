# ADR 008: Quyết định nguyên tử và hợp đồng truy vấn Reporting

## Trạng thái
Đã triển khai trên nhánh B2 từ main `ca3751d`; chờ rà soát/hợp nhất. Mở rộng ADR 007, giữ hợp đồng truyền dữ liệu P00.

## Quyết định
Report quản lý vòng đời một chiều PENDING → VERIFIED/REJECTED. Rút báo cáo giữ PENDING và ghi withdrawn_at; mọi truy vấn đơn/lô/danh sách hiển thị đều loại dòng đã rút. Version là nội bộ, không xuất hiện trong yêu cầu hoặc phản hồi E10/E11.

Mỗi lệnh xác thực quyền, đọc báo cáo hiển thị rồi kiểm tra PENDING. Xác minh đọc ảnh chụp Disaster mới qua cổng DisasterLookup của Reporting và DisasterQueryAdapter ở tầng ngoài. Bộ chuyển đổi chỉ nhập hợp đồng Disaster công khai và ánh xạ enum sang kiểu Reporting.

Lần ghi duy nhất là SQL UPDATE nguyên tử với điều kiện id, phiên bản đã đọc, PENDING và withdrawn_at IS NULL. Một dòng bị tác động nghĩa là quyết định được ghi và phiên bản tăng; không dòng nào tương ứng INVALID_TRANSITION (409). Không giữ khóa đọc trong lúc tra cứu Disaster. Báo cáo thiếu/đã rút trả 404 ngay lần đọc đầu; khác chủ sở hữu cũng trả 404 trước khi kiểm tra trạng thái. Giữ ngữ nghĩa thử lại và tranh chấp của P00. Kết thúc thảm họa sau bước đọc điều kiện không chặn ghi xác minh; không có giao dịch, khóa, khóa ngoại xuyên mô-đun hay cam kết ACTIVE tại lúc ghi.

V5 mở rộng V4 với siêu dữ liệu, phiên bản, ràng buộc vòng đời và chỉ mục GiST một phần trên tọa độ của báo cáo chưa rút. E08 dùng ST_DWithin trên WGS84 geography với mét nguyên, trước phân trang/đếm. Đếm và lấy danh sách tiếp tục dùng giao dịch chỉ đọc REPEATABLE READ. Chỉ mục khớp biểu thức truy vấn và điều kiện hiển thị; EXPLAIN kiểm tra khả năng sử dụng, không chứng minh tăng hiệu năng.

ReportingQuery đọc báo cáo theo một lô, gom ID thảm họa VERIFIED không trùng và gọi tối đa một truy vấn Disaster theo lô qua cổng. Trả ảnh chụp P00 bất biến, bỏ báo cáo thiếu/đã rút và báo lỗi nếu tham chiếu VERIFIED bị thiếu. Không trả đối tượng lưu trữ hay dấu xóa. Bên sử dụng chịu trách nhiệm phân quyền; bên cung cấp nội bộ tin cậy không lọc theo người gọi.

## Bằng chứng và hệ quả
Kiểm thử Java thuần bao phủ vòng đời và điều phối qua cổng giả lập. Kiểm thử PostGIS bao phủ HTTP/bảo mật thực, nâng V4→V5, biên bán kính, quyền sở hữu, ảnh chụp truy vấn và các lệnh tranh chấp được đồng bộ bằng rào chắn. Kiểm thử riêng dùng chốt đồng bộ xác minh kết thúc thảm họa sau lần đọc điều kiện. Xem [bàn giao B2](../handoffs/B2.md).

Không cần cơ chế sự kiện, tách dịch vụ hay hạ tầng mới. Nếu thêm giao dịch bao ngoài, phải đánh giá lại mức cô lập và độ mới của truy vấn; hiện mỗi lệnh chỉ ghi nguyên tử một lần sau kiểm tra điều kiện.
