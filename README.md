# Global Disaster Response Network (GDRN)

## 1. Bài toán và nghiệp vụ

GDRN gom báo cáo sự cố, vị trí và tiến độ cứu hộ vào một hệ thống. Người dân gửi
báo cáo và theo dõi xử lý; điều phối viên xác minh thông tin, chọn đội cứu hộ và
cập nhật nhiệm vụ. Pha 1 hiện có **20 API, 7 màn hình**.

| Người dùng | Chức năng đã có |
| --- | --- |
| CITIZEN - người dân | Gửi mô tả/loại sự cố/tọa độ; xem báo cáo của mình; rút khi PENDING; đính kèm ảnh và xem tiến độ cứu hộ. |
| AUTHORITY - điều phối | Quản lý thảm họa; lọc báo cáo theo trạng thái/bán kính; xác minh hoặc từ chối; phân công đội, cập nhật nhiệm vụ và xem bảng thống kê. |

Luồng chính là: **PENDING → VERIFIED → gắn thảm họa ACTIVE → chọn đội rảnh →
ASSIGNED → IN_PROGRESS → COMPLETED**. Người dân nhìn thấy tiến độ của báo cáo.
Báo cáo có thể bị `REJECTED` kèm lý do; thảm họa đi từ `ACTIVE` sang `RESOLVED`.

Người dân không xem được báo cáo của người dân khác. Một báo cáo chỉ có một nhiệm vụ
trong suốt vòng đời, và một đội chỉ nhận một nhiệm vụ đang hoạt động. Bảng thống kê
dùng UTC+7 khi lọc ngày, còn số đội rảnh/bận được tính theo trạng thái hiện tại.
Mỗi báo cáo nhận tối đa **5 ảnh JPEG/PNG**, mỗi ảnh tối đa **5 MiB**; chỉ chủ báo cáo
đang `PENDING` được thêm hoặc xóa ảnh. Đăng ký tài khoản, token làm mới, cảnh báo,
quản lý tài nguyên và tự động phân đội chưa nằm trong Pha 1.

## 2. Kiến trúc, mã nguồn và yêu cầu kỹ thuật

Pha 1 dùng **modular monolith**: một backend Spring Boot, một SPA và PostgreSQL/PostGIS.
Request đi theo đường: trình duyệt → Nginx/Vite proxy `/api` → backend → database/tệp riêng tư.
Cách này đủ gọn cho giai đoạn hiện tại và giữ giao dịch ở một nơi; chưa có lý do
thực tế để tách thành nhiều dịch vụ.

| Thành phần | Công nghệ hiện dùng |
| --- | --- |
| Backend | Java 21, Spring Boot 3.5.16; Web, Security, Actuator; Maven Wrapper 3.9.9. |
| Dữ liệu | PostgreSQL 16/PostGIS 3.5; Flyway V1-V7; JPA/Hibernate cho Identity/Disaster, JDBC cho Reporting/Rescue và thống kê. |
| Frontend | React 19.3.0, TypeScript 7.0.2, Vite 8.3.4, Router 7.18.4; MapLibre 6.11.2; Node 22.14.0. |
| Đóng gói/kiểm thử | Docker Compose, Nginx 1.27; JUnit/Mockito, ArchUnit, Testcontainers, Vitest, Playwright và k6. |

```text
src/main/java/com/gdrn/
  identity/ disaster/ reporting/ rescue/ dashboard/ shared/
  <module>/api/ application/ domain/ infrastructure/
src/main/resources/       # application.yml, db/migration/V1-V7, openapi/*.json
src/test/                 # kiểm thử miền, điều phối, kiến trúc, tích hợp
frontend/src/             # ứng dụng, xác thực, tính năng nghiệp vụ, phần dùng chung
frontend/e2e/             # kiểm thử trình duyệt
scripts/                  # cài đặt, biên dịch/khởi động/dừng, kiểm thử hồi quy trình duyệt
benchmark/                # k6, dữ liệu/công cụ chạy, notebook đo tải Kaggle CPU
```

Trong mỗi module, domain là Java thuần; controller nhận HTTP, application layer chạy ca sử dụng,
còn hạ tầng nối tới cơ sở dữ liệu hoặc dịch vụ ngoài. Không tạo aggregate hay bảng
riêng cho Dashboard vì đây chỉ là ca sử dụng đọc. `Rescue` dùng hợp đồng của `Reporting`
và `Disaster`; `Dashboard` đọc từ `Reporting` và `Rescue`. Module không truy cập thẳng
hạ tầng của nhau, còn `shared` chỉ chứa phần kỹ thuật dùng chung.

JWT dùng HS256 và hết hạn sau 15 phút; mật khẩu dùng BCrypt, quyền mặc định là từ chối,
và mỗi yêu cầu đều kiểm tra vai trò/ownership. SPA giữ phiên trong `sessionStorage`.
Flyway quản lý schema, Hibernate chỉ kiểm tra. PostGIS dùng `geography(Point,4326)`,
GiST và `ST_DWithin` để lọc bán kính theo mét. Cập nhật có điều kiện và phiên bản ngăn ghi đè;
ràng buộc duy nhất trên báo cáo và đội đang hoạt động ngăn phân công trùng. Kiểm thử miền không cần
Spring, còn kiểm thử adapter chạy với PostGIS thật.
Xem [C4](docs/architecture/architecture-overview.md), [các hợp đồng](docs/architecture/phase1-module-contracts.md), [ADRs](docs/adr/).

## 3. Đặc tả và xem trước API

[**docs/openapi.yaml**](docs/openapi.yaml) là đặc tả OpenAPI **3.0.3** của hệ thống.
Tệp có **20 thao tác/14 đường dẫn**, kèm yêu cầu/phản hồi, ví dụ, mã lỗi,
xác thực Bearer và quyền truy cập.

| Nhóm          | API thực tế                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity (2)  | POST `/api/auth/login`; GET `/api/auth/me`                                                                                                                  |
| Disaster (4)  | GET/POST `/api/disasters`; GET/PATCH `/api/disasters/{id}`                                                                                                  |
| Reporting (5) | POST/GET `/api/reports`; GET/DELETE `/api/reports/{id}`; PATCH `/api/reports/{id}/verification`                                                             |
| Rescue (4)    | GET `/api/rescue-teams`; POST/GET `/api/rescue-missions`; PATCH `/api/rescue-missions/{id}/status`                                                          |
| Dashboard (1) | GET `/api/dashboard`                                                                                                                                        |
| Bằng chứng (4)  | POST/GET `/api/reports/{id}/attachments`; GET `/api/reports/{id}/attachments/{attachmentId}/content`; DELETE `/api/reports/{id}/attachments/{attachmentId}` |

DTO, tham số lọc và lỗi chi tiết nằm trong YAML.

**Xem đặc tả:** mở [Swagger Editor](https://editor.swagger.io/) rồi nhập
`docs/openapi.yaml`. Không cần chạy backend.

**Gọi API cục bộ:** mở [Swagger UI](http://127.0.0.1:8080/swagger-ui/index.html),
đăng nhập lấy token, bấm **Authorize** và dùng **Try it out**. Cổng đọc từ `.env`.
Ứng dụng cũng xuất JSON tại `/v3/api-docs`; tệp YAML là bản đặc tả đã đối chiếu với mã nguồn.

Kiểm tra bằng `python docs/api/validate_openapi.py` sau khi cài các thư viện ghi đầu tệp.
Đăng nhập công khai; API còn lại cần Bearer JWT. JSON lỗi dùng `ApiError` của dự án.
Bản đặc tả đã mô tả lỗi ảnh/413 mà JSON khi chạy còn thiếu; xem [biên bản](docs/PHASE1_REVIEW.md#2-api-thực-tế-và-nguồn-đặc-tả).

## 4. Cài đặt, biên dịch và triển khai

Trên Windows cần Git, PowerShell >=5.1 và Docker Desktop chạy **Linux containers**.
Nếu chạy Maven ngoài container, cài JDK21; giao diện dùng Node **22.14.0**
(`frontend/.nvmrc`). Từ thư mục gốc:

```powershell
.\scripts\local.ps1 -Action setup  # Tạo/bổ sung .env, khóa bí mật và tài khoản trình diễn
.\scripts\dev.ps1 up              # Biên dịch/chạy hệ thống; kiểm tra sức khỏe
```

Mặc định SPA chạy ở [http://127.0.0.1:5173/login](http://127.0.0.1:5173/login),
API/Swagger ở cổng **8080**, PostgreSQL ở **5432**; kiểm tra sức khỏe là
`/actuator/health/readiness`. `.env` chứa cổng, thông tin xác thực cơ sở dữ liệu, `JWT_SECRET_BASE64`
(tối thiểu 32 byte), cấu hình `demo` và ba cặp `DEMO_*_EMAIL/PASSWORD`.
Không đưa tệp này vào Git. Nếu giữ vùng dữ liệu cũ, phải dùng lại thông tin xác thực cũ. Bản đồ
cần các biến `VITE_MAP*`; thiếu chúng vẫn nhập tọa độ thủ công được.

Ảnh Docker của ứng dụng được tạo theo chuỗi Maven → JAR → JRE21, chạy dưới một người dùng riêng. Giao diện chạy
`npm ci`, tạo `dist/`, sau đó Nginx phục vụ SPA và proxy `/api`. Compose chờ DB và
backend sẵn sàng trước khi hoàn tất; Flyway chuyển đổi schema lúc backend khởi động. Muốn chạy
Vite trên máy cục bộ thì dùng `local.ps1 -Action start`. Dừng bằng `dev.ps1 down` hoặc
`local.ps1 -Action stop`; vùng dữ liệu vẫn được giữ lại.

```powershell
.\mvnw.cmd clean verify            # Kiểm thử đơn vị, kiến trúc, tích hợp PostGIS; cần Docker
Push-Location frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
Pop-Location
.\scripts\browser-e2e.ps1           # Sau khi hệ thống trình diễn đã chạy
```

CI có ba tác vụ: `verify`, `frontend` và `browser-e2e`. Dockerfile chỉ đóng gói ứng dụng,
không chạy kiểm thử, nên vẫn phải chạy `clean verify` riêng. Lần rà soát gần nhất ghi nhận
**130 kiểm thử phía máy chủ và 93 kiểm thử giao diện đạt**; trình duyệt có **18 ca đạt, 5 ca bản đồ bỏ qua**. Xem
[biên bản](docs/PHASE1_REVIEW.md) để biết phiên bản mã tương ứng. Đây mới là kiểm tra
cục bộ; khi đưa sang máy khác cần cấu hình bí mật, TLS/proxy ngược, quyền PostGIS và quy trình
backup/restore cho cả DB lẫn ảnh. Xem thêm [hướng dẫn vận hành](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md)
và [rà soát sản phẩm/dữ liệu trình diễn](docs/PRODUCT_REVIEW.md).

## 5. Kết quả kiểm thử CPU trên Kaggle

Bộ kiểm thử k6 đã hoàn tất **48/48 lượt**: 4 kịch bản × 1/10/50/100 người dùng
ảo (VU) × 3 lần lặp. Mỗi lượt gồm 10 giây làm nóng, 30 giây giữ tải và 10 giây
giảm tải; các kịch bản đọc dùng 1.000 báo cáo ban đầu.

### Kết quả đầy đủ trên Kaggle

Tổng cộng **1.675.588 yêu cầu nghiệp vụ, tỷ lệ lỗi 0%**. Kết quả ở mức 100 VU
dưới đây là trung bình của 3 lần lặp; p95 là thời gian hoàn thành của 95% yêu cầu.

| Kịch bản | Yêu cầu/giây | p95 (ms) |
| --- | ---: | ---: |
| Ghi báo cáo (`write`) | 1.732,34 | 126,40 |
| Đọc pagination (`read-page`) | 1.064,69 | 223,38 |
| Đọc theo bán kính (`read-radius`) | 374,24 | 514,22 |
| Hỗn hợp: 20% ghi, 60% đọc trang, 20% đọc bán kính (`mixed`) | 447,03 | 521,66 |

Ứng dụng, PostgreSQL/PostGIS và k6 dùng chung máy Kaggle có 4 CPU logic,
giới hạn RAM 30 GiB. Throughput đọc trang gần như chững ở 50–100 VU, còn latency
đọc bán kính và hỗn hợp tăng; cần đo sâu hơn để xác định điểm nghẽn.
Số liệu chưa đại diện cho năng lực của máy chủ chạy độc lập, và chưa bao gồm
giao diện, tải ảnh, bảng thống kê hay luồng điều phối viên.

Xem [bảng đầy đủ và bằng chứng](docs/benchmark/evidence/kaggle-full-v4/REPORT.md),
[hướng dẫn chạy Kaggle](docs/benchmark/KAGGLE_CPU.md) và
[kết quả cục bộ](docs/benchmark/CPU_LOCAL.md).

## 6. Vấn đề dễ thấy và bàn giao

| Hiện trạng đã thấy | Điều nhóm tiếp nhận cần kiểm chứng/cải tiến |
| --- | --- |
| Compose gốc chỉ gắn vùng dữ liệu cho DB; ảnh nằm trong container ứng dụng. | Siêu dữ liệu có thể còn nhưng mất tệp khi thay container. Có [cấu hình bổ sung để rà soát](docker-compose.review.yml); cần lưu trữ bền vững, quyền ghi và diễn tập backup/restore. |
| Nginx trả 413 với PNG hợp lệ khoảng 3 MiB trong lần rà soát. | Đồng bộ giới hạn proxy với luật 5 MiB/ảnh và multipart 6MB; kiểm thử qua cả SPA → Nginx → backend. |
| Gói mã bản đồ sau biên dịch khoảng 1 MB; kiểm tra từng báo `undici` có rủi ro mức cao. | Đo tải trang, chạy lại kiểm tra và đánh giá chuỗi phụ thuộc trước khi cập nhật; không suy từ cảnh báo thành kết luận khai thác. |
| JWT chưa làm mới/thu hồi; tài khoản tạo sẵn để trình diễn; chưa có bằng chứng về tính sẵn sàng cao hoặc triển khai đám mây. | Làm rõ nhu cầu vận hành, quản trị tài khoản và bảo mật trước khi triển khai ngoài cục bộ. |
| D3 đã đo 16 tổ hợp CPU cục bộ và đủ 48 lượt trên Kaggle, có bảng, manifest và checksum. | Đo chuyên sâu và lặp lại kịch bản để xác định điểm nghẽn trước khi chọn cache, queue hay microservices. |

Nhóm nhận đọc README → [API](docs/openapi.yaml) → [hợp đồng/ADR](docs/architecture/phase1-module-contracts.md)
→ [bằng chứng/hạn chế](docs/PHASE1_REVIEW.md), tự chạy hệ thống và các kiểm tra. Giữ các ràng buộc
nghiệp vụ, ranh giới module và migration đã phát hành. Đổi kiến trúc cần số liệu
trước/sau và ADR; các nhận xét trên là kết quả rà soát bàn giao, không thay
[danh mục triển khai](docs/PHASE1_PLAN.md), [quy tắc phát triển](CONTRIBUTING.md) và
[bối cảnh dài hạn](GDRN_PROJECT_CONTEXT.md).
