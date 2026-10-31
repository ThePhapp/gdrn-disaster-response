# Sửa khôi phục phiên sau khi tải lại trang

Nhánh: `feat/ui-ux-list-compact`.
Commit: `838334a fix: restore auth session after page reload`.

Giao diện lưu JWT, người dùng và thời điểm hết hạn trong `sessionStorage` của thẻ hiện tại. Tải lại khôi phục phiên trước khi React dựng bộ bảo vệ định tuyến, giữ người dùng ở trang theo vai trò tới khi JWT hết tuổi thọ 900 giây. Thẻ mới có vùng lưu trữ riêng và cần đăng nhập.

Dữ liệu lưu sai/hết hạn bị xóa khi khởi động. Đăng xuất, phản hồi 401 khớp phiên và bộ đếm hết hạn xóa cả bộ nhớ và `sessionStorage`. Tiếp tục gọi `/api` tương đối với Bearer tường minh; không thêm xác thực cookie hoặc `localStorage`.

## Kiểm chứng

- `npm.cmd run typecheck`: đạt.
- `npm.cmd test -- --run`: đạt, 16 tệp / 81 kiểm thử.
- `npm.cmd run build`: đạt; còn cảnh báo kích thước gói MapLibre có sẵn.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1 up -WaitTimeout 180`: đạt kiểm tra sức khỏe Compose, định tuyến SPA và phản hồi JSON cho API không khớp.
- `npm.cmd run test:login -- --grep "real login, reload, logout" --reporter=line`: đạt với 3/3 tài khoản trình diễn thật.
- `npm.cmd run test:login -- --reporter=line`: đạt 19/19 kiểm thử trình duyệt.

Kiểm thử trình duyệt xác nhận người dân/điều phối viên trở về đúng trang theo vai trò sau tải lại; đăng xuất để cả `localStorage` và `sessionStorage` rỗng.
