# Hướng Dẫn Xử Lý Sự Cố Docker Desktop & Testcontainers Trên Windows

## 1. Bối cảnh & Hiện tượng Thường Gặp

Khi chạy kiểm thử tích hợp (`.\mvnw.cmd verify` với Testcontainers PostGIS) hoặc khởi động cụm container (`docker compose up`) trên môi trường Windows 11 với Docker Desktop Engine 27.x/28.x/29.x (API version 1.44+), các kỹ sư có thể gặp một số cảnh báo hoặc lỗi gián đoạn do cơ chế bắt tay giao thức API client và WSL2 backend.

Tài liệu này tổng hợp các bước chẩn đoán nhanh và quy trình khắc phục chuẩn hóa.

---

## 2. Danh mục Chẩn đoán Nhanh (Diagnostic Checklist)

### 2.1. Kiểm tra Phiên bản Docker Client và Server API
Chạy lệnh kiểm tra:
```powershell
docker version
```
- Nếu xuất hiện thông báo `client version is too new for server` hoặc `Error response from daemon: client version X is greater than server max Y`:
  - Khắc phục tạm thời qua biến môi trường:
    ```powershell
    $env:DOCKER_API_VERSION = "1.44"
    ```

### 2.2. Kiểm tra Named Pipe Kết nối trên Windows
Testcontainers kết nối tới Docker daemon qua Windows Named Pipe:
```text
npipe:////./pipe/docker_engine
```
- Đảm bảo tùy chọn **Expose daemon on tcp://localhost:2375 without TLS** trong Docker Desktop Settings -> General KHÔNG bắt buộc phải bật nếu named pipe hoạt động bình thường.
- Đảm bảo user Windows hiện tại có quyền đọc/ghi vào pipe `docker_engine`.

### 2.3. Tối ưu Tài nguyên WSL2 Backend (`.wslconfig`)
Nếu Testcontainers khởi động PostGIS container bị timeout (> 60 giây) do máy tính hết RAM:
1. Tạo hoặc chỉnh sửa file `C:\Users\<Username>\.wslconfig`:
   ```ini
   [wsl2]
   memory=8GB
   processors=8
   swap=4GB
   localhostForwarding=true
   ```
2. Khởi động lại WSL2:
   ```powershell
   wsl --shutdown
   ```
3. Mở lại Docker Desktop.

---

## 3. Lỗi Trùng Cổng 5432 (Port Collision)

- **Nguyên nhân:** Dịch vụ PostgreSQL cục bộ cài trực tiếp trên Windows (Local Service) đang chiếm dụng cổng `5432`.
- **Chẩn đoán:**
  ```powershell
  Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
  ```
- **Khắc phục:**
  - Tắt service PostgreSQL cục bộ trước khi chạy docker compose:
    ```powershell
    Stop-Service postgresql* -Force -ErrorAction SilentlyContinue
    ```
  - Hoặc cấu hình `GDRN_DATABASE_PORT=5433` trong file `.env` khi chạy stack kiểm thử riêng biệt.

---

## 4. Xử lý Tràn Ổ Đĩa và Docker Volume Rác (Clean Volume Prune)

Khi chạy kiểm thử nhiều lần, Testcontainers Ryuk tự động thu dọn container nhưng đôi khi để lại image không dùng hoặc dangling volumes:

```powershell
# Dọn dẹp an toàn các dangling images và networks (KHÔNG xóa named volumes có dữ liệu)
docker system prune -f

# Chỉ dọn volume khi cần reset hoàn toàn môi trường dev (CẢNH BÁO: Mất dữ liệu dev)
# docker volume rm gdrn-disaster-response_database-data
```
