# Biên bản rà soát tài liệu và bàn giao Phase 1

## 1. Phạm vi đã đối chiếu với code

Nguồn kiểm tra: `pom.xml`, package/lockfile frontend, 5 controller, DTO/parser/error
handler, Security/JWT configuration, domain/application/ports/adapters, Flyway
V1–V7, routes/session/map, scripts, Dockerfile/Compose/Nginx, CI, tests và Git log.
Context dài hạn và progress chỉ là bối cảnh; không dùng backlog làm bằng chứng runtime.

- Một Spring Boot Modular Monolith, React SPA và PostgreSQL/PostGIS. Domain plain
Java; application dùng ports; adapters lưu trữ/HTTP ở ngoài. Dashboard chỉ đọc,
không cần domain aggregate. `alert/resource/geo` chỉ có package boundaries.
- JPA/Hibernate nằm ở Identity/Disaster; JDBC ở Reporting/Rescue và thống kê.
Flyway quản lý schema; Hibernate `ddl-auto=validate`.
- JWT HS256, TTL 900 giây, kiểm tra issuer `gdrn`, audience `gdrn-spa`, thời gian và
subject UUID; BCrypt. Chỉ CITIZEN/AUTHORITY hoạt động trong MVP; RESPONDER/ADMIN
tồn tại ở enum/schema nhưng không có user flow/API được phép. Không register/refresh.
- 7 routes: `/login`, `/reports/new`, `/my-reports`, `/operations/reports`,
`/operations/disasters`, `/operations/rescue`, `/operations/dashboard`.
Session nằm trong `sessionStorage`, khóa **`gdrn.session`**.
- Database: 7 bảng nghiệp vụ, ngoài bảng lịch sử Flyway. Identity sở hữu users và
credentials (1:1); Disaster sở hữu disasters; Reporting sở hữu reports và
attachments (1:n); Rescue sở hữu teams và missions (1:n theo lịch sử).
Mission có FK team; attachment có FK report. ID tham chiếu xuyên module là scalar,
không FK/join xuyên module. Dashboard không có bảng riêng.
- Reporting lưu `geography(Point,4326)` và GiST index
`reporting_reports_visible_location_idx` cho báo cáo chưa rút. Lọc bán kính dùng
`ST_DWithin` theo mét; vị trí thảm họa là hai cột latitude/longitude.
- Disaster dùng expectedVersion/conditional update. Reporting quyết định/rút bằng
update có điều kiện PENDING + version + chưa rút. Rescue chống trùng bằng
**UNIQUE report_id** toàn vòng đời và **partial unique team_id** khi nhiệm vụ
ASSIGNED/IN_PROGRESS; availability tính từ nhiệm vụ, không có cột trạng thái đội.
- Contracts liên module: Rescue → Reporting → Disaster;
Dashboard gọi ReportStatisticsQuery/RescueStatisticsQuery trong một giao dịch
read-only REPEATABLE READ. SQL thuộc adapter module sở hữu bảng.

## 2. API thực tế và nguồn đặc tả

Đếm **20 operations trên 14 paths nghiệp vụ**; không đếm health/Swagger là nghiệp vụ.


| Nhóm          | Method/path có trong controller                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity (2)  | POST `/api/auth/login`; GET `/api/auth/me`                                                                                                                  |
| Disaster (4)  | GET/POST `/api/disasters`; GET/PATCH `/api/disasters/{id}`                                                                                                  |
| Reporting (5) | POST/GET `/api/reports`; GET/DELETE `/api/reports/{id}`; PATCH `/api/reports/{id}/verification`                                                             |
| Rescue (4)    | GET `/api/rescue-teams`; POST/GET `/api/rescue-missions`; PATCH `/api/rescue-missions/{id}/status`                                                          |
| Dashboard (1) | GET `/api/dashboard`                                                                                                                                        |
| Evidence (4)  | POST/GET `/api/reports/{id}/attachments`; GET `/api/reports/{id}/attachments/{attachmentId}/content`; DELETE `/api/reports/{id}/attachments/{attachmentId}` |


[docs/openapi.yaml](openapi.yaml) là bản snapshot **OpenAPI 3.0.3** cho báo cáo/bàn
giao. E01–E15/E17–E20 lấy cấu trúc từ 4 JSON mà `OpenApiConfiguration` thực sự nạp
tại `src/main/resources/openapi/`, rồi đối chiếu controller, parser, domain và
SecurityConfiguration. E16 được bổ sung từ DashboardController, DashboardSummary,
DashboardService và [contract DS1](api/dashboard-contract.md).

Các hiệu đính chỉ áp dụng cho snapshot tài liệu: tách namespace component theo module
để tránh đè tên schema; bổ sung `401/403`, no-store và quyền; bổ sung ví dụ ảnh/dashboard,
lỗi ảnh và HTTP 413 vào ReportingError. Enum Error trong JSON runtime cũ còn thiếu
413 và các code `ATTACHMENT_*` mặc dù ReportErrors đã trả chúng. Không sửa runtime
JSON trong lượt chỉ tài liệu này; nhóm tiếp nhận cần đồng bộ contract runtime sau review.
Định dạng lỗi thực tế là **ApiError JSON**, không phải ProblemDetail/RFC 7807.

Đặc tả có query/path parameters, JSON/multipart/binary bodies, response schemas,
status codes, Bearer authentication và `x-roles`. Ownership/điều kiện liên trường
được viết bằng mô tả vì OpenAPI không tự thực thi các quy tắc đó. Request password/
token trong ví dụ chỉ là placeholder; không chứa thông tin đăng nhập thật.

[P00 OpenAPI](api/phase1-contract.yaml) và validator cũ giữ nguyên mục đích thiết kế
15 APIs/6 screens. Không đổi bản lịch sử đó thành đặc tả runtime 20 operations.
Khi API thay đổi, cập nhật snapshot mới cùng controller/DTO/contract và chạy
`python docs/api/validate_openapi.py`; không dùng snapshot thay catalog giao việc.

## 3. Kết quả kiểm tra trong lượt này

Toolchain thực chạy: **Temurin JDK 21.0.8**, Maven Wrapper 3.9.9,
Node **22.14.0** có sẵn tại `.tools/node-v22.14.0-win-x64`, Docker Engine **27.3.1**,
Linux containers. Không cài thêm dependency vào repo. Python validators có sẵn ở
`.tools/python` được nạp qua `PYTHONPATH` (không coi cache ignored là setup mặc định).


| Kiểm tra thực chạy                                                                                                              | Kết quả                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `.\mvnw.cmd --no-transfer-progress clean verify` với `DOCKER_API_VERSION=1.44` trong process                                    | **PASS**, BUILD SUCCESS 1:38; **73 unit/architecture + 57 integration = 130**, 0 fail/error/skip                                          |
| `npm.cmd ci`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` tại frontend, Node22.14.0                            | **PASS**, 20 test files/**93 tests**; bundle build thành công; còn cảnh báo chunk &gt;500 kB                                              |
| `docker compose --env-file .env.example config --quiet`                                                                         | **PASS**                                                                                                                                  |
| Compose project `gdrn-docs-review`, env riêng trong `.tools/`, ports DB/API/SPA `55438/18088/5178`, `up --build -d --wait`      | **PASS**, cả 3 images build, DB trống chạy migrations, 3 containers healthy                                                               |
| HTTP smoke thực: 3 health endpoints, `/v3/api-docs`, Swagger UI, SPA `/login` và `/operations/rescue`, `/api/unknown` qua proxy | **PASS 8/8**, health UP, runtime đủ E01–E20, SPA shell 200, unknown API JSON 401                                                          |
| `.\scripts\browser-e2e.ps1 -EnvironmentFile .tools/phase1-docs.compose.env`                                                     | **18 PASS, 5 SKIP, 0 FAIL**, 28,8 giây; skip các scenario map provider opt-in vì không cấu hình provider                                  |
| `python docs/api/validate_openapi.py` với PyYAML6.0.3, openapi-spec-validator0.7.2, openapi-schema-validator0.6.3               | **PASS**, 20 operations khớp method/path/ID của controller, YAML không duplicate key, mọi local ref resolve, **139 ví dụ** hợp lệ         |
| `python docs/api/validate_phase1_contract.py`                                                                                   | **PASS** cho bản thiết kế P00: 15 operations/6 screens/140 examples; không suy ra runtime từ kết quả này                                  |
| Preview `docs/openapi.yaml` trong Swagger UI trên Chromium bằng Playwright CLI có sẵn                                           | **PASS**, tiêu đề GDRN Phase 1 API, **20 operation blocks**, không có console error/warning; chỉ xem preview, không gọi Try it out        |
| PNG hợp lệ 3.147.780 byte, cùng token/report trên stack disposable                                                              | Backend trực tiếp **201**; frontend Nginx **413 HTML** — **lỗi proxy đã tái hiện**, chưa sửa sản phẩm                                     |
| `npm.cmd audit --json --prefix frontend`                                                                                        | **1 high dependency: undici**, transitive, lockfile7.30.0; không thay lockfile hoặc chạy auto-fix                                         |
| `git diff --check`; kiểm tra liên kết/code fences và quét file mới/sửa                                                          | **PASS**: 9 files, 88 liên kết file Markdown tồn tại; không marker conflict hoặc JWT/giá trị secret trùng với env cá nhân/môi trường test |
| So sánh snapshot với `/v3/api-docs` của stack thật                                                                              | **PASS**, cùng **20 method/path/operationId trên 14 paths**; khác biệt mô tả/schema lỗi ảnh đã ghi ở mục 2                                |


Lần Maven đầu tiên **FAIL vì Docker daemon chưa chạy**, 73 unit/architecture PASS,
4 integration suites lỗi khởi tạo (không skip). Sau khi khởi động Docker Desktop,
đã chạy lại **clean verify đầy đủ** và đạt kết quả nêu trên; không che lỗi bằng skip.

Logs local trong `.tools/phase1-docs-{maven,frontend,compose,browser}.log`, npm audit
JSON và runtime OpenAPI JSON cũng tại `.tools/`; đều ignored, không dùng làm bằng
chứng mà người clone mới tự có sẵn. Stack kiểm tra tách biệt, không dùng `.env` hoặc
volume database chính. Containers kiểm tra được dừng sau khi xác minh, giữ volume.

**Giới hạn:** không chạy lại benchmark k6/Kaggle, không gọi remote GitHub Actions,
không xác minh cloud deploy/public visibility, không diễn tập thuyết trình có bấm
giờ. Browser suite có **2 scenario dashboard PASS** (thống kê/ngày/i18n/responsive
và citizen bị chặn); chưa có scenario browser riêng cho ảnh minh chứng. Ảnh có
integration/component tests cùng smoke upload nói trên. Lượt này không lặp audit WCAG toàn diện hoặc chứng nhận
bảo mật toàn lịch sử Git. Chỉ quét dữ liệu nhạy cảm trong các file mới/sửa.

README có 170 dòng, khoảng 1.464 đơn vị phân tách bằng khoảng trắng; phần lời nói
của kịch bản khoảng 993 đơn vị (không tính Q&amp;A/chỉ dẫn). README giữ vai trò tài liệu
vào dự án ngắn, các bảng bằng chứng chuyển sang đây;
ước lượng khoảng 3–4 trang với định dạng gọn, số trang phụ thuộc renderer/font/lề.
Kịch bản nói tách Q&amp;A và demo; nhịp 6 phút là mục tiêu phân bổ, chưa phải số đo diễn tập.

## 4. Những mô tả lịch sử cần hiểu đúng

[Audit A3](qa/phase1-final-audit.md) và handoffs được giữ làm evidence lịch sử;
ghi chú hiệu đính đầu audit trỏ về đây. Không diễn giải nhãn DONE trong chúng thành
chứng nhận mọi chức năng hoặc deployment đã được kiểm tra ở commit mới.


| Mô tả cũ                                                                          | Kết quả đối chiếu code                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React18, frontend port3000                                                        | package.json pin React19.3.0, Compose FRONTEND\_PORT mặc định5173                                                                                                                            |
| JPA cho Rescue                                                                    | Rescue dùng JdbcMissionStore/JdbcRescueTeamStore                                                                                                                                             |
| 4 CI jobs backend-verify/frontend-verify/compose-smoke/browser-e2e                | Workflow có 3 jobs `verify`, `frontend`, `browser-e2e`; smoke nằm trong verify                                                                                                               |
| UPDATE team status AVAILABLE, partial unique report                               | rescue\_teams không có cột status; report\_id UNIQUE toàn vòng đời; partial unique active team\_id                                                                                           |
| Reporting race trả REPORT\_NOT\_PENDING                                           | ReportErrors map InvalidReportTransition thành **409 INVALID\_TRANSITION**                                                                                                                   |
| FlywayMigrationIT, IdentityBootstrapIT, IdentityIT, DisasterIT, OpenApiContractIT | Không có các class mang tên này trong checkout. Các kiểm tra liên quan nằm trong GdrnApplicationIT, ReportingIT, RescueIT, DashboardIT và unit tests; không dùng tên class giả làm dẫn chứng |
| ProblemDetail/RFC7807; khóa gdrn.auth.session                                     | ApiError DTO riêng; session.ts dùng **gdrn.session**                                                                                                                                         |
| `benchmark/kaggle/gdrn-d3-kaggle-benchmark.ipynb`                                 | File hiện có là `benchmark/kaggle_cpu_preflight.ipynb`; môi trường Kaggle server **Chưa xác định**, không suy ra Kaggle không hỗ trợ Docker từ lần preflight local                           |
| Benchmark p95=73,68ms, 5 kịch bản                                                 | Handoff D3 liệt kê **6 hàng số đo**, p95 ở E08 page100VU là **78,70ms**; lần này không tái đo                                                                                                |
| Số đo100VU chứng minh nghẽn ghi/Tomcat/ST\_DWithin                                | Mức100VU thuộc **E08 page**, chỉ cho thấy độ trễ/tài nguyên của topology đã đo; chưa có profiling để xác định nguyên nhân hoặc chọn broker/cache                                             |


## 5. Rủi ro và việc cần bàn giao

1. **Ảnh không bền qua thay container:** Compose chỉ mount DB; metadata và file có
 thể lệch. Cần volume/private storage, quyền ghi, backup/restore cả hai và thử phục
 hồi trước khi dùng dữ liệu cần giữ. Chưa có job dọn orphan file sau storage error.
2. **Proxy upload lỗi đã xác nhận:** PNG \~3MiB được backend chấp nhận nhưng Nginx
 trả413 HTML; frontend có thể không nhận ApiError như mong đợi. Cần review cấu
 hình Nginx và kiểm thử đường đi SPA→proxy→backend ở biên 5MiB/6MB multipart.
3. **Dependency audit:** npm báo `undici` high; cần đánh giá dependency path và update
 có kiểm thử theo phạm vi được duyệt. Không kết luận khả năng khai thác production
 chỉ từ npm severity. Build còn map chunk \~1MB minified, lazy-loaded.
4. **Auth/vận hành:** tài khoản bootstrap demo, JWT chưa refresh/revoke, chưa có
 quản trị tài khoản, TLS/HA/backup runbook production được kiểm chứng; không dùng
 profile demo như quy trình quản trị thật. Bind loopback hiện chỉ phù hợp local.
5. **Contract runtime:** bổ sung lỗi ảnh/413 vào JSON runtime và kiểm tra Swagger
 tương ứng sau review; snapshot tài liệu đã mô tả theo handler, không đổi behavior.
6. **Evidence cần chuyển cùng bàn giao:** raw D3 dưới `benchmark/results/` bị ignore.
 Máy hiện có 7 thư mục run, trong khi handoff tổng hợp 6 hàng; cần chọn đúng manifest,
 raw/summary/seed/docker-stats cho từng phép đo, không lấy thư mục trung gian làm
 phép đo mới. Chưa chạy Kaggle server và không có bằng chứng before/after.
7. **Gate ngoài máy:** cần đối chiếu remote CI cho revision được nộp và điều kiện
 rubric Kaggle/public với giảng viên; trạng thái hiện tại **Chưa xác định** trong
 lượt này. Kết quả local không thay kết quả remote hay yêu cầu nghiệm thu bắt buộc.

Những điểm trên là findings/hạn chế bàn giao, không phải task catalog mới. Chọn việc
triển khai tiếp theo theo catalog và review contract/ADR khi cần. Không đưa sẵn
Redis, broker hay microservices vào hệ thống khi chưa có bằng chứng.

## 6. Đánh giá mức sẵn sàng Phase 2

**Đủ nền tảng để nhóm tiếp theo tiếp nhận phát triển có điều kiện**: code nghiệp vụ,
ports/contracts, migration, tests và cách chạy local rõ; kiểm tra kỹ thuật core đạt
trên Docker local. Có thể dùng làm baseline học thuật khi chuyển kèm đúng artifact.

**Chưa sẵn sàng production; chưa thể xác nhận hoàn tất toàn bộ rubric Phase 1** khi
các gate ngoài máy chưa có bằng chứng phù hợp. Trước báo cáo cần công khai lỗi proxy
upload, giới hạn lưu ảnh, kết quả audit dependency và phần Kaggle/remoteCI chưa xác
minh; không trình bày số đo local như chứng minh cần kiến trúc phân tán.
