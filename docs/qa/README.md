# Thư Mục Tài Liệu Đảm Bảo Chất Lượng & Bảo Vệ Đồ Án

Thư mục này tập trung toàn bộ tài liệu kiểm toán độc lập, ma trận tiêu chí đánh giá (Tiêu chí đánh giá), kịch bản trình diễn, kịch bản dẫn lời phân vai, kế hoạch ứng phó sự cố và cẩm nang xử lý kỹ thuật phục vụ giai đoạn nghiệm thu Pha 1.

---

## 1. Kiểm Toán & Đánh Giá Chất Lượng Pha 1 (Kiểm tra & Tiêu chí đánh giá)

- **[phase1-final-audit.md](phase1-final-audit.md)**: **Báo cáo kiểm toán độc lập cuối cùng Pha 1 (Công việc A3)**.
  - Đánh giá trung thực 16 cổng nghiệm thu (`G01`–`G16`) với kết quả `PASS` / `FAIL` / `NOT RUN`.
  - Ghi nhận 130/130 ứng dụng phía máy chủ kiểm thử (Testcontainers PostGIS), 93/93 kiểm thử giao diện, 18/18 trình duyệt E2E kiểm thử, clean clone verification và 0 rò rỉ bí mật.
- **[phase1-rubric.md](phase1-rubric.md)**: **Ma trận Tiêu chí đánh giá & Ngân hàng Câu hỏi Vấn đáp Kiến trúc**.
  - Đối chiếu toàn bộ tiêu chí chấm điểm đồ án theo chuẩn quốc tế / môn học.
  - Bổ sung 9 câu hỏi bảo vệ chuyên sâu về Hexagonal isolation, transactional boundary, DDD, spatial GiST indexing và tranh chấp đồng thời handling.
- **[phase1-integration-checklist.md](phase1-integration-checklist.md)**: Danh sách kiểm tra kiểm thử tích hợp luồng nghiệp vụ thật (Công việc X1).

---

## 2. Kịch Bản Diễn Tập & Trình Diễn Bảo Vệ

- **[phase1-demo-script.md](phase1-demo-script.md)**: **Kịch bản Trình diễn Trực tiếp 8–10 Phút**.
  - Phân luồng kịch bản xuyên suốt qua 3 vai trò: Người dân (`citizen1`), Coordinator (`authority1`) và Rescue Team Lead (`rescuer1`).
  - Kiểm chứng 15 API endpoints MVP và 7 màn hình nghiệp vụ (`S01`–`S07`).
- **[defense-speaker-cues.md](defense-speaker-cues.md)**: **Thẻ Dẫn Lời (Speaker Cue Cards) & Mốc Thời Gian Cho 4 Kỹ Sư**.
  - Phân bổ chính xác thời lượng (Người 1: 0:00–2:30; Người 2: 2:30–4:30; Người 3: 4:30–6:30; Người 4: 6:30–8:30; Wrap-up: 8:30–10:00).
  - Khẩu lệnh chuyển giao mạch lạc giữa các thành viên.
- **[demo-contingency-plan.md](demo-contingency-plan.md)**: **Kế Hoạch Dự Phòng Sự Cố (Contingency Matrix)**.
  - Quy trình ứng phó khi mất Internet phòng hội thảo (Fallback sang `VITE_MAP_PROVIDER=none` hoặc cục bộ ô bản đồ bộ nhớ đệm).
  - Quy trình phục hồi khi cơ sở dữ liệu bị bẩn hoặc container bị lag.

---

## 3. Cẩm Nang Vận Hành & Khắc Phục Sự Cố

- **[docker-desktop-troubleshooting.md](docker-desktop-troubleshooting.md)**: Hướng dẫn xử lý sự cố Docker Desktop 29.x, lỗi bắt tay API máy khách 1.44, trùng cổng 5432 và tối ưu bộ nhớ WSL2 ứng dụng phía máy chủ trên Windows.
- **[../benchmark/benchmark-hardware-normalization.md](../benchmark/benchmark-hardware-normalization.md)**: Hướng dẫn chuẩn hóa phần cứng và giải thích số liệu đo tải k6 (D3) trên CPU đa nhân.

---

## 4. Hồ Sơ Đánh Giá Chuyên Đề & UI

- **[UI01-B/](UI01-B/)**: Hồ sơ kiểm tra độ co giãn giao diện (thích ứng kích thước màn hình 360px/768px/1280px và zoom 200%) trên 6 màn hình MVP.
- **[DS1/](DS1/)**: Hồ sơ kiểm tra và nghiệm thu màn hình Dashboard điều phối thảm họa (`S07`).
- **[c2-post-merge-review.md](c2-post-merge-review.md)**: Biên bản kiểm thử rà soát sau sáp nhập mô-đun Quản lý Thảm họa (C2).
