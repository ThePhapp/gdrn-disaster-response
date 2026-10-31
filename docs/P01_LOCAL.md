# Chạy xác thực và giao diện cục bộ (nền P01)

Đây là hướng dẫn vận hành đang được cập nhật cho khi chạy hiện tại, không phải báo cáo trạng thái
lịch sử P01. Trạng thái task/merge xem [tiến độ](phase1-progress.md); bằng chứng riêng
P01 xem [bàn giao](handoffs/P01.md). Hướng dẫn cài chung ở [hướng dẫn vận hành](HUONG_DAN_CAI_DAT_VA_CHAY.md).

## Chạy cục bộ lâu dài trên Windows

Từ gốc kho mã, dùng tập lệnh chung (Docker Desktop đang chạy, Node 22.14.0):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local.ps1 -Action setup
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local.ps1 -Action start
```

`setup` chỉ bổ sung giá trị còn thiếu/placeholder trong `.env`, sinh JWT key và mật
khẩu cục bộ ngẫu nhiên; giữ nguyên cấu hình đã có. Email/mật khẩu ở các biến
`DEMO_*_EMAIL`/`DEMO_*_PASSWORD` trong `.env` (Git được Git bỏ qua). Không cần tự tạo cơ sở dữ liệu
hay tài khoản bằng SQL. `demo` ở đây chỉ là cấu hình bootstrap tài khoản thử bằng
thông tin xác thực từ env; dữ liệu lưu thật, không phải cơ sở dữ liệu tạm hoặc giả lập.

`start` build/chạy ứng dụng phía máy chủ Java21 và PostgreSQL16/PostGIS3.5 bằng Compose, dùng named
volume `database-data` của project; chạy Vite dev cục bộ và proxy tới `APP_PORT`.
Sau khi máy khởi động lại, chạy `start` để mở lại. Chạy lại không đặt lại mật khẩu/role
đã lưu. Không đổi Compose project name nếu muốn tiếp tục dùng volume hiện tại.

- Giao diện dev: `http://127.0.0.1:5173/login` (máy chủ Vite; môi trường triển khai dùng `FRONTEND_PORT`).
- Backend/Swagger: máy chủ cổng `APP_PORT` trong `.env` (máy này: 18080).
- Database: `127.0.0.1:DB_PORT` (máy này: 55432), DB/user/password theo `.env`.
- Giao diện nhật ký: `.tools/local/frontend.log`, `.tools/local/frontend-error.log`.
- Ứng dụng phía máy chủ nhật ký: `docker compose logs --tail=100 backend` (không in env/credentials).

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local.ps1 -Action status
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local.ps1 -Action stop
```

`stop` dừng giao diện do tập lệnh quản lý và hai service Compose, **giữ volume/database**.
Không dùng `down -v`. Đây là cục bộ development: giao diện Vite chạy trên máy chủ; giao diện
môi trường triển khai container chạy bằng `scripts/dev.ps1 up`. Những cách chạy thủ công dưới đây
vẫn dùng được.

Môi trường chạy hiện có E01–E15 và S01–S06. Không register/refresh/logout API.
Yêu cầu: Docker đang chạy, Node **22.14.0**, npm đi kèm Node; Java 21 chỉ cần cho
ứng dụng phía máy chủ host/Maven kiểm thử, không cần khi chạy ứng dụng phía máy chủ bằng Compose. CI dùng cùng
Node từ `frontend/.nvmrc`. [Hướng dẫn DB/Docker](HUONG_DAN_CAI_DAT_VA_CHAY.md) vẫn áp dụng.

## Environment và tài khoản

Chỉ copy `.env.example` sang `.env` nếu chưa có tệp; không ghi đè tệp cá nhân.
Điền các biến DB như trước. JWT bắt buộc cho mọi cấu hình chạy app, không có key mặc
định. Sinh key riêng bằng PowerShell rồi lưu vào `.env` cục bộ (không commit/log):

```powershell
$jwtBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($jwtBytes)
$jwtKey = [Convert]::ToBase64String($jwtBytes)
# Dùng giá trị $jwtKey cho JWT_SECRET_BASE64 trong .env, không gửi nó vào chat/log.
```

| Biến | Bắt buộc / ý nghĩa |
| --- | --- |
| JWT_SECRET_BASE64 | Base64 hợp lệ của ít nhất 32 random byte; thiếu/yếu =>startup fail |
| SPRING_PROFILES_ACTIVE | `demo` cho Compose có tạo dữ liệu mẫu; máy chủ có thể `local,demo`; bỏ trình diễn để không tạo dữ liệu mẫu |
| DEMO_CITIZEN_ONE_EMAIL / DEMO_CITIZEN_ONE_PASSWORD | Người dân thứ nhất |
| DEMO_CITIZEN_TWO_EMAIL / DEMO_CITIZEN_TWO_PASSWORD | Người dân thứ hai |
| DEMO_AUTHORITY_EMAIL / DEMO_AUTHORITY_PASSWORD | Điều phối viên |

Sáu biến DEMO bắt buộc khi bật cấu hình trình diễn; ba email sau normalize phải khác nhau.
Email 3–254, mật khẩu không rỗng, tối đa 128 mã nguồn points và **72 UTF-8 byte** (BCrypt).
Thiếu/invalid trình diễn cấu hình =>startup fail rõ tên biến/loại lỗi, không in giá trị.
Bootstrap chạy giao dịch và dùng first-writer-wins theo email: chạy lại không đặt lại
password/role/UUID, kể cả thay env. Không dùng cách sửa env để đổi mật khẩu người dùng đã có.
Không có account/secret trong bản chuyển đổi lược đồ hay khi chạy cấu hình không trình diễn.

## Ứng dụng phía máy chủ cục bộ + giao diện dev

Trong gốc PowerShell, nạp `.env` do chính bạn kiểm soát:

```powershell
Get-Content .env | ForEach-Object {
    if ($_ -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}
docker compose up -d --wait database
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local,demo"
```

Nếu chỉ muốn ứng dụng phía máy chủ không tạo dữ liệu mẫu, dùng profiles `local`; vẫn phải có JWT key.
Maven/Flyway áp dụng migrations theo ledger V1–V6, không xóa volume.
Dừng Compose ứng dụng phía máy chủ trước nếu tranh cổng. Host JDBC URL `DB_URL` phải chứa đúng
máy chủ cổng `DB_PORT`; Spring không tự ghép DB_PORT vào URL. Ứng dụng phía máy chủ máy chủ dùng
`SERVER_PORT`, mặc định8080; `APP_PORT` chỉ là cổng publish ứng dụng phía máy chủ của Compose.

Terminal thứ hai:

```powershell
cd frontend
node --version
npm ci
$env:API_PROXY_TARGET = 'http://127.0.0.1:8080'
npm run dev
```

Mở `http://127.0.0.1:5173/login`, nhập một trong ba tài khoản đã cấu hình. Vite proxy
`/api` tới ứng dụng phía máy chủ; sửa API_PROXY_TARGET nếu ứng dụng phía máy chủ đổi cổng. Đây là env chỉ dùng
trong Vite máy chủ, không `VITE_*`, không bake hostname backend/container vào gói.
Giao diện chỉ gọi relative `/api/...`, không gửi cookie, token chỉ nằm trong
`sessionStorage` của tab hiện tại. Token TTL 900 giây; reload cùng tab giữ phiên, tab
mới phải đăng nhập lại. Logout clear user/token/cache,
không revoke token cũ. Phiên xác nhận từ `/me`, không tin riêng phản hồi đăng nhập.

Hiện sau đăng nhập S01 hiển thị tài khoản thật và nút đăng xuất; chưa có báo cáo pages.
Điều phối viên mở S05 bằng liên kết Thảm họa trên nav; Người dân không có liên kết này.
Khi B3/C2 export định tuyến thật, auto redirect theo vai trò và điều hướng tự đăng ký.
Không tạo placeholder cho các màn hình còn thiếu. Router tự từ chối vai trò sai; ứng dụng phía máy chủ vẫn là security gate.

Swagger: `http://localhost:8080/swagger-ui/index.html` (đổi cổng theo cấu hình), công bố E01–E15;
sức khỏe: `/actuator/health`. Các API tương lai vẫn từ chối. Không bật DEBUG/TRACE cho
yêu cầu thân yêu cầu, JWT hoặc Hibernate binds; app đặt mức INFO cho web/security, OFF binds.

## Ứng dụng phía máy chủ Docker + giao diện dev

Trong `.env` đặt `SPRING_PROFILES_ACTIVE=demo` và đủ key/demo thông tin xác thực, rồi:

```powershell
docker compose up --build -d --wait
```

Chạy Vite như trên, proxy tới máy chủ `APP_PORT`. Không cần đổi sang hostname `backend`
trong trình duyệt. Không chạy `down -v` để đặt lại tài khoản/database cá nhân.

## Giao diện môi trường triển khai qua Compose

Để kiểm tra đúng container multi-stage và proxy cùng mạng Docker:

```powershell
.\scripts\dev.ps1 init
.\scripts\dev.ps1 up
.\scripts\dev.ps1 smoke
```

Giao diện mở tại `http://127.0.0.1:<FRONTEND_PORT>/login`. `/login` và các deep định tuyến
được Nginx trả về `index.html`; `/api/*` được proxy tới service `backend:8080` và
phản hồi lỗi vẫn là JSON từ ứng dụng phía máy chủ. `FRONTEND_PORT` chỉ là máy chủ cổng; trong mạng
Compose giao diện gọi ứng dụng phía máy chủ bằng service name, còn trình duyệt chỉ gọi `/api`.

## Checks

```powershell
.\mvnw.cmd clean verify
cd frontend
npm ci
npm run typecheck
npm test
npm run build
```

Ứng dụng phía máy chủ kiểm thử dùng Testcontainers và key/password sinh tạm, không cần `.env`, không
bỏ kiểm thử tích hợp khi thiếu Docker. Trình duyệt kiểm tra nhanh thật (không mock/intercept API):

```powershell
# Backend + Vite đang chạy; nạp lại sáu biến DEMO của cùng backend vào terminal này.
cd frontend
npx playwright install chromium
$env:E2E_BASE_URL = 'http://127.0.0.1:5173'
npm run test:login
```

Tên tập lệnh `test:login` được giữ tương thích nhưng chạy toàn bộ `frontend/e2e/`:
đăng nhập ba tài khoản, S05 create/edit/resolve và UI01 keyboard/responsive/role bảo vệ.
S05 kiểm thử tạo một thảm họa kiểm thử thật đã RESOLVED trong DB đang dùng; không chạy
trên dữ liệu môi trường triển khai. Trace tắt để không lưu credentials/token. Đầy đủ luồng E2E
vẫn thuộc X2; CI chưa tự chạy trình duyệt suite. `test-results/` được Git bỏ qua.

Chạy `npm ci` khi Vite đã dừng để tránh Windows khóa cài trực tiếp phụ thuộc. Script cục bộ
quản lý Vite thì dùng `-Action stop` trước, không tắt tiến trình khác bằng tên chung.
Trên Windows PowerShell, ưu tiên chạy tập lệnh trực tiếp; redirect `*>` có thể biến
cài trực tiếp stderr progress/warning thành lỗi PowerShell. Nếu nhật ký báo BUILD SUCCESS nhưng
tiến trình exit khác0, chạy lại trực tiếp và đối chiếu báo cáo, không bỏ qua mã thoát.
