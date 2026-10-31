# Pha 1 — công khai các hợp đồng và bản chuyển đổi lược đồ ledger

## DS1 bổ sung

User yêu cầu bảng thống kê AUTHORITY; [danh mục DS1](../PHASE1_PLAN.md) và
[hợp đồng E16/S07](../api/dashboard-contract.md) bổ sung phạm vi số đo cơ sở bên dưới.
Dependency mới: `Dashboard → Reporting` và `Dashboard → Rescue`, chỉ qua
`ReportStatisticsQuery` / `RescueStatisticsQuery` thuộc `application.contract` của
bên cung cấp. Dashboard tầng ứng dụng dùng cổng riêng; bộ chuyển đổi chuyển bất biến count
records, không truyền domain/persistence objects. Không thêm chiều ngược.
Provider thực thể tổng hợp SQL chỉ đọc bảng nội mô-đun; chỉ đọc REPEATABLE READ phía
bên sử dụng dùng cùng datasource để giữ ảnh chụp dữ liệu xuyên hai bên cung cấp. Trusted internal
các hợp đồng không tự cấp quyền HTTP; DashboardService kiểm tra AUTHORITY trước khi đọc.
Không thêm bản chuyển đổi lược đồ hoặc slot ledger: sử dụng V1–V6 hiện có, không đổi mã kiểm tra.
Semantics null-window, date boundary, withdrawn, tình trạng sẵn sàng và failure được định
nghĩa trong hợp đồng bổ sung; kiểm thử tích hợp DS1 kiểm tra với PostGIS thật.

## Ảnh minh chứng bổ sung

User giao thêm một slice reporting ngoài số đo cơ sở DS1. Slice này cấp V7 trong ledger
bên dưới, giữ nguyên V1–V6 và mã kiểm tra đã áp dụng. Hợp đồng E12–E15 dùng lưu trữ cổng
riêng tư; quyền người dân owner/AUTHORITY và giới hạn JPEG/PNG được ghi trong
[ADR 010](../adr/010-report-evidence-private-storage.md) và OpenAPI reporting.

**Contracts P00; tích hợp B1/C1:** Identity V2, Disaster V3 và Reporting V4 đã có;
DisasterQuery đã triển khai trong C1. ReportingQuery được triển khai trên nhánh B2
từ ca3751d; xem [bàn giao B2](../handoffs/B2.md) và tiến độ cho review/merge.
Theo [kế hoạch](../PHASE1_PLAN.md), [HTTP/UI hợp đồng](../api/phase1-contract.md)
và [ADR 005](../adr/005-phase1-mvp-auth-frontend.md).

## Chiều phụ thuộc và owner

```text
Rescue → Reporting → Disaster                 (chiều phụ thuộc module mục tiêu)
Consumer application → consumer-owned port
Consumer infrastructure adapter → provider application.contract
```

Disaster không biết Reporting/Rescue; Reporting không biết Rescue. Miền nghiệp vụ chỉ Java,
không phụ thuộc công khai DTO hay thư viện nền tảng của mô-đun khác. Consumer dùng cổng của
mình, bộ chuyển đổi gọi đúng interface công khai của bên cung cấp; không repository/entity/SQL
join xuyên mô-đun, không HTTP nội bộ. Reporting mapper chuyển Disaster DTO sang DTO
của Reporting, không expose Disaster type cho Rescue. Interface/record/enums công
khai ở `<module>.application.contract`; chỉ chứa Java types, không Spring/JSON/JPA/
HTTP/Page. Chưa tạo package/class placeholder P00.

| Provider | Người phụ trách / công việc triển khai | Consumer / nhu cầu |
| --- | --- | --- |
| DisasterQuery | Người 3 / C1 | Người 2 / B2: kiểm tra ACTIVE để xác minh; dựng ảnh chụp dữ liệu cho Rescue |
| ReportingQuery | Người 2 / B2 | Người 4 / D1: eligibility E13, khả năng hiển thị E14, theo lô báo cáo lookup |

Identity không cần công khai truy vấn cho MVP: security bộ chuyển đổi cung cấp authenticated
người dùng UUID và active vai trò cho ca sử dụng, không tin thân yêu cầu và không kéo Spring principal
vào application/domain. E02 do Identity sở hữu. Không mô-đun gọi ngược Identity
persistence để xác thực mỗi tài nguyên. Public user/role administration và deletion
ngoài phạm vi. Provisioning trình diễn nội bộ thuộc P01 đã có; không cấm bootstrap đã chốt.

## Published signatures và trạng thái triển khai

DisasterQuery bên dưới đã có ở C1; ReportingQuery đã có trên nhánh B2. Các type công khai đặt ở tệp Java riêng khi triển khai; đoạn dưới mô tả
signature, không yêu cầu tạo placeholder hay một tệp chứa nhiều công khai types.

Trong `com.gdrn.disaster.application.contract`:

```java
public interface DisasterQuery {
    Optional<DisasterSnapshot> findById(UUID disasterId);
    Map<UUID, DisasterSnapshot> findByIds(Set<UUID> disasterIds);
}
public record DisasterSnapshot(UUID id, DisasterState status) {}
public enum DisasterState { ACTIVE, RESOLVED }
```

Trong `com.gdrn.reporting.application.contract`:

```java
public interface ReportingQuery {
    Optional<ReportSnapshot> findById(UUID reportId);
    Map<UUID, ReportSnapshot> findByIds(Set<UUID> reportIds);
}
public record ReportSnapshot(
    UUID id,
    UUID reporterId,
    ReportState status,
    Optional<LinkedDisaster> disaster
) {}
public record LinkedDisaster(UUID id, LinkedDisasterState status) {}
public enum ReportState { PENDING, VERIFIED, REJECTED }
public enum LinkedDisasterState { ACTIVE, RESOLVED }
```

DTO bất biến; collections defensive copies/unmodifiable; UUID/enums/Optional không
null. ReportSnapshot.thảm họa chỉ present khi VERIFIED (bắt buộc khi VERIFIED),
absent với PENDING/REJECTED. LinkedDisasterState thuộc Reporting, bản đồ tường minh từ
DisasterState. Không expose reporter email, thông tin xác thực, báo cáo text hay JPA thực thể.
Chưa thêm interface generic/god DTO/shared miền nghiệp vụ; không expose danh sách tất cả báo cáo IDs.

Missing Disaster => Optional.rỗng; không có delete Disaster trong MVP, nhưng thiếu
ID vẫn hợp lệ như lookup không tìm thấy. Missing/soft-deleted Report => Optional.rỗng;
theo lô bỏ key missing/deleted, không null value/tombstone. Các lookup là **trusted
internal** truy vấn, không lọc theo người gọi: Rescue tầng ứng dụng chịu trách nhiệm
kiểm tra reporterId với người dân principal trước khi trả HTTP. Không expose truy vấn
interface trực tiếp thành điểm cuối API.

Mỗi theo lô tối đa 100 không trùng IDs, rỗng đầu vào =>rỗng bất biến bản đồ, vượt limit/
null input/null member =>IllegalArgumentException (lỗi caller nội bộ, không business
absence). Map không bảo đảm iteration order; caller giữ thứ tự trang ban đầu. Không
trùng lặp đầu vào vì Set; `findById` tương đương theo lô singleton. Khi publish, owner
phải kiểm thử các semantics này bằng tầng ứng dụng kiểm thử + bộ chuyển đổi Testcontainers.

Reporting theo lô tải các báo cáo một lần, thu không trùng thảm họa IDs từ VERIFIED,
gọi DisasterQuery.findByIds tối đa một lần; không gọi findById từng dòng. Nếu tham chiếu
Disaster của VERIFIED không còn tồn tại: báo lỗi toàn vẹn qua lỗi tầng ứng dụng nội bộ,
không trả ảnh chụp dữ liệu hợp lệ giả/không silently bỏ báo cáo. HTTP bản đồ 500 INTERNAL_ERROR.
DB lỗi/timeout cũng propagate như failure, không chuyển thành Optional.rỗng.
Những trạng thái khác không cần truy vấn Disaster. Ảnh chụp dữ liệu mới mỗi lời gọi, không bộ nhớ đệm.

## Luồng truy vấn và biên giao dịch

- E10: Reporting kiểm tra báo cáo PENDING, đọc DisasterQuery; thiếu =>404, RESOLVED
  =>409, ACTIVE =>attempt nguyên tử verification. Đã rút ở lần đọc đầu =>404; đã quan sát
  PENDING nhưng thua concurrent rút báo cáo khi conditional ghi =>409 INVALID_TRANSITION.
- E13: Rescue đọc ReportingQuery mới trong lệnh, lấy owner/status/disaster.
  Missing/deleted báo cáo =>404, non-VERIFIED =>409, RESOLVED =>409. Sau đó kiểm tra tính hợp lệ
  đội và bảo vệ report/team uniqueness trong giao dịch Rescue.
- E14 có reportId: truy vấn Reporting trước để kiểm tra tồn tại/ownership; mismatch
  người dân =>404 ngay cả khi không có nhiệm vụ. Người dân thiếu reportId =>400.
- E14 điều phối viên không reportId: Rescue paginate/filter/count trên bảng của mình.
  Nếu kiểm tra/enrich báo cáo của trang, dùng một theo lô tối đa trang size 100; không
  N+1, không lọc bỏ nhiệm vụ sau paginate để chữa quyền sở hữu. E14 người dân luôn lọc
  reportId đã authorize tại DB. Không cần fan-out truy vấn tất cả báo cáo của người dân.
- E09 không gọi Rescue; S03 gọi E09 + E14 riêng. UI chịu trách nhiệm làm mới để xem
  tiến độ, không realtime/event bus. Report HTTP DTO không chứa Mission.

Query trả committed ảnh chụp dữ liệu ở thời điểm đọc; không trả lock/token giao dịch cho
caller. Các lệnh sở hữu ghi giao dịch tại mô-đun của mình; không có nguyên tử
ảnh chụp dữ liệu nhiều mô-đun hoặc ACTIVE-at-commit guarantee. Resolve trước business truy vấn
=>chặn verify/assignment; kết thúc sau truy vấn =>cho phép. Không có điều kiện kết thúc
phải chờ Rescue. Mission cũ vẫn hoàn tất được. Quy tắc này phải được kiểm thử với rào chắn đồng bộ/
chốt đồng bộ, không dựa sleep may rủi. Race report/team và chuyển trạng thái trong
[HTTP hợp đồng](../api/phase1-contract.md#trạng-thái-và-cạnh-tranh) là acceptance.

## ID quyền sở hữu và toàn vẹn dữ liệu dự kiến

Requirements → miền nghiệp vụ quy tắc → persistence ánh xạ → lược đồ → Flyway. Đây là quyết
định ownership/constraints cần dùng khi thiết kế ca sử dụng, không DDL/schema đã tạo.

| Reference | Chủ dữ liệu/validation | Chiến lược MVP |
| --- | --- | --- |
| Report.reporterId → User.id | Reporting nhận UUID từ identity đã xác thực | Scalar UUID, bất biến; không FK/JPA relation xuyên mô-đun; không xóa User trong MVP |
| Report.disasterId → Disaster.id | Reporting qua DisasterQuery tại xác minh | Scalar UUID, chỉ VERIFIED có liên kết; không FK xuyên mô-đun; Disaster không delete |
| Mission.reportId → Report.id | Rescue qua ReportingQuery | Scalar UUID, unique vĩnh viễn; VERIFIED không rút/đổi; không FK xuyên mô-đun |
| Mission.teamId → Team.id | Rescue sở hữu cả hai | FK nội mô-đun + ràng buộc một active mission/team; đội không delete |

Cross-module referential integrity được giữ bằng các hợp đồng và vòng đời không hard
delete, không cascade, không SQL join xuyên mô-đun. Nếu tương lai thêm user/disaster
deletion, phải ADR/contract mới và có migration/test trước; không giả định constraints
DB xuyên mô-đun đã có. SQL nội mô-đun có thể join các bảng do chính mô-đun sở hữu.
Soft-delete Report lưu dấu rút riêng, mọi truy vấn bình thường loại trừ; không đổi enum
ReportStatus thành WITHDRAWN. Timestamp/enum/version business ánh xạ do owner thiết
kế trong tính năng. Team tình trạng sẵn sàng được suy từ nhiệm vụ, tránh hai nguồn sự thật.

## Sổ bản chuyển đổi lược đồ (khởi tạo; đối chiếu main)

Người 1 giữ ledger và cấp phiên bản **khi PR sẵn sàng hợp nhất**, sau khi đọc Flyway history
của nhánh tích hợp và danh sách migrations đã hợp nhất. V1–V4 dưới đây đã cấp/merge;
các slot **CHƯA CẤP không phải reservation số tiếp theo**. Mỗi tính năng có thể cần nhiều bản chuyển đổi lược đồ; không tự cấp số ở
nhánh riêng, không dùng ngày/owner prefix để lách thứ tự.

| Slot hợp nhất | Mô-đun / owner | Công việc | Version | Nội dung dự kiến / trạng thái |
| --- | --- | --- | --- | --- |
| Đã có | Technical / 1 | Bootstrap | V1__enable_postgis.sql | Chỉ extension PostGIS; giữ nguyên |
| 1 | Identity / 1 | P01 | V2__identity_accounts.sql | Đã hợp nhất qua e4b449b; identity_users + identity_credentials, không tạo dữ liệu mẫu |
| 2 | Disaster / 3 | C1 | V3__disasters.sql | Đã tích hợp vào main qua bacf960; Disaster lifecycle/expected-version nguyên tử update, sau V2 |
| 3 | Reporting / 2; tích hợp / 1 | B1 | V4__reporting_reports.sql | Đã tích hợp/chốt tại c850103 trên nền bacf960 có V1–V3; PENDING/geography, không seed/FK xuyên mô-đun |
| Tiếp theo | Reporting / 2 | B2 | V5__reporting_verification_withdrawal.sql | Nhánh B2 từ main ca3751d: đối chiếu V1–V4 trước khi cấp V5; mở vòng đời constraints, metadata/withdrawn_at/version và GiST cho E08; giữ nguyên V4, chờ review/merge |
| 4 | Rescue / 4 | D1 | V6__rescue_teams_and_missions.sql | rescue_teams + rescue_missions; intra-module FK; report_id UNIQUE; chỉ mục duy nhất có điều kiện idx_rescue_missions_team_active cho active mission/team; thời điểm & vòng đời các kiểm tra |
| Tiếp theo | Reporting / 2 | User extension | V7__reporting_evidence_attachments.sql | Private attachment siêu dữ liệu, max 5 images/report, JPEG/PNG, max 5 MiB/image, soft-delete marker; binary content remains in the lưu trữ bộ chuyển đổi outside the gốc phục vụ web |

B1 miền/ứng dụng có thể làm song song C1 sau P01, nhưng persistence bản chuyển đổi lược đồ
B1 phải chờ C1 hợp nhất rồi mới cấp số. Mọi bản chuyển đổi lược đồ Reporting B2 phải vào trước Rescue
D1; B2 không được dùng số cũ chen sau số đã áp dụng cao hơn. Feature không đổi lược đồ
không cần bản chuyển đổi lược đồ. Sau vòng đầu, cấp phiên bản mới tăng đơn điệu theo thứ tự hợp nhất
thực tế, ghi thêm dòng ledger trong chính PR.

Trước hợp nhất: owner bàn giao nhu cầu schema/constraints và kiểm thử; Người 1 ghi phiên bản,
filename, PR/commit và các phụ thuộc thực tế vào ledger, kiểm tra collision/order;
owner chạy bản chuyển đổi lược đồ từ DB sạch và upgrade từ phiên bản trước bằng Testcontainers.
Không bật `out-of-order`, không sửa/rename/xóa bản chuyển đổi lược đồ đã hợp nhất hoặc đã áp dụng
(kể cả nhánh cục bộ đã chạy); sửa bằng bản chuyển đổi lược đồ mới. Không repair mã kiểm tra để né lỗi.
Nếu bản chuyển đổi lược đồ nháp có vấn đề về thứ tự, phối hợp Người 1 trước khi hợp nhất; không drop
DB/volume đang dùng. P00 không cấp phiên bản mới và không tạo bản chuyển đổi lược đồ business.

P01 cập nhật ledger: User giữ id/email/role; thông tin xác thực hash là concern tầng ứng dụng/
hạ tầng, không nằm trong User. ORM maps hai thực thể riêng, thông tin xác thực có FK nội
Identity tới người dùng; email unique. V2 kế tiếp V1, đã hợp nhất qua e4b449b. V3 Disaster
đã có trên main tại 3220765; V4 Reporting được cấp trong tích hợp trên nền bacf960
sau khi đối chiếu mã nguồn và Flyway history. V5 của B2 được ghi ở ledger phía trên; kiểm tra collision lại trước hợp nhất. [P01 bàn giao](../handoffs/P01.md) ghi kiểm tra dữ liệu lịch sử.

Trình diễn data được mô tả trong [HTTP hợp đồng](../api/phase1-contract.md#dữ-liệu-mẫu-và-json)
chỉ để chuẩn bị. P01/D1 dùng controlled trình diễn cấu hình idempotent, thông tin xác thực từ env;
không điểm cuối API tạo dữ liệu mẫu, không tài khoản mặc định trong production/migration.
