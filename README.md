# Global Disaster Response Network (GDRN)

## 1. Bài toán và nghiệp vụ

Thông tin sự cố trao đổi rời rạc khiến người dân khó theo dõi yêu cầu, điều phối viên
khó xác minh vị trí và biết đội nào còn rảnh. GDRN tập hợp báo cáo có tọa độ, quyết
định xác minh và tiến độ cứu hộ trong một hệ thống. Phase 1 có **20 API, 7 màn hình**.

| Người dùng | Chức năng đã có |
| --- | --- |
| CITIZEN - người dân | Gửi mô tả/loại sự cố/tọa độ; xem báo cáo của mình; rút khi PENDING; đính kèm ảnh và xem tiến độ cứu hộ. |
| AUTHORITY - điều phối | Quản lý thảm họa; lọc báo cáo theo trạng thái/bán kính; xác minh hoặc từ chối; phân công đội, cập nhật nhiệm vụ và xem dashboard. |

Luồng chính: **gửi báo cáo PENDING → xác minh VERIFIED và gắn thảm họa ACTIVE →
chọn đội rảnh → nhiệm vụ ASSIGNED → IN_PROGRESS → COMPLETED → người dân theo dõi**.
Báo cáo có thể bị REJECTED kèm lý do; thảm họa chỉ chuyển ACTIVE → RESOLVED.

Quy tắc cần giữ: không đọc chéo báo cáo giữa hai citizen; một báo cáo chỉ có một
nhiệm vụ trong toàn vòng đời; một đội chỉ có một nhiệm vụ đang hoạt động. Dashboard
lọc ngày theo UTC+7, nhưng số đội rảnh/bận luôn phản ánh hiện tại. Ảnh JPEG/PNG tối
đa **5 ảnh/báo cáo, 5 MiB/ảnh**; chỉ chủ báo cáo PENDING được upload/xóa.
Chưa có đăng ký/quản trị tài khoản, refresh token, cảnh báo/tài nguyên hoặc tự động phân đội.

## 2. Kiến trúc, mã nguồn và yêu cầu kỹ thuật

**Modular Monolith**: một Spring Boot backend, một SPA và PostgreSQL/PostGIS.
Luồng triển khai: `Browser → Nginx/Vite proxy /api → backend → database/private files`.
Giữ một ứng dụng để đơn giản hóa triển khai và giao dịch; chưa có bằng chứng cần tách dịch vụ.

| Thành phần | Framework/công nghệ hiện dùng |
| --- | --- |
| Backend | Java 21, Spring Boot 3.5.16; Web, Security, Actuator; Maven Wrapper 3.9.9. |
| Dữ liệu | PostgreSQL 16/PostGIS 3.5; Flyway V1-V7; JPA/Hibernate cho Identity/Disaster, JDBC cho Reporting/Rescue và thống kê. |
| Frontend | React 19.3.0, TypeScript 7.0.2, Vite 8.3.4, Router 7.18.4; MapLibre 6.11.2; Node 22.14.0. |
| Đóng gói/kiểm thử | Docker Compose, Nginx 1.27; JUnit/Mockito, ArchUnit, Testcontainers, Vitest, Playwright và k6. |

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
request/response, ví dụ, mã lỗi, Bearer authentication và quyền. Gồm Identity (2),
Disaster (4), Reporting (5), Rescue (4), Dashboard (1) và Evidence (4). Request tạo
báo cáo bắt đầu ở `POST /api/reports`; phân công ở `POST /api/rescue-missions`.
Đường dẫn, DTO, query filters và lỗi chi tiết nằm trong YAML để tránh lặp đặc tả.

**Preview không cần backend:** mở [Swagger Editor](https://editor.swagger.io/), import
file `docs/openapi.yaml` hoặc dán toàn bộ YAML vào editor để xem request/response.
**Thử API đang chạy:** mở [Swagger UI](http://127.0.0.1:8080/swagger-ui/index.html),
login lấy token, bấm **Authorize**, nhập JWT rồi dùng **Try it out**. Đổi port theo `.env`.
Runtime xuất JSON tại `/v3/api-docs`; bản YAML là snapshot bàn giao đã đối chiếu code.

Kiểm tra bằng `python docs/api/validate_openapi.py` sau khi cài dependencies ghi đầu file.
Login public; API còn lại cần Bearer JWT. JSON lỗi dùng `ApiError` của dự án.
Snapshot đã mô tả lỗi ảnh/413 mà JSON runtime còn thiếu; xem [biên bản](docs/PHASE1_REVIEW.md#2-api-thực-tế-và-nguồn-đặc-tả).

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

## 5. Vấn đề dễ thấy và bàn giao Phase 2

| Hiện trạng đã thấy | Điều nhóm tiếp nhận cần kiểm chứng/cải tiến |
| --- | --- |
| Compose gốc chỉ mount DB; ảnh nằm trong backend container. | Metadata có thể còn nhưng mất file khi thay container. Có [override review](docker-compose.review.yml); cần cấu hình storage bền, quyền ghi và diễn tập backup/restore. |
| Nginx trả 413 với PNG hợp lệ khoảng 3 MiB trong lần review. | Đồng bộ giới hạn proxy với luật 5 MiB/ảnh và multipart 6MB; kiểm thử qua cả SPA → Nginx → backend. |
| Build có map chunk khoảng 1 MB; audit từng báo `undici` high. | Đo tải trang, chạy lại audit và đánh giá dependency path trước khi cập nhật; không suy từ cảnh báo thành kết luận khai thác. |
| JWT chưa refresh/revoke; tài khoản bootstrap demo; chưa có bằng chứng HA/cloud. | Làm rõ nhu cầu vận hành, quản trị tài khoản và bảo mật trước khi triển khai ngoài local. |
| D3 có baseline local; raw kết quả bị ignore, Kaggle server chưa xác nhận. | Bàn giao manifest/raw/seed/cấu hình máy, tái đo cùng workload và profiling trước khi chọn cache, queue hay microservices. |

Nhóm nhận đọc README → [API](docs/openapi.yaml) → [contracts/ADRs](docs/architecture/phase1-module-contracts.md)
→ [evidence/hạn chế](docs/PHASE1_REVIEW.md), tự chạy stack và checks. Giữ các ràng buộc
nghiệp vụ, module boundaries và migration đã phát hành. Đổi kiến trúc cần số liệu
before/after và ADR; các nhận xét trên là findings bàn giao, không thay
[catalog triển khai](docs/PHASE1_PLAN.md), [quy tắc phát triển](CONTRIBUTING.md) và
[bối cảnh dài hạn](GDRN_PROJECT_CONTEXT.md).