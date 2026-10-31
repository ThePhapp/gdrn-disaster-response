# Bàn giao UI01-A — GDRN Crisis Command / dùng chung UI và S01

Người phụ trách: Người 1. Nền `main` / `c850103` (P00/P01/B1/C1 đã hợp nhất).
**Cập nhật tích hợp:** đã hợp nhất qua PR #6 tại `78f164b`, phần triển khai
`7445913`. Phần dưới giữ bằng chứng lúc bàn giao UI01-A; các câu “chưa ghi commit/hợp nhất”
hoặc “sau review/merge” là bối cảnh lịch sử, không phải trở ngại hiện tại.
Trạng thái/dependency mới nhất ở [tiến độ](../phase1-progress.md).

**Trạng thái lúc bàn giao:** HOÀN TẤT trong cây làm việc, chưa commit/review/merge.
Phiên UI01-A không chạy UI01-C1/UI01-B.
Không thay API, miền nghiệp vụ, bản chuyển đổi lược đồ, phụ thuộc, xác thực máy khách hay convention đăng ký định tuyến.

Nguồn yêu cầu: [kế hoạch duy nhất](../PHASE1_PLAN.md),
[hệ thống thiết kế](../design/GDRN_UI_DESIGN_SYSTEM.md), [P00](../api/phase1-contract.md),
[P01](P01.md), [C1](C1.md). Design system là quy chuẩn UI, không phải kiến trúc mới.

## Nền tảng cơ sở và kiểm tra trước sửa

`git status`, `git diff`, lịch sử và mã nguồn thực tế xác nhận E01–E09/S01/S05 đã có.
Trước công việc đã có thay đổi chưa commit trong README, danh mục công việc, tiến độ và
`docs/design/` chưa được track. Đã giữ các thay đổi đó; công việc chỉ cập nhật thêm trạng thái
UI01-A trong tiến độ. Khi rà soát cần phân biệt phần tài liệu có sẵn với diff UI01-A.

| Thành phần hiện có | Tái sử dụng / vấn đề kiểm tra / xử lý |
| --- | --- |
| `App`, `RoleGuard`, `featureRoutes`, `landingPath` | Giữ phân quyền/route; thêm class shell theo vai trò, nav active có `aria-current`, bỏ qua liên kết tới main có thể nhận tiêu điểm |
| `LoginPage`, `login`, `session`, `api` | Giữ E01 → E02, JWT trong `sessionStorage` theo tab; Đăng nhập cũ chỉ có card đơn, nay chia nhận diện/form máy tính và xếp dọc điện thoại |
| `Field` | Giữ signature cũ; thêm hint và ghép `aria-describedby` bên ngoài + hint + lỗi, không đánh mất mô tả |
| `ErrorMessage`, `Loading`, `EmptyState` | Giữ tên export/children cho C1; thêm tokens, lỗi accent, đang tải indicator giảm chuyển động, rỗng container |
| Global stylesheet | Màu xanh cũ hardcode, chưa có thang spacing/typography; selector header/nav/footer quá rộng. Thay bằng tokens và selector shell `.app-*` |
| S05 list/detail/form/confirmation | Đã có chức năng thật và thích ứng kích thước màn hình riêng, nhưng còn nhiều mã màu cũ, nhãn chữ nhỏ, controls chưa đồng nhất. Không sửa; đề xuất cho owner ở dưới |

Phân cấp mới: brand → thông điệp nhận diện → tiêu đề biểu mẫu → nhãn → CTA → thông tin
phiên. Họa tiết nền tự tạo, không phải bản đồ/live data. Mobile rút gọn phần mô tả
hero, giữ biểu mẫu một cột; không thêm bảng thống kê, KPI hoặc nút chưa có chức năng.

## Tệp UI01-A

- `frontend/src/styles.css`: semantic palette/foreground-background, spacing, type,
  bán kính, thích ứng kích thước màn hình shell, form/state, Đăng nhập và reduced motion.
- `frontend/src/shared/topography.svg`: contour SVG tự tạo, dùng nội bộ gói,
  wrapper `aria-hidden`, không nhận pointer events; không CDN/font ngoài.
- `frontend/src/shared/components.tsx`: `PageHeader`, nâng cấp các primitive có bên sử dụng.
- `frontend/src/app/App.tsx`: dùng chung header/nav/footer, vai trò styling, bỏ qua tiêu điểm.
- `frontend/src/auth/LoginPage.tsx`: hero/form/account presentation; tiêu điểm trường sai,
  live trạng thái trong lúc xác thực. Kiểm tra tính hợp lệ limits/request/auth logic giữ nguyên.
- `frontend/src/auth/LoginPage.test.tsx`, `frontend/src/shared/components.test.tsx`:
  hint/error semantics, pending/network lỗi, trùng lặp submit, vai trò nav/logout.
- `frontend/e2e/ui01-login.spec.ts`: layout/keyboard/reflow + real người dân định tuyến bảo vệ.
- Bàn giao này và `docs/phase1-progress.md`.

Không thay tệp trong `frontend/src/features/disaster/**`, E2E C1, ứng dụng phía máy chủ,
`feature-routes.ts`, `session.ts`, `login.ts`, `api.ts`, package/lockfile.
S05 nhận typography/controls/shell chung qua cascade như trước; theme riêng S05 vẫn
còn màu xanh và được chuyển tiếp cho UI01-C1, không tuyên bố S05 đã redesign.

## Sử dụng dùng chung cho B3/C2/D2

Theme được import sẵn tại giao diện entry. Dùng `var(--gdrn-ink/surface/canvas/border/muted)`
cho chữ/nền; `--gdrn-action/on-action`, `--gdrn-error-text/error-surface`,
`--gdrn-link`, `--gdrn-input-border`, `--gdrn-focus` cho tương tác. Orange CTA đi với
navy text; không tự dùng white trên orange. Ocean/critical/success/warning là màu
gốc, cần kiểm tra cặp foreground/background khi owner tạo nhãn theo enum P00.

Spacing `--gdrn-space-1/2/3/4/6/8/12` = 4/8/12/16/24/32/48px ở root16px;
type `--gdrn-text-xs/sm/base/lg/xl/2xl` = 12/14/16/20/28/36px. System font không tải
CDN. Nội dung line-height1.6; bán kính control/card/panel =8/12/16px.
Shell max1200px; điện thoại dưới768px, Đăng nhập giảm padding dưới1024px. Dùng grid
`minmax(0,1fr)`, min-width0 và wrap ID/text dài; tránh chiều rộng cố định.

```tsx
import { PageHeader, Field, ErrorMessage, Loading, EmptyState } from '../../shared/components'

// Một h1 cho mỗi page; action chỉ truyền khi role và API cho phép.
<PageHeader eyebrow="BÁO CÁO" title="Gửi báo cáo" description="Thông tin sự cố." />
<Field id="latitude" label="Vĩ độ" type="number" hint="Từ -90 đến 90."
  value={latitude} onChange={onLatitudeChange} error={errors.latitude} />
<Loading>Đang tải báo cáo…</Loading>
<ErrorMessage>{errorMessage}</ErrorMessage>
<EmptyState>Chưa có báo cáo phù hợp với bộ lọc.</EmptyState>
```

Ví dụ là cách dùng thành phần, không phải Reporting khi chạy mới. Render các trạng thái
theo yêu cầu thật, không cùng lúc. `ErrorMessage` có vai trò alert, `Loading` có vai trò
trạng thái; không lồng thêm vùng live gây đọc hai lần. `Field` hỗ trợ cài trực tiếp đầu vào props,
`hint`, `error`, mô tả bên ngoài qua `aria-describedby`; select/textarea chưa có
wrapper chung. Không đổi tên export khiến C1 phải sửa ngay.

`StatusBadge`, `ConfirmDialog`, FilterBar/Pagination chưa đưa vào dùng chung vì S01
không có bên sử dụng; C1 đang sở hữu badge/confirmation thực. Bổ sung nhỏ với owner
khi có bên sử dụng, không tạo bộ library dự phòng. Status phải có chữ theo P00;
không dùng vai trò hoặc trạng thái kết nối giả làm severity.

Auth/route tích hợp giữ P01: tính năng export `routes` từ
`frontend/src/features/<feature>/routes.tsx`; không sửa global router. Shell chỉ
hiện các định tuyến vai trò được phép. Chưa có S02/S04 nên landing vẫn là card tài khoản
tại `/login`; Điều phối viên dùng liên kết Thảm họa trên nav. JWT trong `sessionStorage` theo tab,
reload cùng tab khôi phục; logout/401/expiry clear phiên + generation. Cache ngoài
thành phần phải đăng ký
`session.onClear`. 403 giữ phiên và hiện lỗi, không coi UI bảo vệ là security ứng dụng phía máy chủ.

## Kiểm chứng thực tế

Môi trường: Windows, Node22.14.0, Chromium Playwright có sẵn, Docker PostGIS.
Maven máy chủ dùng JDK23 (compiler release21); ứng dụng phía máy chủ Docker dùng ảnh môi trường Temurin21.
Chưa chạy Maven máy chủ bằng JDK21 trên máy này; không gọi JDK23 là JDK21.
Backend/API cục bộ `127.0.0.1:18080`, Vite `127.0.0.1:5173`; thông tin xác thực lấy từ `.env`,
không ghi vào test/report/screenshot. DB dùng named volume hiện có.

| Lệnh / kiểm tra | Đầu ra thực tế |
| --- | --- |
| `npm.cmd run typecheck` tại giao diện | `tsc --noEmit`, exit0 |
| `npm.cmd test` | 5 kiểm thử tệp, **17 passed**, non-watch, 57.29s |
| `npm.cmd run build` | Vite8.3.4, 37 modules, **built in 2.02s**, exit0 |
| `.\mvnw.cmd --no-transfer-progress clean verify` | Chạy trực tiếp **BUILD SUCCESS / exit0**, 37 unit/architecture +25 tích hợp = **62**, failures0/errors0/skipped0, 1:05 |
| `.\scripts\local.ps1 -Action start` | Backend/database sẵn sàng, npm ci115 packages, giao diện ready |
| `npm.cmd run test:login` với DEMO_* trong tiến trình env | **8 passed (14.5s)**, Chromium → API → PostGIS thật |
| `git diff --check` | exit0; chỉ cảnh báo LF→CRLF của Git |
| Diff phạm vi bảo vệ | Không đổi Disaster/client/session/route catalog/lockfile/backend |

Trình duyệt suite giữ 4 kiểm thử cũ: ba account đăng nhập sai/đúng, `/me`, reload/logout,
lưu trữ trống; C1 tạo/sửa/resolve và thích ứng kích thước màn hình. Thêm 4 kiểm thử UI01: 360/768/1280px,
bỏ qua liên kết, Tab/Enter, tiêu điểm-hiển thị, lỗi gắn trường, text enlargement200%, không
tràn ngang; Người dân không thấy nav Disaster, truy cập SPA định tuyến bị từ chối và đăng xuất
đưa về đăng nhập. C1 kiểm thử tạo **một thảm họa kiểm thử thật đã RESOLVED** trong DB cục bộ;
không phải seed/mẫu giả trong giao diện và không xóa trực tiếp dữ liệu nghiệp vụ.

Kiểm tra riêng bằng Chromium: giữ chậm yêu cầu E01 thật để quan sát đang tải, sau đó
cho API trả401 với thông tin xác thực cố ý sai; lỗi hiển thị, password được xóa. Không
giả lập phản hồi nghiệp vụ. Reduced motion cho nút transition0s. Client kiểm thử có
401 clear/callback, 403 giữ phiên, late-response/expiry; ứng dụng phía máy chủ kiểm thử kiểm tra JWT.
Không tuyên bố trình duyệt đã kiểm tra đủ lỗi của các màn hình chưa triển khai.

Đã mở và rà ảnh S01 idle360/768/1280, kiểm tra dữ liệu, loading/error360, CSS zoom200%
ở1280 và S05 điện thoại. Artifacts cục bộ (được Git bỏ qua, tái tạo khi chạy kiểm thử):
`frontend/test-results/ui01-login-{360,768,1280}.png`,
`ui01-login-*-validation.png`, `c1-disaster-{desktop,mobile}.png`;
`.tools/ui01-{loading-360,error-360,zoom200}.png`, `.tools/ui01-verify.log`.
Script kiểm tra bổ sung cục bộ: `.tools/ui01-visual-audit.cjs`.

Tương phản từ tokens khi chạy, tính relative luminance sRGB:

| Cặp | Ratio |
| --- | --- |
| Ink / white | 15.72:1 |
| Muted / canvas, white | 5.62:1 /6.05:1 |
| Liên kết hoặc tiêu điểm / white | 6.59:1 |
| Ink / orange CTA | 5.64:1 |
| Error text / lỗi surface | 6.41:1 |
| Đầu vào border / white | 3.86:1 |
| Muted-on-dark / ink | 10.39:1 |
| Orange tiêu điểm / ink | 5.64:1 |

Các cặp trên đạt ngưỡng chữ4.5, control3; đây không phải chứng nhận WCAG cho toàn app.
Hero có motif nhạt12%; ảnh đã được rà không che chữ. **CHƯA CHẠY:** trình đọc màn hình thật,
cài trực tiếp toolbar zoom200% và Firefox/Safari. Đã chạy text enlargement200% và CSS
zoom200% máy tính, không đánh đồng với cài trực tiếp zoom. CSS zoom200% tại360px tương
đương180 CSSpx gây tràn dưới min-width320px; không phải vùng nhìn mục tiêu thông thường.
Danh sách kiểm tra rà soát thủ công còn lại: Ctrl+Plus tới200% trên máy tính, Tab/Shift+Tab toàn
form/nav, đọc label/error/loading với NVDA, xác nhận không mất CTA/nội dung.

Lần start đầu khi redirect `*> log` gặp PowerShell NativeCommandError vì Docker in
tiến độ trên stderr; đã chạy lại tập lệnh trực tiếp thành công. Lần xác minh redirect
cũng trả exit1 dù nhật ký Maven BUILD SUCCESS; đã chạy lại toàn bộ clean xác minh trực tiếp,
xác nhận exit0 và XML báo cáo đủ62 kiểm thử, không bỏ qua. Log `.tools/ui01-verify.log`
lưu lần đầu; kết quả trực tiếp cuối cùng ở kết thúc và `target/*-reports/`.
Không sửa tập lệnh
ngoài phạm vi. Không còn trở ngại build/API/browser của UI01-A.

## Đề xuất patch/checklist S05 cho Người 3 (chưa áp dụng)

- Thay phần đầu trang bằng `PageHeader` với CTA tạo hiện có; giữ route/E03–E06.
- Chuyển hex trong `disaster.css` sang tokens: surface/border/muted/input-border;
  giữ selector `.disaster-*` riêng, tránh override toàn app.
- Ánh xạ nhãn ACTIVE/RESOLVED và LOW/MODERATE/HIGH/CRITICAL từ enum thật. Giữ nhãn
  chữ; nâng chữ nhỏ từ .72rem, kiểm tra contrast của từng nền/foreground trước dùng.
- Rà select/textarea nhãn, help/error descriptions, selected row bằng semantics
  ngoài màu; kiểm tra bàn phím chọn bản ghi và filter/pagination44px khi khả thi.
- Confirmation kết thúc đang thuộc C1: kiểm tra nhãn, tiêu điểm vào/ra, Escape và thao tác
  không thể đảo ngược; chỉ tách dùng chung dialog khi thống nhất consumer/API thành phần.
- Kiểm tra danh sách-chi tiết 360/768/1280, ID/tên dài, empty/loading/request lỗi,
  401/403/404/409; không đổi payload/version/resolve semantics để khớp hình thức.
- Rerun C1 unit/E2E thật sau patch; dùng chung shell đã đổi màu nhưng S05-specific theme
  chưa đồng nhất, đây là phạm vi UI01-C1, không phải lỗi business mới.

Sau review/merge UI01-A, có thể mở UI01-C1 và phần B3 dùng E07–E09. C2/D2 vẫn phải
đợi B2/D1 tương ứng theo danh mục. UI01-B chưa được mở khóa; không chạy công việc tiếp theo.

## Bổ sung UI vị trí sau C2/D1

**Trạng thái:** phần triển khai và self-kiểm tra ĐẠT trong cây làm việc trên nền main
`242583c`; số đo cơ sở UI01-A ở trên vẫn HOÀN TẤT tại `78f164b`. Phần bổ sung chưa có rà soát
Người 3/commit/merge bằng chứng nên giữ **IN PROGRESS**, không ghi đè bằng chứng số đo cơ sở.
Không triển khai phần UI01-C1/C2 bổ sung, B3 bản đồ hoặc D2 bản đồ trong lượt này.

### API dùng chung và phụ thuộc

Public export ở `frontend/src/shared/location/index.ts`:

```ts
type LocationValue = Readonly<{ latitude: number; longitude: number }>

type LocationMapProps = {
  value?: LocationValue
  onChange?: (value: LocationValue) => void
  disabled?: boolean
  readOnly?: boolean
  radiusMeters?: number
  label?: string
  className?: string
}
```

`LocationMap` là controlled: parent giữ tọa độ hoặc trạng thái chưa chọn; thành phần
không tự biến tâm mặc định thành lựa chọn và không làm tròn giá trị callback. `readOnly`
khóa chọn điểm nhưng vẫn cho xem/pan; `disabled` khóa tương tác; `radiusMeters > 0`
vẽ vòng minh họa, không quyết định kết quả PostGIS. Adapter tắt wheel zoom, giữ bàn phím
pan/Tab, dùng `ResizeObserver` + `resize`, và gỡ event/source/layer/marker/timer/observer/map khi
unmount hoặc StrictMode remount.

Đã pin `maplibre-gl@6.11.2` trong package/lockfile; package yêu cầu Node >=16.14/npm >=8.1
và tương thích Node 22.14 hiện tại. Direct vòng đời bộ chuyển đổi không thêm React wrapper/peer
phụ thuộc và typecheck với React 19.3, TypeScript 7, Vite 8. Theo hướng dẫn MapLibre 6,
worker được import bằng `?worker&url` và đăng ký qua `setWorkerUrl`; môi trường triển khai biên dịch tách
`MapLibreMap`, CSS và worker thành lazy chunks. Không dùng CDN tập lệnh hay marker asset ngoài.

### Tiles/config và bên sử dụng thật

- `VITE_MAPTILER_KEY`, `VITE_MAP_STYLE_URL`, `VITE_MAP_ATTRIBUTION` là cấu hình công khai
  build-time. Mọi giá trị `VITE_*` đều có thể đọc từ trình duyệt gói; key MapTiler phải giới
  hạn theo allowed HTTP origin. Giá trị thật nằm trong `.env`/`frontend/.env.local` bị Git ignore,
  không nằm trong handoff/commit. `.env.example` và `scripts/local.ps1` hỗ trợ ba biến này.
- Có key thì bộ chuyển đổi dùng MapTiler Streets v4 và ghi nguồn bản đồ MapTiler + OpenStreetMap. Có thể
  thay bằng style URL HTTPS kèm ghi nguồn bản đồ; cấu hình thiếu/sai hiển thị phương án dự phòng. Trình duyệt tải
  style/tiles trực tiếp, không qua `/api`, không kèm JWT hay dữ liệu report/account; không có
  prefetch/offline bộ nhớ đệm riêng và để trình duyệt tuân HTTP cache/provider policy.
- Provider lỗi hoặc timeout 12 giây hiển thị trạng thái và nút thử lại. WebGL canvas lỗi không
  phủ biểu mẫu; hai đầu vào số và API nghiệp vụ tiếp tục hoạt động.
- Consumer phối hợp tối thiểu ở `DisasterForm`: hai đầu vào vẫn là mã nguồn of truth; cặp
  hợp lệ điều khiển marker, click bản đồ ghi lại chính xác hai đầu vào. Blank giữ unselected,
  `(0,0)` hợp lệ. Create/edit payload và `expectedVersion` cũ không đổi. Preview chi tiết
  chỉ đọc và hoàn thiện picker S05 thuộc lượt Người 3 UI01-C1/C2 bổ sung sau hợp nhất.

Không đổi backend/DTO/auth/theme/route. Các tệp môi trường triển khai chính: `shared/location/*`,
`features/disaster/DisasterForm.tsx`, package/lockfile, `.env.example` và cục bộ cấu hình.

### Kiểm chứng phần bổ sung

| Kiểm tra | Kết quả |
| --- | --- |
| `npm.cmd run typecheck` | ĐẠT |
| `npm.cmd test` | ĐẠT — 14 tệp, 63 kiểm thử; controlled blank/0/read-only/radius, cấu hình, ô bản đồ callback, StrictMode/unmount và payload biểu mẫu |
| `npm.cmd run build` | ĐẠT — 74 modules; lazy `MapLibreMap` JS 1,038.64 kB (gzip 281.19), CSS 82.96 kB (gzip 10.72), worker 509.44 kB; main JS 340.00 kB (gzip 102.06) |
| Playwright `e2e/disaster.spec.ts` | ĐẠT — 3/3 với API/PostGIS thật và bên cung cấp đã cấu hình; kiểm tra nhanh trực tuyến, ghi nguồn bản đồ, bàn phím thoát bản đồ, click/input/blank/0, bên cung cấp abort/retry, exact payload và kết thúc vòng đời; 360/1280 không tràn. Hai kiểm thử bản đồ tự bỏ qua khi môi trường không có cấu hình bên cung cấp; luồng S05 cũ không phụ thuộc uptime ngoài |
| Map trực tuyến kiểm tra nhanh | ĐẠT — MapTiler style/tiles hiển thị thật bằng MapLibre, ghi nguồn bản đồ nhìn thấy; không có phương án dự phòng lỗi |
| `.\mvnw.cmd --no-transfer-progress clean verify` | ĐẠT — BUILD SUCCESS, 113 kiểm thử (62 unit/architecture + 51 tích hợp), 0 failure/error/skip; Docker/PostGIS thật, 1:58 |

Đã xem ảnh chụp màn hình cục bộ được Git bỏ qua `ui01-a-maplibre-online.png`, `ui01-a-location-tile-failure.png` và bản 360px:
thủ công trường, ghi nguồn bản đồ, trạng thái lỗi/retry và CTA vẫn hiển thị/khả dụng. Giới hạn
còn lại: chưa rà soát bằng screen reader/Firefox/Safari/native zoom 200%; MapLibre lazy chunk
lớn nhưng không nằm trong main chunk; rà soát Người 3 và hợp nhất còn bắt buộc
trước khi UI01-A bổ sung chuyển HOÀN TẤT hoặc các owner B3/UI01-C1/C2 dùng thành phần.

### Sửa sau rà soát

- Error Boundary chỉ bao renderer; lỗi lazy chunk/render giữ biểu mẫu và draft. Retry tạo lại
  lazy thành phần để không giữ rejected promise của React; lỗi transport còn tồn tại vẫn giữ phương án dự phòng.
- Marker cập nhật/xóa ngay khi parent thay đổi, không phụ thuộc `isStyleLoaded()` của ô bản đồ.
  Radius cập nhật khi mã nguồn tồn tại; lần load đầu áp dụng giá trị parent mới nhất.
- Lỗi provider/source/network sau load vẫn hiện thông báo và thử lại; bỏ qua rendering warning
  không liên quan bên cung cấp sau startup. Disabled không tạo NavigationControl.
- `scripts/local.ps1 -Action setup` bổ sung ba biến bản đồ cho `.env` cũ, giữ giá trị hiện có,
  lấy cấu hình từ `frontend/.env.local` nếu thiếu. Root `.env` được tập lệnh start truyền cho Vite;
  key đã cấu hình, style/attribution trống dùng mặc định MapTiler. Không ghi giá trị key vào Git.
- Retest: typecheck ĐẠT; 15 files/67 kiểm thử giao diện ĐẠT; biên dịch ĐẠT (lazy JS 1,038.70 kB,
  gzip 281.23); trình duyệt 4/4 ĐẠT với API/PostGIS thật, gồm abort lazy chunk và lỗi bên cung cấp
  sau trực tuyến load; Maven clean xác minh ĐẠT 113 kiểm thử, 0 failure/error/skip, 1:25; diff kiểm tra ĐẠT.
- Review/merge Người 3 vẫn còn là gate; không thay trạng thái số đo cơ sở hoặc mở B3/D2.
