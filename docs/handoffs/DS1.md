# DS1 — Dashboard thống kê

Nhánh: `feat/dashboard-statistics`, tạo từ `origin/main` tại
`f91fc5d`. Trạng thái: đã triển khai/kiểm chứng trên nhánh DS1, chờ review/merge.
Yêu cầu trực tiếp của người dùng được ghi trong danh mục DS1.

## Kết quả

- S07 `/operations/dashboard`, mục Tổng quan/Dashboard, chỉ AUTHORITY. Giữ landing
  định tuyến hiện có. Dùng dùng chung API máy khách, vai trò bảo vệ, thành phần, CSS tokens và i18n.
- E16 `GET /api/dashboard`, thực thể tổng hợp toàn bộ dữ liệu thay vì một trang E08/E14.
  Báo cáo PENDING/VERIFIED/REJECTED, nhiệm vụ ASSIGNED/IN_PROGRESS/COMPLETED và
  đội available/busy. Tổng nhiệm vụ đang xử lý = ASSIGNED + IN_PROGRESS.
- Cặp ngày `from`/`to` inclusive theo Asia/Ho_Chi_Minh: báo cáo.created_at và
  nhiệm vụ.assigned_at; bỏ cả hai để xem all time. Bỏ báo cáo đã rút. Availability
  đội luôn dùng mọi nhiệm vụ đang hoạt động, không chịu lọc thời gian.
- Dashboard điều phối qua cổng của mình; hạ tầng gọi đúng công khai
  thực thể tổng hợp các hợp đồng của Reporting/Rescue, mỗi bên cung cấp giữ SQL nội mô-đun.
  Một chỉ đọc REPEATABLE READ giao dịch giữ ảnh chụp dữ liệu nhất quán.
- Loading/error/403/empty, retry/refresh, draft/applied dates, abort và lỗi thời phản hồi
  guards; Anh/Việt; bố cục điện thoại một cột. Không cài thư viện mới.
- V1–V6 giữ nguyên; không thêm schema/migration, broker/cache hay thay vòng đời.
  Nền tảng cơ sở P00 YAML vẫn 15 thao tác; khi chạy nhánh DS1 có E01–E16, 7 màn hình.

## Kiểm chứng thực tế

| Lệnh / kiểm tra | Kết quả |
| --- | --- |
| `.\mvnw.cmd --no-transfer-progress clean verify` | BUILD SUCCESS / exit 0, 1:03; 66 unit/architecture + 56 tích hợp = 122 kiểm thử, 0 failure/error/skip |
| `npm run typecheck` trong giao diện | ĐẠT |
| `npm test` | ĐẠT, 19 tệp / 90 kiểm thử |
| `npm run build` | ĐẠT, gồm TypeScript; warning chunk MapLibre >500 kB có sẵn |
| Compose project riêng `gdrn-dashboard-ds1`, `up --build -d --wait` | ĐẠT; DB/backend/frontend sẵn sàng, không dùng volume của checkout chính |
| `npx playwright test e2e/dashboard.spec.ts --reporter=list` | ĐẠT 2/2; kiểm thử lại sau chỉnh điện thoại cũng ĐẠT 2/2 |
| Source/module rà soát | Dashboard chỉ import các hợp đồng bên cung cấp; không join xuyên mô-đun; miền nghiệp vụ không thêm thư viện nền tảng |
| `git diff --check` và kiểm tra liên kết tài liệu DS1 | ĐẠT |

Integration kiểm thử DS1 chứng minh global counts với >100 báo cáo, loại withdrawn,
biên ngày chính xác (đầu ngày và cuối ngày microsecond), cohort rỗng vẫn giữ current
đội năng lực, role/method/path restrictions, invalid query/body, bên cung cấp kiểm tra dữ liệu,
lưu trữ failure không trả số 0 giả. Kiểm thử tranh chấp đồng thời commit hoàn thành nhiệm vụ bằng
connection/thread khác giữa hai bên cung cấp và xác nhận cùng ảnh chụp dữ liệu, yêu cầu sau mới
nhìn thấy trạng thái mới. Unit điều phối không dùng Spring và giả lập cổng.

Trình duyệt dùng API/backend/PostGIS thật, không giả lập business transport: gửi báo cáo
bằng người dân, làm mới thấy tổng tăng, lọc ngày/rỗng, clear, đổi Anh/Việt, đăng xuất,
người dân không có nav/quyền route/API, kiểm tra không tràn ngang ở 360/768/1280 px.
Fixture duy nhất do trình duyệt tạo được rút qua API trong finally; stack/DB tạm được
dọn sau kiểm chứng, không xóa dữ liệu cục bộ của người dùng.

Ảnh đã mở và kiểm tra trực quan: [máy tính Việt](../qa/DS1/dashboard-vi-1280.png),
[điện thoại 360](../qa/DS1/dashboard-empty-360.png), [máy tính bảng 768](../qa/DS1/dashboard-empty-768.png).

## Chạy lại

Khởi động stack disposable với trình diễn cấu hình và các cặp `DEMO_*_EMAIL/PASSWORD`
từ env riêng. Biên dịch backend/frontend của nhánh này, đặt `E2E_BASE_URL` tới giao diện
cùng origin có `/api` proxy. Đưa cùng trình diễn thông tin xác thực vào tiến trình environment;
không lưu chúng vào mã nguồn hoặc in token ra nhật ký. Sau đó chạy:

```powershell
cd frontend
npx playwright test e2e/dashboard.spec.ts --reporter=list
```

Lượt này dùng giao diện `15173`, ứng dụng phía máy chủ `18080`, DB `15432`, project Compose
`gdrn-dashboard-ds1`; env random nằm trong thư mục TEMP, không nằm trong Git.
Kiểm thử ngày rỗng 2020 yêu cầu disposable DB/demo fixtures của kiểm thử, không chạy nhắm
vào môi trường có dữ liệu thực tùy ý. Không cần key bản đồ để chạy bảng thống kê.

## Giới hạn

Dashboard là trạng thái hiện tại của cohort theo ngày gửi/phân công, không phải
lịch sử chuyển trạng thái, SLA hoặc tình trạng sẵn sàng tại một thời điểm quá khứ. Số liệu thay
đổi sau khi làm mới, không realtime. Chưa đo hiệu năng thực thể tổng hợp queries; không claim
performance improvement. Đầy đủ trình duyệt suite cũ, cài trực tiếp zoom, trình đọc màn hình và
Safari/Firefox chưa chạy lại trong DS1; không tự chuyển X2/A3 sang HOÀN TẤT.
Không đổi lại tệp tổng hợp tiến độ do lượt trước tạo (đang chưa được Git theo dõi khi bắt đầu).
