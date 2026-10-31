# Tiến độ Pha 1

**Rà soát tài liệu báo cáo, nền `main 2ddf9d0`:** nhánh
`docs/phase1-review-handoff`, chỉ sửa tài liệu/validator. README, OpenAPI khi chạy
20 thao tác và kịch bản nói 6 phút được đối chiếu mã nguồn; không thay danh mục hoặc
quyết định kiến trúc. Ứng dụng phía máy chủ clean xác minh **130 ĐẠT, 0 bỏ qua**, giao diện **93 ĐẠT**
+ typecheck/build, Compose cô lập build/up/smoke ĐẠT, trình duyệt **18 PASS/5 bản đồ bỏ qua**.
Nginx tải lên đã tái hiện lỗi `413` cho ảnh hợp lệ ~3 MiB, Compose thiếu volume ảnh,
npm kiểm tra báo 1 phụ thuộc high. Không kết luận production/Kaggle/remote CI đã đạt.
Xem [biên bản mới](PHASE1_REVIEW.md) cho lệnh, Git authors và hiệu đính kiểm tra cũ.
Các đoạn dưới là bằng chứng lịch sử tại nhánh/commit đã ghi; C3/A3 đã nằm trong main
qua các hợp nhất đến `2ddf9d0`. Notebook D3 hiện có là
`benchmark/kaggle_cpu_preflight.ipynb`; không dùng đường dẫn notebook cũ bên dưới
như bằng chứng tệp hoặc Kaggle completion.

**A3 kiểm toán cuối & bàn giao Pha 1:** trên nhánh `feat/a3-final-audit`
(tách từ `feat/c3-architecture-docs` @ `07cd20e`, kế thừa `main` @ `935e9ea`), đã thực
hiện kiểm toán độc lập toàn diện theo đúng đặc tả `A3`:
- **Clean Clone & Self-generated `.env` (`PASS`):** Clone sạch sang thư mục tạm ngoài kho mã,
  chạy `.\scripts\dev.ps1 init` tự sinh `.env`, dựng stack cô lập (`COMPOSE_PROJECT_NAME=gdrn_a3_clean`)
  bằng `docker compose up -d --build --wait` và chạy `.\scripts\dev.ps1 smoke` đạt **8/8 ĐẠT**;
  bảo toàn nguyên vẹn volume dữ liệu chính `gdrn-disaster-response_database-data`.
- **Ứng dụng phía máy chủ Verify (`PASS`):** `.\mvnw.cmd --no-transfer-progress clean verify` đạt `BUILD SUCCESS`
  với **130/130 kiểm thử ĐẠT** (`73` Surefire unit/ArchUnit + `57` Failsafe Testcontainers IT, `0` lỗi, `0` bỏ qua).
- **Giao diện Verify (`PASS`):** `npm.cmd ci --engine-strict=false`, `npm.cmd run typecheck` (`0 errors`),
  `npm.cmd test -- --run` (**20 kiểm thử tệp, 93/93 kiểm thử ĐẠT**), `npm.cmd run build` (`frontend/dist` sạch, `0` bí mật rò rỉ).
- **Playwright Trình duyệt E2E (`PASS`):** `.\scripts\browser-e2e.ps1` trên stack Docker Compose thật đạt
  **18 passed, 5 skipped** (5 kịch bản bản đồ-bên cung cấp opt-in khi `VITE_MAP_PROVIDER=none`), **0 thất bại**.
- **Ghi nhận trung thực các cổng bên ngoài (`NOT RUN`):** (1) Đo tải trực tiếp Docker máy chủ trên Kaggle CPU
  `NOT RUN` do Kaggle CPU không hỗ trợ Docker daemon (đã có số đo cơ sở k6 cục bộ 5 kịch bản 0% lỗi + chạy xác minh
  notebook `benchmark/kaggle/gdrn-d3-kaggle-benchmark.ipynb` ở chế độ `PREFLIGHT_ONLY`); (2) Lượt chạy GitHub Actions
  từ xa trên nhánh `feat/a3-final-audit` chờ đẩy mã; (3) Thao tác hợp nhất PR cuối (`C3`, `A3`) vào `main` và kiểm tra
  chế độ hiển thị `Public` của GitHub kho mã bàn giao cho chủ sở hữu kho mã.
- **Hoàn thiện Bộ Tài Liệu Diễn Tập & Vận Hành Bảo Vệ Đồ Án:**
  - Bổ sung tài liệu kịch bản dẫn lời và căn chỉnh thời gian cho từng thành viên: [defense-speaker-cues.md](qa/defense-speaker-cues.md).
  - Bổ sung kế hoạch dự phòng rớt mạng và lỗi ô bản đồ bản đồ: [demo-contingency-plan.md](qa/demo-contingency-plan.md).
  - Bổ sung hướng dẫn xử lý sự cố Docker Desktop 29.x & Testcontainers: [docker-desktop-troubleshooting.md](qa/docker-desktop-troubleshooting.md).
  - Bổ sung hướng dẫn chuẩn hóa phần cứng đo tải k6: [benchmark-hardware-normalization.md](benchmark/benchmark-hardware-normalization.md).
  Xem chi tiết tại [Báo cáo kiểm toán cuối A3](qa/phase1-final-audit.md) và [Bàn giao A3](handoffs/A3.md).

**C3 tài liệu kiến trúc, ADR, Tiêu chí đánh giá & Kịch bản Trình diễn:** hoàn tất trên nhánh
`feat/c3-architecture-docs` (`07cd20e`, đã gộp trong `feat/a3-final-audit`): cập nhật
[tổng quan kiến trúc](architecture/architecture-overview.md), hoàn thiện bộ 10 ADRs (`001`–`010`),
[ma trận tiêu chí đánh giá](qa/phase1-rubric.md) và [kịch bản trình diễn 8–10 phút](qa/phase1-demo-script.md).
Xem [Bàn giao C3](handoffs/C3.md).

**D3 đo hiệu năng (đã hợp nhất `main` qua PR #31 tại `935e9ea`):** nhánh `feat/d3-benchmark-kaggle`
tạo từ `main` tại `16fb3a5`. Đã chạy cục bộ disposable Compose/PostGIS cho 5 kịch bản k6
(`e07-write`, `e08-radius`, `e08-page` ở `10`/`50`/`100` VU, 0% lỗi, đỉnh tải 100 VU đạt `1,996.98 req/s`);
raw k6, tổng kết đã xóa JWT, tạo dữ liệu mẫu bản kê và Docker stats lưu dưới `benchmark/results/`.
Notebook Kaggle đã chạy xác minh kiểm tra môi trường (`benchmark/results/kaggle-preflight-summary.json`).
Xem [bàn giao D3](handoffs/D3.md) và [đo hiệu năng hợp đồng](benchmark/D3.md).

**Ảnh minh chứng mở rộng (đã hợp nhất `main` qua PR #30 tại `16fb3a5`):** nhánh
`feat/report-evidence-attachments` triển khai Flyway `V7`, riêng tư filesystem lưu trữ, `E17`–`E20`
upload/list/content/delete, quyền sở hữu cho người dân và điều phối viên chỉ đọc, giới hạn ảnh
5 MiB. Trong phiên kiểm toán `A3`, toàn bộ 57 kiểm thử tích hợp (bao gồm `FlywayMigrationIT` V1→V7
và `ReportingIT` cho `E17`–`E20`) đã chạy với Docker/Testcontainers thật và đạt **ĐẠT 100%**.
Xem [bàn giao attachments](handoffs/report-evidence-attachments.md) và [ADR 010](adr/010-report-evidence-private-storage.md).

**DS1 mở rộng Dashboard (đã hợp nhất `main` qua PR #29 tại `392714e`):** theo yêu cầu
trực tiếp của người dùng, triển khai `E16 GET /api/dashboard` và màn hình `S07 /operations/dashboard`
dành cho `AUTHORITY`, tổng hợp trạng thái toàn cục, lọc ngày UTC+7 và đội rảnh hiện tại.
Xem [Bàn giao DS1](handoffs/DS1.md), [hợp đồng bổ sung](api/dashboard-contract.md),
[ADR 008](adr/008-reporting-decisions-and-query-contract.md) và [ADR 009](adr/009-dashboard-statistics.md).

**X2 + A2 browser/CI (đã hợp nhất `main` qua PR #28 tại `85cf325`):** Playwright
hồi quy với API/PostGIS thật ĐẠT 23/23 khi có bản đồ bên cung cấp; Compose CI-style không có
bản đồ bên cung cấp ĐẠT 18 và bỏ qua 5 scenario bản đồ tùy chọn. CI (`.github/workflows/ci.yml`) đã tích hợp
tác vụ `browser-e2e` với bí mật khi chạy, health/smoke, Chromium, tệp kết quả diagnostics và dọn dẹp.
Xem [bàn giao X2](handoffs/X2.md) và [bàn giao A2](handoffs/A2.md).

**X1 tích hợp luồng thật (đã hợp nhất `main` qua PR #23 tại `f91fc5d`):** Compose thật,
API kiểm tra nhanh ba trình diễn account, trình duyệt E2E, OpenAPI E01–E15 và tính năng freeze đã được kiểm tra;
bằng chứng tại [danh sách kiểm tra X1](qa/phase1-integration-checklist.md) và [bàn giao X1](handoffs/X1.md).

**UI01-B kiểm tra, nền main `1b47b6f`: HOÀN TẤT, đã hợp nhất main PR #21.**
D2 vị trí đã hợp nhất PR #20; S01–S06, UI01-C1 và vị trí B3/C2/shared đều có trên main,
đủ gate bắt đầu kiểm tra. Đã kiểm thử lại 6 màn hình × 360/768/1280 và gốc font 200%; các lỗi
B-01…B-06 đã được xử lý trong mã nguồn, ảnh bằng chứng cập nhật. Typecheck/build ĐẠT,
81 kiểm thử giao diện, ứng dụng phía máy chủ xác minh 113 kiểm thử ĐẠT. Trình duyệt hồi quy ĐẠT 14, bỏ qua 5
do bản đồ-bên cung cấp cấu hình rỗng; kiểm tra UI01-B ĐẠT 1/1.
18 ảnh kiểm thử lại và các giới hạn CHƯA CHẠY được ghi trong [bàn giao UI01-B](handoffs/UI01-B.md).
Các đoạn theo ngày bên dưới giữ nguyên bằng chứng lịch sử.

**Tích hợp main vào nhánh D2:** giải quyết xung đột tiến độ khi hợp nhất
`main` tại `ed75849` vào `feat/D2-preview-ui-map` (`9cdc336`). Giữ bằng chứng D2 và
cập nhật A1/A2 từ main. Giao diện typecheck/build ĐẠT, 80 kiểm thử ĐẠT; ứng dụng phía máy chủ
`mvnw.cmd clean verify` BUILD SUCCESS/exit 0, 113 kiểm thử, 0 fail/error/skip.

**D2 cập nhật, nền `a7471f0`:** B3 bổ sung vị trí đã hợp nhất PR #18. D2
số đo cơ sở đã hợp nhất; bổ sung xem trước chỉ đọc E09, liên kết S04→S06 và xử lý lỗi thời trạng thái
đã hợp nhất qua PR #20 (`1b47b6f`). Bằng chứng và giới hạn tại
[bàn giao D2](handoffs/D2.md#d2-bổ-sung-vị-trí-và-kiểm-tra-tích-hợp).

**Trạng thái lịch sử, nền hợp nhất `d72ecb1`:** C2 đã hợp nhất PR #9 tại `120dec8`
(phần triển khai `ad7a010`); D1 đã hợp nhất PR #11 tại `e380d68`, fix rà soát `888996a`.
B2/UI01-C1 đã nằm trong nền hợp nhất `173a9a4`; D2 và phần nghiệp vụ B3 đã hợp nhất lần lượt
qua PR #13 (`ff652bd`) và PR #14 (`242583c`).
[Rà soát C2 sau hợp nhất](qa/c2-post-merge-review.md): 32 kiểm thử giao diện, 9 trình duyệt kiểm thử,
113 ứng dụng phía máy chủ kiểm thử đạt; kiểm tra nhanh C2→D1 qua API thật đạt. [Bàn giao D2](handoffs/D2.md)
ghi 41 kiểm thử giao diện, 1 trình duyệt E2E và 113 ứng dụng phía máy chủ kiểm thử đạt sau rà soát.

**UI bản đồ: UI01-A bổ sung đã hợp nhất PR #16 tại `df4777f`.** Phạm vi/nhiệm vụ duy nhất nằm tại
[UI vị trí sau C2/D1](PHASE1_PLAN.md#ui-vi-tri-sau-c2-d1).
Xem [P00 bàn giao](handoffs/P00.md) và [kế hoạch/dependencies](PHASE1_PLAN.md).

**Bổ sung — F00 nền tảng chạy được:** hoàn tất readiness/liveness,
tập lệnh cục bộ, Compose kiểm tra nhanh và đầy đủ verification trên nhánh `feat/runnable-foundation`.
Xem [bàn giao F00](handoffs/F00.md) để tra lịch sử kiểm chứng. Nền tảng đã hợp nhất qua
`853a532`; các nhãn F00–F04 không phải công việc mới trong kế hoạch. Chỉ dùng 16 công việc lõi + 3 checkpoint UI ở
[kế hoạch duy nhất](PHASE1_PLAN.md) để giao việc tiếp.

| Công việc | Người phụ trách | Prerequisite đã hợp nhất | Trạng thái | Bằng chứng / phần còn lại |
| --- | --- | --- | --- | --- |
| P00 | 1; cả nhóm rà soát | Repo nền | HOÀN TẤT, đã hợp nhất | OpenAPI + mô-đun các hợp đồng + ADR 005; đã có trên `main` tại `0e19c36` |
| P01 | 1 | P00 | HOÀN TẤT, đã hợp nhất PR #1 | [Bàn giao](handoffs/P01.md): E01/E02/S01; đã hợp nhất `main` qua PR #1 (`e4b449b`); kiểm tra tích hợp F00: 30 ứng dụng phía máy chủ + 10 kiểm thử giao diện đạt |
| B1 | 2 | P01; C1 bản chuyển đổi lược đồ trước B1 | HOÀN TẤT, đã hợp nhất PR #5 | [Bàn giao](handoffs/B1.md): E07–E09, V4, security môi trường triển khai, ownership/PostGIS/upgrade/snapshot kiểm thử; cục bộ kiểm tra nhanh đạt |
| C1 | 3 | P01 | HOÀN TẤT, đã hợp nhất PR #4 | [Bàn giao](handoffs/C1.md): E03–E06/S05, V3, DisasterQuery; kiểm thử tích hợp lại 62 ứng dụng phía máy chủ + 15 giao diện + 4 trình duyệt kiểm thử đạt |
| UI01-A | 1 | P00, P01, B1, C1 | HOÀN TẤT, đã hợp nhất PR #6 & PR #16 | [Bàn giao](handoffs/UI01-A.md): số đo cơ sở hợp nhất PR #6 (`78f164b`); dùng chung `LocationMap` + MapLibre/MapTiler cấu hình hợp nhất PR #16 (`df4777f`) |
| B2 | 2 | B1, C1 | HOÀN TẤT, đã hợp nhất PR #8 | [Bàn giao](handoffs/B2.md): E10/E11, E08 bán kính, ReportingQuery, V5; đã có trong nền hợp nhất `173a9a4` |
| UI01-C1 | 3 | UI01-A, C1 | HOÀN TẤT, đã hợp nhất PR #8 & PR #17 | [Bàn giao](handoffs/UI01-C1.md): số đo cơ sở hợp nhất PR #8 (`173a9a4`); picker/detail xem trước hợp nhất PR #17 (`d72ecb1`) |
| D1 | 4 | B2, C1 | HOÀN TẤT, đã hợp nhất PR #11 | [Bàn giao](handoffs/D1.md): E12–E15/V6; PR #11 (`e380d68`), fix (`888996a`); 113 ứng dụng phía máy chủ kiểm thử đạt (62 unit/architecture + 51 tích hợp) |
| B3 | 2 | B1, UI01-A; B2/D1 để hoàn tất | HOÀN TẤT, đã hợp nhất PR #14 & PR #18 | Nền tảng cơ sở PR #14 (`242583c`); bổ sung vị trí PR #18 (`a7471f0`); [bàn giao](handoffs/B3.md) giữ bằng chứng owner |
| C2 | 3 | B2, C1, UI01-A | HOÀN TẤT, đã hợp nhất PR #9 & PR #17 | Nền tảng cơ sở PR #9 (`120dec8`); S04 bản đồ tâm/radius + chi tiết xem trước hợp nhất PR #17 (`d72ecb1`); [bàn giao](handoffs/C2.md) |
| D2 | 4 | D1, UI01-A | HOÀN TẤT, đã hợp nhất PR #13 & PR #20 | [Bàn giao](handoffs/D2.md); số đo cơ sở PR #13 (`ff652bd`), bổ sung vị trí & xem trước E09 PR #20 (`1b47b6f`) |
| A1 | 1 | UI01-A; kiểm tra lại khi B2/D1 hợp nhất | HOÀN TẤT, đã hợp nhất PR #19 | [Bàn giao](handoffs/A1.md): security allowlist/OpenAPI và dùng chung định tuyến behavior đã kiểm tra (`ed75849`) |
| A2 | 1 | UI01-A; hoàn tất UI khi chạy và X2/CI | HOÀN TẤT, đã hợp nhất PR #28 | [Bàn giao](handoffs/A2.md): giao diện Compose/runtime, CI `browser-e2e` tác vụ và cục bộ bằng chứng (`85cf325`) |
| UI01-B | 1 + owners | B3, C2, D2, UI01-C1 | HOÀN TẤT, đã hợp nhất PR #21 | [Bàn giao](handoffs/UI01-B.md): kiểm thử lại 6 màn hình ĐẠT, 18 ảnh bằng chứng (`1b47b6f`) |
| X1 | 1 + owners | UI01-B, A1, A2 khi chạy | HOÀN TẤT, đã hợp nhất PR #23 | [Bàn giao](handoffs/X1.md), [danh sách kiểm tra X1](qa/phase1-integration-checklist.md); luồng thật xuyên suốt, tính năng freeze (`f91fc5d`) |
| X2 | 2 + 1 ghép CI | X1 | HOÀN TẤT, đã hợp nhất PR #28 | [Bàn giao](handoffs/X2.md): 23/23 cục bộ với bản đồ bên cung cấp; CI-style 18 đạt / 5 bản đồ bỏ qua (`85cf325`) |
| D3 | 4 | X1 cho số đo; kiểm tra nhanh D10 | HOÀN TẤT, đã hợp nhất PR #31 | [Bàn giao](handoffs/D3.md), [đo hiệu năng hợp đồng](benchmark/D3.md); 5 kịch bản k6 cục bộ số đo cơ sở (0% lỗi) + Kaggle kiểm tra môi trường (`935e9ea`) |
| C3 | 3 | X1; bổ sung X2/D3 | HOÀN TẤT trên nhánh (`07cd20e`), chờ hợp nhất PR cuối | [Bàn giao](handoffs/C3.md), [Tiêu chí đánh giá](qa/phase1-rubric.md), [kiến trúc](architecture/architecture-overview.md), [kịch bản trình diễn](qa/phase1-demo-script.md), ADRs `001`–`010` |
| A3 | 1 + nhóm | X2, C3, D3, UI01-B và mọi công việc trước | HOÀN TẤT trên nhánh (`feat/a3-final-audit`), chờ hợp nhất PR cuối & thao tác quản trị kho mã | [Bàn giao](handoffs/A3.md), [Final Kiểm tra](qa/phase1-final-audit.md): Clean Clone + Kiểm tra nhanh 8/8 ĐẠT, Ứng dụng phía máy chủ `clean verify` 130/130 ĐẠT, Giao diện 93/93 ĐẠT, Trình duyệt E2E 18 đạt / 5 bỏ qua / 0 fail, 0 secrets lộ; ghi rõ 3 mục `NOT RUN` (Docker trên Kaggle CPU, remote CI cho nhánh chưa đẩy mã, công khai repo/merge PR cuối) |

Toàn bộ 16 công việc lõi + 3 checkpoint UI cùng 2 gói mở rộng có kiểm soát (`DS1` PR #29,
`report-evidence-attachments` PR #30) đã hoàn tất kiểm chứng kỹ thuật. Các mục phụ thuộc
thao tác quản trị của chủ sở hữu kho mã (push/merge PR cuối `feat/a3-final-audit` vào `main`,
xác nhận GitHub Actions từ xa trên PR và đặt chế độ hiển thị `Public` cho GitHub kho mã)
được bàn giao minh bạch tại [Báo cáo kiểm toán cuối A3](qa/phase1-final-audit.md#62-các-bước-hành-động-thủ-công-bàn-giao-cho-chủ-sở-hữu-repository).
Chỉ thực hiện nhiệm vụ được giao; bảng này không tự giao hoặc khởi chạy công việc tiếp theo.

## Lịch sử rà soát tài liệu

Đối chiếu trên nền `78f164b`, không triển khai công việc nghiệp vụ mới. Đồng bộ README,
runbooks, architecture/context, ledger và ghi chú tích hợp UI01-A; quy tắc nguồn tài
liệu và phụ thuộc nhiều lượt được bổ sung ngay trong danh mục duy nhất. Bàn giao cũ
giữ bằng chứng lịch sử, không chuyển số kiểm thử cũ thành kiểm chứng mới.
