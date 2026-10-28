# Global Disaster Response Network (GDRN)

**Hệ thống Điều phối và Ứng phó Thảm họa Toàn cầu** — dự án mô phỏng môn Kiến trúc
phần mềm. GDRN tập trung hóa báo cáo sự cố có vị trí để người dân theo dõi yêu cầu
và điều phối viên xác minh, gắn thảm họa, phân công cứu hộ. Đây là mô hình học thuật,
chưa phải hệ thống cứu hộ vận hành thực tế.

## Nghiệp vụ và phạm vi Phase 1

Đối chiếu mã nguồn tại `main` **`2ddf9d0`**, ngày **28/10/2026**: baseline MVP có
15 API/6 màn hình; dashboard và ảnh minh chứng đã mở rộng thành **20 API nghiệp vụ,
7 màn hình, Flyway V1–V7**. Chức năng đã có code khác với chứng nhận sẵn sàng production.

| Phần đã triển khai | Chức năng / người dùng |
| --- | --- |
| Identity | Đăng nhập, thông tin cá nhân; JWT HS256 15 phút, BCrypt; CITIZEN/AUTHORITY |
| Disaster | Xem/lọc; điều phối viên tạo/cập nhật, chuyển ACTIVE → RESOLVED, kiểm tra version |
| Reporting | Người dân gửi/xem báo cáo của mình, rút khi PENDING; điều phối viên duyệt/từ chối, gắn thảm họa ACTIVE, lọc bán kính PostGIS |
| Rescue | Xem đội rảnh/bận, phân công báo cáo VERIFIED; ASSIGNED → IN_PROGRESS → COMPLETED; người dân xem tiến độ của mình |
| Dashboard | Thống kê toàn cục cho AUTHORITY; lọc ngày UTC+7; số đội luôn là trạng thái hiện tại |
| Ảnh minh chứng | JPEG/PNG, tối đa 5 ảnh/báo cáo, 5 MiB/ảnh; upload/xóa khi PENDING; đọc ảnh qua API có kiểm tra quyền |
| SPA | Anh/Việt, phân quyền route, nhập tọa độ/bản đồ tùy chọn, giao diện responsive |

Luồng chính: **người dân đăng nhập → gửi báo cáo PENDING → điều phối viên xác minh
và gắn thảm họa ACTIVE → phân đội rảnh → bắt đầu/hoàn thành nhiệm vụ → người dân xem
tiến độ**. Quyền sở hữu hạn chế lộ dữ liệu; ràng buộc database ngăn phân trùng đội/báo cáo.

**Chưa triển khai:** đăng ký/quản trị tài khoản, refresh token, cảnh báo và tài nguyên,
tự động tính ưu tiên/phân đội, GPS/geocoding/theo dõi đội trực tiếp, event bus.
Không có tính năng đang phát triển dở được xác nhận trong checkout này; xem các giới
hạn kiểm chứng và việc cần bàn giao tại [báo cáo rà soát](docs/PHASE1_REVIEW.md).

## Công nghệ và kiến trúc

| Thành phần | Công nghệ từ cấu hình / vai trò |
| --- | --- |
| Backend | Java **21**, Spring Boot **3.5.16**; Web, Security/OAuth2 Resource Server, Actuator |
| Database | PostgreSQL **16** + PostGIS **3.5**; Flyway quản lý schema, Hibernate chỉ validate |
| Persistence | Spring Data JPA/Hibernate cho Identity/Disaster; JDBC data mapper cho Reporting/Rescue và các truy vấn thống kê |
| Frontend | React **19.3.0**, TypeScript **7.0.2**, Vite **8.3.4**, Router **7.18.4**; MapLibre **6.11.2** |
| Công cụ | Maven Wrapper **3.9.9**; Node **22.14.0**, npm lockfile; Docker Compose, Nginx **1.27** |
| Kiểm thử/API | JUnit, Mockito, ArchUnit, Testcontainers/PostGIS; Vitest, Playwright; springdoc **2.8.17**, OpenAPI; k6 benchmark |

Một backend **Modular Monolith**, một SPA và một PostgreSQL/PostGIS. Domain plain
Java; API gọi application; infrastructure hiện thực ports, phụ thuộc hướng vào trong.
Published queries: `Rescue → Reporting → Disaster`, `Dashboard → Reporting/Rescue`.
Không join/FK xuyên module. ADR 001/002/003 giải thích lựa chọn: nhóm nhỏ, giao dịch
cục bộ và dữ liệu địa lý; chưa có bằng chứng cần phân tán.

```text
.
├── src/main/java/com/gdrn/   # identity, disaster, reporting, rescue, dashboard, shared
│   └── <module>/           # api, application, infrastructure; domain khi có nghiệp vụ
├── src/main/resources/     # application*.yml, db/migration/V1–V7, openapi/*.json
├── src/test/               # domain, orchestration, architecture và integration tests
├── frontend/               # React SPA: src/{app,auth,features,shared}, e2e, Nginx
├── scripts/                # local.ps1, dev.ps1, browser-e2e.ps1
├── benchmark/              # generator, k6, runner, notebook preflight
├── docs/                   # contracts, ADRs, runbooks, handoffs, tài liệu báo cáo
├── pom.xml                 # Backend; mvnw / mvnw.cmd
├── Dockerfile              # Backend multi-stage
├── docker-compose.yml      # database, backend, frontend
└── .env.example            # Mẫu cấu hình, không chứa secret thật
```

`alert/resource/geo` hiện chỉ giữ package boundaries; lọc không gian thực tế nằm ở
Reporting. Xem [C4 và dữ liệu](docs/architecture/architecture-overview.md).

## Cài đặt và chạy

Cần Git, Docker Desktop chạy **Linux containers**, PowerShell ≥5.1. Phát triển SPA
cần Node **22.14.0** (`frontend/.nvmrc`); chạy Maven trên host cần JDK **21**.
Dockerfile tự tải Maven/backend dependencies và `npm ci` khi build image.

```powershell
git clone https://github.com/ThePhapp/gdrn-disaster-response.git
cd gdrn-disaster-response
.\scripts\local.ps1 -Action setup
.\scripts\dev.ps1 up
```

`setup` tạo/bổ sung `.env`, sinh secret và tài khoản demo, giữ cấu hình đã có.
`dev.ps1 up` build/chạy cả DB, backend và frontend production, kiểm tra health/smoke.
Flyway tự tạo schema khi backend khởi động; profile `demo` tạo tài khoản/đội cứu hộ,
không có mật khẩu trong migration. Lấy tài khoản từ `.env` cá nhân, không đưa vào Git.
Với volume cũ, dùng credentials gốc của volume; không xóa volume để chữa lỗi đăng nhập DB.

Biến cần biết: `POSTGRES_DB/USER/PASSWORD`; `DB_URL/USERNAME/PASSWORD` cho backend host;
`JWT_SECRET_BASE64` mã hóa ≥32 byte ngẫu nhiên; `APP_PORT/DB_PORT/FRONTEND_PORT`
(mặc định **8080/5432/5173**). `SPRING_PROFILES_ACTIVE=demo` và ba cặp
`DEMO_*_EMAIL/PASSWORD` dùng cho demo. `REPORT_ATTACHMENT_STORAGE_ROOT` dùng cho
backend host; Compose hiện chưa truyền biến này hoặc mount volume ảnh.
`VITE_MAPTILER_KEY` hoặc `VITE_MAP_STYLE_URL`, `VITE_MAP_ATTRIBUTION` là tùy chọn,
public trong bundle; không cấu hình vẫn nhập tọa độ thủ công được.

Mở [SPA /login](http://127.0.0.1:5173/login),
[health](http://127.0.0.1:8080/actuator/health) (mong đợi `UP`) và
[Swagger](http://127.0.0.1:8080/swagger-ui/index.html). Đổi URL nếu đổi port.
JWT lưu `sessionStorage` khóa `gdrn.session`; reload cùng tab giữ phiên đến hết hạn.
Frontend gọi relative `/api` qua Nginx hoặc Vite proxy.

Để phát triển với Vite trên host, thay `dev.ps1 up` bằng
`.\scripts\local.ps1 -Action start` (tự `npm ci`, chạy DB/backend và Vite).
Dừng đúng chế độ: `local.ps1 -Action stop` hoặc `dev.ps1 down`; đều giữ database volume.
Hướng dẫn backend chạy bằng Maven và debug: [runbook](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md),
[env/auth local](docs/P01_LOCAL.md).

## Build, kiểm tra và deploy

```powershell
# Tại root; Docker phải đang chạy cho integration tests
.\mvnw.cmd clean verify
docker compose --env-file .env.example config --quiet
# Frontend (chạy xong quay về root)
Push-Location frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
Pop-Location
# Sau khi stack demo đã chạy
.\scripts\browser-e2e.ps1
```

Build ra `target/gdrn-0.0.1-SNAPSHOT.jar` và `frontend/dist/`. Image backend dùng
JRE21, frontend dùng Nginx; `dev.ps1 up` build/chạy Compose. Dockerfile package bỏ
chạy tests khi lắp image, vì vậy image build không thay thế `clean verify`.
CI thực tế có **3 jobs**: `verify` (backend + Compose smoke), `frontend`, `browser-e2e`.

**Đã kiểm chứng local trong lượt rà soát:** backend 130 tests, frontend 93 tests,
typecheck/build; chi tiết Compose/browser/validation ở [biên bản](docs/PHASE1_REVIEW.md).
**Server/cloud:** chưa triển khai được xác nhận. Compose bind loopback; chuyển máy
cần cấu hình secret, TLS/reverse proxy, quyền PostGIS, backup/restore DB **và ảnh**,
volume ảnh bền vững, giới hạn upload Nginx phù hợp và chính sách tài khoản ngoài demo.

## API và tài liệu báo cáo

[**OpenAPI 3.0.3 — 20 operations**](docs/openapi.yaml) mô tả endpoint thực tế, DTO,
validation, response, lỗi và quyền. Dán file vào Swagger Editor hoặc import bằng công
cụ OpenAPI 3.x; Swagger runtime dùng `/v3/api-docs` (có thể khác ở mức mô tả lỗi/ví dụ).
Validator: `python docs/api/validate_openapi.py` với dependencies ghi trong file.

- [Kịch bản nói 6 phút + 10 câu hỏi](docs/PHASE1_PRESENTATION.md);
  [demo thao tác 8–10 phút](docs/qa/phase1-demo-script.md).
- [Báo cáo rà soát/đóng góp/hạn chế](docs/PHASE1_REVIEW.md),
  [progress](docs/phase1-progress.md), [ADRs](docs/adr/).
- [Catalog duy nhất để chọn task](docs/PROMPTS_PHA_1_4_NGUOI.md),
  [module contracts](docs/architecture/phase1-module-contracts.md), [AGENTS](AGENTS.md).

## Bàn giao Phase 2 và đóng góp

Các điểm cần xử lý: volume ảnh/backup chưa có trong Compose; proxy đã trả 413 cho
ảnh hợp lệ ~3 MiB; `npm audit` hiện báo **1 dependency high (`undici`)**; map chunk lớn;
chưa xác minh cloud/Kaggle server hoặc remote CI trong lượt này. Raw benchmark bị
ignore, nhóm nhận phải được bàn giao riêng; kết quả local không chứng minh bottleneck
Tomcat/PostGIS cụ thể. Chưa có refresh token, quy trình tài khoản production hoặc HA.

Phase 2 nên ưu tiên khả năng vận hành, đo lại workload đọc/ghi/bán kính và profiling;
chỉ chọn cache, async hoặc tách dịch vụ sau khi có số đo và ADR. Không mặc định thêm
Redis/RabbitMQ/Kafka/microservices. [Biên bản](docs/PHASE1_REVIEW.md) ghi mức sẵn sàng có điều kiện.

Git tại `2ddf9d0`: **163 commits = 120 non-merge + 43 merge**, 7 định danh author.
`Thế Pháp` có **79 + 11** commits ở hai email; `leducanhtai` **33**;
`Lê Đức Anh Tài` **13**; `handle08` **13**; `Handle08` **9**; `tranvy` **5**.
Giữ riêng từng email, chưa gộp danh tính khi thiếu xác nhận. Nội dung nổi bật:
Pháp — Disaster/B2/Rescue UI/dashboard/ảnh/CI/benchmark;
leducanhtai — P01/B1/UI và integration;
handle08 — Rescue backend, C3/A3; tranvy — citizen reporting UI.
Các identity còn lại chủ yếu ghi nhận merge. Xem [thống kê và commit bằng chứng](docs/PHASE1_REVIEW.md#dong-gop-git);
số commit không đại diện đầy đủ khối lượng/chất lượng hay vai trò thực tế của thành viên.
