# UI01-B — audit 6 màn hình, 17/10/2026

**Kết quả: FAIL / BLOCKED nghiệm thu.** Đã audit và sửa phần shared được giao;
các lỗi feature đã bàn giao patch, chưa áp dụng, chưa merge và chưa retest.
Không mở gate X1, không tuyên bố đạt WCAG 2.2 AA.

## Nền và phạm vi

- Nền `main` tại `1b47b6f` (PR #20 D2), working tree ban đầu sạch.
- Đã kiểm tra code/routes thật và ancestry: S01–S06, UI01-C1, B3/C2/D2 đã merge;
  vị trí shared PR #16 `df4777f`, C2/S05 PR #17 `d72ecb1`, B3 PR #18
  `a7471f0`, D2 PR #20 `1b47b6f`. Gate bắt đầu UI01-B được đáp ứng.
- Đã đọc AGENTS, context/architecture, P00/contracts, Quy tắc chung/catalog,
  design system, handoffs UI01-A/UI01-C1/B3/C2/D2; handoff cũ là evidence lịch sử.
- Chỉ thay production code shared `LocationMap.tsx`: lỗi renderer/tiles ở preview
  chỉ đọc nói tọa độ vẫn có trong chi tiết, không hứa nhập tọa độ trên màn hình chỉ đọc.
  Thêm component regression; cập nhật duy nhất assertion thông báo shared ở B3 E2E.
- Thêm `frontend/e2e/ui01-b-audit.spec.ts`: API/DB thật, 18 ảnh, đo contrast/reflow,
  tăng root font 200%, skip link và lấy mẫu 12 bước Tab mỗi màn hình.
  Test cố ý giữ assertion lỗi, không skip lỗi để lấy xanh.
- Không thay backend, feature implementation, route, role, API, workflow hay schema.
  Không push/merge/deploy, benchmark, Phase 2. Runtime chỉ chạy local.

## Màn hình và bằng chứng thị giác

Ảnh ở [thư mục evidence](../qa/UI01-B/), tên `S01-360.png` đến `S06-1280.png`,
đủ 360/768/1280. [Metrics](../qa/UI01-B/metrics.json) ghi màu, contrast, font size,
line height, padding, focus và overflow. Đây là dữ liệu đo trên trạng thái được chụp,
không phải mọi trạng thái UI. Ảnh không thay thế smoke online tải tiles riêng.

| Màn hình / route thật | Bố cục, typography, spacing, responsive | Kết quả audit |
| --- | --- | --- |
| S01 `/login` | Hero/form desktop, một cột mobile; chữ/CTA rõ, 1 h1, không tràn ở 3 widths và text 200% | PASS trong mẫu đã đo |
| S02 `/reports/new` | Citizen form, label/error liên kết, nhập tọa độ và map; không tràn ở 3 widths/text 200% | PASS trong mẫu đã đo |
| S03 `/my-reports` | Citizen cards/detail, trạng thái và tiến độ có text; không tràn ở 3 widths/text 200% | FAIL chữ card và badge mission |
| S04 `/operations/reports` | Authority workbench, filter tách report preview, list/detail; không tràn ở 3 widths/text 200% | PASS trong mẫu đã đo |
| S05 `/operations/disasters` | Authority list/detail, tạo/sửa/resolve; 3 widths ở cỡ chữ thường không tràn | FAIL contrast MODERATE và text 200% tại 360 |
| S06 `/operations/rescue` | Authority list/detail/assignment, preview report chỉ đọc; không tràn ở 3 widths/text 200% | FAIL contrast và padding mobile/tablet |

Citizen/Authority dùng shell khác nhau đúng design, hệ font/token chung và phân cấp
heading có mặt. S04 list dài làm trang dài; không tự đổi pagination/workflow.
Màu không phải tín hiệu trạng thái duy nhất. Typography/spacing chưa thể ký nghiệm thu
toàn bộ vì các lỗi dưới đây.

## Lỗi cần owner xử lý

| ID / mức | Evidence và nguyên nhân | Owner / patch |
| --- | --- | --- |
| B-01 / cao | S03 `.report-list__item` nền trắng nhưng kế thừa chữ trắng từ button; type/description contrast **1:1** trên cả 3 widths | Người 2 B3: [patch](../qa/UI01-B/patches/owner2-B3.patch) đặt ink cho card |
| B-02 / vừa | S03/S06 IN_PROGRESS **4.18264651:1**, dưới 4.5. Selector mission-status toàn cục của Rescue ghi đè Citizen | Người 4 D2: [patch](../qa/UI01-B/patches/owner4-D2.patch) scope `.rescue-badge`, dùng link text. Đồng thời scope assigned/completed, tránh CSS xuyên feature |
| B-03 / vừa | S06 `.mission-detail__type` cam trên trắng **2.78634397:1**, 16px bold | Cùng patch D2 dùng link text |
| B-04 / vừa | S06 `.rescue-panel` padding đo **0px** ở 360/768; dùng token không tồn tại `--gdrn-space-5` | Cùng patch D2 dùng space-4 đang có |
| B-05 / vừa | S05 MODERATE **4.49890555:1**, không được làm tròn lên 4.5 | Người 3 UI01-C1: [patch](../qa/UI01-B/patches/owner3-UI01-C1.patch) đổi foreground sang ink; giữ nền warning và nhãn |
| B-06 / vừa | S05 tại 360, root font 200%: badge vượt phải tới 438px, pagination tới 610px | Cùng patch UI01-C1 cho badge/nav wrap; cần owner kiểm tra lại toàn bộ breakpoint |

Patch D2 cũng đổi chữ ASSIGNED/AVAILABLE dùng cùng cặp warning như B-05;
đây là phòng lỗi cùng nguyên nhân qua code review, không gọi là trạng thái đã đo browser.
`git apply --check` cả ba patch: PASS. **Chưa áp dụng patch vào feature.** Kiểm tra
visual/contrast sau patch và retest sau merge: **NOT RUN**, chờ owner thực hiện/review.
Các file patch là bàn giao tại repo, chưa gửi thông điệp ra công cụ bên ngoài.

## Ma trận regression theo catalog

PASS dưới đây phân biệt browser/API thật với unit/component mock. Không chuyển
PASS unit thành PASS browser. Suite hiện hữu nằm trong `frontend/e2e/` và các
`*.test.ts(x)` tương ứng trong `frontend/src/`.

| Acceptance | Kết quả / evidence chạy lượt này | Phần còn lại |
| --- | --- | --- |
| Auth/S01: hai role, landing/nav, reload/logout, cách ly phiên | PASS browser `login.spec.ts`, `ui01-login.spec.ts` (3 tài khoản, 3 widths, keyboard/route guard) | Expiry/late 401 PASS unit `shared/api.test.ts`; chờ hết JWT thật trong browser NOT RUN |
| S05 E03–E06 list/detail/create/edit/resolve, confirmation | PASS browser `disaster.spec.ts`; focus trap/Escape/restore PASS component `ResolveDisasterDialog.test.tsx` | Version 409/filter PASS component `DisasterPage.test.tsx`; 409 thật và chuyển trang S05 browser NOT RUN |
| S04 E08–E10 status/radius/reset, chọn disaster ngoài trang 1, Unicode, double-submit | PASS browser filter/verify/reject/dialog; PASS component complete geography, page 2 selector, Unicode code points, pending lock | Page 2 selector và double-submit/race response cũ chỉ có component, browser NOT RUN |
| S04 403/404/409, refetch, không false success/retry | PASS browser 404 do rút report, 409 cạnh tranh + refetch; citizen write 403 API thật và route guard browser | 403 khóa quyết định khi đang ở panel PASS component, browser NOT RUN; late response PASS component |
| B3 E07/E11/E14, tọa độ, ownership, PENDING withdraw, chưa mission | PASS browser tạo/rút, isolation, progress và tile-failure submit/detail; PASS component empty mission, reload E09→E14, 409 withdrawal | Withdrawal 409 browser NOT RUN; map blank/zero/pending lock PASS component |
| D2 E12–E15 report/team pagination, lifecycle, conflict | PASS browser TEAM_BUSY 2 phiên và REPORT_ALREADY_ASSIGNED, confirm start/complete; PASS component page 2 report/team và stale response guard | Page 2 thật browser NOT RUN; E09 403/404 deep link PASS component |
| C2 verify → S04 link → D2 assign → complete → B3 progress | PASS browser `rescue.spec.ts`; E09 preview, route reportId thật, user chọn team; mission tiếp tục sau disaster RESOLVED | Disaster/report fixture và bước RESOLVED qua API thật (API-only), không tuyên bố mọi setup qua UI |
| Map click/input, blank/0/range invalid, radius mét, draft/applied, read-only | PASS component LocationMap/MapLibreMap + S02/S04/S05 forms; PASS browser click/manual zero, C2 radius submit, D2 preview | Full địa lý biên được validation unit; browser mọi giá trị biên NOT RUN |
| Map online/attribution, tiles lỗi/fallback, retry, lifecycle | PASS browser S05 online canvas/style/attribution, S06 preview online; chặn tile transport ở S02/S03/S04/S05/S06 vẫn dùng API thật; lazy chunk fail S05 PASS | Retry renderer, StrictMode/unmount cleanup PASS component; custom provider riêng NOT RUN |

## Trạng thái UI, keyboard và WCAG

- Loading/pending: PASS component S01, S02 submit/map lock, S04 decision lock,
  D2 preview khi đổi report; skeleton/status có trong code. Không cố kéo chậm từng
  endpoint thật để chụp loading tất cả màn hình: **NOT RUN**.
- Empty/error/retry: PASS component B3 list/mission, S05 list, S04 list và stale
  detail, D2 preview lỗi. Ma trận mọi màn hình × mọi mã 401/403/404/409 trên browser:
  **NOT RUN**; phạm vi đã chạy xem bảng trên. Không có kỳ vọng mọi mã áp dụng mọi route.
- Confirmation: browser đã xác nhận withdraw, verify/reject, resolve, complete;
  component kiểm tra Escape/trap/restore B3/S05, browser C2 trap/restore và D2 focus.
- Skip link → main PASS trên 6 màn hình. Mẫu Tab và outline ghi trong metrics;
  map zoom không có outline nhưng có focus box-shadow xanh, 29×44px, trong viewport.
  Không gắn FAIL chỉ vì outline none; 29px đạt ngưỡng kích thước 24px AA, còn mục tiêu
  thiết kế 44px chiều ngang chưa đạt. Full duyệt mọi control/mọi dialog chỉ bằng bàn
  phím, kiểm tra tương phản mọi focus ring, screen reader NVDA/VoiceOver: **NOT RUN**.
- Text contrast đo bằng computed color/background composite ở text node hiển thị;
  bỏ logo, disabled, map imagery. Không đo pseudo-element/placeholder, mọi trạng thái
  hover, forced-colors, overlay hoặc opacity ancestor: **NOT RUN**. Không thay thế audit
  accessibility chuyên sâu. Không có axe suite trong lượt này.
- Reflow thường: PASS 18 viewport samples. Text resize 200%: FAIL S05/360, các mẫu
  còn lại PASS. Native browser zoom 200%/400%, text-spacing overrides, screen reader,
  Safari/Firefox, thiết bị touch thực: **NOT RUN**. Reduced-motion được bật trong
  keyboard audit và C2 browser kiểm tra transition 0s; chưa kiểm mọi animation.
- Chuẩn tham chiếu: [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  yêu cầu 4.5:1 chữ thường / 3:1 chữ lớn, không làm tròn;
  [target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
  và [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

## Commands và output thực tế

Windows, Node 22.14; Chromium Playwright; local Compose backend/DB thật,
Vite `127.0.0.1:5173`, API `127.0.0.1:18080`. Biến demo/map đọc từ `.env` vào
process, không ghi giá trị credential vào evidence. Test tạo fixtures local;
mission/disaster audit kết thúc theo lifecycle, report giữ lại để traceability.

| Command (root trừ frontend ghi rõ) | Output / kết quả |
| --- | --- |
| `powershell.exe -NoProfile -File scripts/local.ps1 -Action start` | Exit 0; DB/backend healthy, npm ci 138 packages, 0 vulnerabilities, Vite chạy |
| `cd frontend; npm.cmd run typecheck` | Exit 0 — PASS |
| `cd frontend; npm.cmd test` | Exit 0 — **16 files, 81 tests passed**, 18.24s, không watch |
| `cd frontend; npm.cmd run build` | Exit 0 — built 832ms; cảnh báo chunk MapLibre >500kB, không che/suppress |
| `.\mvnw.cmd --no-transfer-progress clean verify` | Exit 0, **BUILD SUCCESS**, **113 tests (62 unit + 51 integration)**, 0 failure/error/skip, 1:34; 20:33:28 +07; Docker Testcontainers thật |
| `cd frontend; node node_modules/@playwright/test/cli.js test --reporter=list,json --output=../.tools/ui01-b-final` | Exit 1 — **17 passed, 2 failed**, 1.9m. 1 audit FAIL do các lỗi trên; 1 B3 assertion dùng thông báo cũ |
| `cd frontend; node node_modules/@playwright/test/cli.js test e2e/b3-citizen.spec.ts --grep "manual submit"` | Sau cập nhật assertion shared: exit 0, **1 passed**, 4.8s. Tổng 18 regression hiện hữu có evidence PASS qua full run + retest; không gọi full run ban đầu xanh |
| `git apply --check docs/qa/UI01-B/patches/owner2-B3.patch docs/qa/UI01-B/patches/owner3-UI01-C1.patch docs/qa/UI01-B/patches/owner4-D2.patch` | Exit 0 — patch áp dụng được trên nền hiện tại, chưa áp dụng |

Raw logs local: `.tools/ui01-b-{typecheck,unit,build,verify,browser,b3-retest}.log`,
JSON full run `.tools/ui01-b-final.json`; metrics và ảnh đã lưu vào docs để review.
Lần browser đầu chạy trong lúc npm ci chưa xong lỗi module Playwright; chạy lại sau
setup hoàn tất. Lần audit trước full suite cũng FAIL cùng các lỗi visual; không dùng
lỗi setup để thay kết quả audit. NO_COLOR/FORCE_COLOR warning không đổi kết quả tests.

## Bước tiếp theo để mở gate

Người 2/3/4 review và merge patch thuộc feature mình. Sau merge, chạy lại full
frontend checks, browser regression + UI01-B audit, chụp lại cùng trạng thái/breakpoints;
kiểm tra shared CSS không ghi đè feature khác. Retest sau merge hiện **NOT RUN**.
Hoàn thành các kiểm tra accessibility còn thiếu trước khi khẳng định WCAG AA.
UI01-B vẫn **FAIL/BLOCKED**, không tự đánh dấu hoàn tất khi chỉ unit/backend xanh.
