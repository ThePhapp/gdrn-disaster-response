# DS1 — Dashboard thống kê

Ngày: 18/10/2026. Nhánh: `feat/dashboard-statistics`, tạo từ `origin/main` tại
`f91fc5d`. Trạng thái: đã triển khai/kiểm chứng trên nhánh DS1, chờ review/merge.
Yêu cầu trực tiếp của user được ghi trong catalog DS1.

## Kết quả

- S07 `/operations/dashboard`, mục Tổng quan/Dashboard, chỉ AUTHORITY. Giữ landing
  routes hiện có. Dùng shared API client, role guard, components, CSS tokens và i18n.
- E16 `GET /api/dashboard`, aggregate toàn bộ dữ liệu thay vì một trang E08/E14.
  Reports PENDING/VERIFIED/REJECTED, missions ASSIGNED/IN_PROGRESS/COMPLETED và
  teams available/busy. Tổng mission đang xử lý = ASSIGNED + IN_PROGRESS.
- Cặp ngày `from`/`to` inclusive theo Asia/Ho_Chi_Minh: report.created_at và
  mission.assigned_at; bỏ cả hai để xem all time. Bỏ reports đã rút. Availability
  đội luôn dùng mọi mission đang hoạt động, không chịu filter thời gian.
- Dashboard orchestration qua port của mình; infrastructure gọi đúng published
  aggregate contracts của Reporting/Rescue, mỗi provider giữ SQL nội module.
  Một read-only REPEATABLE READ transaction giữ snapshot nhất quán.
- Loading/error/403/empty, retry/refresh, draft/applied dates, abort và stale response
  guards; Anh/Việt; bố cục mobile một cột. Không cài thư viện mới.
- V1–V6 giữ nguyên; không thêm schema/migration, broker/cache hay thay lifecycle.
  Baseline P00 YAML vẫn 15 operations; runtime nhánh DS1 có E01–E16, 7 màn hình.

## Verification thực tế

| Lệnh / kiểm tra | Kết quả |
| --- | --- |
| `.\mvnw.cmd --no-transfer-progress clean verify` | BUILD SUCCESS / exit 0, 1:03; 66 unit/architecture + 56 integration = 122 tests, 0 failure/error/skip |
| `npm run typecheck` trong frontend | PASS |
| `npm test` | PASS, 19 files / 90 tests |
| `npm run build` | PASS, gồm TypeScript; warning chunk MapLibre >500 kB có sẵn |
| Compose project riêng `gdrn-dashboard-ds1`, `up --build -d --wait` | PASS; DB/backend/frontend healthy, không dùng volume của checkout chính |
| `npx playwright test e2e/dashboard.spec.ts --reporter=list` | PASS 2/2; retest sau chỉnh mobile cũng PASS 2/2 |
| Source/module review | Dashboard chỉ import contracts provider; không join xuyên module; domain không thêm framework |
| `git diff --check` và kiểm tra link tài liệu DS1 | PASS |

Integration tests DS1 chứng minh global counts với >100 reports, loại withdrawn,
biên ngày chính xác (đầu ngày và cuối ngày microsecond), cohort rỗng vẫn giữ current
team capacity, role/method/path restrictions, invalid query/body, provider validation,
storage failure không trả số 0 giả. Test concurrency commit hoàn thành mission bằng
connection/thread khác giữa hai provider và xác nhận cùng snapshot, request sau mới
nhìn thấy trạng thái mới. Unit orchestration không dùng Spring và mock port.

Browser dùng API/backend/PostGIS thật, không mock business transport: gửi report
bằng citizen, refresh thấy tổng tăng, lọc ngày/rỗng, clear, đổi Anh/Việt, logout,
citizen không có nav/quyền route/API, kiểm tra không tràn ngang ở 360/768/1280 px.
Fixture duy nhất do browser tạo được rút qua API trong finally; stack/DB tạm được
dọn sau kiểm chứng, không xóa dữ liệu local của user.

Ảnh đã mở và kiểm tra trực quan: [desktop Việt](../qa/DS1/dashboard-vi-1280.png),
[mobile 360](../qa/DS1/dashboard-empty-360.png), [tablet 768](../qa/DS1/dashboard-empty-768.png).

## Chạy lại

Khởi động stack disposable với demo profile và các cặp `DEMO_*_EMAIL/PASSWORD`
từ env riêng. Build backend/frontend của nhánh này, đặt `E2E_BASE_URL` tới frontend
cùng origin có `/api` proxy. Đưa cùng demo credentials vào process environment;
không lưu chúng vào code hoặc in token ra logs. Sau đó chạy:

```powershell
cd frontend
npx playwright test e2e/dashboard.spec.ts --reporter=list
```

Lượt này dùng frontend `15173`, backend `18080`, DB `15432`, project Compose
`gdrn-dashboard-ds1`; env random nằm trong thư mục TEMP, không nằm trong Git.
Test ngày rỗng 2020 yêu cầu disposable DB/demo fixtures của test, không chạy nhắm
vào môi trường có dữ liệu thực tùy ý. Không cần key map để chạy dashboard.

## Giới hạn

Dashboard là trạng thái hiện tại của cohort theo ngày gửi/phân công, không phải
lịch sử transition, SLA hoặc availability tại một thời điểm quá khứ. Số liệu thay
đổi sau khi refresh, không realtime. Chưa benchmark aggregate queries; không claim
performance improvement. Full browser suite cũ, native zoom, screen reader và
Safari/Firefox chưa chạy lại trong DS1; không tự chuyển X2/A3 sang DONE.
Không đổi lại file tổng hợp tiến độ do lượt trước tạo (đang untracked khi bắt đầu).
