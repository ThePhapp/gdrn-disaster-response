# Tích hợp B1/C1 vào kế hoạch duy nhất

Theo yêu cầu người dùng: hòa giải hai nhánh tính năng và hợp nhất main,
chạy lại với mã nguồn thống nhất theo `docs/PHASE1_PLAN.md`.

## Nền và xử lý xung đột

- Main `a195093`: kế hoạch duy nhất; C1 domain/persistence/API/UI đã có tới `7be3b09`.
- C1 `766cf1f`: thêm bàn giao và trình duyệt E2E. Merge main vào C1 tại `bacf960`, giữ
  kế hoạch duy nhất, không hồi sinh hai tệp kế hoạch đã xóa; main fast-forward tới đó.
- B1 `5ff284a`: bộ chuyển đổi với schema/security test-only. Merge main vào B1 tại
  `7922c02`; giữ các kiểm thử Identity/probes/Disaster của main cùng kiểm thử Reporting.
  Không coi hợp nhất text là đã hoàn thành khi chạy B1.
- ADR Reporting đổi từ số006 sang007 vì main đã dùng006 cho mức sẵn sàng. Không đổi
  quyết định ADR006 đã hợp nhất. Tài liệu, links, ledger và tiến độ đã đồng bộ.

## Code và bản chuyển đổi lược đồ tích hợp

- V4__reporting_reports.sql được cấp sau V3 Disaster. DB cục bộ trước nâng cấp có
  V1/V2; kho mã tích hợp có V1–V3. Chuyển lược đồ nháp B1 sang Flyway thật, xóa bản nháp
  để tránh hướng dẫn chạy SQL thủ công. Không sửa checksum/DDL của V1–V3; không tạo dữ liệu mẫu.
- Mở đúng E07 POST cho CITIZEN; E08/E09 GET cho CITIZEN/AUTHORITY. Ownership ở
  ReportService và SQL danh sách; không mở PATCH/DELETE hoặc future API. Bỏ test-only
  Reporting security chain, kiểm thử dùng môi trường triển khai security và migrations.
- Bỏ Hidden bộ điều khiển; ghép reporting.json vào khi chạy Swagger. Chính xác 9
  thao tác trên 6 đường dẫn, Bearer/DTO/error hợp đồng P00; E08 không quảng cáo bán kính.
- Sửa danh sách Disaster thành REPEATABLE READ theo hợp đồng count/items cùng ảnh chụp dữ liệu.
  Kiểm thử interpose giữa các SELECT và commit insert từ thread/transaction khác,
  kiểm tra cả E03 và E08; không dùng sleep để giả tranh chấp. Không mở rộng nghiệp vụ C1.
- Upgrade kiểm thử V3→V4 giữ user/disaster hiện có, không tạo dữ liệu mẫu Reporting, rerun no-op.
  Bootstrap V2→V3 giữ target3 để tiếp tục kiểm thử đúng bước upgrade lịch sử.

## Kết quả thực tế

| Điều kiện kiểm tra | Kết quả |
| --- | --- |
| `.\mvnw.cmd --no-transfer-progress clean verify` | BUILD SUCCESS, 01:20; 37 unit/architecture +25 tích hợp =62; 0 failure/error/skipped |
| PostGIS/Testcontainers | Schema sạch V1–V4, V2→V3, V3→V4, preserving rows, ánh xạ, ownership/roles/input/page/filter, concurrent ảnh chụp dữ liệu ĐẠT |
| Giao diện `npm run typecheck`, `npm test`, `npm run build` | ĐẠT, Node22.14.0; 15 tests/4 tệp; không đổi dependencies/lockfile |
| `scripts/local.ps1 -Action start` | Compose ứng dụng/cơ sở dữ liệu sẵn sàng; Vite `/login` hoạt động; biên dịch ứng dụng phía máy chủ và upgrade V2→V3→V4 thành công |
| Account persistence | UUID/email/role/password hash fingerprint của 3 trình diễn accounts không đổi trước/sau upgrade |
| Reporting cục bộ HTTP kiểm tra nhanh | Đăng nhập thật; create201/own detail200/cross-citizen404/authority detail200/authority create403/anonymous401; ownerId và radius400; DELETE chưa implement403; danh sách không đọc chéo |
| `npm run test:login` với env trình diễn cục bộ | Playwright4/4 ĐẠT (9.8s): login/reload/logout cả 3 accounts; điều phối viên create/edit/resolve Disaster desktop/mobile qua API thật |
| Contracts/docs | P00 validator ĐẠT: 15 operations/6 screens/140 examples; Reporting khi chạy JSON khớp doc slice, OpenAPI hợp lệ; không broken cục bộ links hoặc xung đột markers |

Log cục bộ được Git bỏ qua: `.tools/merge-b1-c1-verify.log`, `merge-b1-c1-local.log`,
`merge-b1-c1-smoke.log`. Một số đầu ra stderr Docker/Node được PowerShell gắn nhãn
NativeCommandError khi redirect, nhưng tiến trình exit0 và các health/test các kiểm tra ĐẠT.
Không bỏ qua kiểm thử hoặc lỗi thực tế để báo xanh. Chưa xác nhận GitHub Actions từ xa.

Kiểm tra nhanh đã thêm một báo cáo PENDING mô phỏng và trình duyệt đã tạo/kết thúc một thảm họa
kiểm thử trong DB cục bộ qua API bình thường; không xóa dữ liệu cũ/volume, không đổi
`.env`. DB cục bộ bền vững tiếp tục chạy, không phải container kiểm thử tạm.

## Thử tại máy hiện tại và phạm vi còn lại

- Giao diện: http://127.0.0.1:5173/login — tài khoản DEMO_* trong `.env`.
- Ứng dụng phía máy chủ: http://127.0.0.1:18080; Swagger `/swagger-ui/index.html`.
- AUTHORITY có S05 `/operations/disasters`; CITIZEN có đăng nhập và E07–E09 qua API.
  S02/S03 chưa làm vì thuộc B3; không thêm trang/mock để giả hoàn thành.
- B2 được mở khóa sau hợp nhất B1/C1: verification, withdrawal, bán kính, ReportingQuery.
  B3 được bắt đầu phần gửi/xem; hoàn tất B3 vẫn chờ B2/D1. Không bắt đầu các công việc đó
  trong lần hòa giải này. A1 kiểm tra toàn bộ và A2 môi trường triển khai giao diện vẫn còn theo plan.
- Giữ nguyên một kế hoạch; contracts/ADRs/handoffs ghi chi tiết/evidence, không cấp
  công việc mới hoặc chạy lại F01–F04. Đây chưa phải toàn bộ 15 API/6 UI hoàn tất.
