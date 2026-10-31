# Bổ sung giao diện danh sách gọn

Nhánh: `feat/ui-ux-list-compact`.
Nền: `main` tại `9b49b76`.

## Phạm vi

Thu gọn bảng danh sách dài trên màn hình báo cáo/cứu hộ. Chỉ sửa CSS tính năng; giữ định tuyến, hợp đồng API, tải dữ liệu và nghiệp vụ.

## Đã triển khai

- S03 `/my-reports`: thẻ danh sách máy tính có chiều cao theo vùng nhìn và cuộn dọc riêng. Mô tả tối đa hai dòng; nhãn trạng thái tiếng Việt dài xuống dòng an toàn.
- S04 `/operations/reports`: danh sách chính có giới hạn và cuộn (`max-height: calc(100dvh - 14rem)`); khung chi tiết tự giãn, không cuộn bên trong. Thông tin ba cột, khoảng cách gọn và bản đồ chỉ đọc 13.5rem để hiển thị chi tiết/thao tác đầy đủ.
- S05 `/operations/disasters`: danh sách chính có giới hạn và cuộn; chi tiết tự giãn, thông tin ba cột, bản đồ 13.5rem, không cuộn bên trong.
- S06 `/operations/rescue`: danh sách chính có giới hạn; chi tiết nhiệm vụ tự giãn, bản đồ 13.5rem, không cuộn bên trong.
- Trên máy tính bảng/điện thoại, bố cục trở về xếp dọc tự nhiên, tắt cuộn lồng để giữ một cột dễ đọc.

## Commit

- `4a2e74d style: compact feature lists and workbenches`

## Kiểm chứng

Các kiểm tra sau đạt trên hệ thống Docker cục bộ, không xóa vùng dữ liệu:

| Kiểm tra | Kết quả |
| --- | --- |
| `npm.cmd run typecheck` | Đạt |
| `npm.cmd test -- --run` | Đạt, 16 tệp / 81 kiểm thử |
| `npm.cmd run build` | Đạt; còn cảnh báo kích thước gói MapLibre có sẵn |
| `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1 up -WaitTimeout 180` | Đạt; cơ sở dữ liệu, ứng dụng và giao diện sẵn sàng; đã kiểm tra sức khỏe, mức sẵn sàng, OpenAPI, Swagger, đường dẫn sâu SPA và phản hồi JSON API |
| `npm.cmd run test:login -- --reporter=line` với API Compose thật | Đạt, 19/19 kiểm thử trình duyệt |
| `./mvnw.cmd --no-transfer-progress clean verify` | Đạt, 62 kiểm thử đơn vị/kiến trúc và 51 tích hợp |

Ảnh rà soát sinh trong `frontend/test-results/`, được Git bỏ qua; gồm S03 và S06 tại 1280px/360px.

## Bàn giao

Cần dựng lại ảnh Docker giao diện sau khi chuyển nhánh. Khi đã có `.env` cục bộ:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1 up -WaitTimeout 180
```

Cổng cục bộ được ghi nhận là ứng dụng `8080`, giao diện `5174`, tùy cấu hình `.env`. Chưa đẩy mã hoặc hợp nhất nhánh.
