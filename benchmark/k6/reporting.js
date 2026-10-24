import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = String(__ENV.BASE_URL || '').replace(/\/$/, '');
const workload = String(__ENV.WORKLOAD || 'read-page');
const targetVus = numberEnv('VUS', 10);
const duration = String(__ENV.DURATION || '30s');
const warmup = String(__ENV.WARMUP || '10s');
const rampDown = String(__ENV.RAMP_DOWN || '10s');
const httpTimeout = String(__ENV.HTTP_TIMEOUT || '5s');
const tokenLifetimeSeconds = numberEnv('JWT_LIFETIME_SECONDS', 900);
const benchmarkSeed = numberEnv('DATA_SEED', 20261024);
const pageSize = numberEnv('PAGE_SIZE', 20);
const pageCount = Math.max(numberEnv('READ_PAGE_COUNT', 20), 1);
const radiusMeters = numberEnv('RADIUS_METERS', 50000);
const centerLatitude = numberEnv('CENTER_LAT', 21.028511);
const centerLongitude = numberEnv('CENTER_LON', 105.804817);

const failedRequests = new Rate('benchmark_request_errors');
const requestCount = new Counter('benchmark_requests');
const endpointLatency = new Trend('benchmark_endpoint_latency', true);

if (!baseUrl) {
  throw new Error('BASE_URL is required; point it at the benchmark application, never a production URL.');
}
if (!['write', 'read-page', 'read-radius', 'mixed'].includes(workload)) {
  throw new Error(`Unsupported WORKLOAD: ${workload}`);
}

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: {
    reporting: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: warmup, target: targetVus },
        { duration, target: targetVus },
        { duration: rampDown, target: 0 },
      ],
      gracefulRampDown: rampDown,
      tags: { benchmark: 'reporting', workload },
    },
  },
  thresholds: {
    'http_req_failed{benchmark:reporting}': ['rate<0.01'],
    benchmark_request_errors: ['rate<0.01'],
  },
  tags: { benchmark: 'reporting', workload },
};

export function setup() {
  const email = String(__ENV.BENCHMARK_EMAIL || '');
  const password = String(__ENV.BENCHMARK_PASSWORD || '');
  if (!email || !password) {
    throw new Error('BENCHMARK_EMAIL and BENCHMARK_PASSWORD are required through the environment.');
  }

  const response = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, timeout: httpTimeout, tags: { benchmark: 'setup' } },
  );
  const loginOk = check(response, { 'login returns 200': (r) => r.status === 200 });
  if (!loginOk) {
    throw new Error(`Benchmark login failed with HTTP ${response.status}; check the benchmark credentials.`);
  }

  const body = response.json();
  const expiresIn = Number(body.expiresIn || tokenLifetimeSeconds);
  const requiredLifetime = parseDurationSeconds(warmup) + parseDurationSeconds(duration)
    + parseDurationSeconds(rampDown) + 30;
  if (expiresIn < requiredLifetime) {
    throw new Error(
      `JWT lifetime (${expiresIn}s) is shorter than the planned run (${requiredLifetime}s). `
        + 'Shorten the run or use the documented token setup; expired-token failures are not domain bottlenecks.',
    );
  }

  return { token: String(body.accessToken), seed: benchmarkSeed, expiresIn };
}

export default function (setupData) {
  const selectedWorkload = selectWorkload(__ITER + __VU, workload, setupData.seed);
  const headers = {
    Authorization: `Bearer ${setupData.token}`,
    'Content-Type': 'application/json',
  };

  if (selectedWorkload === 'write') {
    runWrite(headers, setupData.seed);
    return;
  }
  if (selectedWorkload === 'read-radius') {
    runReadRadius(headers);
    return;
  }
  runReadPage(headers);
}

function runWrite(headers, seed) {
  const offset = deterministicOffset(seed, __VU, __ITER);
  const payload = {
    type: 'FLOOD',
    description: `Benchmark report ${seed}-${__VU}-${__ITER}`,
    latitude: centerLatitude + offset.latitude,
    longitude: centerLongitude + offset.longitude,
  };
  const response = http.post(`${baseUrl}/api/reports`, JSON.stringify(payload), {
    headers,
    timeout: httpTimeout,
    tags: { benchmark: 'reporting', endpoint: 'E07', workload: 'write' },
  });
  record(response, 'E07', 201);
}

function runReadPage(headers) {
  const page = (__ITER + __VU - 1) % pageCount;
  const path = `/api/reports?page=${page}&size=${pageSize}&sort=createdAt,desc`;
  const response = http.get(`${baseUrl}${path}`, {
    headers,
    timeout: httpTimeout,
    tags: { benchmark: 'reporting', endpoint: 'E08-page', workload: 'read-page' },
  });
  record(response, 'E08-page', 200, (body) => Array.isArray(body.items));
}

function runReadRadius(headers) {
  const path = `/api/reports?lat=${centerLatitude}&lon=${centerLongitude}`
    + `&radiusMeters=${radiusMeters}&page=0&size=${pageSize}&sort=createdAt,desc`;
  const response = http.get(`${baseUrl}${path}`, {
    headers,
    timeout: httpTimeout,
    tags: { benchmark: 'reporting', endpoint: 'E08-radius', workload: 'read-radius' },
  });
  record(response, 'E08-radius', 200, (body) => Array.isArray(body.items));
}

function record(response, endpoint, expectedStatus, bodyCheck) {
  const statusOk = response.status === expectedStatus;
  let bodyOk = true;
  if (statusOk && bodyCheck) {
    try {
      bodyOk = bodyCheck(response.json());
    } catch (_) {
      bodyOk = false;
    }
  }
  const ok = check(response, { [`${endpoint} returns ${expectedStatus}`]: () => statusOk, [`${endpoint} body shape`]: () => bodyOk });
  requestCount.add(1, { endpoint });
  failedRequests.add(!ok, { endpoint });
  endpointLatency.add(response.timings.duration, { endpoint });
}

function selectWorkload(index, requested, seed) {
  if (requested !== 'mixed') return requested;
  const bucket = Math.abs(index + seed) % 10;
  if (bucket < 2) return 'write';
  if (bucket < 8) return 'read-page';
  return 'read-radius';
}

function deterministicOffset(seed, vu, iteration) {
  const value = Math.abs((seed * 31 + vu * 17 + iteration * 13) % 1000) / 1000;
  return { latitude: (value - 0.5) * 0.08, longitude: (0.5 - value) * 0.08 };
}

function numberEnv(name, fallback) {
  const value = Number(__ENV[name]);
  return Number.isFinite(value) ? value : fallback;
}

function parseDurationSeconds(value) {
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
  if (!match) throw new Error(`Unsupported duration '${value}'; use ms, s, m or h.`);
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'ms') return amount / 1000;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 3600;
  return amount;
}
