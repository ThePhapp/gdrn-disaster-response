# ADR 002: Sử dụng kiến trúc lục giác và kiến trúc sạch

## Trạng thái
Đã chấp thuận.

## Bối cảnh
Quy tắc nghiệp vụ phải kiểm thử được mà không phụ thuộc HTTP hay thư viện lưu trữ; thay đổi hạ tầng không được đưa kiểu dữ liệu của thư viện vào miền nghiệp vụ.

## Quyết định
Quan hệ phụ thuộc hướng vào trong. API gọi ca sử dụng ở tầng ứng dụng; miền nghiệp vụ là Java thuần. Tầng hạ tầng hiện thực các cổng của ứng dụng/miền nghiệp vụ và ánh xạ mô hình lưu trữ. Chỉ tạo lớp trừu tượng khi có yêu cầu cụ thể. ArchUnit kiểm tra các quy tắc cấu trúc.

## Phương án đã cân nhắc
- Bộ điều khiển gọi thẳng Spring Data: không đáp ứng yêu cầu ranh giới.
- Gắn chú thích của thư viện lên đối tượng miền: giảm ánh xạ nhưng buộc miền phụ thuộc lưu trữ.
- Lớp cơ sở tổng quát dự phòng: tăng trừu tượng khi chưa có ca sử dụng.

## Hệ quả
Các phần triển khai tiếp theo cần giao diện và ánh xạ tường minh tại ranh giới. Kiểm thử miền chạy không cần Spring. Kiểm thử cấu trúc không chứng minh logic nghiệp vụ đã đặt đúng chỗ, nên vẫn cần rà soát. Giai đoạn khởi tạo không tạo kiểu dữ liệu tầng trong giả lập.
