# X1 — Danh sách kiểm tra tích hợp Pha 1

**Nhánh:** `feat/X1-integration-freeze`
**Nền:** `a12d8e1``main` sau khi hợp nhất UI01-B PR #21
**Môi trường:** Docker Desktop, Compose database/backend/frontend, PostGIS thật,
Chromium Playwright, Node 22.14.0, Java 21

## Điều kiện và khi chạy

| Kiểm tra | Kết quả |
| --- | --- |
| UI01-B, A1 và A2 khi chạy đã có trên nền | ĐẠT; UI01-B đã hợp nhất vào `main`, A2 vẫn còn phần CI trình duyệt chờ X2 |
| `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1 up -WaitTimeout 180` | ĐẠT; biên dịch ảnh môi trường và Compose startup thành công |
| `/actuator/health`, trạng thái còn sống, mức sẵn sàng | ĐẠT; đều `UP` và không lộ sức khỏe details |
| `/v3/api-docs`, `/swagger-ui/index.html` | ĐẠT |
| Giao diện `/login`, `/operations/rescue` | ĐẠT; SPA shell và deep định tuyến hoạt động |
| Giao diện `/api/unknown` | ĐẠT; trả JSON 401, không rơi vào SPA HTML |

## Đối chiếu API và máy khách

Môi trường chạy OpenAPI được lấy từ `http://127.0.0.1:8080/v3/api-docs` và đối chiếu với
`docs/api/phase1-contract.md`: đủ đúng 15 thao tác E01–E15, không phát hiện đường dẫn
ngoài phạm vi MVP. `frontend/src/shared/api.ts` buộc API máy khách dùng đường dẫn tương đối
`/api/`, không chứa hostname container và gửi `Authorization` trong bộ nhớ phiên.

Các phản hồi khi chạy dùng DTO API; không có JPA thực thể hoặc kho mã xuất hiện trong
HTTP hợp đồng. Timestamp ứng dụng phía máy chủ dùng `Instant`/UTC; các màn hình hiển thị theo locale
`vi-VN` của trình duyệt và giữ `dateTime` ISO cho semantic HTML.

## Luồng thật xuyên suốt

| Bước | Bằng chứng |
| --- | --- |
| Ba tài khoản trình diễn đăng nhập: hai người dân và một điều phối viên | API kiểm tra nhanh: 3/3 HTTP 200; trình duyệt `login.spec.ts`: 3/3 ĐẠT |
| Người dân 1 gửi báo cáo PENDING | API kiểm tra nhanh HTTP 201; trình duyệt B3/C2 ĐẠT |
| Điều phối viên tạo thảm họa ACTIVE | API kiểm tra nhanh HTTP 201 và kiểm tra `status=ACTIVE` |
| Điều phối viên xác minh báo cáo vào thảm họa | API kiểm tra nhanh HTTP 200; trình duyệt C2 ĐẠT |
| Điều phối viên chọn AVAILABLE đội và tạo nhiệm vụ | API kiểm tra nhanh HTTP 200/201; trình duyệt D2 ĐẠT |
| Mission chuyển `IN_PROGRESS` rồi `COMPLETED` | API kiểm tra nhanh HTTP 200/200; trình duyệt D2 ĐẠT |
| Người dân 1 đọc tiến độ `COMPLETED` | API kiểm tra nhanh HTTP 200 và kiểm tra item; trình duyệt B3/D2 ĐẠT |

Luồng tương tự qua UI đã chạy trong `frontend/e2e/rescue.spec.ts` với report/disaster
fixture thật và cơ sở dữ liệu ứng dụng phía máy chủ thật. Không intercept hoặc giả lập business API.

## Quyền, lỗi và hồi quy

| Acceptance | Bằng chứng |
| --- | --- |
| Người dân 2 đọc báo cáo của Người dân 1 | API kiểm tra nhanh HTTP 404 |
| Người dân 2 rút báo cáo của Người dân 1 | API kiểm tra nhanh HTTP 404 |
| Người dân rút báo cáo PENDING của chính mình | API kiểm tra nhanh HTTP 204; trình duyệt B3 ĐẠT |
| Điều phối viên từ chối báo cáo có lý do | API kiểm tra nhanh HTTP 200; trình duyệt C2 ĐẠT |
| Team xung đột khi hai điều phối viên cùng phân công | Trình duyệt D2 `TEAM_BUSY` HTTP 409 ĐẠT |
| Report đã có nhiệm vụ bị phân công lại | Trình duyệt D2 `REPORT_ALREADY_ASSIGNED` HTTP 409 ĐẠT |
| Người dân truy cập định tuyến điều phối viên | Trình duyệt UI01 login/role bảo vệ ĐẠT; giữ phiên người dân |
| Bearer hết hạn/không hợp lệ | API kiểm tra nhanh `/api/auth/me` HTTP 401; đầy đủ JWT natural expiry không chờ trong lượt này |
| Đăng nhập sai, đăng xuất, reload và giới hạn token theo tab | Trình duyệt đăng nhập suite ĐẠT; reload cùng tab giữ phiên, đăng xuất xóa `sessionStorage`, không dùng `localStorage` |

## Giao diện và trình duyệt

| Command | Kết quả |
| --- | --- |
| `cd frontend; npm.cmd run typecheck` | ĐẠT |
| `cd frontend; npm.cmd test -- --run` | ĐẠT — 16 tệp / 81 kiểm thử |
| `cd frontend; npm.cmd run build` | ĐẠT; chỉ còn cảnh báo chunk MapLibre lớn |
| `cd frontend; npm.cmd run test:login -- --reporter=list` với `E2E_API_URL=http://127.0.0.1:8080` và `E2E_BASE_URL=http://127.0.0.1:5174` | ĐẠT — 19/19 kiểm thử |

Trình duyệt suite đã bao phủ S01–S06, route/nav, biểu mẫu trường, lỗi messages, dropdown
lọc, phân trang nhiều trang, bản đồ phương án dự phòng, keyboard/focus và vùng nhìn 360/768/1280.
UI01-B kiểm tra riêng tiếp tục ĐẠT trên cùng stack. Không ghi token/password vào nhật ký.

## Ứng dụng phía máy chủ và cơ sở dữ liệu

| Command | Kết quả |
| --- | --- |
| `.\mvnw.cmd --no-transfer-progress clean verify` | ĐẠT — BUILD SUCCESS, 113 kiểm thử (62 unit/architecture + 51 tích hợp), 0 failure/error/skip |
| Flyway/PostGIS trong kiểm thử tích hợp | ĐẠT — migrations V1–V6 và các mô-đun Identity/Reporting/Rescue chạy với Testcontainers thật |

## Đóng băng tính năng

X1 không phát hiện mismatch môi trường triển khai cần sửa trong luồng tích hợp. Không thêm API,
định tuyến, lược đồ, mô-đun hoặc business tính năng ngoài 15 API/6 màn hình. Code môi trường triển khai
không thay đổi trong lượt này; danh sách kiểm tra và bàn giao là bằng chứng của commit ổn định.

Các phần còn lại thuộc gate sau X1: X2 cung cấp trình duyệt E2E đã chốt và ghép CI thật;
A2 tiếp tục cùng công việc để thêm tác vụ E2E rồi mới chuyển HOÀN TẤT. Native trình duyệt zoom,
trình đọc màn hình và trình duyệt matrix đầy đủ vẫn là giới hạn accessibility đã ghi ở bàn giao
UI01-B, không được suy ra từ danh sách kiểm tra này.
