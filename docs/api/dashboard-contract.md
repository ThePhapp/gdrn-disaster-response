# DS1 — Hợp đồng bảng thống kê

Phạm vi đã được người dùng cho phép; xem DS1 trong danh mục công việc duy nhất. Mở rộng nền E01–E15/S01–S06 bằng E16 và màn hình S07.

## HTTP

`GET /api/dashboard?from=2026-10-01&to=2026-10-18`, chỉ AUTHORITY, không có thân yêu cầu. Phải gửi cả hai ngày hoặc bỏ cả hai (toàn thời gian). Định dạng nghiêm ngặt YYYY-MM-DD, năm 0001–9999, from <= to. Tính cả hai ngày theo `Asia/Ho_Chi_Minh`; SQL bao đầu ngày bắt đầu, loại đầu ngày kế sau ngày kết thúc.

Tham số lạ/lặp/rỗng hoặc có thân yêu cầu trả 400 VALIDATION_ERROR. Bearer thiếu/sai/hết hạn trả 401; người dân/vai trò chưa hỗ trợ trả 403. Chặn phương thức khác và đường dẫn con lạ. Phản hồi dùng no-store và cấu trúc lỗi hiện có. Lỗi lưu trữ trả 500 INTERNAL_ERROR, không trả số đếm 0 giả.

```json
{
  "from": "2026-10-01",
  "to": "2026-10-18",
  "timeZone": "Asia/Ho_Chi_Minh",
  "asOf": "2026-10-18T09:00:00Z",
  "reports": { "pending": 12, "verified": 9, "rejected": 3 },
  "missions": { "assigned": 2, "inProgress": 3, "completed": 4 },
  "teams": { "available": 5, "busy": 5 }
}
```

Nếu không lọc ngày, `from`/`to` là null. Số đếm là long Java/số JSON không âm. Báo cáo tính trạng thái hiện tại, lọc theo thời gian tạo, loại đã rút. Nhiệm vụ tính trạng thái hiện tại, lọc theo thời gian phân công; hoạt động = assigned + inProgress. Đây là trạng thái hiện tại của nhóm dữ liệu được chọn, không phải ảnh chụp lịch sử hay số lần chuyển trạng thái trong khoảng. Đội luôn tính toàn bộ hiện tại; có nhiệm vụ ASSIGNED/IN_PROGRESS thì bận, kể cả ngoài khoảng ngày. Nhóm dữ liệu rỗng trả 0, nhưng số đội vẫn phản ánh năng lực hiện tại.

## Hợp đồng module công khai

`reporting.application.contract.ReportStatisticsQuery` cung cấp `Counts summarize(Instant fromInclusive, Instant toExclusive)`, với Counts(pending, verified, rejected). Rescue công bố `RescueStatisticsQuery` với cùng tham số khoảng và Counts(assigned, inProgress, completed, availableTeams, busyTeams). Khoảng là hai null (không giới hạn) hoặc hai thời điểm khác null đúng thứ tự; sai thì ném IllegalArgumentException. Số đếm không pagination, không chứa ID, nội dung báo cáo, dữ liệu người dùng hay kiểu lưu trữ.

Application layer Dashboard chỉ phụ thuộc cổng `DashboardStatistics` riêng. Hạ tầng ánh xạ hợp đồng bên cung cấp trong cùng giao dịch chỉ đọc REPEATABLE READ trên nguồn dữ liệu hiện có. SQL nằm ở module sở hữu; không SQL xuyên module hoặc nhập lớp nội bộ bên cung cấp. Phản hồi dùng một snapshot; asOf là thời điểm đọc sau truy vấn đầu tiên xác lập ảnh chụp, không cam kết cập nhật trực tiếp hay tái dựng lịch sử. Ca đọc này không cần ghi, thực thể miền, schema hay bản chuyển đổi mới.

## Giao diện

Điều hướng AUTHORITY có bảng thống kê; sau đăng nhập vào `/operations/dashboard`. CITIZEN vẫn vào `/my-reports`. S07 có tổng báo cáo, nhiệm vụ hoạt động, đội rảnh, hai ô ngày, nút áp dụng/xóa lọc/làm mới và phân rã báo cáo/nhiệm vụ. Ngày chỉ áp dụng khi bấm nút; xóa lọc về toàn thời gian. Luôn hiển thị khoảng/múi giờ đã áp dụng và lưu ý số đội là hiện tại.

Xử lý đang tải/lỗi/rỗng, thử lại, 403 và phản hồi muộn; không hiển thị số cũ dưới khoảng mới. Đăng xuất tháo màn hình và hủy yêu cầu. Hỗ trợ tiếng Anh/Việt, nhãn bàn phím, kích thước 360/768/1280px; không cần thư viện biểu đồ.
