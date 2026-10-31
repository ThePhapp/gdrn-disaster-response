# Tiêu chí triển khai và nghiệm thu UI01

Phạm vi: dùng chung hệ thống thiết kế, S01, S05 và kiểm tra đồng nhất các màn hình Pha 1.
Tài liệu này bổ sung tiêu chí UI cho [kế hoạch chính](../PHASE1_PLAN.md), không tạo
công việc danh mục thứ hai hoặc thay đổi hợp đồng nghiệp vụ. Dependency và owner theo
kế hoạch; trạng thái triển khai xem [tiến độ](../phase1-progress.md).

UI01-A cần P00/P01/C1/B1 đã hợp nhất; UI01-C1 cần UI01-A. UI01-B kiểm tra sau khi đủ
S01–S06 và các phần UI liên quan; đây là cổng nghiệm thu trước X1.

## UI01-A — Người 1: xây hệ thống thiết kế dùng chung và cải tạo S01 Đăng nhập

Mục tiêu: xây dựng nhận diện GDRN Crisis Command trên nền React hiện có mà không
regenerate giao diện, không đổi API/auth/business logic và không làm màn hình ngoài
phạm vi công việc. Chỉ sở hữu dùng chung giao diện theme/layout/primitives và S01 Đăng nhập.

1. Kiểm tra giao diện hiện tại, ghi danh sách thành phần tái sử dụng, điểm yếu về
   phân cấp thông tin, accessibility, thích ứng kích thước màn hình và chỗ cần phối hợp với C1.
2. Thêm semantic CSS tokens, typography, spacing, thích ứng kích thước màn hình conventions,
   họa tiết đường đồng mức địa hình nhẹ do dự án tự tạo. Không tạo phụ thuộc
   CDN bắt buộc; không đổi API máy khách, router conventions hay thư viện nền tảng.
3. Nâng cấp dùng chung thành phần thực sự cần, ưu tiên PageHeader, StatusBadge,
   EmptyState, ErrorState, LoadingState, biểu mẫu controls, ConfirmDialog nếu có.
   Không dựng thư viện UI thừa hoặc sửa tính năng-owned CSS hàng loạt.
4. Cải tạo S01 /login: nhận diện GDRN rõ ràng, hero máy tính và bố cục điện thoại,
   biểu mẫu dễ đọc, trạng thái loading/error, keyboard/label/focus, đăng nhập API thật.
   Giữ JWT theo tab trong `sessionStorage`, /me, đăng xuất và hành vi reload như P01.
5. Giữ nguyên tính năng Disaster S05 thuộc người 3. Tạo checklist/đề xuất patch
   cho người 3 thay vì tự sửa C1-owned tệp.
6. Kiểm tra nav theo vai trò, 401/403, clear trạng thái khi đăng xuất; không lưu token vào
   `localStorage`, URL hoặc cookie, không sinh dữ liệu trình diễn giả hoặc định tuyến mới.
7. Chạy giao diện typecheck, kiểm thử chế độ không watch và biên dịch; ứng dụng phía máy chủ xác minh
   theo CONTRIBUTING.md. Thử trình duyệt thật nếu có công cụ; nếu không ghi CHƯA CHẠY kèm
   danh sách kiểm tra thao tác, tuyệt đối không báo ĐẠT khi chưa kiểm tra.
8. Ghi docs/handoffs/UI01-A.md: tệp, thay đổi hình thức, lệnh và đầu ra kiểm thử,
   hồi quy, trở ngại, hướng dẫn dùng tokens/components cho B3/C2/D2 và đề
   xuất dành cho S05. Cập nhật tiến độ phù hợp.

Tiêu chí hoàn tất: S01 vẫn hoạt động với API thật; dùng chung hệ thống thiết kế dùng được
cho các tính năng; không hồi quy auth/route; không sửa mã nguồn owner khác.
Không tự đẩy mã, hợp nhất, triển khai hoặc chạy UI01-C1/UI01-B.

## UI01-C1 — Người 3: cải tạo S05 Disaster đã triển khai

Thực hiện UI01-C1 sau khi UI01-A đã hợp nhất vào nhánh tích hợp.
Đọc CONTRIBUTING.md, kế hoạch MVP, Quy tắc chung, P00 các hợp đồng,
docs/design/GDRN_UI_DESIGN_SYSTEM.md, bàn giao C1/UI01-A và mã nguồn thật.
Kiểm tra git status/diff và định tuyến export S05 hiện tại.

Chỉ sở hữu frontend/src/features/disaster cùng kiểm thử liên quan. Cải tạo S05 theo
phong cách Điều phối viên Operational Workbench: tiêu đề nghiệp vụ, bộ lọc/danh sách,
StatusBadge, khung chi tiết, biểu mẫu tạo/sửa/resolve, confirmation rõ ràng,
loading/empty/error, thích ứng kích thước màn hình ở 360/768/1280px, bàn phím và tiêu điểm.

Tái sử dụng dùng chung thành phần và tokens từ UI01-A; không nhân bản CSS/client.
Giữ nguyên E03–E06, định tuyến thực tế, vai trò permissions, trạng thái ACTIVE → RESOLVED,
yêu cầu/phản hồi, dữ liệu API thật và lỗi semantics. Map chỉ theo phần bổ sung UI
vị trí 14/10 trong danh mục; không thêm bản đồ ngoài phạm vi đó, bảng thống kê,
API, dữ liệu giả hoặc mô-đun mới. Không sửa dùng chung router/theme nếu chưa phối hợp
người 1. Không thay ứng dụng phía máy chủ, security, bản chuyển đổi lược đồ, OpenAPI.

Chạy giao diện typecheck, kiểm thử không watch, biên dịch và ứng dụng phía máy chủ xác minh theo CONTRIBUTING.md.
Thử UI trên trình duyệt thật nếu có công cụ; nếu không ghi CHƯA CHẠY và danh sách kiểm tra thủ công.
Ghi docs/handoffs/UI01-C1.md gồm tệp sửa, test/output thật, ảnh chụp màn hình nếu có,
kiểm tra bảo toàn nghiệp vụ và trở ngại. Cập nhật tiến độ. Không tự merge/push.

## Hướng dẫn bổ sung cho B3, C2, D2

Khi thực hiện công việc B3/C2/D2 theo nhiệm vụ trong danh mục chính, đọc thêm
`docs/design/GDRN_UI_DESIGN_SYSTEM.md` và `docs/handoffs/UI01-A.md`.
Xây màn hình mới theo đúng design tokens, dùng chung thành phần và phân biệt
Citizen/Authority của GDRN Crisis Command. Giữ nguyên API, vai trò, định tuyến,
tệp quyền sở hữu, acceptance và phụ thuộc của nhiệm vụ gốc.
Chỉ thêm bản đồ chọn/xem điểm và vòng bán kính theo mục UI vị trí 14/10 trong danh mục;
không thêm bản đồ tổng hợp/dashboard/số liệu giả chỉ để tăng độ đẹp. Không tự sửa theme,
router hoặc tính năng người khác. Nếu phát hiện thiếu dùng chung thành phần, gửi
đề xuất cụ thể cho người 1 và ghi blocker/handoff. Kiểm thử giao diện và API thật.

## UI01-B — Người 1 điều phối: kiểm tra đồng nhất cả 6 màn hình

Thực hiện UI01-B chỉ sau khi S01–S06, UI01-C1 và các công việc UI có liên quan đã hợp nhất.
Bao gồm phần UI vị trí bổ sung của UI01-A/UI01-C1/C2; kiểm tra phương án dự phòng nhập tay,
ô bản đồ lỗi, tiêu điểm, ghi nguồn bản đồ và toàn bộ ma trận hồi quy trong danh mục.
Đọc CONTRIBUTING.md, P00, Quy tắc chung, docs/design/GDRN_UI_DESIGN_SYSTEM.md,
handoffs UI01-A/UI01-C1 và handoffs của B3/C2/D2. Kiểm tra mã nguồn thật.

Kiểm tra tất cả 6 màn hình về màu, typography, spacing, bố cục Citizen/Authority,
thích ứng kích thước màn hình 360/768/1280px, focus/keyboard, mục tiêu WCAG 2.2 AA,
loading/empty/error/401/403/404/409, xác nhận thao tác và luồng API thật.
Không thêm tính năng, không đổi workflow/role/API/route. Chỉ sửa phần dùng chung UI
thuộc người 1; issue thuộc tính năng phải bàn giao patch cho owner và kiểm thử lại sau hợp nhất.

Chạy giao diện typecheck/test không watch/build, ứng dụng phía máy chủ xác minh theo CONTRIBUTING.md và
trình duyệt kiểm tra nhanh nếu có công cụ. Ghi PASS/FAIL/NOT RUN theo bằng chứng thật, không
đánh dấu ĐẠT cho bước chưa chạy. Ghi docs/handoffs/UI01-B.md, danh sách các
màn hình đã kiểm tra, commands/output, ảnh chụp màn hình nếu có, trở ngại và điểm còn lại.
Không tự push/merge/deploy hoặc bắt đầu Pha 2.
