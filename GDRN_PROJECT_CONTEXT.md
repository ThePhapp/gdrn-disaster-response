# GDRN — Bối cảnh dự án và đặc tả kỹ thuật

> **Cách đọc hiện tại:** Đây là context dài hạn/backlog, không phải
> phần triển khai plan hay bản mô tả khi chạy. Dùng [danh mục duy nhất](docs/PHASE1_PLAN.md)
> cho scope/dependency, [tiến độ](docs/phase1-progress.md) cho merge/evidence,
> [kiến trúc hiện tại](docs/architecture/architecture-overview.md) và các hợp đồng P00
> cho kỹ thuật. P00/P01/B1/C1/UI01-A đã tích hợp trên main `78f164b`: E01–E09,
> S01/S05, V1–V4 và dùng chung Crisis Command UI. Phần API/schema/events/phân công/rubric
> bên dưới là lịch sử hoặc mục tiêu dài hạn khi chưa được danh mục MVP chọn triển khai.
> “Event mặc định internal/in-process” trong context cũ không cho phép thêm event bus
> vào MVP; ADR004 là đề xuất tương lai. Không triển khai lại nhiệm vụ đã hoàn tất.

> **Tích hợp B1/C1:** E01–E09 và S01/S05 đã có, Flyway V1–V4.
> Reporting ownership/PostGIS dùng policy môi trường triển khai; radius/verify/withdraw thuộc B2,
> S02/S03 thuộc B3, Rescue vẫn chưa triển khai. Chỉ giao công việc theo
> [kế hoạch duy nhất](docs/PHASE1_PLAN.md); xem
> [kết quả tích hợp](docs/handoffs/B1-C1-integration.md) cho kiểm chứng hiện tại.

> **P01 update:** E01/E02/S01 đã triển khai trên nhánh P01: JWT thật,
> user/credential persistence, trình diễn cấu hình và SPA đăng nhập. Các đoạn P00 bên dưới là
> trạng thái lịch sử tại P00; phần dài hạn vẫn danh sách để sau. Xem
> [bàn giao P01](docs/handoffs/P01.md), [cục bộ setup](docs/P01_LOCAL.md).

> **Phạm vi note P00:** Phần bên dưới giữ nguyên bối cảnh dài hạn/backlog,
> không phải danh sách đã implemented. Phạm vi thực thi hiện tại theo
> [kế hoạch MVP 4 người / 3 tuần](docs/PHASE1_PLAN.md),
> [15 API + 6 UI/OpenAPI](docs/api/phase1-contract.md),
> [công khai các hợp đồng và bản chuyển đổi lược đồ ledger](docs/architecture/phase1-module-contracts.md),
> [ADR 005](docs/adr/005-phase1-mvp-auth-frontend.md) và
> [tiến độ](docs/phase1-progress.md). Kế hoạch này thay thế đề xuất phân công, lịch một
> tháng, API/lifecycle và phạm vi mở rộng bên dưới cho MVP. Chỉ Identity, Disaster,
> Reporting, Rescue và SPA cơ bản; Địa lý bán kính nằm trong Reporting bộ chuyển đổi.
> Register, Resource/Alert, RescueRequest riêng, risk/priority, bản đồ, events và các API
> ngoài E01–E15 là danh sách để sau. Không coi danh sách để sau sản phẩm mặc định là Pha 2 kiến trúc.
> JWT bộ nhớ-only, no làm mới, chỉ CITIZEN/AUTHORITY, reload cần đăng nhập lại là thiết kế
> dự kiến. RESPONDER/ADMIN vẫn giữ trong miền nghiệp vụ enum/tests, chưa dùng ở MVP.
> Hiện có bootstrap + User/EmailAddress/Role/tests, chưa API nghiệp vụ/auth/frontend.
> ADR 004 thực tế là đề xuất internal events; ADR 005 mới là MVP/auth/frontend.
> Các số ADR/API mẫu bên dưới mang tính lịch sử, không cấp lại số đã dùng.

> **Project:** Global Disaster Response Network (GDRN)
> **Tên tiếng Việt:** Hệ thống Điều phối và Ứng phó Thảm họa Toàn cầu
> **Course:** Kiến trúc phần mềm
> **Team size:** 4 thành viên
> **Development window:** theo kế hoạch MVP duy nhất (3 tuần dự kiến)
> **Purpose of this tệp:** Lưu đặc tả và định hướng phát triển dài hạn; phạm vi và khi chạy hiện tại theo các nguồn ở ghi chú đầu tệp.

---

## 0. Nguyên tắc kỹ thuật

Khi làm việc trong kho mã này, phải tuân thủ các nguyên tắc sau:

1. **Không phá vỡ ranh giới mô-đun.** Không truy cập trực tiếp persistence/JPA entity/repository phần triển khai của mô-đun khác.
2. **Miền nghiệp vụ tầng phải framework-independent.** Không import Spring Web, Spring Data, Hibernate/JPA hoặc cơ sở dữ liệu library vào miền nghiệp vụ.
3. **Không biến project thành CRUD thuần túy.** Business quy tắc phải nằm trong miền/ứng dụng phù hợp.
4. **Pha 1 là Nguyên khối theo mô-đun.** Không tự ý tách microservice.
5. **Pha 1 không dùng RabbitMQ/Kafka/Redis làm phụ thuộc bắt buộc**, trừ khi yêu cầu được cập nhật rõ ràng. Event trong Pha 1 mặc định là internal/in-process miền nghiệp vụ event.
6. Controller chỉ chịu trách nhiệm HTTP concerns: parse/validate yêu cầu, gọi ca sử dụng, bản đồ phản hồi.
7. Tầng ứng dụng tầng điều phối các ca sử dụng; không chứa chi tiết HTTP hay persistence thư viện nền tảng.
8. Hạ tầng implements ports/interfaces được định nghĩa ở phía trong.
9. Ưu tiên phụ thuộc inversion: outer tầng phụ thuộc vào inner abstractions, không ngược lại.
10. Mọi thay đổi quan trọng về kiến trúc phải giữ compatibility với mục tiêu đo hiệu năng Pha 1 → Pha 2.
11. Không thêm công nghệ chỉ vì “production-like”. Mọi phụ thuộc mới cần có lý do.
12. Khi yêu cầu chưa rõ, ưu tiên phần triển khai nhỏ nhất phù hợp kiến trúc hiện tại thay vì tự mở rộng phạm vi.
13. Code mới phải có kiểm thử phù hợp với mức độ rủi ro của thay đổi.
14. Không hard-mã nguồn bí mật, JWT bí mật, password, cơ sở dữ liệu thông tin xác thực hoặc environment-specific configuration.
15. API errors phải dùng format thống nhất của project.
16. Database lược đồ changes phải qua bản chuyển đổi lược đồ, không dựa vào auto lược đồ mutation trong môi trường chính.

---

# 1. Tổng quan dự án

GDRN mô phỏng một nền tảng ứng dụng phía máy chủ quy mô lớn phục vụ điều phối ứng phó thảm họa.

Hệ thống hỗ trợ các nhóm nghiệp vụ chính:

- Quản lý thảm họa.
- Tiếp nhận báo cáo sự cố từ người dân/nguồn dữ liệu mô phỏng.
- Quản lý yêu cầu cứu hộ.
- Điều phối đội cứu hộ và nhiệm vụ cứu hộ.
- Quản lý và phân bổ tài nguyên khẩn cấp.
- Xác định khu vực ảnh hưởng bằng dữ liệu địa lý.
- Phát hành cảnh báo khẩn cấp.
- Quản lý danh tính, đăng nhập và phân quyền.

Các loại thảm họa ban đầu:

- EARTHQUAKE
- FLOOD
- TYPHOON
- WILDFIRE
- TSUNAMI

Project là mô phỏng phục vụ môn Kiến trúc phần mềm, không phải hệ thống cứu hộ thực tế.

---

# 2. Chiến lược kiến trúc hai giai đoạn

## Pha 1 — Nền tảng cơ sở

Pha 1 sử dụng:

- Java
- Spring Boot
- Nguyên khối theo mô-đun
- Miền nghiệp vụ-Driven Design concepts
- Clean / Hexagonal Kiến trúc
- REST + JSON
- Spring Security + JWT
- PostgreSQL
- PostGIS
- Spring Data JPA / Hibernate ở hạ tầng tầng
- Flyway
- OpenAPI / Swagger
- Docker / Docker Compose
- JUnit / Mockito / Testcontainers
- k6 cho load testing

Mục tiêu Pha 1:

1. Có hệ thống chức năng hoàn chỉnh ở mức cơ bản.
2. Có kiến trúc boundaries rõ ràng.
3. Có số đo cơ sở performance cố định.
4. Có thể xác định điểm nghẽn bằng đo hiệu năng.
5. Tạo cơ sở khoa học cho quyết định cải tiến Pha 2.

## Pha 2 — Các cải tiến dự kiến

Pha 2 chưa được mặc định là phần triển khai bắt buộc. Chỉ áp dụng sau khi đánh giá Pha 1.

Công nghệ/mẫu thiết kế dự kiến:

- Event-Driven Kiến trúc
- RabbitMQ
- Async workers
- Redis caching
- Retry
- Dead Letter Queue
- Idempotent consumers
- Prometheus
- Grafana
- Selective service/worker extraction

Không mặc định chuyển toàn bộ hệ thống sang vi dịch vụ.

---

# 3. Phong cách kiến trúc — Pha 1

Kiến trúc tổng thể:

```text
Client
  |
  | HTTP / REST / JSON
  v
API Layer
  |
  v
Tầng ứng dụng
  |
  v
Tầng miền
  ^
  |
Ports / Interfaces
  ^
  |
Tầng hạ tầng
  |
  v
PostgreSQL + PostGIS
```

Dependency quy tắc:

```text
API -------------> Application -------> Domain
Infrastructure ------------------------> Domain/Application ports

Domain -X-> Spring
Domain -X-> JPA/Hibernate
Domain -X-> PostgreSQL
Domain -X-> HTTP
```

Miền nghiệp vụ là trung tâm của hệ thống.

---

# 4. Ranh giới nguyên khối theo mô-đun

Các bounded context/module chính:

```text
gdrn
├── identity
├── disaster
├── reporting
├── rescue
├── alert
├── resource
├── geo
└── shared
```

Không dùng `shared` như nơi chứa mọi thứ. Chỉ đưa vào dùng chung những primitive/cross-cutting abstraction thật sự dùng chung và ổn định.

Mỗi business mô-đun nên có dạng:

```text
<module>/
├── api/
│   ├── controller/
│   ├── request/
│   └── response/
├── application/
│   ├── command/
│   ├── query/
│   ├── usecase/
│   └── dto/
├── domain/
│   ├── model/
│   ├── service/
│   ├── event/
│   └── repository/
└── infrastructure/
    ├── persistence/
    ├── mapper/
    └── configuration/
```

Tên package cụ thể có thể thay đổi nếu kho mã đã có convention tốt hơn, nhưng phụ thuộc direction không được thay đổi.

---

# 5. Trách nhiệm mô-đun

## 5.1 Danh tính và quyền truy cập

Trách nhiệm:

- User registration.
- Đăng nhập.
- JWT issuance/validation.
- Role-based phân quyền.
- User identity.

Initial vai trò:

```text
CITIZEN
RESPONDER
AUTHORITY
ADMIN
```

Bảo mật phải được xử lý tập trung qua Spring Security lọc chain/interceptor mechanism, không lặp xác thực logic trong bộ điều khiển.

---

## 5.2 Quản lý thảm họa

Aggregate/domain concepts:

```text
Disaster
DisasterId
DisasterType
Severity
DisasterStatus
AffectedArea
```

Vòng đời tham khảo:

```text
DETECTED
   ↓
VERIFIED
   ↓
ACTIVE
   ↓
CONTROLLED
   ↓
RESOLVED
```

Quy tắc nghiệp vụ cần kiểm tra tính hợp lệ chuyển trạng thái hợp lệ. Không cho phép cập nhật trạng thái tùy ý nếu chuyển trạng thái không hợp lệ.

Trách nhiệm:

- Create thảm họa.
- Verify thảm họa.
- Change severity.
- Update vòng đời.
- Query active disasters.
- Associate affected geographic area.

---

## 5.3 Báo cáo sự cố

Concepts:

```text
IncidentReport
ReportStatus
Reporter
Siêu dữ liệu minh chứng
GeoLocation
```

Trách nhiệm:

- Người dân submits báo cáo.
- Verify/reject báo cáo.
- Detect basic trùng lặp báo cáo.
- Associate báo cáo with known thảm họa when appropriate.
- Produce internal miền nghiệp vụ event when relevant.

Example yêu cầu:

```json
{
  "type": "FLOOD",
  "latitude": 21.028,
  "longitude": 105.834,
  "description": "Water level rising rapidly"
}
```

---

## 5.4 Điều phối cứu hộ

Concepts:

```text
RescueRequest
RescueRequestStatus
RescueTeam
TeamCapability
RescueMission
MissionStatus
PriorityScore
```

Vòng đời tham khảo:

```text
PENDING
   ↓
VERIFIED
   ↓
ASSIGNED
   ↓
IN_PROGRESS
   ↓
RESCUED
```

Luồng nghiệp vụ cốt lõi:

```text
Rescue Request
      ↓
Tính độ ưu tiên
      ↓
Candidate Teams
      ↓
Tính khoảng cách
      ↓
Đối chiếu năng lực
      ↓
Kiểm tra mức sẵn sàng
      ↓
Team Assignment
      ↓
Rescue Mission
```

Priority có thể xem xét:

- Disaster severity.
- Number of people at risk.
- Waiting time.
- Vulnerable people.
- Geographic risk.

Không hard-mã nguồn một công thức phức tạp nếu requirements chưa chốt; thiết kế để policy có thể thay đổi/test độc lập.

---

## 5.5 Cảnh báo khẩn cấp

Concepts:

```text
EmergencyAlert
AlertSeverity
AlertStatus
TargetArea
PublishedAt
ExpiresAt
```

Trách nhiệm:

- Create alert.
- Determine target area from supplied risk/disaster information.
- Publish alert.
- Expire/cancel alert.
- Query active alerts.

Possible luồng:

```text
Disaster / Risk
      ↓
Affected Area
      ↓
Emergency Alert
      ↓
Publish
```

External SMS/email/push tích hợp is not bắt buộc in Pha 1. Simulation/logging is sufficient unless requirements change.

---

## 5.6 Quản lý tài nguyên

Concepts:

```text
EmergencyResource
ResourceType
ResourceInventory
Shelter
Vehicle
ResourceAllocation
```

Các loại tài nguyên ban đầu:

- WATER
- FOOD
- MEDICAL_SUPPLY
- AMBULANCE
- RESCUE_VEHICLE
- RESCUE_EQUIPMENT
- SHELTER_CAPACITY

Trách nhiệm:

- Register resource/inventory.
- Query tình trạng sẵn sàng.
- Allocate resources to disaster/mission/area.
- Prevent invalid over-allocation.
- Release/consume allocation as defined by business rules.

Phân bổ tài nguyên phải có quy tắc nghiệp vụ thực tế, không chỉ thêm/đọc/sửa/xóa.

---

## 5.7 Địa lý / Rủi ro

Use PostgreSQL + PostGIS.

Concepts:

```text
GeoLocation
GeoRadius
EmergencyZone
AffectedArea
RiskLevel
```

Trách nhiệm:

- Distance queries.
- Nearby rescue requests.
- Nearby disasters.
- Determine resources/reports within affected area.
- Spatial filtering.
- Basic risk assessment policies.

Ví dụ ca sử dụng:

```text
Tìm mọi yêu cầu cứu hộ trong bán kính 10 km từ tâm thảm họa.
```

Truy vấn không gian nằm trong bộ chuyển đổi/kho dữ liệu hạ tầng; miền và ứng dụng nhận kết quả phù hợp với nghiệp vụ.

---

# 6. Quy tắc giao tiếp giữa mô-đun

Mẫu bị cấm:

```text
RescueService
    ↓
DisasterJpaRepository
```

Cách tiếp cận ưu tiên:

```text
Rescue Application
    ↓
DisasterQueryPort / Published Application API
    ↓
Disaster Module
```

hoặc internal miền/ứng dụng events khi temporal coupling không cần thiết.

Không expose persistence thực thể như xuyên mô-đun hợp đồng.

DTO/hợp đồng xuyên mô-đun phải nhỏ và ổn định.

---

# 7. Sự kiện miền — Pha 1

Pha 1 có thể sử dụng internal/in-process events.

Sự kiện dự kiến:

```text
DisasterDetected
DisasterVerified
DisasterEscalated
CitizenReportSubmitted
CitizenReportVerified
RescueRequested
RescueTeamAssigned
RescueCompleted
HighRiskAreaDetected
EmergencyAlertCreated
EmergencyAlertPublished
ResourceAllocated
```

Pha 1 **không yêu cầu external broker**.

Hành vi mặc định:

```text
Thao tác miền
    ↓
Internal event
    ↓
Bộ xử lý trong tiến trình
```

Nếu giao dịch semantics quan trọng, phần triển khai phải ghi rõ handler chạy trước/sau commit và có kiểm thử tương ứng.

---

# 8. API REST cơ sở

API prefix:

```text
/api
```

## Xác thực

```text
POST /api/auth/register
POST /api/auth/login
```

## Thảm họa

```text
GET    /api/disasters
GET    /api/disasters/{id}
POST   /api/disasters
PATCH  /api/disasters/{id}
DELETE /api/disasters/{id}
```

## Báo cáo

```text
GET    /api/reports
GET    /api/reports/{id}
POST   /api/reports
PATCH  /api/reports/{id}/verify
DELETE /api/reports/{id}
```

## Rescue

```text
POST   /api/rescue-requests
GET    /api/rescue-requests
GET    /api/rescue-requests/{id}
GET    /api/rescue-requests/me
POST   /api/rescue-requests/{id}/assign
PATCH  /api/rescue-requests/{id}/status
DELETE /api/rescue-requests/{id}
```

## Tài nguyên

```text
GET  /api/resources
POST /api/resources
POST /api/resource-allocations
GET  /api/disasters/{id}/resources
```

## Cảnh báo

```text
GET   /api/alerts
GET   /api/alerts/{id}
POST  /api/alerts
PATCH /api/alerts/{id}/publish
```

## Địa lý

```text
GET /api/disasters/{id}/nearby-rescue-requests
GET /api/disasters/{id}/affected-resources
GET /api/disasters/nearby
```

API danh sách là số đo cơ sở, không phải yêu cầu phải implement tất cả ngay lập tức.

---

# 9. Quy ước thiết kế API

- JSON request/response.
- RESTful tài nguyên naming.
- Dùng plural nouns cho collection.
- Không expose JPA entities trực tiếp.
- Yêu cầu DTO và phản hồi DTO tách khỏi persistence model.
- Kiểm tra tính hợp lệ errors phải trả phản hồi nhất quán.
- Sử dụng trạng thái HTTP mã nguồn đúng semantics.
- Pagination cho collection có khả năng lớn.
- Timestamp dùng ISO-8601.
- API documentation phải xuất hiện trong OpenAPI/Swagger.

Cấu trúc lỗi đề xuất:

```json
{
  "timestamp": "2026-10-06T12:00:00Z",
  "status": 400,
  "code": "INVALID_DISASTER_STATUS_TRANSITION",
  "message": "Cannot transition disaster from RESOLVED to ACTIVE",
  "path": "/api/disasters/123"
}
```

Không leak stack trace/internal exception ra máy khách.

---

# 10. Bảo mật

Kiến trúc xác thực:

```text
HTTP Request
     ↓
JWT Authentication Filter
     ↓
Spring Security Context
     ↓
Authorization
     ↓
Controller
```

Requirements:

- Password phải hash bằng password encoder phù hợp.
- JWT bí mật lấy từ environment/config bí mật.
- Protected endpoints phải dùng centralized security.
- Authorization theo role/use case.
- Không tin người dùng ID từ yêu cầu nếu có thể lấy identity từ authenticated principal.
- Không nhật ký password/token đầy đủ.

Yêu cầu tối thiểu của bài tập phải được đáp ứng:

- Có đăng nhập.
- Ít nhất một GET điểm cuối API yêu cầu xác thực.
- Ít nhất một POST điểm cuối API yêu cầu xác thực.

---

# 11. Lưu trữ

Database:

```text
PostgreSQL + PostGIS
```

Rules:

- JPA/Hibernate chỉ thuộc hạ tầng.
- Miền nghiệp vụ object không bắt buộc đồng nhất với JPA thực thể.
- Mapping giữa persistence model và miền nghiệp vụ model ở hạ tầng.
- Schema changes qua Flyway.
- Index dựa trên truy vấn patterns thực tế.
- Địa lý columns sử dụng PostGIS type phù hợp.
- Spatial index được cân nhắc cho truy vấn khoảng cách/khu vực.

Không tối ưu premature; số đo cơ sở phải đo được trước khi tuning mạnh.

---

# 12. Các nhóm dữ liệu dự kiến

Không coi đây là lược đồ cuối cùng, nhưng các aggregate/table area có thể gồm:

```text
users
roles
user_roles

disasters
incident_reports

rescue_requests
rescue_teams
rescue_team_capabilities
rescue_missions

emergency_alerts

resources
resource_inventories
resource_allocations
shelters
```

Thông tin địa lý có thể nằm trực tiếp trong thực thể tổng hợp phù hợp hoặc qua ánh xạ giá trị/đối tượng tùy thiết kế.

Không tạo generic mega-table cho mọi miền nghiệp vụ object.

---

# 13. Chiến lược kiểm thử

## Kiểm thử đơn vị miền

Ưu tiên cho:

- Status chuyển trạng thái.
- Priority calculation.
- Resource allocation rules.
- Assignment policy.
- Rủi ro policy.

Kiểm thử miền nghiệp vụ không cần Spring context nếu có thể.

## Kiểm thử tầng ứng dụng

Kiểm thử ca sử dụng điều phối bằng mock/fake các cổng khi phù hợp.

## Kiểm thử tích hợp

Sử dụng Testcontainers cho:

- PostgreSQL.
- PostGIS behavior.
- Repository bộ chuyển đổi.
- Security/API tích hợp quan trọng.

## Kiểm thử API

Kiểm tra:

- Authentication.
- Authorization.
- Kiểm tra tính hợp lệ.
- Status codes.
- Response các hợp đồng.

Không chỉ kiểm thử happy đường dẫn.

---

# 14. Điều kiện hoàn tất tính năng

Một tính năng chỉ được coi là hoàn thành khi phù hợp các mục liên quan:

- Domain/business quy tắc đã implement.
- Mô-đun boundary không bị phá.
- API hợp đồng rõ ràng.
- Kiểm tra tính hợp lệ có xử lý.
- Authorization đúng nếu điểm cuối API protected.
- Lưu trữ bản chuyển đổi lược đồ có nếu lược đồ thay đổi.
- Unit/integration kiểm thử cần thiết đã có.
- Swagger/OpenAPI cập nhật.
- Dockerized environment vẫn chạy.
- Không có bí mật hard-coded.
- README/spec cập nhật nếu architecture/API thay đổi đáng kể.

---

# 15. Pha 1 Luồng cơ sở

Ví dụ synchronous báo cáo luồng:

```text
POST /reports
      ↓
Authenticate
      ↓
Validate
      ↓
Tạo báo cáo sự cố
      ↓
Risk Analysis
      ↓
Associate / Update Disaster
      ↓
Tạo cảnh báo nếu cần
      ↓
Persist
      ↓
HTTP Response
```

Pha 1 cố ý giữ nhiều luồng synchronous để tạo số đo cơ sở dễ hiểu và đo hiệu năng.

Không artificial delay chỉ để làm Pha 1 trông chậm.

---

# 16. Đánh giá hiệu năng

Benchmark phải chạy trên cấu hình phần cứng cố định, ưu tiên Kaggle CPU theo yêu cầu môn học.

Kịch bản tải dự kiến:

```text
100 concurrent users
250 concurrent users
500 concurrent users
1000 concurrent users
2000 concurrent users
```

API dự kiến:

```text
GET  /api/disasters
POST /api/reports
POST /api/rescue-requests
GET  /api/disasters/{id}/nearby-rescue-requests
```

Metrics:

- Requests/sec / thông lượng.
- Average độ trễ.
- P50.
- P95.
- P99.
- Tỷ lệ lỗi.
- CPU.
- Memory.
- Database truy vấn độ trễ.

Benchmark tập lệnh phải được quản lý phiên bản.

---

# 17. Pha 2 Quy tắc ra quyết định

Không implement một cải tiến chỉ vì nó phổ biến.

Mapping ví dụ:

| Observed problem | Candidate improvement |
|---|---|
| Read-heavy điểm cuối API gây DB load cao | Redis bộ nhớ đệm |
| Long synchronous side effects | RabbitMQ + async worker |
| Burst traffic làm yêu cầu timeout | Queue / async processing |
| Notification failure làm mất công việc | Retry + DLQ |
| Duplicate event processing | Idempotent bên sử dụng |
| Khó quan sát điểm nghẽn | Prometheus + Grafana |
| Một kịch bản tải có scaling cấu hình khác core | Selective worker/service extraction |

Mọi improvement cần ghi:

1. Vấn đề quan sát được.
2. Quality attribute liên quan.
3. Quyết định kiến trúc.
4. Trade-off.
5. Benchmark trước.
6. Benchmark sau.

---

# 18. Kiến trúc dự kiến Pha 2

```text
                         Client
                           |
                           v
                    +-------------+
                    | API Gateway |
                    +------+------+
                           |
                           v
                +---------------------+
                |      GDRN Core      |
                |  Nguyên khối theo mô-đun   |
                +----------+----------+
                           |
              +------------+-------------+
              |                          |
              v                          v
       PostgreSQL/PostGIS              Redis
              |
              | Integration Events
              v
          +--------+
          |RabbitMQ|
          +---+----+
              |
       +------+-------+----------+
       |              |          |
       v              v          v
   Risk Worker    Alert Worker  Analytics Worker
```

Đây chỉ là candidate architecture.

---

# 19. Mẫu bảo đảm độ tin cậy Pha 2

Nếu RabbitMQ được áp dụng, xem xét:

```text
Message
  ↓
Consumer
  ↓ FAIL
Retry
  ↓ FAIL
Retry
  ↓ FAIL
Dead Letter Queue
```

Các vấn đề phải cân nhắc:

- At-least-once delivery.
- Duplicate messages.
- Idempotency.
- Poison messages.
- Retry backoff.
- Eventual consistency.
- Transaction boundary giữa DB và broker.

Không tuyên bố exactly-once nếu phần triển khai không thực sự bảo đảm.

---

# 20. Phương án quan sát hệ thống

```text
Spring Boot
    ↓
Micrometer
    ↓
Prometheus
    ↓
Grafana
```

Metrics có thể gồm:

- Yêu cầu thông lượng.
- HTTP độ trễ.
- Tỷ lệ lỗi.
- JVM bộ nhớ.
- CPU.
- DB pool usage.
- Query độ trễ.
- RabbitMQ hàng đợi depth.
- Worker processing duration.
- Redis bộ nhớ đệm hit/miss.

---

# 21–22. Phân công và lịch triển khai

Chỉ dùng [kế hoạch và 16 nhiệm vụ MVP](docs/PHASE1_PLAN.md).
Đề xuất phân công mô-đun và lịch một tháng trước đây đã được thay thế; không dùng
context dài hạn để cấp công việc, đổi owner hay mở rộng phạm vi Pha 1.

---

# 23. Quy ước viết mã

Trừ khi cấu hình kho mã quy định khác:

- Java naming conventions chuẩn.
- Constructor injection; tránh trường injection.
- Prefer bất biến value objects where practical.
- Không dùng static global trạng thái cho business logic.
- Không đặt business logic trong bộ điều khiển.
- Không đặt business logic quan trọng trong JPA thực thể nếu miền nghiệp vụ model tách biệt.
- Không trả `null` tùy tiện nếu miền nghiệp vụ semantics cần type rõ ràng.
- Exception types phải có ý nghĩa domain/application.
- Mapping mã nguồn rõ ràng hơn magic reflection khi ánh xạ ảnh hưởng correctness.
- Method/class nên có responsibility hẹp.
- Comment giải thích **why**, không lặp lại **what** mà mã nguồn đã thể hiện.

---

# 24. Dấu hiệu kiến trúc cần loại bỏ

Các dấu hiệu cần xử lý trong quá trình rà soát:

```text
Controller -> JpaRepository trực tiếp
```

```text
Domain -> Spring annotation/framework dependency
```

```text
Module A -> Module B JPA entity
```

```text
Business rule nằm trong controller
```

```text
One giant Service class xử lý nhiều bounded context
```

```text
shared/ chứa toàn bộ DTO/entity/service dùng chung
```

```text
RabbitMQ/Redis được thêm ở Pha 1 mà không có requirement mới
```

```text
Microservice được tạo chỉ để tách CRUD module
```

```text
Hard-coded JWT secret / DB password
```

```text
Schema update tự động thay migration có kiểm soát
```

---

# 25. Các tài liệu cần có

Repository nên có:

```text
README.md
ARCHITECTURE.md
CONTRIBUTING.md
/docs
    /adr
    /diagrams
    /api
    /benchmark
```

ADR đề xuất:

```text
ADR-001: Use Nguyên khối theo mô-đun for Phase 1
ADR-002: Use Clean/Hexagonal Architecture
ADR-003: Use PostgreSQL + PostGIS
ADR-004: Use JWT Authentication
ADR-005: Sự kiện miền nội bộ in Phase 1
```

Pha 2 tạo ADR mới dựa trên đo hiệu năng thay vì sửa lịch sử ADR cũ.

---

# 26. Thuộc tính chất lượng

Các quality attributes trọng tâm:

## Khả năng bảo trì

Đạt qua ranh giới mô-đun, phụ thuộc quy tắc, miền nghiệp vụ isolation và kiểm thử.

## Khả năng sửa đổi

Có thể thêm thảm họa type, risk policy hoặc phân công policy mà không sửa toàn bộ hệ thống.

## Hiệu năng

Đo độ trễ và thông lượng bằng load kiểm thử.

## Khả năng mở rộng

Đánh giá hành vi khi concurrent load tăng và khi có burst traffic.

## Độ tin cậy

Pha 2 có thể đánh giá thử lại, DLQ, message loss/duplication và failure isolation.

## Bảo mật

Authentication, phân quyền và bí mật management.

Không cố tối ưu tất cả quality attributes cùng lúc. Mỗi quyết định phải ghi rõ trade-off.

---

<a id="phase1-acceptance"></a>
# 27. Tiêu chí nghiệm thu Pha 1

Pha 1 tối thiểu phải đáp ứng đề bài môn học:

- REST API giao tiếp JSON.
- Có POST.
- Có GET.
- Có DELETE.
- Có OpenAPI/Swagger.
- Phân tầng API → Business/Application/Domain → Data Access.
- Business/domain không phụ thuộc web thư viện nền tảng hoặc DB library.
- Repository/Data Access Layer sử dụng ORM/data mapper.
- Có đăng nhập.
- Có protected GET điểm cuối API.
- Có protected POST điểm cuối API.
- Authentication qua filter/middleware/interceptor.
- Dockerized.
- Public GitHub kho mã.
- README mô tả kiến trúc và specification.
- Commit history có ý nghĩa.
- Có load testing trên Kaggle CPU.

Ngoài minimum tiêu chí đánh giá, GDRN hướng tới ranh giới mô-đun, PostGIS, miền nghiệp vụ logic và đo hiệu năng đủ rõ để phục vụ Pha 2.

---

# 28. Phạm vi chưa thực hiện ban đầu

Để kiểm soát phạm vi Pha 1, mặc định **không** triển khai:

- Đầy đủ vi dịch vụ.
- Kubernetes.
- Kafka cluster.
- Real satellite tích hợp.
- Real government emergency APIs.
- Real SMS billing/provider tích hợp.
- Machine-learning thảm họa prediction.
- Complex giao diện.
- Multi-region deployment.
- Event sourcing.
- CQRS hạ tầng phức tạp.

Các mục này chỉ được thêm khi nhóm chủ động thay đổi phạm vi và có đủ thời gian/lý do.

---

# 29. Diễn giải kiến trúc cốt lõi

```text
PHASE 1

Nguyên khối theo mô-đun
      +
DDD
      +
Kiến trúc sạch / lục giác
      +
Sự kiện miền nội bộ
      +
PostgreSQL / PostGIS
      |
      v
Kiểm thử chức năng
      |
      v
Load Test / Profiling
      |
      v
Điểm nghẽn quan sát được
      |
      v
Quyết định kiến trúc
      |
      v
PHASE 2

Cải tiến có chọn lọc
(Event-driven / RabbitMQ / Redis / Workers / Observability)
      |
      v
Benchmark Again
      |
      v
So sánh thuộc tính chất lượng và đánh đổi
```

**Principle:** Không xây kiến trúc phức tạp trước rồi tìm lý do biện minh sau. Pha 1 tạo số đo cơ sở; Pha 2 thay đổi kiến trúc dựa trên bằng chứng.

---

# 30. Danh sách rà soát tính năng

Trước khi triển khai tính năng, cần kiểm tra:

1. Feature thuộc ngữ cảnh nghiệp vụ nào?
2. Business quy tắc thuộc miền nghiệp vụ hay tầng ứng dụng?
3. Input/output cổng nào cần thiết?
4. Có đang tạo phụ thuộc từ inner tầng ra outer tầng không?
5. Có đang truy cập mô-đun khác qua phần triển khai chi tiết không?
6. Endpoint cần authentication/authorization gì?
7. Có bản chuyển đổi lược đồ không?
8. Cần kiểm thử đơn vị hay kiểm thử tích hợp nào?
9. Thay đổi có ảnh hưởng OpenAPI không?
10. Thay đổi có làm sai số đo cơ sở đo hiệu năng hoặc vô tình đưa giải pháp Pha 2 vào Pha 1 không?

Nếu một công việc yêu cầu vi phạm các quy tắc trên, không âm thầm làm sai architecture. Hãy chỉ rõ xung đột và đề xuất phương án phù hợp với kiến trúc hiện tại.

---

## Tóm tắt dự án

**GDRN — Global Disaster Response Network / Hệ thống Điều phối và Ứng phó Thảm họa Toàn cầu**

### Pha 1

```text
Java + Spring Boot
Nguyên khối theo mô-đun
DDD
Kiến trúc sạch / lục giác
Spring Security + JWT
PostgreSQL + PostGIS
Flyway
OpenAPI / Swagger
Docker
JUnit / Mockito / Testcontainers
k6
```

### Các phương án Pha 2

```text
Kiến trúc hướng sự kiện
RabbitMQ
Tiến trình xử lý bất đồng bộ
Redis
Thử lại / Hàng đợi lỗi / Tính lũy đẳng
Prometheus + Grafana
Tách dịch vụ có chọn lọc
```

Chất lượng kiến trúc quan trọng hơn số dòng mã. Giữ ranh giới miền, tạo số đo cơ sở và cải tiến tiếp theo dựa trên bằng chứng.
