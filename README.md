# Global Disaster Response Network (GDRN)

**Hệ thống Điều phối và Ứng phó Thảm họa Toàn cầu** — mô phỏng phục vụ môn Kiến trúc
phần mềm. Pha 1 dùng một Modular Monolith, DDD và Hexagonal/Clean Architecture,
một PostgreSQL/PostGIS và một React SPA. Đây không phải hệ thống cứu hộ vận hành thực tế.

## Bắt đầu

Cài Docker Desktop (Linux containers) và Node **22.14.0**. Chạy PowerShell tại root repo:

```powershell
.\scripts\local.ps1 -Action setup
.\scripts\local.ps1 -Action start
```

`setup` bổ sung cấu hình thiếu trong `.env`, giữ giá trị đã cấu hình. `start` chạy
backend/database bằng Compose và Vite trên host. Mở [Login](http://127.0.0.1:5173/login),
lấy tài khoản từ các cặp `DEMO_*_EMAIL/PASSWORD` trong `.env` cá nhân. Tài khoản và
BCrypt hash lưu thật trong database; seed chạy lại không reset password/role.
Không commit `.env`. Nếu volume DB đã tồn tại, phải dùng credentials gốc của volume.

```powershell
.\scripts\local.ps1 -Action status
.\scripts\local.ps1 -Action stop  # Giữ database volume
```

Backend dùng `APP_PORT`, DB dùng `DB_PORT`, frontend production dùng `FRONTEND_PORT`
trong `.env` (mặc định 8080/5432/5173). Chạy toàn bộ stack bằng Docker với:

```powershell
.\scripts\dev.ps1 init
.\scripts\dev.ps1 up
```

Mở [frontend production](http://127.0.0.1:5173/login); Nginx phục vụ SPA và proxy
relative `/api` tới backend qua mạng Compose. Cách `scripts/local.ps1` ở trên vẫn
dùng Vite host để phát triển nhanh.

Swagger ở `http://127.0.0.1:<APP_PORT>/swagger-ui/index.html`. Frontend port 5173
khác backend port; browser chỉ gọi `/api` qua Vite proxy hoặc Nginx proxy khi chạy
production. JWT nằm trong memory, reload/new tab cần login lại.

Hướng dẫn đầy đủ: [cài đặt/chạy/debug](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md) và
[env, auth, seed, frontend local](docs/P01_LOCAL.md). `scripts/dev.ps1` quản lý
Compose production và smoke/verify; dùng `local.ps1` khi muốn chạy Vite host.

## Runtime hiện có

**Bổ sung DS1 (18/10/2026):** AUTHORITY có [Dashboard thống kê](docs/api/dashboard-contract.md)
tại `/operations/dashboard` (mục Tổng quan/Dashboard trên thanh điều hướng).
E16 `GET /api/dashboard` tổng hợp reports theo trạng thái, missions đang xử lý và
đội rảnh hiện tại; lọc từ ngày–đến ngày theo giờ Việt Nam. Reports lọc theo ngày gửi,
missions theo ngày phân công; availability đội luôn phản ánh hiện tại.
Runtime của nhánh DS1 có **16 operations / 7 màn hình**, vẫn V1–V6 và cùng Modular
Monolith. Các mô tả E01–E15/S01–S06 bên dưới là phạm vi baseline trước DS1.

Nền hiện tại đã tích hợp E01–E15, S01–S06, UI01-A/UI01-C1 và A1 security audit.
Trạng thái merge và evidence tiếp tục được cập nhật tại [progress](docs/phase1-progress.md).

| Phần | Đã triển khai | Còn lại theo catalog |
| --- | --- | --- |
| Identity / P01 | E01 login, E02 me; JWT/BCrypt/demo seed; CITIZEN/AUTHORITY | A2 CI/E2E và các cổng tích hợp sau |
| Disaster / C1 | E03–E06; ACTIVE→RESOLVED; S05 `/operations/disasters` | UI01-B audit chung |
| Reporting / B1+B2+B3 | E07–E11; S02/S03/S04; ownership/radius/mission progress | UI01-B/X2 hồi quy xuyên luồng |
| Rescue / D1+D2 | E12–E15; S06 `/operations/rescue`; concurrency | UI01-B/X2 hồi quy xuyên luồng |
| Shared UI / A1 | Role nav/guard, memory session, error behavior, exact API allowlist | A2 runtime đã có; CI E2E chờ X2 |

Swagger runtime công bố **E01–E15** và frontend production chạy cùng origin qua Nginx.
Browser không dùng hostname `backend`; mọi client API dùng path tương đối `/api`.

Flyway hiện có **V1–V6** theo migration ledger; migration không chứa credentials/demo
accounts và Hibernate validate schema. Xem [progress](docs/phase1-progress.md) và
các handoff module cho contract, API examples và evidence.

## Nguồn tài liệu và cách phát triển

| Nhu cầu | Đọc ở đâu |
| --- | --- |
| Tình trạng hiện tại và bằng chứng merge | [Progress](docs/phase1-progress.md), [handoffs](docs/handoffs/) |
| HTTP/API/role/race | [P00 contract](docs/api/phase1-contract.md), [OpenAPI](docs/api/phase1-contract.yaml) |
| Published interfaces và cấp migration | [Module contracts/ledger](docs/architecture/phase1-module-contracts.md) |
| Kiến trúc và quyết định | [Architecture](docs/architecture/architecture-overview.md), [ADRs](docs/adr/) |
| Đo kiểm tải và bằng chứng hiệu năng | [Benchmark D3](docs/benchmark/D3.md), [Handoff D3](docs/handoffs/D3.md) |
| Ma trận rubric và đối chiếu kiểm toán | [Rubric Phase 1](docs/qa/phase1-rubric.md) |
| UI chung và cách dùng components | [Design system](docs/design/GDRN_UI_DESIGN_SYSTEM.md), [UI01-A](docs/handoffs/UI01-A.md) |
| Quy tắc phát triển | [AGENTS.md](AGENTS.md) |
| Tầm nhìn dài hạn/backlog | [Project context](GDRN_CODEX_PROJECT_CONTEXT.md) |

Dependency đi vào domain/application; domain plain Java, không JPA/Spring/HTTP.
Không truy cập infrastructure/table của module khác. Chiều published query mục tiêu
là Rescue → Reporting → Disaster; E09 không gọi Rescue, UI tiến độ dùng E09 +E14.
ReportingQuery đã có trong B2 và Rescue dùng published query contracts. Shared chỉ dành
cho technical concerns nhỏ có nhu cầu.

Resource/Alert, map/risk, user administration, refresh/register và event bus ngoài
scope MVP. Không đưa microservices, broker, Redis hoặc hạ tầng Pha2 vào Pha1;
Pha2 cần benchmark, vấn đề đo được và ADR. Backlog sản phẩm không tự động là Pha2.

## Stack và kiểm chứng

Java 21 / Spring Boot 3.5.16 / Maven Wrapper 3.9.9, PostgreSQL 16/PostGIS 3.5, Flyway,
JPA cho Identity/Disaster và JDBC data mapper cho Reporting. React/TypeScript/Vite
dùng phiên bản pin trong `frontend/package.json` và lockfile; Node pin tại `.nvmrc`.

```powershell
# Root; cần JDK21 và Docker, Testcontainers dùng DB riêng, không cần .env
.\mvnw.cmd clean verify
docker compose --env-file .env.example config --quiet

# Frontend
cd frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

`mvnw test` chỉ unit/architecture, không thay thế full verify. Browser thật dùng
`npm.cmd run test:login` sau khi backend/Vite đã chạy và nạp DEMO_* của cùng DB vào
process env; xem [hướng dẫn checks](docs/P01_LOCAL.md#checks). Suite hiện bao gồm
login, S05 và UI01; không phải toàn bộ luồng X2. C1 E2E tạo một disaster test thật
và kết thúc nó trong DB local, không xóa dữ liệu qua SQL để làm test xanh.

CI hiện chạy backend verify, validate/build Compose images, Compose smoke và frontend
typecheck/test/build; full browser E2E job chỉ ghép sau X2. Test counts và giới hạn môi trường được ghi
theo từng lần chạy trong handoff, không dùng con số cũ làm bằng chứng cho commit mới.
Khi Maven mirror/IDE gây lỗi, xem phần xử lý trong [runbook](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md).
