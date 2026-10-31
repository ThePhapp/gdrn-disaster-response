# UI01-B — kiểm tra 6 màn hình

**Kết quả hiện tại: HOÀN TẤT trên nhánh `feat/UI01-B-audit`, chờ review/merge.**
Lượt kiểm thử lại đã xử lý các trở ngại B-01…B-06 và mở lại gate UI01-B cho X1 sau khi
hợp nhất. Đây là kết quả của kiểm tra và hồi quy đã chạy, không phải chứng nhận đầy đủ
WCAG 2.2 AA; các mục NOT RUN/skipped vẫn được ghi rõ bên dưới.

## Lượt tiếp tục sau kiểm tra

- Commit kiểm tra nền: `5a9e93a`; các patch tính năng B3/UI01-C1/D2 đã có trong mã nguồn
  của commit này. Commit sửa thêm S04: `b2f1e46`.
- B-01…B-06 đều đã được kiểm tra lại bằng kiểm tra trình duyệt ở 360/768/1280px và gốc
  font 200%; không còn contrast/reflow failure trong sáu màn hình.
- S04 có thêm quy tắc phạm vi `.reporting-operations` cho nhãn báo cáo, xử lý xung đột
  `.report-status` với Người dân CSS và cho phép nhãn xuống dòng ở text 200%.
- 18 ảnh kiểm thử lại đã cập nhật tại [docs/qa/UI01-B](../qa/UI01-B/); ảnh là bằng chứng của
  trạng thái trình duyệt thật, không thay thế kiểm tra screen reader/browser khác.

## Nền và phạm vi

- Nền `main` tại `1b47b6f` (PR #20 D2), cây làm việc ban đầu sạch.
- Đã kiểm tra code/routes thật và ancestry: S01–S06, UI01-C1, B3/C2/D2 đã hợp nhất;
  vị trí dùng chung PR #16 `df4777f`, C2/S05 PR #17 `d72ecb1`, B3 PR #18
  `a7471f0`, D2 PR #20 `1b47b6f`. Điều kiện kiểm tra bắt đầu UI01-B được đáp ứng.
- Đã đọc CONTRIBUTING, context/architecture, P00/contracts, Quy tắc chung/catalog,
  hệ thống thiết kế, handoffs UI01-A/UI01-C1/B3/C2/D2; bàn giao cũ là bằng chứng lịch sử.
- Chỉ thay môi trường triển khai mã nguồn dùng chung `LocationMap.tsx`: lỗi renderer/tiles ở xem trước
  chỉ đọc nói tọa độ vẫn có trong chi tiết, không hứa nhập tọa độ trên màn hình chỉ đọc.
  Thêm thành phần hồi quy; cập nhật duy nhất assertion thông báo dùng chung ở B3 E2E.
- Thêm `frontend/e2e/ui01-b-audit.spec.ts`: API/DB thật, 18 ảnh, đo contrast/reflow,
  tăng gốc font 200%, bỏ qua liên kết và lấy mẫu 12 bước Tab mỗi màn hình.
  Kiểm thử cố ý giữ assertion lỗi, không bỏ qua lỗi để lấy xanh.
- Không thay ứng dụng phía máy chủ, tính năng phần triển khai, định tuyến, vai trò, API, workflow hay lược đồ.
  Không push/merge/deploy, đo hiệu năng, Pha 2. Môi trường chạy chỉ chạy cục bộ.

## Màn hình và bằng chứng thị giác

Ảnh ở [thư mục bằng chứng](../qa/UI01-B/), tên `S01-360.png` đến `S06-1280.png`,
đủ 360/768/1280. [Metrics](../qa/UI01-B/metrics.json) ghi màu, contrast, font size,
line height, padding, tiêu điểm và tràn nội dung. Đây là dữ liệu đo trên trạng thái được chụp,
không phải mọi trạng thái UI. Ảnh không thay thế kiểm tra nhanh trực tuyến tải ô bản đồ riêng.

| Màn hình / định tuyến thật | Bố cục, typography, spacing, thích ứng kích thước màn hình | Kết quả kiểm tra |
| --- | --- | --- |
| S01 `/login` | Hero/form máy tính, một cột điện thoại; chữ/CTA rõ, 1 h1, không tràn ở 3 widths và text 200% | ĐẠT trong mẫu đã đo |
| S02 `/reports/new` | Người dân biểu mẫu, label/error liên kết, nhập tọa độ và bản đồ; không tràn ở 3 widths/text 200% | ĐẠT trong mẫu đã đo |
| S03 `/my-reports` | Người dân cards/detail, trạng thái và tiến độ có text; không tràn ở 3 widths/text 200% | ĐẠT trong mẫu đã đo |
| S04 `/operations/reports` | Điều phối viên workbench, lọc tách báo cáo xem trước, list/detail; không tràn ở 3 widths/text 200% | ĐẠT trong mẫu đã đo |
| S05 `/operations/disasters` | Điều phối viên list/detail, tạo/sửa/resolve; 3 widths ở cỡ chữ thường không tràn | ĐẠT trong mẫu đã đo |
| S06 `/operations/rescue` | Điều phối viên list/detail/assignment, xem trước báo cáo chỉ đọc; không tràn ở 3 widths/text 200% | ĐẠT trong mẫu đã đo |

Citizen/Authority dùng shell khác nhau đúng design, hệ font/token chung và phân cấp
heading có mặt. S04 danh sách dài làm trang dài; không tự đổi pagination/workflow.
Màu không phải tín hiệu trạng thái duy nhất. Typography/spacing chưa thể ký nghiệm thu
toàn bộ vì các lỗi dưới đây.

## Blocker kiểm tra và cách xử lý

| ID / mức | Bằng chứng và nguyên nhân | Người phụ trách / patch |
| --- | --- | --- |
| B-01 / cao | S03 `.report-list__item` nền trắng nhưng kế thừa chữ trắng từ nút; type/description contrast **1:1** trên cả 3 widths | Người 2 B3: [patch](../qa/UI01-B/patches/owner2-B3.patch) đã đặt ink cho card; kiểm thử lại ĐẠT |
| B-02 / vừa | S03/S06 IN_PROGRESS **4.18264651:1**, dưới 4.5. Selector nhiệm vụ-trạng thái toàn cục của Rescue ghi đè Người dân | Người 4 D2: [patch](../qa/UI01-B/patches/owner4-D2.patch) đã phạm vi `.rescue-badge`, dùng liên kết text; kiểm thử lại ĐẠT |
| B-03 / vừa | S06 `.mission-detail__type` cam trên trắng **2.78634397:1**, 16px bold | Patch D2 đã dùng liên kết text; kiểm thử lại ĐẠT |
| B-04 / vừa | S06 `.rescue-panel` padding đo **0px** ở 360/768; dùng token không tồn tại `--gdrn-space-5` | Patch D2 đã dùng space-4 đang có; kiểm thử lại ĐẠT |
| B-05 / vừa | S05 MODERATE **4.49890555:1**, không được làm tròn lên 4.5 | Người 3 UI01-C1: [patch](../qa/UI01-B/patches/owner3-UI01-C1.patch) đã đổi foreground sang ink; kiểm thử lại ĐẠT |
| B-06 / vừa | S05 tại 360, gốc font 200%: nhãn vượt phải tới 438px, phân trang tới 610px | Patch UI01-C1 đã cho badge/nav wrap; kiểm thử lại ĐẠT ở ba điểm chuyển bố cục |

Các thay đổi owner đã có trong mã nguồn của commit kiểm tra nền; riêng S04 có thêm quy tắc phạm vi
`.reporting-operations` trong `b2f1e46`. Các tệp patch được giữ lại để truy nguyên kiểm tra,
không áp dụng lại vào cây làm việc. Trình duyệt kiểm thử lại sau các thay đổi đã ĐẠT trong phạm vi
được ghi ở ma trận bên dưới.

## Ma trận hồi quy theo danh mục

ĐẠT dưới đây phân biệt browser/API thật với unit/component giả lập. Không chuyển
ĐẠT đơn vị thành ĐẠT trình duyệt. Suite hiện hữu nằm trong `frontend/e2e/` và các
`*.test.ts(x)` tương ứng trong `frontend/src/`.

| Acceptance | Kết quả / bằng chứng chạy lượt này | Phần còn lại |
| --- | --- | --- |
| Auth/S01: hai vai trò, landing/nav, reload/logout, cách ly phiên | ĐẠT trình duyệt `login.spec.ts`, `ui01-login.spec.ts` (3 tài khoản, 3 widths, keyboard/route bảo vệ) | Expiry/late 401 ĐẠT đơn vị `shared/api.test.ts`; chờ hết JWT thật trong trình duyệt CHƯA CHẠY |
| S05 E03–E06 list/detail/create/edit/resolve, confirmation | ĐẠT trình duyệt `disaster.spec.ts`; tiêu điểm trap/Escape/restore ĐẠT thành phần `ResolveDisasterDialog.test.tsx` | Version 409/filter ĐẠT thành phần `DisasterPage.test.tsx`; 409 thật và chuyển trang S05 trình duyệt CHƯA CHẠY |
| S04 E08–E10 status/radius/reset, chọn thảm họa ngoài trang 1, Unicode, double-submit | ĐẠT trình duyệt filter/verify/reject/dialog; ĐẠT thành phần hoàn tất geography, trang 2 selector, Unicode mã nguồn points, pending khóa | Page 2 selector và double-submit/race phản hồi cũ chỉ có thành phần, trình duyệt CHƯA CHẠY |
| S04 403/404/409, refetch, không false success/retry | ĐẠT trình duyệt 404 do rút báo cáo, 409 cạnh tranh + refetch; người dân ghi 403 API thật và định tuyến bảo vệ trình duyệt | 403 khóa quyết định khi đang ở khung ĐẠT thành phần, trình duyệt CHƯA CHẠY; late phản hồi ĐẠT thành phần |
| B3 E07/E11/E14, tọa độ, quyền sở hữu, PENDING rút báo cáo, chưa nhiệm vụ | ĐẠT trình duyệt tạo/rút, isolation, tiến độ và ô bản đồ-failure submit/detail; ĐẠT thành phần rỗng nhiệm vụ, reload E09→E14, 409 withdrawal | Withdrawal 409 trình duyệt CHƯA CHẠY; bản đồ blank/zero/pending khóa ĐẠT thành phần |
| D2 E12–E15 report/team phân trang, vòng đời, xung đột | ĐẠT trình duyệt TEAM_BUSY 2 phiên và REPORT_ALREADY_ASSIGNED, confirm start/complete; ĐẠT thành phần trang 2 report/team và lỗi thời phản hồi bảo vệ | Page 2 thật trình duyệt CHƯA CHẠY; E09 403/404 deep liên kết ĐẠT thành phần |
| C2 xác minh → S04 liên kết → D2 assign → hoàn tất → B3 tiến độ | ĐẠT trình duyệt `rescue.spec.ts`; E09 xem trước, định tuyến reportId thật, người dùng chọn đội; nhiệm vụ tiếp tục sau thảm họa RESOLVED | Disaster/report fixture và bước RESOLVED qua API thật (API-only), không tuyên bố mọi setup qua UI |
| Map click/input, blank/0/range invalid, bán kính mét, draft/applied, chỉ đọc | ĐẠT thành phần LocationMap/MapLibreMap + S02/S04/S05 biểu mẫu; ĐẠT trình duyệt click/manual zero, C2 bán kính submit, D2 xem trước | Đầy đủ địa lý biên được kiểm tra dữ liệu đơn vị; trình duyệt mọi giá trị biên CHƯA CHẠY |
| Map online/attribution, ô bản đồ lỗi/fallback, thử lại, vòng đời | ĐẠT trình duyệt S05 trực tuyến canvas/style/attribution, S06 xem trước trực tuyến; chặn ô bản đồ transport ở S02/S03/S04/S05/S06 vẫn dùng API thật; lazy chunk fail S05 ĐẠT | Retry renderer, StrictMode/unmount dọn dẹp ĐẠT thành phần; custom bên cung cấp riêng CHƯA CHẠY |

## Trạng thái UI, bàn phím và WCAG

- Loading/pending: ĐẠT thành phần S01, S02 submit/map khóa, S04 decision khóa,
  D2 xem trước khi đổi báo cáo; skeleton/status có trong mã nguồn. Không cố kéo chậm từng
  điểm cuối API thật để chụp đang tải tất cả màn hình: **CHƯA CHẠY**.
- Empty/error/retry: ĐẠT thành phần B3 list/mission, S05 danh sách, S04 danh sách và lỗi thời
  chi tiết, D2 xem trước lỗi. Ma trận mọi màn hình × mọi mã 401/403/404/409 trên trình duyệt:
  **CHƯA CHẠY**; phạm vi đã chạy xem bảng trên. Không có kỳ vọng mọi mã áp dụng mọi định tuyến.
- Confirmation: trình duyệt đã xác nhận rút báo cáo, verify/reject, kết thúc, hoàn tất;
  thành phần kiểm tra Escape/trap/restore B3/S05, trình duyệt C2 trap/restore và D2 tiêu điểm.
- Skip liên kết → main ĐẠT trên 6 màn hình. Mẫu Tab và outline ghi trong số đo;
  bản đồ zoom không có outline nhưng có tiêu điểm box-shadow xanh, 29×44px, trong vùng nhìn.
  Không gắn KHÔNG ĐẠT chỉ vì outline none; 29px đạt ngưỡng kích thước 24px AA, còn mục tiêu
  thiết kế 44px chiều ngang chưa đạt. Đầy đủ duyệt mọi control/mọi dialog chỉ bằng bàn
  phím, kiểm tra tương phản mọi tiêu điểm ring, trình đọc màn hình NVDA/VoiceOver: **CHƯA CHẠY**.
- Text contrast đo bằng computed color/background composite ở text node hiển thị;
  bỏ logo, disabled, bản đồ imagery. Không đo pseudo-element/placeholder, mọi trạng thái
  di chuột, forced-colors, overlay hoặc opacity ancestor: **CHƯA CHẠY**. Không thay thế kiểm tra
  accessibility chuyên sâu. Không có axe suite trong lượt này.
- Reflow thường: ĐẠT 18 vùng nhìn samples. Text resize 200%: ĐẠT trong sáu màn hình
  ở 360/768/1280. Native trình duyệt zoom 200%/400%, text-spacing overrides, trình đọc màn hình,
  Safari/Firefox, thiết bị touch thực: **CHƯA CHẠY**. Reduced-motion được bật trong
  bàn phím kiểm tra và C2 trình duyệt kiểm tra chuyển trạng thái 0s; chưa kiểm mọi animation.
- Chuẩn tham chiếu: [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  yêu cầu 4.5:1 chữ thường / 3:1 chữ lớn, không làm tròn;
  [target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
  và [tiêu điểm not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

## Lượt kiểm thử lại và đầu ra thực tế

| Command | Đầu ra / kết quả |
| --- | --- |
| `cd frontend; npm.cmd run typecheck` | ĐẠT |
| `cd frontend; npm.cmd test -- --run` | ĐẠT, 16 tệp / 81 kiểm thử |
| `cd frontend; npm.cmd run build` | ĐẠT; chỉ còn cảnh báo chunk MapLibre lớn |
| `.\mvnw.cmd --no-transfer-progress clean verify` | ĐẠT, BUILD SUCCESS; 113 kiểm thử (62 đơn vị + 51 tích hợp), 0 failure/error/skip |
| `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1 up -WaitTimeout 180` | ĐẠT; database/backend/frontend sẵn sàng; sức khỏe, OpenAPI, Swagger, SPA và API JSON 401 kiểm tra nhanh ĐẠT |
| `npm.cmd run test:login -- --reporter=list` với `E2E_API_URL=http://127.0.0.1:8080`, `E2E_BASE_URL=http://127.0.0.1:5174` | ĐẠT, 14 passed, 5 skipped; các kiểm thử bản đồ-bên cung cấp bị bỏ qua vì cấu hình bên cung cấp rỗng |
| `npm.cmd run test:login -- e2e/ui01-b-audit.spec.ts --reporter=list` | ĐẠT, 1/1; sáu màn hình, 360/768/1280, text 200%, keyboard/contrast/reflow |
| `npx.cmd --yes --package @playwright/cli playwright-cli open http://127.0.0.1:5174/operations/reports` | ĐẠT; deep định tuyến chuyển về `/login` của GDRN |

Các lệnh trên chạy với gốc `.env` hiện tại; không ghi thông tin xác thực vào bằng chứng.

## Lệnh và đầu ra thực tế của lượt kiểm tra ban đầu

Windows, Node 22.14; Chromium Playwright; cục bộ Compose backend/DB thật,
Vite `127.0.0.1:5173`, API `127.0.0.1:18080`. Biến demo/map đọc từ `.env` vào
tiến trình, không ghi giá trị thông tin xác thực vào bằng chứng. Kiểm thử tạo fixtures cục bộ;
mission/disaster kiểm tra kết thúc theo vòng đời, báo cáo giữ lại để traceability.

| Command (gốc trừ giao diện ghi rõ) | Đầu ra / kết quả |
| --- | --- |
| `powershell.exe -NoProfile -File scripts/local.ps1 -Action start` | Exit 0; DB/backend sẵn sàng, npm ci 138 packages, 0 vulnerabilities, Vite chạy |
| `cd frontend; npm.cmd run typecheck` | Exit 0 — ĐẠT |
| `cd frontend; npm.cmd test` | Exit 0**16 tệp, 81 kiểm thử passed**, 18.24s, không watch |
| `cd frontend; npm.cmd run build` | Exit 0 — built 832ms; cảnh báo chunk MapLibre >500kB, không che/suppress |
| `.\mvnw.cmd --no-transfer-progress clean verify` | Exit 0, **BUILD SUCCESS**, **113 kiểm thử (62 đơn vị + 51 tích hợp)**, 0 failure/error/skip, 1:34; 20:33:28 +07; Docker Testcontainers thật |
| `cd frontend; node node_modules/@playwright/test/cli.js test --reporter=list,json --output=../.tools/ui01-b-final` | Exit 1**17 passed, 2 thất bại**, 1.9m. 1 kiểm tra KHÔNG ĐẠT do các lỗi trên; 1 B3 assertion dùng thông báo cũ |
| `cd frontend; node node_modules/@playwright/test/cli.js test e2e/b3-citizen.spec.ts --grep "manual submit"` | Sau cập nhật assertion dùng chung: exit 0, **1 passed**, 4.8s. Tổng 18 hồi quy hiện hữu có bằng chứng ĐẠT qua đầy đủ lượt chạy + kiểm thử lại; không gọi đầy đủ lượt chạy ban đầu xanh |
| `git apply --check docs/qa/UI01-B/patches/owner2-B3.patch docs/qa/UI01-B/patches/owner3-UI01-C1.patch docs/qa/UI01-B/patches/owner4-D2.patch` | Exit 0 — patch áp dụng được trên nền hiện tại, chưa áp dụng |

Raw nhật ký cục bộ: `.tools/ui01-b-{typecheck,unit,build,verify,browser,b3-retest}.log`,
JSON đầy đủ lượt chạy `.tools/ui01-b-final.json`; số đo và ảnh đã lưu vào docs để rà soát.
Lần trình duyệt đầu chạy trong lúc npm ci chưa xong lỗi mô-đun Playwright; chạy lại sau
setup hoàn tất. Lần kiểm tra trước đầy đủ suite cũng KHÔNG ĐẠT cùng các lỗi visual; không dùng
lỗi setup để thay kết quả kiểm tra. NO_COLOR/FORCE_COLOR warning không đổi kết quả kiểm thử.

## Bước tiếp theo sau kiểm thử lại

UI01-B đã đạt gate kiểm tra trên nhánh `feat/UI01-B-audit` và chờ review/merge. Sau khi
hợp nhất, X1 có thể mở theo phụ thuộc; nên giữ lại 18 ảnh và chạy lại kiểm tra nhanh theo môi
trường CI nếu cấu hình cổng hoặc bên cung cấp thay đổi.

Các mục còn **CHƯA CHẠY** gồm đầy đủ WCAG trình đọc màn hình, cài trực tiếp zoom 200%/400%,
Safari/Firefox/touch, mọi trạng thái 401/403/404/409 trên mọi màn hình và trình duyệt
matrix đầy đủ. Năm kiểm thử trình duyệt bị bỏ qua do bản đồ-bên cung cấp cấu hình rỗng. Vì vậy bàn giao
này không tuyên bố chứng nhận WCAG 2.2 AA đầy đủ; X2/A3 vẫn giữ gate riêng.
