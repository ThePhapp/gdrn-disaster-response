# Hợp đồng HTTP/UI Pha 1 — P00

**Mở rộng DS1:** người dùng đã yêu cầu Dashboard thống kê. Hợp đồng bổ sung
[E16/S07](dashboard-contract.md) áp dụng trên nhánh `feat/dashboard-statistics`;
khi chạy gồm 16 operations/7 màn hình. P00 YAML và nội dung bên dưới giữ số đo cơ sở
15 operations/6 màn hình để bảo toàn lịch sử; câu bảng thống kê ngoài phạm vi chỉ áp dụng
số đo cơ sở, được ngoại lệ DS1 trong danh mục thay thế cho đúng tính năng này.

Môi trường chạy đối chiếu `888996a`: E01–E15 và S01/S04/S05 đã có;
C2 hợp nhất `120dec8`, D1 hợp nhất `e380d68` + fix `888996a`. E08 hỗ trợ đủ
lat/lon/radiusMeters cùng các lọc trước. YAML giữ số đo cơ sở đích 15 thao tác;
Swagger khi chạy công bố E01–E15. S02/S03/S06 chưa có; UI bản đồ mới là kế hoạch.
Xem [rà soát C2](../qa/c2-post-merge-review.md) và [tiến độ](../phase1-progress.md).

Đây là số đo cơ sở đích; trạng thái khi chạy được ghi ở
đầu tài liệu và theo bàn giao từng công việc. Chuẩn máy đọc là
[OpenAPI 3.0.3](phase1-contract.yaml); quy tắc có điều kiện dưới đây cũng là yêu cầu
bắt buộc. Nếu cần đổi, cập nhật cả YAML, tài liệu và bàn giao, để producer/consumer
rà soát trước khi hợp nhất. Không tự đổi tên trường để ghép UI.

Nguồn phạm vi: [kế hoạch](../PHASE1_PLAN.md),
[quy tắc chung](../PHASE1_PLAN.md#quy-tac-chung),
[các hợp đồng mô-đun và sổ bản chuyển đổi lược đồ](../architecture/phase1-module-contracts.md),
[ADR 005](../adr/005-phase1-mvp-auth-frontend.md).
P00 giữ nguyên User, EmailAddress, Role và kiểm thử. Chỉ CITIZEN/AUTHORITY hoạt động;
RESPONDER/ADMIN vẫn có trong enum Java, không được seed/cấp quyền/hiển thị UI MVP.

## Quy ước chung

- Base `/api`, JSON UTF-8. Mọi thân yêu cầu là object, trường dư/null bị từ chối 400.
  YAML `required` là bắt buộc; trường phản hồi tùy trạng thái được **bỏ hẳn**, không null.
  Không nhận thân yêu cầu ở GET/DELETE. Query lạ, truy vấn lặp, enum sai case, UUID sai,
  JSON lỗi hoặc thiếu thân yêu cầu bắt buộc =>400. Body sai Content-Type =>415.
- UUID canonical lowercase có dấu gạch; máy chủ sinh ID. ID/filter/body tham chiếu
  không phải bằng chứng quyền. `reporterId`, vai trò, trạng thái khởi tạo, thời gian
  đều do máy chủ quyết định; gửi thêm các trường này bị 400.
- Timestamp ISO-8601 UTC `Z`, độ chính xác tối đa 9 chữ số phần giây; máy khách hiển thị
  theo múi giờ người dùng. Không nhận thời điểm từ máy khách. `updatedAt` bằng thời điểm
  tạo khi chưa sửa. Không có thời điểm tương lai do máy khách đặt.
- Text trim hai đầu trước kiểm tra length, không blank; đếm Unicode mã nguồn points.
  Name 1–120, description 1–2000, rejectionReason 1–500. Không render như HTML.
  Email trim/lowercase `Locale.ROOT`, 3–254, format đúng EmailAddress hiện có.
  Password không trim, 1–128 mã nguồn points và tối đa 72 UTF-8 byte; limit là HTTP/
  thông tin xác thực concern, không thay đổi miền nghiệp vụ kiểm thử. Đăng nhập phản hồi không có password.
- Disaster type/report type: EARTHQUAKE, FLOOD, TYPHOON, WILDFIRE, TSUNAMI.
  Severity chỉ thuộc Disaster: LOW, MODERATE, HIGH, CRITICAL. Không bắt buộc báo cáo
  type bằng thảm họa type; điều phối viên chịu trách nhiệm chọn liên kết.
- Latitude [-90,90], longitude [-180,180], số hữu hạn WGS84. Không đảo thứ tự;
  PostGIS point constructor nhận longitude trước latitude.
- Không có tải lên, register, làm mới, đăng xuất API, CRUD đội, bảng thống kê API, separate
  RescueRequest, alert/resource, event bus, bản đồ ứng dụng phía máy chủ API hay thuật toán ưu tiên.
  Bổ sung UI vị trí 14/10 theo danh mục chỉ chọn/xem tọa độ và minh họa bán kính;
  giữ nguyên wire contract/OpenAPI, không thêm thao tác hoặc trường dữ liệu.

## Phân trang, lọc và sắp xếp

Tất cả collection E03/E08/E12/E14 dùng `page=0`, `size=20`; trang 0–1000000,
size 1–100. Không tự clamp giá trị sai. Trả `{items,page,size,totalElements,totalPages}`,
không expose Spring Page. Empty danh sách và trang vượt cuối trả 200, `items: []`;
`totalPages=ceil(totalElements/size)` (0 nếu không có phần tử).
Count và items phải dùng cùng quyền/filter và cùng ảnh chụp dữ liệu của mỗi yêu cầu.
Không cam kết ảnh chụp dữ liệu xuyên nhiều request/phân trang khi có ghi đồng thời.

Sort một giá trị: E03/E08/E14 `createdAt,desc` mặc định, hoặc `createdAt,asc`;
với nhiệm vụ, createdAt là alias của assignedAt (không thêm trường phản hồi).
E12 `name,asc` mặc định hoặc `name,desc`, so sánh Unicode mã nguồn point của name đã trim.
Luôn thêm `id ASC` khi bằng nhau. Không sắp xếp theo trường tùy ý, không repeated sắp xếp.

| API | Filter tùy chọn (AND) | Không tìm thấy tham chiếu |
| --- | --- | --- |
| E03 | trạng thái, type | Không áp dụng |
| E08 | trạng thái, type, disasterId, lat/lon/radiusMeters | disasterId không tồn tại =>200 rỗng |
| E12 | tình trạng sẵn sàng=AVAILABLE/BUSY | Không áp dụng |
| E14 | reportId, trạng thái, teamId | reportId thiếu thực thể/đã rút/khác owner =>404; teamId không tồn tại =>200 rỗng |

E08 chỉ nhận đủ cả lat/lon/radiusMeters hoặc không nhận cả ba; bán kính integer 1–100000
mét, biên `distance <= radiusMeters`. Tên wire là `radiusMeters` như nhiệm vụ B2/C2;
`radius` trong kế hoạch là cách gọi khái niệm, không phải alias truy vấn được chấp nhận.
PostGIS geography/SRID 4326, lọc tại DB trước trang/
count; không lọc Java hay dùng độ thay mét. Không lọc reporterId. Người dân luôn
chỉ thấy báo cáo của mình và không bao giờ thấy báo cáo đã rút.

E14: `reportId` bắt buộc khi CITIZEN, thiếu =>400; AUTHORITY có thể bỏ. Kiểm tra
báo cáo qua Reporting **trước** lọc nhiệm vụ, kể cả báo cáo chưa có nhiệm vụ. Report
hợp lệ của chính mình chưa được phân công =>200 rỗng; báo cáo người khác =>404 giống
báo cáo không tồn tại. Không trả danh sách toàn bộ nhiệm vụ cho người dân. S03 dùng
E09 và E14?reportId=... riêng biệt; lỗi/empty của tiến độ không làm giả dữ liệu báo cáo.
E09 không chứa nhiệm vụ và tuyệt đối không gọi ngược Rescue.

## Ma trận điểm cuối API / owner / bên sử dụng

Person tương ứng Người trong kế hoạch. Consumer là screen dùng trực tiếp hoặc xác thực
shell của screen. Cả hai vai trò được gọi E03/E04 dù UI MVP chỉ dùng chúng trên S04/S05.
E10 ứng dụng phía máy chủ Người 2; UI S04 Người 3. HTTP success dưới đây là cố định, PATCH trả thực thể
mới nhất sau commit. POST trả thực thể, không yêu cầu Location phần đầu (nhiệm vụ chưa có
chi tiết định tuyến). Không có điểm cuối API thứ 16.

| ID | Method / đường dẫn | Ứng dụng phía máy chủ owner / công việc | Role | Consumer | Success |
| --- | --- | --- | --- | --- | --- |
| E01 | POST /api/auth/login | 1 / P01 | PUBLIC | S01 | 200 |
| E02 | GET /api/auth/me | 1 / P01 | CITIZEN, AUTHORITY | S01, S02, S03, S04, S05, S06 | 200 |
| E03 | GET /api/disasters | 3 / C1 | CITIZEN, AUTHORITY | S04, S05 | 200 |
| E04 | GET /api/disasters/{id} | 3 / C1 | CITIZEN, AUTHORITY | S04, S05 | 200 |
| E05 | POST /api/disasters | 3 / C1 | AUTHORITY | S05 | 201 |
| E06 | PATCH /api/disasters/{id} | 3 / C1 | AUTHORITY | S05 | 200 |
| E07 | POST /api/reports | 2 / B1 | CITIZEN | S02 | 201 |
| E08 | GET /api/reports | 2 / B1/B2 | CITIZEN, AUTHORITY | S03, S04, S06 | 200 |
| E09 | GET /api/reports/{id} | 2 / B1 | CITIZEN, AUTHORITY | S03, S04, S06 | 200 |
| E10 | PATCH /api/reports/{id}/verification | 2 / B2 | AUTHORITY | S04 | 200 |
| E11 | DELETE /api/reports/{id} | 2 / B2 | CITIZEN | S03 | 204 |
| E12 | GET /api/rescue-teams | 4 / D1 | AUTHORITY | S06 | 200 |
| E13 | POST /api/rescue-missions | 4 / D1 | AUTHORITY | S06 | 201 |
| E14 | GET /api/rescue-missions | 4 / D1 | CITIZEN, AUTHORITY | S03, S06 | 200 |
| E15 | PATCH /api/rescue-missions/{id}/status | 4 / D1 | AUTHORITY | S06 | 200 |

## Sáu màn hình và thao tác

| ID / định tuyến | Người phụ trách / công việc | Role | APIs / hành vi |
| --- | --- | --- | --- |
| S01 `/login` | 1 / P01 | Public | E01, E02; người dân đến S03, điều phối viên đến S04 |
| S02 `/reports/new` | 2 / B3 | CITIZEN | E02 shell, E07; nhập type/description/latitude/longitude, thành công đến S03 chọn báo cáo mới |
| S03 `/my-reports` | 2 / B3 | CITIZEN | E02, E08, E09, E11, E14; list/filter/detail panel/rút PENDING/progress |
| S04 `/operations/reports` | 3 / C2 | AUTHORITY | E02, E08, E09, E03, E04, E10; lọc bán kính, duyệt/chọn ACTIVE thảm họa hoặc từ chối có lý do |
| S05 `/operations/disasters` | 3 / C1 | AUTHORITY | E02, E03, E04, E05, E06; list/detail/create/edit/resolve bằng phiên bản hiện tại |
| S06 `/operations/rescue` | 4 / D2 | AUTHORITY | E02, E08, E09, E12, E13, E14, E15; chọn VERIFIED báo cáo, AVAILABLE đội, giao và cập nhật nhiệm vụ |

E02 được xác thực shell gọi sau đăng nhập; không bắt buộc gọi lại ở mỗi render. UI bảo vệ chỉ
hỗ trợ trải nghiệm, ứng dụng phía máy chủ vẫn kiểm tra role/ownership. Selector disaster/team/report
phải có phân trang để chọn cả dữ liệu ngoài trang đầu; điều kiện UI không thay máy chủ.
S04 có thể điều hướng S06 với truy vấn `reportId` (UUID), S06 tải E09 rồi mới điền biểu mẫu;
đây là trạng thái UI, không phải màn hình/API mới. Các chi tiết là khung cùng định tuyến.

Ma trận trên là hành vi đích. Trong giai đoạn chưa có định tuyến S03/S04, S01 giữ card
tài khoản thật tại `/login` theo ADR005; Điều phối viên mở S05 bằng nav đã đăng ký.
Không thêm placeholder định tuyến để giả chuyển trang thành công. UI01-A chỉ đổi dùng chung
presentation/S01; không đổi owner hay API bên sử dụng của sáu màn hình.

Mọi màn hình có loading/error/empty, nhãn, bàn phím, thích ứng kích thước màn hình và biểu mẫu kiểm tra dữ liệu.
401: xóa token/user/cache, về đăng nhập; 403: thông báo không đủ quyền; 404: không có dữ
liệu/không còn truy cập, không suy đoán chủ sở hữu; 409: thông báo, refetch phần liên
quan rồi để người dùng quyết định. Disable double-submit; không tự thử lại ghi.
Không nút giả, không giả lập khi chạy. Reload cùng tab giữ phiên trong `sessionStorage`;
mở tab mới cần đăng nhập lại. Logout xóa `sessionStorage`, UI và trạng thái của người dùng trước;
không revoke JWT đã cấp.

## Trạng thái và cạnh tranh

| Aggregate | Khởi tạo | Cho phép | Cấm / kết quả |
| --- | --- | --- | --- |
| Disaster | ACTIVE, phiên bản=0 | Sửa trường khi ACTIVE; ACTIVE → RESOLVED | RESOLVED bất biến, không reopen; explicit cùng trạng thái =>409 |
| Report | PENDING | PENDING → VERIFIED hoặc REJECTED; owner rút PENDING | Không duyệt lại; không sửa báo cáo; rút không phải trạng thái mới |
| Mission | ASSIGNED | ASSIGNED → IN_PROGRESS → COMPLETED | Không bỏ qua, lặp, cancel, reassign; 409 |
| Team | AVAILABLE được suy ra | BUSY khi có ASSIGNED/IN_PROGRESS; AVAILABLE khi hoàn tất | Không trạng thái ghi riêng |

E06 cần `expectedVersion` và ít nhất một trường sửa; không nhận null. Missing ID =>404,
phiên bản cũ =>409 STALE_VERSION, rồi kiểm tra chuyển trạng thái. Mỗi successful patch tăng
phiên bản 1, kể cả ghi cùng nội dung nhưng bỏ trạng thái. Hai patch cùng phiên bản: chỉ một
thành công, cái còn lại 409; không lost update.

E10/E11: nguyên tử conditional write/version trong Reporting, không kiểm tra rồi save thiếu
bảo vệ. Nếu cả hai đã đọc được PENDING thì hai xác minh: một thành công, một 409;
xác minh và rút báo cáo: một thành công, bên thua 409 INVALID_TRANSITION; hai rút báo cáo:
một 204, một 409. Nếu lần đọc đầu đã thấy missing/soft-deleted (kể cả thử lại sau
rút báo cáo) thì 404. Đọc đầu thấy VERIFIED/REJECTED thì 409. Vì vậy yêu cầu đến sau
commit rút báo cáo có thể nhận 404; kiểm thử tranh chấp dùng rào chắn đồng bộ sau khi cả hai đọc PENDING
để xác nhận 409. Với owner khác luôn 404 trước khi xét trạng thái. Hai lệnh
nhiệm vụ cùng trạng thái đích: một 200, một 409; không ghi đè các mốc thời gian.

E13 bảo vệ bằng DB unique trên reportId (kể cả completed) và partial unique teamId
cho trạng thái ASSIGNED/IN_PROGRESS, hoặc giải pháp khóa chứng minh tương đương.
Chỉ precheck không đủ. Race cùng báo cáo =>1 x 201 +1 x 409 REPORT_ALREADY_ASSIGNED;
tranh chấp cùng đội khác báo cáo =>1 x 201 +1 x 409 TEAM_BUSY. Nếu cả hai xung đột, ưu tiên
REPORT_ALREADY_ASSIGNED. Constraint violation được bản đồ sau rollback, không 500.
Team completion và phân công serialize theo bất biến: phân công có thể 409 nếu
quan sát đội còn BUSY, hoặc 201 sau completion; không hai active nhiệm vụ.

Disaster ACTIVE được đọc lại mỗi lệnh verify/create nhiệm vụ thông qua công khai
queries, không bộ nhớ đệm. Nếu kết thúc commit trước lần đọc nghiệp vụ thì lệnh trả
409 DISASTER_NOT_ACTIVE; nếu kết thúc sau lần đọc thì lệnh được phép hoàn thành.
Đây là **kiểm tra-time quy tắc**, không hứa ACTIVE tại thời điểm commit nhiệm vụ; không
xuyên mô-đun lock/transaction để chặn kết thúc. Mission có sẵn vẫn tiến triển/hoàn tất.
Report VERIFIED là kết thúc, không thể rút: điều này giữ báo cáo tham chiếu ổn định.

## Status và errors

Mỗi thao tác YAML liệt kê đúng success, lỗi statuses và mã hợp lệ. Với yêu cầu có
nhiều lỗi, xác thực trước, vai trò trước, parse/validate shape, khả năng hiển thị rồi business.
E10 kiểm tra báo cáo tồn tại/PENDING trước thảm họa. E13: báo cáo tồn tại → VERIFIED →
ACTIVE thảm họa → đội tồn tại → báo cáo uniqueness → đội tình trạng sẵn sàng; kiểm tra DB
cuối vẫn bắt tranh chấp. Missing đầu vào tham chiếu (E10 thảm họa; E13 report/team) =>404
NOT_FOUND; thảm họa tham chiếu biến mất trong ảnh chụp dữ liệu VERIFIED là lỗi toàn vẹn 500,
không coi là ACTIVE. Không tự thử lại tạo thực thể, không idempotency-key trong MVP.

| Status | mã nguồn | Ý nghĩa |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Shape/limits/query/UUID sai; `fieldErrors` mô tả trường, không chứa giá trị đầu vào |
| 401 | UNAUTHENTICATED | Token thiếu/sai/hết hạn; `WWW-Authenticate: Bearer` |
| 401 | INVALID_CREDENTIALS | E01 sai thông tin xác thực, người dùng không tồn tại hoặc vai trò ngoài MVP; cùng message |
| 403 | FORBIDDEN | Token hợp lệ nhưng vai trò không được phép; không leak tài nguyên |
| 404 | NOT_FOUND | Không tồn tại/đã rút/ngoài quyền sở hữu; cùng message |
| 409 | INVALID_TRANSITION, STALE_VERSION | State/version thay đổi hoặc hành động không hợp lệ |
| 409 | DISASTER_NOT_ACTIVE, REPORT_NOT_VERIFIED | Không đủ điều kiện nghiệp vụ |
| 409 | REPORT_ALREADY_ASSIGNED, TEAM_BUSY | Xung đột phân công |
| 415 | UNSUPPORTED_MEDIA_TYPE | Body không phải application/json |
| 500 | INTERNAL_ERROR | Lỗi ngoài dự kiến; message chung, không stacktrace |

`Error` luôn có timestamp/status/code/message/path/fieldErrors; đường dẫn không gồm truy vấn.
Mọi API phản hồi chứa dữ liệu người dùng và xác thực dùng `Cache-Control: no-store`; lỗi cũng
không bộ nhớ đệm. `fieldErrors=[]` ngoài kiểm tra dữ liệu. Không trả token/password/SQL/exception
vào errors/logs. Client dựa code/status, không parse message. Unknown API mặc định từ chối
ở security; health/Swagger/static không nằm trong 15 thao tác.

## Dữ liệu mẫu và JSON

Các UUID dưới đây chỉ là fixture tài liệu, không seed/migration P00. Hai người dân:
`00000000-0000-4000-8000-000000000001` / `citizen.one@example.test` và
`00000000-0000-4000-8000-000000000002` / `citizen.two@example.test`; điều phối viên:
`00000000-0000-4000-8000-000000000003` / `authority@example.test`.
Team thứ hai `00000000-0000-4000-8000-000000000008` / `Đội Ứng phó Miền Trung 02`.
Không có mật khẩu mặc định: P01/demo cấu hình lấy từ env, hash PasswordEncoder,
idempotent, không đặt lại credential/role đã có; D1/demo tạo dữ liệu mẫu đội cùng nguyên tắc.
Không đưa fixture vào môi trường triển khai, không điểm cuối API tạo dữ liệu mẫu.

Luồng mẫu dùng các thân yêu cầu dưới đây: E05 tạo thảm họa ACTIVE; E07 tạo báo cáo PENDING;
E10 VerifyReportRequest gắn thảm họa; E13 tạo nhiệm vụ; E15 IN_PROGRESS rồi COMPLETED.
Các id trả về thật phải thay UUID mẫu. Ảnh chụp dữ liệu Report/Mission bên dưới là tại lúc
tạo, không phải trạng thái sau toàn bộ luồng. Các trường tùy trạng thái xem YAML và
bảng dưới; ví dụ rejection là nhánh khác của một báo cáo PENDING khác.

| DTO | Bắt buộc theo trạng thái | Phải vắng |
| --- | --- | --- |
| Report PENDING | Các trường common trong YAML | disasterId, verifiedAt, rejectionReason, rejectedAt |
| Report VERIFIED | disasterId, verifiedAt | rejectionReason, rejectedAt |
| Report REJECTED | rejectionReason, rejectedAt | disasterId, verifiedAt |
| Mission ASSIGNED | assignedAt, updatedAt + IDs/status | startedAt, completedAt |
| Mission IN_PROGRESS | startedAt + common | completedAt |
| Mission COMPLETED | startedAt, completedAt + common | Không |

### User

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "email": "citizen.one@example.test",
  "role": "CITIZEN"
}
```

### LoginRequest

```json
{
  "email": "citizen.one@example.test",
  "password": "<from-demo-environment>"
}
```

### LoginResponse

```json
{
  "accessToken": "<issued-jwt-not-a-real-token>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "expiresAt": "2026-10-08T03:15:00Z",
  "user": {
    "id": "00000000-0000-4000-8000-000000000001",
    "email": "citizen.one@example.test",
    "role": "CITIZEN"
  }
}
```

### CreateDisasterRequest

```json
{
  "name": "Hanoi flood exercise",
  "type": "FLOOD",
  "severity": "HIGH",
  "description": "Training scenario only",
  "latitude": 21.028,
  "longitude": 105.834
}
```

### UpdateDisasterRequest

```json
{
  "expectedVersion": 0,
  "status": "RESOLVED"
}
```

### Disaster

```json
{
  "id": "00000000-0000-4000-8000-000000000004",
  "name": "Hanoi flood exercise",
  "type": "FLOOD",
  "severity": "HIGH",
  "description": "Training scenario only",
  "latitude": 21.028,
  "longitude": 105.834,
  "status": "ACTIVE",
  "version": 0,
  "createdAt": "2026-10-08T03:00:00Z",
  "updatedAt": "2026-10-08T03:00:00Z"
}
```

### CreateReportRequest

```json
{
  "type": "FLOOD",
  "description": "Water rising near the entrance",
  "latitude": 21.028,
  "longitude": 105.834
}
```

### Report

```json
{
  "id": "00000000-0000-4000-8000-000000000005",
  "reporterId": "00000000-0000-4000-8000-000000000001",
  "type": "FLOOD",
  "description": "Water rising near the entrance",
  "latitude": 21.028,
  "longitude": 105.834,
  "status": "PENDING",
  "createdAt": "2026-10-08T03:00:00Z",
  "updatedAt": "2026-10-08T03:00:00Z"
}
```

### VerifyReportRequest

```json
{
  "status": "VERIFIED",
  "disasterId": "00000000-0000-4000-8000-000000000004"
}
```

### RejectReportRequest

```json
{
  "status": "REJECTED",
  "rejectionReason": "Insufficient location details"
}
```

### VerificationRequest

```json
{
  "status": "VERIFIED",
  "disasterId": "00000000-0000-4000-8000-000000000004"
}
```

### RescueTeam

```json
{
  "id": "00000000-0000-4000-8000-000000000006",
  "name": "Đội Cứu hộ Hà Nội 01",
  "availability": "AVAILABLE"
}
```

### CreateMissionRequest

```json
{
  "reportId": "00000000-0000-4000-8000-000000000005",
  "teamId": "00000000-0000-4000-8000-000000000006"
}
```

### UpdateMissionStatusRequest

```json
{
  "status": "IN_PROGRESS"
}
```

### Mission

```json
{
  "id": "00000000-0000-4000-8000-000000000007",
  "reportId": "00000000-0000-4000-8000-000000000005",
  "teamId": "00000000-0000-4000-8000-000000000006",
  "status": "ASSIGNED",
  "assignedAt": "2026-10-08T03:00:00Z",
  "updatedAt": "2026-10-08T03:00:00Z"
}
```

### DisasterPage

```json
{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000004",
      "name": "Hanoi flood exercise",
      "type": "FLOOD",
      "severity": "HIGH",
      "description": "Training scenario only",
      "latitude": 21.028,
      "longitude": 105.834,
      "status": "ACTIVE",
      "version": 0,
      "createdAt": "2026-10-08T03:00:00Z",
      "updatedAt": "2026-10-08T03:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### ReportPage

```json
{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000005",
      "reporterId": "00000000-0000-4000-8000-000000000001",
      "type": "FLOOD",
      "description": "Water rising near the entrance",
      "latitude": 21.028,
      "longitude": 105.834,
      "status": "PENDING",
      "createdAt": "2026-10-08T03:00:00Z",
      "updatedAt": "2026-10-08T03:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### RescueTeamPage

```json
{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000006",
      "name": "Đội Cứu hộ Hà Nội 01",
      "availability": "AVAILABLE"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### MissionPage

```json
{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000007",
      "reportId": "00000000-0000-4000-8000-000000000005",
      "teamId": "00000000-0000-4000-8000-000000000006",
      "status": "ASSIGNED",
      "assignedAt": "2026-10-08T03:00:00Z",
      "updatedAt": "2026-10-08T03:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### Error

```json
{
  "timestamp": "2026-10-08T03:00:00Z",
  "status": 409,
  "code": "TEAM_BUSY",
  "message": "Team already has an active mission.",
  "path": "/api/rescue-missions",
  "fieldErrors": []
}
```
