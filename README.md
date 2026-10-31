# Global Disaster Response Network (GDRN)

## 1. Bài toán và nghiệp vụ

GDRN gom báo cáo sự cố, vị trí và tiến độ cứu hộ vào một hệ thống. Người dân gửi
báo cáo và theo dõi xử lý; điều phối viên xác minh thông tin, chọn đội cứu hộ và
cập nhật nhiệm vụ. Phase 1 hiện có **20 API, 7 màn hình**.

| Người dùng | Chức năng đã có |
| --- | --- |
| CITIZEN - người dân | Gửi mô tả/loại sự cố/tọa độ; xem báo cáo của mình; rút khi PENDING; đính kèm ảnh và xem tiến độ cứu hộ. |
| AUTHORITY - điều phối | Quản lý thảm họa; lọc báo cáo theo trạng thái/bán kính; xác minh hoặc từ chối; phân công đội, cập nhật nhiệm vụ và xem dashboard. |

Luồng chính là: **PENDING → VERIFIED → gắn thảm họa ACTIVE → chọn đội rảnh →
ASSIGNED → IN_PROGRESS → COMPLETED**. Người dân nhìn thấy tiến độ của báo cáo.
Báo cáo có thể bị `REJECTED` kèm lý do; thảm họa đi từ `ACTIVE` sang `RESOLVED`.

Citizen không xem được báo cáo của citizen khác. Một báo cáo chỉ có một nhiệm vụ
trong suốt vòng đời, và một đội chỉ nhận một nhiệm vụ đang hoạt động. Dashboard
dùng UTC+7 khi lọc ngày, còn số đội rảnh/bận được tính theo trạng thái hiện tại.
Mỗi báo cáo nhận tối đa **5 ảnh JPEG/PNG**, mỗi ảnh tối đa **5 MiB**; chỉ chủ báo cáo
đang `PENDING` được thêm hoặc xóa ảnh. Đăng ký tài khoản, refresh token, cảnh báo,
quản lý tài nguyên và tự động phân đội chưa nằm trong Phase 1.

## 2. Kiến trúc, mã nguồn và yêu cầu kỹ thuật

Phase 1 dùng **modular monolith**: một backend Spring Boot, một SPA và PostgreSQL/PostGIS.
Request đi theo đường `Browser → Nginx/Vite proxy /api → backend → database/private files`.
Cách này đủ gọn cho giai đoạn hiện tại và giữ transaction ở một nơi; chưa có lý do
thực tế để tách thành nhiều service.

| Thành phần | Framework/công nghệ hiện dùng |
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
src/test/                 # domain, orchestration, architecture, integration
frontend/src/             # app, auth, features theo nghiệp vụ, shared
frontend/e2e/             # kiểm thử trình duyệt
scripts/                  # setup, build/start/stop, browser regression
benchmark/                # k6, dữ liệu/runner, notebook chạy tải Kaggle CPU
```

Trong mỗi module, domain là Java thuần; controller nhận HTTP, application chạy use case,
còn infrastructure nối tới database hoặc dịch vụ ngoài. Không tạo aggregate hay bảng
riêng cho Dashboard vì đây chỉ là use case đọc. `Rescue` dùng contract của `Reporting`
và `Disaster`; `Dashboard` đọc từ `Reporting` và `Rescue`. Module không truy cập thẳng
infrastructure của nhau, còn `shared` chỉ chứa phần kỹ thuật dùng chung.

JWT dùng HS256 và hết hạn sau 15 phút; mật khẩu dùng BCrypt, quyền mặc định là deny,
và mỗi request đều kiểm tra role/ownership. SPA giữ phiên trong `sessionStorage`.
Flyway quản lý schema, Hibernate chỉ validate. PostGIS dùng `geography(Point,4326)`,
GiST và `ST_DWithin` để lọc bán kính theo mét. Conditional update/version ngăn ghi đè;
unique report và partial unique active-team ngăn phân công trùng. Domain test không cần
Spring, còn adapter test chạy với PostGIS thật.
Xem [C4](docs/architecture/architecture-overview.md), [contracts](docs/architecture/phase1-module-contracts.md), [ADRs](docs/adr/).

## 3. Đặc tả và preview API

[**docs/openapi.yaml**](docs/openapi.yaml) là đặc tả OpenAPI **3.0.3** của hệ thống.
File có **20 operations/14 paths**, kèm request/response, ví dụ, mã lỗi, Bearer
authentication và quyền truy cập.

| Nhóm          | API thực tế                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity (2)  | POST `/api/auth/login`; GET `/api/auth/me`                                                                                                                  |
| Disaster (4)  | GET/POST `/api/disasters`; GET/PATCH `/api/disasters/{id}`                                                                                                  |
| Reporting (5) | POST/GET `/api/reports`; GET/DELETE `/api/reports/{id}`; PATCH `/api/reports/{id}/verification`                                                             |
| Rescue (4)    | GET `/api/rescue-teams`; POST/GET `/api/rescue-missions`; PATCH `/api/rescue-missions/{id}/status`                                                          |
| Dashboard (1) | GET `/api/dashboard`                                                                                                                                        |
| Evidence (4)  | POST/GET `/api/reports/{id}/attachments`; GET `/api/reports/{id}/attachments/{attachmentId}/content`; DELETE `/api/reports/{id}/attachments/{attachmentId}` |

DTO, query filters và lỗi chi tiết nằm trong YAML.

**Xem đặc tả:** mở [Swagger Editor](https://editor.swagger.io/) rồi import
`docs/openapi.yaml`. Không cần chạy backend.

**Gọi API local:** mở [Swagger UI](http://127.0.0.1:8080/swagger-ui/index.html),
login lấy token, bấm **Authorize** và dùng **Try it out**. Port đọc từ `.env`.
Runtime cũng xuất JSON tại `/v3/api-docs`; file YAML là bản snapshot đã đối chiếu với code.

Kiểm tra bằng `python docs/api/validate_openapi.py` sau khi cài dependencies ghi đầu file.
Login public; API còn lại cần Bearer JWT. JSON lỗi dùng `ApiError` của dự án.
Snapshot đã mô tả lỗi ảnh/413 mà JSON runtime còn thiếu; xem [biên bản](docs/PHASE1_REVIEW.md#2-api-thực-tế-và-nguồn-đặc-tả).

## 4. Cài đặt, build và triển khai

Trên Windows cần Git, PowerShell >=5.1 và Docker Desktop chạy **Linux containers**.
Nếu chạy Maven ngoài container, cài JDK21; frontend dùng Node **22.14.0**
(`frontend/.nvmrc`). Từ thư mục gốc:

```powershell
.\scripts\local.ps1 -Action setup  # Tạo/bổ sung .env, secret và tài khoản demo
.\scripts\dev.ps1 up              # Build/chạy DB, backend, frontend; kiểm tra health
```

Mặc định SPA chạy ở [http://127.0.0.1:5173/login](http://127.0.0.1:5173/login),
API/Swagger ở port **8080**, PostgreSQL ở **5432**; health check là
`/actuator/health/readiness`. `.env` chứa port, DB credentials, `JWT_SECRET_BASE64`
(tối thiểu 32 byte), profile `demo` và ba cặp `DEMO_*_EMAIL/PASSWORD`.
Không commit file này. Nếu giữ volume DB cũ, phải dùng lại credentials cũ. Bản đồ
cần các biến `VITE_MAP*`; thiếu chúng vẫn nhập tọa độ thủ công được.

Backend image chạy theo chuỗi Maven → JAR → JRE21 dưới một user riêng. Frontend chạy
`npm ci`, tạo `dist/`, sau đó Nginx phục vụ SPA và proxy `/api`. Compose chờ DB và
backend healthy trước khi hoàn tất; Flyway migrate lúc backend khởi động. Muốn chạy
Vite trên host thì dùng `local.ps1 -Action start`. Dừng bằng `dev.ps1 down` hoặc
`local.ps1 -Action stop`; DB volume vẫn được giữ lại.

```powershell
.\mvnw.cmd clean verify            # Unit + architecture + PostGIS integration; cần Docker
Push-Location frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
Pop-Location
.\scripts\browser-e2e.ps1           # Sau khi stack demo đã chạy
```

CI có ba job: `verify`, `frontend` và `browser-e2e`. Dockerfile chỉ đóng gói ứng dụng,
không chạy test, nên vẫn phải chạy `clean verify` riêng. Lần review gần nhất ghi nhận
**130 backend, 93 frontend tests PASS** và browser **18 PASS/5 map skip**; xem
[biên bản](docs/PHASE1_REVIEW.md) để biết revision tương ứng. Đây mới là kiểm tra
local; khi đưa sang máy khác cần secret, TLS/reverse proxy, quyền PostGIS và quy trình
backup/restore cho cả DB lẫn ảnh. Xem thêm [runbook](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md)
và [review/demo data](docs/PRODUCT_REVIEW.md).

## 5. Kiểm thử tải CPU

Bộ tải k6 bao gồm E07 tạo báo cáo và E08 đọc báo cáo qua bốn workload: `write`,
`read-page`, `read-radius`, `mixed` (20% ghi, 60% đọc trang, 20% đọc bán kính).
Benchmark dùng tài khoản citizen, reset DB riêng trước mỗi lượt và seed 1.000 báo cáo
cho các workload đọc. UI, upload ảnh, dashboard và luồng authority chưa nằm trong bộ tải.
Seed cố định là `20261024`; 70% tọa độ nằm gần tâm, 30% phân bố rộng.

### Lượt kiểm thử local mới — 30/10/2026

Đã chạy **16/16 tổ hợp**, mỗi tổ hợp **1 lần**: 4 workload × 1/10/50/100 VUs.
Môi trường là Ubuntu 24.04 trong Docker Desktop, AMD Ryzen 7 6800H, 16 CPU logic,
RAM VM 6.62 GiB; Java 21, PostgreSQL 16.15/PostGIS 3.4.2, k6 1.6.1. Backend,
DB và k6 dùng chung VM; backend giới hạn heap 1 GiB.

Mỗi lượt gồm **5s warm-up + 15s giữ tải + 5s ramp-down**. DB được reset trước
mỗi lượt; `write` bắt đầu từ rỗng, các workload còn lại seed 1.000 báo cáo. Bảng
tính cả cửa sổ chạy nhưng bỏ request login; lỗi gồm cả HTTP status và body check.

| Workload | VUs | Request/s | TB (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Lỗi |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| write | 1 | 131.85 | 5.57 | 4.12 | 8.54 | 13.35 | 0.00% |
| read-page | 1 | 133.58 | 5.39 | 5.14 | 7.48 | 9.49 | 0.00% |
| read-radius | 1 | 96.97 | 7.64 | 7.26 | 10.28 | 12.70 | 0.00% |
| mixed | 1 | 158.61 | 4.53 | 3.52 | 9.51 | 12.38 | 0.00% |
| write | 10 | 2156.13 | 3.40 | 3.19 | 4.76 | 6.69 | 0.00% |
| read-page | 10 | 1830.62 | 3.81 | 3.67 | 5.42 | 7.22 | 0.00% |
| read-radius | 10 | 838.19 | 8.93 | 8.60 | 12.35 | 16.15 | 0.00% |
| mixed | 10 | 839.14 | 8.89 | 5.02 | 29.99 | 39.58 | 0.00% |
| write | 50 | 3317.85 | 11.69 | 11.53 | 25.37 | 37.70 | 0.00% |
| read-page | 50 | 2637.27 | 14.31 | 12.70 | 33.98 | 47.30 | 0.00% |
| read-radius | 50 | 1133.20 | 34.54 | 38.31 | 71.32 | 93.93 | 0.00% |
| mixed | 50 | 1103.01 | 35.50 | 33.74 | 83.17 | 116.48 | 0.00% |
| write | 100 | 3483.39 | 22.57 | 23.29 | 51.71 | 75.64 | 0.00% |
| read-page | 100 | 2748.57 | 28.22 | 23.51 | 77.08 | 112.54 | 0.00% |
| read-radius | 100 | 1116.21 | 70.76 | 79.50 | 160.76 | 225.85 | 0.00% |
| mixed | 100 | 1172.43 | 67.47 | 68.43 | 159.46 | 217.92 | 0.00% |

Ở workload đọc trang, tăng từ 10 lên 100 VUs làm throughput tăng **1.50 lần**,
nhưng p95 tăng **14.22 lần**. Cần profiling và chạy lặp trước khi quyết định dùng
cache hoặc thay đổi kiến trúc.

Tổng cộng có **575.066 request nghiệp vụ**, tất cả ngưỡng lỗi dưới 1% đều đạt.
Checksum đã được kiểm tra và các số request, trung bình, p50/p95/p99 được tính lại
từ raw. CPU host cao nhất trong mẫu là **84.3%**, RSS backend cao nhất **656.0 MiB**.

Thời lượng local ngắn và chỉ có một repetition, ngoài ra Docker Desktop còn có các
dịch vụ nền. Vì vậy bảng này chỉ dùng làm baseline, không dùng để kết luận capacity
hay bottleneck. Kaggle chạy ba repetitions cho mỗi tổ hợp để có bộ số liệu ổn định hơn.

Bằng chứng tổng hợp: [JSON kết quả và cấu hình](docs/benchmark/cpu-local-2026-10-30.json). 

### Baseline local đã ghi nhận ngày 24/10/2026

Nguồn: [biên bản D3](docs/handoffs/D3.md). Đây là số đo lịch sử trên Windows/
Docker Desktop, Intel i5-12500H, 16 logical processors, RAM 15,7 GiB;

| Workload | Dữ liệu ban đầu | VUs | Request/s | TB (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Lỗi |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| E07 ghi | 0 | 1 | 164,57 | 3,81 | 3,67 | 4,98 | 5,82 | 0% |
| E08 đọc trang — smoke | 100 | 1 | 137,71 | 5,00 | 4,73 | 6,73 | 10,85 | 0% |
| E08 đọc bán kính — smoke | 100 | 1 | 156,06 | 4,31 | 4,10 | 5,85 | 7,78 | 0% |
| E08 đọc trang | 1.000 | 10 | 928,17 | 7,23 | 6,49 | 12,58 | 17,55 | 0% |
| E08 đọc trang | 1.000 | 50 | 1.439,13 | 18,93 | 17,35 | 36,35 | 48,63 | 0% |
| E08 đọc trang | 1.000 | 100 | 1.996,98 | 34,93 | 30,19 | 78,70 | 105,28 | 0% |

**Ghi chú:** VUs là số người dùng ảo chạy đồng thời; request/s là throughput;
p95/p99 là thời gian hoàn thành của 95%/99% request. Ở workload đọc trang,
tăng từ 10 lên 100 VUs làm throughput tăng khoảng 2,15 lần, còn p95 tăng khoảng
6,26 lần. Bảng này chưa đủ để chỉ ra bottleneck; cần xem thêm CPU/RAM, query và
chạy lặp. Một iteration ở 50 VUs dừng trong ramp-down dù HTTP và checks vẫn đạt.

### Chạy full trên Kaggle CPU

Runner tự động nằm trong [benchmark/kaggle_api.py](benchmark/kaggle_api.py),
notebook là [kaggle_server_cpu.ipynb](benchmark/kaggle_server_cpu.ipynb). Job chạy
Java 21, PostgreSQL/PostGIS và k6 trên cùng CPU Kaggle, tạo database và tài khoản
tạm cho từng phiên rồi lưu manifest, seed, raw k6 và resource samples.

Để cài và đăng nhập Kaggle, xem [hướng dẫn benchmark](docs/benchmark/KAGGLE_CPU.md).
Profile `full` chạy 4 workload ở 1/10/50/100 VUs, mỗi tổ hợp 3 lần. Mỗi lần gồm
10 giây warm-up, 30 giây steady và 10 giây ramp-down. Runner dừng ngay khi k6
vượt ngưỡng lỗi 1% hoặc thiếu business request. Backend, DB và k6 dùng chung CPU,
nên số liệu chỉ có ý nghĩa khi ghi kèm topology và giới hạn máy.

### Kết quả full trên Kaggle — 30–31/10/2026

[Kaggle job version 4](https://www.kaggle.com/code/thphap/gdrn-d3-server-cpu) đã
chạy đủ **48/48 lượt**: 4 workload × 1/10/50/100 VUs × 3 repetitions. Bảng dưới
là trung bình của 3 repetitions trong mỗi ô; throughput là request nghiệp vụ/giây,
p95 là độ trễ endpoint.

| Workload | 1 VU | 10 VU | 50 VU | 100 VU |
| --- | ---: | ---: | ---: | ---: |
| write | 211.58 req/s · 4.66 ms | 1,388.13 · 7.90 ms | 1,666.58 · 59.49 ms | 1,732.34 · 126.40 ms |
| read-page | 265.97 req/s · 3.76 ms | 993.64 · 13.08 ms | 1,103.59 · 95.44 ms | 1,064.69 · 223.38 ms |
| read-radius | 124.29 req/s · 6.63 ms | 353.07 · 34.84 ms | 372.29 · 245.73 ms | 374.24 · 514.22 ms |
| mixed | 177.20 req/s · 10.88 ms | 427.61 · 69.65 ms | 446.36 · 252.47 ms | 447.03 · 521.66 ms |

Tổng cộng có **1.675.588 request**, error rate nghiệp vụ **0%**, cleanup hoàn tất
và 315/315 checksum SHA-256 khớp. `read-page` gần như chững throughput ở 50–100 VUs;
`read-radius` và `mixed` chậm rõ rệt ở 100 VUs vì backend, PostGIS và k6 dùng chung
CPU Kaggle. [Báo cáo và manifest](docs/benchmark/evidence/kaggle-full-v4/REPORT.md).

Chi tiết cấu hình và artifacts: [benchmark/README.md](benchmark/README.md).

## 6. Vấn đề dễ thấy và bàn giao

| Hiện trạng đã thấy | Điều nhóm tiếp nhận cần kiểm chứng/cải tiến |
| --- | --- |
| Compose gốc chỉ mount DB; ảnh nằm trong backend container. | Metadata có thể còn nhưng mất file khi thay container. Có [override review](docker-compose.review.yml); cần cấu hình storage bền, quyền ghi và diễn tập backup/restore. |
| Nginx trả 413 với PNG hợp lệ khoảng 3 MiB trong lần review. | Đồng bộ giới hạn proxy với luật 5 MiB/ảnh và multipart 6MB; kiểm thử qua cả SPA → Nginx → backend. |
| Build có map chunk khoảng 1 MB; audit từng báo `undici` high. | Đo tải trang, chạy lại audit và đánh giá dependency path trước khi cập nhật; không suy từ cảnh báo thành kết luận khai thác. |
| JWT chưa refresh/revoke; tài khoản bootstrap demo; chưa có bằng chứng HA/cloud. | Làm rõ nhu cầu vận hành, quản trị tài khoản và bảo mật trước khi triển khai ngoài local. |
| D3 đã đo 16 tổ hợp CPU local và full 48 lượt trên Kaggle, có bảng/manifest/checksum. | Dùng profiling và workload lặp lại để xác định bottleneck trước khi chọn cache, queue hay microservices. |

Nhóm nhận đọc README → [API](docs/openapi.yaml) → [contracts/ADRs](docs/architecture/phase1-module-contracts.md)
→ [evidence/hạn chế](docs/PHASE1_REVIEW.md), tự chạy stack và checks. Giữ các ràng buộc
nghiệp vụ, module boundaries và migration đã phát hành. Đổi kiến trúc cần số liệu
before/after và ADR; các nhận xét trên là findings bàn giao, không thay
[catalog triển khai](docs/PHASE1_PLAN.md), [quy tắc phát triển](CONTRIBUTING.md) và
[bối cảnh dài hạn](GDRN_PROJECT_CONTEXT.md).
