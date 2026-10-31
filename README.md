# Global Disaster Response Network (GDRN)

## 1. Bài toán và nghiệp vụ

Thông tin sự cố trao đổi rời rạc khiến người dân khó theo dõi yêu cầu, điều phối viên
khó xác minh vị trí và biết đội nào còn rảnh. GDRN tập hợp báo cáo có tọa độ, quyết
định xác minh và tiến độ cứu hộ trong một hệ thống. Phase 1 có **20 API, 7 màn hình**.

| Người dùng | Chức năng đã có |
| --- | --- |
| CITIZEN - người dân | Gửi mô tả/loại sự cố/tọa độ; xem báo cáo của mình; rút khi PENDING; đính kèm ảnh và xem tiến độ cứu hộ. |
| AUTHORITY - điều phối | Quản lý thảm họa; lọc báo cáo theo trạng thái/bán kính; xác minh hoặc từ chối; phân công đội, cập nhật nhiệm vụ và xem dashboard. |

Luồng chính: **gửi báo cáo PENDING → xác minh VERIFIED và gắn thảm họa ACTIVE →
chọn đội rảnh → nhiệm vụ ASSIGNED → IN_PROGRESS → COMPLETED → người dân theo dõi**.
Báo cáo có thể bị REJECTED kèm lý do; thảm họa chỉ chuyển ACTIVE → RESOLVED.

Quy tắc cần giữ: không đọc chéo báo cáo giữa hai citizen; một báo cáo chỉ có một
nhiệm vụ trong toàn vòng đời; một đội chỉ có một nhiệm vụ đang hoạt động. Dashboard
lọc ngày theo UTC+7, nhưng số đội rảnh/bận luôn phản ánh hiện tại. Ảnh JPEG/PNG tối
đa **5 ảnh/báo cáo, 5 MiB/ảnh**; chỉ chủ báo cáo PENDING được upload/xóa.
Chưa có đăng ký/quản trị tài khoản, refresh token, cảnh báo/tài nguyên hoặc tự động phân đội.

## 2. Kiến trúc, mã nguồn và yêu cầu kỹ thuật

**Modular Monolith**: một Spring Boot backend, một SPA và PostgreSQL/PostGIS.
Luồng triển khai: `Browser → Nginx/Vite proxy /api → backend → database/private files`.
Giữ một ứng dụng để đơn giản hóa triển khai và giao dịch; chưa có bằng chứng cần tách dịch vụ.

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

Theo DDD/Hexagonal, domain là Java thuần; controller xử lý HTTP, application điều
phối use case qua ports, infrastructure hiện thực adapters. Module chỉ tạo lớp khi
cần; Dashboard là use case đọc, không có aggregate/bảng riêng. Phụ thuộc liên module:
`Rescue → Reporting → Disaster`, `Dashboard → Reporting/Rescue`, qua published contracts,
không truy cập infrastructure hoặc join bảng của nhau. `shared` chỉ chứa kỹ thuật chung.

JWT HS256 hết hạn sau 15 phút, BCrypt, default-deny và kiểm tra role/ownership;
SPA giữ phiên trong `sessionStorage`. Flyway quản lý schema, Hibernate chỉ validate.
PostGIS `geography(Point,4326)` + GiST + `ST_DWithin` lọc khoảng cách theo mét.
Conditional updates/version chống ghi đè; UNIQUE report và partial UNIQUE active-team
chống phân công trùng. Domain test không cần Spring, adapter test dùng PostGIS thật.
Xem [C4](docs/architecture/architecture-overview.md), [contracts](docs/architecture/phase1-module-contracts.md), [ADRs](docs/adr/).

## 3. Đặc tả và preview API

[**docs/openapi.yaml**](docs/openapi.yaml) là OpenAPI **3.0.3**, đủ **20 operations/14 paths**,
request/response, ví dụ, mã lỗi, Bearer authentication và quyền.

| Nhóm | API thực tế |
| --- | --- |
| Identity (2) | POST `/api/auth/login`; GET `/api/auth/me` |
| Disaster (4) | GET/POST `/api/disasters`; GET/PATCH `/api/disasters/{id}` |
| Reporting (5) | POST/GET `/api/reports`; GET/DELETE `/api/reports/{id}`; PATCH `/api/reports/{id}/verification` |
| Rescue (4) | GET `/api/rescue-teams`; POST/GET `/api/rescue-missions`; PATCH `/api/rescue-missions/{id}/status` |
| Dashboard (1) | GET `/api/dashboard` |
| Evidence (4) | POST/GET `/api/reports/{id}/attachments`; GET `/api/reports/{id}/attachments/{attachmentId}/content`; DELETE `/api/reports/{id}/attachments/{attachmentId}` |

DTO, query filters và lỗi chi tiết nằm trong YAML.

**Preview không cần backend:** mở [Swagger Editor](https://editor.swagger.io/), import
file `docs/openapi.yaml` hoặc dán toàn bộ YAML vào editor để xem request/response.
**Thử API đang chạy:** mở [Swagger UI](http://127.0.0.1:8080/swagger-ui/index.html),
login lấy token, bấm **Authorize**, nhập JWT rồi dùng **Try it out**. Đổi port theo `.env`.
Runtime xuất JSON tại `/v3/api-docs`; bản YAML là snapshot bàn giao đã đối chiếu code.

Kiểm tra bằng `python docs/api/validate_openapi.py` sau khi cài dependencies ghi đầu file.
Login public; API còn lại cần Bearer JWT. JSON lỗi dùng `ApiError` của dự án.
Snapshot đã mô tả lỗi ảnh/413 mà JSON runtime còn thiếu; xem [biên bản](docs/PHASE1_REVIEW.md#2-api-thực-tế-và-nguồn-đặc-tả).

## 4. Cài đặt, build và triển khai

Cần Git, PowerShell >=5.1 và Docker Desktop **Linux containers**. Chạy Maven trên
host cần JDK21; phát triển SPA cần Node **22.14.0** (`frontend/.nvmrc`). Từ root repo:

```powershell
.\scripts\local.ps1 -Action setup  # Tạo/bổ sung .env, secret và tài khoản demo
.\scripts\dev.ps1 up              # Build/chạy DB, backend, frontend; kiểm tra health
```

Mặc định: [SPA](http://127.0.0.1:5173/login) **5173**, API/Swagger **8080**, PostgreSQL
**5432**; health tại `/actuator/health/readiness`. `.env` quyết định
`FRONTEND_PORT/APP_PORT/DB_PORT`, DB credentials, `JWT_SECRET_BASE64` (>=32 byte),
profile `demo` và ba cặp `DEMO_*_EMAIL/PASSWORD`. Lấy tài khoản từ `.env` riêng,
không commit secret; volume DB cũ phải dùng credentials gốc. Bản đồ cần cấu hình
public `VITE_MAP*` lúc build; thiếu cấu hình vẫn nhập tọa độ thủ công được.

Backend image build Maven → JAR → JRE21 chạy user riêng; frontend build `npm ci`
→ `dist/` → Nginx phục vụ SPA và proxy `/api`. Compose chờ DB/backend healthy;
Flyway tự migrate khi khởi động. Muốn dùng Vite host: thay `dev.ps1 up` bằng
`local.ps1 -Action start`. Dừng bằng `dev.ps1 down` hoặc `local.ps1 -Action stop`, giữ DB volume.

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

CI có 3 jobs: `verify`, `frontend`, `browser-e2e`. Dockerfile package bỏ tests nên
image build không thay thế `clean verify`. Lần rà soát đã ghi nhận **130 backend,
93 frontend tests PASS**, browser **18 PASS/5 map skip**; [biên bản](docs/PHASE1_REVIEW.md)
ghi rõ revision và giới hạn, không coi số cũ là kiểm chứng cho mọi commit.
Đã kiểm chứng Compose local; **chưa xác nhận cloud/production**. Chuyển máy cần
secret riêng, TLS/reverse proxy, quyền PostGIS và backup/restore cả DB lẫn ảnh.
Hướng dẫn chi tiết: [runbook](docs/HUONG_DAN_CAI_DAT_VA_CHAY.md), [review/demo data](docs/PRODUCT_REVIEW.md).

## 5. Kiểm thử tải CPU

Bộ kiểm thử dùng **k6** cho E07 tạo báo cáo và E08 đọc báo cáo: `write`,
`read-page`, `read-radius`, `mixed` (20% ghi, 60% đọc trang, 20% đọc bán kính).
Đây là tải API với tài khoản citizen; chưa đo UI, upload ảnh, dashboard hoặc luồng authority.
DB benchmark riêng được reset giữa các lần chạy. Dữ liệu đọc gồm 1.000 báo cáo,
seed `20261024`, 70% tọa độ trong cụm gần tâm và 30% phân bố rộng.

### Lượt kiểm thử local mới — 30/10/2026

Đã chạy **16/16 tổ hợp**, mỗi tổ hợp **1 lần**: 4 workload × 1/10/50/100 VUs. Ubuntu 24.04 trong Docker Desktop, AMD Ryzen 7 6800H with Radeon Graphics, 16 CPU logic, RAM VM 6.62 GiB; Java 21, PostgreSQL 16.15/PostGIS 3.4.2, k6 1.6.1. Backend/DB/k6 dùng chung VM; backend giới hạn heap 1 GiB. Đây là **local Linux CPU, chưa phải Kaggle**.

Mỗi lượt: **5s warm-up + 15s giữ tải + 5s ramp-down**. Reset DB trước mỗi lượt; write bắt đầu rỗng, các workload còn lại seed 1.000 báo cáo. Bảng gồm toàn bộ cửa sổ chạy, loại request login; lỗi tính cả HTTP status và body check.

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

Với đọc trang, tăng từ 10 lên 100 VUs cho thông lượng tăng **1.50 lần**, trong khi p95 tăng **14.22 lần**. Cần profiling và chạy lặp để xác định nguyên nhân độ trễ, trước khi đề xuất cache hoặc thay đổi kiến trúc.

Tổng **575.066 request nghiệp vụ**, tất cả ngưỡng lỗi <1% đều đạt. Đã kiểm tra checksum và tính lại số request, trung bình, p50/p95/p99 từ raw. CPU host cao nhất trong các mẫu: **84.3%**; RSS backend cao nhất: **656.0 MiB**.

**Giới hạn:** thời gian ngắn và chỉ một lần lặp, có dịch vụ nền trên Docker Desktop; chưa đủ để kết luận năng lực tối đa hoặc xác định bottleneck. Không so trực tiếp với baseline cũ vì khác runtime, topology và cách tổng hợp. Notebook Kaggle mặc định chạy ba lần mỗi tổ hợp để có thêm bằng chứng.

Bằng chứng tổng hợp: [JSON kết quả và cấu hình](docs/benchmark/cpu-local-2026-10-30.json). Raw, seed, logs, resource samples và report nằm tại `benchmark/results/20261030T143435156579Z/` (bị ignore bởi Git); gói bàn giao local là `benchmark/results/cpu-local-2026-10-30.zip`.

### Baseline local đã ghi nhận ngày 24/10/2026

Nguồn: [biên bản D3](docs/handoffs/D3.md). Đây là số đo lịch sử trên Windows/
Docker Desktop, Intel i5-12500H, 16 logical processors, RAM 15,7 GiB; **không phải
kết quả Kaggle hoặc lần chạy lại trên revision hiện tại**. Raw của lần đo này
được lưu ngoài Git, hiện không có trong checkout để kiểm tra lại.

| Workload | Dữ liệu ban đầu | VUs | Request/s | TB (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Lỗi |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| E07 ghi | 0 | 1 | 164,57 | 3,81 | 3,67 | 4,98 | 5,82 | 0% |
| E08 đọc trang — smoke | 100 | 1 | 137,71 | 5,00 | 4,73 | 6,73 | 10,85 | 0% |
| E08 đọc bán kính — smoke | 100 | 1 | 156,06 | 4,31 | 4,10 | 5,85 | 7,78 | 0% |
| E08 đọc trang | 1.000 | 10 | 928,17 | 7,23 | 6,49 | 12,58 | 17,55 | 0% |
| E08 đọc trang | 1.000 | 50 | 1.439,13 | 18,93 | 17,35 | 36,35 | 48,63 | 0% |
| E08 đọc trang | 1.000 | 100 | 1.996,98 | 34,93 | 30,19 | 78,70 | 105,28 | 0% |

**Cách đọc:** VUs là số người dùng ảo đồng thời; request/s là thông lượng;
p95/p99 là thời gian mà 95%/99% request hoàn thành trong ngưỡng đó. Khi tải đọc
tăng từ 10 lên 100 VUs, thông lượng tăng khoảng 2,15 lần nhưng p95 tăng khoảng
6,26 lần. Chưa thể xác định bottleneck chỉ từ bảng này; cần đối chiếu CPU/RAM,
query và chạy lặp. Lần 50 VUs có một iteration bị ngắt lúc ramp-down, dù HTTP
và checks không lỗi. Không suy diễn 0% lỗi thành khả năng chịu tải vô hạn.

### Chạy trên Kaggle CPU

[Notebook Kaggle](benchmark/kaggle_cpu_preflight.ipynb) đã có luồng chạy thật:
cài Java 21/PostGIS/k6, build backend, khởi tạo DB và tài khoản riêng, chạy tải,
thu CPU/RAM rồi xuất báo cáo. Tên file `preflight` được giữ để không gãy liên kết.

1. Chạy `python benchmark/package_cpu_source.py` tại root repo.
2. Upload `benchmark/results/gdrn-cpu-source.zip` thành **private Kaggle Dataset**.
3. Import notebook, thêm Dataset bằng **Add Input**, chọn **Accelerator: None**,
   bật **Internet**, rồi **Run All**.
4. Tải `gdrn-cpu-results.zip` từ Output; xem `REPORT.md`, `results.json` và
   `manifest.json`. Chỉ xác nhận chạy hoàn tất khi manifest ghi `completed`.

Mặc định chạy 4 workload × 4 mức 1/10/50/100 VUs × 3 lần. Mỗi lần gồm 10 giây
warm-up, 30 giây giữ tải, 10 giây ramp-down; dừng khi k6 lỗi/ngưỡng lỗi ≥1%.
Thống kê mới loại request login, nhưng bao gồm cả warm-up/ramp-down.
CPU/RAM được lấy mỗi giây; backend, DB và k6 dùng chung máy nên cần ghi rõ
topology khi so sánh. Lưu raw nén, seed, cấu hình, phiên bản và checksum cùng bảng.

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
và 315/315 artifact SHA-256 khớp. `read-page` bắt đầu plateau ở 50–100 VUs;
`read-radius` và `mixed` tăng latency rõ rệt ở 100 VUs do backend, PostGIS và k6
dùng chung CPU Kaggle. [Báo cáo và manifest đã lưu trong Git](docs/benchmark/evidence/kaggle-full-v4/REPORT.md).

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
