# ADR 009: Bảng thống kê chỉ đọc qua hợp đồng tổng hợp công khai

Trạng thái: Đã chấp thuận, triển khai và hợp nhất qua PR #29 (`392714e`). Đã đối chiếu lịch sử Git tại `main 2ddf9d0`; quyết định giữ nguyên.

## Bối cảnh
Người dùng cho phép mở rộng MVP 15 thao tác đã đóng băng: đếm báo cáo theo trạng thái, nhiệm vụ hoạt động, đội rảnh và lọc ngày. API danh sách có phân trang nên không thể dùng làm tổng toàn hệ thống. Reporting không được phụ thuộc Rescue; bộ điều khiển không điều phối lưu trữ xuyên mô-đun.

## Quyết định
Thêm mô-đun `dashboard` nhỏ cho ca đọc thực tế, không tạo thực thể miền giả. Dịch vụ ứng dụng Java thuần kiểm tra vai trò/ngày và dùng cổng do bên sử dụng sở hữu. Hạ tầng gọi hợp đồng tổng hợp Reporting/Rescue; bộ chuyển đổi JDBC của từng bên quản lý SQL trên bảng riêng. Bộ chuyển đổi Dashboard gói các lần đọc trong giao dịch chỉ đọc REPEATABLE READ trên nguồn dữ liệu hiện có. Kiểm thử đồng thời ghi hoàn thành nhiệm vụ giữa hai truy vấn, xác minh phản hồi vẫn dùng ảnh chụp cũ và lần gọi sau có số mới.

Ngày tính cả hai đầu theo `Asia/Ho_Chi_Minh`, chuyển thành khoảng thời điểm bao đầu, loại cuối. Báo cáo loại dòng đã rút và lọc theo thời gian tạo; nhiệm vụ lọc theo thời gian phân công nhưng phản ánh trạng thái hiện tại. Số đội luôn tính toàn bộ đội và mọi nhiệm vụ đang hoạt động, kể cả ngoài khoảng ngày, để không nhận nhầm đội đang bận thành rảnh.

E16 `GET /api/dashboard` chỉ dành cho AUTHORITY; chặn vai trò và phương thức khác. Dùng lại bộ gọi API có xác thực, no-store, DTO lỗi và bảo vệ theo vai trò. Không thay lược đồ, thêm bản chuyển đổi, sự kiện, bộ nhớ đệm hay hạ tầng. Danh mục công việc ghi nhận ngoại lệ phạm vi do người dùng cho phép.

## Hệ quả và phương án khác
Bảng thống kê nhất quán trong một yêu cầu nhưng cần làm mới để cập nhật. Không tái dựng trạng thái hoặc năng lực quá khứ; thống kê lịch sử thật cần yêu cầu và dữ liệu bổ sung. Truy vấn tổng hợp quét các dòng phù hợp; lựa chọn chỉ mục/tối ưu phải dựa trên đo lường.

Loại bỏ các phương án: tính tổng từ một trang (thiếu), trình duyệt tải hết trang (tốn kém và thiếu nhất quán), nối SQL xuyên mô-đun (vi phạm quyền sở hữu), điều phối trong `shared` hoặc Reporting (sai trách nhiệm/phụ thuộc), bộ đếm vật hóa bất đồng bộ (thêm chi phí nhất quán/hạ tầng không cần thiết).
