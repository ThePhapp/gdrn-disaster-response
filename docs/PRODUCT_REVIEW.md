# Dữ liệu và hướng dẫn rà soát sản phẩm

Đã chuẩn bị tại máy cục bộ, bằng API nghiệp vụ hiện có; giữ dữ
liệu cũ và tài khoản. Dữ liệu bổ sung có tiền tố **`[REVIEW-P1 Rxx]`** và tên thảm
họa **`Review P1 — ...`**. Đây là tình huống mô phỏng, không phải sự kiện cứu hộ thật.

## Mở sản phẩm

- **Giao diện:** <http://127.0.0.1:5174/login>
- **Swagger:** <http://127.0.0.1:18080/swagger-ui/index.html>
- **Health:** <http://127.0.0.1:18080/actuator/health>

Cổng API trong `.env` cục bộ đã chuyển từ 8080 sang **18080** vì 8080 đang được ứng
dụng khác sử dụng. Database vẫn **55432**, giao diện **5174**. Không đổi thông tin xác thực.

| Vai trò | Lấy tài khoản ở `.env` cục bộ | Bắt đầu từ |
| --- | --- | --- |
| Điều phối viên | `DEMO_AUTHORITY_EMAIL`, `DEMO_AUTHORITY_PASSWORD` | `/operations/dashboard` |
| Người dân 1 | `DEMO_CITIZEN_ONE_EMAIL`, `DEMO_CITIZEN_ONE_PASSWORD` | `/my-reports` |
| Người dân 2 | `DEMO_CITIZEN_TWO_EMAIL`, `DEMO_CITIZEN_TWO_PASSWORD` | `/my-reports` |

Mở các phiên/cửa sổ trình duyệt riêng để chuyển vai trò. Token hết hạn sau 15 phút;
khi hết hạn chỉ cần đăng nhập lại. Có thể chọn Tiếng Việt ở giao diện đăng nhập.

## Bộ dữ liệu hiện tại

Các số dưới đây là trạng thái **trước khi người rà soát thay đổi dữ liệu**:

| Dữ liệu | Số lượng / trạng thái |
| --- | --- |
| Tài khoản | 2 CITIZEN + 1 AUTHORITY, giữ nguyên tài khoản sẵn có |
| Thảm họa | **10**: 8 ACTIVE, 2 RESOLVED; có đủ 5 loại |
| Báo cáo | **46** tổng: **44 hiển thị** + **2 đã rút** |
| Báo cáo hiển thị | **17 PENDING**, **21 VERIFIED**, **6 REJECTED** |
| Theo người gửi | Người dân 1: **23** hiển thị; người dân 2: **21**; đều có trang 2 khi size20 |
| Nhiệm vụ | **9**: 1 ASSIGNED, 2 IN_PROGRESS, 6 COMPLETED |
| Đội cứu hộ | **6**: 3 AVAILABLE, 3 BUSY |
| Ảnh minh chứng | **10 PNG** trên 6 báo cáo; nhãn **DEMO DATA**, là hình minh họa tổng hợp |

Đã thêm 5 thảm họa, 36 báo cáo (14 pending/16 verified/4 rejected/2 withdrawn),
4 đội và 5 nhiệm vụ. Một nhiệm vụ thuộc dữ liệu mẫu cũ có assigned_at trước verified_at
đã được sửa **thời gian mẫu**, giữ ID và độ dài các khoảng thời gian; có backup trước sửa.
Không thêm điểm cuối API, bảng, bản chuyển đổi lược đồ hoặc đổi luật nghiệp vụ.

## Rà soát theo tình huống

| Tình huống | Dữ liệu / thao tác gợi ý | Kết quả cần quan sát |
| --- | --- | --- |
| Dashboard | Đăng nhập AUTHORITY | Tổng44 báo cáo, 3 nhiệm vụ đang xử lý, 3 đội rảnh |
| Lọc ngày | Chọn ngày tạo bộ dữ liệu trình diễn cho cả từ/đến | 34 báo cáo hiển thị mới; bỏ lọc trở về44 |
| Trạng thái rỗng | Chọn 01/01/2000 cho cả hai ngày | Báo cáo/nhiệm vụ bằng0, số đội vẫn là hiện tại |
| Phân trang | Mở Báo cáo của tôi bằng từng người dân | Có trang1/2 và trang2/2; không nhìn thấy báo cáo của người còn lại |
| Ảnh có thể chỉnh sửa | Citizen1 chọn R01 (2 ảnh), R06 (3 ảnh); citizen2 chọn R02 (1 ảnh) | Ảnh tải được; có upload/xóa khi còn PENDING |
| Duyệt / từ chối | AUTHORITY lọc PENDING rồi chọn R01–R12 hoặc R35/R36 | Có thể xác minh gắn thảm họa ACTIVE tương ứng, hoặc từ chối kèm lý do |
| Rút báo cáo | Citizen1 dùng R35, citizen2 dùng R36 | Xác nhận rút, báo cáo biến mất khỏi danh sách của người gửi |
| Báo cáo đã rút | R33/R34 | Không còn trên danh sách/API của cả người gửi và điều phối viên |
| Ảnh chỉ đọc | R13 (2 ảnh, VERIFIED/COMPLETED), R17 (1 ảnh, VERIFIED/ASSIGNED), R29 (1 ảnh, REJECTED) | Người dân chủ sở hữu và điều phối viên đọc được; không chỉnh sửa khi hết PENDING |
| Phân công mới | AUTHORITY lọc VERIFIED, chọn R18–R28, chọn đội rảnh | Tạo nhiệm vụ, đội chuyển bận; còn đủ đội rảnh để thử |
| Vòng đời nhiệm vụ | R17 hiện ASSIGNED; R16 hiện IN_PROGRESS | Có thể bắt đầu/hoàn thành; người dân tương ứng xem tiến độ |
| Nhiệm vụ hoàn tất | R13/R14/R15 | Hiển thị COMPLETED và thời gian; không tạo nhiệm vụ thứ hai cho cùng báo cáo |
| Xung đột đội | Dùng báo cáo chưa phân công với đội đang xử lý R16/R17 | API trả409 TEAM_BUSY; UI loại đội bận khỏi lựa chọn thông thường |
| Lọc bán kính | Điều phối viên lọc tâm `21.0285, 105.8542`, bán kính **1000m** | Chỉ báo cáo gần khu vực Hà Nội, không lẫn Đà Nẵng/Nha Trang |

Rxx là mã ở đầu mô tả; R lẻ thuộc citizen1, R chẵn thuộc citizen2. Dùng lọc trạng
thái để tìm nhanh trong danh sách. UI Rescue có thể nhận `?reportId=<id>`; các ID
thực tế được ghi ở `.tools/review-data/manifest.json`, không cần nhập tay UUID.

## Chạy lại sau khi tắt máy

Tại gốc kho mã, dùng **cả hai Compose tệp** để giữ volume ảnh của môi trường rà soát:

```powershell
docker compose -f docker-compose.yml -f docker-compose.review.yml --env-file .env up --build -d --wait
python scripts/prepare-review-data.py
```

Lệnh Python mặc định **chỉ đọc inventory**, không thay dữ liệu. Cần Python3 và Docker
CLI; tập lệnh dùng standard library, không cài thư viện. Nếu chuẩn bị lần đầu hoặc
chạy tiếp sau một bước bị gián đoạn:

```powershell
python scripts/prepare-review-data.py --apply
```

Script chỉ chấp nhận API loopback HTTP, môi trường khai báo cấu hình `demo`, đăng
nhập đủ3 vai trò trước khi thêm dữ liệu. Nó backup DB trước khi ghi, nhận diện fixtures
bằng mã/names, không nhân đôi khi chạy lại và không xóa/reset dữ liệu rà soát. Team
trình diễn được thêm bằng SQL vì không có API tạo đội. API chịu trách nhiệm tạo báo cáo,
duyệt/từ chối/rút, tải lên và chuyển trạng thái nhiệm vụ.

Sau khi rà soát đã thay đổi fixture, các kiểm tra kỳ vọng ban đầu có thể báo thiếu
trạng thái/ảnh hoặc đội rảnh; tập lệnh không đặt lại quyết định đã thực hiện. Không dùng
`scripts/refresh-demo-data.ps1 -Force` để nạp bộ này vì tập lệnh cũ xóa dữ liệu nghiệp vụ.

Dừng bằng `docker compose -f docker-compose.yml -f docker-compose.review.yml stop`.
Không chạy `down -v` nếu muốn giữ dữ liệu. Không thay sang base Compose đơn lẻ cho
ứng dụng phía máy chủ đang dùng volume rà soát, vì mount ảnh sẽ không còn trong cấu hình đó.

## Backup, bằng chứng và giới hạn

- `.tools/review-data/backups/`: dump SQL, backup env và bản sao thư mục ảnh trước
  khi đổi cấu hình; dữ liệu này **được Git bỏ qua**, có thể chứa credential/hash, không đưa vào Git.
- `.tools/review-data/manifest.json`: ánh xạ Rxx→reportId, disasterId, teamId,
  missionId và metadata10 ảnh; không có password/JWT.
- `.tools/review-data/summary.json`: inventory và12 mức sẵn sàng các kiểm tra API.
- `.tools/review-data/images/`: PNG tổng hợp nhỏ để tải lên thử; không phải ảnh hiện trường thật.
- `.tools/review-data/screenshots/`: ảnh chụp giao diện cục bộ của lượt kiểm tra.

Đã kiểm tra API: phân trang cả2 người dân, 404 khác chủ sở hữu, người dân dashboard403,
bán kính, 409 phân trùng báo cáo/đội, khoảng ngày rỗng/hôm nay, đội rảnh, đủ trạng
thái nhiệm vụ và chronology. Chạy lại `--apply` không tạo thêm báo cáo;10 ảnh vẫn
đọc được **sau khi recreate ứng dụng phía máy chủ** nhờ volume `review-attachment-data`.

Ứng dụng phía máy chủ `mvnw.cmd clean verify`: **130 ĐẠT (73 unit/architecture +57 tích hợp),
0 fail/error/skip**. Compose base+rà soát cấu hình hợp lệ,3 services sẵn sàng.
Chromium thật đã kiểm tra đăng nhập cả3 tài khoản: dashboard44, các định tuyến điều phối,
ảnh của authority/chủ báo cáo tải và render được, phân trang cho cả2 người dân,
hiển thị người dân ở viewport360px. Không thực hiện mutation trong lượt kiểm tra UI này.

**Giới hạn chưa sửa:** Nginx base vẫn chặn một số ảnh lớn hợp lệ bằng413 trước khi
đến ứng dụng phía máy chủ; ảnh fixture nhỏ nên xem/upload thử được. Volume rà soát giúp giữ ảnh
cục bộ, không phải quy trình sao lưu/khôi phục môi trường triển khai. Kết quả npm kiểm tra high và
giới hạn khi chạy còn lại xem [biên bản kỹ thuật](PHASE1_REVIEW.md).
