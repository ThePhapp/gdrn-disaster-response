# ADR 004: Dự kiến sử dụng sự kiện nghiệp vụ nội bộ

## Trạng thái
Đề xuất.

## Bối cảnh
Luồng tương lai có thể cần phản ứng giữa các mô-đun mà không phụ thuộc trực tiếp vào phần hiện thực của nhau. Hiện chưa có ca nghiệp vụ xác lập yêu cầu sự kiện hoặc bảo đảm chuyển giao.

## Quyết định
Khi có ca sử dụng thực tế, đánh giá sự kiện miền/ứng dụng trong cùng tiến trình. Kiểu sự kiện miền phải độc lập với thư viện. Trước khi áp dụng, xác định và kiểm thử trách nhiệm phát sự kiện, thực thi đồng bộ/bất đồng bộ, thời điểm giao dịch, xử lý lỗi và mức bảo đảm chuyển giao. Không tạo cơ chế sự kiện hay hệ thống môi giới bên ngoài ở giai đoạn khởi tạo.

## Phương án đã cân nhắc
- Hợp đồng ứng dụng đồng bộ tường minh: phù hợp khi bên gọi cần kết quả.
- Phát sự kiện nội bộ Spring ở bộ chuyển đổi tầng ngoài: phương án dự kiến, chưa chọn.
- Hệ thống môi giới bên ngoài: để Pha 2 đánh giá dựa trên bằng chứng.

## Hệ quả
Không áp đặt API sự kiện hay bảo đảm chuyển giao mang tính dự đoán lên tính năng tương lai. Sự kiện nội bộ tự nó không bảo đảm chuyển giao bền vững khi tiến trình lỗi. Chấp thuận hoặc thay thế ADR này khi ca sự kiện đầu tiên xác định được ngữ nghĩa cần thiết.
