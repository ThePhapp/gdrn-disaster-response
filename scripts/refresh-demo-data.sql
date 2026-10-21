BEGIN;

DO $$
DECLARE
    account_count INTEGER;
BEGIN
    SELECT count(*) INTO account_count
    FROM identity_users
    WHERE email IN (__CITIZEN_ONE__, __CITIZEN_TWO__, __AUTHORITY__);
    IF account_count <> 3 THEN
        RAISE EXCEPTION 'Expected the three configured demo accounts before refreshing business data';
    END IF;
END $$;

DELETE FROM rescue_missions;
DELETE FROM reporting_reports;
DELETE FROM disasters;

INSERT INTO rescue_teams (id, name)
VALUES
    ('00000000-0000-4000-8000-000000000006', 'Đội Cứu hộ Hà Nội 01'),
    ('00000000-0000-4000-8000-000000000008', 'Đội Ứng phó Miền Trung 02')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO disasters
    (id, name, type, severity, description, latitude, longitude, status, version, created_at, updated_at)
VALUES
    ('00000000-0000-4000-8000-000000000101',
     'Ngập lụt khu vực ven sông Hồng', 'FLOOD', 'HIGH',
     'Mưa lớn kéo dài làm nước dâng nhanh, một số tuyến phố ven sông bị ngập và giao thông bị chia cắt.',
     21.0467, 105.8412, 'ACTIVE', 0, now() - interval '4 days', now() - interval '4 days'),
    ('00000000-0000-4000-8000-000000000102',
     'Bão mạnh ảnh hưởng khu vực Đà Nẵng', 'TYPHOON', 'CRITICAL',
     'Gió giật mạnh và mưa lớn gây mất điện cục bộ, cần ưu tiên kiểm tra khu dân cư thấp trũng.',
     16.0471, 108.2068, 'ACTIVE', 0, now() - interval '2 days', now() - interval '2 days'),
    ('00000000-0000-4000-8000-000000000103',
     'Cháy rừng tại khu vực Sóc Sơn', 'WILDFIRE', 'HIGH',
     'Đám cháy đã được khống chế sau khi lực lượng chữa cháy tiếp cận hiện trường và tạo đường băng cản lửa.',
     21.2570, 105.8500, 'RESOLVED', 1, now() - interval '12 days', now() - interval '11 days'),
    ('00000000-0000-4000-8000-000000000104',
     'Động đất khu vực Kon Plông', 'EARTHQUAKE', 'MODERATE',
     'Rung chấn nhẹ được ghi nhận tại nhiều xã, các đội đã hoàn tất kiểm tra công trình và không ghi nhận thiệt hại lớn.',
     14.7500, 108.2500, 'RESOLVED', 1, now() - interval '9 days', now() - interval '8 days'),
    ('00000000-0000-4000-8000-000000000105',
     'Triều cường tại khu vực Cần Thơ', 'FLOOD', 'MODERATE',
     'Triều cường kết hợp mưa lớn làm ngập một số tuyến đường dân sinh, lực lượng địa phương đang đặt biển cảnh báo.',
     10.0452, 105.7469, 'ACTIVE', 0, now() - interval '1 day', now() - interval '1 day');

WITH demo_users AS (
    SELECT
        (min(id::text) FILTER (WHERE email = __CITIZEN_ONE__))::uuid AS citizen_one,
        (min(id::text) FILTER (WHERE email = __CITIZEN_TWO__))::uuid AS citizen_two
    FROM identity_users
),
demo_reports (id, reporter, type, description, latitude, longitude, status, disaster_id, age, decision_delay) AS (
    VALUES
        ('00000000-0000-4000-8000-000000000201', 'one', 'FLOOD',
         'Nước đã tràn vào tầng trệt của ba hộ dân gần bờ sông, người cao tuổi cần được hỗ trợ di chuyển.',
         21.0500, 105.8460, 'VERIFIED', '00000000-0000-4000-8000-000000000101', '4 days', '25 minutes'),
        ('00000000-0000-4000-8000-000000000202', 'two', 'TYPHOON',
         'Một khu dân cư mất điện sau mưa lớn, có mái tôn bị tốc và cần kiểm tra an toàn cho các hộ xung quanh.',
         16.0600, 108.2150, 'VERIFIED', '00000000-0000-4000-8000-000000000102', '7 days', '40 minutes'),
        ('00000000-0000-4000-8000-000000000203', 'one', 'WILDFIRE',
         'Khói còn xuất hiện ở sườn đồi phía bắc, người dân đã rời khỏi khu vực nhưng cần kiểm tra điểm nóng.',
         21.2640, 105.8560, 'VERIFIED', '00000000-0000-4000-8000-000000000103', '5 days', '35 minutes'),
        ('00000000-0000-4000-8000-000000000204', 'two', 'FLOOD',
         'Nước dâng khoảng nửa mét tại tuyến đường vào khu dân cư, một gia đình có trẻ nhỏ đang cần hỗ trợ.',
         10.0500, 105.7520, 'VERIFIED', '00000000-0000-4000-8000-000000000105', '1 day', '30 minutes'),
        ('00000000-0000-4000-8000-000000000205', 'one', 'EARTHQUAKE',
         'Một số vết nứt nhỏ được phát hiện tại nhà văn hóa, khu vực đã được kiểm tra và không còn nguy hiểm.',
         14.7560, 108.2560, 'VERIFIED', '00000000-0000-4000-8000-000000000104', '8 days', '50 minutes'),
        ('00000000-0000-4000-8000-000000000206', 'one', 'FLOOD',
         'Mực nước đang tiếp tục dâng tại ngõ 18, người dân cần bao cát và hướng dẫn di chuyển an toàn.',
         21.0430, 105.8380, 'PENDING', '', '2 hours', '0 minutes'),
        ('00000000-0000-4000-8000-000000000207', 'two', 'TYPHOON',
         'Có tiếng cây đổ gần trường học sau trận gió lớn, chưa xác định có người mắc kẹt.',
         16.0520, 108.2100, 'PENDING', '', '5 hours', '0 minutes'),
        ('00000000-0000-4000-8000-000000000208', 'one', 'FLOOD',
         'Một đoạn đường ven kênh bị ngập sâu, xe máy không thể lưu thông và cần đặt cảnh báo.',
         10.0410, 105.7400, 'PENDING', '', '8 hours', '0 minutes'),
        ('00000000-0000-4000-8000-000000000209', 'two', 'FLOOD',
         'Thông tin trùng với một báo cáo đã được xác minh, không ghi nhận thêm vị trí hoặc tình trạng mới.',
         21.0520, 105.8470, 'REJECTED', '', '4 days', '20 minutes'),
        ('00000000-0000-4000-8000-000000000210', 'one', 'EARTHQUAKE',
         'Báo cáo thiếu thời gian, vị trí cụ thể và hình ảnh xác minh nên chưa đủ cơ sở xử lý.',
         14.7600, 108.2600, 'REJECTED', '', '2 days', '30 minutes')
)
INSERT INTO reporting_reports
    (id, reporter_id, type, description, location, status, created_at, updated_at,
     disaster_id, verified_at, rejection_reason, rejected_at, withdrawn_at, version)
SELECT
    r.id::uuid,
    CASE r.reporter WHEN 'one' THEN u.citizen_one ELSE u.citizen_two END,
    r.type,
    r.description,
    ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography,
    r.status,
    now() - r.age::interval,
    CASE WHEN r.status = 'PENDING' THEN now() - r.age::interval
         ELSE now() - r.age::interval + r.decision_delay::interval END,
    NULLIF(r.disaster_id, '')::uuid,
    CASE WHEN r.status = 'VERIFIED' THEN now() - r.age::interval + r.decision_delay::interval END,
    CASE WHEN r.status = 'REJECTED' THEN CASE r.id
        WHEN '00000000-0000-4000-8000-000000000209' THEN 'Báo cáo trùng nội dung hoặc vị trí với một báo cáo đã xử lý.'
        ELSE 'Thông tin chưa đủ để xác minh tại hiện trường.' END END,
    CASE WHEN r.status = 'REJECTED' THEN now() - r.age::interval + r.decision_delay::interval END,
    NULL,
    CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END
FROM demo_reports r
CROSS JOIN demo_users u;

WITH demo_missions (id, report_id, team_id, status, age, start_delay, complete_delay) AS (
    VALUES
        ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000006', 'COMPLETED', '9 days', '20 minutes', '2 hours'),
        ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000008', 'COMPLETED', '6 days', '15 minutes', '3 hours'),
        ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000006', 'COMPLETED', '4 days', '30 minutes', '4 hours'),
        ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000006', 'IN_PROGRESS', '3 hours', '35 minutes', '0 minutes')
)
INSERT INTO rescue_missions
    (id, report_id, team_id, status, assigned_at, started_at, completed_at, updated_at)
SELECT
    m.id::uuid,
    m.report_id::uuid,
    m.team_id::uuid,
    m.status,
    now() - m.age::interval,
    CASE WHEN m.status = 'IN_PROGRESS' OR m.status = 'COMPLETED'
         THEN now() - m.age::interval + m.start_delay::interval END,
    CASE WHEN m.status = 'COMPLETED'
         THEN now() - m.age::interval + m.complete_delay::interval END,
    CASE WHEN m.status = 'COMPLETED'
         THEN now() - m.age::interval + m.complete_delay::interval
         ELSE now() - m.age::interval + m.start_delay::interval END
FROM demo_missions m;

COMMIT;
