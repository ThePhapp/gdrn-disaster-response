# Kế hoạch Pha 1 MVP — 16 công việc lõi + 3 checkpoint UI, 4 người / 3 tuần

Đây là **kế hoạch triển khai duy nhất** của GDRN: phạm vi, phân công, phụ thuộc,
thứ tự công việc và tiêu chí hoàn thành đều tra tại tệp này. Không dùng danh mục công việc nền
móng hay lịch triển khai riêng để giao việc hoặc tự chia lại công việc.

Contracts P00 (HTTP/OpenAPI, mô-đun các hợp đồng, bản chuyển đổi lược đồ ledger) quy định chi tiết
kỹ thuật; ADR ghi quyết định; bàn giao và phase1-tiến độ ghi bằng chứng/trạng thái.
Các tài liệu đó không phải kế hoạch thay thế. Context dài hạn chỉ là danh sách để sau khi
khác phạm vi MVP. Khi có mâu thuẫn, giữ scope/task tại đây và đồng bộ hợp đồng có rà soát,
không tự đổi API hoặc bản chuyển đổi lược đồ đã áp dụng để khớp tài liệu cũ.

Tài liệu và commit từng phần chưa đủ để xác nhận nhiệm vụ đã hoàn tất. Đọc mã nguồn,
kiểm thử và bàn giao hiện tại trước khi thực thi; không chạy lại phần đã hoàn tất.
Catalog có 16 công việc lõi và 3 checkpoint UI. Mỗi nhiệm vụ có owner và phụ thuộc riêng.
Tiêu chí UI01 nằm trong phụ lục
`docs/design/GDRN_UI_CHECKPOINTS.md` nhưng chỉ được chạy theo phụ thuộc và trạng thái
danh mục tại tệp này; phụ lục không phải kế hoạch thay thế.

**Bổ sung — UI vị trí:** C2 đã hợp nhất PR #9 (`120dec8`), D1 đã hợp nhất
PR #11 (`e380d68`) và sửa rà soát tại `888996a`. Kế hoạch/nhiệm vụ mở rộng bản đồ nằm
trong mục [UI vị trí sau C2/D1](#ui-vi-tri-sau-c2-d1) của chính danh mục này.
Đây là phạm vi đã được yêu cầu lập kế hoạch, **chưa triển khai**, không tạo công việc ID
mới hoặc chạy lại các slice đã hoàn tất. Ngoại lệ bản đồ dưới đây thay các lệnh
cấm bản đồ tổng quát trong nhiệm vụ cũ, chỉ cho chọn/xem điểm và minh họa bán kính.

Trạng thái và commit đã tích hợp được cập nhật tập trung tại
[phase1-progress.md](phase1-progress.md). Không dùng lịch D1–D15 hoặc một bàn giao cũ
để suy ra công việc đang mở; kiểm tra bảng tiến độ và mã nguồn của nhánh làm việc trước.

## Cách giữ tài liệu thống nhất

### Bổ sung được người dùng giao: Dashboard thống kê

Công việc `DS1`, nhánh `feat/dashboard-statistics` từ `origin/main` (`f91fc5d`): thêm
bảng thống kê AUTHORITY tại `/operations/dashboard` và E16 `GET /api/dashboard`.
Phạm vi: đếm báo cáo theo trạng thái hiện tại, nhiệm vụ theo trạng thái hiện tại,
đội rảnh/bận hiện tại; bộ lọc ngày inclusive theo Asia/Ho_Chi_Minh áp vào
`report.created_at` / `mission.assigned_at`, không áp vào tình trạng sẵn sàng đội.
Không dựng số tổng từ dữ liệu phân trang. Provider Reporting/Rescue sở hữu truy vấn
thực thể tổng hợp, Dashboard điều phối qua công khai các hợp đồng; không join xuyên mô-đun.
Không đổi vòng đời, lược đồ, thêm broker/cache hoặc chuyển kiến trúc Pha 2.
User yêu cầu là ngoại lệ phạm vi cho phần mở rộng này; MVP E01–E15/S01–S06 và bằng chứng
cũ giữ nguyên lịch sử. DS1 không tự đánh dấu X2/A2/D3/C3/A3 hoàn tất.
Acceptance: hợp đồng [bảng thống kê](api/dashboard-contract.md), đơn vị điều phối,
PostGIS tích hợp cho quyền/filter/biên ngày/withdraw/availability/global counts,
giao diện loading/error/empty/race/filter/i18n, trình duyệt thật, đầy đủ Maven xác minh và
giao diện typecheck/test/build; bàn giao ghi PASS/FAIL/NOT RUN. Không tự push/deploy.

### Bổ sung — Ảnh minh chứng cho báo cáo

Đây là ngoại lệ phạm vi do người dùng giao trực tiếp trên nhánh `feat/report-evidence-attachments`
tạo từ `main`. Phạm vi E17–E20: người dân owner upload/xóa ảnh khi báo cáo còn `PENDING`; người dân
owner và AUTHORITY xem danh sách/tải nội dung theo quyền. Chỉ nhận JPEG/PNG, tối đa 5
MiB/ảnh và 5 ảnh/report; lưu tệp ngoài gốc phục vụ web bằng lưu trữ cổng, không phát hành
công khai URL. API phải kiểm tra quyền sở hữu ở tầng ứng dụng trước khi stream, trả lỗi rõ cho
tệp thiếu/sai định dạng/quá dung lượng/quá số lượng/report đã khóa/lỗi lưu trữ; xóa
ẩn siêu dữ liệu trước khi xóa physical tệp. Migration/contract/ADR và kiểm thử phải đi cùng
slice; không đổi trạng thái HOÀN TẤT của các công việc lõi hoặc tự push/deploy.

| Câu hỏi | Nguồn sở hữu | Khi cần cập nhật |
| --- | --- | --- |
| Làm gì, ai làm, đợi công việc nào? | Catalog/dependency trong tệp này | Thay phạm vi, quyền sở hữu hoặc điều kiện bắt đầu/hoàn tất |
| Công việc đã xong và đã hợp nhất chưa? | [Progress](phase1-progress.md) | Người phụ trách ghi bằng chứng; người tích hợp ghi commit/PR sau hợp nhất |
| API, vai trò, DTO, lỗi, tranh chấp? | [HTTP/OpenAPI](api/phase1-contract.md) | Producer/consumer cùng rà soát thay đổi hợp đồng trước implement |
| Gọi mô-đun nào, cấp bản chuyển đổi lược đồ số nào? | [Mô-đun contracts/ledger](architecture/phase1-module-contracts.md) | Người phụ trách bàn giao, người tích hợp cấp phiên bản khi sẵn sàng hợp nhất |
| Kiến trúc đang chạy và quyết định tại sao? | [Kiến trúc](architecture/architecture-overview.md), ADR | Đồng bộ khi chạy; ADR mới khi đổi quyết định kiến trúc, giữ lịch sử cũ |
| Giao diện/components dùng thế nào? | [Design system](design/GDRN_UI_DESIGN_SYSTEM.md), bàn giao UI mới nhất | Người phụ trách dùng chung và tính năng phối hợp, không đổi nghiệp vụ bằng thiết kế UI |
| Cài và chạy thế nào? | [Hướng dẫn chạy](HUONG_DAN_CAI_DAT_VA_CHAY.md), [auth/local](P01_LOCAL.md) | Đổi env, tập lệnh, các cổng, tạo dữ liệu mẫu, kiểm thử hoặc cách triển khai |
| Đã kiểm chứng gì trong một công việc? | `docs/handoffs/<ID>.md` | Ghi commit nền, commands/results, CHƯA CHẠY, giới hạn và việc bàn giao |

README là cửa vào và tóm tắt khi chạy, không sao chép toàn bộ runbook/catalog.
Context dài hạn là danh sách để sau khi khác MVP; không dùng ví dụ lịch sử để mở rộng phạm vi.
Bàn giao ghi bằng chứng tại thời điểm chạy: giữ số kiểm thử và trở ngại lịch sử, thêm ghi chú
tích hợp có ngày/commit ở đầu khi cần, không sửa chúng thành kết quả kiểm thử mới.
`TODO` chưa làm, `IN_PROGRESS` còn acceptance chưa đạt, `DONE` đã đạt acceptance của
công việc; **HOÀN TẤT và đã hợp nhất là hai thông tin riêng**. Thiếu kiểm tra phải ghi CHƯA CHẠY,
không quy đổi thành ĐẠT. Dependency chỉ mở khi phần cần thiết đã hợp nhất vào nhánh
làm việc; công việc nhiều lượt ghi rõ phần đã merge/phần còn chờ trong tiến độ.

Mỗi PR thay đổi behavior cập nhật tài liệu tương ứng trong cùng PR. Khi có lệch giữa
mã nguồn và hợp đồng, ghi rõ lệch và phối hợp owner; không sửa hợp đồng âm thầm để hợp
thức hóa lỗi. Giữ OpenAPI P00 là số đo cơ sở đích 15 thao tác; Swagger khi chạy chỉ
công bố thao tác đã có, không đổi `x-status: planned` của số đo cơ sở thành bảng tiến độ.

## Phạm vi, phân công và các mốc MVP

### 1. Mục tiêu và giới hạn thời gian

Hoàn thành một luồng có giao diện và ứng dụng phía máy chủ thật:

> Người dân đăng nhập → gửi báo cáo có tọa độ → điều phối viên duyệt và gắn thảm họa
> → giao đội cứu hộ → cập nhật nhiệm vụ → người dân xem tiến độ.

Giả định 15 ngày làm việc, 4 người, mỗi người khoảng 4–5 giờ tập trung/ngày:
240–300 giờ công tổng. Dành khoảng 25–30% cho rà soát, tích hợp, sửa lỗi, kiểm thử,
đo hiệu năng và tài liệu. Đây là ước lượng để lập kế hoạch, không bảo đảm tiến độ chỉ
bằng cách chạy nhiệm vụ. Nếu chỉ có 1–2 giờ/người/ngày, cần chốt lại phạm vi/thời hạn.

Quy ước D1–D15 trong lịch là ngày làm việc, không phải ngày lịch; **công việc D1** là Rescue
ứng dụng phía máy chủ, khác **ngày D1**. Nhóm tự gán ngày bắt đầu. Mốc D5 hướng tới nền UI đã hợp nhất
và phần gửi/xem báo cáo bắt đầu sau UI01-A; không coi UI báo cáo đã xong chỉ vì B1 xong.
Mốc D10 hướng tới trình diễn xuyên suốt/đóng băng tính năng; D11–D15 hoàn thiện, đo và bàn
giao. Lịch là ước lượng; thiếu phụ thuộc thì điều chỉnh ngày, không bỏ acceptance gate.

Tài liệu này thu hẹp phạm vi dài hạn trong `GDRN_PROJECT_CONTEXT.md`: giao diện
cơ bản là bắt buộc, nhiều mô-đun được hoãn. Không thay đổi kiến trúc Nguyên khối theo mô-đun,
DDD/Clean, Java 21, PostgreSQL/PostGIS. P00 đồng bộ cách mô tả phạm vi trong tài liệu
trước khi nhóm bắt đầu mã nguồn; không xóa lịch sử quyết định hoặc giả vờ đã có tính năng.

### 2. Phạm vi chốt cho kế hoạch

| Phần | Làm trong MVP | Hoãn |
| --- | --- | --- |
| Identity | Đăng nhập, me, CITIZEN/AUTHORITY, tài khoản trình diễn thật | Register, đặt lại password, token làm mới, quản trị người dùng |
| Disaster | Tạo/xem/sửa, ACTIVE → RESOLVED | Vòng đời nhiều bước, tự phát hiện thảm họa |
| Reporting | Gửi/xem/duyệt/từ chối/rút; lọc bán kính | Upload, phát hiện trùng, kiểm duyệt tự động |
| Rescue | Đội được tạo dữ liệu mẫu, giao nhiệm vụ, cập nhật trạng thái | CRUD đội, tính ưu tiên, phân công tự động, RescueRequest riêng |
| Địa lý | Điểm tọa độ, truy vấn PostGIS theo mét; UI chọn/xem điểm và vòng bán kính theo bổ sung 14/10 | Bản đồ tổng hợp, polygon, định tuyến, risk engine, tìm địa chỉ/geocoding |
| Resource/Alert | Chưa triển khai | Kho, phân bổ, thông báo/realtime/SMS |

Không thêm broker, bộ nhớ đệm máy chủ, vi dịch vụ, event bus hoặc abstraction chưa có nhu cầu.
Địa lý logic đơn giản nằm trong bộ chuyển đổi của Reporting; chưa cần một mô-đun geo hoàn chỉnh.
Các tính năng hoãn là danh sách để sau sản phẩm, không mặc định trở thành Pha 2 kiến trúc.
Pha 2 kiến trúc vẫn phải xuất phát từ đo hiệu năng và quality attributes.

### 3. Chính xác 15 điểm cuối API nghiệp vụ

`C`: CITIZEN; `A`: AUTHORITY. Ngoài đăng nhập, các API dưới đây yêu cầu xác thực.
Health/Swagger và tệp static giao diện không tính vào 15 điểm cuối API.

| ID | Method/path | Quyền và chức năng | Chủ ứng dụng phía máy chủ | Nhiệm vụ |
| --- | --- | --- | --- | --- |
| E01 | POST /api/auth/login | Công khai, đăng nhập | Người 1 | P01 |
| E02 | GET /api/auth/me | C/A, thông tin bản thân | Người 1 | P01 |
| E03 | GET /api/disasters | C/A, danh sách phân trang | Người 3 | C1 |
| E04 | GET /api/disasters/{id} | C/A, chi tiết | Người 3 | C1 |
| E05 | POST /api/disasters | A, tạo | Người 3 | C1 |
| E06 | PATCH /api/disasters/{id} | A, cập nhật/chuyển trạng thái | Người 3 | C1 |
| E07 | POST /api/reports | C, gửi | Người 2 | B1 |
| E08 | GET /api/reports | C chỉ của mình; A tất cả; lọc/phân trang/bán kính | Người 2 | B1, B2 |
| E09 | GET /api/reports/{id} | C chủ báo cáo; A | Người 2 | B1 |
| E10 | PATCH /api/reports/{id}/verification | A, duyệt hoặc từ chối | Người 2 | B2 |
| E11 | DELETE /api/reports/{id} | C chủ báo cáo, chỉ khi PENDING; xóa mềm | Người 2 | B2 |
| E12 | GET /api/rescue-teams | A, danh sách đội để phân công | Người 4 | D1 |
| E13 | POST /api/rescue-missions | A, tạo và phân công | Người 4 | D1 |
| E14 | GET /api/rescue-missions | A tất cả; C chỉ nhiệm vụ của báo cáo mình | Người 4 | D1 |
| E15 | PATCH /api/rescue-missions/{id}/status | A, cập nhật trạng thái | Người 4 | D1 |

Không phát sinh điểm cuối API riêng cho bảng thống kê, lookup trạng thái, đăng xuất hoặc tạo dữ liệu mẫu.
Enum cố định được chia sẻ qua hợp đồng. Logout giao diện xóa thông tin phiên trong bộ nhớ.

### 4. Nghiệp vụ và hợp đồng phải thống nhất ở ngày D1 (P00)

- Report: PENDING → VERIFIED hoặc REJECTED, không duyệt lại. Duyệt cần disasterId
  hợp lệ đang ACTIVE; từ chối cần lý do. DELETE chỉ chủ sở hữu + PENDING, soft-delete;
  dữ liệu đã rút không xuất hiện qua GET thông thường.
- Disaster: ACTIVE → RESOLVED, không mở lại trong MVP. Cấm tạo phân công mới cho
  thảm họa đã RESOLVED tại thời điểm kiểm tra nghiệp vụ. Nhiệm vụ có từ trước vẫn
  được hoàn thành. Không thêm điều kiện đóng thảm họa phụ thuộc vào rescue.
- Mission: ASSIGNED → IN_PROGRESS → COMPLETED. Mỗi báo cáo tối đa một nhiệm vụ trong
  MVP, kể cả nhiệm vụ đã hoàn thành. Không có hủy/tái phân công trong phạm vi.
- Một đội chỉ có một nhiệm vụ ASSIGNED/IN_PROGRESS. Chống tranh chấp ở cơ sở dữ liệu bằng
  constraint/locking phù hợp, không chỉ kiểm tra trước rồi insert. Xung đột trả 409.
- User ID/role lấy từ danh tính đã xác thực; không tin reporterId/role gửi trong thân yêu cầu.
- Tọa độ dùng latitude [-90,90], longitude [-180,180]. Filter cần đủ lat/lon/radiusMeters,
  radiusMeters tính theo mét, có giới hạn. Dùng PostGIS geography hoặc cách tương đương
  chính xác về đơn vị; không so khoảng cách độ với mét, không lọc toàn bộ bằng Java.
- P00 chốt UUID ID, ISO-8601 UTC, trang bắt đầu từ 0, size mặc định/tối đa, sắp xếp ổn định,
  các trường DTO và status/error mã nguồn. Dùng PageResponse riêng, không expose Spring Page.
- 401 cho thiếu/hết hạn token; 403 cho sai vai trò; truy cập đối tượng người khác dùng
  404 nhất quán để không lộ sự tồn tại; 400 kiểm tra dữ liệu, 409 xung đột nghiệp vụ.

Hướng gọi liên mô-đun:

```text
Rescue → Reporting published application contract → Disaster published application contract
```

Hợp đồng công khai đặt trong `<module>.application.contract`, chỉ gồm interface và
DTO bất biến không phụ thuộc thư viện nền tảng. P00 mô tả trước; chủ mô-đun triển khai khi
ca sử dụng cần. Không tạo placeholder môi trường triển khai classes ở bước lập hợp đồng.
Không đọc bảng/JPA kho mã của mô-đun khác, không tạo vòng phụ thuộc.

Reporting cung cấp trạng thái/owner/disaster cần thiết cho Rescue. Báo cáo chi tiết
không gọi ngược sang Rescue. Giao diện xem tiến độ bằng E09 + E14?reportId=...;
ứng dụng phía máy chủ E14 vẫn kiểm tra quyền sở hữu. Query danh sách phải có phân trang và tránh N+1;
API hợp đồng nội bộ có theo lô lookup nếu danh sách cần nó.

#### Đăng nhập và dữ liệu trình diễn

JWT Bearer ngắn hạn, không token làm mới. Dùng thư viện Spring Security phù hợp,
không tự viết mật mã/JWT bộ phân tích. Secret/key lấy từ môi trường; kiểm tra tính hợp lệ thuật toán,
chữ ký, issuer/audience và expiration theo ADR. MVP chỉ cấp/sử dụng CITIZEN/AUTHORITY.
Enum hiện có thêm RESPONDER/ADMIN: giữ tương thích code/test đã có, chưa tạo dữ liệu mẫu, chưa
thêm UI hoặc cấp quyền cho hai vai trò ngoài phạm vi; không tự xóa mã nguồn để khớp kế hoạch.
Giao diện giữ token trong `sessionStorage` theo tab; reload cùng tab khôi phục phiên,
tab mới cần đăng nhập lại. Logout chỉ xóa phiên cục bộ, token đã phát vẫn sống đến hết
hạn. Không lưu token vào URL/log/localStorage. Không dùng cookie xác thực song song.
P01 quyết định cấu hình CSRF phù hợp với Bearer-only không lưu trạng thái và ghi rõ lý do.

Tạo ít nhất hai CITIZEN và một AUTHORITY qua cơ chế bootstrap cấu hình `demo` có
kiểm soát; lấy mật khẩu từ môi trường, hash bằng PasswordEncoder. Không tài khoản
mặc định/secret trong bản chuyển đổi lược đồ hoặc môi trường triển khai. Rescue tạo dữ liệu mẫu đội trình diễn cùng nguyên tắc
idempotent, không điểm cuối API tạo dữ liệu mẫu. Không đổi dữ liệu của người dùng đã tồn tại khi chạy lại.

### 5. Giao diện bắt buộc: 6 màn hình

Một SPA trong `frontend/`: React + TypeScript + Vite, React Router, fetch wrapper,
component/CSS dùng chung. Chủ P01 xác nhận phiên bản tương thích, pin bằng lockfile
và chuẩn hóa Node trong local/CI/Docker. Không làm SSR, Redux hoặc hệ thống thiết kế lớn.
Nếu kho mã đã có giao diện phù hợp khi chạy nhiệm vụ, giữ nó thay vì tạo lại.

| ID | Route dự kiến | Chức năng thật | Chủ |
| --- | --- | --- | --- |
| S01 | /login | Đăng nhập, lỗi, chuyển trang theo vai trò | Người 1 |
| S02 | /reports/new | Form gửi và tọa độ | Người 2 |
| S03 | /my-báo cáo | List, chi tiết khung, rút, xem tiến độ qua E14 | Người 2 |
| S04 | /operations/reports | Lọc, bán kính, chi tiết, duyệt/từ chối, chọn thảm họa | Người 3 |
| S05 | /operations/disasters | List/detail/create/edit/resolve | Người 3 |
| S06 | /operations/rescue | List, tạo phân công, chọn đội, cập nhật tiến độ | Người 4 |

Mọi màn hình có loading/error/empty, nhãn và kiểm tra dữ liệu, thích ứng kích thước màn hình cơ bản, bàn phím
access; xử lý 401/403/409. Không có nút giả hoặc giả lập API trong khi chạy bàn giao.
Người dân không cần bảng thống kê riêng. Khi B3/C2 đã có định tuyến, sau đăng nhập chuyển tới
`/my-reports` hoặc `/operations/reports` theo vai trò. Trước đó giữ card tài khoản thật
tại `/login`, chỉ hiện nav tính năng đã đăng ký; không thêm placeholder cho đủ màn hình.
Giao diện trình diễn môi trường triển khai ở A2 sẽ được phục vụ cùng origin qua static máy chủ và proxy `/api`;
đây chỉ là cấu hình phục vụ giao diện, không thêm hệ thống API gateway.

### 6. Phân công và quyền sở hữu tệp

| Người | Phần sở hữu | Rà soát chéo | Nhiệm vụ phụ trách |
| --- | --- | --- | --- |
| 1 — tích hợp + Identity | identity; dùng chung technical cấu hình; giao diện auth/layout/http/router; gốc config/CI | Người 3 | P00, P01, UI01-A, A1, A2, UI01-B, X1, A3 |
| 2 — Reporting + Địa lý | reporting; frontend/features/reporting-citizen; E2E sau khi tích hợp | Người 4 | B1, B2, B3, X2 |
| 3 — Disaster + UI duyệt | thảm họa; frontend/features/disaster và reporting-thao tác; tài liệu trình diễn | Người 1 | C1, UI01-C1, C2, C3 |
| 4 — Rescue + đo tải | rescue; frontend/features/rescue; đo hiệu năng scripts/results | Người 2 | D1, D2, D3 |

**E10 chỉ người 2 viết ứng dụng phía máy chủ; người 3 dùng E10 trên UI.** Người 4 không sửa kho mã
của Reporting. Người 2 không sửa class của Rescue để hiển thị tiến độ.
Người 1 không phải viết tất cả UI; chỉ thiết lập nền tảng dùng chung và ghép router.

Tệp chung do người 1 điều phối: `pom.xml`, `.env.example`, `docker-compose.yml`,
Dockerfiles, CI, `frontend/package*.json`, router, API máy khách, global CSS và technical
error/security concerns. DTO HTTP và công khai business DTO thuộc mô-đun producer;
không gom Report/Disaster/Mission DTO vào dùng chung hoặc buộc miền nghiệp vụ dùng DTO HTTP.
Người phụ trách khác cần thay đổi thì ghi yêu cầu trong bàn giao; người 1 gộp patch nhỏ, không
đợi tới tuần 3. `npm install` chỉ chạy ở nhánh chung hoặc theo thỏa thuận để tránh
lockfile xung đột. Khi đã có lockfile, các thành viên dùng `npm ci`.

Feature ứng dụng phía máy chủ mới cần định tuyến policy và OpenAPI khi chạy: owner mô-đun bàn giao
method/path/role, hợp đồng slice và acceptance kiểm thử; Người 1 tích hợp matcher và
đăng ký slice trong cấu hình chung trước khi tính năng được coi là chạy end-to-end.
Hiện cấu hình chung là `SecurityConfiguration`/`OpenApiConfiguration` dưới
`shared.infrastructure.configuration`; slices ở `src/main/resources/openapi/`.
Cập nhật khi chạy slice thuộc owner API; Người 1 review/ghép vào cấu hình chung.
Không chờ A1 cuối kỳ mới mở các API đã implement. Người phụ trách có thể kiểm chứng phần
domain/application/persistence độc lập nhưng phải ghi IN_PROGRESS nếu khi chạy còn
bị mặc định từ chối; không dùng security test-only permitAll để tuyên bố HOÀN TẤT.

Migration: P00 lập sổ phiên bản và hợp nhất theo thứ tự Identity → Disaster → Reporting
→ Rescue. Không phát số thấp rồi hợp nhất sau khi DB đã áp dụng số cao. Không bật
out-of-order để chữa workflow; không sửa bản chuyển đổi lược đồ đã merge/áp dụng, dùng bản chuyển đổi lược đồ
mới cho sửa đổi. Không đặt JPA relation xuyên mô-đun. P00 phải quy định rõ quyền sở hữu
của tham chiếu ID và chiến lược toàn vẹn, không tự thêm SQL join xuyên mô-đun.

### 7. Lịch 15 ngày và cổng kiểm tra

| Ngày | Người 1 | Người 2 | Người 3 | Người 4 | Kết quả chung |
| --- | --- | --- | --- | --- | --- |
| D1 | P00, chốt các hợp đồng cả nhóm | Rà soát Report/Geo + wireframe | Rà soát Disaster + UI điều phối | Rà soát Rescue + tranh chấp đồng thời | API/schema hành vi/ownership rõ |
| D2 | P01 Identity + SPA nền | Chuẩn bị domain/test B1 từ hợp đồng | Chuẩn bị domain/test C1 từ hợp đồng | Thiết kế D1, quy tắc và tranh chấp đồng thời kiểm thử plan | Không tự tạo security/router riêng |
| D3 | Merge P01 | B1 ứng dụng phía máy chủ gửi/xem | C1 ứng dụng phía máy chủ Disaster | Miền nghiệp vụ Rescue; chờ B2 hợp đồng thực thi | Đăng nhập thật, giao diện khởi động |
| D4 | Review/ghép định tuyến theo bàn giao | B1 hoàn tất, bắt đầu B2 | C1 UI thật, hợp nhất trước B2 | D1 chuẩn bị persistence khi bản chuyển đổi lược đồ được cấp | API B1/C1 tích hợp |
| D5 | UI01-A dùng chung design + S01 | B2 rule/DB; B3 phần E07–E09 sau UI01-A | Rà soát UI01-A, chuẩn bị C2 | Thiết kế D1/race, chờ B2 | Design system hợp nhất; gửi/xem báo cáo tiến triển |
| D6 | Hoàn tất UI01-A, bắt đầu A1 security | B2 hoàn tất/merge | UI01-C1 sau UI01-A; C2 sau B2 | D1 ứng dụng phía máy chủ sau B2 | Report xác minh được; S01 có hệ thống thiết kế |
| D7 | A1 security/shared behavior | B3 rút/lọc/validation | UI01-C1 + C2 | D1 tranh chấp tests/merge | Ứng dụng phía máy chủ nghiệp vụ đủ, S05 đồng nhất |
| D8 | A2 Docker giao diện + CI | B3 tiến độ nhiệm vụ sau D1 | C2 hoàn tất | D2 UI Rescue | Sáu màn hình ghép đủ định tuyến |
| D9 | UI01-B điều phối kiểm tra | Sửa Reporting UI theo kiểm tra | Sửa S04/S05 theo kiểm tra | D2 hoàn tất, sửa S06 | UI01-B đạt trước tích hợp |
| D10 | X1 tích hợp/chốt | B3/X2 kiểm tra nhanh | Rà luồng nghiệp vụ/quyền | D3 kiểm tra nhanh, thử Kaggle | Trình diễn xuyên suốt, đóng băng tính năng |
| D11 | A2 hoàn tất, hỗ trợ E2E | X2 E2E thật | C3 kiến trúc/README/rubric | D3 kịch bản tải + môi trường | CI/E2E và fixture ổn định |
| D12 | Sửa vấn đề chung | Sửa lỗi + X2 | C3 rehearsal | D3 đo, lưu dữ liệu thô | Có số liệu đo hiệu năng thật |
| D13 | Rà soát bản ứng viên | Kiểm tra hai user/403/409 | Chốt C3 | Phân tích D3, nêu giới hạn | Release candidate |
| D14 | A3 kiểm tra; sửa lỗi thuộc mình | Fix/retest thuộc mình | Fix/retest thuộc mình | Fix/retest thuộc mình | Không còn trở ngại |
| D15 | A3 bàn giao | Hỗ trợ clone sạch/demo | Trình diễn + báo cáo | Benchmark reproducibility | Pha 1 hoàn tất theo DoD |

Các nhiệm vụ có thể trải qua nhiều ngày. Không mở nhiệm vụ phụ thuộc chỉ từ báo cáo
"xong": kiểm tra bàn giao, kiểm thử, rà soát và mã nguồn đã có trong nhánh tích hợp.

### 8. Thứ tự phụ thuộc của nhiệm vụ

```text
P00 → P01 → B1 + C1                     (đã hoàn tất/merge)
B1 + C1 → B2
P01 + B1 + C1 → UI01-A                  (song song B2, file ownership khác)
UI01-A → UI01-C1
B1 + UI01-A → B3 phần gửi/xem; B2 + D1 → B3 hoàn tất
C1 + B2 + UI01-A → C2
B2 + C1 → D1 → D2; UI01-A → D2 phần giao diện
UI01-A → A1, A2
B3 + C2 + D2 + UI01-C1 → UI01-B
UI01-B + A1 hoàn tất + A2 phần runtime → X1
X1 → X2, C3, D3                         (có thể song song)
X2 → A2 hoàn tất CI E2E; X2 + D3 → C3 hoàn tất evidence
X2 + C3 + D3 + UI01-B + A2 hoàn tất → A3
```

Trong thời gian chờ phụ thuộc, làm miền nghiệp vụ analysis, kiểm thử cases, wireframe hoặc
rà soát. Kiểm thử doubles chỉ trong kiểm thử; không thêm giả lập API/placeholder môi trường triển khai để
vượt phụ thuộc chưa hợp nhất. P00/P01 cần ưu tiên rà soát trong ngày vì chặn cả nhóm.

A2 có hai lượt trong **cùng công việc**: runtime/CI biên dịch trước X1 và ghép E2E sau X2.
X1 không chờ A2 HOÀN TẤT toàn bộ; chỉ chờ phần khi chạy đã hợp nhất và kiểm tra nhanh đạt. A1 phải
kiểm tra đủ API của B2/D1 trước X1. C3 có thể viết sau X1 nhưng chờ bằng chứng X2/D3 để
HOÀN TẤT. Không tạo công việc ID mới hay bỏ cổng A3 để giải quyết các phụ thuộc theo phần này.

### 9. Quy trình Git và phối hợp nhóm

Mỗi thành viên làm việc trên clone/worktree riêng. Mỗi thay đổi cần có phạm vi nhỏ,
các hợp đồng và tiêu chí nghiệm thu rõ ràng; thường tương ứng một pull yêu cầu.

1. Cập nhật nhánh tích hợp, kiểm tra phụ thuộc đã hợp nhất và giữ các thay đổi cục bộ.
2. Tạo nhánh tính năng phù hợp với nhiệm vụ trong danh mục.
3. Ghi bàn giao về thay đổi, API/routes, bản chuyển đổi lược đồ, kết quả kiểm tra và hạn chế.
4. Rà soát diff, nghiệp vụ và luồng UI/API thật trước khi hợp nhất.
5. Merge theo dependency/migration order; không đổi hợp đồng đã freeze khi chưa rà soát.

Không đưa credentials/token vào commit. Việc publish/deploy cần được nhóm thống nhất.

### 10. Kiểm thử, đo hiệu năng và tiêu chí hoàn thành

Mỗi tính năng cần kiểm thử miền nghiệp vụ, tầng ứng dụng kiểm thử với các cổng, kiểm thử tích hợp thật
PostGIS/security theo rủi ro. Verify đầy đủ dùng `./mvnw clean verify` hoặc Windows
`.\mvnw.cmd clean verify`, không bỏ qua Testcontainers. Giao diện cần typecheck, kiểm thử,
môi trường triển khai biên dịch; E2E nối trình duyệt → API → DB thật. CI phải chạy các gate đã thiết lập.

Mốc kiểm tra quan trọng:

- Hai người dân không đọc/rút báo cáo hay xem nhiệm vụ của nhau; điều phối viên thao tác được.
- Duyệt/rút báo cáo đồng thời không tạo trạng thái không hợp lệ.
- Hai yêu cầu phân cùng đội và hai yêu cầu tạo nhiệm vụ cho cùng báo cáo: chỉ một
  thành công; còn lại 409; không làm mất dữ liệu hoặc trả lỗi 500 ngoài ý muốn.
- Miền nghiệp vụ không phụ thuộc Spring/JPA; không xuyên mô-đun hạ tầng; JPA không
  lộ qua API; công khai các hợp đồng nhỏ và chiều phụ thuộc không có cycle.
- Swagger bootstrap kiểm thử "không có thao tác" phải được thay bằng kiểm tra chính xác
  hợp đồng đã triển khai; không xóa kiểm thử chỉ để thêm điểm cuối API không kiểm soát.

Benchmark ít nhất E07 (ghi), E08 (đọc phân trang), E08 với bán kính (spatial):
kiểm tra nhanh → tải vừa → tăng tải theo khả năng môi trường. Ví dụ 10/50/100 VU là điểm bắt
đầu, không phải SLO hay yêu cầu đạt 2000 VU. Ghi seed/data size, warm-up/duration,
yêu cầu mix, token lifetime, máy chạy generator/server/DB, cấu hình phần cứng và commit.
Ghi thông lượng, p50/p95/p99, lỗi rate, CPU/RAM khi đo được; lưu raw đầu ra và tập lệnh.

Theo tiêu chí hiện ghi trong context, phải có load kiểm thử trên Kaggle CPU. D3 phải thử
môi trường từ D10; phân biệt rõ Kaggle chạy generator hay cả server/DB. Nếu tiêu chí đánh giá
yêu cầu máy chủ trên Kaggle, không lấy chạy generator-only làm bằng chứng thay thế.
Không giả định Kaggle có Docker daemon; kiểm tra khả năng cài/chạy Java/PostGIS và
network thực tế. Có thể làm cục bộ số đo cơ sở trong lúc bị chặn, nhưng chưa được đánh
dấu đạt tiêu chí Kaggle. Không mở cơ sở dữ liệu, đường hầm mạng hoặc publish dịch vụ để đo khi
chưa có yêu cầu/ủy quyền cụ thể; không bịa số liệu.

**Definition of Done chung:** 15 API đúng hợp đồng; 6 màn hình dùng API thật; luồng
trình diễn hoàn chỉnh; quyền/ownership được kiểm thử; không sai phân công đồng thời; clone mới
chạy frontend/backend/database bằng hướng dẫn; Docker/CI/ArchUnit/E2E đạt; có bộ dữ liệu
trình diễn và đo hiệu năng tái lập; README/C4/ADRs khớp thực tế; có danh sách kiểm tra tiêu chí đánh giá (gồm yêu
cầu công khai kho mã do nhóm xử lý, không tự publish từ thành viên phụ trách).

### 11. Cách ứng phó chậm tiến độ

Nếu đến mốc D5 nền UI chưa hợp nhất hoặc phần gửi/xem báo cáo chưa thể bắt đầu, người 1
hỗ trợ gỡ phụ thuộc, ưu tiên dùng chung accessibility/form cần thiết và luồng thật;
dừng trang trí tùy chọn hoặc phụ thuộc mới. Không bỏ UI01-A để vượt phụ thuộc.
Nếu D10 chưa trình diễn xuyên suốt,
dừng mở rộng và dành người 3 hỗ trợ integration/review.

Có thể cắt animation tùy chọn, trang trí bổ sung, tìm kiếm nâng cao, dashboard/map
(vốn ngoài phạm vi), dữ liệu trình diễn lớn. Không cắt dùng chung design/accessibility đã chốt,
auth/ownership, kiểm tra tranh chấp, giao diện thật,
bản chuyển đổi lược đồ, kiểm thử hoặc bằng chứng đo hiệu năng để tuyên bố hoàn tất.
Nếu vẫn quá tải, báo rõ tiêu chí chưa đạt và xin nhóm điều chỉnh scope/thời hạn;
không gắn nhãn hoàn thành bằng việc bỏ qua kiểm thử hoặc đưa giả lập vào trình diễn.

### 12. Tham khảo kỹ thuật cho các nhiệm vụ

- [React: biên dịch an app from scratch](https://react.dev/learn/build-a-react-app-from-scratch)
  và [Vite guide](https://vite.dev/guide/) cho cách tạo SPA; xác minh Node/version
  requirements khi thực thi P01 và commit lockfile, không dựa vào `latest` mỗi máy.
- [k6 số đo](https://grafana.com/docs/k6/latest/using-k6/metrics/) cho số liệu chuẩn;
  các mức tải trong kế hoạch là lựa chọn thử nghiệm của nhóm, không số đo sẵn có.

## Danh mục công việc

Kiểm tra phụ thuộc và trạng thái trong tiến độ trước khi bắt đầu. Mỗi nhiệm vụ
cần rà soát mã nguồn, hợp đồng, kết quả kiểm tra và bàn giao; không triển khai lại phần
đã hoàn tất hoặc bắt đầu nhiệm vụ phụ thuộc khi đầu vào chưa hợp nhất.

| ID | Người | Thời điểm dự kiến | Dependency đã hợp nhất | Bàn giao chính |
| --- | --- | --- | --- | --- |
| P00 | 1, cả nhóm rà soát | D1 | Repo hiện tại | Contracts, phạm vi, quyền sở hữu, migrations plan |
| P01 | 1 | D2–D3 | P00 | Xác thực thật, SPA nền và đăng nhập |
| B1 | 2 | D3–D4 | P01; bản chuyển đổi lược đồ sau C1 | Tạo/xem báo cáo và quyền sở hữu |
| C1 | 3 | D3–D5 | P01 | Disaster ứng dụng phía máy chủ + UI |
| UI01-A | 1 | D5–D6 | P00, P01, B1, C1 | Shared hệ thống thiết kế + cải tạo S01; nhiệm vụ ở phụ lục UI01 |
| B2 | 2 | D5–D6 | B1, C1 | Verify/delete/spatial + công khai báo cáo hợp đồng |
| UI01-C1 | 3 | D6–D7 | UI01-A, C1 | Cải tạo S05 theo dùng chung hệ thống thiết kế; nhiệm vụ ở phụ lục UI01 |
| D1 | 4 | D5–D7 | B2, C1 | Rescue ứng dụng phía máy chủ + tranh chấp đồng thời |
| B3 | 2 | D5–D8, chia hai lượt | B1 + UI01-A phần đầu; B2/D1 để hoàn tất | S02/S03 theo hệ thống thiết kế |
| C2 | 3 | D6–D7 | B2, C1, UI01-A | S04 theo hệ thống thiết kế |
| D2 | 4 | D8–D9 | D1, UI01-A | S06 theo hệ thống thiết kế |
| A1 | 1 | D6–D8 | UI01-A; kiểm tra lại khi B2/D1 hợp nhất | Bảo mật + dùng chung behavior; không làm lại hệ thống thiết kế |
| A2 | 1 | D8–D11 | UI01-A cho khi chạy; X2 cung cấp suite để hoàn tất CI E2E | Docker giao diện và CI |
| UI01-B | 1 điều phối + owners | D9 | B3, C2, D2, UI01-C1 | Kiểm tra 6 màn hình; gate trước X1; nhiệm vụ ở phụ lục UI01 |
| X1 | 1, owner hỗ trợ | D9–D10 | UI01-B, A1 hoàn tất, A2 phần khi chạy | Luồng thật xuyên suốt |
| X2 | 2 | D10–D12 | X1 | Trình duyệt E2E và kiểm tra hồi quy |
| D3 | 4 | Kiểm tra nhanh D10, đo D11–D13 | X1 cho số đo chính thức | Script, raw đo hiệu năng, báo cáo |
| C3 | 3 | D11–D13 | X1; thêm kết quả X2/D3 khi có | Kiến trúc, tiêu chí đánh giá, trình diễn, hướng dẫn |
| A3 | 1, cả nhóm rà soát | D14–D15 | X2, C3, D3, UI01-B; mọi công việc trước DONE/merge, gồm A2 CI E2E | Final kiểm tra và bàn giao |

B3/A1/A2/C3 được tiếp tục khi phụ thuộc mới sẵn sàng, không đánh dấu hoàn tất ở
lượt đầu nếu còn phần bị chặn. Ngày thực hiện có thể dịch nhưng không bỏ các cổng
acceptance. Trạng thái hiện tại tra tiến độ; không dùng bảng lịch để chạy lại lịch sử.

Ba nhiệm vụ UI01 nằm trong `docs/design/GDRN_UI_CHECKPOINTS.md` để giữ chi tiết thiết kế gần
tài liệu UI. Chúng là phần thực thi của danh mục này, không phải kế hoạch thứ hai. Không chạy
UI01-A, UI01-C1 hoặc UI01-B nếu dependency/trạng thái trong bảng trên chưa cho phép.

<a id="quy-tac-chung"></a>
## Quy tắc chung

Các nhiệm vụ dưới đây cùng tuân thủ những yêu cầu sau:

- Đọc toàn bộ CONTRIBUTING.md áp dụng, context dài hạn, kiến trúc overview, kế hoạch
  MVP, các hợp đồng đã tồn tại và mã nguồn thật trước khi sửa. README có thể chậm hơn mã nguồn;
  kho mã hiện đã có miền nghiệp vụ Identity ban đầu và package-info, không được regenerate.
- Phạm vi MVP là 15 điểm cuối API E01–E15 và 6 màn hình S01–S06 trong kế hoạch. Tính năng
  mới chỉ được triển khai bởi nhiệm vụ sở hữu; không chạy sang nhiệm vụ tiếp theo.
- Với mọi công việc sửa giao diện, đọc `docs/design/GDRN_UI_DESIGN_SYSTEM.md` và bàn giao
  UI01 mới nhất. UI01-A là nền bắt buộc cho B3/C2/D2; UI01-C1 thuộc owner Disaster;
  UI01-B là gate trước X1. Design system không được đổi API, định tuyến, vai trò hoặc nghiệp vụ.
- Không xóa hoặc ghi đè thay đổi chưa commit của người khác. Không tự đẩy mã, hợp nhất,
  công khai kho mã, publish web hay triển khai ra bên ngoài. Không tự sinh bí mật cố định.
- Kiến trúc: miền nghiệp vụ Java thuần; tầng ứng dụng điều phối + các cổng; HTTP ở API;
  JPA/PostGIS ở hạ tầng; DTO riêng, constructor injection. Không truy cập
  hạ tầng mô-đun khác. Không dùng dùng chung làm nơi chứa logic nghiệp vụ.
- Tham chiếu mô-đun khác qua các hợp đồng đã chốt. Dependency chưa có thì mô tả trở ngại
  cụ thể, làm phần độc lập/test, không tạo giả lập phần triển khai trong môi trường triển khai.
  Không tự thay tên trường/endpoint để làm UI của riêng mình chạy.
- Tuân thủ tệp quyền sở hữu và bản chuyển đổi lược đồ order. Thay đổi tệp chung cần phối hợp người 1;
  nếu phiên hiện tại không sở hữu, ghi patch/đề nghị vào bàn giao. Chủ tích hợp phải
  áp dụng patch và kiểm tra trong ngày. Không đánh dấu UI hoàn tất khi chưa gắn router.
- Không thêm điểm cuối API tạo dữ liệu mẫu, sample miền nghiệp vụ, giả lập business data trong khi chạy chính,
  broker, Redis, distributed kiến trúc, cơ chế tự động đánh giá rủi ro hoặc bản đồ ngoài phạm vi.
- Feature thật phải có DB bản chuyển đổi lược đồ cùng mã nguồn; không ddl-auto update/create. Miền nghiệp vụ
  model trước persistence model. Không sửa bản chuyển đổi lược đồ đã áp dụng hoặc bỏ qua Flyway.
- Ứng dụng phía máy chủ chạy clean xác minh đầy đủ với Docker. Giao diện chạy tập lệnh typecheck,
  kiểm thử ở chế độ không watch, biên dịch; P01 thiết lập chúng. Thêm kiểm thử theo rủi ro,
  không kiểm thử chỉ để đủ số. Không skip/suppress kiểm thử để đạt biên dịch xanh.
- Cập nhật bootstrap kiểm thử khi semantics thay đổi: ví dụ Swagger không còn trống
  khi có API. Thay assertion bằng hợp đồng đúng, không xóa coverage bừa bãi.
- Kiểm tra UI với API thật; kiểm thử doubles chỉ trong kiểm thử. Không tuyên bố đã kiểm tra
  trình duyệt nếu không có công cụ: cung cấp danh sách kiểm tra thao tác và ghi rõ chưa kiểm tra.
- Nếu thiếu Docker/network/credentials, báo lệnh và lỗi thật, không giả kết quả hoặc
  tự tắt tích hợp kiểm thử. Có thể dùng settings-central.xml/cache riêng như hướng dẫn.
- Mỗi công việc cập nhật `docs/handoffs/<ID>.md`, ghi commit nền nếu có, file/API/routes,
  bản chuyển đổi lược đồ, các phụ thuộc, lệnh và kết quả thực tế, việc còn lại; không nhật ký bí mật.
- Bàn giao ghi rõ thay đổi, tiêu chí đạt/chưa đạt, kiểm thử, trở ngại, cách chạy/demo
  và các phụ thuộc còn lại. Không đánh dấu nhiệm vụ tiếp theo hoàn tất khi chưa kiểm chứng.

## P00 — Chốt hợp đồng và phạm vi (người 1)

Mục tiêu: bốn người có thể làm độc lập mà không tự đoán API, phân quyền hoặc bản chuyển đổi lược đồ.
Tạo docs/api/phase1-contract.yaml (OpenAPI hợp lệ, chính xác E01–E15),
docs/api/phase1-contract.md và docs/architecture/phase1-module-contracts.md.
Định nghĩa đầy đủ yêu cầu/phản hồi, trường giới hạn, required/optional, enums, UUID,
UTC các mốc thời gian, pagination/filter/sort, success/error statuses, quyền sở hữu, ví dụ JSON.
Chốt ma trận endpoint/màn hình/role, trạng thái transitions và tranh chấp expectations theo kế hoạch.
List nhiệm vụ nhận reportId; người dân chỉ xem được nhiệm vụ thuộc báo cáo của mình.
API báo cáo chi tiết không gọi ngược Rescue; UI dùng hai truy vấn để xem tiến độ.

Published các hợp đồng: Disaster truy vấn dùng cho Reporting; Reporting truy vấn dùng cho Rescue.
Chốt interface/DTO dự kiến, missing/deleted behavior, theo lô truy vấn và chiều phụ thuộc
không cycle. Chỉ mô tả signature, chưa tạo placeholder Java classes.
Lập sổ bản chuyển đổi lược đồ: owner, thứ tự hợp nhất Identity → Disaster → Reporting → Rescue,
phiên bản chưa được tự cấp độc lập, quy tắc không sửa bản chuyển đổi lược đồ đã áp dụng.
Viết ADR mới về phạm vi MVP và lựa chọn auth/frontend dự kiến, dùng số kế tiếp chưa dùng.
JWT trong `sessionStorage` theo tab, no làm mới, hai vai trò hoạt động; ghi rõ reload cùng
tab khôi phục và tab mới cần đăng nhập lại.

Thêm bảng P00/P01/B1.../A3 trạng thái TODO vào docs/phase1-progress.md; P00 HOÀN TẤT khi
các hợp đồng không mâu thuẫn. Đồng bộ README/context/architecture bằng liên kết và phạm vi
note, giữ phần dài hạn là danh sách để sau; không ghi các API/UI planned là implemented.
Chuẩn bị dữ liệu mẫu trong tài liệu thôi, không bản chuyển đổi lược đồ business ở công việc này.
Validate YAML/OpenAPI bằng công cụ sẵn có phù hợp; đối chiếu đủ 15 thao tác + 6 UI,
không thao tác nào thiếu người sở hữu hoặc bên sử dụng. Chạy kiểm tra theo CONTRIBUTING.md.
Ghi docs/handoffs/P00.md gồm các quyết định nhóm cần rà soát và bàn giao cho P01/B1/C1/D1.
Không bắt đầu P01.

## P01 — Identity và giao diện nền (người 1)

Điều kiện: P00 đã có trong nhánh hiện tại. Sở hữu identity, dùng chung technical cấu hình,
giao diện nền/login/router/API máy khách và gốc các phụ thuộc. Không implement mô-đun khác.

Implement E01 POST /api/auth/login, E02 GET /api/auth/me, S01 /login bằng API thật.
Tái sử dụng miền nghiệp vụ User/EmailAddress/Role; bổ sung reconstitution/provisioning phù hợp,
không lạm dụng công khai register điểm cuối API vì điểm cuối API này ngoài phạm vi. Chỉ cấp trình diễn vai trò
CITIZEN/AUTHORITY; giữ enum/test cũ tương thích, không cấp thêm vai trò ngoài MVP.
Tách persistence user/credential và miền nghiệp vụ; bản chuyển đổi lược đồ được cấp theo sổ P00; password
hash bằng PasswordEncoder. Không hardcode user/password trong bản chuyển đổi lược đồ hoặc môi trường triển khai.
Cơ chế tạo dữ liệu mẫu cấu hình trình diễn idempotent, 2 người dân + 1 điều phối viên từ biến môi trường,
chạy lại không đặt lại mật khẩu/role dữ liệu đã có. Thiếu cấu hình trình diễn phải báo rõ.

Dùng Spring Security JWT Bearer không lưu trạng thái với thư viện tương thích Boot hiện có.
Key/secret từ environment, kiểm tra tính hợp lệ signature/algorithm/expiry/issuer/audience theo ADR,
không custom crypto, không nhật ký credentials/token. Me lấy principal đã xác thực.
Đăng nhập lỗi không tiết lộ người dùng tồn tại; đúng status/JSON hợp đồng. Không biểu mẫu login/basic
hay generated development người dùng. CSRF/CORS xử lý rõ theo Bearer-only; mặc định từ chối.
Giữ health/Swagger và bổ sung OpenAPI security scheme. Chỉ mở định tuyến của tính năng đã có.

Nếu chưa có giao diện, tạo frontend/ với React + TypeScript + Vite + routing và fetch
wrapper; xác minh phiên bản tương thích, pin Node cho local/CI, commit npm lockfile.
Thiết lập tập lệnh dev/typecheck/test/build, kiểm thử cho auth/API máy khách; chưa giả lập các trang.
Token trong `sessionStorage` theo tab; /me xác thực phiên sau đăng nhập; reload cùng tab
khôi phục, tab mới cần đăng nhập lại; đăng xuất xóa state/cache; 401 chuyển đăng nhập, 403 báo lỗi
phù hợp. Không localStorage/URL token.
Tạo layout/nav theo vai trò, thành phần form/loading/error/empty dùng chung và convention
tính năng định tuyến exports để người 2–4 không sửa global router. Vite proxy /api dùng cấu
hình cục bộ; không đưa backend/container hostname vào gói trình duyệt.

Kiểm thử đăng nhập đúng/sai, expired/tampered token, me, no-secret tạo dữ liệu mẫu, hai vai trò và giao diện
đăng nhập thật. Cập nhật bootstrap assertions theo API mới, không xóa security coverage.
Chạy clean xác minh, giao diện typecheck/test/build; cập nhật hướng dẫn env/local.
Ghi bàn giao P01 với principal hợp đồng, định tuyến registration, thành phần usage, migrations,
kiểm thử results và phần A1/A2 còn lại. Không tự mở toàn bộ future API bằng permitAll.

## B1 — Báo cáo: tạo và xem (người 2)

P01 phải đã hợp nhất. Sở hữu com.gdrn.reporting và tests/migration được cấp; không sửa
security/router/package khóa chung, gửi yêu cầu tích hợp nhỏ cho người 1 nếu cần.

Implement E07 POST /api/reports, E08 GET /api/reports, E09 GET /api/reports/{id}.
Miền nghiệp vụ Report Java thuần: id, owner, thông tin sự cố, tọa độ, PENDING và các mốc thời gian
theo hợp đồng. Người phụ trách lấy principal, không từ thân yêu cầu; không có JPA/HTTP/Spring trong miền nghiệp vụ.
Thiết kế để B2 bổ sung verification/delete; không implement E10/E11 ở đây.
Tầng ứng dụng các cổng → persistence bộ chuyển đổi, DTO riêng, bản chuyển đổi lược đồ theo sổ; point lưu trữ
phù hợp PostGIS ngay từ đầu. Nếu dùng Hibernate Spatial, phối hợp gốc phụ thuộc.
List phân trang/sort ổn định và lọc đã có: người dân chỉ của mình, điều phối viên được
đọc tất cả. Detail người khác trả 404; không cho truy vấn ownerId vượt quyền. Chặn đầu vào
rỗng/quá dài, latitude/longitude ngoài miền, page/size ngoài giới hạn.

Kiểm thử: miền nghiệp vụ kiểm tra dữ liệu, ca sử dụng quyền sở hữu, PostGIS persistence roundtrip,
anonymous 401, người dân create, điều phối viên create bị cấm theo hợp đồng, hai người dân
không đọc chéo, điều phối viên list/detail, phân trang và DTO không lộ persistence.
Đánh dấu lọc bán kính ở B2 là chưa thực thi, không giả lập kết quả hoặc quảng cáo đã có.
Chạy xác minh thật. Cập nhật OpenAPI/runtime khớp phần đã implement và bàn giao B1 với
payload ví dụ an toàn, mã trạng thái, bản chuyển đổi lược đồ và nhu cầu định tuyến policy cho người 1.
Không tạo giao diện giả lập khi chạy hoặc mô-đun Rescue để làm báo cáo chi tiết.

## C1 — Thảm họa: ứng dụng phía máy chủ và màn hình (người 3)

P01 phải đã hợp nhất. Sở hữu com.gdrn.thảm họa, frontend/src/features/disaster và kiểm thử.

Implement E03–E06: list/detail/create/patch thảm họa. Miền nghiệp vụ ACTIVE → RESOLVED,
không reopen; trường kiểm tra dữ liệu theo hợp đồng. Người dân chỉ đọc; điều phối viên tạo/sửa.
DTO riêng, app use cases/ports, JPA bộ chuyển đổi, bản chuyển đổi lược đồ theo sổ, không DB-first generic CRUD.
Implement công khai Disaster tầng ứng dụng hợp đồng đã chốt ở P00 để B2 kiểm tra ID và
trạng thái; interface/DTO framework-independent. Không expose JPA entity/repository.
Không phụ thuộc Reporting/Rescue để quyết định kết thúc và không mở điểm cuối API mới.

Implement S05: danh sách, filter/phân trang, chi tiết khung, create/edit/resolve biểu mẫu,
confirmation với thao tác kết thúc, loading/error/empty/401/403/409, thích ứng kích thước màn hình cơ bản.
API thật, dùng fetch/auth/component convention từ P01; export định tuyến đúng convention,
gửi bàn giao người 1 để gắn router nếu cần. Không trùng lặp global CSS/auth/client.

Kiểm thử miền nghiệp vụ transition/validation, permissions cho tất cả ghi methods, công khai
hợp đồng missing/resolved, migration/persistence thật và UI form/error phù hợp.
Chạy ứng dụng phía máy chủ xác minh + giao diện các kiểm tra, thử UI thật nếu công cụ có sẵn. Bàn giao C1
phải cho B2 biết chính xác công khai hợp đồng đã hợp nhất và cách dùng màn hình tạo thảm họa.
Không tạo dữ liệu mẫu người dùng mới hay implement API verification thuộc người 2.

## B2 — Duyệt, rút và lọc không gian (người 2)

Điều kiện: B1 và C1 đã hợp nhất. Sở hữu Reporting; không sửa Disaster hạ tầng.

Implement E10 PATCH /api/reports/{id}/verification: điều phối viên only; PENDING → VERIFIED
với thảm họa ACTIVE qua công khai hợp đồng, hoặc REJECTED với lý do; không duyệt lại.
Implement E11 DELETE: người dân chủ báo cáo + PENDING, soft-delete; GET bình thường
không lộ báo cáo đã rút. Chốt đúng behavior retry/not found/409 theo P00.
Hai giao dịch verify/delete đồng thời phải cho trạng thái nhất quán; dùng lạc quan
version/locking phù hợp, ánh xạ xung đột 409 thay vì 500. Không chỉ kiểm tra UI.

Hoàn thiện E08 lọc lat/lon/radiusMeters bằng PostGIS, kiểm tra tính hợp lệ đủ bộ/giới hạn,
khoảng cách theo mét và phân trang ở DB. Thêm spatial index đúng truy vấn; không load
toàn bộ để lọc trong Java. Kiểm thử tọa độ gần/xa/biên, invalid/missing params, kết hợp
lọc với quyền sở hữu không lộ dữ liệu người dân khác.
Implement ReportingQuery/ReportSnapshot đúng signature P00 cho Rescue: reporterId,
trạng thái, Optional<LinkedDisaster> và theo lô truy vấn. Missing/soft-deleted trả Optional.rỗng,
theo lô bỏ key; không thêm deleted flag/tombstone hoặc trả thực thể, không gọi ngược Rescue.
Chỉ VERIFIED có linked thảm họa; bản đồ enum của Disaster sang enum thuộc Reporting.

B1 đã có V4 với PENDING-only constraint và disaster_id chỉ NULL. Đối chiếu V4/code,
thiết kế bản chuyển đổi lược đồ mới cho state/link/verification/withdrawal/index cần thiết; không
chỉ thêm cột rồi để constraint cũ chặn VERIFIED. Giữ ảnh chụp dữ liệu count/items của E08.
Version nội bộ để tranh chấp đồng thời không tự trở thành expectedVersion trong E10/E11 HTTP.
Gửi method/role E10/E11 và OpenAPI slice cho Người 1 tích hợp policy môi trường triển khai.

Kiểm thử states/role/ownership, invalid thảm họa, resolved thảm họa, xác minh vs rút báo cáo
tranh chấp đồng thời trên PostGIS thật, công khai hợp đồng và hồi quy B1. Không sửa bản chuyển đổi lược đồ
đã áp dụng; thêm bản chuyển đổi lược đồ mới cho trường/index theo sổ.
Chạy xác minh; bàn giao B2 cho C2/B3/D1 gồm DTO/error codes/contract signatures và bằng chứng.
Không implement màn hình điều phối viên vì C2 sở hữu.

## D1 — Rescue ứng dụng phía máy chủ và chống phân công trùng (người 4)

Điều kiện: C1/B2 đã hợp nhất; sở hữu com.gdrn.rescue và tests/migrations được cấp.

Implement E12 GET /api/rescue-teams; E13 POST /api/rescue-missions;
E14 GET /api/rescue-missions; E15 PATCH /api/rescue-missions/{id}/status.
RescueTeam tạo dữ liệu mẫu chỉ cấu hình trình diễn, idempotent; không CRUD đội, không tạo dữ liệu mẫu điểm cuối API.
Mission lấy report/owner/status/disaster qua Reporting công khai hợp đồng; chỉ báo cáo
VERIFIED chưa có nhiệm vụ, thảm họa ACTIVE ở kiểm tra nghiệp vụ mới được phân công.
Không truy cập reporting/disaster table, thực thể hoặc kho mã trực tiếp.
Nhiệm vụ đã tồn tại được hoàn thành kể cả thảm họa sau đó RESOLVED.

Miền nghiệp vụ ASSIGNED → IN_PROGRESS → COMPLETED, không cancel/reassign. Mỗi báo cáo tối đa
một nhiệm vụ; mỗi đội chỉ một active nhiệm vụ. Enforce ở DB (unique báo cáo tham chiếu,
chỉ mục duy nhất có điều kiện cho đội đang active hoặc cách khóa có bằng chứng tương đương).
Transaction application/service phù hợp với kiến trúc; bản đồ xung đột thành 409 ổn định.
Không lộ persistence exception. Authorize điều phối viên cho đội list/create/update;
nhiệm vụ danh sách người dân chỉ theo báo cáo owner thực sự, kể cả khi truyền reportId khác.
E14 bắt buộc reportId với người dân và kiểm tra tính hợp lệ khả năng hiển thị qua ReportingQuery trước
lọc nhiệm vụ, kể cả danh sách rỗng; thiếu reportId trả400 theo P00. Gửi policy
E12–E15/OpenAPI slice cho Người 1 ghép cấu hình chung, không tự permitAll future APIs.
List có page/filter; avoid N+1 qua hợp đồng theo lô hoặc chiến lược đã thống nhất.

Kiểm thử miền nghiệp vụ vòng đời và quyền; tích hợp tranh chấp đồng thời bằng hai giao dịch thực
với barrier/latch: cùng team/khác báo cáo, cùng report/khác đội, một success/một409;
đội dùng lại được sau completed nhưng báo cáo cũ không tạo nhiệm vụ mới. Assert DB
không tồn tại phân công bất hợp lệ. Không dùng sleep kiểm thử không ổn định để giả tranh chấp.
Kiểm thử E14 người dân isolation và missing/deleted/rejected báo cáo. Không mở rộng phạm vi
tự động điều phối. Chạy xác minh, bàn giao D1 cho D2/B3 và người 1.

## B3 — Hai màn hình người dân (người 2)

Đọc thêm docs/design/GDRN_UI_DESIGN_SYSTEM.md và bàn giao UI01-A. Sở hữu
frontend/src/features/reporting-citizen và kiểm thử. P01/B1/UI01-A phải đã hợp nhất.
Nếu B2 hoặc D1 chưa hợp nhất, chỉ làm phần gửi/xem, ghi B3 IN_PROGRESS; không giả lập
verification/withdraw/mission và không tuyên bố hoàn tất. Tiếp tục khi phụ thuộc có.

Implement S02 /reports/new và S03 /my-báo cáo bằng API thật: biểu mẫu có label/validation
tọa độ/nội dung, đang tải chống gửi lặp từ UI, báo lỗi rõ, thành công chuyển tới báo cáo.
Danh sách phân trang/refresh/status, chi tiết khung, rút báo cáo PENDING với confirmation.
Tiến độ rescue lấy từ E14?reportId=... khi có D1, không thêm điểm cuối API và không buộc
Reporting gọi ngược Rescue. Hiển thị báo cáo chưa có nhiệm vụ là trạng thái bình thường.
Giữ auth/token/client ở mô-đun chung, không lưu token hoặc báo cáo riêng vào lưu trữ
không cần thiết. Clear riêng tư UI trạng thái khi logout/401; xử lý 404/409 và làm mới.
Chỉ dùng bản đồ chọn/xem vị trí theo bổ sung UI vị trí trong danh mục; không tạo bản đồ riêng,
upload/dashboard. Đảm bảo dùng được trên màn hình hẹp và bàn phím.
Tái sử dụng semantic tokens/shared thành phần từ UI01-A, thể hiện Người dân luồng ít áp
lực nhận thức; không nhân bản theme, global CSS, API máy khách hoặc tự thêm UI library.
Kiểm tra 360/768/1280px, tiêu điểm-hiển thị, reduced motion và tương phản theo design spec.

Kiểm thử biểu mẫu invalid, submit success/failure, danh sách empty/loading/error, rút báo cáo xung đột,
nhiệm vụ trạng thái. Kiểm thử doubles chỉ cho kiểm thử. Trình duyệt kiểm tra nhanh với hai người dân nếu công cụ
có sẵn, không tuyên bố isolation ứng dụng phía máy chủ chỉ từ việc ẩn nút.
Export/gắn định tuyến theo quyền sở hữu, kiểm tra điều hướng sau tích hợp người 1. Run giao diện
typecheck/test/build và ứng dụng phía máy chủ xác minh theo quy tắc. Bàn giao B3 gồm điều kiện hoàn tất
B2/D1, ảnh chụp màn hình nếu có, API coverage và luồng còn thiếu. Không sửa auth/router chung
mà không điều phối người 1.

## C2 — Màn hình duyệt báo cáo (người 3)

Đọc thêm docs/design/GDRN_UI_DESIGN_SYSTEM.md và bàn giao UI01-A. Điều kiện
P01/B2/C1/UI01-A đã hợp nhất. Sở hữu frontend/src/features/reporting-operations.
Không viết lại Reporting ứng dụng phía máy chủ; mọi lỗi E08/E09/E10 bàn giao người 2 sửa.

Implement S04 /operations/reports cho AUTHORITY: danh sách phân trang/filter trạng thái,
bộ lọc tọa độ + radiusMeters, chi tiết khung, chọn thảm họa ACTIVE từ E03, approve/reject.
Chọn thảm họa có search/pagination nếu danh sách phân trang; không giả định trang đầu
chứa mọi thảm họa. Validate approve phải có thảm họa, reject phải có lý do theo DTO.
Sau mutation làm mới list/detail đúng; hiển thị 409 khi người khác đã xử lý/rút báo cáo,
không giữ UI trạng thái thành công giả. Không nút "tự duyệt" hoặc bản đồ ngoài phạm vi.

Dùng dùng chung client/layout/auth, định tuyến bảo vệ AUTHORITY nhưng ứng dụng phía máy chủ vẫn là cổng quyền.
Loading/error/empty/confirmation/responsive/keyboard nhãn đầy đủ. Không dùng userId
từ đầu vào để vượt quyền, không tự thay phản hồi hợp đồng.
Tổ chức theo Điều phối viên Operational Workbench, tái sử dụng dùng chung tokens/components;
không nhân bản theme/client hoặc tạo dashboard/KPI. Kiểm tra 360/768/1280px,
tiêu điểm-hiển thị, reduced motion và tương phản theo design spec.
Kiểm thử approve/reject/invalid/filter/409/403, kiểm tra luồng thật người dân gửi → điều phối viên
duyệt → người dân xem VERIFIED. Cập nhật bàn giao C2 và gửi router registration cho người 1.
Run giao diện các kiểm tra + ứng dụng phía máy chủ xác minh; báo rõ nếu công cụ trình duyệt không sẵn sàng.

## D2 — Màn hình điều phối cứu hộ (người 4)

Đọc thêm docs/design/GDRN_UI_DESIGN_SYSTEM.md và bàn giao UI01-A. Điều kiện
D1/B2/UI01-A đã hợp nhất. Sở hữu frontend/src/features/rescue và kiểm thử.

Implement S06 /operations/rescue: danh sách nhiệm vụ phân trang/filter, khung tạo từ báo cáo
VERIFIED và chọn đội qua E12; liên kết từ UI duyệt/report chi tiết nếu owner đã thống nhất.
Dùng APIs thật, lấy danh sách cần chọn đủ phân trang. Team/report đủ điều kiện trên
UI chỉ hỗ trợ trải nghiệm, ứng dụng phía máy chủ D1 vẫn kiểm tra và bảo vệ tranh chấp.
Cho điều phối viên chuyển ASSIGNED → IN_PROGRESS → COMPLETED với trạng thái loading/error,
confirmation phù hợp; không cancel/reassign/CRUD đội hoặc điểm cuối API mới.
Khi 409 team/report đã được phân công, làm mới dữ liệu và báo rõ, không tự thử lại tạo
nhiệm vụ hay giả success. Disable double-submit ở UI, xử lý 401/403/404.

Kiểm thử biểu mẫu, valid chuyển trạng thái, invalid action ẩn/disable, rỗng đội danh sách, thất bại yêu cầu,
409 xung đột. Trình diễn thật hai phiên điều phối viên cùng chọn một đội để đối chiếu máy chủ
không tạo hai active nhiệm vụ; người dân đọc được tiến độ qua UI B3 sau khi hoàn tất.
Giữ layout/router/client convention và thích ứng kích thước màn hình. Chạy giao diện checks/backend xác minh,
ghi bàn giao D2 cùng định tuyến, actions và kết quả trình diễn. Không tự sửa Reporting internals.
Tổ chức theo Điều phối viên Operational Workbench và dùng dùng chung tokens/components; không
nhân bản theme/client hay thêm dashboard/map tổng hợp/drag-drop phân công. Map vị trí
chỉ đọc theo bổ sung UI vị trí trong danh mục. Kiểm tra 360/768/1280px,
keyboard/focus, reduced motion và tương phản theo design spec.

## A1 — Hoàn thiện security và phần UI dùng chung (người 1)

Đọc hệ thống thiết kế và bàn giao UI01-A. Điều kiện UI01-A đã hợp nhất. Chỉ thay đổi
security/shared frontend/root cần thiết, không thay owner mô-đun nghiệp vụ. UI01-A
đã sở hữu theme/primitives/S01; A1 không làm lại hoặc đổi thẩm mỹ hệ thống thiết kế.
Chạy lại phần kiểm tra khi B2/D1 đã hợp nhất trước khi chốt A1 HOÀN TẤT.

Đối chiếu từng E01–E15 với vai trò matrix: đăng nhập công khai, các method/route nghiệp vụ
đúng quyền, quyền sở hữu do tầng ứng dụng của mô-đun kiểm tra, unknown API mặc định từ chối.
Kiểm tra token forged/expired/unsupported vai trò, principal không nhận userId từ thân yêu cầu,
JSON 401/403 nhất quán, không stacktrace/token/password trong phản hồi hoặc nhật ký.
Giữ health/Swagger hoạt động; OpenAPI khai báo Bearer. Không xác thực giả,
generated người dùng, registration hoặc refresh/logout điểm cuối API ngoài phạm vi.

Hoàn thiện dùng chung giao diện behavior: nav theo vai trò, bảo vệ, handling 401/403, tab-scoped
phiên token,
clear user-specific trạng thái khi đăng xuất; không biến giao diện vai trò bảo vệ thành security
duy nhất. Ghép tính năng định tuyến exports đã sẵn sàng, thống nhất error/loading/empty/form
behavior trên primitives UI01-A, không copy mô-đun screens hoặc viết lại design/CSS
người khác không cần thiết. Thiếu primitive mới thì bổ sung nhỏ, có bên sử dụng thật và
document trong bàn giao; không mở rộng thành UI thư viện nền tảng riêng.
Kiểm tra proxy/CORS chỉ cấu hình cần thiết theo môi trường, không mở wildcard thông tin xác thực.

Thêm kiểm thử tập trung các lỗ hổng thực tế; cập nhật security ADR với behavior reload,
token TTL/logout không revoke và CSRF choice. Chạy đầy đủ backend/frontend các kiểm tra.
Ghi A1 bàn giao các endpoints đã kiểm tra và endpoints chưa hợp nhất còn cần rà soát;
không đánh dấu toàn bộ security đạt nếu chưa có các API để kiểm tra.

## A2 — Docker giao diện, CI và cách chạy thống nhất (người 1)

Đọc design system/handoff UI01-A. P01 và UI01-A đã hợp nhất; sở hữu Docker/Compose/CI/
gốc env/frontend biên dịch configuration. Không sửa giao diện tính năng trong công việc này.

Thêm giao diện container multi-stage: npm ci + môi trường triển khai biên dịch, phục vụ static SPA,
history phương án dự phòng và proxy /api tới ứng dụng phía máy chủ qua Docker network. Không API gateway
platform, không SSR; trình duyệt không dùng hostname container như URL công khai.
Giao diện API đường dẫn tương đối /api. Không bake JWT secret/demo password vào gói,
chỉ ứng dụng phía máy chủ giữ secrets. Compose có frontend/backend/database, volume DB và sức khỏe
các kiểm tra hợp lý. Giữ các cổng hiện có configurable; thêm FRONTEND_PORT riêng và cập nhật
env.example, không ghi đè .env cá nhân hoặc publish dịch vụ ra Internet.

Pin Node tương thích P01 và lockfile; CI chạy ứng dụng phía máy chủ clean xác minh với Docker,
giao diện npm ci/typecheck/test/build, kiểm tra tính hợp lệ Compose và biên dịch ảnh. Sau X2 có
tập lệnh E2E, thêm CI tác vụ chạy với API/DB thật, secrets kiểm thử sinh tạm và dọn dẹp.
Không đánh dấu A2 hoàn tất phần E2E trước khi X2 cung cấp phần triển khai.
Sau lượt khi chạy, ghi A2 IN_PROGRESS kèm commit phần đã hợp nhất và kiểm tra nhanh results để
X1 dùng. Sau X2, tiếp tục cùng A2 để ghép CI E2E và mới xét HOÀN TẤT; không tạo công việc mới.

Cập nhật hướng dẫn tiếng Việt cho clone sạch, hai cách dev, tạo dữ liệu mẫu cấu hình trình diễn,
export env, start/stop, health/Swagger/frontend, kiểm thử; phân biệt cổng host/container.
Thử build/up/health bằng cấu hình cục bộ; kiểm tra reload định tuyến sâu SPA và /api trả JSON
không bị phương án dự phòng HTML. Không xóa volume dữ liệu để làm startup xanh.
Ghi bàn giao A2 với lệnh thực chạy, các cổng, ảnh, CI coverage và việc cần X2 bổ sung.

## X1 — Tích hợp luồng thật, đóng băng tính năng (người 1 điều phối)

Đọc hệ thống thiết kế và bàn giao UI01-A/UI01-C1/UI01-B. Điều kiện UI01-B, A1 và A2 phần
khi chạy đã hợp nhất; UI01-B đã xác nhận đủ B3/C2/D2/UI01-C1. Đọc bàn giao từng công việc và diff trước
khi sửa. Không regenerate mô-đun hoặc triển khai tính năng ngoài 15 API/6 màn hình.

Chạy stack thật. Kiểm tra hai người dân + một điều phối viên từ trình diễn bootstrap; chuỗi:
người dân gửi báo cáo → điều phối viên tạo thảm họa ACTIVE → xác minh báo cáo → phân đội →
IN_PROGRESS → COMPLETED → người dân thấy tiến độ. Thử người dân khác đọc/rút báo cáo không
thuộc mình, rút báo cáo PENDING, xác minh REJECTED, xung đột phân đội và expired phiên.
Đối chiếu OpenAPI khi chạy với hợp đồng và giao diện clients; sửa mismatch nhỏ đúng owner,
ghi công việc rõ cho owner khi liên quan business, không sửa mọi thứ tập trung trong dùng chung.

Kiểm tra routes/nav, lỗi messages, fields/timezones, pagination/dropdown nhiều trang,
không console error/API giả/secret hoặc internal thực thể trên HTTP. Sửa chặn trình diễn trước,
không thêm charts/map ngoài phạm vi UI vị trí/animation. API chưa có UI phải được hoàn thiện trong screen owner.
Tạo docs/qa/phase1-integration-checklist.md và cập nhật progress/handoff X1 với bằng chứng
thật. Nếu không điều khiển được trình duyệt thì không tự đánh dấu UI đạt; để danh sách kiểm tra
cho nhóm chạy và chỉ báo phần đã kiểm tra bằng công cụ.
Chạy clean xác minh và giao diện các kiểm tra, Docker config/build/start cần thiết.
Chốt tính năng freeze chỉ khi luồng thật hoạt động; X2/C3/D3 sau đó mới lấy số đo cơ sở ổn định.

## X2 — E2E frontend/backend và hồi quy (người 2, người 1 ghép CI)

Đọc hệ thống thiết kế và bàn giao UI01-B. Điều kiện X1. Dùng trình duyệt kiểm thử thư viện nền tảng đã có;
kho mã đã có Playwright từ P01/C1, vì vậy tái sử dụng cấu hình hiện tại; chỉ phối hợp
người 1 chỉnh dùng chung lockfile/config khi có nhu cầu thật, không tạo thư viện nền tảng kiểm thử trùng.
Nếu trạng thái mã nguồn sau hợp nhất khác, kiểm tra trước khi thêm phụ thuộc.

Viết trình duyệt E2E với giao diện → ứng dụng phía máy chủ → PostGIS thật, không intercept/mock API
nghiệp vụ trong các kiểm thử acceptance. Dataset/credentials kiểm thử riêng từ env, dọn dẹp
chỉ trên môi trường kiểm thử, không xóa cơ sở dữ liệu cục bộ người dùng. Tách contexts cho hai
người dân và điều phối viên; selectors theo role/label/testid, không sleep để che flakiness.

Bao phủ 6 màn hình và luồng X1; permission/ownership bằng API và trình duyệt, đăng nhập sai,
phiên hết hạn, đầu vào invalid, pending rút báo cáo, reject, phân đội, tiến độ người dân,
409 khi dữ liệu bị thay đổi. Race correctness chính dùng D1 kiểm thử tích hợp;
E2E kiểm tra người dùng thấy lỗi và làm mới đúng, không thay thế kiểm thử giao dịch.
Sau đăng xuất không còn dữ liệu riêng từ người dùng trước. Kiểm tra vùng nhìn desktop/mobile
cơ bản, thêm 360/768/1280 theo UI acceptance khi khả thi, label/keyboard/focus và
reduced motion các luồng quan trọng; không đặt yêu cầu pixel-perfect lớn.

Cung cấp tập lệnh chạy/fixture/ports, trace khi fail không lộ token, phối hợp A2 đưa
vào CI với services thật. Chạy suite thật, ứng dụng phía máy chủ xác minh và giao diện các kiểm tra.
Phân loại lỗi app vs kiểm thử vs môi trường; sửa đúng owner/phạm vi, không bỏ qua flaky kiểm thử
để lấy xanh. Bàn giao X2 ghi số kiểm thử, command/output thật và gate chưa chạy được.

## D3 — Benchmark tái lập và Kaggle CPU (người 4)

Làm kiểm tra nhanh kiểm tra môi trường từ D10; số đo chính thức chỉ sau X1 trên commit ổn định.
Sở hữu đo hiệu năng/ và docs/benchmark/, không tối ưu kiến trúc hoặc thêm Redis/broker.

Viết k6 workloads E07 ghi báo cáo, E08 đọc phân trang, E08 lọc bán kính. Cấu hình
base URL/credentials/VUs/duration/data tạo dữ liệu mẫu bằng env; không hardcode môi trường triển khai URL
hoặc bí mật, không đo hiệu năng điểm cuối API không tồn tại. Ghi bộ dữ liệu size/distribution,
pagination/query mix, làm nóng, lần lặp, đặt lại giữa lượt chạy trên DB đo hiệu năng riêng.
JWT lifetime/login setup phải được tính đúng; không đếm expired-token failures là
điểm nghẽn miền nghiệp vụ, không bỏ lỗi khỏi báo cáo. Không thêm điểm cuối API tạo dữ liệu mẫu vào tầng ứng dụng.

Lập kiểm tra nhanh → 10/50/100 VU nếu máy cho phép; nêu lý do thay mức tải khi có bằng chứng.
Ghi thông lượng, p50/p95/p99/error rate, CPU/RAM khi đo được; lưu raw k6 results,
tập lệnh, cấu hình máy, commit, start/end, generator/server/DB cấu trúc triển khai và giới hạn.
Không claim performance benefit nếu chưa có before/after. Không tăng delay giả tạo.

Kiểm tra khả năng chạy Kaggle CPU theo tiêu chí đánh giá trong context: generator-only khác
máy chủ-on-Kaggle. Không giả định có Docker daemon; thử Java/PostGIS/network khả dụng,
viết notebook/hướng dẫn có thể tái lập. Nếu thiếu account/tool/access thì chuẩn bị
tệp kết quả và báo đúng bước nhóm cần chạy; cục bộ results chỉ là số đo cơ sở cục bộ, không
đánh dấu Kaggle hoàn tất. Không tự publish DB/service/tunnel để truy cập từ Kaggle.

Tạo báo cáo với điểm nghẽn quan sát được, dữ liệu thô và candidate Pha 2 dưới dạng
giả thuyết, không triển khai candidate. Chạy tập lệnh kiểm tra nhanh và kiểm tra biên dịch theo
CONTRIBUTING.md; bàn giao D3 ghi rõ phép đo thực hiện vs chỉ chuẩn bị, mọi tiêu chí chưa đạt.

<a id="c3"></a>
## C3 — Tài liệu, tiêu chí đánh giá và kịch bản trình diễn (người 3)

Điều kiện X1; đọc code/handoff thực tế, bổ sung kết quả X2/D3 khi có. Không implement
tính năng mới. README/context hiện có thể khác mã nguồn, kiểm tra trước khi cập nhật.
Đọc hệ thống thiết kế và UI01 handoffs; mô tả nó là quyết định UX của giao diện hiện tại,
không gọi nó là mô-đun kiến trúc hoặc tính năng nghiệp vụ mới.

Cập nhật README, hướng dẫn clone/run tiếng Việt, kiến trúc overview, C4 context
và container/component diagram vừa đủ cho nguyên khối theo mô-đun + SPA + DB. Ghi rõ
implemented/planned, mô-đun phụ thuộc thực tế, JWT tradeoffs, transactions/concurrency,
PostGIS, Flyway, test/CI, cơ sở dữ liệu model phát sinh từ miền nghiệp vụ; không vẽ vi dịch vụ.
Cập nhật ADR trạng thái theo quyết định đã làm, không rewrite lịch sử trái thực tế.

Tạo docs/qa/phase1-rubric.md ánh xạ từng tiêu chí context (GET/POST/DELETE, protected
GET/POST, login/filter, ORM, miền nghiệp vụ isolation, Swagger, Docker, GitHub công khai, commit
history, Kaggle đo hiệu năng) tới file/test/demo bằng chứng. Chưa kiểm tra/chưa đạt ghi rõ,
không tự công khai kho mã hay bịa liên kết kết quả/commit. Đối chiếu tiêu chí đánh giá giảng viên nếu nhóm
đã cung cấp; tài liệu context không thay cho đề bài ngoài kho mã chưa được đọc.

Viết trình diễn 8–10 phút với tài khoản lấy từ env, bước và expected result trên 6 màn hình;
có case cross-user denied, pending rút báo cáo, phân công xung đột và hoàn thành nhiệm vụ.
Hướng dẫn đặt lại chỉ môi trường demo/test có xác nhận dữ liệu disposable, không đưa
down -v thành lệnh khởi động thường ngày. Rehearsal theo công cụ có sẵn, ghi bước chưa chạy.
Liên kết đo hiệu năng D3, không tự điền số. Bàn giao C3 và tiến độ; chạy các kiểm tra theo CONTRIBUTING.md.

<a id="a3"></a>
## A3 — Kiểm tra cuối và bàn giao Pha 1 (người 1)

và mọi bàn giao P01/B1/B2/B3/C1/C2/C3/D1/D2/D3/A1/A2/UI01-A/UI01-C1/UI01-B/X1/X2.
Prerequisite phải hợp nhất. Đọc hệ thống thiết kế và acceptance UI đã rà soát.
Đây là final kiểm tra, không thêm tính năng, không bắt đầu Pha 2, không tự tag/push/deploy.

Kiểm tra từ checkout/clone sạch có thể chạy frontend/backend/PostGIS theo docs với
env tự tạo; không dựa vào được Git bỏ qua cache/secret/artifact của máy cũ. Giữ dữ liệu của
checkout chính, không xóa volume đang dùng. Xác nhận migrations từ DB rỗng và upgrade
đúng thứ tự, trình diễn bootstrap idempotent, 15 endpoint/6 màn hình đúng quyền và đầy đủ UI.

Chạy ứng dụng phía máy chủ clean xác minh đầy đủ, giao diện npm ci/typecheck/test/build, trình duyệt E2E,
Docker config/build/up/health và luồng trình diễn. Kiểm tra architecture/JPA leak/module cycle,
quyền sở hữu, tranh chấp đồng thời bằng chứng, tokens/secrets in logs/bundles, security method matrix.
Không bỏ gate hoặc bỏ kiểm thử tích hợp vì mất Docker; báo trở ngại và dừng kết luận HOÀN TẤT.
Rà README/rubric/ADRs và raw đo hiệu năng, Kaggle requirements vs bằng chứng, công khai kho mã
trạng thái nếu có quyền đọc, commit history; không nhận "tập lệnh đã viết" là "đã đo".

Sửa lỗi nhỏ trong phạm vi sở hữu; giao lỗi mô-đun cho owner bằng bàn giao rõ, không
đổi hợp đồng phút cuối không rà soát. Retest phần bị ảnh hưởng sau sửa.
Tạo docs/qa/phase1-final-audit.md: PASS/FAIL/NOT RUN cho từng tiêu chí, commands/results,
commit ứng viên, known giới hạn, bước chạy lại và nhiệm vụ còn thiếu.
Chỉ đánh dấu Pha 1 HOÀN TẤT nếu toàn bộ acceptance gate bắt buộc có bằng chứng thật.
Nếu bị chặn thì ghi phần đã đạt và trở ngại; không gọi completion khi hết thời gian.
Ghi bàn giao A3 và báo cáo bàn giao ngắn cho nhóm, không thực hiện Pha 2.

<a id="ui-vi-tri-sau-c2-d1"></a>
## UI vị trí sau C2/D1 — kế hoạch và nhiệm vụ bổ sung

### Nền hiện tại và giới hạn

Nền đã rà soát `888996a`: S01, S04 (C2), S05 (C1/UI01-C1), E01–E15 và V1–V6 có mã nguồn.
B3/S02–S03 và D2/S06 chưa có; không lấy việc D1 hoàn tất làm bằng chứng UI Rescue đã có.
[Rà soát tích hợp C2](qa/c2-post-merge-review.md) ghi các kiểm tra và giới hạn thực tế.
S04 hiện nhập tâm/bán kính bằng số; S05 nhập tọa độ bằng số; chi tiết chỉ hiện cặp số.
Giữ cả ba cách nhập/chọn/xem ở cùng tính năng, không tạo định tuyến bản đồ thứ bảy.

Phạm vi được lập kế hoạch: MapLibre GL + MapTiler vector style, một điểm được chọn, xem trước vị trí,
vòng tròn bán kính. Không routing, geocoding/autocomplete/reverse geocoding, GPS tự động,
cluster, heatmap, polygon, theo dõi đội, bản đồ tất cả báo cáo hoặc cache/offline ô bản đồ.
Không thêm ứng dụng phía máy chủ endpoint/schema/migration; không đổi 15 operations/6 screens,
vai trò, DTO, vòng đời, PostGIS bán kính hay ranh giới mô-đun. Đây là UI Pha 1, không
phải quyết định chuyển kiến trúc Pha 2. Không hứa ngày giao khi chưa có năng lực nhóm.

### Thứ tự, owner và điều kiện hoàn tất

Các hàng là phần tiếp tục của công việc hiện có, không phải công việc danh mục thứ hai.

| Thứ tự | Công việc / owner | Đầu vào | Kết quả / gate |
| --- | --- | --- | --- |
| 1 | UI01-A bổ sung / Người 1, phối hợp Người 3 | Shared UI đã hợp nhất; S05 là bên sử dụng thật | Component tọa độ dùng chung, dependency/tiles cấu hình, tích hợp tối thiểu S05 để chứng minh; rà soát bởi Người 3 |
| 2 | UI01-C1 + C2 bổ sung / Người 3 | Phần UI01-A bổ sung đã hợp nhất | S05 chọn điểm + xem trước; S04 chọn tâm/vòng bán kính và xem trước chi tiết; giữ toàn bộ acceptance cũ; bàn giao cập nhật |
| 3 | B3 / Người 2 | B1/B2/D1/UI01-A đã hợp nhất; thành phần bản đồ đã hợp nhất trước phần bản đồ | S02 dùng picker, S03 xem trước chỉ đọc; hoàn tất gửi/xem/rút/mission như B3 gốc |
| 4 | D2 / Người 4 | D1/B2/UI01-A; thành phần bản đồ đã hợp nhất trước phần bản đồ | S06 xem trước báo cáo từ API Reporting; phân công/chuyển trạng thái vẫn theo D2 gốc |
| 5 | UI01-B → X1 → X2 / owners gốc | B3/D2 và phần bổ sung UI01-A/UI01-C1/C2 đã hợp nhất | Kiểm tra đủ 6 màn hình + phương án dự phòng bản đồ; luồng thật xuyên suốt và hồi quy CI |

B3/D2 có thể làm phần nghiệp vụ trước khi thành phần bản đồ sẵn sàng, không cần đợi để
bắt đầu công việc. A1/A2 tiếp tục theo phụ thuộc cũ; không chạy lại bootstrap hoặc dừng
hoàn thiện màn hình để mở rộng bản đồ. Phần số đo cơ sở HOÀN TẤT giữ bằng chứng lịch sử;
phần bổ sung TODO chỉ chuyển HOÀN TẤT khi có tests/handoff/merge bằng chứng riêng.
UI01-B/X1 phải kiểm tra thêm phần bổ sung; không kéo lại phụ thuộc cho số đo cơ sở.

### Thiết kế kỹ thuật và hành vi bắt buộc

- Người 1 sở hữu dependency/lockfile và `frontend/src/shared/location/` (chỉ tạo khi
  implement với bên sử dụng thật); không đưa business/API máy khách của mô-đun vào đó.
  Dùng MapLibre GL trực tiếp với React vòng đời và worker URL tương thích Vite đã kiểm chứng;
  pin phiên bản trong lockfile sau kiểm tra Node/React hiện tại. Không dùng CDN tập lệnh.
- Model thành phần: giá trị `{latitude, longitude}` hoặc chưa chọn; callback đổi điểm,
  disabled/readOnly, tùy chọn `radiusMeters`. Tên công khai cuối cùng ghi trong bàn giao.
  Parent giữ trạng thái; không có hai nguồn tọa độ độc lập. Hủy event/map instance khi
  unmount, không tạo trùng trong StrictMode; resize đúng khi panel/dialog xuất hiện.
- Giữ hai đầu vào số có nhãn làm phương án dự phòng và hỗ trợ bàn phím. Click bản đồ cập nhật
  điểm, đầu vào hợp lệ cập nhật ghim. Không biến chuỗi rỗng thành 0; (0,0) là tọa độ hợp lệ.
  Giữ WGS84 và miền lat/lon P00; không đảo trục hoặc làm tròn dữ liệu lúc submit.
  Tâm bản đồ mặc định chỉ để xem, **không tự trở thành vị trí đã chọn**.
- S05: chọn điểm trong biểu mẫu create/edit ACTIVE; xem trước trong chi tiết; RESOLVED giữ
  chỉ đọc và expectedVersion/409 hiện tại. Không tự lưu khi kéo/bấm ghim.
- S04: bản đồ tâm lọc có trạng thái draft; nút Áp dụng mới gọi E08, đặt lại trang=0; Xóa bộ lọc
  xóa đủ status/tâm/radius và ghim/vòng. Khi paginate giữ lọc đã áp dụng, không
  gửi tọa độ draft. Radius integer 1–100000 mét; nếu UI dùng km phải chuyển chính xác
  sang `radiusMeters`. Vòng tròn chỉ minh họa; ứng dụng phía máy chủ PostGIS quyết định kết quả.
- Preview báo cáo được chọn là chỉ đọc, tách biệt tâm lọc. Đổi selection/filter
  phải bỏ marker dữ liệu cũ; không dựng bản đồ toàn bộ bộ dữ liệu từ một trang E08.
  Không tự chọn thảm họa bằng khoảng cách. E03 selector vẫn ACTIVE + phân trang.
- S06 lấy tọa độ từ báo cáo E09 hoặc dữ liệu E08 đã tải; không thêm tọa độ vào Mission
  DTO hay giả định đội có vị trí GPS. Chỉ hiển thị liên kết S04 → S06 khi định tuyến D2 thật
  đã có; mang `reportId`, kiểm tra lại E09/quyền/status, không tự phân công.
- Tile failure/timeout/mất mạng: hiển thị trạng thái + thử lại, giữ đầu vào, quyết định,
  phân trang và các API còn hoạt động. Lazy-load bản đồ, không mount bản đồ ở từng danh sách item.
  Không gửi token, reporterId, nội dung báo cáo hay thông tin tài khoản sang ô bản đồ máy chủ.
  Map SDK/tiles không đi qua dùng chung authenticated `/api` máy khách.
- Config công khai `VITE_MAPTILER_KEY`, `VITE_MAP_STYLE_URL`, `VITE_MAP_ATTRIBUTION`; chỉ phục vụ
  bản đồ bên cung cấp, không thay `API_PROXY_TARGET`. Mọi biến `VITE_*`, kể cả trình duyệt API key,
  đều nhìn thấy ở máy khách: key thật chỉ nằm trong env bị ignore và phải giới hạn theo HTTP origin.
  Style custom phải dùng HTTPS và có ghi nguồn bản đồ. Trình duyệt tải style/tiles trực tiếp, không qua
  `/api`; luôn hiển thị ghi nguồn bản đồ và dùng bộ nhớ đệm HTTP tiêu chuẩn, không bulk/offline tải xuống.
  A2 ghi cấu hình biên dịch giao diện và cách đổi bên cung cấp; không thêm proxy/backend API.
- Trạng thái vị trí riêng theo form/session; clear khi logout/401. Bàn phím, tiêu điểm,
  touch, 360/768/1280px, reduced motion và tương phản giữ hệ thống thiết kế. Không để
  bản đồ bắt cuộn/tab làm người dùng không tiếp tục được biểu mẫu; không nhúng text báo cáo
  trực tiếp làm HTML popup. Dữ liệu không có địa chỉ thì không bịa nhãn địa chỉ.

### Ma trận giữ chức năng và acceptance

| Luồng | Acceptance sau thay UI |
| --- | --- |
| Auth/S01 | Đăng nhập cả hai vai trò, landing/nav, reload/logout, expiry/401; không lộ trạng thái phiên trước |
| S05/E03–E06 | List/detail, create/edit, ACTIVE→RESOLVED, phiên bản xung đột, selector/pagination vẫn hoạt động |
| S04/E08–E10 | Status + đủ bộ bán kính, reset/page; chọn thảm họa ngoài trang 1; verify/reject Unicode; confirmation/double-submit |
| S04 lỗi/race | 403 khóa quyết định; 404 bỏ dữ liệu bị rút; 409 refetch, không success giả hoặc thử lại ghi; phản hồi cũ không ghi đè selection |
| B3/E07–E11/E14 | Gửi tọa độ đã xác nhận; ownership/rút PENDING; báo cáo chưa nhiệm vụ hiển thị bình thường; bản đồ không chặn tiến độ |
| D2/E12–E15 | Chọn report/team đủ phân trang; conflicts, ASSIGNED→IN_PROGRESS→COMPLETED; sau RESOLVED nhiệm vụ cũ vẫn hoàn tất |
| Map | Click/input đồng bộ, blank/0/biên/invalid, bán kính đúng mét, draft vs applied, chỉ đọc, ô bản đồ fail, unmount/logout/StrictMode |

Unit/component kiểm thử có thể giả lập map/tiles, phải xác nhận payload API không đổi. Trình duyệt
acceptance dùng backend/DB thật; chỉ được stub ô bản đồ transport trong kiểm thử lỗi bản đồ,
không giả lập API nghiệp vụ. Chạy riêng kiểm tra nhanh trực tuyến xác nhận ô bản đồ và ghi nguồn bản đồ,
không tính ô bản đồ bên cung cấp uptime vào đo hiệu năng ứng dụng phía máy chủ. Có kiểm thử phương án dự phòng khi chặn
ô bản đồ máy chủ nhưng submit/filter/decision vẫn dùng được. Nếu thiếu browser/network
thì ghi CHƯA CHẠY, không bỏ kiểm tra hoặc coi placeholder bản đồ là ĐẠT.
Mỗi owner chạy giao diện typecheck/test/build, trình duyệt liên quan và `mvnw.cmd clean verify`.
X2 ghép hồi quy bản đồ vào CI sau khi phần triển khai có; giữ suite hiện tại.
