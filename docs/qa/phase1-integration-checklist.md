# X1 — Checklist tích hợp Pha 1

**Ngày kiểm tra:** 18/10/2026  
**Nhánh:** `feat/X1-integration-freeze`  
**Nền:** `a12d8e1` — `main` sau khi merge UI01-B PR #21  
**Môi trường:** Docker Desktop, Compose database/backend/frontend, PostGIS thật,
Chromium Playwright, Node 22.14.0, Java 21

## Điều kiện và runtime

| Kiểm tra | Kết quả |
| --- | --- |
| UI01-B, A1 và A2 runtime đã có trên nền | PASS; UI01-B đã merge vào `main`, A2 vẫn còn phần CI browser chờ X2 |
| `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1 up -WaitTimeout 180` | PASS; build image và Compose startup thành công |
| `/actuator/health`, liveness, readiness | PASS; đều `UP` và không lộ health details |
| `/v3/api-docs`, `/swagger-ui/index.html` | PASS |
| Frontend `/login`, `/operations/rescue` | PASS; SPA shell và deep route hoạt động |
| Frontend `/api/unknown` | PASS; trả JSON 401, không rơi vào SPA HTML |

## Đối chiếu API và client

Runtime OpenAPI được lấy từ `http://127.0.0.1:8080/v3/api-docs` và đối chiếu với
`docs/api/phase1-contract.md`: đủ đúng 15 operation E01–E15, không phát hiện path
ngoài phạm vi MVP. `frontend/src/shared/api.ts` buộc API client dùng path tương đối
`/api/`, không chứa hostname container và gửi `Authorization` trong memory session.

Các response runtime dùng DTO API; không có JPA entity hoặc repository xuất hiện trong
HTTP contract. Timestamp backend dùng `Instant`/UTC; các màn hình hiển thị theo locale
`vi-VN` của browser và giữ `dateTime` ISO cho semantic HTML.

## Luồng thật xuyên suốt

| Bước | Evidence |
| --- | --- |
| Ba tài khoản demo đăng nhập: hai citizen và một authority | API smoke: 3/3 HTTP 200; browser `login.spec.ts`: 3/3 PASS |
| Citizen 1 gửi report PENDING | API smoke HTTP 201; browser B3/C2 PASS |
| Authority tạo disaster ACTIVE | API smoke HTTP 201 và kiểm tra `status=ACTIVE` |
| Authority verify report vào disaster | API smoke HTTP 200; browser C2 PASS |
| Authority chọn AVAILABLE team và tạo mission | API smoke HTTP 200/201; browser D2 PASS |
| Mission chuyển `IN_PROGRESS` rồi `COMPLETED` | API smoke HTTP 200/200; browser D2 PASS |
| Citizen 1 đọc tiến độ `COMPLETED` | API smoke HTTP 200 và kiểm tra item; browser B3/D2 PASS |

Luồng tương tự qua UI đã chạy trong `frontend/e2e/rescue.spec.ts` với report/disaster
fixture thật và database backend thật. Không intercept hoặc mock business API.

## Quyền, lỗi và hồi quy

| Acceptance | Evidence |
| --- | --- |
| Citizen 2 đọc report của Citizen 1 | API smoke HTTP 404 |
| Citizen 2 rút report của Citizen 1 | API smoke HTTP 404 |
| Citizen rút report PENDING của chính mình | API smoke HTTP 204; browser B3 PASS |
| Authority từ chối report có lý do | API smoke HTTP 200; browser C2 PASS |
| Team conflict khi hai authority cùng phân công | Browser D2 `TEAM_BUSY` HTTP 409 PASS |
| Report đã có mission bị phân công lại | Browser D2 `REPORT_ALREADY_ASSIGNED` HTTP 409 PASS |
| Citizen truy cập route authority | Browser UI01 login/role guard PASS; giữ session citizen |
| Bearer hết hạn/không hợp lệ | API smoke `/api/auth/me` HTTP 401; full JWT natural expiry không chờ trong lượt này |
| Login sai, logout, reload và không lưu token vào storage | Browser login suite PASS; storage vẫn rỗng |

## Frontend và browser

| Command | Kết quả |
| --- | --- |
| `cd frontend; npm.cmd run typecheck` | PASS |
| `cd frontend; npm.cmd test -- --run` | PASS — 16 files / 81 tests |
| `cd frontend; npm.cmd run build` | PASS; chỉ còn cảnh báo chunk MapLibre lớn |
| `cd frontend; npm.cmd run test:login -- --reporter=list` với `E2E_API_URL=http://127.0.0.1:8080` và `E2E_BASE_URL=http://127.0.0.1:5174` | PASS — 19/19 tests |

Browser suite đã bao phủ S01–S06, route/nav, form field, error messages, dropdown
filter, pagination nhiều trang, map fallback, keyboard/focus và viewport 360/768/1280.
UI01-B audit riêng tiếp tục PASS trên cùng stack. Không ghi token/password vào log.

## Backend và database

| Command | Kết quả |
| --- | --- |
| `.\mvnw.cmd --no-transfer-progress clean verify` | PASS — BUILD SUCCESS, 113 tests (62 unit/architecture + 51 integration), 0 failure/error/skip |
| Flyway/PostGIS trong integration tests | PASS — migrations V1–V6 và các module Identity/Reporting/Rescue chạy với Testcontainers thật |

## Feature freeze

X1 không phát hiện mismatch production cần sửa trong luồng tích hợp. Không thêm API,
route, schema, module hoặc business feature ngoài 15 API/6 màn hình. Code production
không thay đổi trong lượt này; checklist và handoff là evidence của commit ổn định.

Các phần còn lại thuộc gate sau X1: X2 cung cấp browser E2E đã chốt và ghép CI thật;
A2 tiếp tục cùng task để thêm job E2E rồi mới chuyển DONE. Native browser zoom,
screen reader và browser matrix đầy đủ vẫn là giới hạn accessibility đã ghi ở handoff
UI01-B, không được suy ra từ checklist này.
