# Tiến độ Pha 1

**DS1 mở rộng Dashboard — 18/10/2026:** theo yêu cầu trực tiếp của user, đã tạo
`feat/dashboard-statistics` từ `origin/main` tại `f91fc5d`. Đã triển khai và kiểm
chứng trên nhánh DS1, chờ review/merge: E16/S07 dành cho AUTHORITY,
global status aggregates, lọc ngày UTC+7 và availability đội hiện tại. Backend
clean verify PASS 122 tests (66 unit/architecture + 56 integration), 0 skip;
frontend PASS 90 tests/typecheck/build; browser DS1 với Compose/PostGIS thật PASS
2/2, responsive 360/768/1280 và Anh/Việt. [Handoff DS1](handoffs/DS1.md),
[contract bổ sung](api/dashboard-contract.md), [ADR 009](adr/009-dashboard-statistics.md).
Đây là ngoại lệ scope được ghi trong catalog, không đổi evidence baseline hoặc
trạng thái X2/A2/D3/C3/A3. Các mục E01–E15/S01–S06 dưới đây giữ mốc lịch sử.

**Ảnh minh chứng mở rộng — 23/10/2026:** nhánh `feat/report-evidence-attachments`
được tạo từ `main`. Đã triển khai V7 metadata, private filesystem storage, E17–E20
upload/list/content/delete, ownership cho citizen và authority read-only, giới hạn
JPEG/PNG 5 MiB và 5 ảnh/report, xóa ẩn metadata trước physical delete, UI citizen và
authority. Unit/architecture tests 73 PASS; frontend 20 files/93 tests, typecheck
và build PASS. `clean verify` đã chạy nhưng 4 integration suites chưa thể chạy vì
Testcontainers không tìm thấy Docker daemon; xem [handoff attachments](handoffs/report-evidence-attachments.md).

**D3 benchmark — 24/10/2026:** nhánh `feat/d3-benchmark-kaggle` được tạo từ `main`
tại `16fb3a5`, tách commit theo workload, tooling, notebook/fix và evidence. Đã
chạy local disposable Compose/PostGIS: E07 write, E08 page, E08 radius smoke và
E08 page ở 10/50/100 VU; raw k6, summary đã redaction JWT, seed manifest và Docker
stats được lưu dưới `benchmark/results/` (ignored). Đây là local baseline, không phải
Kaggle completion; notebook chỉ preflight và ghi rõ k6/server Kaggle chưa cấu hình.
Xem [handoff D3](handoffs/D3.md) và [benchmark contract](benchmark/D3.md).

**X1 tích hợp luồng thật — 18/10/2026, nền `a12d8e1`: DONE trên nhánh `feat/X1-integration-freeze`, chờ review/merge.**
Compose thật, API smoke ba demo account, browser 19/19, OpenAPI E01–E15 và feature
freeze đã được kiểm tra; evidence tại [checklist X1](qa/phase1-integration-checklist.md)
và [handoff X1](handoffs/X1.md). Không phát hiện mismatch production cần sửa.

**X2 + A2 browser/CI — 21/10/2026, nền `main` tại `761e6f5`: DONE trên nhánh
`feat/x2-a2-browser-ci`, chờ review/merge.** Playwright regression với API/PostGIS thật
PASS 23/23 khi có map provider; Compose CI-style không có map provider PASS 18 và skip
5 scenario map tùy chọn. CI đã thêm job browser-e2e với secret runtime, health/smoke,
Chromium, artifact diagnostics và cleanup; remote GitHub Actions chưa chạy vì chưa push.
Xem [handoff X2](handoffs/X2.md) và [handoff A2](handoffs/A2.md).

**UI01-B audit — 17/10/2026, nền main `1b47b6f`: DONE, đã merge main PR #21.**
D2 vị trí đã merge PR #20; S01–S06, UI01-C1 và vị trí B3/C2/shared đều có trên main,
đủ gate bắt đầu audit. Đã retest 6 màn hình × 360/768/1280 và root font 200%; các lỗi
B-01…B-06 đã được xử lý trong source, ảnh evidence cập nhật. Typecheck/build PASS,
81 frontend tests, backend verify 113 tests PASS. Browser regression PASS 14, skip 5
do map-provider config rỗng; audit UI01-B PASS 1/1.
18 ảnh retest và các giới hạn NOT RUN được ghi trong [handoff UI01-B](handoffs/UI01-B.md).
X1 đã tiếp tục trên nền sau merge; X2/A3 vẫn giữ gate riêng.
Các đoạn theo ngày bên dưới giữ nguyên evidence lịch sử.

**Tích hợp main vào nhánh D2 — 17/10/2026:** giải quyết conflict progress khi merge
`main` tại `ed75849` vào `feat/D2-preview-ui-map` (`9cdc336`). Giữ evidence D2 và
cập nhật A1/A2 từ main. Frontend typecheck/build PASS, 80 tests PASS; backend
`mvnw.cmd clean verify` BUILD SUCCESS/exit 0, 113 tests, 0 fail/error/skip.
Browser/Docker image smoke không chạy lại trong lượt giải quyết conflict tài liệu.

**D2 cập nhật 16/10/2026, nền `a7471f0`:** B3 bổ sung vị trí đã merge PR #18. D2
baseline đã merge; bổ sung preview read-only E09, link S04→S06 và xử lý stale state
đã commit tại `9cdc336` trên nhánh D2, chờ review/merge vào main. Evidence mới và giới hạn tại
[handoff D2](handoffs/D2.md#d2-bổ-sung-vị-trí-và-kiểm-tra-tích-hợp--16102026).
Checks D2 ban đầu: typecheck/build PASS, 74 unit tests, 18/18 browser tests và 113 backend
tests PASS (0 skip). Sau sửa review: 78 unit tests, 2/2 browser D2, typecheck/build và
Maven verify 113 tests/exit 0 PASS; smoke riêng custom provider NOT RUN do automatic
approval review chặn lệnh Vite tạm. Retry đúng report và guard late mutation đã sửa. Luồng C2 verify→D2 assign→complete→B3 progress đã chạy UI thật.
Các đoạn ngày 15/10 bên dưới giữ evidence lịch sử, không thay trạng thái merge mới này.
UI01-B, X1/X2 và benchmark vẫn giữ gate/owner riêng.

**Trạng thái hiện tại — 15/10/2026, nền merge `d72ecb1`:** C2 đã merge PR #9 tại `120dec8`
(implementation `ad7a010`); D1 đã merge PR #11 tại `e380d68`, fix review `888996a`.
B2/UI01-C1 đã nằm trong nền merge `173a9a4`; D2 và phần nghiệp vụ B3 đã merge lần lượt
qua PR #13 (`ff652bd`) và PR #14 (`242583c`). Code hiện có E01–E15, V1–V6 và S01–S06;
UI01-C1/C2 bổ sung vị trí đã merge PR #17 tại `d72ecb1`. B3 đã hoàn thiện
picker/preview vị trí và regression trong working tree, chờ review/commit/merge.
[Review C2 sau merge](qa/c2-post-merge-review.md): 32 frontend tests, 9 browser tests,
113 backend tests pass; smoke C2→D1 qua API thật pass. [Handoff D2](handoffs/D2.md)
ghi 41 frontend tests, 1 browser E2E và 113 backend tests pass sau review.

Baseline UI01-A/UI01-C1/C2 đã merge. Shared `LocationMap`, MapLibre/MapTiler config public và
consumer tối thiểu tại form S05 đã có trên main. Picker/preview UI01-C1/C2 cũng đã
merge PR #17; B3 bổ sung vị trí đã có code/evidence nhưng chưa merge. UI01-B/X1/X2
vẫn giữ nguyên gate riêng.

Sửa review UI01-A 15/10: cô lập lỗi lazy map, sửa đồng bộ marker khi tải tiles,
lỗi provider sau load và disabled zoom; setup bổ sung config map vào `.env` cũ.
Retest PASS: 67 frontend tests, 4 browser tests, 113 backend tests; chi tiết ở handoff UI01-A.

Các ghi chú ngày 13/10 và 10/10 dưới đây là **lịch sử**, không còn là trạng thái
merge hiện tại. Bảng task đã đồng bộ bên dưới; số test cũ giữ nguyên theo handoff.

**Cập nhật C2 — 13/10/2026:** nền `173a9a4` đã merge PR #8, chứa B2/UI01-C1 cùng P01/C1/UI01-A. C2 đã triển khai S04 và route registration trên nhánh `feat/c2-reporting-operations`; chờ review nhóm/merge, chưa push. [Handoff C2](handoffs/C2.md) ghi evidence sau self-review: 32 frontend tests, 83 backend tests, 9 browser tests. S02/S03 vẫn chờ B3, citizen trong luồng C2 được kiểm tra qua HTTP thật. Các đoạn ngày 10/10 bên dưới giữ bối cảnh lịch sử, không còn là blocker B2 của C2.

Cập nhật 10/10/2026 sau đối chiếu main `ca3751d`, triển khai nhánh B2 và UI01-C1. Đây là bảng trạng thái, không phải kế hoạch riêng.
**DONE không đồng nghĩa đã review/merge** hay toàn bộ 15 APIs/6 screens đã implemented.
Nhánh B2 từ main `ca3751d` có E01–E11 và S01/S05, Flyway V1–V5; code B2 đã là
ancestor của main qua UI01-C1, còn [handoff B2](handoffs/B2.md) giữ evidence lịch sử.
Nhánh UI01-C1 từ B2 `2814b4f` đã cải tạo S05 và đã merge vào main tại `173a9a4`; xem
[handoff UI01-C1](handoffs/UI01-C1.md).
Nhánh D1 đã merge vào main tại `e380d68`; nhánh D2 merge main qua `5ebfc9b`,
S06 đã nối runtime E12–E15 và browser flow pass; xem [handoff D2](handoffs/D2.md).

**Bổ sung 09/10/2026 — F00 nền tảng chạy được:** hoàn tất readiness/liveness,
script local, Compose smoke và full verification trên nhánh `feat/runnable-foundation`.
Xem [handoff F00](handoffs/F00.md) để tra lịch sử kiểm chứng. Nền tảng đã merge qua
`853a532`; các nhãn F00–F04 không phải task mới trong kế hoạch. Chỉ dùng 16 task lõi + 3 checkpoint UI ở

| Task | Owner | Prerequisite đã merge | Trạng thái | Evidence / phần còn lại |
| --- | --- | --- | --- | --- |
| P00 | 1; cả nhóm review | Repo nền | DONE | OpenAPI + module contracts + ADR 005; đã có trên main tại 0e19c36 |
| P01 | 1 | P00 | DONE | [Handoff](handoffs/P01.md): E01/E02/S01; đã merge main qua PR #1 (`e4b449b`); kiểm tra tích hợp F00: 30 backend + 10 frontend tests pass |
| B1 | 2 | P01; C1 migration trước B1 | DONE | [Handoff](handoffs/B1.md): E07–E09, V4, security production, ownership/PostGIS/upgrade/snapshot tests; local smoke pass; radius/verify/delete thuộc B2 |
| C1 | 3 | P01 | DONE | [Handoff](handoffs/C1.md): E03–E06/S05, V3, DisasterQuery; integration retest 62 backend +15 frontend +4 browser tests pass; list snapshot đã sửa theo P00 |
| UI01-A | 1 | P00, P01, B1, C1 | DONE baseline; bổ sung vị trí đã merge | [Handoff](handoffs/UI01-A.md): baseline merge PR #6 `78f164b`; shared `LocationMap` + MapLibre/MapTiler config + consumer form S05 merge PR #16 tại `df4777f` |
| B2 | 2 | B1, C1 | DONE, đã tích hợp | [Handoff](handoffs/B2.md): E10/E11, E08 radius, ReportingQuery, V5; đã có trong nền merge `173a9a4`; evidence hiện tại ở review C2 14/10 |
| UI01-C1 | 3 | UI01-A, C1 | DONE, bổ sung vị trí đã merge | [Handoff](handoffs/UI01-C1.md): baseline merge PR #8 tại `173a9a4`; picker/detail preview merge PR #17 tại `d72ecb1` |
| D1 | 4 | B2, C1 | DONE, đã merge | [Handoff](handoffs/D1.md): E12–E15/V6; PR #11 `e380d68`, fix `888996a`; 113 backend tests pass (62 unit/architecture +51 integration) sau review |
| B3 | 2 | B1, UI01-A; B2/D1 để hoàn tất | DONE, bổ sung vị trí đã merge | Baseline PR #14 `242583c`; bổ sung vị trí PR #18 `a7471f0`; [handoff](handoffs/B3.md) giữ evidence owner; D2 retest chuỗi UI đến B3 progress PASS |
| C2 | 3 | B2, C1, UI01-A | DONE, bổ sung vị trí đã merge | Baseline PR #9 `120dec8`; S04 map tâm/radius + detail preview merge PR #17 tại `d72ecb1`; Citizen UI thuộc B3 |
| D2 | 4 | D1, UI01-A | DONE baseline + vị trí merge PR #20 | [Handoff](handoffs/D2.md); UI01-B đã xử lý CSS scope/contrast/padding trên nền main |
| A1 | 1 | UI01-A; audit lại khi B2/D1 merge | DONE, đã merge main PR #19 | [Handoff](handoffs/A1.md): security allowlist/OpenAPI và shared route behavior đã audit |
| A2 | 1 | UI01-A; hoàn tất UI runtime và X2/CI | DONE trên nhánh, chờ review/merge | [Handoff](handoffs/A2.md): frontend Compose/runtime, CI browser job và local evidence |
| UI01-B | 1 + owners | B3, C2, D2, UI01-C1 | DONE, đã merge main PR #21 | [Handoff](handoffs/UI01-B.md): retest 6 màn hình PASS, 18 ảnh evidence |
| X1 | 1 + owners | UI01-B, A1, A2 runtime | DONE trên nhánh, chờ review/merge | [Handoff](handoffs/X1.md); flow thật xuyên suốt, feature freeze; X2/C3/D3 có thể lấy baseline |
| X2 | 2 + 1 ghép CI | X1 | DONE trên nhánh, chờ review/merge | [Handoff](handoffs/X2.md): 23/23 local; CI-style 18 pass/5 map skip |
| D3 | 4 | X1 cho số đo; smoke D10 | DONE, đã merge PR #31 | [Handoff](handoffs/D3.md), [benchmark contract](benchmark/D3.md); baseline 6 workloads, raw artifacts dưới `benchmark/results/` |
| C3 | 3 | X1; bổ sung X2/D3 | IN PROGRESS trên nhánh | [Rubric](qa/phase1-rubric.md), [kiến trúc](architecture/architecture-overview.md), [kịch bản demo](qa/phase1-demo-script.md); dẫn số liệu D3 |
| A3 | 1 + nhóm | X2, C3, D3, UI01-B và mọi task trước | TODO | Audit cuối; không tuyên bố Pha 1 DONE khi thiếu evidence |

P00/P01/B1/B2/C1/UI01-A/UI01-C1/C2/D1/D2, UI01-B và phần nghiệp vụ B3 đã tích hợp trên nền
hiện tại. D2 bổ sung vị trí đã merge PR #20; UI01-B đã merge PR #21 và X1 đã PASS
luồng tích hợp trên nhánh riêng, không được suy ra chứng nhận WCAG đầy đủ từ evidence này. A1 đã audit E01–E15 và merge PR #19 (`ed75849`);
A2 đã ghép browser CI trên nhánh X2; local Compose + Vite đang chạy không đồng nghĩa
remote GitHub Actions đã được xác nhận. X1/X2 đủ acceptance trong phạm vi checklist
đã ghi; A3 vẫn giữ gate riêng.

**Cập nhật A1 trên nhánh `feat/a1-security-audit`:** audit sau B2/D1 đã hoàn tất.
Security allowlist, OpenAPI Bearer metadata, default-deny path regression và frontend
route/role registry đã được kiểm tra; xem [handoff A1](handoffs/A1.md). A2, UI01-B,
X1, X2 và A3 vẫn là các cổng riêng theo catalog.

**Cập nhật A2 runtime trên cùng nhánh:** frontend production multi-stage, Compose
health/dependency, host port `FRONTEND_PORT`, Nginx SPA fallback và `/api` proxy đã
được kiểm chứng bằng Docker thật. X2 đã thêm browser E2E CI với API/DB thật, secret
runtime và cleanup; xem handoff A2/X2.

## Rà soát tài liệu 10/10/2026

Đối chiếu trên nền `78f164b`, không triển khai task nghiệp vụ mới. Đồng bộ README,
runbooks, architecture/context, ledger và ghi chú tích hợp UI01-A; quy tắc nguồn tài
liệu và dependency nhiều lượt được bổ sung ngay trong catalog duy nhất. Handoff cũ
giữ evidence lịch sử, không chuyển số test cũ thành kiểm chứng mới.

Kiểm tra lần rà soát này: OpenAPI validator PASS (15 operations, 6 screens,
owners/consumers, 140 examples); 123 liên kết file Markdown nội bộ tồn tại;
catalog/progress cùng 19 task IDs; `git diff --check` PASS. Backend
`.\mvnw.cmd --no-transfer-progress clean verify` BUILD SUCCESS/exit0, 62 tests
(37 unit/architecture +25 integration), 0 failures/errors/skips, 1:23.
Maven host JDK23 với release21; backend image/CI pin Java21. Không chạy lại frontend
hoặc browser trong lượt chỉ sửa tài liệu này; evidence UI01-A vẫn ở handoff riêng.

Lượt review tiếp theo cùng ngày: làm rõ port/adapter và public signatures, missing/
deleted của ReportingQuery, migration B2 trên constraint V4, phối hợp security và
OpenAPI runtime trước DONE. Đồng bộ điều kiện A2 nhiều lượt và mốc D5; sửa hướng dẫn
clone theo remote hiện tại, giữ dữ liệu Compose khi thư mục clone cũ khác tên repo.
AGENTS chỉ được sửa mô tả bootstrap lịch sử; các quy tắc kiến trúc/test giữ nguyên.
Không thay schema/API wire contract hay tạo task mới. Chạy lại validator PASS,
123 file links hợp lệ, 19 task IDs khớp, diff check PASS; full clean verify
BUILD SUCCESS/exit0 lúc 20:13:58 +07:00, 1:15, 37 unit/architecture +25 integration,
0 failures/errors/skips. Frontend/browser không chạy lại vì chỉ thay tài liệu.
