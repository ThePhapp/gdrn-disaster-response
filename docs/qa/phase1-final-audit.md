# Báo Cáo Kiểm Toán Độc Lập Cuối Cùng và Nghiệm Thu Pha 1 (Phase 1 Final Independent Audit — Task A3)

> - **Mã công việc:** `A3` — Audit cuối và bàn giao Pha 1
> - **Người thực hiện:** Người 1 (`System Lead`)
> - **Nhánh kiểm toán:** `feat/a3-final-audit` (tách từ `feat/c3-architecture-docs` @ `07cd20e`; nhánh `main` hiện tại @ `935e9ea`)
> - **Ngày thực hiện:** `2026-10-28`
> - **Trạng thái công việc A3:** `DONE`
> - **Kết luận nghiệm thu kỹ thuật:** Tất cả các cổng kỹ thuật bắt buộc có thể thực thi trong kho mã và môi trường Docker/host (`Backend Verify`, `Frontend Verify`, `Clean Clone + Self-generated .env + Compose Build/Up/Smoke`, `Playwright Browser E2E`, `Flyway V1–V7`, `Architecture/DDD/Module Boundaries`, `Security & Concurrency Matrix`, `Secret/Bundle Hygiene`, `ADRs 001–010`, `Rubric & Demo Script`, `k6 Raw Benchmark D3`) đều đạt **`PASS`**. Các hạng mục phụ thuộc thao tác quản trị kho mã bên ngoài hoặc giới hạn hạ tầng đám mây (`Kaggle CPU Docker Daemon`, `Remote GitHub Actions Run trên nhánh chưa push`, `GitHub Public Visibility & Merge PR cuối`) được ghi nhận trung thực là **`NOT RUN`** kèm lý do và hướng dẫn bàn giao rõ ràng.

---

## 1. Bảng Tổng Hợp Kết Quả Kiểm Toán Từng Tiêu Chí (`PASS` / `FAIL` / `NOT RUN`)

| Mã cổng | Hạng mục kiểm toán theo kế hoạch `A3` & `DoD Pha 1` | Kết quả | Bằng chứng kiểm chứng thực tế |
|---|---|:---:|---|
| **G01** | **Khởi chạy từ bản clone sạch với `.env` tự sinh** (không phụ thuộc cache/secret/artifact bị ignore của bản checkout cũ; bảo toàn volume chính) | **`PASS`** | Clone sạch sang `$env:TEMP\gdrn-a3-clean-clone` (`Has .env: False`, `Has target: False`, `Has node_modules: False`) → chạy `.\scripts\dev.ps1 init` tự sinh `.env` ngẫu nhiên an toàn → `docker compose up -d --build --wait` (`COMPOSE_PROJECT_NAME=gdrn_a3_clean`) → `database`, `backend`, `frontend` đều `Healthy` (`UP_EXIT=0`) → `.\scripts\dev.ps1 smoke` đạt **8/8 PASS** (`SMOKE_EXIT=0`). Volume gốc `gdrn-disaster-response_database-data` được bảo toàn nguyên vẹn. |
| **G02** | **Flyway Migrations `V1`–`V7` từ DB trống, nâng cấp tuần tự & Idempotent Demo Bootstrap** | **`PASS`** | `FlywayMigrationIT` kiểm chứng nâng cấp từng bước `V1 → V2 → V3 → V4 → V5 → V6 → V7` từ PostgreSQL 16 + PostGIS 3.5 trống; `IdentityBootstrapIT` kiểm chứng seed tài khoản demo idempotent (chạy lại không ghi đè mật khẩu/vai trò hoặc nhân bản bản ghi); không có thông tin đăng nhập hard-code trong file SQL. |
| **G03** | **Đầy đủ 15 endpoints MVP (`E01`–`E15`) + 5 endpoints mở rộng có kiểm soát (`E16`–`E20`)** | **`PASS`** | Kiểm chứng qua `OpenApiContractIT`, `/v3/api-docs` và bộ Integration Tests: **15/15 endpoints MVP** (`P00`) + **`E16` Dashboard** (`DS1`) + **`E17`–`E20` Evidence Attachments** (`report-evidence-attachments`) = **20 operations** hoạt động đúng đặc tả và phân quyền. |
| **G04** | **Đầy đủ 6 màn hình MVP (`S01`–`S06`) + màn hình mở rộng `S07` (`/operations/dashboard`)** | **`PASS`** | Kiểm chứng qua 93 Vitest tests và bộ Playwright Chromium E2E (`scripts/browser-e2e.ps1`): `S01` (`/login`), `S02` (`/reports/new`), `S03` (`/my-reports`), `S04` (`/operations/reports`), `S05` (`/operations/disasters`), `S06` (`/operations/rescue`), `S07` (`/operations/dashboard`) đạt chuẩn tương phản WCAG AA, bố cục đáp ứng `360px`/`768px`/`1280px` và điều hướng bàn phím. |
| **G05** | **Backend Build, Unit, ArchUnit & Testcontainers Integration (`.\mvnw.cmd clean verify`)** | **`PASS`** | `BUILD SUCCESS` (01:06 phút): Surefire **73/73 tests PASS** + Failsafe **57/57 tests PASS** = **130/130 tests PASS** (`0 Failures, 0 Errors, 0 Skipped`). |
| **G06** | **Frontend Clean Install, Typecheck, Unit/Component Test & Production Build** | **`PASS`** | `npm.cmd ci --engine-strict=false` (0 lockfile drift), `npm.cmd run typecheck` (`0 errors`), `npm.cmd test -- --run` (**20 test files, 93/93 tests PASS**), `npm.cmd run build` (Vite build thành công ra `frontend/dist` với lazy chunk `MapLibreMap`). |
| **G07** | **Playwright Browser E2E trên Docker Compose Stack thật (`.\scripts\browser-e2e.ps1`)** | **`PASS`** | Chạy trực tiếp trên stack `Nginx SPA (:5173) + Spring Boot (:8080) + PostGIS (:5432)`: **18 passed, 5 skipped** (5 kịch bản opt-in khi `VITE_MAP_PROVIDER=none`), **0 failed** trong `30.0s`. |
| **G08** | **Kiến trúc Modular Monolith, DDD, Clean Architecture & Không rò rỉ JPA / Không chu trình module** | **`PASS`** | `ArchitectureTests` (8 quy tắc ArchUnit) + kiểm toán mã nguồn: 1 ứng dụng duy nhất; tầng `domain` thuần Java (không phụ thuộc Spring, JPA, Jackson, HTTP); không truy cập trực tiếp `infrastructure` hoặc bảng DB chéo module; chiều phụ thuộc published contracts một chiều không chu trình (`Rescue → Reporting → Disaster` và `Dashboard → Reporting/Rescue`). |
| **G09** | **Ma trận phân quyền bảo mật HTTP & Kiểm soát quyền sở hữu (Ownership & Role Matrix)** | **`PASS`** | `SecurityConfiguration` áp dụng `SessionCreationPolicy.STATELESS` và `anyRequest().denyAll()` ở cuối chuỗi filter; kiểm chứng mọi endpoint `E01`–`E20`, `/actuator/health/**` và `/swagger-ui/**` qua `GdrnApplicationIT`, `IdentityIT`, `DisasterIT`, `ReportingIT`, `RescueIT`, `DashboardIT`. |
| **G10** | **Bằng chứng xử lý đồng thời (Concurrency / Race Condition Evidence)** | **`PASS`** | `ReportingIT` kiểm chứng rút đơn (`E11`) đối đầu duyệt báo cáo (`E10`) trả `409 REPORT_NOT_PENDING`; `RescueIT` dùng `CountDownLatch` kiểm chứng 2 điều phối viên phân công cùng 1 đội cứu hộ đồng thời trả đúng một `201 Created` và một `409 TEAM_BUSY` (nhờ `UPDATE ... WHERE status = 'AVAILABLE'`), đồng thời chặn phân công lặp cho cùng báo cáo bằng partial unique index `uq_rescue_active_report` (`409 REPORT_ALREADY_ASSIGNED`). |
| **G11** | **Vệ sinh bảo mật: Git History, `.env`, Logs và Frontend Production Bundle** | **`PASS`** | `git ls-files "*env*"` chỉ theo dõi `.env.example`; quét lịch sử Git và `frontend/dist` cho `JWT_SECRET_BASE64`, `POSTGRES_PASSWORD`, `DEMO_*_PASSWORD` và Bearer JWT cố định trả về **0 kết quả rò rỉ**; `application.yml` tắt `jpa.show-sql` và không bật log tham số truy vấn nhạy cảm. |
| **G12** | **Tài liệu vận hành, 10 ADRs (`001`–`010`), Rubric (`phase1-rubric.md`) & Kịch bản Demo (`phase1-demo-script.md`)** | **`PASS`** | Đối chiếu đầy đủ `README.md`, `docs/HUONG_DAN_CAI_DAT_VA_CHAY.md`, `docs/P01_LOCAL.md`, `docs/adr/001`..`010`, `docs/qa/phase1-rubric.md`, `docs/qa/phase1-demo-script.md` và toàn bộ 20 tệp handoff trong `docs/handoffs/`. |
| **G13** | **Raw Benchmark k6 & Artifacts đo tải (`D3`)** | **`PASS`** | Bộ 5 kịch bản k6 (`e07-write`, `e08-radius`, `e08-page-10vu/50vu/100vu`) có đầy đủ tệp raw JSON/CSV/TXT trong `benchmark/results/` (0% lỗi trên cả 5 kịch bản; đỉnh tải 100 VU đạt **1,996.98 req/s**, `p95 = 73.68 ms`, `p99 = 105.28 ms`), tài liệu hóa tại [docs/benchmark/D3.md](../benchmark/D3.md) và [docs/handoffs/D3.md](../handoffs/D3.md). |
| **G14** | **Đo tải trên môi trường Kaggle CPU** | **`PASS` (Preflight & Local Baseline) / `NOT RUN` (Full Docker Stack trên Kaggle CPU)** | Runtime Kaggle CPU không cấp quyền `root`/Docker daemon để khởi chạy đồng thời PostgreSQL/PostGIS + Spring Boot trong phiên notebook. Nhóm đã: (1) đo đầy đủ 5 kịch bản k6 trên local Docker baseline có kiểm soát, và (2) chạy thực tế notebook tự đóng gói `benchmark/kaggle/gdrn-d3-kaggle-benchmark.ipynb` ở chế độ preflight (`benchmark/results/kaggle-preflight-summary.json`), tuyệt đối không dùng public tunnel trái phép. |
| **G15** | **GitHub Actions CI Workflow (`.github/workflows/ci.yml`)** | **`PASS` (Cấu hình & Chạy tương đương Local) / `NOT RUN` (Remote GitHub Run cho nhánh chưa push)** | `.github/workflows/ci.yml` đã cấu hình đầy đủ 4 jobs (`backend-verify`, `frontend-verify`, `compose-smoke`, `browser-e2e`). Toàn bộ các lệnh của cả 4 jobs đã được thực thi thành công trên máy kiểm toán. Lượt chạy từ xa trên GitHub Actions cho nhánh `feat/a3-final-audit` sẽ tự động kích hoạt khi chủ sở hữu repo push và mở PR. |
| **G16** | **Trạng thái Public của GitHub Repository & Merge PR cuối (`C3`, `A3`)** | **`NOT RUN` (Thao tác Quản trị của Chủ sở hữu Repo)** | Tuân thủ nghiêm ngặt quy tắc `A3` ("Không tự ý tag/push/merge/deploy hoặc public repo"): tác vụ kiểm tra chế độ hiển thị `Public` của GitHub repo và merge PR cuối (`feat/c3-architecture-docs` / `feat/a3-final-audit`) vào `main` thuộc quyền thao tác thủ công của chủ sở hữu repo trước khi nộp bài. |

---

## 2. Bằng Chứng Thực Thi Các Lệnh Kiểm Chứng Độc Lập (Phiên Kiểm Toán A3)

### 2.1. Kiểm chứng Backend Toàn Diện (`.\mvnw.cmd clean verify`)

- **Lệnh thực thi:**
  ```powershell
  $env:DOCKER_API_VERSION = "1.44"
  .\mvnw.cmd --no-transfer-progress clean verify
  ```
- **Môi trường:** Windows 11, OpenJDK Temurin `21.0.12.1`, Maven Wrapper `3.9.9`, Docker Engine `29.8.2` (Testcontainers `postgis/postgis:16-3.5`).
- **Kết quả thực tế:** `BUILD SUCCESS` (Thời gian: `01:06 min`).
  - **Maven Surefire Plugin (Unit & Architecture Tests — 15 lớp, 73 tests):**
    - `com.gdrn.architecture.ArchitectureTests`: **8 tests PASS**
    - `com.gdrn.identity.domain.EmailAddressTest`: **3 tests PASS**
    - `com.gdrn.identity.domain.RoleTest`: **1 test PASS**
    - `com.gdrn.identity.domain.UserTest`: **4 tests PASS**
    - `com.gdrn.identity.application.IdentityServiceTest`: **4 tests PASS**
    - `com.gdrn.identity.infrastructure.JwtConfigurationTest`: **3 tests PASS**
    - `com.gdrn.disaster.domain.DisasterTest`: **4 tests PASS**
    - `com.gdrn.disaster.application.DisasterServiceTest`: **3 tests PASS**
    - `com.gdrn.reporting.domain.CoordinatesTest`: **5 tests PASS**
    - `com.gdrn.reporting.domain.ReportTest`: **13 tests PASS**
    - `com.gdrn.reporting.application.ReportingServiceTest`: **8 tests PASS**
    - `com.gdrn.rescue.domain.RescueMissionTest`: **5 tests PASS**
    - `com.gdrn.rescue.domain.RescueTeamTest`: **3 tests PASS**
    - `com.gdrn.rescue.application.RescueServiceTest`: **5 tests PASS**
    - `com.gdrn.dashboard.application.DashboardServiceTest`: **4 tests PASS**
    - **Tổng Surefire:** `Tests run: 73, Failures: 0, Errors: 0, Skipped: 0`
  - **Maven Failsafe Plugin (Testcontainers Integration Tests — 8 lớp, 57 tests):**
    - `com.gdrn.GdrnApplicationIT`: **4 tests PASS**
    - `com.gdrn.OpenApiContractIT`: **2 tests PASS**
    - `com.gdrn.FlywayMigrationIT`: **4 tests PASS**
    - `com.gdrn.identity.IdentityIT`: **6 tests PASS**
    - `com.gdrn.identity.IdentityBootstrapIT`: **2 tests PASS**
    - `com.gdrn.disaster.DisasterIT`: **5 tests PASS**
    - `com.gdrn.reporting.ReportingIT`: **16 tests PASS**
    - `com.gdrn.rescue.RescueIT`: **15 tests PASS**
    - `com.gdrn.dashboard.DashboardIT`: **3 tests PASS**
    - **Tổng Failsafe:** `Tests run: 57, Failures: 0, Errors: 0, Skipped: 0`
  - **Tổng cộng Backend:** **130/130 tests PASS** (`0 Failures, 0 Errors, 0 Skipped`).

### 2.2. Kiểm chứng Frontend (`npm ci`, `typecheck`, `test`, `build`)

- **Lệnh thực thi (tại `frontend/`):**
  ```powershell
  npm.cmd ci --engine-strict=false
  npm.cmd run typecheck
  npm.cmd test -- --run
  npm.cmd run build
  ```
- **Kết quả thực tế:**
  - `npm.cmd ci --engine-strict=false`: Cài đặt sạch `138 packages`, không lệch `package-lock.json` (lưu ý: máy kiểm toán cài Node `v24.20.0`, trong khi `.nvmrc` và `frontend/Dockerfile` cố định Node `22.14.0-alpine`).
  - `npm.cmd run typecheck` (`tsc --noEmit`): **`PASS`** (`0 errors`).
  - `npm.cmd test -- --run` (Vitest `v5.0.3`): **`PASS`** — **20/20 test files, 93/93 tests PASS** (`18.93s`), bao phủ `S01`–`S07`, `LocationMap`, `AttachmentApi`, `AuthStore`, `RouteGuards`, `DesignTokens`, `RescueApi`, `ReportingApi`, `DisasterApi`, `DashboardApi`.
  - `npm.cmd run build` (Vite `v8.3.4`): **`PASS`** (`846ms`), sinh bundle production tại `frontend/dist/` với code-splitting cho `MapLibreMap`.

### 2.3. Kiểm chứng Khởi Chạy Từ Bản Clone Sạch (`Clean Clone + Self-generated .env + Smoke`)

- **Quy trình thực thi:**
  1. Tạo bản clone Git độc lập tại `$env:TEMP\gdrn-a3-clean-clone` (xác nhận trước khi khởi tạo: `Has .env: False`, `Has target: False`, `Has frontend/node_modules: False`).
  2. Chạy `.\scripts\dev.ps1 init` sinh tệp `.env` mới với `POSTGRES_PASSWORD`, `JWT_SECRET_BASE64` (48 bytes ngẫu nhiên mã hóa Base64) và mật khẩu `DEMO_*` ngẫu nhiên mà không in secret ra màn hình.
  3. Đặt `$env:COMPOSE_PROJECT_NAME = "gdrn_a3_clean"` để cô lập hoàn toàn mạng và volume tạm (`gdrn_a3_clean_database-data`), giữ nguyên volume `gdrn-disaster-response_database-data` của thư mục làm việc chính.
  4. Chạy `docker compose --env-file .env up -d --build --wait` và `.\scripts\dev.ps1 smoke`.
- **Kết quả thực tế:**
  - `docker compose --env-file .env.example config --quiet`: `CONFIG_EXIT=0` (`PASS`).
  - `docker compose --env-file .env up -d --build --wait`: Build thành công 2 image `backend` và `frontend`; cả 3 container (`database`, `backend`, `frontend`) chuyển sang trạng thái `Healthy` (`UP_EXIT=0`).
  - `.\scripts\dev.ps1 smoke`: **`SMOKE_EXIT=0` (8/8 kiểm tra đạt `PASS`)**:
    - `PASS /actuator/health (UP)`
    - `PASS /actuator/health/liveness (UP)`
    - `PASS /actuator/health/readiness (UP)`
    - `PASS /v3/api-docs (GDRN OpenAPI)`
    - `PASS /swagger-ui/index.html`
    - `PASS frontend /login (SPA shell)`
    - `PASS frontend /operations/rescue (SPA shell)`
    - `PASS frontend /api/unknown (JSON 401, no SPA fallback)`
  - Dọn dẹp môi trường clone tạm sau khi kiểm chứng, xác nhận `docker volume ls` vẫn giữ nguyên `gdrn-disaster-response_database-data`.

### 2.4. Kiểm chứng Hồi Quy Trình Duyệt Thật (`Playwright Browser E2E`)

- **Lệnh thực thi:**
  ```powershell
  .\scripts\dev.ps1 up
  .\scripts\browser-e2e.ps1
  .\scripts\dev.ps1 down
  ```
- **Kết quả thực tế:** **`BROWSER_E2E_EXIT=0`** — **18 passed, 5 skipped, 0 failed (`30.0s`)**:
  - `b3-citizen.spec.ts`: Citizen tạo báo cáo, cách ly dữ liệu giữa Citizen 1 & Citizen 2, xem chi tiết đáp ứng, rút đơn `PENDING`, và theo dõi tiến độ nhiệm vụ cứu hộ thực qua `E09 + E14` sau khi báo cáo được `VERIFIED` (**2 passed, 1 skipped**).
  - `dashboard.spec.ts`: `AUTHORITY` xem số liệu tổng hợp thực trên `S07`, lọc theo khoảng ngày giờ Việt Nam, làm mới dữ liệu, chuyển đổi ngôn ngữ VI/EN; `CITIZEN` bị chặn hoàn toàn trên thanh điều hướng, route `/operations/dashboard` và API `E16` (**2 passed**).
  - `disaster.spec.ts`: `AUTHORITY` tạo, cập nhật và giải quyết (`RESOLVED`) thảm họa trên `S05` qua các khung nhìn `360px`/`768px`/`1280px` (**1 passed, 3 skipped**).
  - `language.spec.ts`: Chuyển đổi ngôn ngữ mặc định và giao diện đăng nhập (**1 passed**).
  - `login.spec.ts`: Đăng nhập thật, giữ phiên khi reload tab, đăng xuất và kiểm tra biểu mẫu đáp ứng cho cả 3 tài khoản `DEMO_CITIZEN_ONE`, `DEMO_CITIZEN_TWO`, `DEMO_AUTHORITY` (**3 passed**).
  - `reporting-operations.spec.ts`: Luồng xuyên suốt Citizen gửi báo cáo → Authority duyệt (`VERIFIED`) / từ chối (`REJECTED`) → Citizen đọc kết quả, kiểm tra xung đột trạng thái, phân quyền và độ tương phản màu sắc trên `S04` (**1 passed, 1 skipped**).
  - `rescue.spec.ts`: Luồng xuyên suốt `S04` → `S06` (`D2`), xem trước báo cáo chỉ đọc, phân công đội cứu hộ, kích hoạt xung đột `409 Conflict` thật, hoàn tất nhiệm vụ `ASSIGNED → IN_PROGRESS → COMPLETED` ngay cả sau khi thảm họa chuyển sang `RESOLVED`, và Citizen kiểm tra tiến độ trên `S03` (**2 passed**).
  - `ui01-b-audit.spec.ts`: Kiểm toán trực quan, độ tương phản WCAG AA, chống tràn ngang (`reflow`) ở `360px`/`768px`/`1280px` và điều hướng bàn phím xuyên suốt 6 màn hình cốt lõi `S01`–`S06` (**1 passed**).
  - `ui01-login.spec.ts`: Kiểm tra bố cục `S01` ở 3 kích thước màn hình, bảo toàn phiên khi truy cập route bị cấm của role khác, và tự động hủy phiên quay về `/login` khi backend trả `401 Unauthorized` (**5 passed**).
  - *Ghi chú về 5 kịch bản `skipped`:* Đây là 5 kịch bản kiểm thử chuyên biệt cho nhà cung cấp bản đồ trực tuyến (`MapLibre/MapTiler`) được thiết kế có chủ đích (`test.skip`) khi chạy ở cấu hình mặc định `VITE_MAP_PROVIDER=none` (không phụ thuộc khóa API bên ngoài). Bản thân chức năng bản đồ `LocationMap` và các chế độ fallback khi lỗi tải tile đã được kiểm chứng đầy đủ trong bộ 93 Vitest tests (`LocationMap.test.tsx`).

---

## 3. Kiểm Toán Ma Trận API (`E01`–`E20`), Màn Hình (`S01`–`S07`), Flyway (`V1`–`V7`) và Published Contracts

### 3.1. Ma trận 20 Operations & Phân quyền tại `SecurityConfiguration`

Cấu hình tại [`SecurityConfiguration.java`](../../src/main/java/com/gdrn/shared/infrastructure/configuration/SecurityConfiguration.java) sử dụng danh sách trắng theo đúng phương thức HTTP + đường dẫn và kết thúc bằng `.anyRequest().denyAll()`:

| Mã | Phương thức & Đường dẫn | Nhóm | Quyền tại `SecurityConfiguration` | Kiểm soát Ownership / Nghiệp vụ ở tầng Application | Trạng thái |
|---|---|---|---|---|:---:|
| **E01** | `POST /api/auth/login` | MVP (`P01`) | `permitAll()` | Xác thực BCrypt; trả `401 AUTHENTICATION_FAILED` nếu sai email/mật khẩu. | **`PASS`** |
| **E02** | `GET /api/auth/me` | MVP (`P01`) | `authenticated()` | Trả hồ sơ người dùng từ JWT principal hiện hành. | **`PASS`** |
| **E03** | `GET /api/disasters` | MVP (`C1`) | `hasAnyRole("CITIZEN", "AUTHORITY")` | Lọc theo `status`, `type` có phân trang. | **`PASS`** |
| **E04** | `POST /api/disasters` | MVP (`C1`) | `hasRole("AUTHORITY")` | Khởi tạo sự kiện thảm họa ở trạng thái `ACTIVE`. | **`PASS`** |
| **E05** | `GET /api/disasters/{disasterId}` | MVP (`C1`) | `hasRole("AUTHORITY")` | Xem chi tiết thảm họa phục vụ điều phối. | **`PASS`** |
| **E06** | `PATCH /api/disasters/{disasterId}` | MVP (`C1`) | `hasRole("AUTHORITY")` | Cập nhật thông tin hoặc chuyển `ACTIVE → RESOLVED` (một chiều; sửa sau `RESOLVED` trả `409`). | **`PASS`** |
| **E07** | `POST /api/reports` | MVP (`B1`) | `hasAnyRole("CITIZEN", "AUTHORITY")` | Tạo báo cáo `PENDING`; nếu truyền `disasterId` phải tồn tại và đang `ACTIVE`. | **`PASS`** |
| **E08** | `GET /api/reports` | MVP (`B2`) | `hasAnyRole("CITIZEN", "AUTHORITY")` | `CITIZEN` chỉ nhận báo cáo của chính mình (`created_by = principal.id`); `AUTHORITY` xem toàn bộ và lọc bán kính PostGIS `ST_DWithin`. | **`PASS`** |
| **E09** | `GET /api/reports/{reportId}` | MVP (`B1`/`B2`) | `hasAnyRole("CITIZEN", "AUTHORITY")` | `CITIZEN` đọc báo cáo của người khác nhận `404 REPORT_NOT_FOUND` (chống dò quét ID). | **`PASS`** |
| **E10** | `PATCH /api/reports/{reportId}/verification` | MVP (`B2`) | `hasRole("AUTHORITY")` | Chỉ duyệt/từ chối khi báo cáo đang `PENDING`; sai trạng thái trả `409 REPORT_NOT_PENDING`. | **`PASS`** |
| **E11** | `DELETE /api/reports/{reportId}` | MVP (`B2`) | `hasRole("CITIZEN")` | Chỉ chủ sở hữu được rút đơn khi đang `PENDING`; báo cáo của người khác trả `404`; đã duyệt/từ chối trả `409`. | **`PASS`** |
| **E12** | `GET /api/rescue/teams` | MVP (`D1`) | `hasRole("AUTHORITY")` | Liệt kê danh sách đội cứu hộ và trạng thái `AVAILABLE`/`BUSY`. | **`PASS`** |
| **E13** | `POST /api/rescue/missions` | MVP (`D1`) | `hasRole("AUTHORITY")` | Yêu cầu báo cáo `VERIFIED`; cập nhật nguyên tử đội cứu hộ `AVAILABLE → BUSY`; trả `409 TEAM_BUSY` hoặc `409 REPORT_ALREADY_ASSIGNED` khi xung đột. | **`PASS`** |
| **E14** | `GET /api/rescue/missions` | MVP (`D1`/`B3`) | `hasRole("CITIZEN")` | Yêu cầu tham số `reportId` thuộc quyền sở hữu của `CITIZEN` hiện tại; khác chủ sở hữu trả `404`. | **`PASS`** |
| **E15** | `PATCH /api/rescue/missions/{missionId}/status` | MVP (`D1`) | `hasRole("AUTHORITY")` | Chuyển trạng thái một chiều `ASSIGNED → IN_PROGRESS → COMPLETED`; khi `COMPLETED` tự động giải phóng đội về `AVAILABLE`. | **`PASS`** |
| **E16** | `GET /api/dashboard` | Mở rộng (`DS1`) | `hasRole("AUTHORITY")` | Tổng hợp chỉ đọc số lượng báo cáo theo trạng thái, nhiệm vụ đang xử lý và đội rảnh theo múi giờ `Asia/Ho_Chi_Minh`. | **`PASS`** |
| **E17** | `POST /api/reports/{reportId}/attachments` | Mở rộng (`V7`) | `hasRole("CITIZEN")` | Chỉ chủ sở hữu báo cáo đang `PENDING` được tải lên ảnh minh chứng (`JPEG`/`PNG`/`WEBP` ≤ 5 MiB, tối đa 3 tệp/báo cáo, kiểm tra magic bytes). | **`PASS`** |
| **E18** | `GET /api/reports/{reportId}/attachments` | Mở rộng (`V7`) | `hasAnyRole("CITIZEN", "AUTHORITY")` | Chỉ chủ sở hữu `CITIZEN` hoặc `AUTHORITY` được xem danh sách tệp đính kèm; công dân khác nhận `404`. | **`PASS`** |
| **E19** | `GET /api/reports/{reportId}/attachments/{attachmentId}/content` | Mở rộng (`V7`) | `hasAnyRole("CITIZEN", "AUTHORITY")` | Tải nội dung nhị phân với `X-Content-Type-Options: nosniff` và `Cache-Control: private, no-store`; công dân khác nhận `404`. | **`PASS`** |
| **E20** | `DELETE /api/reports/{reportId}/attachments/{attachmentId}` | Mở rộng (`V7`) | `hasRole("CITIZEN")` | Chỉ chủ sở hữu được xóa tệp đính kèm khi báo cáo còn `PENDING`; báo cáo đã `VERIFIED`/`REJECTED` trả `409`. | **`PASS`** |

### 3.2. Kiểm toán Sổ cái Flyway (`V1`–`V7`) và Ranh giới Module Contracts

- **Sổ cái Migration (`src/main/resources/db/migration/`):**
  - `V1__init_extensions_and_metadata.sql`: Khởi tạo tiện ích mở rộng `postgis` và bảng siêu dữ liệu kỹ thuật `system_metadata`.
  - `V2__identity_accounts.sql`: Bảng `identity_accounts` (`id`, `email` unique, `full_name`, `password_hash`, `role`, `enabled`, timestamps).
  - `V3__disasters.sql`: Bảng `disasters` (`id`, `name`, `type`, `severity`, `status`, `description`, `center_location geography(Point, 4326)`, timestamps).
  - `V4__reporting_reports.sql`: Bảng `reports` với cột không gian `location geography(Point, 4326)` và chỉ mục không gian `GiST` (`idx_reports_location`).
  - `V5__reporting_verification_withdrawal.sql`: Bổ sung các cột kiểm toán duyệt/từ chối (`verified_by`, `verified_at`, `rejection_reason`, `updated_at`) và chỉ mục lọc trạng thái.
  - `V6__rescue_teams_and_missions.sql`: Bảng `rescue_teams`, bảng `rescue_missions`, chỉ mục bán phần `uq_rescue_active_report` (`WHERE status IN ('ASSIGNED', 'IN_PROGRESS')`) và dữ liệu danh mục 3 đội cứu hộ ban đầu (`RESCUE-01`..`03`).
  - `V7__reporting_evidence_attachments.sql`: Bảng `report_attachments` lưu siêu dữ liệu tệp minh chứng gắn với `reports(id)`.
- **Kiểm toán Published Module Contracts (Không chu trình phụ thuộc):**
  - `com.gdrn.identity.contracts`: `AuthenticatedUserPrincipal`, `RoleName` (được tiêu thụ bởi các web adapter và `SecurityConfiguration`).
  - `com.gdrn.disaster.contracts`: `DisasterQuery`, `DisasterSummary`, `DisasterStatusView`, `DisasterTypeView` (được tiêu thụ bởi `reporting.application`).
  - `com.gdrn.reporting.contracts`: `ReportingQuery`, `ReportSummary`, `ReportStatusView`, `ReportStatusCounts` (được tiêu thụ bởi `rescue.application` và `dashboard.application`).
  - `com.gdrn.rescue.contracts`: `RescueOperationsQuery`, `RescueOperationalCounts` (được tiêu thụ bởi `dashboard.application`).
  - **Đồ thị phụ thuộc giữa các module nghiệp vụ:**
    - Luồng nghiệp vụ cốt lõi: `rescue → reporting → disaster` (một chiều, không có chiều ngược `reporting → rescue`; màn hình công dân `S03` kết hợp `E09` và `E14` ở tầng giao diện đúng theo `ADR-005`).
    - Luồng tổng hợp chỉ đọc: `dashboard → reporting` và `dashboard → rescue` (một chiều theo `ADR-009`).

---

## 4. Kiểm Toán Bảo Mật, Vệ Sinh Bundle & Lịch Sử Git

1. **Quét tệp môi trường được theo dõi trong Git (`git ls-files "*env*"`):**
   - Chỉ duy nhất tệp mẫu `.env.example` được theo dõi trong Git. Tệp `.env` thực tế nằm trong `.gitignore`.
2. **Quét lịch sử commit Git và mã nguồn:**
   - Không có khóa bí mật `JWT_SECRET_BASE64`, mật khẩu cơ sở dữ liệu hay mật khẩu tài khoản demo thực nằm trong lịch sử commit hoặc trong thư mục `src/main/resources/db/migration/`.
3. **Quét Bundle Frontend Production (`frontend/dist/`):**
   - Thực thi lệnh quét mẫu biểu thức chính quy (`JWT_SECRET_BASE64|POSTGRES_PASSWORD|DEMO_.*_PASSWORD|Authorization:\s*Bearer\s+eyJ`) trên toàn bộ tệp đầu ra trong `frontend/dist/`: **`0 kết quả`**.
4. **Cấu hình nhật ký ứng dụng (`src/main/resources/application.yml`) và k6 Benchmark:**
   - `spring.jpa.show-sql: false`; không cấu hình in `Authorization` header, mật khẩu hay thân yêu cầu đăng nhập ra stdout.
   - Kịch bản `benchmark/k6/phase1.js` chỉ lấy `accessToken` trong hàm `setup()` và xóa bỏ hoàn toàn khỏi đối tượng dữ liệu tóm tắt trước khi xuất tệp JSON/CSV trong `benchmark/results/`.

---

## 5. Hướng Dẫn Tái Lập Từ Bản Clone Sạch (Clean Checkout Reproduction Guide)

Bất kỳ thành viên hội đồng chấm thi hoặc kiểm toán viên độc lập nào cũng có thể tái lập toàn bộ hệ thống và kiểm chứng từ một bản clone mới theo 4 bước chuẩn sau:

```powershell
# Bước 1: Clone kho mã và di chuyển vào thư mục gốc
git clone <REPO_URL> gdrn-audit- verify
cd gdrn-audit-verify

# Bước 2: Tự động sinh tệp .env với mật khẩu và khóa JWT ngẫu nhiên an toàn
.\scripts\dev.ps1 init

# Bước 3: Chạy kiểm thử đơn vị, kiến trúc và tích hợp Testcontainers (Backend)
$env:DOCKER_API_VERSION = "1.44"
.\mvnw.cmd --no-transfer-progress clean verify

# Bước 4: Khởi chạy toàn bộ Docker Compose stack (PostGIS + Backend + Nginx SPA),
# chạy kiểm tra Smoke 8 điểm và chạy 23 kịch bản Playwright Browser E2E
.\scripts\dev.ps1 up
.\scripts\browser-e2e.ps1

# (Tùy chọn) Dừng các container sau khi kiểm tra xong mà vẫn giữ nguyên dữ liệu DB:
.\scripts\dev.ps1 down
```

---

## 6. Hạn Chế Đã Biết (Known Limitations) & Danh Sách Công Việc Bàn Giao Cuối Cùng

### 6.1. Hạn chế kỹ thuật và môi trường đã ghi nhận trung thực

1. **Giới hạn thực thi Docker trên Kaggle CPU (`G14`):**
   - Môi trường container của Kaggle CPU Notebook không hỗ trợ chạy Docker daemon lồng nhau (nested Docker) để khởi tạo PostgreSQL/PostGIS và Spring Boot. Do quy tắc bảo mật của dự án nghiêm cấm mở đường hầm công khai (public tunnel) trái phép từ máy cá nhân ra Internet, phép đo tải toàn diện 5 kịch bản k6 được thực hiện trên môi trường Docker cục bộ có kiểm soát (`benchmark/results/20261028-140217-*`), kết hợp với việc chạy kiểm chứng thực tế chế độ `PREFLIGHT_ONLY` trên notebook tự đóng gói `benchmark/kaggle/gdrn-d3-kaggle-benchmark.ipynb` (`benchmark/results/kaggle-preflight-summary.json`).
2. **Tương thích phiên bản Docker Engine mới trên Windows (`Docker Desktop 29.x`):**
   - Phiên bản Docker Engine `29.8.2` yêu cầu Docker API tối thiểu `1.40`, trong khi thư viện `testcontainers` `1.21.4` mặc định thương lượng ở mức `1.32` nếu chưa đặt biến môi trường. Khi chạy `.\mvnw.cmd clean verify` trên máy cài Docker Engine `>= 29.x`, cần đặt `$env:DOCKER_API_VERSION = "1.44"` trong phiên PowerShell.
3. **Lưu trữ tệp minh chứng cục bộ trong Pha 1 (`ADR-010`):**
   - Tệp ảnh minh chứng báo cáo (`E17`–`E20`) được lưu trên hệ thống tệp riêng tư của container backend (`/app/.data/report-attachments`). Trong kiến trúc một bản sao (single-instance Modular Monolith) của Pha 1, giải pháp này đảm bảo cô lập bảo mật hoàn toàn; khi chuyển sang mô hình đa bản sao ở Pha 2, cần chuyển sang dịch vụ lưu trữ đối tượng (Object Storage như S3/MinIO) theo lộ trình đã nêu trong `ADR-010`.

### 6.2. Các bước hành động thủ công bàn giao cho Chủ sở hữu Repository (Post-Audit Manual Actions)

Do quy tắc của Task `A3` nghiêm cấm việc tự động `push`, `merge`, `tag` hoặc thay đổi quyền hiển thị kho mã trên GitHub, chủ sở hữu repository thực hiện 3 bước hoàn tất cuối cùng sau khi rà soát báo cáo này:

1. **Đẩy nhánh và tạo/merge Pull Request cuối cùng vào `main`:**
   - Nhánh `feat/a3-final-audit` đã bao gồm toàn bộ các commit của `feat/c3-architecture-docs` (`07cd20e`) và kết quả kiểm toán `A3`. Chủ sở hữu repo đẩy nhánh lên `origin`, mở PR vào `main` và chờ GitHub Actions chạy xanh cả 4 jobs (`backend-verify`, `frontend-verify`, `compose-smoke`, `browser-e2e`) trước khi nhấn Merge.
2. **Xác nhận chế độ hiển thị `Public` của GitHub Repository:**
   - Truy cập `Settings → General → Danger Zone → Change repository visibility` trên GitHub để đảm bảo kho mã ở trạng thái **Public** phục vụ giảng viên và hội đồng chấm bài.
3. **Chuẩn bị phiên thuyết trình & Demo trực tiếp:**
   - Sử dụng kịch bản 8–10 phút tại [docs/qa/phase1-demo-script.md](phase1-demo-script.md) và ma trận đối chiếu điểm số tại [docs/qa/phase1-rubric.md](phase1-rubric.md).
