# Biên bản rà soát tài liệu và bàn giao Pha 1

## 1. Phạm vi đã đối chiếu với mã nguồn

Nguồn kiểm tra: `pom.xml`, package/lockfile giao diện, 5 bộ điều khiển, DTO/parser/error
handler, Security/JWT configuration, miền/ứng dụng/cổng/bộ chuyển đổi, Flyway
V1–V7, routes/session/map, tập lệnh, Dockerfile/Compose/Nginx, CI, kiểm thử và Git nhật ký.
Context dài hạn và tiến độ chỉ là bối cảnh; không dùng danh sách để sau làm bằng chứng khi chạy.

- Một Spring Boot Nguyên khối theo mô-đun, React SPA và PostgreSQL/PostGIS. Miền nghiệp vụ plain
Java; tầng ứng dụng dùng các cổng; bộ chuyển đổi lưu trữ/HTTP ở ngoài. Dashboard chỉ đọc,
không cần miền nghiệp vụ thực thể tổng hợp. `alert/resource/geo` chỉ có package boundaries.
- JPA/Hibernate nằm ở Identity/Disaster; JDBC ở Reporting/Rescue và thống kê.
Flyway quản lý lược đồ; Hibernate `ddl-auto=validate`.
- JWT HS256, TTL 900 giây, kiểm tra issuer `gdrn`, audience `gdrn-spa`, thời gian và
subject UUID; BCrypt. Chỉ CITIZEN/AUTHORITY hoạt động trong MVP; RESPONDER/ADMIN
tồn tại ở enum/schema nhưng không có người dùng flow/API được phép. Không register/refresh.
- 7 định tuyến: `/login`, `/reports/new`, `/my-reports`, `/operations/reports`,
`/operations/disasters`, `/operations/rescue`, `/operations/dashboard`.
Session nằm trong `sessionStorage`, khóa **`gdrn.session`**.
- Database: 7 bảng nghiệp vụ, ngoài bảng lịch sử Flyway. Identity sở hữu users và
thông tin xác thực (1:1); Disaster sở hữu disasters; Reporting sở hữu báo cáo và
attachments (1:n); Rescue sở hữu đội và nhiệm vụ (1:n theo lịch sử).
Mission có FK đội; attachment có FK báo cáo. ID tham chiếu xuyên mô-đun là scalar,
không FK/join xuyên mô-đun. Dashboard không có bảng riêng.
- Reporting lưu `geography(Point,4326)` và GiST index
`reporting_reports_visible_location_idx` cho báo cáo chưa rút. Lọc bán kính dùng
`ST_DWithin` theo mét; vị trí thảm họa là hai cột latitude/longitude.
- Disaster dùng expectedVersion/conditional update. Reporting quyết định/rút bằng
update có điều kiện PENDING + phiên bản + chưa rút. Rescue chống trùng bằng
**UNIQUE report_id** toàn vòng đời và **partial unique team_id** khi nhiệm vụ
ASSIGNED/IN_PROGRESS; tình trạng sẵn sàng tính từ nhiệm vụ, không có cột trạng thái đội.
- Contracts liên mô-đun: Rescue → Reporting → Disaster;
Dashboard gọi ReportStatisticsQuery/RescueStatisticsQuery trong một giao dịch
chỉ đọc REPEATABLE READ. SQL thuộc bộ chuyển đổi mô-đun sở hữu bảng.

## 2. API thực tế và nguồn đặc tả

Đếm **20 thao tác trên 14 đường dẫn nghiệp vụ**; không đếm health/Swagger là nghiệp vụ.

| Nhóm          | Method/path có trong bộ điều khiển                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity (2)  | POST `/api/auth/login`; GET `/api/auth/me`                                                                                                                  |
| Disaster (4)  | GET/POST `/api/disasters`; GET/PATCH `/api/disasters/{id}`                                                                                                  |
| Reporting (5) | POST/GET `/api/reports`; GET/DELETE `/api/reports/{id}`; PATCH `/api/reports/{id}/verification`                                                             |
| Rescue (4)    | GET `/api/rescue-teams`; POST/GET `/api/rescue-missions`; PATCH `/api/rescue-missions/{id}/status`                                                          |
| Dashboard (1) | GET `/api/dashboard`                                                                                                                                        |
| Bằng chứng (4)  | POST/GET `/api/reports/{id}/attachments`; GET `/api/reports/{id}/attachments/{attachmentId}/content`; DELETE `/api/reports/{id}/attachments/{attachmentId}` |

[docs/openapi.yaml](openapi.yaml) là bản ảnh chụp dữ liệu **OpenAPI 3.0.3** cho báo cáo/bàn
giao. E01–E15/E17–E20 lấy cấu trúc từ 4 JSON mà `OpenApiConfiguration` thực sự nạp
tại `src/main/resources/openapi/`, rồi đối chiếu bộ điều khiển, bộ phân tích, miền nghiệp vụ và
SecurityConfiguration. E16 được bổ sung từ DashboardController, DashboardSummary,
DashboardService và [hợp đồng DS1](api/dashboard-contract.md).

Các hiệu đính chỉ áp dụng cho ảnh chụp dữ liệu tài liệu: tách namespace thành phần theo mô-đun
để tránh đè tên lược đồ; bổ sung `401/403`, no-store và quyền; bổ sung ví dụ ảnh/dashboard,
lỗi ảnh và HTTP 413 vào ReportingError. Enum Error trong JSON khi chạy cũ còn thiếu
413 và các mã nguồn `ATTACHMENT_*` mặc dù ReportErrors đã trả chúng. Không sửa khi chạy
JSON trong lượt chỉ tài liệu này; nhóm tiếp nhận cần đồng bộ hợp đồng khi chạy sau rà soát.
Định dạng lỗi thực tế là **ApiError JSON**, không phải ProblemDetail/RFC 7807.

Đặc tả có query/path parameters, JSON/multipart/binary bodies, phản hồi schemas,
mã trạng thái, Bearer xác thực và `x-roles`. Ownership/điều kiện liên trường
được viết bằng mô tả vì OpenAPI không tự thực thi các quy tắc đó. Yêu cầu password/
token trong ví dụ chỉ là placeholder; không chứa thông tin đăng nhập thật.

[P00 OpenAPI](api/phase1-contract.yaml) và validator cũ giữ nguyên mục đích thiết kế
15 APIs/6 screens. Không đổi bản lịch sử đó thành đặc tả khi chạy 20 thao tác.
Khi API thay đổi, cập nhật ảnh chụp dữ liệu mới cùng controller/DTO/contract và chạy
`python docs/api/validate_openapi.py`; không dùng ảnh chụp dữ liệu thay danh mục giao việc.

## 3. Kết quả kiểm tra trong lượt này

Toolchain thực chạy: **Temurin JDK 21.0.8**, Maven Wrapper 3.9.9,
Node **22.14.0** có sẵn tại `.tools/node-v22.14.0-win-x64`, Docker Engine **27.3.1**,
Linux containers. Không cài thêm phụ thuộc vào kho mã. Python validators có sẵn ở
`.tools/python` được nạp qua `PYTHONPATH` (không coi bộ nhớ đệm được Git bỏ qua là setup mặc định).

| Kiểm tra thực chạy                                                                                                              | Kết quả                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `.\mvnw.cmd --no-transfer-progress clean verify` với `DOCKER_API_VERSION=1.44` trong tiến trình                                    | **ĐẠT**, BUILD SUCCESS 1:38; **73 unit/architecture + 57 tích hợp = 130**, 0 fail/error/skip                                          |
| `npm.cmd ci`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` tại giao diện, Node22.14.0                            | **ĐẠT**, 20 kiểm thử files/**93 kiểm thử**; gói biên dịch thành công; còn cảnh báo chunk &gt;500 kB                                              |
| `docker compose --env-file .env.example config --quiet`                                                                         | **ĐẠT**                                                                                                                                  |
| Compose project `gdrn-docs-review`, env riêng trong `.tools/`, các cổng DB/API/SPA `55438/18088/5178`, `up --build -d --wait`      | **ĐẠT**, cả 3 ảnh biên dịch, DB trống chạy migrations, 3 containers sẵn sàng                                                               |
| HTTP kiểm tra nhanh thực: 3 sức khỏe endpoints, `/v3/api-docs`, Swagger UI, SPA `/login` và `/operations/rescue`, `/api/unknown` qua proxy | **ĐẠT 8/8**, sức khỏe UP, khi chạy đủ E01–E20, SPA shell 200, unknown API JSON 401                                                          |
| `.\scripts\browser-e2e.ps1 -EnvironmentFile .tools/phase1-docs.compose.env`                                                     | **18 ĐẠT, 5 SKIP, 0 KHÔNG ĐẠT**, 28,8 giây; bỏ qua các scenario bản đồ bên cung cấp opt-in vì không cấu hình bên cung cấp                                  |
| `python docs/api/validate_openapi.py` với PyYAML6.0.3, openapi-spec-validator0.7.2, openapi-schema-validator0.6.3               | **ĐẠT**, 20 thao tác khớp method/path/ID của bộ điều khiển, YAML không trùng lặp key, mọi cục bộ ref kết thúc, **139 ví dụ** hợp lệ         |
| `python docs/api/validate_phase1_contract.py`                                                                                   | **ĐẠT** cho bản thiết kế P00: 15 operations/6 screens/140 examples; không suy ra khi chạy từ kết quả này                                  |
| Preview `docs/openapi.yaml` trong Swagger UI trên Chromium bằng Playwright CLI có sẵn                                           | **ĐẠT**, tiêu đề GDRN Pha 1 API, **20 thao tác blocks**, không có console error/warning; chỉ xem xem trước, không gọi Try it out        |
| PNG hợp lệ 3.147.780 byte, cùng token/report trên stack disposable                                                              | Ứng dụng phía máy chủ trực tiếp **201**; giao diện Nginx **413 HTML****lỗi proxy đã tái hiện**, chưa sửa sản phẩm                                     |
| `npm.cmd audit --json --prefix frontend`                                                                                        | **1 high phụ thuộc: undici**, transitive, lockfile7.30.0; không thay lockfile hoặc chạy auto-fix                                         |
| `git diff --check`; kiểm tra liên kết/code fences và quét tệp mới/sửa                                                          | **ĐẠT**: 9 tệp, 88 liên kết tệp Markdown tồn tại; không marker xung đột hoặc JWT/giá trị bí mật trùng với env cá nhân/môi trường kiểm thử |
| So sánh ảnh chụp dữ liệu với `/v3/api-docs` của stack thật                                                                              | **ĐẠT**, cùng **20 method/path/operationId trên 14 đường dẫn**; khác biệt mô tả/schema lỗi ảnh đã ghi ở mục 2                                |

Lần Maven đầu tiên **KHÔNG ĐẠT vì Docker daemon chưa chạy**, 73 unit/architecture ĐẠT,
4 tích hợp suites lỗi khởi tạo (không bỏ qua). Sau khi khởi động Docker Desktop,
đã chạy lại **clean xác minh đầy đủ** và đạt kết quả nêu trên; không che lỗi bằng bỏ qua.

Logs cục bộ trong `.tools/phase1-docs-{maven,frontend,compose,browser}.log`, npm kiểm tra
JSON và khi chạy OpenAPI JSON cũng tại `.tools/`; đều được Git bỏ qua, không dùng làm bằng
chứng mà người clone mới tự có sẵn. Stack kiểm tra tách biệt, không dùng `.env` hoặc
volume cơ sở dữ liệu chính. Containers kiểm tra được dừng sau khi xác minh, giữ volume.

**Giới hạn:** không chạy lại đo hiệu năng k6/Kaggle, không gọi remote GitHub Actions,
không xác minh cloud deploy/public khả năng hiển thị, không diễn tập thuyết trình có bấm
giờ. Trình duyệt suite có **2 scenario bảng thống kê ĐẠT** (thống kê/ngày/i18n/responsive
và người dân bị chặn); chưa có scenario trình duyệt riêng cho ảnh minh chứng. Ảnh có
integration/component kiểm thử cùng kiểm tra nhanh tải lên nói trên. Lượt này không lặp kiểm tra WCAG toàn diện hoặc chứng nhận
bảo mật toàn lịch sử Git. Chỉ quét dữ liệu nhạy cảm trong các tệp mới/sửa.

README có 170 dòng, khoảng 1.464 đơn vị phân tách bằng khoảng trắng; phần lời nói
của kịch bản khoảng 993 đơn vị (không tính Q&amp;A/chỉ dẫn). README giữ vai trò tài liệu
vào dự án ngắn, các bảng bằng chứng chuyển sang đây;
ước lượng khoảng 3–4 trang với định dạng gọn, số trang phụ thuộc renderer/font/lề.
Kịch bản nói tách Q&amp;A và trình diễn; nhịp 6 phút là mục tiêu phân bổ, chưa phải số đo diễn tập.

## 4. Những mô tả lịch sử cần hiểu đúng

[Kiểm tra A3](qa/phase1-final-audit.md) và handoffs được giữ làm bằng chứng lịch sử;
ghi chú hiệu đính đầu kiểm tra trỏ về đây. Không diễn giải nhãn HOÀN TẤT trong chúng thành
chứng nhận mọi chức năng hoặc deployment đã được kiểm tra ở commit mới.

| Mô tả cũ                                                                          | Kết quả đối chiếu mã nguồn                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React18, giao diện port3000                                                        | package.json pin React19.3.0, Compose FRONTEND\_PORT mặc định5173                                                                                                                            |
| JPA cho Rescue                                                                    | Rescue dùng JdbcMissionStore/JdbcRescueTeamStore                                                                                                                                             |
| 4 CI tác vụ backend-verify/frontend-verify/compose-smoke/browser-e2e                | Workflow có 3 tác vụ `verify`, `frontend`, `browser-e2e`; kiểm tra nhanh nằm trong xác minh                                                                                                               |
| UPDATE đội trạng thái AVAILABLE, partial unique báo cáo                               | rescue\_teams không có cột trạng thái; báo cáo\_id UNIQUE toàn vòng đời; partial unique active đội\_id                                                                                           |
| Reporting tranh chấp trả REPORT\_NOT\_PENDING                                           | ReportErrors bản đồ InvalidReportTransition thành **409 INVALID\_TRANSITION**                                                                                                                   |
| FlywayMigrationIT, IdentityBootstrapIT, IdentityIT, DisasterIT, OpenApiContractIT | Không có các class mang tên này trong checkout. Các kiểm tra liên quan nằm trong GdrnApplicationIT, ReportingIT, RescueIT, DashboardIT và kiểm thử đơn vị; không dùng tên class giả làm dẫn chứng |
| ProblemDetail/RFC7807; khóa gdrn.xác thực.phiên                                     | ApiError DTO riêng; session.ts dùng **gdrn.phiên**                                                                                                                                         |
| `benchmark/kaggle/gdrn-d3-kaggle-benchmark.ipynb`                                 | Tệp hiện có là `benchmark/kaggle_cpu_preflight.ipynb`; môi trường Kaggle máy chủ **Chưa xác định**, không suy ra Kaggle không hỗ trợ Docker từ lần kiểm tra môi trường cục bộ                           |
| Benchmark p95=73,68ms, 5 kịch bản                                                 | Bàn giao D3 liệt kê **6 hàng số đo**, p95 ở E08 page100VU là **78,70ms**; lần này không tái đo                                                                                                |
| Số đo100VU chứng minh nghẽn ghi/Tomcat/ST\_DWithin                                | Mức100VU thuộc **E08 trang**, chỉ cho thấy độ trễ/tài nguyên của cấu trúc triển khai đã đo; chưa có đo chuyên sâu để xác định nguyên nhân hoặc chọn broker/cache                                             |

## 5. Rủi ro và việc cần bàn giao

1. **Ảnh không bền qua thay container:** Compose chỉ mount DB; siêu dữ liệu và tệp có
 thể lệch. Cần volume/private lưu trữ, quyền ghi, sao lưu/khôi phục cả hai và thử phục
 hồi trước khi dùng dữ liệu cần giữ. Chưa có tác vụ dọn orphan tệp sau lưu trữ lỗi.
2. **Proxy tải lên lỗi đã xác nhận:** PNG \~3MiB được ứng dụng phía máy chủ chấp nhận nhưng Nginx
 trả413 HTML; giao diện có thể không nhận ApiError như mong đợi. Cần rà soát cấu
 hình Nginx và kiểm thử đường đi SPA→proxy→ứng dụng phía máy chủ ở biên 5MiB/6MB multipart.
3. **Dependency kiểm tra:** npm báo `undici` high; cần đánh giá chuỗi phụ thuộc và update
 có kiểm thử theo phạm vi được duyệt. Không kết luận khả năng khai thác môi trường triển khai
 chỉ từ npm severity. Biên dịch còn bản đồ chunk \~1MB minified, lazy-loaded.
4. **Auth/vận hành:** tài khoản bootstrap trình diễn, JWT chưa refresh/revoke, chưa có
 quản trị tài khoản, TLS/HA/backup hướng dẫn vận hành môi trường triển khai được kiểm chứng; không dùng
 cấu hình trình diễn như quy trình quản trị thật. Bind loopback hiện chỉ phù hợp cục bộ.
5. **Hợp đồng khi chạy:** bổ sung lỗi ảnh/413 vào JSON khi chạy và kiểm tra Swagger
 tương ứng sau rà soát; ảnh chụp dữ liệu tài liệu đã mô tả theo handler, không đổi behavior.
6. **Bằng chứng cần chuyển cùng bàn giao:** raw D3 dưới `benchmark/results/` bị ignore.
 Máy hiện có 7 thư mục lượt chạy, trong khi bàn giao tổng hợp 6 hàng; cần chọn đúng bản kê,
 raw/summary/seed/docker-stats cho từng phép đo, không lấy thư mục trung gian làm
 phép đo mới. Chưa chạy Kaggle máy chủ và không có bằng chứng before/after.
7. **Điều kiện kiểm tra ngoài máy:** cần đối chiếu remote CI cho revision được nộp và điều kiện
 tiêu chí đánh giá Kaggle/public với giảng viên; trạng thái hiện tại **Chưa xác định** trong
 lượt này. Kết quả cục bộ không thay kết quả remote hay yêu cầu nghiệm thu bắt buộc.

Những điểm trên là findings/hạn chế bàn giao, không phải công việc danh mục mới. Chọn việc
triển khai tiếp theo theo danh mục và rà soát contract/ADR khi cần. Không đưa sẵn
Redis, broker hay vi dịch vụ vào hệ thống khi chưa có bằng chứng.

## 6. Đánh giá mức sẵn sàng Pha 2

**Đủ nền tảng để nhóm tiếp theo tiếp nhận phát triển có điều kiện**: mã nguồn nghiệp vụ,
ports/contracts, bản chuyển đổi lược đồ, kiểm thử và cách chạy cục bộ rõ; kiểm tra kỹ thuật core đạt
trên Docker cục bộ. Có thể dùng làm số đo cơ sở học thuật khi chuyển kèm đúng tệp kết quả.

**Chưa sẵn sàng môi trường triển khai; chưa thể xác nhận hoàn tất toàn bộ tiêu chí đánh giá Pha 1** khi
các gate ngoài máy chưa có bằng chứng phù hợp. Trước báo cáo cần công khai lỗi proxy
tải lên, giới hạn lưu ảnh, kết quả kiểm tra phụ thuộc và phần Kaggle/remoteCI chưa xác
minh; không trình bày số đo cục bộ như chứng minh cần kiến trúc phân tán.

## 7. Hoàn thiện README cho bàn giao 5-7 phút

Trên nhánh `docs/phase1-review-handoff`, nền `b08101c`, README được sắp lại thành
bài toán/nghiệp vụ, kiến trúc/mã nguồn/yêu cầu kỹ thuật, API, build/deploy, kết quả rà soát
bàn giao Pha 2 và khung nói 6 phút. Kịch bản trình bày trỏ về cùng thứ tự;
không tính Q&A hoặc trình diễn 8-10 phút vào thời lượng 5-7 phút. Chưa diễn tập bấm giờ.

- Bản in README bằng Chromium: **3 trang A4**, Arial 11pt, line-height 1,35,
  lề trên/trái-phải/dưới 16/17/18 mm. Đã xem PNG cả ba trang, không cắt bảng/chữ.
  PDF/PNG kiểm tra ở `.tools/readme-handoff/tmp/pdfs/` là tệp kết quả cục bộ được Git bỏ qua;
  số trang phụ thuộc renderer, font và thiết lập in.
- Giữ đặc tả `docs/openapi.yaml` hiện có; validator xác nhận **20 thao tác khớp
  bộ điều khiển**, toàn bộ refs kết thúc và **139 examples hợp lệ**. README có cách
  xem trước YAML bằng Swagger Editor và thử API bằng Swagger UI/backend đang chạy.
- `.\mvnw.cmd clean verify`: **ĐẠT**, 73 unit/architecture + 57 tích hợp,
  không fail/error/skip; Testcontainers dùng Docker/PostGIS thật.
- Giao diện typecheck, **93 kiểm thử**, môi trường triển khai biên dịch: **ĐẠT**; vẫn có cảnh báo
  chunk MapLibre trên 500 kB. Compose cấu hình: **ĐẠT**.
- Đây là cập nhật tài liệu; không thay đổi API/schema/runtime, không tái đo
  đo hiệu năng, không chạy lại trình duyệt E2E hoặc xác nhận cloud/Kaggle/remote CI.
  Findings ở mục 5 giữ nguyên giới hạn bằng chứng của lần rà soát ban đầu.

Kiểm tra lại sau khi đồng bộ `main ed8491d`: clean xác minh **130 ĐẠT, 0 bỏ qua**;
giao diện **101 kiểm thử ĐẠT** + typecheck/build (kế thừa phần tải lên tại create và
tiêu đề tab từ main); hai validator P00/runtime và Compose cấu hình **ĐẠT**.
README giữ bản ngắn, cập nhật liên kết tới `PHASE1_PLAN.md`, `CONTRIBUTING.md`,
`GDRN_PROJECT_CONTEXT.md`; bản in kiểm tra vẫn **3 trang A4** cùng thiết lập trên.
