# Kế hoạch chuyển sang lưu trữ đối tượng phân tán ở Pha 2

## 1. Bối cảnh và mục tiêu

Pha 1 quản lý ảnh minh chứng qua lớp trừu tượng lưu trữ cục bộ. Khi mở rộng ngang nhiều bản sao container ở Pha 2, dự kiến dùng lưu trữ đối tượng tương thích S3: MinIO cho triển khai tại chỗ/cách ly mạng, AWS S3 hoặc Cloudflare R2 cho đám mây.

Đề xuất này mô tả chuyển đổi lưu trữ, URL ký sẵn và cách giữ ranh giới cổng của kiến trúc lục giác, tránh phá vỡ nghiệp vụ Pha 1. Các tên lớp/API dưới đây là thiết kế dự kiến của Pha 2, không phải hợp đồng Pha 1 đang chạy.

## 2. Giữ ranh giới cổng và bộ chuyển đổi

Ranh giới miền dự kiến được giữ như sau:

```text
+-------------------------------------------------------------------+
| com.gdrn.incident.application.port.out.AttachmentStoragePort      |
|   + store(AttachmentId id, byte[] data, String contentType)       |
|   + generatePresignedUploadUrl(AttachmentMetadata metadata)       |
|   + generatePresignedDownloadUrl(AttachmentId id, Duration ttl)   |
|   + delete(AttachmentId id)                                       |
+-------------------------------------------------------------------+
                                ^
                                |
      +-------------------------+-------------------------+
      |                                                   |
+------------------------------------+  +------------------------------------+
| Bộ chuyển đổi Pha 1:                   |  | Bộ chuyển đổi Pha 2:                   |
| LocalFileSystemStorageAdapter      |  | S3CompatibleStorageAdapter         |
| (Ghi vùng dữ liệu Docker cục bộ)    |  | (AWS SDK v2 / MinIO Client)        |
+------------------------------------+  +------------------------------------+
```

## 3. Tải thẳng lên kho bằng URL ký sẵn

Mục tiêu là giảm bộ nhớ và băng thông qua ứng dụng khi tải ảnh nhiều MB tại vùng thiên tai:

1. **Yêu cầu tải lên:** Giao diện xin quyền và URL PUT ký sẵn qua `POST /api/v1/incidents/{id}/attachments/presign`.
2. **Tải trực tiếp:** Máy khách PUT nội dung nhị phân vào vùng chứa S3/MinIO.
3. **Xác nhận:** Giao diện báo hoàn tất qua `POST /api/v1/incidents/{id}/attachments/confirm`, kèm ETag và kích thước.
4. **Lưu siêu dữ liệu:** Ứng dụng kiểm tra tệp tồn tại bằng HeadObject rồi ghi bản ghi trong giao dịch cơ sở dữ liệu PostGIS.

## 4. Các bước chuyển đổi

1. **Pha 2.1 — Hiện thực bộ chuyển đổi:** Thêm `S3CompatibleStorageAdapter` với `@ConditionalOnProperty(name = "gdrn.storage.provider", havingValue = "s3")`.
2. **Pha 2.2 — Đọc từ hai nguồn:** Chỉ ghi tệp mới vào S3/MinIO. Khi đọc, có khóa S3 thì trả URL ký sẵn; nếu chưa có thì đọc vùng dữ liệu cục bộ.
3. **Pha 2.3 — Đồng bộ nền:** Dùng công cụ dòng lệnh có thể chạy lặp an toàn để chuyển tệp cũ sang kho đối tượng, rồi cập nhật khóa trong bản ghi đính kèm.
4. **Pha 2.4 — Ngừng bộ chuyển đổi cục bộ:** Gỡ bỏ sau khi đối soát 100% ảnh đính kèm.

## 5. Bảo mật và kiểm soát truy cập

- Mọi vùng chứa phải **riêng tư** (ACL `private`).
- Bật chặn truy cập công khai ở cấp vùng chứa.
- URL tải xuống tạm hết hạn sau 15 phút (`TTL = 900s`).
- Tích hợp bước quét mã độc qua hàng đợi thông báo sự kiện S3 bất đồng bộ.
