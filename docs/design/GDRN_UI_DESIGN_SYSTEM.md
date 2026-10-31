# HỆ THỐNG THIẾT KẾ GIAO DIỆN GDRN — CRISIS COMMAND

**Phiên bản:** 1.1
**Trạng thái:** Đã rà soát và được đưa vào quy trình Pha 1
**Phạm vi:** Pha 1 MVP, chỉ 15 điểm cuối API E01–E15 và 6 màn hình S01–S06
**Vị trí trong kho mã:** `docs/design/GDRN_UI_DESIGN_SYSTEM.md`

> Tài liệu này quy định **giao diện và trải nghiệm người dùng**, không thay thế
> `CONTRIBUTING.md`, kế hoạch duy nhất tại `docs/PHASE1_PLAN.md`, hợp đồng P00
> hay OpenAPI. Khi có xung đột về nghiệp vụ, API, quyền hoặc định tuyến, kế hoạch, hợp đồng
> và mã nguồn đã hợp nhất có ưu tiên cao hơn. Không đổi chức năng chỉ để khớp bản thiết kế.

**Ngoại lệ DS1 do người dùng yêu cầu:** cho phép S07 bảng thống kê số liệu thật và
E16 theo [hợp đồng](../api/dashboard-contract.md). Giữ navy AUTHORITY phần đầu, dùng chung
tokens/controls, ba số đo có ý nghĩa nghiệp vụ và hai bảng trạng thái kèm thanh
tỷ lệ. Không thêm thư viện chart, chỉ số tăng trưởng giả hay sidebar mới. Mobile
xếp một cột; đầu vào ngày có nhãn, bộ lọc draft/applied tách biệt; bản Anh/Việt đầy đủ.
Các câu bảng thống kê ngoài phạm vi phía dưới mô tả số đo cơ sở trước ngoại lệ này.

## 1. Định hướng sản phẩm và bản sắc

**Tên phong cách:** GDRN Crisis Command — hệ thống quản lý sự cố và điều phối cứu hộ đáng tin cậy, rõ ràng, điềm tĩnh khi xử lý tình huống khẩn cấp.

**Không thiết kế theo mẫu SaaS/dashboard đại trà:** tránh sidebar và hàng loạt ô KPI trang trí, gradient vô nghĩa, glassmorphism tràn lan. Khác biệt của GDRN phải đến từ hệ phân cấp thông tin, ngữ nghĩa trạng thái, đường nét địa hình và quy trình hành động thực tế.

**Hai nhóm người dùng, một nhận diện thống nhất:**
- **CITIZEN (người dân):** nền sáng, dễ đọc, ưu tiên điện thoại, biểu mẫu ít áp lực nhận thức, một hành động chính rõ ràng.
- **AUTHORITY (cơ quan chức năng):** giao diện điều hành có mật độ thông tin cao hơn; điều hướng xanh navy; bố cục danh sách–chi tiết–thao tác để xử lý nhiều báo cáo/nhiệm vụ.

**Bổ sung phạm vi, chưa triển khai:** cho phép bản đồ chọn/xem một vị trí
và minh họa bán kính theo [danh mục duy nhất](../PHASE1_PLAN.md#ui-vi-tri-sau-c2-d1).
Giữ nhập tay, phương án dự phòng khi ô bản đồ lỗi, ghi nguồn bản đồ, bàn phím và dùng chung tokens.
Map chỉ hỗ trợ form/filter/detail, không thay danh sách, quyết định hay API thật.

**Ngoài phạm vi Pha 1:** bản đồ tổng hợp, routing/tracking/geocoding, biểu đồ, bảng thống kê số liệu, realtime feed, thông báo, tải lên, đăng nhập mạng xã hội, API/route mới, phân công tự động, tự động đánh giá rủi ro. Không dùng dữ liệu giả trong khi chạy để làm đẹp giao diện. Hình minh họa chỉ mang tính nhận diện, không ngụ ý tính năng đã tồn tại.

## 2. Nguyên tắc thiết kế

1. **Rõ ràng trong tình huống khẩn cấp:** mỗi khu vực có một hành động chính; không truyền đạt mức độ nghiêm trọng chỉ bằng màu.
2. **Có thể kiểm chứng:** hiển thị mã định danh, thời gian, trạng thái và hành động được phép theo dữ liệu API thật; không tạo chỉ số hoặc mức độ khẩn cấp giả.
3. **Khác biệt nhưng tiết chế:** họa tiết đường đồng mức địa hình, typography sắc nét, khoảng trắng có chủ đích, thanh nhấn trạng thái mảnh, nhóm thông tin đánh số.
4. **Truy cập được:** bàn phím, tiêu điểm dễ thấy, tương phản, nhãn đầu vào, thông báo lỗi và confirmation dễ hiểu.
5. **Triển khai tăng dần:** tái sử dụng React/Vite, router và API máy khách đã có từ P01; không thay thư viện nền tảng hoặc làm lại giao diện.

## 3. Biến thiết kế

Khai báo biến CSS ngữ nghĩa trong dùng chung theme. Không rải mã màu hex trực tiếp ở từng tính năng, trừ trường hợp có lý do rõ ràng.

| Token | Giá trị nền sáng | Mục đích |
|---|---|---|
| `--gdrn-ink` | `#10243A` | Tiêu đề, chữ chính, điều hướng |
| `--gdrn-ocean` | `#247BA0` | Liên kết, hành động thông tin |
| `--gdrn-rescue` | `#F47735` | Điểm nhấn cứu hộ/CTA quan trọng, không dùng cho tất cả nút |
| `--gdrn-critical` | `#C83F45` | Cảnh báo nghiêm trọng, lỗi, thao tác xóa |
| `--gdrn-success` | `#207A59` | Thành công, xác minh hoàn tất, nhiệm vụ hoàn tất |
| `--gdrn-warning` | `#A45B12` | Chờ xử lý, cần chú ý |
| `--gdrn-canvas` | `#F4F7FA` | Nền trang |
| `--gdrn-surface` | `#FFFFFF` | Thẻ thông tin, biểu mẫu, khung |
| `--gdrn-border` | `#D6E0E8` | Đường phân cách, viền |
| `--gdrn-muted` | `#506578` | Chữ phụ |

Các màu trên là **giá trị khởi đầu**, không mặc định mọi tổ hợp chữ/nền đều đạt WCAG. Cần kiểm tra tương phản thật, bổ sung cặp foreground/background cho nhãn, nút và các trạng thái.

**Trạng thái:** chỉ ánh xạ từ enum thực tế trong P00 và API. Không tự tạo enum mức độ thiên tai hay trạng thái nhiệm vụ mới. Mỗi trạng thái phải có **nhãn chữ + màu + biểu tượng khi cần**.

**Typography:** ưu tiên `Be Vietnam Pro` nếu đã có font hợp pháp hoặc được đóng gói đúng cách; phương án dự phòng `system-ui, sans-serif`. Không bắt buộc dùng CDN font bên ngoài. Thang cỡ chữ: `12 / 14 / 16 / 20 / 28 / 36px`. Nội dung Người dân ưu tiên 16px; Điều phối viên 14–16px. `line-height` nội dung ít nhất 1.45. Số, thời gian và ID dài nên có căn chỉnh/đứt dòng phù hợp.

**Khoảng cách:** lấy 4px làm đơn vị, dùng `4 / 8 / 12 / 16 / 24 / 32 / 48px`.
**Bo góc:** đầu vào 8px, card 12px, khung nổi bật 16px; không bo tròn quá mức.
**Đổ bóng:** nhẹ, ưu tiên viền phân tách.
**Chuyển động:** 120–200ms cho tương tác có ý nghĩa; hỗ trợ `prefers-reduced-motion`.

## 4. Nhận diện thị giác và bố cục

### 4.1. Đường đồng mức địa hình

Dùng họa tiết SVG/CSS tự tạo dạng đường đồng mức rất nhạt ở hero đăng nhập, tiêu đề khu vực hoặc màn hình trống. Họa tiết phải ở nền, không che chữ, không can thiệp thao tác. Không tải hoặc dùng tài nguyên bên ngoài khi chưa kiểm tra quyền sử dụng.

### 4.2. Thanh nhấn trạng thái

Card báo cáo/sự kiện/nhiệm vụ có thể dùng thanh viền trái 3–4px theo trạng thái. Luôn đi cùng nhãn và/hoặc icon; không phụ thuộc riêng màu để phân biệt.

### 4.3. Header nghiệp vụ

Một khối phần đầu nhất quán gồm tiêu đề, mô tả ngắn, breadcrumb khi thực sự cần và một hành động chính nếu vai trò được phép. Không tạo nút thao tác mà API chưa hỗ trợ.

### 4.4. Workbench cho Điều phối viên

Trên máy tính: vùng lọc/danh sách và khung chi tiết/hành động. Trên điện thoại: chuyển thành các vùng xếp dọc, tránh khung có chiều rộng cố định khiến tràn ngang. Tối ưu thao tác kiểm tra–quyết định thay vì biểu đồ trang trí.

### 4.5. Luồng thao tác Người dân

Biểu mẫu rộng khoảng 640–760px trên máy tính; nhóm trường rõ ràng, nhãn dễ hiểu, thông báo sau submit có thể nhận thấy, tránh mất dữ liệu nhập khi báo lỗi.

### 4.6. Trạng thái trống

Giải thích vì sao chưa có dữ liệu và đưa ra hành động tiếp theo **hợp lệ** theo quyền. Không tạo dữ liệu mẫu báo cáo giả vào giao diện.

## 5. Shared thành phần cần ưu tiên

Tận dụng các thành phần đã có từ P01 trước khi tạo mới. Chỉ xây thành phần thực sự được dùng:

- `PageHeader`, `SectionHeader`: tiêu đề, mô tả, hành động được phép.
- `StatusBadge`: nhãn trạng thái chính xác theo hợp đồng, màu và biểu tượng ngữ nghĩa.
- `OperationalCard`: card nghiệp vụ có thanh nhấn trạng thái khi phù hợp.
- `EmptyState`, `ErrorState`, `LoadingState`: trạng thái thống nhất.
- `ConfirmDialog`: dùng cho hành động không thể đảo ngược hoặc destructive theo yêu cầu nghiệp vụ.
- `FormField`, `Pagination`, `FilterBar`, `DetailPanel`: bổ sung nếu màn hình thật cần.

Phải thiết kế các trạng thái `idle`, `loading`, `success`, `empty`, `validation error`, `request error`, `401`, `403`, `404`, `409`. Khi có thể, giữ kích thước bố cục ổn định trong lúc tải. Dialog phải có nhãn, điều khiển tiêu điểm và trả tiêu điểm hợp lý sau khi đóng.

Không bắt buộc tạo toàn bộ danh sách thành phần trong một công việc. Không tự chuyển sang UI library mới chỉ để có phong cách đẹp hơn.

## 6. Đặc tả 6 màn hình MVP

| Màn hình | Thiết kế chủ đạo | Điều không được làm |
|---|---|---|
| **S01`/login`** | Desktop chia vùng nhận diện/biểu mẫu; họa tiết địa hình riêng; trên điện thoại một cột, đăng nhập rõ ràng | Không tạo tài khoản, social đăng nhập, thống kê giả |
| **S02`/reports/new`** | Form Người dân; picker vị trí dùng chung + nhập tay, kiểm tra dữ liệu, CTA gửi báo cáo | Chưa chọn ghim thì không tự điền tọa độ mặc định; không tải lên hoặc trường ngoài API |
| **S03`/my-reports`** | Danh sách/card có thời gian, trạng thái xác minh, khung chi tiết với xem trước vị trí chỉ đọc; tiến độ nhiệm vụ từ E14 | Không tạo timeline sự kiện hoặc nhiệm vụ giả |
| **S04`/operations/reports`** | Workbench duyệt; chọn tâm/vòng bán kính trong lọc, xem trước báo cáo chỉ đọc; chọn thảm họa qua E03 | Tách tâm lọc với vị trí báo cáo; không tự chọn thảm họa hoặc thêm bước duyệt |
| **S05 — định tuyến Disaster đã có trong C1** | Danh sách + khung xem trước vị trí; biểu mẫu tạo/sửa có picker và nhập tay; kết thúc giữ confirmation | Không đổi định tuyến, E03–E06, expectedVersion hoặc semantics kết thúc |
| **S06`/operations/rescue`** | Workbench điều phối: chọn báo cáo đã xác minh, xem trước vị trí báo cáo, chọn đội, danh sách nhiệm vụ và chuyển trạng thái | Không kéo-thả phân công, tự động điều phối, bản đồ đội/tracking hay CRUD đội |

Route ở bảng chỉ là tham chiếu theo kế hoạch. Với S05 và các tính năng đã triển khai, **đọc router/exports hiện tại**, không tự đổi tên đường dẫn.

## 7. Responsive, accessibility và UX acceptance

- Kiểm tra vùng nhìn **360px, 768px, 1280px**; không tràn ngang đối với nội dung thông thường.
- Có `:focus-visible`; mọi phần tử tương tác dùng bàn phím được; dialog có tên truy cập được, quản lý tiêu điểm và xử lý Escape khi phù hợp.
- Mọi đầu vào có nhãn hiển thị. Lỗi gắn với trường bằng `aria-describedby` khi thích hợp; lỗi quan trọng có `role="alert"`, thông báo thành công dùng vùng trạng thái phù hợp.
- Mục tiêu **WCAG 2.2 AA**: chữ thường tối thiểu 4.5:1, chữ lớn và thành phần UI quan trọng tối thiểu 3:1 khi áp dụng; kiểm tra cặp màu thực tế.
- Kích thước vùng chạm hướng đến 44×44px khi khả thi. Danh sách/bảng vẫn thao tác được trên điện thoại.
- Thời gian và múi giờ phải tuân thủ API hợp đồng; không thể hiện độ chính xác giả hoặc tự đổi timezone nghiệp vụ.
- Kiểm tra zoom 200%, tiếng Việt dài, dữ liệu trống/chậm/lỗi và chế độ giảm chuyển động.

## 8. Giới hạn kỹ thuật và quyền sở hữu

1. Trước khi sửa, đọc `CONTRIBUTING.md`, kế hoạch MVP, P00 các hợp đồng, mã nguồn giao diện thật và các bàn giao liên quan.
2. **Người 1:** dùng chung theme/layout/components/login/router. **Người 2:** Người dân Reporting. **Người 3:** Disaster và Operations Reporting. **Người 4:** Rescue.
3. Không sửa tệp tính năng của owner khác khi chưa phối hợp. Nếu muốn chỉnh S05, người 1 chỉ đưa đề xuất; người 3 thực hiện/review phần sửa thuộc Disaster.
4. Giữ nguyên token trong bộ nhớ, router guards, API máy khách, quyền, lỗi HTTP, yêu cầu/phản hồi, business semantics, kiểm thử và ứng dụng phía máy chủ behavior.
5. Không sửa ứng dụng phía máy chủ, Flyway bản chuyển đổi lược đồ, OpenAPI hoặc miền nghiệp vụ chỉ để đổi giao diện.
6. Không bổ sung môi trường triển khai các phụ thuộc nếu chưa có lý do và owner phê duyệt.
7. Không xóa thay đổi chưa commit. Không tự đẩy mã, hợp nhất, triển khai, công khai kho mã hoặc sinh bí mật.

## 9. Trình tự cải tạo sau khi P00/P01/C1/B1 đã hoàn thành

Ba checkpoint UI dưới đây đã được đăng ký trong danh mục chính. Tiêu chí triển khai nằm
ở `GDRN_UI_CHECKPOINTS.md`; tệp đó là phụ lục nghiệm thu, không phải kế hoạch độc lập.
Không chạy lại P00/P01/B1/C1 và không coi việc thêm tài liệu UI là công việc đã hoàn tất.

**UI01-A — Người 1:** kiểm tra giao diện hiện tại; thêm tokens/components nền; cải tạo S01; lập danh sách kiểm tra đề xuất S05. Chỉ sửa dùng chung UI và phần đăng nhập thuộc người 1.

**UI01-C1 — Người 3:** sau khi UI01-A hợp nhất, cải tạo S05 bằng dùng chung hệ thống thiết kế, giữ E03–E06 và định tuyến hoạt động.

**B3 / C2 / D2:** triển khai những màn hình chưa có trực tiếp theo hệ thống thiết kế đã
hợp nhất; không tạo placeholder hay trang giả để chờ ứng dụng phía máy chủ. B3 có thể làm phần S02/S03
dùng E07–E09 sau UI01-A, nhưng chỉ HOÀN TẤT khi B2 và D1 đã cung cấp withdraw/mission.

**UI01-B — Người 1 điều phối + các owner:** sau khi S01–S06 và UI01-C1 hợp nhất, kiểm tra
giao diện và accessibility; lỗi dùng chung do người 1 xử lý, lỗi tính năng giao owner tương
ứng. UI01-B phải đạt trước X1 tính năng freeze.

**Điều kiện kiểm tra tại mỗi bước:** chạy giao diện `typecheck`, `test` không watch, `build`; ứng dụng phía máy chủ xác minh theo `CONTRIBUTING.md` nếu được yêu cầu; thử trình duyệt thật nếu có công cụ. Nếu không thử được trình duyệt, ghi **CHƯA CHẠY**, nêu danh sách kiểm tra thủ công, không báo ĐẠT giả. Mỗi công việc cập nhật `docs/handoffs/UI01-*.md` và tiến độ thật.

## 10. Danh sách kiểm tra rà soát thiết kế

- [ ] Có bản sắc GDRN, khác bảng thống kê SaaS đại trà nhưng không thêm chức năng giả.
- [ ] Dùng chung tokens, typography, spacing và thành phần.
- [ ] Người dân và Điều phối viên có mức độ tập trung thông tin phù hợp.
- [ ] Bảo toàn 6 màn hình, 15 điểm cuối API, vai trò matrix và định tuyến thực tế.
- [ ] Xử lý loading/empty/error/confirmation rõ ràng.
- [ ] Không tràn ngang ở vùng nhìn mục tiêu.
- [ ] Đạt mục tiêu tương phản, nhãn, bàn phím, tiêu điểm và reduced motion.
- [ ] Dùng API thật, không giả lập dữ liệu trong môi trường triển khai.
- [ ] Có bằng chứng commands/tests, hình ảnh nếu có và trở ngại trong bàn giao.
