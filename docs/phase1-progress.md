# Tiến độ Pha 1

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

**UI bản đồ: UI01-A bổ sung đã merge PR #16 tại `df4777f`.** Phạm vi/prompt duy nhất nằm tại
[UI vị trí sau C2/D1](PROMPTS_PHA_1_4_NGUOI.md#ui-vi-tri-sau-c2-d1).
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
Xem [P00 handoff](handoffs/P00.md) và [kế hoạch/dependencies](PROMPTS_PHA_1_4_NGUOI.md).

**Bổ sung 09/10/2026 — F00 nền tảng chạy được:** hoàn tất readiness/liveness,
script local, Compose smoke và full verification trên nhánh `feat/runnable-foundation`.
Xem [handoff F00](handoffs/F00.md) để tra lịch sử kiểm chứng. Nền tảng đã merge qua
`853a532`; các nhãn F00–F04 không phải task mới trong kế hoạch. Chỉ dùng 16 task lõi + 3 checkpoint UI ở
[kế hoạch duy nhất](PROMPTS_PHA_1_4_NGUOI.md) để giao việc tiếp.

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
| D2 | 4 | D1, UI01-A | DONE baseline; bổ sung vị trí chờ review/merge | [Handoff](handoffs/D2.md): S06 workbench + E12–E15 client; review đã sửa stale async state, 409 recovery và double-submit; 41 frontend tests, 1 E2E browser test, full backend verify 113 tests |
| A1 | 1 | UI01-A; audit lại khi B2/D1 merge | DONE, đã merge main PR #19 | [Handoff](handoffs/A1.md): security allowlist/OpenAPI và shared route behavior đã audit |
| A2 | 1 | UI01-A; hoàn tất UI runtime và X2/CI | IN_PROGRESS; runtime đã merge main PR #19 | [Handoff](handoffs/A2.md): frontend Compose/runtime và CI checks đã có; chờ X2 cho browser CI |
| UI01-B | 1 + owners | B3, C2, D2, UI01-C1 | TODO | Audit đồng nhất/accessibility đủ 6 màn hình; gate trước X1 |
| X1 | 1 + owners | UI01-B, A1, A2 runtime | TODO | Tích hợp thật/feature freeze |
| X2 | 2 + 1 ghép CI | X1 | TODO | Browser E2E/hồi quy |
| D3 | 4 | X1 cho số đo; smoke D10 | TODO | Benchmark/Kaggle evidence |
| C3 | 3 | X1; bổ sung X2/D3 | TODO | Tài liệu/rubric/demo |
| A3 | 1 + nhóm | X2, C3, D3, UI01-B và mọi task trước | TODO | Audit cuối; không tuyên bố Pha 1 DONE khi thiếu evidence |

P00/P01/B1/B2/C1/UI01-A/UI01-C1/C2/D1/D2 và phần nghiệp vụ B3 đã tích hợp trên nền
hiện tại. D2 bổ sung vị trí đang chờ review/merge; UI01-B không được suy ra hoàn tất
từ implementation trên nhánh. A1 đã audit E01–E15 và merge PR #19 (`ed75849`);
A2 tiếp tục runtime/CI theo catalog; local Compose + Vite đang chạy không đồng nghĩa A2 hoàn tất.
UI01-B/X1/X2/A3 vẫn chưa đủ dependency; UI01-B phải bao phủ cả phần UI vị trí bổ sung.
Chỉ thực hiện prompt được giao; bảng này không tự giao hoặc khởi chạy task tiếp theo.

**Cập nhật A1 trên nhánh `feat/a1-security-audit`:** audit sau B2/D1 đã hoàn tất.
Security allowlist, OpenAPI Bearer metadata, default-deny path regression và frontend
route/role registry đã được kiểm tra; xem [handoff A1](handoffs/A1.md). A2, UI01-B,
X1, X2 và A3 vẫn là các cổng riêng theo catalog.

**Cập nhật A2 runtime trên cùng nhánh:** frontend production multi-stage, Compose
health/dependency, host port `FRONTEND_PORT`, Nginx SPA fallback và `/api` proxy đã
được kiểm chứng bằng Docker thật. CI đã thêm bước build Compose images; browser E2E
CI vẫn chờ X2 theo gate của catalog.

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
