# Rà soát C2 sau hợp nhất và kiểm tra kết hợp chức năng

Ngày 14/10/2026. Checkout review: `888996a`. C2 implementation `ad7a010`, merge
PR #9 `120dec8`; D1 merge PR #11 `e380d68`, fix review `888996a`.
Tài liệu này ghi evidence review, không phải implementation plan. Plan/nhiệm vụ UI
vị trí chỉ ở [catalog](../PHASE1_PLAN.md#ui-vị-trí-sau-c2d1--kế-hoạch-và-nhiệm-vụ-bổ-sung).

## Kết luận và phạm vi

Không phát hiện blocker/regression chức năng C2 trong phạm vi code đã đọc và các
checks dưới đây. S04 đã tích hợp với auth/shared client, C1 Disaster, B2 Reporting;
luồng backend tiếp tục sang D1 hoạt động. Chưa thể kết luận full UI xuyên suốt:
B3/S02–S03 và D2/S06 chưa có route/component. Không có nút điều phối tới route giả
trong S04; đây là phần phối hợp D2 sau này, không phải regression do merge C2.

Sai lệch tài liệu đã sửa: progress/handoff còn ghi C2 chờ merge dù `120dec8` đã có
trong history. Map picker chưa triển khai; việc có plan không đổi trạng thái runtime.

## Đối chiếu mã nguồn và chức năng cần giữ

| Kết hợp | Bằng chứng hiện tại | Kết quả |
| --- | --- | --- |
| S01 → S04; nav S04/S05 | Feature route exports được discover, AUTHORITY landing `/operations/reports`; RoleGuard + security backend | Browser login/nav/role tests pass |
| C2 ↔ B2 E08/E09/E10 | Filter status/radius, page, detail, verify/reject; shared client thật, JSON đúng contract | Unit + browser thật pass |
| C2 ↔ C1 E03 | Selector `status=ACTIVE`, filter loại và pagination; chọn disaster là lựa chọn người dùng | Unit chọn disaster trang 2 pass; browser verify với disaster thật pass |
| Confirm và mutation | Dialog focus/Escape, writing ref chặn gửi lặp, khóa thao tác khi confirm/write | Unit + browser pass |
| 403/404/409 và reads cũ | Refetch list/detail, reset decision, không báo success giả; list/detail request counters bỏ kết quả cũ | Unit pass; browser 409/withdrawal 404/role 403 pass |
| S05 sau merge C2 | Create/edit/resolve với version, nav và viewport | Browser Disaster suite pass |
| C2 → D1 | Verified report tạo mission, citizen owner đọc được; citizen khác 404; disaster resolve rồi mission vẫn hoàn tất | HTTP smoke local pass |
| S02/S03/S06 | Chưa có feature routes | NOT IMPLEMENTED; không claim UI acceptance |
| Map chọn/xem vị trí | Chưa có SDK/component/config | PLANNED, không đánh dấu PASS |

Đã đọc `ReportingOperationsPage`, `ReportFilters`, `DisasterPicker`, `DecisionDialog`,
`reporting-api`, route discovery, shared API/session handling, tests C2 và contracts
E03/E08–E15. Map bổ sung phải giữ nguyên request shapes và các hành vi ở bảng này.

## Checks thực chạy

| Lệnh / thao tác | Kết quả 14/10 |
| --- | --- |
| `npm.cmd run typecheck` (frontend) | PASS |
| `npm.cmd test` (frontend) | PASS, 32 tests / 7 files |
| `npm.cmd run build` (frontend) | PASS |
| `node node_modules/@playwright/test/cli.js test` (frontend) | PASS, 9/9, 25.2s; API 18080 và SPA 5173 thật; không intercept business API |
| `mvnw.cmd clean verify` | BUILD SUCCESS, exit 0, 113 tests =62 unit/architecture +51 integration; 0 failure/error/skip; 1:49 |
| Xem screenshot C2 | Đã xem `frontend/test-results/c2-1280.png` và `c2-360.png`; layout list/detail và form hiện tại đúng giới hạn nhưng vị trí chỉ là cặp số |
| Browser accessibility checks | Reflow 360/768/1280, focus/dialog, reduced motion, phóng font root 200%, computed contrast pass; native browser zoom 200% chưa test riêng |

Maven chạy qua `cmd /c` để giữ đúng exit code khi redirect native stderr trên
PowerShell; log local ignored `review-c2-verify.log`. Host JDK23 compile release21;
Testcontainers PostGIS 16-3.5, Docker đang hoạt động. Login dùng `.env` trong process,
không in credentials/token. SPA/Compose local vẫn được giữ chạy cho người dùng.

### Kiểm tra nhanh C2 → D1 qua HTTP thật

Đã chạy bằng PowerShell `Invoke-RestMethod`, xác thực riêng authority và hai citizen:

1. Lấy E12 AVAILABLE; chỉ chọn đội đang rảnh, không sửa mission có sẵn.
2. E05 tạo disaster ACTIVE và E07 tạo report thuộc citizen 1.
3. E10 VERIFIED gắn disaster; E13 phân đội tạo ASSIGNED.
4. E14 theo reportId: citizen 1 thấy đúng mission; citizen 2 nhận 404.
5. E06 resolve disaster bằng version hiện tại.
6. E15 IN_PROGRESS rồi COMPLETED vẫn thành công; E14 citizen 1 đọc COMPLETED.

Fixture có nhãn `C2-D1 review 20261014-211838`; mission đã COMPLETED, disaster đã
RESOLVED; dữ liệu fixture giữ theo lifecycle. Browser suite tạo fixture `C2 <timestamp>`
và Disaster test riêng; không xóa/reset dữ liệu người dùng. Smoke này kiểm chứng
hợp đồng backend giữa modules; thao tác UI phân công và citizen progress vẫn chờ D2/B3.

## Giới hạn và bàn giao

- Không thay production code C2 trong lượt này; chỉ cập nhật review/progress và plan.
- Acceptance thiếu cho cả sản phẩm: B3/D2, A1/A2 đầy đủ, UI01-B/X1/X2 còn theo catalog.
- Chưa đo performance hoặc kiểm thử map; không thêm geocoding/tiles dependency trong
  lượt lập kế hoạch. Browser tests hiện tại không phải E2E đủ sáu màn hình.
- Handoff C2 giữ evidence 13/10; ghi chú 14/10 và tài liệu này là evidence mới.
