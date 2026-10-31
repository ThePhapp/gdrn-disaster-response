# ADR 005: Phạm vi MVP, xác thực JWT và giao diện

## Trạng thái

P01, C1, B1 và UI01-A đã tích hợp vào main `78f164b`; có E01–E09/S01/S05. Xem [tiến độ](../phase1-progress.md) và [kiến trúc](../architecture/architecture-overview.md) để biết hiện trạng. Ghi chú P00/P01 bên dưới mô tả thời điểm ra quyết định, không phải danh sách tính năng hiện còn thiếu. Tích hợp là bằng chứng triển khai, không chứng minh một lần chấp thuận ADR riêng của cả nhóm. Lần rà soát tài liệu này không đổi quyết định xác thực.

Ở P00, thiết kế là đề xuất chưa triển khai; P01 cập nhật trạng thái triển khai bên dưới. Phần còn lại vẫn thuộc kế hoạch, chờ nhóm rà soát. ADR này dùng số tiếp theo sau 004; ADR 001–004 giữ nguyên. Việc nhóm chấp thuận phải được ghi nhận, không mặc nhiên suy ra từ tài liệu.

P01: người dùng cho phép triển khai quyết định Identity/xác thực/SPA của P00. E01/E02/S01 đã triển khai trên nhánh P01; nghiệp vụ và triển khai còn lại vẫn trong kế hoạch. Đây là bằng chứng thực hiện, không thay thế chấp thuận của cả nhóm. Xem [bàn giao P01](../handoffs/P01.md) để biết kiểm tra cụ thể và phần A1/A2 còn lại.

A1: sau khi hợp nhất B2/D1, chính sách bảo mật chung đã đối chiếu toàn bộ E01–E15. Danh sách cho phép khớp chính xác đường dẫn công bố; đường dẫn API lạ mặc định bị chặn. Mọi thao tác OpenAPI có bảo vệ công bố `bearerAuth`. Giao diện dùng thành phần UI01-A, định tuyến lọc theo vai trò, phiên `sessionStorage` theo thẻ và kiểm tra thế hệ yêu cầu để phản hồi muộn không vượt qua đăng xuất/đổi người dùng. Đăng xuất/hết hạn xóa phiên; JWT đã cấp không bị thu hồi, hết hạn sau 900 giây. Chỉ bỏ qua CSRF cho `/api/**` vì trình duyệt gửi Bearer tường minh và không dùng xác thực cookie. Xem [bàn giao A1](../handoffs/A1.md).

## Bối cảnh tại P00

Bốn thành viên có 15 ngày làm việc để xây dựng luồng thật từ người dân tới cứu hộ. Khi đó kho mã có hạ tầng và User/EmailAddress/Role Java thuần kèm kiểm thử, chưa có API nghiệp vụ, kho thông tin xác thực hoặc giao diện. Đặc tả dài hạn có nhiều vai trò/mô-đun/API/sự kiện không thể đưa hết vào MVP.

## Quyết định triển khai

Theo [kế hoạch ba tuần](../PHASE1_PLAN.md) và đúng [E01–E15 / S01–S06](../api/phase1-contract.md). Giữ một ứng dụng Spring Boot nguyên khối theo mô-đun, Java 21 và một PostgreSQL/PostGIS. Identity, Disaster, Reporting, Rescue là các phần nghiệp vụ hoạt động. Lọc bán kính thuộc bộ chuyển đổi Reporting. Tại mốc P00, Resource, Alert, RescueRequest riêng, thuật toán ưu tiên/rủi ro, tải tệp, bản đồ tương tác, đăng ký/đặt lại mật khẩu/làm mới phiên, quản lý đội và trạng thái mở rộng đều để sau. MVP không có cơ chế sự kiện; ADR 004 vẫn là đề xuất. Hoãn tính năng không đồng nghĩa cần hạ tầng Pha 2; vẫn phải có bằng chứng đo.

Phụ thuộc: Rescue → truy vấn Reporting công khai → truy vấn Disaster công khai. [Hợp đồng mô-đun](../architecture/phase1-module-contracts.md) quy định chữ ký DTO, xử lý lô/thiếu dữ liệu, toàn vẹn tham chiếu và thứ tự chuyển đổi lược đồ. Kết thúc thảm họa là lệnh riêng của Disaster. Điều kiện ACTIVE kiểm tra khi truy vấn, không cam kết nguyên tử xuyên mô-đun lúc ghi phân công. Ràng buộc dữ liệu bảo vệ tính duy nhất của nhiệm vụ; ghi nguyên tử bảo vệ chuyển trạng thái từng mô-đun.

### Xác thực dự kiến

P01 hiện thực các lựa chọn sau. Chỉ `/api/**` bỏ qua CSRF; đường dẫn khác giữ bảo vệ. Tại phạm vi P01, chỉ POST đăng nhập và GET thông tin bản thân được mở cho nghiệp vụ, còn lại mặc định chặn. JWT được phân tích/kiểm chữ ký bằng Spring Security OAuth2 Resource Server/Nimbus do Boot quản lý. Đăng nhập bỏ qua Bearer cũ gửi kèm và chỉ xét tài khoản/mật khẩu. Không bật cookie, biểu mẫu đăng nhập, Basic, bộ nhớ đệm yêu cầu, phiên HTTP hoặc CORS ký tự đại diện.

- Chỉ Bearer JWT, không lưu trạng thái máy chủ; thư viện tương thích Spring Security. Không tự viết mật mã/bộ phân tích; P01 xác minh phiên bản cụ thể.
- Mỗi người dùng có một vai trò CITIZEN hoặc AUTHORITY. Giữ RESPONDER/ADMIN trong Java Role và kiểm thử nhưng không tạo mẫu, cấp token, định tuyến hay quyền MVP cho chúng. Đăng nhập vai trò chưa hỗ trợ trả INVALID_CREDENTIALS chung; token hợp lệ mang vai trò chưa hỗ trợ trả 403 FORBIDDEN.
- Chỉ ký HS256 bằng `JWT_SECRET_BASE64`, giải mã ít nhất 32 byte ngẫu nhiên. Bên phát hành `gdrn`, đối tượng nhận `gdrn-spa`, tuổi thọ đúng 900 giây. Thiếu/sai khóa phải làm cấu hình thất bại, không dùng bí mật dựng sẵn; khóa không nằm trong gói ứng dụng.
- Bắt buộc có `sub` là UUID người dùng chuẩn, `role`, `iss`, `aud`, `iat`, `nbf`, `exp`; cấp `nbf=iat`, `exp=iat+900`. Kiểm thuật toán cố định, chữ ký, bên phát hành/nhận, kiểu dữ liệu, thời hạn và thời điểm bắt đầu hiệu lực. Không cho lệch đồng hồ; máy phải đồng bộ giờ. `now >= exp` trả 401. Không nhận URL khóa từ tiêu đề, thuật toán `none` hay thuật toán dự phòng. ID/vai trò lấy từ nội dung token đã xác minh.
- Không có token làm mới, danh sách thu hồi hay API đăng xuất. Trình duyệt giữ JWT/người dùng trong `sessionStorage` theo thẻ; tải lại cùng thẻ khôi phục phiên, thẻ mới phải đăng nhập. Đăng xuất xóa token, người dùng và bộ nhớ đệm riêng; JWT đã cấp còn hiệu lực tới hết hạn. Token bị lấy cắp có thể dùng tối đa 15 phút. Không đưa token vào `localStorage`, URL hay nhật ký.
- Băm mật khẩu bằng Spring PasswordEncoder/BCrypt, hệ số chi phí ban đầu 10. Mật khẩu API tối đa 72 byte UTF-8 để tránh cắt ngắn, không loại khoảng trắng. Hai người dân và một điều phối viên được tạo qua cấu hình `demo` có kiểm soát bằng biến môi trường; chạy lại không đặt lại mật khẩu/vai trò và không lưu thông tin xác thực trong bản chuyển đổi lược đồ.
- Bảo mật API tập trung theo phương thức/đường dẫn; API lạ mặc định chặn. Quyền sở hữu đối tượng nằm trong tầng ứng dụng mô-đun, không dựa vào giao diện. Không kết hợp xác thực cookie/Basic/biểu mẫu. Trình duyệt không tự đính kèm Bearer nên bỏ CSRF ở API không lưu trạng thái; P01 có kiểm thử khớp đường dẫn. Nếu thêm cookie phải đánh giá lại. Proxy phát triển và cùng nguồn ở môi trường triển khai giúp tránh CORS rộng; không dùng thông tin xác thực với ký tự đại diện.

### Giao diện dự kiến

P01 dùng React 19.3.0, React Router 7.18.4, Vite 8.3.4, TypeScript 7.0.2, Node 22.14.0 cố định trong `.nvmrc`, engines và CI, kèm tệp khóa npm. Đã đối chiếu thông tin phiên bản và [yêu cầu Vite](https://vite.dev/guide/); tích hợp theo [Spring Security 6.5 JWT](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html) và [thiết lập React Router](https://reactrouter.com/start/declarative/installation). Đóng gói Docker giao diện thuộc A2.

Trước khi có định tuyến S03/S04, S01 hiển thị danh tính E02 thật và đăng xuất tại `/login`, không đăng ký trang nghiệp vụ giả. Khi tính năng xuất định tuyến thật, chuyển người dân tới `/my-reports`, điều phối viên tới `/operations/reports`. Đây là ranh giới bàn giao một phần của P01, không thay thế lâu dài luồng sáu màn hình.

SPA React/TypeScript/Vite nằm trong `frontend/`, dùng React Router, lớp gọi fetch nhỏ và thành phần CSS/biểu mẫu/đang tải/lỗi chung. Không SSR/Redux hay thư viện hệ thống thiết kế. P01 kiểm tra tương thích, cố định Node, lưu tệp khóa và tạo lệnh kiểm tra kiểu/kiểm thử/biên dịch. Chủ tính năng xuất định tuyến; Người 1 tích hợp định tuyến, bộ gọi API và phụ thuộc chung. Sau đó dùng `npm ci`, không tự sửa tệp khóa riêng lẻ.

S01 công khai; S02/S03 dành cho người dân; S04/S05/S06 dành cho điều phối viên. E02 sau đăng nhập kiểm tra phiên; 401 xóa phiên và về S01, 403 báo từ chối, 409 tải lại và yêu cầu người dùng xem xét, không tự thử ghi lại. Theo dõi tiến độ dùng E09 + E14, không tạo phụ thuộc ngược từ Reporting. Bản trình diễn phục vụ SPA và proxy `/api` cùng nguồn bằng cấu hình máy chủ tĩnh, không thêm kiến trúc cổng API.

## Phương án khác và hệ quả

Phiên cookie tránh xử lý Bearer thủ công nhưng cần hợp đồng CSRF/phiên khác. Làm mới phiên hoặc lưu dài hạn tăng tiện dụng nhưng thêm rủi ro vòng đời token. JWT ngắn hạn trong `sessionStorage` giữ trải nghiệm tải lại và giới hạn theo thẻ; đăng xuất không vô hiệu token đã cấp.

Giao diện lớn hơn hoặc thêm mô-đun dài hạn sẽ giảm thời gian cho kiểm thử quyền sở hữu, tranh chấp và luồng thật. Sáu màn hình nhỏ bao phủ kế hoạch. ADR không viết lại triển khai có sẵn. P01 và chủ tính năng thực hiện tiếp, kiểm thử hành vi thật; A1/X1 rà soát hợp đồng tích hợp và A3 hoàn thiện bằng chứng. Mục cần nhóm rà soát ở [bàn giao P00](../handoffs/P00.md).
