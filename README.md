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
production. JWT lưu theo phạm vi tab (`sessionStorage`, khóa `gdrn.auth.session`) để giữ
phiên khi reload cùng tab và tự xóa khi đóng tab hoặc logout.

Hướng dẫn đầy đủ: [cài đặt/chạy/debug](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md) và
[env, auth, seed, frontend local](docs/P01_LOCAL.md). `scripts/dev.ps1` quản lý
Compose production và smoke/verify; dùng `local.ps1` khi muốn chạy Vite host.

## Runtime hiện có

Nền tảng Pha 1 đã hoàn tất toàn bộ **16 task lõi + 3 checkpoint UI** (`P00` → `A3`)
cùng 2 gói mở rộng có kiểm soát (`DS1` Dashboard và `report-evidence-attachments`):

- **Baseline MVP (`P00`):** **15 endpoints (`E01`–`E15`)**, **6 màn hình (`S01`–`S06`)**, **Flyway `V1`–`V6`**.
- **Mở rộng có kiểm soát đã tích hợp vào `main`:**
  - **DS1 (`E16 GET /api/dashboard`, màn hình `S07 /operations/dashboard`):** Tổng hợp báo cáo theo trạng thái, nhiệm vụ đang xử lý và đội cứu hộ rảnh cho `AUTHORITY` ([dashboard-contract.md](docs/api/dashboard-contract.md), [ADR-009](docs/adr/009-dashboard-statistics.md)).
  - **Report Evidence Attachments (`E17`–`E20`, Flyway `V7`):** Đính kèm, liệt kê, tải và xóa ảnh minh chứng báo cáo lưu trữ riêng tư cho `PENDING` report ([report-evidence-attachments.md](docs/handoffs/report-evidence-attachments.md), [ADR-010](docs/adr/010-report-evidence-private-storage.md)).
- **Tổng phạm vi runtime hiện tại:** **20 OpenAPI operations (`E01`–`E20`)**, **7 màn hình (`S01`–`S07`)**, **Flyway `V1`–`V7`** (không chứa credentials/demo accounts trong SQL; Hibernate `ddl-auto: validate`).

| Phần | Đã triển khai | Trạng thái nghiệm thu Pha 1 |
| --- | --- | --- |
| Identity / P01 | E01 login, E02 me; JWT/BCrypt/idempotent demo seed; CITIZEN/AUTHORITY | Đã tích hợp & kiểm toán (`PASS`) |
| Disaster / C1 | E03–E06; ACTIVE→RESOLVED; S05 `/operations/disasters` | Đã tích hợp & kiểm toán (`PASS`) |
| Reporting / B1+B2+B3 + Attachments | E07–E11, E17–E20; S02/S03/S04; ownership, PostGIS radius, mission progress, private evidence | Đã tích hợp & kiểm toán (`PASS`) |
| Rescue / D1+D2 | E08 verified consumption, E12–E15; S06 `/operations/rescue`; atomic conditional update & partial unique index | Đã tích hợp & kiểm toán (`PASS`) |
| Dashboard / DS1 | E16; S07 `/operations/dashboard`; read-only aggregation cho AUTHORITY | Đã tích hợp & kiểm toán (`PASS`) |
| Shared UI / A1+A2+UI01+X1+X2 | Role nav/guard, tab-scoped session, exact API allowlist, Nginx SPA, CI + Playwright E2E | Đã tích hợp & kiểm toán (`PASS`) |
| Architecture / Benchmark / Audit (C3+D3+A3) | ADRs `001`–`010`, k6 raw benchmark (`D3`), kịch bản demo 8–10 phút (`C3`), kiểm toán cuối (`A3`) | Hoàn tất trên nhánh `feat/a3-final-audit` |

Swagger runtime công bố **20 operations (`E01`–`E20`)** và frontend production chạy cùng origin qua Nginx.
Browser không dùng hostname `backend`; mọi client API dùng path tương đối `/api`.
Xem [progress](docs/phase1-progress.md), [báo cáo kiểm toán cuối A3](docs/qa/phase1-final-audit.md)
và các handoff module cho contract, API examples và evidence.

## Nguồn tài liệu và cách phát triển

| Nhu cầu | Đọc ở đâu |
| --- | --- |
| Chọn task, owner, dependency, acceptance | [Kế hoạch duy nhất: 16 task lõi + 3 checkpoint UI](docs/PROMPTS_PHA_1_4_NGUOI.md) |
| Tình trạng hiện tại và bằng chứng merge | [Progress](docs/phase1-progress.md), [handoffs](docs/handoffs/) |
| Báo cáo kiểm toán cuối và nghiệm thu Pha 1 | [Final Audit A3](docs/qa/phase1-final-audit.md), [Handoff A3](docs/handoffs/A3.md) |
| Kịch bản thuyết trình & demo 8–10 phút | [Demo Script](docs/qa/phase1-demo-script.md), [Handoff C3](docs/handoffs/C3.md) |
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
là Rescue → Reporting → Disaster (và Dashboard → Reporting/Rescue chỉ đọc); E09 không gọi Rescue, UI tiến độ dùng E09 + E14.
Shared chỉ dành cho technical concerns nhỏ có nhu cầu.

Resource/Alert, map/risk, user administration, refresh/register và event bus ngoài
scope MVP. Không đưa microservices, broker, Redis hoặc hạ tầng Pha2 vào Pha1;
Pha2 cần benchmark, vấn đề đo được và ADR. Backlog sản phẩm không tự động là Pha2.

## Stack và kiểm chứng

Java 21 / Spring Boot 3.5.16 / Maven Wrapper 3.9.9, PostgreSQL 16/PostGIS 3.5, Flyway,
JPA cho Identity/Disaster/Rescue và JDBC data mapper cho Reporting/Dashboard. React/TypeScript/Vite
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

# Browser E2E (sau khi chạy .\scripts\dev.ps1 up)
.\scripts\browser-e2e.ps1
```

`mvnw test` chỉ unit/architecture, không thay thế full verify. Bộ Playwright E2E
(`.\scripts\browser-e2e.ps1`) kiểm chứng trọn vẹn 23 kịch bản trình duyệt Chromium thật
trên Docker Compose stack (`18 passed, 5 skipped` khi `VITE_MAP_PROVIDER=none`, `0 failed`).
Xem [hướng dẫn checks](docs/P01_LOCAL.md#checks).

CI (`.github/workflows/ci.yml`) gồm 4 jobs: `backend-verify`, `frontend-verify`,
`compose-smoke` và `browser-e2e`. Test counts và giới hạn môi trường được ghi
theo từng lần chạy trong handoff, không dùng con số cũ làm bằng chứng cho commit mới.
Khi Maven mirror/IDE gây lỗi, xem phần xử lý trong [runbook](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md).
