# Rà soát C2 sau hợp nhất và kiểm tra kết hợp chức năng

Checkout rà soát: `888996a`. C2 phần triển khai `ad7a010`, hợp nhất
PR #9 `120dec8`; D1 hợp nhất PR #11 `e380d68`, fix rà soát `888996a`.
Tài liệu này ghi bằng chứng rà soát, không phải phần triển khai plan. Plan/nhiệm vụ UI
vị trí chỉ ở [danh mục](../PHASE1_PLAN.md#ui-vi-tri-sau-c2-d1).

## Kết luận và phạm vi

Không phát hiện blocker/regression chức năng C2 trong phạm vi mã nguồn đã đọc và các
các kiểm tra dưới đây. S04 đã tích hợp với auth/shared máy khách, C1 Disaster, B2 Reporting;
luồng ứng dụng phía máy chủ tiếp tục sang D1 hoạt động. Chưa thể kết luận đầy đủ UI xuyên suốt:
B3/S02–S03 và D2/S06 chưa có route/component. Không có nút điều phối tới định tuyến giả
trong S04; đây là phần phối hợp D2 sau này, không phải hồi quy do hợp nhất C2.

Sai lệch tài liệu đã sửa: progress/handoff còn ghi C2 chờ hợp nhất dù `120dec8` đã có
trong history. Map picker chưa triển khai; việc có plan không đổi trạng thái khi chạy.

## Đối chiếu mã nguồn và chức năng cần giữ

| Kết hợp | Bằng chứng hiện tại | Kết quả |
| --- | --- | --- |
| S01 → S04; nav S04/S05 | Feature định tuyến exports được discover, AUTHORITY landing `/operations/reports`; RoleGuard + security ứng dụng phía máy chủ | Trình duyệt login/nav/role kiểm thử đạt |
| C2 ↔ B2 E08/E09/E10 | Filter status/radius, trang, chi tiết, verify/reject; dùng chung máy khách thật, JSON đúng hợp đồng | Unit + trình duyệt thật đạt |
| C2 ↔ C1 E03 | Selector `status=ACTIVE`, lọc loại và phân trang; chọn thảm họa là lựa chọn người dùng | Unit chọn thảm họa trang 2 đạt; trình duyệt xác minh với thảm họa thật đạt |
| Confirm và mutation | Dialog focus/Escape, writing ref chặn gửi lặp, khóa thao tác khi confirm/write | Unit + trình duyệt đạt |
| 403/404/409 và reads cũ | Refetch list/detail, đặt lại decision, không báo success giả; list/detail yêu cầu counters bỏ kết quả cũ | Unit đạt; trình duyệt 409/withdrawal 404/role 403 đạt |
| S05 sau hợp nhất C2 | Create/edit/resolve với phiên bản, nav và vùng nhìn | Trình duyệt Disaster suite đạt |
| C2 → D1 | Verified báo cáo tạo nhiệm vụ, người dân owner đọc được; người dân khác 404; thảm họa kết thúc rồi nhiệm vụ vẫn hoàn tất | HTTP kiểm tra nhanh cục bộ đạt |
| S02/S03/S06 | Chưa có tính năng định tuyến | NOT IMPLEMENTED; không claim UI acceptance |
| Map chọn/xem vị trí | Chưa có SDK/component/config | PLANNED, không đánh dấu ĐẠT |

Đã đọc `ReportingOperationsPage`, `ReportFilters`, `DisasterPicker`, `DecisionDialog`,
`reporting-api`, định tuyến discovery, dùng chung API/session handling, kiểm thử C2 và các hợp đồng
E03/E08–E15. Map bổ sung phải giữ nguyên yêu cầu shapes và các hành vi ở bảng này.

## Checks thực chạy

| Lệnh / thao tác | Kết quả 14/10 |
| --- | --- |
| `npm.cmd run typecheck` (giao diện) | ĐẠT |
| `npm.cmd test` (giao diện) | ĐẠT, 32 kiểm thử / 7 tệp |
| `npm.cmd run build` (giao diện) | ĐẠT |
| `node node_modules/@playwright/test/cli.js test` (giao diện) | ĐẠT, 9/9, 25.2s; API 18080 và SPA 5173 thật; không intercept business API |
| `mvnw.cmd clean verify` | BUILD SUCCESS, exit 0, 113 kiểm thử =62 unit/architecture +51 tích hợp; 0 failure/error/skip; 1:49 |
| Xem ảnh chụp màn hình C2 | Đã xem `frontend/test-results/c2-1280.png` và `c2-360.png`; bố cục list/detail và biểu mẫu hiện tại đúng giới hạn nhưng vị trí chỉ là cặp số |
| Trình duyệt accessibility các kiểm tra | Reflow 360/768/1280, focus/dialog, reduced motion, phóng font gốc 200%, computed contrast đạt; cài trực tiếp trình duyệt zoom 200% chưa kiểm thử riêng |

Maven chạy qua `cmd /c` để giữ đúng exit mã nguồn khi redirect cài trực tiếp stderr trên
PowerShell; nhật ký cục bộ được Git bỏ qua `review-c2-verify.log`. Host JDK23 compile release21;
Testcontainers PostGIS 16-3.5, Docker đang hoạt động. Đăng nhập dùng `.env` trong tiến trình,
không in credentials/token. SPA/Compose cục bộ vẫn được giữ chạy cho người dùng.

### Kiểm tra nhanh C2 → D1 qua HTTP thật

Đã chạy bằng PowerShell `Invoke-RestMethod`, xác thực riêng điều phối viên và hai người dân:

1. Lấy E12 AVAILABLE; chỉ chọn đội đang rảnh, không sửa nhiệm vụ có sẵn.
2. E05 tạo thảm họa ACTIVE và E07 tạo báo cáo thuộc người dân 1.
3. E10 VERIFIED gắn thảm họa; E13 phân đội tạo ASSIGNED.
4. E14 theo reportId: người dân 1 thấy đúng nhiệm vụ; người dân 2 nhận 404.
5. E06 kết thúc thảm họa bằng phiên bản hiện tại.
6. E15 IN_PROGRESS rồi COMPLETED vẫn thành công; E14 người dân 1 đọc COMPLETED.

Fixture có nhãn `C2-D1 review 20261014-211838`; nhiệm vụ đã COMPLETED, thảm họa đã
RESOLVED; dữ liệu fixture giữ theo vòng đời. Trình duyệt suite tạo fixture `C2 <timestamp>`
và Disaster kiểm thử riêng; không xóa/reset dữ liệu người dùng. Kiểm tra nhanh này kiểm chứng
hợp đồng ứng dụng phía máy chủ giữa modules; thao tác UI phân công và người dân tiến độ vẫn chờ D2/B3.

## Giới hạn và bàn giao

- Không thay môi trường triển khai mã nguồn C2 trong lượt này; chỉ cập nhật review/progress và plan.
- Acceptance thiếu cho cả sản phẩm: B3/D2, A1/A2 đầy đủ, UI01-B/X1/X2 còn theo danh mục.
- Chưa đo performance hoặc kiểm thử bản đồ; không thêm geocoding/tiles phụ thuộc trong
  lượt lập kế hoạch. Trình duyệt kiểm thử hiện tại không phải E2E đủ sáu màn hình.
- Bàn giao C2 giữ bằng chứng 13/10; ghi chú 14/10 và tài liệu này là bằng chứng mới.
