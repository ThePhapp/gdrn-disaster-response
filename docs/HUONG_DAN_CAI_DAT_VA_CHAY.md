# Hướng dẫn cài đặt và chạy GDRN sau khi clone

Tài liệu dành cho thành viên mới cài dự án trên máy cá nhân. Chạy các lệnh bên dưới
tại thư mục gốc kho mã, nơi có `pom.xml` và `docker-compose.yml`.

**Trạng thái hiện tại:** E01–E15, S01–S06, dùng chung UI01-A và A1; xem
[tiến độ](phase1-progress.md) cho commit/evidence. Ứng dụng phía máy chủ Spring Boot, PostGIS và
giao diện môi trường triển khai chạy bằng Compose; giao diện dev vẫn có thể chạy trên máy chủ.
Đọc [P01: JWT/demo env, Node và giao diện](P01_LOCAL.md) trước khi chạy ứng dụng phía máy chủ.
Giao diện ở cổng 5173, ứng dụng phía máy chủ không phục vụ trang HTML `/login`.

## Chạy nhanh bằng PowerShell

Sau khi cài Docker Desktop và bật Linux containers, tại thư mục kho mã:

```powershell
.\scripts\local.ps1 -Action setup
.\scripts\local.ps1 -Action start
```

Luồng trên cần Node 22.14.0 và Docker; mở `http://127.0.0.1:5173/login` rồi dùng tài
khoản DEMO_* trong `.env`. Xem chi tiết auth/seed/proxy ở [P01_LOCAL](P01_LOCAL.md).
Nếu chỉ cần ứng dụng/cơ sở dữ liệu, dùng `scripts/dev.ps1 init` rồi `scripts/dev.ps1 up`.
`dev.ps1 init` chỉ tạo `.env` nếu thiếu, sinh mật khẩu cục bộ ngẫu nhiên dùng chung cho
cơ sở dữ liệu và máy chủ ứng dụng phía máy chủ cùng JWT key base64 riêng; không in bí mật hoặc ghi đè
tệp cũ. Với `.env` trước P01 thiếu JWT key, chạy `scripts/local.ps1 -Action setup`
để điền cấu hình thiếu và trình diễn accounts, giữ các giá trị đã cấu hình. Nếu đã có volume
cơ sở dữ liệu từ lần chạy trước, điền thông tin xác thực gốc của volume vào `.env` trước `up`.
Thay password trong `.env` không đổi password của cơ sở dữ liệu đã khởi tạo.
`up` cũng gọi `init` khi cần, biên dịch ảnh môi trường, chờ cả hai container sẵn sàng và kiểm tra
HTTP thật. Khi thành công, tập lệnh in đường dẫn Swagger đúng theo cổng đang publish.
`dev.ps1` quản lý cả backend/database/frontend môi trường triển khai. Để chạy Vite máy chủ cho phát
triển nhanh, dùng `local.ps1 -Action start` theo [hướng dẫn P01](P01_LOCAL.md).

| Lệnh | Kết quả |
| --- | --- |
| `.\scripts\dev.ps1 status` | Trạng thái và cổng container |
| `.\scripts\dev.ps1 smoke` | Kiểm tra sức khỏe, trạng thái còn sống, mức sẵn sàng, OpenAPI, Swagger |
| `.\scripts\dev.ps1 smoke -BaseUrl http://localhost:8081` | Kiểm tra ứng dụng phía máy chủ chạy máy chủ hoặc cổng riêng |
| `.\scripts\dev.ps1 verify` | `mvnw.cmd clean verify`, cần JDK 21 và Docker |
| `.\scripts\dev.ps1 down` | Dừng/xóa container, giữ named volume và `.env` |

Script dùng được trên Windows PowerShell 5.1 và PowerShell 7. Có thể gọi bằng đường
dẫn tuyệt đối từ bất kỳ thư mục nào. Nếu chính sách máy chặn tập lệnh, dùng quy trình
thủ công bên dưới theo chính sách của máy. Script không tự thay execution policy.
Docker/server/native lệnh lỗi sẽ trả exit mã nguồn 1; không coi container vừa chạy
là ứng dụng đã sẵn sàng. Health không lộ chi tiết kết nối cơ sở dữ liệu.

Công việc phát triển chỉ lấy từ [kế hoạch duy nhất](PHASE1_PLAN.md).
[Bàn giao nền tảng](handoffs/F00.md) lưu kết quả lịch sử, không phải nhiệm vụ giao việc.

## 1. Chuẩn bị công cụ

| Công cụ | Backend/database bằng Docker | Chạy ứng dụng phía máy chủ trực tiếp trên máy |
| --- | --- | --- |
| Git | Cần | Cần |
| Docker Desktop hoặc Docker Engine + Compose v2 | Cần | Cần cho cơ sở dữ liệu và kiểm thử tích hợp |
| JDK 21 | Không cần cài trên máy | Cần; đặt `JAVA_HOME` trỏ đến JDK 21 và thêm Java vào `PATH` |
| Node 22.14.0 + npm | Cần nếu chạy giao diện dev | Cần nếu chạy giao diện dev |
| Maven cài riêng | Không cần | Không cần; kho mã có Maven Wrapper |
| PostgreSQL cài riêng | Không cần | Không cần; dùng cơ sở dữ liệu trong Docker |

Trên Windows, mở Docker Desktop và dùng **Linux containers**. Với Docker Engine
trên Linux, bảo đảm Docker daemon đang chạy và tài khoản có quyền sử dụng Docker.
Sau khi cài công cụ hoặc sửa `PATH`, mở kết thúc mới.

Kiểm tra:

```text
git --version
docker --version
docker compose version
docker info
```

Nếu chạy ứng dụng phía máy chủ trên máy, kiểm tra thêm:

```text
java -version
javac -version
```

Cả `java` và `javac` nên hiển thị phiên bản 21. Lần chạy đầu cần Internet để tải
Maven, thư viện Java và Docker ảnh; có thể mất vài phút.

## 2. Clone kho mã

```text
git clone https://github.com/ThePhapp/gdrn-disaster-response.git
cd gdrn-disaster-response
```

Nếu đã clone, chỉ cần mở kết thúc tại thư mục kho mã, không clone lại.
Tên thư mục clone cũ có thể vẫn là `2627I_INT3105_3`; không cần đổi tên để phát triển.
Compose mặc định suy project name từ thư mục: đổi tên thư mục hoặc project name có
thể làm nó dùng volume khác. Giữ project name/volume đang dùng nếu cần dữ liệu cục bộ cũ.

## 3. Tạo cấu hình môi trường

Tệp `.env` không được đưa lên Git nên máy mới phải tự tạo từ `.env.example`.
Chỉ chạy lệnh sao chép khi chưa có `.env`, tránh ghi đè cấu hình đang dùng.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Mở `.env` bằng trình soạn thảo. Thay hai giá trị `replace-with-a-local-password`
bằng cùng một mật khẩu riêng cho môi trường cục bộ; đồng thời cấu hình JWT key và
trình diễn thông tin xác thực theo [P01 setup](P01_LOCAL.md):

- `POSTGRES_PASSWORD`: mật khẩu khởi tạo cơ sở dữ liệu trong Docker.
- `DB_PASSWORD`: mật khẩu ứng dụng phía máy chủ chạy trên máy dùng để kết nối cơ sở dữ liệu.

Để dùng được các lệnh nạp `.env` trong tài liệu này, giữ dạng đơn giản `KEY=value`,
không có khoảng trắng quanh dấu `=` hoặc chú thích cuối dòng. Có thể dùng chuỗi
ngẫu nhiên chỉ gồm chữ và số cho mật khẩu cục bộ để tránh khác biệt xử lý ký tự giữa shell.
Không commit `.env` hoặc chia sẻ mật khẩu trong tài liệu.

### Cổng mặc định và cổng thay thế

Repo mặc định dùng ứng dụng phía máy chủ `8080`, cơ sở dữ liệu `5432`. Các cổng `18080` và `55432`
đã dùng trên máy phát triển trước đó là cấu hình riêng trong `.env`, **không tự có
sau khi clone**.

Nếu cổng mặc định bị chiếm hoặc Windows không cho phép bind, sửa/thêm các dòng:

```dotenv
APP_PORT=18080
DB_PORT=55432
DB_URL=jdbc:postgresql://localhost:55432/gdrn
SERVER_PORT=18080
```

| Biến | Ý nghĩa |
| --- | --- |
| `POSTGRES_DB` | Tên cơ sở dữ liệu, mặc định trong mẫu là `gdrn` |
| `POSTGRES_USER` | Tài khoản cơ sở dữ liệu, mặc định trong mẫu là `gdrn` |
| `POSTGRES_PASSWORD` | Mật khẩu cơ sở dữ liệu khi khởi tạo lần đầu |
| `DB_PORT` | Cổng cơ sở dữ liệu được công bố trên máy cá nhân |
| `APP_PORT` | Cổng ứng dụng phía máy chủ được công bố khi chạy bằng Compose |
| `DB_URL` | JDBC URL của ứng dụng phía máy chủ chạy trực tiếp trên máy |
| `DB_USERNAME`, `DB_PASSWORD` | Tài khoản kết nối khi ứng dụng phía máy chủ chạy trực tiếp trên máy |
| `SERVER_PORT` | Cổng ứng dụng phía máy chủ khi chạy trực tiếp trên máy; mặc định 8080 |
| `FRONTEND_PORT` | Cổng giao diện môi trường triển khai publish trên máy chủ; mặc định 5173 |

Nếu đổi tên cơ sở dữ liệu hoặc tài khoản, cập nhật cả `DB_URL` và `DB_USERNAME` tương ứng.
Compose tự kết nối ứng dụng phía máy chủ với `database:5432` trong mạng Docker, không dùng cổng
máy chủ trong `DB_URL` của `.env`.

## 4. Cách A — Chạy ứng dụng phía máy chủ và cơ sở dữ liệu bằng Docker

Đây là cách nhanh nhất để kiểm tra dự án sau khi clone; không cần cài JDK trên máy.
Sau khi hoàn thành bước tạo `.env`, chạy:

```text
docker compose config --quiet
docker compose up --build -d --wait
docker compose ps
```

Kết quả mong đợi: dịch vụ `database`, `backend` và `frontend` đều có trạng thái
`healthy`.
Flyway chạy khi ứng dụng phía máy chủ khởi động; không cần tạo bảng hoặc import SQL thủ công.

Với cổng mặc định, mở:

| Chức năng | Địa chỉ |
| --- | --- |
| Giao diện môi trường triển khai | http://localhost:5173/login |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| Health kiểm tra | http://localhost:8080/actuator/health |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |

Nếu đã đặt `APP_PORT=18080`, thay `8080` bằng `18080` trong các URL trên.
Health kiểm tra phải trả về `{"status":"UP"}`. Swagger khi chạy có E01–E15. Giao diện
môi trường triển khai trả HTML cho `/login` và deep định tuyến, còn `/api/unknown` trả JSON 401 từ
ứng dụng phía máy chủ thay vì bị SPA phương án dự phòng.
Các API tương lai vẫn bị từ chối; thiếu token 401, role/route không được phép 403.

Xem nhật ký nếu khởi động lỗi:

```text
docker compose logs --tail=100 backend
docker compose logs --tail=100 database
```

Theo dõi nhật ký liên tục bằng `docker compose logs -f backend`; nhấn `Ctrl+C` để thoát
xem nhật ký, container vẫn chạy.

## 5. Cách B — Database trong Docker, ứng dụng phía máy chủ chạy trên máy

Cách này dùng khi chỉnh sửa/debug Java trong IDE. Cần JDK 21. Nếu đã chạy cách A,
dừng ứng dụng phía máy chủ trong Docker để tránh tranh cổng. Database vẫn dùng chung volume cục bộ.

```text
docker compose stop backend
docker compose up -d --wait database
```

**Spring Boot không tự đọc `.env`.** Phải nạp các biến vào đúng kết thúc dùng để chạy
Maven; mở kết thúc mới thì cần nạp lại.

### Windows PowerShell

```powershell
Get-Content .env | ForEach-Object {
    if ($_ -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}
.\mvnw.cmd --version
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

### macOS/Linux

Chỉ nạp tệp `.env` do bạn kiểm soát, có cú pháp phù hợp với shell:

```bash
chmod +x mvnw
set -a
. ./.env
set +a
./mvnw --version
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Kiểm tra Java 21 trong kết quả `mvnw --version`. Sau khi xuất hiện thông báo
`Started GdrnApplication`, mở các URL ở bước 4 theo cổng `SERVER_PORT` (mặc định
8080). Biến `APP_PORT` không thay đổi cổng của ứng dụng phía máy chủ chạy trực tiếp trên máy.

Các lệnh trên dùng cấu hình `local`, không tạo dữ liệu mẫu tài khoản. Với DB mới cần tài khoản
trình diễn, điền đủ DEMO_* và dùng `-Dspring-boot.run.profiles=local,demo` như
[hướng dẫn xác thực](P01_LOCAL.md#ứng-dụng-phía-máy-chủ-cục-bộ--giao-diện-dev). Đổi cấu hình không đặt lại
account đã tồn tại. Đặt Vite `API_PROXY_TARGET` theo `SERVER_PORT` của ứng dụng phía máy chủ máy chủ.

Nhấn `Ctrl+C` tại kết thúc để dừng ứng dụng phía máy chủ cục bộ. Nếu chạy bằng nút Run/Debug của
IDE, cấu hình các biến môi trường tương tự trong lượt chạy configuration của IDE; IDE
đang mở không tự nhận các biến vừa đặt trong một kết thúc khác.

## 6. Kết nối và kiểm tra cơ sở dữ liệu

Có thể dùng công cụ quản lý PostgreSQL với thông tin trong `.env`:

| Trường | Giá trị |
| --- | --- |
| Host | `localhost` |
| Port | `DB_PORT`, mặc định `5432`, hoặc `55432` nếu đã đổi |
| Database | `POSTGRES_DB`, mặc định `gdrn` |
| Username | `POSTGRES_USER`, mặc định `gdrn` |
| Password | Giá trị `POSTGRES_PASSWORD` bạn đã đặt |

Hoặc mở `psql` có sẵn trong container, với tên mặc định:

```text
docker compose exec database psql -U gdrn -d gdrn
```

Nếu đã đổi user/database, thay hai giá trị `gdrn` trong lệnh. Trong `psql`, chạy:

```sql
SELECT postgis_version();
SELECT version, description, success FROM flyway_schema_history;
```

Gõ `\q` để thoát. Flyway history chỉ xuất hiện sau khi ứng dụng phía máy chủ đã khởi động và chạy
bản chuyển đổi lược đồ. V1 bật PostGIS, V2 tạo identity_users/identity_credentials, V3 tạo disasters,
V4 tạo reporting_reports với geography. Version mới tra [ledger](architecture/phase1-module-contracts.md), không tự cấp/sửa bản chuyển đổi lược đồ đã áp dụng. Chỉ cấu hình
`demo` với đủ env mới tạo ba tài khoản; không có dữ liệu mẫu/mật khẩu trong SQL.

## 7. Chạy kiểm thử

Cần JDK 21 và Docker daemon đang chạy. Không bắt buộc bật stack Compose hoặc tạo
`.env` để chạy kiểm thử: Testcontainers tạo cơ sở dữ liệu PostGIS riêng và tự dọn sau khi chạy.

**PowerShell:**

```powershell
.\mvnw.cmd clean verify
```

**macOS/Linux:**

```bash
chmod +x mvnw
./mvnw clean verify
```

Kết quả mong đợi là `BUILD SUCCESS`, không có kiểm thử bị lỗi hoặc bỏ qua. Lệnh này chạy
kiến trúc kiểm thử, domain/application/configuration kiểm thử đơn vị, kiểm thử tích hợp và đóng gói ứng dụng.
Chỉ chạy `mvnw test` sẽ không chạy kiểm thử tích hợp nên chưa đủ để xác nhận hoàn tất.

Kiểm tra riêng cấu hình Docker, không cần chứa mật khẩu thật trong đầu ra:

```text
docker compose --env-file .env.example config --quiet
```

## 8. Các lệnh dùng hằng ngày

| Mục đích | Lệnh |
| --- | --- |
| Bật lại stack đã biên dịch | `docker compose up -d --wait` |
| Biên dịch lại và chạy sau khi sửa mã nguồn | `docker compose up --build -d --wait` |
| Xem trạng thái | `docker compose ps` |
| Dừng dịch vụ, giữ container và dữ liệu | `docker compose stop` |
| Dừng và xóa container/network, giữ volume dữ liệu | `docker compose down` |

Database được lưu trong named volume nên vẫn còn sau khi dừng stack. Không dùng
`docker compose down -v` để dừng thông thường vì tùy chọn `-v` xóa cả volume dữ liệu.

## 9. Lỗi thường gặp

### Docker không kết nối được daemon

Mở Docker Desktop, chờ engine sẵn sàng rồi chạy `docker info`. Trên Windows,
kiểm tra đang dùng Linux containers. Trên Linux, kiểm tra service Docker và quyền
truy cập Docker của tài khoản hiện tại.

### `ports are not available` hoặc `address already in use`

Đổi cổng trong `.env` như bước 3, cập nhật `DB_URL` nếu đổi `DB_PORT`, rồi chạy lại
`docker compose up -d --wait`. Nếu đang chạy ứng dụng phía máy chủ trực tiếp trên máy, dừng nó
trước khi dùng lại cùng cổng cho Compose. Không cần tắt các ứng dụng khác không liên quan.

### Không tìm thấy `DB_USERNAME`, `DB_PASSWORD` hoặc kết nối cơ sở dữ liệu bị từ chối

Khi chạy ứng dụng phía máy chủ trên máy, nạp `.env` theo bước 5. Kiểm tra cơ sở dữ liệu `healthy`,
`DB_URL` trỏ tới đúng cổng máy chủ và mật khẩu/tài khoản khớp với cơ sở dữ liệu đã khởi tạo.
Không dùng hostname `database` cho ứng dụng phía máy chủ chạy ngoài Docker.

### Đổi mật khẩu trong `.env` nhưng vẫn báo xác thực thất bại

Các biến `POSTGRES_*` chỉ khởi tạo tài khoản/database khi volume còn mới. Sửa `.env`
không tự đổi mật khẩu trong cơ sở dữ liệu đã tồn tại. Dùng lại thông tin khởi tạo hoặc
đổi mật khẩu bằng SQL với tài khoản có quyền, rồi cập nhật `.env` cho khớp.
Không xóa volume nếu cần giữ dữ liệu.

### Maven tải lỗi hoặc mirror trả tệp hỏng

Repo có cấu hình tùy chọn để dùng Maven Central trực tiếp và bộ nhớ đệm riêng, không sửa
Maven settings toàn máy. Nếu môi trường cho phép truy cập Maven Central, chạy:

```powershell
.\mvnw.cmd -s .mvn/settings-central.xml "-Dmaven.repo.local=.tools/m2" clean verify
```

Trên macOS/Linux:

```bash
./mvnw -s .mvn/settings-central.xml -Dmaven.repo.local=.tools/m2 clean verify
```

Có thể dùng cùng hai tùy chọn khi chạy ứng dụng phía máy chủ, ví dụ trong PowerShell sau khi nạp `.env`:

```powershell
.\mvnw.cmd -s .mvn/settings-central.xml "-Dmaven.repo.local=.tools/m2" spring-boot:run "-Dspring-boot.run.profiles=local"
```

### IDE báo unresolved imports hoặc `Unresolved compilation problems`

Mở đúng thư mục kho mã, chọn JDK 21 và reload/import lại Maven project từ `pom.xml`.
Kiểm tra cấu hình Maven của IDE nếu kết thúc đang phải dùng mirror/cache thay thế.
Tránh để IDE và Maven cùng biên dịch vào `target`: tạm dừng automatic biên dịch của IDE
rồi chạy lại `clean verify` nếu IDE ghi đè class bằng compilation-lỗi stubs.
Không bỏ qua kiểm thử để che lỗi.

### Trang `/login` trên cổng ứng dụng phía máy chủ trả lỗi

P01 chạy giao diện dev ở cổng 5173, gọi ứng dụng phía máy chủ qua Vite proxy. Mở
`http://127.0.0.1:5173/login`; không dùng cổng ứng dụng phía máy chủ cho HTML. Nếu Swagger không có
E01–E11, kiểm tra branch/commit và biên dịch lại ứng dụng phía máy chủ hiện tại. Xem [auth/local](P01_LOCAL.md).

### Route `/operations/disasters` chuyển về đăng nhập hoặc báo không có quyền

JWT nằm trong `sessionStorage` của tab hiện tại nên reload cùng tab giữ phiên; mở tab mới
cần đăng nhập lại. Đăng nhập tài khoản AUTHORITY
và bấm Thảm họa trên nav trong cùng tab. Người dân bị chặn đúng vai trò; không sửa bảo vệ
hoặc permitAll để mở trang. Nếu đăng nhập thành công nhưng không thấy dữ liệu, kiểm tra
Vite proxy trỏ đúng ứng dụng phía máy chủ cổng và phản hồi E03; không tạo dữ liệu giả thay API.

### Quy trình Xóa Volume Tạm

Khi cần kiểm thử tái lập trạng thái từ một cơ sở dữ liệu hoàn toàn rỗng mà không làm mất dữ liệu của volume đang phát triển (`gdrn-disaster-response_database-data`):
1. **Kiểm tra volume đang dùng:**
   ```powershell
   docker volume ls | Select-String "gdrn"
   ```
2. **Khởi chạy môi trường cô lập tạm thời:**
   Chỉ định cờ `-p` để tạo namespace riêng biệt:
   ```powershell
   docker compose -p gdrn-disposable up -d cơ sở dữ liệu
   ```
   Lệnh này tạo volume riêng `gdrn-disposable_database-data`, hoàn toàn độc lập với volume chính.
3. **Dọn dẹp volume tạm sau khi kiểm thử:**
   ```powershell
   docker compose -p gdrn-disposable down -v
   ```
   Tùy chọn `-v` chỉ xóa volume của namespace `gdrn-disposable`, tuyệt đối bảo vệ an toàn cho volume chính.
4. **Tham khảo thêm sự cố Docker Desktop:**
   Xem chi tiết tại [Hướng dẫn xử lý sự cố Docker Desktop](qa/docker-desktop-troubleshooting.md).

## 10. Kiểm tra đã cài thành công

- Chạy Compose: `database` và `backend` đều `healthy`; hoặc cơ sở dữ liệu `healthy` và
  ứng dụng phía máy chủ cục bộ có thông báo `Started GdrnApplication`.
- Health trả `UP` và Swagger mở được tại cổng đã cấu hình.
- `clean verify` thành công nếu chuẩn bị môi trường để phát triển/test.
- `.env` không được commit lên Git.

Đọc thêm [README](../README.md), [quy tắc phát triển](../CONTRIBUTING.md) và
[tổng quan kiến trúc](architecture/architecture-overview.md) trước khi bổ sung tính năng.
