# Kiến trúc hệ thống GDRN (Global Disaster Response Network)

Tài liệu này mô tả kiến trúc tổng thể của hệ thống **Global Disaster Response Network (GDRN)** theo mô hình **C4 (Context, Container, Component)**, kết hợp các nguyên lý **Domain-Driven Design (DDD)** và **Hexagonal / Clean Architecture**.

---

## 1. Tổng quan và Hiện trạng Kiến trúc Pha 1

GDRN là hệ thống mô phỏng điều phối cứu trợ và ứng phó thảm họa thiên tai, phục vụ mục tiêu học thuật và nghiên cứu kiến trúc phần mềm. Toàn bộ các năng lực cốt lõi của **Pha 1 (MVP)** và các phần mở rộng scope đã được triển khai, kiểm chứng và tích hợp hoàn chỉnh trên nhánh `main`:

- **Kiến trúc phân rã**: Đơn ứng dụng **Modular Monolith** (Java 21 / Spring Boot 3.5) đóng gói trong một tiến trình duy nhất, kết hợp cơ sở dữ liệu **PostgreSQL 16 + PostGIS 3.5**.
- **Giao diện người dùng**: Ứng dụng đơn trang **SPA** (React 18 / TypeScript / Vite / Vanilla CSS Design Tokens) phục vụ qua Nginx container với reverse proxy `/api`.
- **Hệ thống API nghiệp vụ**: Hoàn thành 20 endpoints nghiệp vụ (E01–E20), bao gồm Identity (E01–E02), Disaster (E03–E06), Reporting (E07–E11), Rescue (E12–E15), Dashboard (E16) và Photo Attachments (E17–E20).
- **Hệ thống màn hình**: 7 màn hình hoàn chỉnh (S01 Login, S02 Gửi báo cáo, S03 Báo cáo của tôi, S04 Điều phối duyệt báo cáo, S05 Quản lý thảm họa, S06 Phân công cứu hộ, S07 Dashboard thống kê).
- **Cơ sở dữ liệu & Không gian**: Quản lý tiến hóa lược đồ qua 7 bản migration Flyway (V1–V7). Xử lý vị trí không gian địa lý WGS84 (SRID 4326) với PostGIS GiST index và JDBC Data Mapper.
- **Bảo mật & Phiên làm việc**: Xác thực stateless Bearer JWT (HS256), phân quyền dựa trên vai trò `CITIZEN` / `AUTHORITY`, lưu trữ token trong `sessionStorage` phạm vi tab trình duyệt, bảo vệ default-deny trên toàn bộ endpoint.
- **Chống xung đột & Concurrency**: Bảo vệ toàn vẹn bằng atomic conditional updates, unique index và partial unique index chống race condition ở tầng database.
- **Đo lường & Kiểm chuẩn**: Bộ công cụ benchmark tải k6 và kịch bản Kaggle CPU (Task D3) đo lường các workload đọc/ghi thực tế.

---

## 2. Mô hình C4 — Cấp độ 1: Sơ đồ Ngữ cảnh Hệ thống (System Context Diagram)

Sơ đồ ngữ cảnh thể hiện người dùng (Actors), ranh giới của hệ thống GDRN và các hệ thống bên ngoài tương tác với GDRN.

```mermaid
flowchart TD
    subgraph Users ["Người dùng hệ thống"]
        Citizen["Người dân (Citizen)<br/><i>[Person]</i><br/>Gửi báo cáo sự cố có tọa độ,<br/>đính kèm ảnh, theo dõi tiến độ cứu hộ,<br/>rút báo cáo khi còn chờ duyệt."]
        Authority["Điều phối viên (Authority / Dispatcher)<br/><i>[Person]</i><br/>Xác minh báo cáo, gắn thảm họa,<br/>phân công đội cứu hộ, theo dõi<br/>tiến độ và xem thống kê báo cáo."]
        Responder["Đội cứu hộ (Rescue Team Responder)<br/><i>[Person]</i><br/>Thực thi nhiệm vụ tại hiện trường,<br/>cập nhật trạng thái cứu trợ<br/>(thao tác qua điều phối viên)."]
    end

    subgraph SystemBoundary ["Ranh giới Hệ thống GDRN"]
        GDRN["<b>Global Disaster Response Network (GDRN)</b><br/><i>[Software System]</i><br/>Hệ thống điều phối ứng phó thảm họa Modular Monolith.<br/>Tiếp nhận báo cáo tọa độ, xác thực nghiệp vụ,<br/>quản lý vòng đời thảm họa và điều phối cứu trợ."]
    end

    subgraph ExternalSystems ["Hệ thống bên ngoài"]
        MapProvider["Nhà cung cấp bản đồ (Map Tile Provider)<br/><i>[External System: MapTiler / OpenStreetMap]</i><br/>Cung cấp raster/vector tiles và phong cách hiển thị<br/>bản đồ cho thành phần LocationMap trên trình duyệt."]
        BenchmarkRunner["Bộ công cụ kiểm chuẩn tải (Load Runner)<br/><i>[External System: k6 / Docker / Kaggle]</i><br/>Kích hoạt các kịch bản kiểm thử tải E07/E08<br/>để đo lường p50, p95, p99 và năng lực chịu tải."]
    end

    Citizen -->|"Đăng nhập, gửi báo cáo (lat/lon), đính kèm ảnh,<br/>xem tiến độ và rút báo cáo (HTTPS / JSON)"| GDRN
    Authority -->|"Quản lý thảm họa, duyệt/từ chối báo cáo,<br/>phân công đội cứu trợ, xem dashboard (HTTPS / JSON)"| GDRN
    Responder -.->|"Báo cáo trạng thái nhiệm vụ cho điều phối viên"| Authority

    GDRN -.->|"Tải tile bản đồ nền hiển thị trên web client<br/>(HTTPS / Vector Tiles)"| MapProvider
    BenchmarkRunner -->|"Thực thi workload đo tải mô phỏng<br/>(HTTP / k6 load scenarios)"| GDRN
```

---

## 3. Mô hình C4 — Cấp độ 2: Sơ đồ Thùng chứa (Container Diagram)

Sơ đồ Container phân rã hệ thống GDRN thành các thành phần triển khai (containers) ở mức kiến trúc phần mềm, bao gồm SPA Client, Ứng dụng Backend Spring Boot, Cơ sở dữ liệu quan hệ/không gian và Vùng lưu trữ tệp tin riêng tư.

```mermaid
flowchart TD
    subgraph Clients ["Trình duyệt người dùng (Web Browser)"]
        Browser["Người dùng cuối (Citizen / Authority)<br/><i>[Web Browser]</i>"]
    end

    subgraph GDRNContainers ["Hệ thống GDRN (Docker Compose Topology)"]
        subgraph WebContainer ["Frontend Web Container (Port 3000 -> 80)"]
            Nginx["<b>Web Server & Reverse Proxy</b><br/><i>[Nginx 1.27 Alpine]</i><br/>Phục vụ static assets của SPA.<br/>Proxy đường dẫn <code>/api/**</code> sang Backend.<br/>Cấu hình SPA fallback <code>try_files</code>."]
            SPA["<b>Single Page Application (SPA)</b><br/><i>[React 18 / TypeScript / Vite]</i><br/>Crisis Command CSS design tokens, S01–S07,<br/>MapLibre GL bản đồ, i18n Anh/Việt,<br/>quản lý phiên trong tab-scoped sessionStorage."]
        end

        subgraph BackendContainer ["Backend Container (Port 8080)"]
            SpringBoot["<b>Ứng dụng Backend (Modular Monolith)</b><br/><i>[Java 21 / Spring Boot 3.5]</i><br/>Cung cấp 20 REST API endpoints (E01–E20).<br/>Xác thực stateless Bearer JWT, kiểm tra quyền,<br/>thực thi quy tắc nghiệp vụ Domain & điều phối Hexagonal,<br/>quản lý giao dịch database và migrations Flyway."]
        end

        subgraph DBContainer ["Database Container (Port 5432)"]
            PostgreSQL["<b>Cơ sở dữ liệu quan hệ & không gian</b><br/><i>[PostgreSQL 16 + PostGIS 3.5]</i><br/>Lưu trữ thực thể quan hệ, dữ liệu địa lý WGS84,<br/>chỉ mục GiST không gian, quản lý ràng buộc<br/>khóa ngoại nội module và partial unique index."]
        end

        subgraph StorageVolume ["Private File Storage Volume"]
            AttachmentStorage["<b>Private Filesystem Storage</b><br/><i>[Local Disk: .data/report-attachments]</i><br/>Lưu trữ tệp nhị phân ảnh minh chứng (JPEG/PNG).<br/>Nằm ngoài thư mục web root, truy cập bảo mật<br/>thông qua Application Storage Port."]
        end
    end

    Browser -->|"Tải trang web, CSS, JS<br/>[HTTPS / Port 3000]"| Nginx
    Nginx -->|"Phục vụ static files"| SPA
    SPA -->|"Gọi API nghiệp vụ và xác thực<br/>[JSON / REST qua proxy /api]"| Nginx
    Nginx -->|"Chuyển tiếp yêu cầu HTTP<br/>[HTTP / Port 8080]"| SpringBoot

    SpringBoot -->|"Đọc/ghi quan hệ, tính toán không gian ST_DWithin,<br/>chạy Flyway migrations V1–V7<br/>[JDBC / Port 5432]"| PostgreSQL

    SpringBoot -->|"Đọc/ghi tệp nhị phân ảnh minh chứng<br/>[Java NIO File Channel]"| AttachmentStorage
```

---

## 4. Mô hình C4 — Cấp độ 3: Sơ đồ Thành phần (Component Diagram - Modular Monolith)

Sơ đồ Component bóc tách bên trong khối **Backend Spring Boot Application (Modular Monolith)** thành các module nghiệp vụ bounded context, các lớp kiến trúc lục giác (**Hexagonal / Clean Architecture**) và các luồng giao tiếp thông qua **Published Contracts**:

```mermaid
flowchart TD
    subgraph SharedInfrastructure ["Shared Technical Infrastructure"]
        SecurityConfig["<b>SecurityConfiguration</b><br/>Stateless JWT Bearer Filter,<br/>Role mapping, Default-deny matcher"]
        OpenApiConfig["<b>OpenApiConfiguration</b><br/>Tích hợp Swagger UI & OpenAPI specs"]
        GlobalErrors["<b>SecurityErrorWriter & ProblemDetail</b><br/>Chuẩn hóa định dạng lỗi RFC 7807"]
    end

    subgraph IdentityModule ["Module Identity (com.gdrn.identity)"]
        AuthController["<b>AuthController</b><br/>E01: POST /api/auth/login<br/>E02: GET /api/auth/me"]
        IdentityService["<b>IdentityService</b><br/>Xác thực người dùng, cấp phát JWT,<br/>khởi tạo tài khoản demo profile"]
        IdentityDomain["<b>Domain Model</b><br/>User, Role (CITIZEN, AUTHORITY),<br/>EmailAddress"]
        IdentityInfra["<b>Infrastructure Adapters</b><br/>JpaUserRepository, JpaCredentialRepository,<br/>BCryptPasswordEncoder, NimbusTokenAdapter"]
    end

    subgraph DisasterModule ["Module Disaster (com.gdrn.disaster)"]
        DisasterController["<b>DisasterController</b><br/>E03: GET /api/disasters<br/>E04: GET /api/disasters/{id}<br/>E05: POST /api/disasters<br/>E06: PATCH /api/disasters/{id}"]
        DisasterService["<b>DisasterService</b><br/>Quản lý vòng đời thảm họa<br/>ACTIVE -> RESOLVED"]
        DisasterContract["<b>Published Contract: DisasterQuery</b><br/>findById(id), findByIds(ids)<br/>DisasterSnapshot, DisasterState"]
        DisasterDomain["<b>Domain Model</b><br/>Disaster, DisasterType, DisasterStatus"]
        DisasterInfra["<b>Infrastructure Adapters</b><br/>JpaDisasterRepository,<br/>PublishedDisasterQuery Adapter"]
    end

    subgraph ReportingModule ["Module Reporting (com.gdrn.reporting)"]
        ReportController["<b>ReportController</b><br/>E07: Tạo báo cáo<br/>E08: Danh sách/lọc bán kính<br/>E09: Chi tiết báo cáo<br/>E10: Duyệt/Từ chối<br/>E11: Rút báo cáo"]
        ReportAttachmentController["<b>ReportAttachmentController</b><br/>E17: Upload ảnh<br/>E18: Danh sách ảnh<br/>E19: Tải nội dung ảnh<br/>E20: Xóa ảnh"]
        ReportService["<b>Application Services</b><br/>ReportService, ReportModerationService,<br/>ReportAttachmentService"]
        ReportContracts["<b>Published Contracts:</b><br/>- ReportingQuery (cho Rescue)<br/>- ReportStatisticsQuery (cho Dashboard)"]
        ReportingDomain["<b>Domain Model</b><br/>IncidentReport, Coordinates (WGS84),<br/>IncidentReportStatus, ReportEvidenceAttachment"]
        ReportingInfra["<b>Infrastructure Adapters</b><br/>JdbcReportStore (PostGIS Mapper, GiST),<br/>FilesystemAttachmentStorageAdapter,<br/>DisasterLookupAdapter"]
    end

    subgraph RescueModule ["Module Rescue (com.gdrn.rescue)"]
        RescueController["<b>RescueController</b><br/>E12: Danh sách đội cứu hộ<br/>E13: Phân công nhiệm vụ<br/>E14: Tra cứu nhiệm vụ<br/>E15: Cập nhật tiến độ"]
        RescueService["<b>RescueService</b><br/>Phân công đội, kiểm tra điều kiện thảm họa,<br/>chuyển trạng thái ASSIGNED -> IN_PROGRESS -> COMPLETED"]
        RescueContract["<b>Published Contract:</b><br/>RescueStatisticsQuery (cho Dashboard)"]
        RescueDomain["<b>Domain Model</b><br/>RescueMission, RescueTeam,<br/>MissionStatus, RescueTeamStatus"]
        RescueInfra["<b>Infrastructure Adapters</b><br/>JdbcRescueStore, JdbcRescueTeamStore<br/>(Khóa chống race condition đội & nhiệm vụ),<br/>ReportLookupAdapter"]
    end

    subgraph DashboardModule ["Module Dashboard (com.gdrn.dashboard)"]
        DashboardController["<b>DashboardController</b><br/>E16: GET /api/dashboard"]
        DashboardService["<b>DashboardService</b><br/>Tổng hợp số liệu báo cáo, nhiệm vụ & đội cứu hộ,<br/>áp dụng bộ lọc ngày Asia/Ho_Chi_Minh"]
        DashboardInfra["<b>Dashboard Adapters</b><br/>ReportingStatisticsAdapter,<br/>RescueStatisticsAdapter<br/>(Repeatable Read read-only transaction)"]
    end

    %% Giao tiếp giữa các tầng trong module
    AuthController --> IdentityService --> IdentityDomain
    IdentityService --> IdentityInfra

    DisasterController --> DisasterService --> DisasterDomain
    DisasterService --> DisasterInfra
    DisasterInfra -.->|Hiện thực| DisasterContract

    ReportController --> ReportService
    ReportAttachmentController --> ReportService
    ReportService --> ReportingDomain
    ReportService --> ReportingInfra
    ReportingInfra -.->|Hiện thực| ReportContracts

    RescueController --> RescueService --> RescueDomain
    RescueService --> RescueInfra
    RescueInfra -.->|Hiện thực| RescueContract

    DashboardController --> DashboardService --> DashboardInfra

    %% Giao tiếp liên module (Chỉ qua Published Application Contracts)
    ReportingInfra -->|"Gọi DisasterLookupPort<br/>(DisasterQuery)"| DisasterContract
    RescueInfra -->|"Gọi ReportLookupPort<br/>(ReportingQuery)"| ReportContracts
    DashboardInfra -->|"Gọi ReportStatisticsPort"| ReportContracts
    DashboardInfra -->|"Gọi RescueStatisticsPort"| RescueContract

    %% Security áp dụng lên Controllers
    SecurityConfig -.->|Bảo vệ đường dẫn & JWT| AuthController
    SecurityConfig -.->|Bảo vệ đường dẫn & JWT| DisasterController
    SecurityConfig -.->|Bảo vệ đường dẫn & JWT| ReportController
    SecurityConfig -.->|Bảo vệ đường dẫn & JWT| ReportAttachmentController
    SecurityConfig -.->|Bảo vệ đường dẫn & JWT| RescueController
    SecurityConfig -.->|Bảo vệ đường dẫn & JWT| DashboardController
```

---

## 5. Nguyên lý Thiết kế và Quy tắc Kiến trúc

### 5.1. Kiến trúc Lục giác (Hexagonal / Clean Architecture)
Mỗi module nghiệp vụ tuân thủ nghiêm ngặt nguyên lý phụ thuộc hướng tâm (**Dependencies point inward**):

```text
API (Controllers, DTOs)
  └──> Application (Use Cases, Commands, Queries, Ports, Contracts)
        └──> Domain (Entities, Value Objects, Domain Invariants - Pure Java)
Infrastructure (Persistence, Adapters, Spring Security, External Storage)
  └──> Implements Application & Domain Ports
```

- **Domain độc lập tuyệt đối**: Viết hoàn toàn bằng Java thuần (POJO), không chứa bất kỳ annotation hay import nào từ Spring Framework, Jakarta Persistence (JPA), Jackson JSON hay PostgreSQL/PostGIS. Toàn bộ quy tắc tính hợp lệ và biến đổi trạng thái (Invariants) được thực thi trong Domain.
- **Application Port / Adapter**: Mọi giao tiếp với thế giới bên ngoài (cơ sở dữ liệu, lưu trữ tệp, xác thực token) đều thông qua Interface (Port) định nghĩa ở tầng Application. Tầng Infrastructure cung cấp Adapter hiện thực các Interface này.
- **Kiểm soát bằng ArchUnit**: Bộ kiểm tra kiến trúc tự động (`ArchUnitTest`) xác thực tính độc lập của Domain, ngăn chặn controller truy cập trực tiếp repository và cấm rò rỉ cơ sở hạ tầng giữa các module.

### 5.2. Giao tiếp liên Module và Ranh giới Dữ liệu
Dự án áp dụng mô hình **Modular Monolith** chặt chẽ, không biến tướng thành "Distributed Monolith" hoặc Microservices phức tạp không cần thiết:

1. **Chiều phụ thuộc đơn hướng**:
   $$\text{Rescue} \longrightarrow \text{Reporting} \longrightarrow \text{Disaster}$$
   $$\text{Dashboard} \longrightarrow \text{Reporting} \quad \text{và} \quad \text{Dashboard} \longrightarrow \text{Rescue}$$
2. **Không join SQL hoặc liên kết JPA xuyên module**:
   - Mỗi module sở hữu toàn bộ bảng và dữ liệu của riêng mình. Không tồn tại Foreign Key vật lý xuyên qua các bảng của module khác.
   - Các tham chiếu liên module (`reporterId`, `disasterId`, `reportId`) được lưu trữ dưới dạng định danh vô hướng `UUID`.
   - Tính toàn vẹn dữ liệu được đảm bảo thông qua logic ứng dụng và các **Published Application Contracts** (`DisasterQuery`, `ReportingQuery`).
3. **Published Application Contracts**:
   - Nằm tại `<module>.application.contract`, chỉ chứa Java Interface và DTO immutable (`record`), hoàn toàn không phụ thuộc Spring hay JPA.
   - Khi module A cần dữ liệu từ module B, Adapter của module A gọi Interface Contract được xuất bản của module B. Dữ liệu trả về là các snapshot bất biến (ví dụ: `DisasterSnapshot`, `ReportSnapshot`).

---

## 6. Chiến lược Dữ liệu, Không gian và Xử lý Đồng thời

### 6.1. Tiến hóa Lược đồ với Flyway
Hệ thống sử dụng một cơ sở dữ liệu duy nhất với 7 bản migration tuần tự bất biến:

| Version | File Migration | Module Sở Hữu | Nội dung Schema & Ràng buộc |
| :---: | :--- | :---: | :--- |
| **V1** | `V1__enable_postgis.sql` | Technical | Kích hoạt extension PostGIS cho tính toán địa lý. |
| **V2** | `V2__identity_accounts.sql` | Identity | Bảng `identity_users` và `identity_credentials` (FK nội bộ). |
| **V3** | `V3__disasters.sql` | Disaster | Bảng `disasters`, ràng buộc trạng thái ACTIVE/RESOLVED, tọa độ WGS84, version lock. |
| **V4** | `V4__reporting_reports.sql` | Reporting | Bảng `reporting_reports`, cột `geography(Point, 4326)`, ràng buộc ban đầu PENDING. |
| **V5** | `V5__reporting_verification_withdrawal.sql` | Reporting | Mở rộng trạng thái VERIFIED/REJECTED, metadata rút báo cáo `withdrawn_at`, GiST index không gian. |
| **V6** | `V6__rescue_teams_and_missions.sql` | Rescue | Bảng `rescue_teams` và `rescue_missions`, UNIQUE `report_id`, partial unique index cho active team. |
| **V7** | `V7__reporting_evidence_attachments.sql` | Reporting | Bảng `reporting_report_attachments`, metadata ảnh minh chứng (tối đa 5 ảnh/báo cáo, 5 MiB/ảnh). |

### 6.2. Dữ liệu Không gian PostGIS (Spatial Handling)
- Lưu trữ tọa độ theo hệ quy chiếu chuẩn WGS84 (SRID 4326) bằng kiểu dữ liệu `geography(Point, 4326)`.
- Thực hiện truy vấn lọc bán kính bằng hàm PostGIS chuyên dụng:
  ```sql
  ST_DWithin(r.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusMeters)
  ```
- Sử dụng chỉ mục không gian **GiST** (`idx_reporting_reports_location_gist`) trên tập các báo cáo nhìn thấy được (chưa rút) để tối ưu hóa hiệu năng truy vấn lọc theo vùng địa lý.
- Truy vấn thông qua **JDBC Data Mapper** (`JdbcReportStore`) thuần SQL, loại bỏ phụ thuộc nặng nề vào Hibernate Spatial trong khi vẫn đảm bảo độ chính xác tính toán theo mét thực tế trên mặt cầu Trái Đất.

### 6.3. Kiểm soát Giao dịch và Xử lý Đồng thời (Concurrency Controls)
1. **Duyệt / Từ chối / Rút báo cáo (Reporting)**:
   - Sử dụng cơ chế khóa lạc quan (Optimistic Concurrency) với Atomic Conditional Update:
     ```sql
     UPDATE reporting_reports
     SET status = :newStatus, version = version + 1, ...
     WHERE id = :id AND version = :expectedVersion AND status = 'PENDING' AND withdrawn_at IS NULL
     ```
   - Nếu số dòng cập nhật trả về là 0, hệ thống phát hiện có tranh chấp đồng thời và trả về lỗi `409 Conflict`.
2. **Phân công đội cứu hộ (Rescue)**:
   - Mỗi báo cáo chỉ được phép có tối đa 1 nhiệm vụ cứu hộ trong toàn bộ vòng đời: ràng buộc `UNIQUE (report_id)` trên bảng `rescue_missions`.
   - Một đội cứu hộ chỉ được phép phụ trách 1 nhiệm vụ đang hoạt động tại một thời điểm: bảo vệ bằng **Partial Unique Index** tầng cơ sở dữ liệu:
     ```sql
     CREATE UNIQUE INDEX idx_rescue_missions_team_active
     ON rescue_missions (team_id)
     ON CONFLICT DO NOTHING
     WHERE status IN ('ASSIGNED', 'IN_PROGRESS');
     ```
   - Xung đột tranh chấp đội cứu trợ được giải quyết triệt để ở tầng database, ngăn chặn hoàn toàn race condition khi có 2 yêu cầu phân công cùng lúc.
3. **Thống kê Dashboard**:
   - Sử dụng giao dịch `READ ONLY` với mức độ cô lập `REPEATABLE READ` trên cùng DataSource.
   - Đảm bảo tính nhất quán dữ liệu xuyên suốt giữa số lượng báo cáo và nhiệm vụ cứu trợ trong một snapshot thống kê duy nhất mà không gây nghẽn khóa ghi (write locks).

---

## 7. Mô hình Bảo mật và Quản lý Phiên

- **Stateless Bearer JWT**: Token JWT ngắn hạn được ký bằng thuật toán HS256 với secret key nạp từ biến môi trường. Không lưu trạng thái phiên trên server (Stateless).
- **Tab-scoped Session**: Frontend lưu trữ token trong `sessionStorage`. Việc tải lại trang (reload) trong cùng tab giữ nguyên phiên làm việc; mở tab mới hoặc đóng trình duyệt yêu cầu đăng nhập lại, ngăn chặn rò rỉ token qua `localStorage`.
- **Default-Deny Security Filter**: Cấu hình Spring Security áp dụng quy tắc mặc định từ chối (`anyRequest().denyAll()`). Từng endpoint được khai báo chính xác phương thức HTTP và quyền tương ứng (`ROLE_CITIZEN`, `ROLE_AUTHORITY`).
- **Phân quyền dữ liệu ở Application Layer**:
  - Người dân (`CITIZEN`) chỉ được đọc và thao tác trên báo cáo do chính mình tạo ra (`reporterId == currentUserId`).
  - Điều phối viên (`AUTHORITY`) có quyền xem toàn bộ báo cáo và nhiệm vụ điều phối.
  - Tải ảnh minh chứng đính kèm được bảo vệ thông qua endpoint có xác thực; hệ thống không phát hành public URL cho tệp nhị phân.

---

## 8. Chiến lược Kiểm thử và CI/CD

Kiến trúc GDRN được thiết kế để kiểm thử toàn diện trên nhiều cấp độ:

```mermaid
flowchart TD
    subgraph TestPyramid ["Kim tự tháp kiểm thử (Testing Strategy)"]
        BrowserTest["<b>Browser E2E Tests</b> (Playwright)<br/>23 scenarios: Luồng UI thật Citizen -> Authority -> Rescue,<br/>kiểm tra hiển thị bản đồ, zoom 200%, đa ngôn ngữ"]
        IntegrationTest["<b>Integration Tests</b> (Failsafe & Testcontainers)<br/>ReportingIT, RescueIT, GdrnApplicationIT<br/>Kiểm tra Spring Context, PostGIS thật, Flyway upgrade, liveness/readiness"]
        ArchitectureTest["<b>Architecture Tests</b> (ArchUnit)<br/>Kiểm tra tính độc lập của Domain, cô lập Hexagonal layers,<br/>kiểm tra không import cross-module infrastructure"]
        UnitTest["<b>Unit Tests</b> (JUnit 5 & Mockito)<br/>Kiểm thử domain invariants, use cases với mocked ports,<br/>chạy nhanh độc lập không cần Spring Boot"]
    end

    UnitTest --> ArchitectureTest --> IntegrationTest --> BrowserTest
```

- **Clean Verify**: Lệnh `.\mvnw.cmd clean verify` chạy trọn vẹn toàn bộ Unit Tests, Architecture Tests và Integration Tests với Testcontainers (yêu cầu Docker daemon).
- **Frontend Verify**: Lệnh `npm ci`, `npm run typecheck`, `npm test` và `npm run build` xác thực 93 unit tests giao diện, tính tương thích TypeScript và đóng gói production bundle.
- **Continuous Integration (CI)**: GitHub Actions workflow tự động kiểm tra cú pháp Compose, chạy clean verify, build frontend/backend image, khởi động stack kiểm tra healthcheck và chạy bộ hồi quy Playwright browser test.

---

## 9. Định hướng Không gian Pha 2 (Architectural Non-Goals)

Để bảo đảm tính tập trung cho phạm vi Pha 1, hệ thống **chưa và không** triển khai các thành phần sau:
- Không sử dụng kiến trúc Microservices (vẫn giữ vững Modular Monolith).
- Không thêm Message Broker phân tán (RabbitMQ, Apache Kafka).
- Không sử dụng bộ nhớ đệm phân tán ngoài (Redis, Memcached).
- Không triển khai API Gateway trung gian hay Service Discovery (Eureka, Consul).
- Không áp dụng giao dịch phân tán (2PC, Saga).
- Mọi quyết định tách module hoặc nâng cấp hạ tầng sang Pha 2 bắt buộc phải dựa trên số liệu đo lường chất lượng thực tế (**Task D3 Benchmark**) và được phê duyệt thông qua Architecture Decision Record (ADR) mới.
