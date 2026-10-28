#!/usr/bin/env python3
"""Prepare additive local product-review data through existing GDRN APIs.

Python standard library only. Default: read-only inventory.
Use --apply to create the missing REVIEW-P1 fixtures. Never deletes business data
or resets credentials. SQL is limited to demo teams (no team-create API), backup,
and correcting the known original demo mission's chronology.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import struct
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.tools/review-data'
SCENARIOS = [
    ('FLOOD', 'Ngập lụt ven sông Hồng', 'HIGH', 21.0285, 105.8542,
     'Nước dâng vào khu dân cư, cần hỗ trợ người cao tuổi và hướng dẫn sơ tán.'),
    ('TYPHOON', 'Bão ảnh hưởng khu dân cư Đà Nẵng', 'CRITICAL', 16.0471, 108.2068,
     'Gió lớn làm tốc mái, cây đổ chắn đường và một số hộ dân bị mất điện.'),
    ('EARTHQUAKE', 'Rung chấn tại Kon Plông', 'MODERATE', 14.75, 108.25,
     'Ghi nhận vết nứt tại nhà dân, cần kiểm tra an toàn công trình.'),
    ('WILDFIRE', 'Cháy thực bì tại Sóc Sơn', 'HIGH', 21.257, 105.85,
     'Khói xuất hiện gần đường dân sinh, cần khoanh vùng và đưa người dân ra xa.'),
    ('TSUNAMI', 'Diễn tập ứng phó sóng thần ven biển Nha Trang', 'LOW', 12.2388, 109.1967,
     'Tình huống diễn tập giả định, kiểm tra tuyến di chuyển đến điểm tập kết an toàn.'),
]


def read_env(path):
    return dict(line.split('=', 1) for line in path.read_text(encoding='utf-8-sig').splitlines()
                if '=' in line and not line.startswith('#'))


class API:
    def __init__(self, base):
        self.base = base.rstrip('/')

    def call(self, method, path, token=None, payload=None, raw=None, content_type=None, expected=(200,)):
        headers = {'Accept': 'image/jpeg, image/png' if path.endswith('/content') else 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        if payload is not None:
            raw, content_type = json.dumps(payload, ensure_ascii=False).encode(), 'application/json'
        if content_type:
            headers['Content-Type'] = content_type
        request = urllib.request.Request(self.base + path, data=raw, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                status, body, media = response.status, response.read(), response.headers.get('Content-Type', '')
        except urllib.error.HTTPError as error:
            status, body, media = error.code, error.read(), error.headers.get('Content-Type', '')
        result = json.loads(body) if body and 'json' in media else body
        if status not in expected:
            code = result.get('code', 'UNKNOWN') if isinstance(result, dict) else 'NON_JSON_RESPONSE'
            raise RuntimeError(f'{method} {path}: HTTP {status} {code}; credentials/body not logged')
        return result

    def pages(self, path, token):
        items, page = [], 0
        while True:
            result = self.call('GET', f'{path}?page={page}&size=100', token)
            items.extend(result['items'])
            page += 1
            if page >= result['totalPages']:
                return items


def image_bytes(kind):
    """Small deterministic schematic fixture, visibly marked DEMO DATA, not a photo."""
    width, height = 560, 320
    pixels = bytearray(bytes((235, 244, 248)) * width * height)

    def rect(x0, y0, x1, y1, color):
        for y in range(y0, y1):
            start = (y * width + x0) * 3
            pixels[start:start + (x1 - x0) * 3] = bytes(color) * (x1 - x0)

    rect(0, 0, width, 60, (26, 50, 68))
    rect(70, 125, 225, 275, (218, 196, 151))
    rect(325, 105, 475, 275, (209, 174, 134))
    rect(120, 170, 163, 230, (40, 65, 76))
    rect(365, 150, 410, 215, (40, 65, 76))
    color = (38, 133, 179) if kind in ('FLOOD', 'TSUNAMI') else (207, 104, 63)
    rect(0, 248, width, height, color)
    for x in range(15, width, 65):
        rect(x, 265, min(x + 35, width), 269, (228, 233, 223))
    glyphs = {'D': ['11110','10001','10001','10001','10001','10001','11110'],
              'E': ['11111','10000','10000','11110','10000','10000','11111'],
              'M': ['10001','11011','10101','10101','10001','10001','10001'],
              'O': ['01110','10001','10001','10001','10001','10001','01110'],
              'A': ['01110','10001','10001','11111','10001','10001','10001'],
              'T': ['11111','00100','00100','00100','00100','00100','00100']}
    x = 22
    for letter in 'DEMO DATA':
        for y, row in enumerate(glyphs.get(letter, [])):
            for col, value in enumerate(row):
                if value == '1':
                    rect(x + col * 4, 16 + y * 4, x + col * 4 + 4, 20 + y * 4, (255, 255, 255))
        x += 28

    def chunk(name, data):
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
    scanlines = b''.join(b'\0' + pixels[y * width * 3:(y + 1) * width * 3] for y in range(height))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
            + chunk(b'tEXt', b'Description\0Synthetic product-review fixture. DEMO DATA. Not a real incident photo.')
            + chunk(b'IDAT', zlib.compress(scanlines)) + chunk(b'IEND', b''))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, default=ROOT / '.env')
    parser.add_argument('--base-url')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    values = read_env(args.env_file)
    base = args.base_url or 'http://127.0.0.1:' + values.get('APP_PORT', '8080')
    url = urllib.parse.urlparse(base)
    if url.scheme != 'http' or url.hostname not in ('127.0.0.1', 'localhost', '::1') or url.path not in ('', '/'):
        raise SystemExit('Only a loopback HTTP demo API may be used.')
    if 'demo' not in values.get('SPRING_PROFILES_ACTIVE', '').split(','):
        raise SystemExit('The local environment must explicitly enable the demo profile.')
    api = API(base)
    actors = {}
    for who in ('CITIZEN_ONE', 'CITIZEN_TWO', 'AUTHORITY'):
        result = api.call('POST', '/api/auth/login', payload={
            'email': values['DEMO_' + who + '_EMAIL'], 'password': values['DEMO_' + who + '_PASSWORD']})
        expected_role = 'AUTHORITY' if who == 'AUTHORITY' else 'CITIZEN'
        if result['user']['role'] != expected_role:
            raise SystemExit('Configured demo actor has an unexpected role.')
        actors[who] = result['accessToken']
    authority = actors['AUTHORITY']
    existing_reports = api.pages('/api/reports', authority)
    existing_disasters = api.pages('/api/disasters', authority)
    if not args.apply:
        print(json.dumps({'api': base, 'visibleReports': len(existing_reports), 'disasters': len(existing_disasters),
                          'dashboard': api.call('GET', '/api/dashboard', authority)}, ensure_ascii=False, indent=2))
        return

    OUT.mkdir(parents=True, exist_ok=True)
    compose = ['docker', 'compose', '--env-file', str(args.env_file)]
    container = subprocess.check_output(compose + ['ps', '-q', 'database'], cwd=ROOT, text=True).strip()
    if not container:
        raise SystemExit('Start this checkout\'s demo database before applying fixtures.')
    backup = OUT / 'backups' / datetime.now().strftime('%Y%m%d-%H%M%S')
    backup.mkdir(parents=True, exist_ok=False)
    with (backup / 'before-seed.sql').open('wb') as stream:
        subprocess.run(['docker', 'exec', container, 'pg_dump', '-U', values['POSTGRES_USER'],
                        '-d', values['POSTGRES_DB']], stdout=stream, check=True)

    def sql(statement):
        result = subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', values['POSTGRES_USER'],
                                 '-d', values['POSTGRES_DB'], '-v', 'ON_ERROR_STOP=1', '-At'],
                                input=statement, text=True, encoding='utf-8', capture_output=True)
        if result.returncode:
            raise RuntimeError('Demo SQL failed; inspect local database diagnostics. No secret is logged.')
        return result.stdout.strip()

    teams = {letter: str(uuid.uuid5(uuid.NAMESPACE_URL, 'gdrn:review-p1:team:' + letter)) for letter in 'ABCD'}
    team_names = {'A': 'Đội review Hà Nội 03', 'B': 'Đội review Miền Trung 04',
                  'C': 'Đội review Cơ động 05', 'D': 'Đội review Y tế 06'}
    entries = ','.join(f"('{team_id}', '{team_names[letter]}')" for letter, team_id in teams.items())
    sql('BEGIN; INSERT INTO rescue_teams(id,name) VALUES ' + entries + ' ON CONFLICT (id) DO NOTHING; COMMIT;')
    # Correct only the known original seed record, retaining durations and IDs.
    sql("""WITH bad AS (
        SELECT m.id, r.verified_at-m.assigned_at AS delta FROM rescue_missions m
        JOIN reporting_reports r ON r.id=m.report_id
        WHERE m.id='00000000-0000-4000-8000-000000000301'
          AND r.id='00000000-0000-4000-8000-000000000201' AND m.assigned_at<r.verified_at)
        UPDATE rescue_missions m SET assigned_at=m.assigned_at+b.delta,
          started_at=m.started_at+b.delta, completed_at=m.completed_at+b.delta,
          updated_at=m.updated_at+b.delta FROM bad b WHERE m.id=b.id;""")

    manifest = {'api': base, 'disasters': {}, 'reports': {}, 'teams': teams, 'missions': {}, 'images': []}

    def save():
        (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    for kind, title, severity, lat, lon, description in SCENARIOS:
        name = 'Review P1 — ' + title
        found = next((d for d in existing_disasters if d['name'] == name), None)
        if found is None:
            found = api.call('POST', '/api/disasters', authority, payload={
                'name': name, 'type': kind, 'severity': severity, 'latitude': lat, 'longitude': lon,
                'description': '[MÔ PHỎNG REVIEW SẢN PHẨM] ' + description}, expected=(201,))
        manifest['disasters'][kind] = found['id']
        save()

    created = set()
    for index in range(1, 37):
        label = f'R{index:02}'
        who = 'CITIZEN_ONE' if index % 2 else 'CITIZEN_TWO'
        kind, _, _, lat, lon, description = SCENARIOS[(index - 1) % len(SCENARIOS)]
        marker = f'[REVIEW-P1 {label}]'
        found = next((r for r in existing_reports if r['description'].startswith(marker)), None)
        if found is None:
            # Withdrawn reports are absent from normal lists; remember them in a separate marker query below.
            hidden_id = sql(f"SELECT id FROM reporting_reports WHERE description LIKE '{marker}%' AND withdrawn_at IS NOT NULL LIMIT 1;")
            if hidden_id:
                manifest['reports'][label] = {'id': hidden_id, 'actor': who, 'type': kind, 'status': 'WITHDRAWN'}
                continue
            found = api.call('POST', '/api/reports', actors[who], payload={
                'type': kind, 'description': marker + ' Dữ liệu mô phỏng. ' + description + f' Điểm tiếp nhận {index:02}.',
                'latitude': round(lat + (index % 4) * .001, 6),
                'longitude': round(lon + (index % 3) * .001, 6)}, expected=(201,))
            created.add(label)
        manifest['reports'][label] = {'id': found['id'], 'actor': who, 'type': kind, 'status': found['status']}
        save()

    # Create evidence while reports are pending, before verification/rejection.
    for label, count in {'R01': 2, 'R02': 1, 'R06': 3, 'R13': 2, 'R17': 1, 'R29': 1}.items():
        report = manifest['reports'][label]
        token = actors[report['actor']]
        path = '/api/reports/' + report['id'] + '/attachments'
        attachments = api.call('GET', path, token)
        for index in range(1, count + 1):
            name = f'review-p1-{label.lower()}-{index}.png'
            found = next((a for a in attachments if a['originalFilename'] == name), None)
            data = image_bytes(report['type'])
            (OUT / 'images').mkdir(exist_ok=True)
            (OUT / 'images' / name).write_bytes(data)
            if found is None:
                if report['status'] != 'PENDING':
                    raise RuntimeError(f'{label} has been reviewed but its expected evidence is missing. Existing state was preserved.')
                boundary = 'gdrn-review-fixture-boundary'
                body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: image/png\r\n\r\n'.encode()
                        + data + f'\r\n--{boundary}--\r\n'.encode())
                found = api.call('POST', path, token, raw=body,
                                 content_type='multipart/form-data; boundary=' + boundary, expected=(201,))
            downloaded = api.call('GET', path + '/' + found['id'] + '/content', authority)
            if not downloaded.startswith(b'\x89PNG'):
                raise RuntimeError('Evidence content is not readable as PNG.')
            manifest['images'].append({'report': label, 'id': found['id'], 'filename': name, 'bytes': found['sizeBytes']})
            save()

    for index in range(13, 33):
        label = f'R{index:02}'
        report = manifest['reports'][label]
        # Resume incomplete initial seeding, but never reset a decision made by a reviewer.
        if report['status'] != 'PENDING':
            continue
        decision = ({'status': 'VERIFIED', 'disasterId': manifest['disasters'][report['type']]}
                    if index <= 28 else {'status': 'REJECTED', 'rejectionReason': 'Dữ liệu mô phỏng: thông tin trùng hoặc chưa đủ cơ sở xác minh.'})
        found = api.call('PATCH', '/api/reports/' + report['id'] + '/verification', authority, payload=decision)
        report['status'] = found['status']
        save()

    for label, team, target in [('R13','A','COMPLETED'), ('R14','B','COMPLETED'), ('R15','A','COMPLETED'),
                                ('R16','A','IN_PROGRESS'), ('R17','B','ASSIGNED')]:
        report = manifest['reports'][label]
        missions = api.call('GET', '/api/rescue-missions?reportId=' + report['id'], authority)['items']
        mission = missions[0] if missions else api.call('POST', '/api/rescue-missions', authority,
                     payload={'reportId': report['id'], 'teamId': teams[team]}, expected=(201,))
        if mission['status'] == 'ASSIGNED' and target in ('IN_PROGRESS', 'COMPLETED'):
            mission = api.call('PATCH', '/api/rescue-missions/' + mission['id'] + '/status', authority,
                               payload={'status': 'IN_PROGRESS'})
        if mission['status'] == 'IN_PROGRESS' and target == 'COMPLETED':
            mission = api.call('PATCH', '/api/rescue-missions/' + mission['id'] + '/status', authority,
                               payload={'status': 'COMPLETED'})
        manifest['missions'][label] = {'id': mission['id'], 'status': mission['status']}
        save()

    for label in ('R33', 'R34'):
        report = manifest['reports'][label]
        if report['status'] == 'PENDING':
            api.call('DELETE', '/api/reports/' + report['id'], actors[report['actor']], expected=(204,))
            report['status'] = 'WITHDRAWN'
    save()
    dashboard = api.call('GET', '/api/dashboard', authority)
    checks = {}
    for who in ('CITIZEN_ONE', 'CITIZEN_TWO'):
        page = api.call('GET', '/api/reports?page=1&size=20', actors[who])
        checks[who + '_second_page'] = bool(page['items'])
    checks['foreign_report_hidden'] = api.call('GET', '/api/reports/' + manifest['reports']['R01']['id'],
                                              actors['CITIZEN_TWO'], expected=(404,))['code'] == 'NOT_FOUND'
    checks['citizen_dashboard_forbidden'] = api.call('GET', '/api/dashboard', actors['CITIZEN_ONE'], expected=(403,))['code'] == 'FORBIDDEN'
    checks['radius_filter'] = api.call('GET', '/api/reports?lat=21.0285&lon=105.8542&radiusMeters=1000', authority)['totalElements'] >= 6
    checks['report_conflict'] = api.call('POST', '/api/rescue-missions', authority,
        payload={'reportId': manifest['reports']['R13']['id'], 'teamId': teams['C']}, expected=(409,))['code'] == 'REPORT_ALREADY_ASSIGNED'
    checks['team_conflict'] = api.call('POST', '/api/rescue-missions', authority,
        payload={'reportId': manifest['reports']['R18']['id'], 'teamId': teams['A']}, expected=(409,))['code'] == 'TEAM_BUSY'
    checks['empty_date_range'] = api.call('GET', '/api/dashboard?from=2000-01-01&to=2000-01-01', authority)['reports'] == {'pending': 0, 'verified': 0, 'rejected': 0}
    today = datetime.now(timezone(timedelta(hours=7))).date().isoformat()
    checks['today_date_range'] = sum(api.call('GET', f'/api/dashboard?from={today}&to={today}', authority)['reports'].values()) >= 34
    checks['available_teams'] = dashboard['teams']['available'] >= 2
    checks['mission_states'] = all(dashboard['missions'][key] > 0 for key in ('assigned', 'inProgress', 'completed'))
    checks['chronology'] = sql('SELECT count(*) FROM rescue_missions m JOIN reporting_reports r ON r.id=m.report_id WHERE m.assigned_at<r.verified_at;') == '0'
    summary = {'api': base, 'newReportsThisRun': len(created), 'reviewReports': len(manifest['reports']),
               'reviewStates': dict(Counter(r['status'] for r in manifest['reports'].values())),
               'evidenceImages': len(manifest['images']), 'dashboard': dashboard, 'checks': checks}
    (OUT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not all(checks.values()):
        raise SystemExit('Some readiness checks failed; existing data was preserved. See .tools/review-data/summary.json.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, urllib.error.URLError, subprocess.CalledProcessError, KeyError) as error:
        # Never print payloads/tokens or configuration values on failure.
        raise SystemExit(str(error) if isinstance(error, RuntimeError) else 'Review setup failed; check the local demo API, Docker and required env keys.') from None
