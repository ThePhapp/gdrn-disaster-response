# Tiến độ Pha 1

**A3 kiểm toán cuối & bàn giao Pha 1 — 28/10/2026:** trên nhánh `feat/a3-final-audit`
(tách từ `feat/c3-architecture-docs` @ `07cd20e`, kế thừa `main` @ `935e9ea`), đã thực
hiện kiểm toán độc lập toàn diện theo đúng đặc tả `A3`:
- **Clean Clone & Self-generated `.env` (`PASS`):** Clone sạch sang thư mục tạm ngoài repo,
  chạy `.\scripts\dev.ps1 init` tự sinh `.env`, dựng stack cô lập (`COMPOSE_PROJECT_NAME=gdrn_a3_clean`)
  bằng `docker compose up -d --build --wait` và chạy `.\scripts\dev.ps1 smoke` đạt **8/8 PASS**;
  bảo toàn nguyên vẹn volume dữ liệu chính `gdrn-disaster-response_database-data`.
- **Backend Verify (`PASS`):** `.\mvnw.cmd --no-transfer-progress clean verify` đạt `BUILD SUCCESS`
  với **130/130 tests PASS** (`73` Surefire unit/ArchUnit + `57` Failsafe Testcontainers IT, `0` lỗi, `0` skip).
- **Frontend Verify (`PASS`):** `npm.cmd ci --engine-strict=false`, `npm.cmd run typecheck` (`0 errors`),
  `npm.cmd test -- --run` (**20 test files, 93/93 tests PASS**), `npm.cmd run build` (`frontend/dist` sạch, `0` secret rò rỉ).
- **Playwright Browser E2E (`PASS`):** `.\scripts\browser-e2e.ps1` trên stack Docker Compose thật đạt
  **18 passed, 5 skipped** (5 kịch bản map-provider opt-in khi `VITE_MAP_PROVIDER=none`), **0 failed**.
- **Ghi nhận trung thực các cổng bên ngoài (`NOT RUN`):** (1) Đo tải trực tiếp Docker server trên Kaggle CPU
  `NOT RUN` do Kaggle CPU không hỗ trợ Docker daemon (đã có baseline k6 local 5 kịch bản 0% lỗi + chạy xác minh
  notebook `benchmark/kaggle/gdrn-d3-kaggle-benchmark.ipynb` ở chế độ `PREFLIGHT_ONLY`); (2) Lượt chạy GitHub Actions
  từ xa trên nhánh `feat/a3-final-audit` chờ push; (3) Thao tác merge PR cuối (`C3`, `A3`) vào `main` và kiểm tra
  chế độ hiển thị `Public` của GitHub repo bàn giao cho chủ sở hữu repo.
  Xem chi tiết tại [Báo cáo kiểm toán cuối A3](qa/phase1-final-audit.md) và [Handoff A3](handoffs/A3.md).

**C3 tài liệu kiến trúc, ADR, Rubric & Kịch bản Demo — 28/10/2026:** hoàn tất trên nhánh
`feat/c3-architecture-docs` (`07cd20e`, đã gộp trong `feat/a3-final-audit`): cập nhật
[tổng quan kiến trúc](architecture/architecture-overview.md), hoàn thiện bộ 10 ADRs (`001`–`010`),
[ma trận rubric](qa/phase1-rubric.md) và [kịch bản demo 8–10 phút](qa/phase1-demo-script.md).
Xem [Handoff C3](handoffs/C3.md).

**D3 benchmark — 28/10/2026 (đã merge `main` qua PR #31 tại `935e9ea`):** nhánh `feat/d3-benchmark-kaggle`
tạo từ `main` tại `16fb3a5`. Đã chạy local disposable Compose/PostGIS cho 5 kịch bản k6
(`e07-write`, `e08-radius`, `e08-page` ở `10`/`50`/`100` VU, 0% lỗi, đỉnh tải 100 VU đạt `1,996.98 req/s`);
raw k6, summary đã xóa JWT, seed manifest và Docker stats lưu dưới `benchmark/results/`.
Notebook Kaggle đã chạy xác minh preflight (`benchmark/results/kaggle-preflight-summary.json`).
Xem [handoff D3](handoffs/D3.md) và [benchmark contract](benchmark/D3.md).

**Ảnh minh chứng mở rộng — 23/10/2026 (đã merge `main` qua PR #30 tại `16fb3a5`):** nhánh
`feat/report-evidence-attachments` triển khai Flyway `V7`, private filesystem storage, `E17`–`E20`
upload/list/content/delete, ownership cho citizen và authority read-only, giới hạn ảnh
5 MiB. Trong phiên kiểm toán `A3`, toàn bộ 57 integration tests (bao gồm `FlywayMigrationIT` V1→V7
và `ReportingIT` cho `E17`–`E20`) đã chạy với Docker/Testcontainers thật và đạt **PASS 100%**.
Xem [handoff attachments](handoffs/report-evidence-attachments.md) và [ADR 010](adr/010-report-evidence-private-storage.md).

**DS1 mở rộng Dashboard — 18/10/2026 (đã merge `main` qua PR #29 tại `392714e`):** theo yêu cầu
trực tiếp của user, triển khai `E16 GET /api/dashboard` và màn hình `S07 /operations/dashboard`
dành cho `AUTHORITY`, tổng hợp trạng thái toàn cục, lọc ngày UTC+7 và đội rảnh hiện tại.
Xem [Handoff DS1](handoffs/DS1.md), [contract bổ sung](api/dashboard-contract.md),
[ADR 008](adr/008-reporting-decisions-and-query-contract.md) và [ADR 009](adr/009-dashboard-statistics.md).

**X2 + A2 browser/CI — 21/10/2026 (đã merge `main` qua PR #28 tại `85cf325`):** Playwright
regression với API/PostGIS thật PASS 23/23 khi có map provider; Compose CI-style không có
map provider PASS 18 và skip 5 scenario map tùy chọn. CI (`.github/workflows/ci.yml`) đã tích hợp
job `browser-e2e` với secret runtime, health/smoke, Chromium, artifact diagnostics và cleanup.
Xem [handoff X2](handoffs/X2.md) và [handoff A2](handoffs/A2.md).

**X1 tích hợp luồng thật — 18/10/2026 (đã merge `main` qua PR #23 tại `f91fc5d`):** Compose thật,
API smoke ba demo account, browser E2E, OpenAPI E01–E15 và feature freeze đã được kiểm tra;
evidence tại [checklist X1](qa/phase1-integration-checklist.md) và [handoff X1](handoffs/X1.md).

**UI01-B audit — 17/10/2026, nền main `1b47b6f`: DONE, đã merge main PR #21.**
D2 vị trí đã merge PR #20; S01–S06, UI01-C1 và vị trí B3/C2/shared đều có trên main,
đủ gate bắt đầu audit. Đã retest 6 màn hình × 360/768/1280 và root font 200%; các lỗi
B-01…B-06 đã được xử lý trong source, ảnh evidence cập nhật. Typecheck/build PASS,
81 frontend tests, backend verify 113 tests PASS. Browser regression PASS 14, skip 5
do map-provider config rỗng; audit UI01-B PASS 1/1.
18 ảnh retest và các giới hạn NOT RUN được ghi trong [handoff UI01-B](handoffs/UI01-B.md).
Các đoạn theo ngày bên dưới giữ nguyên evidence lịch sử.

**Tích hợp main vào nhánh D2 — 17/10/2026:** giải quyết conflict progress khi merge
`main` tại `ed75849` vào `feat/D2-preview-ui-map` (`9cdc336`). Giữ evidence D2 và
cập nhật A1/A2 từ main. Frontend typecheck/build PASS, 80 tests PASS; backend
`mvnw.cmd clean verify` BUILD SUCCESS/exit 0, 113 tests, 0 fail/error/skip.

**D2 cập nhật 16/10/2026, nền `a7471f0`:** B3 bổ sung vị trí đã merge PR #18. D2
baseline đã merge; bổ sung preview read-only E09, link S04→S06 và xử lý stale state
đã merge qua PR #20 (`1b47b6f`). Evidence và giới hạn tại
[handoff D2](handoffs/D2.md#d2-bổ-sung-vị-trí-và-kiểm-tra-tích-hợp--16102026).

**Trạng thái lịch sử — 15/10/2026, nền merge `d72ecb1`:** C2 đã merge PR #9 tại `120dec8`
(implementation `ad7a010`); D1 đã merge PR #11 tại `e380d68`, fix review `888996a`.
B2/UI01-C1 đã nằm trong nền merge `173a9a4`; D2 và phần nghiệp vụ B3 đã merge lần lượt
qua PR #13 (`ff652bd`) và PR #14 (`242583c`).
[Review C2 sau merge](qa/c2-post-merge-review.md): 32 frontend tests, 9 browser tests,
113 backend tests pass; smoke C2→D1 qua API thật pass. [Handoff D2](handoffs/D2.md)
ghi 41 frontend tests, 1 browser E2E và 113 backend tests pass sau review.

**UI bản đồ: UI01-A bổ sung đã merge PR #16 tại `df4777f`.** Phạm vi/nhiệm vụ duy nhất nằm tại
[UI vị trí sau C2/D1](PHASE1_PLAN.md#ui-vi-tri-sau-c2-d1).
Xem [P00 handoff](handoffs/P00.md) và [kế hoạch/dependencies](PHASE1_PLAN.md).

**Bổ sung 09/10/2026 — F00 nền tảng chạy được:** hoàn tất readiness/liveness,
script local, Compose smoke và full verification trên nhánh `feat/runnable-foundation`.
Xem [handoff F00](handoffs/F00.md) để tra lịch sử kiểm chứng. Nền tảng đã merge qua
`853a532`; các nhãn F00–F04 không phải task mới trong kế hoạch. Chỉ dùng 16 task lõi + 3 checkpoint UI ở
[kế hoạch duy nhất](PHASE1_PLAN.md) để giao việc tiếp.

| Task | Owner | Prerequisite đã merge | Trạng thái | Evidence / phần còn lại |
| --- | --- | --- | --- | --- |
| P00 | 1; cả nhóm review | Repo nền | DONE, đã merge | OpenAPI + module contracts + ADR 005; đã có trên `main` tại `0e19c36` |
| P01 | 1 | P00 | DONE, đã merge PR #1 | [Handoff](handoffs/P01.md): E01/E02/S01; đã merge `main` qua PR #1 (`e4b449b`); kiểm tra tích hợp F00: 30 backend + 10 frontend tests pass |
| B1 | 2 | P01; C1 migration trước B1 | DONE, đã merge PR #5 | [Handoff](handoffs/B1.md): E07–E09, V4, security production, ownership/PostGIS/upgrade/snapshot tests; local smoke pass |
| C1 | 3 | P01 | DONE, đã merge PR #4 | [Handoff](handoffs/C1.md): E03–E06/S05, V3, DisasterQuery; integration retest 62 backend + 15 frontend + 4 browser tests pass |
| UI01-A | 1 | P00, P01, B1, C1 | DONE, đã merge PR #6 & PR #16 | [Handoff](handoffs/UI01-A.md): baseline merge PR #6 (`78f164b`); shared `LocationMap` + MapLibre/MapTiler config merge PR #16 (`df4777f`) |
| B2 | 2 | B1, C1 | DONE, đã merge PR #8 | [Handoff](handoffs/B2.md): E10/E11, E08 radius, ReportingQuery, V5; đã có trong nền merge `173a9a4` |
| UI01-C1 | 3 | UI01-A, C1 | DONE, đã merge PR #8 & PR #17 | [Handoff](handoffs/UI01-C1.md): baseline merge PR #8 (`173a9a4`); picker/detail preview merge PR #17 (`d72ecb1`) |
| D1 | 4 | B2, C1 | DONE, đã merge PR #11 | [Handoff](handoffs/D1.md): E12–E15/V6; PR #11 (`e380d68`), fix (`888996a`); 113 backend tests pass (62 unit/architecture + 51 integration) |
| B3 | 2 | B1, UI01-A; B2/D1 để hoàn tất | DONE, đã merge PR #14 & PR #18 | Baseline PR #14 (`242583c`); bổ sung vị trí PR #18 (`a7471f0`); [handoff](handoffs/B3.md) giữ evidence owner |
| C2 | 3 | B2, C1, UI01-A | DONE, đã merge PR #9 & PR #17 | Baseline PR #9 (`120dec8`); S04 map tâm/radius + detail preview merge PR #17 (`d72ecb1`); [handoff](handoffs/C2.md) |
| D2 | 4 | D1, UI01-A | DONE, đã merge PR #13 & PR #20 | [Handoff](handoffs/D2.md); baseline PR #13 (`ff652bd`), bổ sung vị trí & preview E09 PR #20 (`1b47b6f`) |
| A1 | 1 | UI01-A; audit lại khi B2/D1 merge | DONE, đã merge PR #19 | [Handoff](handoffs/A1.md): security allowlist/OpenAPI và shared route behavior đã audit (`ed75849`) |
| A2 | 1 | UI01-A; hoàn tất UI runtime và X2/CI | DONE, đã merge PR #28 | [Handoff](handoffs/A2.md): frontend Compose/runtime, CI `browser-e2e` job và local evidence (`85cf325`) |
| UI01-B | 1 + owners | B3, C2, D2, UI01-C1 | DONE, đã merge PR #21 | [Handoff](handoffs/UI01-B.md): retest 6 màn hình PASS, 18 ảnh evidence (`1b47b6f`) |
| X1 | 1 + owners | UI01-B, A1, A2 runtime | DONE, đã merge PR #23 | [Handoff](handoffs/X1.md), [checklist X1](qa/phase1-integration-checklist.md); flow thật xuyên suốt, feature freeze (`f91fc5d`) |
| X2 | 2 + 1 ghép CI | X1 | DONE, đã merge PR #28 | [Handoff](handoffs/X2.md): 23/23 local với map provider; CI-style 18 pass / 5 map skip (`85cf325`) |
| D3 | 4 | X1 cho số đo; smoke D10 | DONE, đã merge PR #31 | [Handoff](handoffs/D3.md), [benchmark contract](benchmark/D3.md); 5 kịch bản k6 local baseline (0% lỗi) + Kaggle preflight (`935e9ea`) |
| C3 | 3 | X1; bổ sung X2/D3 | DONE trên nhánh (`07cd20e`), chờ merge PR cuối | [Handoff](handoffs/C3.md), [Rubric](qa/phase1-rubric.md), [kiến trúc](architecture/architecture-overview.md), [kịch bản demo](qa/phase1-demo-script.md), ADRs `001`–`010` |
| A3 | 1 + nhóm | X2, C3, D3, UI01-B và mọi task trước | DONE trên nhánh (`feat/a3-final-audit`), chờ merge PR cuối & thao tác quản trị repo | [Handoff](handoffs/A3.md), [Final Audit](qa/phase1-final-audit.md): Clean Clone + Smoke 8/8 PASS, Backend `clean verify` 130/130 PASS, Frontend 93/93 PASS, Browser E2E 18 pass / 5 skip / 0 fail, 0 secrets lộ; ghi rõ 3 mục `NOT RUN` (Docker trên Kaggle CPU, remote CI cho nhánh chưa push, public repo/merge PR cuối) |

Toàn bộ 16 task lõi + 3 checkpoint UI cùng 2 gói mở rộng có kiểm soát (`DS1` PR #29,
`report-evidence-attachments` PR #30) đã hoàn tất kiểm chứng kỹ thuật. Các mục phụ thuộc
thao tác quản trị của chủ sở hữu repository (push/merge PR cuối `feat/a3-final-audit` vào `main`,
xác nhận GitHub Actions từ xa trên PR và đặt chế độ hiển thị `Public` cho GitHub repository)
được bàn giao minh bạch tại [Báo cáo kiểm toán cuối A3](qa/phase1-final-audit.md#62-các-bước-hành-động-thủ-công-bàn-giao-cho-chủ-sở-hữu-repository-post-audit-manual-actions).
Chỉ thực hiện nhiệm vụ được giao; bảng này không tự giao hoặc khởi chạy task tiếp theo.

## Lịch sử rà soát tài liệu (10/10/2026)

Đối chiếu trên nền `78f164b`, không triển khai task nghiệp vụ mới. Đồng bộ README,
runbooks, architecture/context, ledger và ghi chú tích hợp UI01-A; quy tắc nguồn tài
liệu và dependency nhiều lượt được bổ sung ngay trong catalog duy nhất. Handoff cũ
giữ evidence lịch sử, không chuyển số test cũ thành kiểm chứng mới.
