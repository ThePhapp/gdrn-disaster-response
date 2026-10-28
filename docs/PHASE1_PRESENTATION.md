# Kịch bản thuyết trình Phase 1 — 5-7 phút, mục tiêu 6 phút

Đây là **kịch bản nói**, tách với [demo thao tác 8–10 phút](qa/phase1-demo-script.md).
Mốc mã nguồn: `main 2ddf9d0`, rà soát 28/10/2026. Đọc với nhịp vừa, nghỉ ngắn ở mỗi
đoạn; phân bổ 1 + 1,5 + 1,5 + 1 + 1 phút. Thời lượng là ước lượng theo nội dung,
chưa diễn tập có bấm giờ; nhóm nên đọc thử trước buổi báo cáo.

Thứ tự trình bày bám [README](../README.md): bài toán/nghiệp vụ, tổ chức mã và
yêu cầu kỹ thuật, build/deploy/API, rồi vấn đề hiện có và bàn giao Phase 2.
Mở sẵn `docs/openapi.yaml` trong Swagger Editor hoặc Swagger UI local; chỉ giới
thiệu một request/response để giữ thời lượng. Q&A và demo dài nằm ngoài 5-7 phút.

## 0:00–1:00 — Bài toán và mục tiêu

“Chào thầy cô và các bạn. Nhóm em giới thiệu Global Disaster Response Network,
gọi tắt là GDRN, một hệ thống mô phỏng điều phối ứng phó thảm họa.

Khi xảy ra sự cố, thông tin từ người dân cần được tập hợp, kiểm tra và chuyển cho
đội cứu hộ. Nếu chỉ trao đổi rời rạc, người dân khó theo dõi yêu cầu, còn điều phối
viên khó biết báo cáo nào đã xác minh và đội nào đang bận.

Phase 1 của nhóm xây dựng một luồng cơ bản cho hai đối tượng: người dân gửi báo cáo
có tọa độ, và điều phối viên xác minh rồi phân công cứu hộ. Mục tiêu là có phần mềm
chạy được, nghiệp vụ nhất quán và kiến trúc đủ rõ để nhóm tiếp theo phát triển.
Đây là mô phỏng học thuật, chưa phải dịch vụ dùng để xử lý tình huống khẩn cấp thật.”

## 1:00–2:30 — Nghiệp vụ và chức năng

“Người dân đăng nhập rồi gửi mô tả, loại sự cố và tọa độ. Báo cáo mới ở trạng thái
PENDING. Người gửi có thể đính kèm ảnh JPEG hoặc PNG, xem báo cáo của mình và rút
báo cáo khi còn chờ duyệt. Người khác không được đọc báo cáo riêng của họ.

Ở phía điều phối, cán bộ có thể lọc báo cáo, bao gồm tìm trong một bán kính theo
mét. Cán bộ xác minh báo cáo và gắn với một thảm họa đang ACTIVE, hoặc từ chối kèm
lý do. Thảm họa có luồng ACTIVE sang RESOLVED; các lần cập nhật kiểm tra phiên bản
để tránh ghi đè dữ liệu đã thay đổi.

Khi báo cáo đã VERIFIED và thảm họa vẫn hoạt động, điều phối viên chọn đội rảnh để
phân công. Nhiệm vụ đi qua ASSIGNED, IN_PROGRESS rồi COMPLETED. Một đội chỉ có một
nhiệm vụ đang hoạt động, và một báo cáo chỉ được gắn một nhiệm vụ. Database bảo vệ
các điều kiện này ngay cả khi có hai yêu cầu cùng lúc.

Người dân xem tiến độ nhiệm vụ của báo cáo mình. Điều phối viên còn có dashboard
để xem số báo cáo, nhiệm vụ và đội rảnh. Lọc ngày dùng múi giờ Việt Nam; số đội là
năng lực hiện tại, không phải lịch sử. Hiện có 20 API nghiệp vụ và 7 màn hình.
Nhóm chưa triển khai cảnh báo, quản lý tài nguyên hay tự động phân đội.”

## 2:30–4:00 — Kiến trúc, framework và tổ chức mã

“Backend là một ứng dụng Java 21 với Spring Boot 3.5.16, tổ chức theo Modular
Monolith. Theo ADR của dự án, lựa chọn này phù hợp nhóm bốn người và giữ triển khai,
giao dịch ở mức đơn giản, trong khi chưa có yêu cầu bắt buộc phải phân tán.

Các phần nghiệp vụ gồm Identity, Disaster, Reporting, Rescue và một module đọc
Dashboard. Mỗi module tách API, application và infrastructure; domain chứa quy tắc
nghiệp vụ bằng Java thuần. Controller nhận HTTP và chuyển dữ liệu, application
điều phối use case, còn adapter xử lý lưu trữ. Dashboard chỉ tổng hợp dữ liệu nên
không tạo thêm domain entity không cần thiết.

Rescue lấy thông tin báo cáo qua contract của Reporting; Reporting gọi contract
của Disaster. Các module không truy cập bảng hoặc implementation riêng của nhau.
ArchUnit kiểm tra những ranh giới quan trọng này.

Database là PostgreSQL 16 với PostGIS 3.5 để hỗ trợ truy vấn không gian. Identity
và Disaster dùng JPA; Reporting và Rescue dùng JDBC. Flyway quản lý bảy migration,
còn Hibernate chỉ kiểm tra schema. Domain không chứa annotation JPA.

Frontend là React 19, TypeScript và Vite. Nginx phục vụ SPA và chuyển đường dẫn
API đến backend. Bản đồ MapLibre là tùy chọn; thiếu cấu hình bản đồ, người dùng
vẫn có thể nhập tọa độ. Xác thực dùng JWT ngắn hạn, phân quyền người dân và điều phối.”

## 4:00–5:00 — Chạy, build, deploy và API

“Để chạy demo, nhóm cài Docker Desktop với Linux containers, tạo cấu hình môi
trường qua script setup rồi chạy dev.ps1 up. Script build ba container database,
backend và frontend, sau đó kiểm tra health. Tài khoản demo được lấy từ file môi
trường riêng; repository không chứa mật khẩu thật.

Backend kiểm tra bằng Maven clean verify, gồm cả Testcontainers với PostGIS thật.
Frontend có typecheck, unit tests và build production. Lượt rà soát này đã chạy
thành công 130 kiểm thử backend và 93 kiểm thử frontend.

README có lệnh chạy và đường dẫn Swagger. File docs/openapi.yaml mô tả 20 API
thực tế với request, response, mã lỗi và quyền; có thể import vào Swagger Editor.
Triển khai local bằng Compose đã có quy trình kiểm chứng. Triển khai cloud chưa
được xác nhận, nên nhóm không trình bày local demo như một bản production.”

## 5:00–6:00 — Hạn chế và bàn giao Phase 2

“Trước bàn giao, nhóm ghi rõ các giới hạn vận hành. Ảnh hiện lưu trên filesystem
riêng nhưng Compose chưa mount volume bền vững cho ảnh. Giới hạn upload tại Nginx
cũng cần đồng bộ với mức 5 MiB của backend. Dependency audit còn một cảnh báo mức
high cần được đánh giá; bản đồ có chunk lớn và cần theo dõi khi tối ưu tải trang.

Về chức năng, chưa có refresh token, quản trị tài khoản hay cơ chế vận hành nhiều
instance. Benchmark D3 có kết quả local, còn server trên Kaggle chưa được xác nhận.
Dữ liệu benchmark thô nằm ngoài Git nên cần bàn giao riêng để tái lập số đo.

Nhóm nhận Phase 2 nên bắt đầu từ README, contract, ADR và biên bản kiểm chứng, chạy
lại bộ kiểm tra rồi đo đúng workload cần cải tiến. Cache, xử lý bất đồng bộ hay
microservices chỉ là phương án cần số liệu và ADR, chưa phải quyết định đã chốt.
Nhóm có thể tiếp tục phát triển trên nền hiện tại, nhưng chưa nên đưa hệ thống vào
vận hành cứu hộ thực tế. Em xin cảm ơn thầy cô và các bạn.”

## Câu hỏi giảng viên có thể đặt ra

1. **Bài toán cụ thể là gì?** Tập hợp báo cáo sự cố có tọa độ, xác minh và phân đội;
   giúp người dân theo dõi tiến độ và điều phối viên tránh bỏ sót/phân trùng.
2. **Quy tắc nào quan trọng nhất?** Chỉ báo cáo VERIFIED gắn thảm họa ACTIVE mới được
   phân công; một đội có tối đa một nhiệm vụ đang hoạt động; báo cáo PENDING mới được rút.
3. **Vì sao Modular Monolith?** ADR 001 chọn một ứng dụng cho nhóm nhỏ, giao dịch cục bộ;
   ranh giới module vẫn rõ để đo và cân nhắc tách sau này.
4. **Spring Boot và React làm gì?** Boot cung cấp HTTP/security/cấu hình cho backend;
   React dựng SPA. Quy tắc domain vẫn Java thuần, không phụ thuộc các framework đó.
5. **Có bao nhiêu API và bảo vệ thế nào?** 20 operations nghiệp vụ. Login public,
   còn lại Bearer JWT và role; application kiểm tra ownership. Không có API register.
6. **Schema có quan hệ nào đáng chú ý?** Credential → user, mission → team,
   attachment → report có FK nội module. Các ID xuyên module không dùng FK;
   Reporting lưu geography Point SRID 4326 với GiST index cho lọc bán kính.
7. **Đã deploy đến đâu?** Có Dockerfile/Compose và kiểm chứng local; chưa xác nhận
   server/cloud. Cần TLS, cấu hình secret, volume ảnh, backup và giới hạn upload phù hợp.
8. **Rủi ro kỹ thuật còn gì?** Độ bền ảnh khi thay container, proxy upload,
   cảnh báo dependency, token chưa refresh, thiếu chứng cứ Kaggle và profiling bottleneck.
9. **Thành viên đóng góp thế nào?** Dùng Git author và nội dung commit để đối chiếu:
   P01/B1/UI, Disaster/B2/Rescue UI, Rescue backend, citizen UI, CI/benchmark và docs.
   [Bảng Git](PHASE1_REVIEW.md#dong-gop-git) giữ riêng email, không suy ra năng suất từ số commit.
10. **Phase 2 có bắt buộc microservices/Redis không?** Không. Cần tái lập baseline,
    đo workload/profiling, xác nhận vấn đề rồi lập ADR trước khi đổi kiến trúc.
