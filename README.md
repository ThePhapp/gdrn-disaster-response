# Global Disaster Response Network (GDRN)

## 1. Bài toán và nghiệp vụ

Thông tin sự cố trao đổi rời rạc khiến người dân khó theo dõi yêu cầu, điều phối viên
khó xác minh vị trí và biết đội nào còn rảnh. GDRN tập hợp báo cáo có tọa độ, quyết
định xác minh và tiến độ cứu hộ trong một hệ thống. Phase 1 có **20 API, 7 màn hình**.

| Người dùng            | Chức năng đã có                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| CITIZEN - người dân   | Gửi mô tả/loại sự cố/tọa độ; xem báo cáo của mình; rút khi PENDING; đính kèm ảnh và xem tiến độ cứu hộ.                           |
| AUTHORITY - điều phối | Quản lý thảm họa; lọc báo cáo theo trạng thái/bán kính; xác minh hoặc từ chối; phân công đội, cập nhật nhiệm vụ và xem dashboard. |

Luồng chính: **gửi báo cáo PENDING → xác minh VERIFIED và gắn thảm họa ACTIVE →
chọn đội rảnh → nhiệm vụ ASSIGNED → IN_PROGRESS → COMPLETED → người dân theo dõi**.
Báo cáo có thể bị REJECTED kèm lý do; thảm họa chỉ chuyển ACTIVE → RESOLVED.

Quy tắc cần giữ: không đọc chéo báo cáo giữa hai citizen; một báo cáo chỉ có một
nhiệm vụ trong toàn vòng đời; một đội chỉ có một nhiệm vụ đang hoạt động. Dashboard

## 2. Kiến trúc, mã nguồn và yêu cầu kỹ thuật

**Modular Monolith**: một Spring Boot backend, một SPA và PostgreSQL/PostGIS.
Luồng triển khai: `Browser → Nginx/Vite proxy /api → backend → database/private files`.
Giữ một ứng dụng để đơn giản hóa triển khai và giao dịch; chưa có bằng chứng cần tách dịch vụ.

| Thành phần        | Framework/công nghệ hiện dùng                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Backend           | Java 21, Spring Boot 3.5.16; Web, Security, Actuator; Maven Wrapper 3.9.9.                                           |
| Dữ liệu           | PostgreSQL 16/PostGIS 3.5; Flyway V1-V7; JPA/Hibernate cho Identity/Disaster, JDBC cho Reporting/Rescue và thống kê. |
| Frontend          | React 19.3.0, TypeScript 7.0.2, Vite 8.3.4, Router 7.18.4; MapLibre 6.11.2; Node 22.14.0.                            |
| Đóng gói/kiểm thử | Docker Compose, Nginx 1.27; JUnit/Mockito, ArchUnit, Testcontainers, Vitest, Playwright và k6.                       |

```text
src/main/java/com/gdrn/
  identity/ disaster/ reporting/ rescue/ dashboard/ shared/
  <module>/api/ application/ domain/ infrastructure/
src/main/resources/       # application.yml, db/migration/V1-V7, openapi/*.json
src/test/                 # domain, orchestration, architecture, integration
frontend/src/             # app, auth, features theo nghiệp vụ, shared
frontend/e2e/             # kiểm thử trình duyệt
scripts/                  # setup, build/start/stop, browser regression
benchmark/                # k6, dữ liệu/runner, notebook preflight
```

Theo DDD/Hexagonal, domain là Java thuần; controller xử lý HTTP, application điều
phối use case qua ports, infrastructure hiện thực adapters. Module chỉ tạo lớp khi
cần; Dashboard là use case đọc, không có aggregate/bảng riêng. Phụ thuộc liên module:
`Rescue → Reporting → Disaster`, `Dashboard → Reporting/Rescue`, qua published contracts,
không truy cập infrastructure hoặc join bảng của nhau. `shared` chỉ chứa kỹ thuật chung.

JWT HS256 hết hạn sau 15 phút, BCrypt, default-deny và kiểm tra role/ownership;
SPA giữ phiên trong `sessionStorage`. Flyway quản lý schema, Hibernate chỉ validate.
PostGIS `geography(Point,4326)` + GiST + `ST_DWithin` lọc khoảng cách theo mét.
Conditional updates/version chống ghi đè; UNIQUE report và partial UNIQUE active-team
chống phân công trùng. Domain test không cần Spring, adapter test dùng PostGIS thật.
Xem [C4](docs/architecture/architecture-overview.md), [contracts](docs/architecture/phase1-module-contracts.md), [ADRs](docs/adr/).

## 3. Đặc tả và preview API

[**docs/openapi.yaml**](docs/openapi.yaml) là OpenAPI **3.0.3**, đủ **20 operations/14 paths**,
request/response, ví dụ, mã lỗi, Bearer authentication và quyền.

| Nhóm          | API thực tế                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity (2)  | POST `/api/auth/login`; GET `/api/auth/me`                                                                                                                  |
| Disaster (4)  | GET/POST `/api/disasters`; GET/PATCH `/api/disasters/{id}`                                                                                                  |
| Reporting (5) | POST/GET `/api/reports`; GET/DELETE `/api/reports/{id}`; PATCH `/api/reports/{id}/verification`                                                             |
| Rescue (4)    | GET `/api/rescue-teams`; POST/GET `/api/rescue-missions`; PATCH `/api/rescue-missions/{id}/status`                                                          |
| Dashboard (1) | GET `/api/dashboard`                                                                                                                                        |
| Evidence (4)  | POST/GET `/api/reports/{id}/attachments`; GET `/api/reports/{id}/attachments/{attachmentId}/content`; DELETE `/api/reports/{id}/attachments/{attachmentId}` |

DTO, query filters và lỗi chi tiết nằm trong YAML.

**Xem tài liệu API:** mở [Swagger Editor](https://editor.swagger.io/) và tải lên
file `docs/openapi.yaml` (hoặc dán nội dung file). Bạn có thể xem từng chức năng,
thông tin cần nhập và kết quả trả về mà không cần khởi động dự án.

**Thử trực tiếp:** sau khi khởi động dự án theo hướng dẫn bên dưới, mở
[Swagger UI](http://127.0.0.1:8080/swagger-ui/index.html) và thực hiện:

1. Chọn `POST /api/auth/login`, bấm **Try it out**, nhập tài khoản rồi bấm **Execute** để đăng nhập.
2. Sao chép mã đăng nhập ở trường `accessToken` trong kết quả trả về.
3. Bấm **Authorize** ở đầu trang, dán mã vừa sao chép để xác nhận đăng nhập.
4. Chọn chức năng muốn thử, bấm **Try it out**, điền thông tin và bấm **Execute** để xem kết quả.

Các chức năng ngoài đăng nhập yêu cầu tài khoản có quyền phù hợp. Nếu dự án dùng
cổng khác, thay `8080` trong địa chỉ bằng giá trị `APP_PORT` trong `.env`
(ví dụ: `18080`).

## 4. Cài đặt, build và triển khai

Cần Git, PowerShell >=5.1 và Docker Desktop **Linux containers**. Chạy Maven trên
host cần JDK21; phát triển SPA cần Node **22.14.0** (`frontend/.nvmrc`). Từ root repo:

```powershell
.\scripts\local.ps1 -Action setup  # Tạo/bổ sung .env, secret và tài khoản demo
.\scripts\dev.ps1 up              # Build/chạy DB, backend, frontend; kiểm tra health
```

Mặc định: [SPA](http://127.0.0.1:5173/login) **5173**, API/Swagger **8080**, PostgreSQL
**5432**; health tại `/actuator/health/readiness`. `.env` quyết định
`FRONTEND_PORT/APP_PORT/DB_PORT`, DB credentials, `JWT_SECRET_BASE64` (>=32 byte),
profile `demo` và ba cặp `DEMO_*_EMAIL/PASSWORD`. Lấy tài khoản từ `.env` riêng,
không commit secret; volume DB cũ phải dùng credentials gốc. Bản đồ cần cấu hình
public `VITE_MAP*` lúc build; thiếu cấu hình vẫn nhập tọa độ thủ công được.

Backend image build Maven → JAR → JRE21 chạy user riêng; frontend build `npm ci`
→ `dist/` → Nginx phục vụ SPA và proxy `/api`. Compose chờ DB/backend healthy;
Flyway tự migrate khi khởi động. Muốn dùng Vite host: thay `dev.ps1 up` bằng
`local.ps1 -Action start`. Dừng bằng `dev.ps1 down` hoặc `local.ps1 -Action stop`, giữ DB volume.

```powershell
.\mvnw.cmd clean verify            # Unit + architecture + PostGIS integration; cần Docker
Push-Location frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
Pop-Location
.\scripts\browser-e2e.ps1           # Sau khi stack demo đã chạy
```

CI có 3 jobs: `verify`, `frontend`, `browser-e2e`. Dockerfile package bỏ tests nên
image build không thay thế `clean verify`. Lần rà soát đã ghi nhận **130 backend,
93 frontend tests PASS**, browser **18 PASS/5 map skip**; [biên bản](docs/PHASE1_REVIEW.md)
ghi rõ revision và giới hạn, không coi số cũ là kiểm chứng cho mọi commit.
Đã kiểm chứng Compose local; **chưa xác nhận cloud/production**. Chuyển máy cần
secret riêng, TLS/reverse proxy, quyền PostGIS và backup/restore cả DB lẫn ảnh.
Hướng dẫn chi tiết: [runbook](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md), [review/demo data](docs/PRODUCT_REVIEW.md).

## 5. Kiểm thử tải

Hệ thống dùng mô phỏng nhiều người dùng truy cập đồng thời, nhằm đánh giá
tốc độ xử lý và mức độ ổn định của chức năng gửi/tra cứu báo cáo sự cố.
Phạm vi đo là API báo cáo với tài khoản người dân, chưa bao gồm giao diện, tải ảnh,
điều phối cứu hộ hay dashboard.

| Kịch bản        | Nội dung kiểm thử                                |
| --------------- | ------------------------------------------------ |
| Gửi báo cáo     | Nhiều người dân đồng thời gửi báo cáo sự cố mới. |
| Xem danh sách   | Truy vấn danh sách báo cáo theo từng trang.      |
| Tìm theo vị trí | Tìm các báo cáo trong một bán kính địa lý.       |

Dữ liệu thử nghiệm gồm 5 loại báo cáo, với **70% vị trí tập trung và 30% phân tán**.
Số người dùng ảo tăng dần, duy trì ở mức cần đo rồi giảm về 0 khi kết thúc.

### Kết quả đã ghi nhận

Số liệu dưới đây lấy từ [báo cáo kết quả kiểm thử](docs/handoffs/D3.md), đo ngày
**24/10/2026** trên Windows, Intel Core i5-12500H, 16 logical processors,
15.7 GiB RAM; backend, PostGIS và k6 chạy qua Docker Desktop. Đây là kết quả trên
máy thử nghiệm tại thời điểm đo

| Kịch bản                  | Số báo cáo ban đầu |  VU | Thông lượng (req/s) | Trung bình (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Tỷ lệ lỗi |
| ------------------------- | -----------------: | --: | ------------------: | --------------: | -------: | -------: | -------: | --------: |
| Ghi báo cáo               |      0 (sau reset) |   1 |              164.57 |            3.81 |     3.67 |     4.98 |     5.82 |        0% |
| Đọc phân trang — smoke    |                100 |   1 |              137.71 |            5.00 |     4.73 |     7.67 |    10.85 |        0% |
| Đọc theo bán kính — smoke |                100 |   1 |              156.06 |            4.31 |     4.10 |     5.85 |     7.78 |        0% |
| Đọc phân trang            |              1,000 |  10 |              928.17 |            7.23 |     6.49 |    12.58 |    17.55 |        0% |
| Đọc phân trang            |              1,000 |  50 |            1,439.13 |           18.93 |    17.35 |    36.35 |    48.63 |        0% |
| Đọc phân trang            |              1,000 | 100 |            1,996.98 |           34.93 |    30.19 |    78.70 |   105.28 |        0% |

**VU** là số người dùng ảo hoạt động đồng thời; **req/s** là số yêu cầu xử lý mỗi
giây; **p50/p95/p99** là mức thời gian phản hồi mà 50%/95%/99% mẫu đo
không vượt quá. Với 1,000 báo cáo, tăng từ 10 lên 100 VU làm thông lượng tăng từ
928.17 lên 1,996.98 req/s, đồng thời p95 tăng từ 12.58 lên 78.70 ms. Chưa đủ dữ
liệu để kết luận tải tối đa hoặc nguyên nhân nghẽn. Lần chạy 50 VU có một vòng
thực thi bị ngắt khi kết thúc tải, nhưng không ghi nhận yêu cầu HTTP hay kiểm tra
phản hồi thất bại.

Cách chuẩn bị dữ liệu, chạy lại và lưu kết quả được mô tả trong
[hướng dẫn kiểm thử tải](benchmark/README.md).

## 6. Vấn đề dễ thấy và bàn giao Phase 2

| Hiện trạng đã thấy                                                              | Điều nhóm tiếp nhận cần kiểm chứng/cải tiến                                                                                                                             |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compose gốc chỉ mount DB; ảnh nằm trong backend container.                      | Metadata có thể còn nhưng mất file khi thay container. Có [override review](docker-compose.review.yml); cần cấu hình storage bền, quyền ghi và diễn tập backup/restore. |
| Nginx trả 413 với PNG hợp lệ khoảng 3 MiB trong lần review.                     | Đồng bộ giới hạn proxy với luật 5 MiB/ảnh và multipart 6MB; kiểm thử qua cả SPA → Nginx → backend.                                                                      |
| Build có map chunk khoảng 1 MB; audit từng báo `undici` high.                   | Đo tải trang, chạy lại audit và đánh giá dependency path trước khi cập nhật; không suy từ cảnh báo thành kết luận khai thác.                                            |
| JWT chưa refresh/revoke; tài khoản bootstrap demo; chưa có bằng chứng HA/cloud. | Làm rõ nhu cầu vận hành, quản trị tài khoản và bảo mật trước khi triển khai ngoài local.                                                                                |
| Mới có kết quả kiểm thử tải trên máy local; dữ liệu đo gốc không lưu trong Git. | Bàn giao dữ liệu đo và cấu hình máy, đo lại cùng kịch bản và phân tích điểm nghẽn trước khi chọn cache, queue hay microservices.                                        |

Nhóm nhận đọc README → [API](docs/openapi.yaml) → [contracts/ADRs](docs/architecture/phase1-module-contracts.md)
→ [evidence/hạn chế](docs/PHASE1_REVIEW.md), tự chạy stack và checks. Giữ các ràng buộc
nghiệp vụ, module boundaries và migration đã phát hành. Đổi kiến trúc cần số liệu
before/after và ADR; các nhận xét trên là findings bàn giao, không thay
[catalog triển khai](docs/PHASE1_PLAN.md), [quy tắc phát triển](CONTRIBUTING.md) và
[bối cảnh dài hạn](GDRN_PROJECT_CONTEXT.md).
