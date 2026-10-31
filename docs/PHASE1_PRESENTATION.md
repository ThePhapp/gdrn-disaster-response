# Kịch bản thuyết trình Pha 1 — 5-7 phút, mục tiêu 6 phút

Đây là **kịch bản nói**, tách với [trình diễn thao tác 8–10 phút](qa/phase1-demo-script.md).
Mốc mã nguồn: `main 2ddf9d0`, rà soát. Đọc với nhịp vừa, nghỉ ngắn ở mỗi
đoạn; phân bổ 1 + 1,5 + 1,5 + 1 + 1 phút. Thời lượng là ước lượng theo nội dung,
chưa diễn tập có bấm giờ; nhóm nên đọc thử trước buổi báo cáo.

Thứ tự trình bày bám [README](../README.md): bài toán/nghiệp vụ, tổ chức mã và
yêu cầu kỹ thuật, build/deploy/API, rồi vấn đề hiện có và bàn giao Pha 2.
Mở sẵn `docs/openapi.yaml` trong Swagger Editor hoặc Swagger UI cục bộ; chỉ giới
thiệu một yêu cầu/phản hồi để giữ thời lượng. Q&A và trình diễn dài nằm ngoài 5-7 phút.

## 0:00–1:00 — Bài toán và mục tiêu

“Chào thầy cô và các bạn. Nhóm em giới thiệu Global Disaster Response Network,
gọi tắt là GDRN, một hệ thống mô phỏng điều phối ứng phó thảm họa.

Khi xảy ra sự cố, thông tin từ người dân cần được tập hợp, kiểm tra và chuyển cho
đội cứu hộ. Nếu chỉ trao đổi rời rạc, người dân khó theo dõi yêu cầu, còn điều phối
viên khó biết báo cáo nào đã xác minh và đội nào đang bận.

Pha 1 của nhóm xây dựng một luồng cơ bản cho hai đối tượng: người dân gửi báo cáo
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

Người dân xem tiến độ nhiệm vụ của báo cáo mình. Điều phối viên còn có bảng thống kê
để xem số báo cáo, nhiệm vụ và đội rảnh. Lọc ngày dùng múi giờ Việt Nam; số đội là
năng lực hiện tại, không phải lịch sử. Hiện có 20 API nghiệp vụ và 7 màn hình.
Nhóm chưa triển khai cảnh báo, quản lý tài nguyên hay tự động phân đội.”

## 2:30–4:00 — Kiến trúc, thư viện nền tảng và tổ chức mã

“Ứng dụng phía máy chủ là một ứng dụng Java 21 với Spring Boot 3.5.16, tổ chức theo Modular
Monolith. Theo ADR của dự án, lựa chọn này phù hợp nhóm bốn người và giữ triển khai,
giao dịch ở mức đơn giản, trong khi chưa có yêu cầu bắt buộc phải phân tán.

Các phần nghiệp vụ gồm Identity, Disaster, Reporting, Rescue và một mô-đun đọc
Dashboard. Mỗi mô-đun tách API, tầng ứng dụng và hạ tầng; miền nghiệp vụ chứa quy tắc
nghiệp vụ bằng Java thuần. Controller nhận HTTP và chuyển dữ liệu, tầng ứng dụng
điều phối ca sử dụng, còn bộ chuyển đổi xử lý lưu trữ. Dashboard chỉ tổng hợp dữ liệu nên
không tạo thêm miền nghiệp vụ thực thể không cần thiết.

Rescue lấy thông tin báo cáo qua hợp đồng của Reporting; Reporting gọi hợp đồng
của Disaster. Các mô-đun không truy cập bảng hoặc phần triển khai riêng của nhau.
ArchUnit kiểm tra những ranh giới quan trọng này.

Database là PostgreSQL 16 với PostGIS 3.5 để hỗ trợ truy vấn không gian. Identity
và Disaster dùng JPA; Reporting và Rescue dùng JDBC. Flyway quản lý bảy bản chuyển đổi lược đồ,
còn Hibernate chỉ kiểm tra lược đồ. Miền nghiệp vụ không chứa annotation JPA.

Giao diện là React 19, TypeScript và Vite. Nginx phục vụ SPA và chuyển đường dẫn
API đến ứng dụng phía máy chủ. Bản đồ MapLibre là tùy chọn; thiếu cấu hình bản đồ, người dùng
vẫn có thể nhập tọa độ. Xác thực dùng JWT ngắn hạn, phân quyền người dân và điều phối.”

## 4:00–5:00 — Chạy, biên dịch, triển khai và API

“Để chạy trình diễn, nhóm cài Docker Desktop với Linux containers, tạo cấu hình môi
trường qua tập lệnh setup rồi chạy dev.ps1 up. Script biên dịch ba container cơ sở dữ liệu,
ứng dụng phía máy chủ và giao diện, sau đó kiểm tra sức khỏe. Tài khoản trình diễn được lấy từ tệp môi
trường riêng; kho mã không chứa mật khẩu thật.

Ứng dụng phía máy chủ kiểm tra bằng Maven clean xác minh, gồm cả Testcontainers với PostGIS thật.
Giao diện có typecheck, kiểm thử đơn vị và biên dịch môi trường triển khai. Lượt rà soát này đã chạy
thành công 130 kiểm thử ứng dụng phía máy chủ và 93 kiểm thử giao diện.

README có lệnh chạy và đường dẫn Swagger. Tệp docs/openapi.yaml mô tả 20 API
thực tế với yêu cầu, phản hồi, mã lỗi và quyền; có thể import vào Swagger Editor.
Triển khai cục bộ bằng Compose đã có quy trình kiểm chứng. Triển khai cloud chưa
được xác nhận, nên nhóm không trình bày cục bộ trình diễn như một bản môi trường triển khai.”

## 5:00–6:00 — Hạn chế và bàn giao Pha 2

“Trước bàn giao, nhóm ghi rõ các giới hạn vận hành. Ảnh hiện lưu trên filesystem
riêng nhưng Compose chưa mount volume bền vững cho ảnh. Giới hạn tải lên tại Nginx
cũng cần đồng bộ với mức 5 MiB của ứng dụng phía máy chủ. Dependency kiểm tra còn một cảnh báo mức
high cần được đánh giá; bản đồ có chunk lớn và cần theo dõi khi tối ưu tải trang.

Về chức năng, chưa có token làm mới, quản trị tài khoản hay cơ chế vận hành nhiều
instance. Benchmark D3 có kết quả cục bộ và notebook chạy tải CPU đầy đủ
(Java/PostGIS/k6, reset/seed, raw và báo cáo); phiên chạy Kaggle chưa được xác nhận.
Lượt cục bộ đã chạy 16 tổ hợp, 575.066 yêu cầu nghiệp vụ, 0% lỗi;
bảng số liệu, cấu hình và giới hạn được ghi trong mục kiểm thử tải của README.
Dữ liệu đo hiệu năng thô nằm ngoài Git nên cần bàn giao riêng để tái lập số đo.

Nhóm nhận Pha 2 nên bắt đầu từ README, hợp đồng, ADR và biên bản kiểm chứng, chạy
lại bộ kiểm tra rồi đo đúng kịch bản tải cần cải tiến. Cache, xử lý bất đồng bộ hay
vi dịch vụ chỉ là phương án cần số liệu và ADR, chưa phải quyết định đã chốt.
Nhóm có thể tiếp tục phát triển trên nền hiện tại, nhưng chưa nên đưa hệ thống vào
vận hành cứu hộ thực tế. Em xin cảm ơn thầy cô và các bạn.”

## Câu hỏi giảng viên có thể đặt ra

1. **Bài toán cụ thể là gì?** Tập hợp báo cáo sự cố có tọa độ, xác minh và phân đội;
   giúp người dân theo dõi tiến độ và điều phối viên tránh bỏ sót/phân trùng.
2. **Quy tắc nào quan trọng nhất?** Chỉ báo cáo VERIFIED gắn thảm họa ACTIVE mới được
   phân công; một đội có tối đa một nhiệm vụ đang hoạt động; báo cáo PENDING mới được rút.
3. **Vì sao Nguyên khối theo mô-đun?** ADR 001 chọn một ứng dụng cho nhóm nhỏ, giao dịch cục bộ;
   ranh giới mô-đun vẫn rõ để đo và cân nhắc tách sau này.
4. **Spring Boot và React làm gì?** Boot cung cấp HTTP/security/cấu hình cho ứng dụng phía máy chủ;
   React dựng SPA. Quy tắc miền nghiệp vụ vẫn Java thuần, không phụ thuộc các thư viện nền tảng đó.
5. **Có bao nhiêu API và bảo vệ thế nào?** 20 thao tác nghiệp vụ. Đăng nhập công khai,
   còn lại Bearer JWT và vai trò; tầng ứng dụng kiểm tra quyền sở hữu. Không có API register.
6. **Schema có quan hệ nào đáng chú ý?** Credential → người dùng, nhiệm vụ → đội,
   attachment → báo cáo có FK nội mô-đun. Các ID xuyên mô-đun không dùng FK;
   Reporting lưu geography Point SRID 4326 với GiST index cho lọc bán kính.
7. **Đã triển khai đến đâu?** Có Dockerfile/Compose và kiểm chứng cục bộ; chưa xác nhận
   server/cloud. Cần TLS, cấu hình bí mật, volume ảnh, backup và giới hạn tải lên phù hợp.
8. **Rủi ro kỹ thuật còn gì?** Độ bền ảnh khi thay container, proxy tải lên,
   cảnh báo phụ thuộc, token chưa làm mới, thiếu chứng cứ Kaggle và đo chuyên sâu điểm nghẽn.
9. **Thành viên đóng góp thế nào?** Dùng Git author và nội dung commit để đối chiếu:
   P01/B1/UI, Disaster/B2/Rescue UI, Rescue ứng dụng phía máy chủ, người dân UI, CI/benchmark và docs.
   [Bảng Git](PHASE1_REVIEW.md#dong-gop-git) giữ riêng email, không suy ra năng suất từ số commit.
10. **Pha 2 có bắt buộc microservices/Redis không?** Không. Cần tái lập số đo cơ sở,
    đo workload/profiling, xác nhận vấn đề rồi lập ADR trước khi đổi kiến trúc.
