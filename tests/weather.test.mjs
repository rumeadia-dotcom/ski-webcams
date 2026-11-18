import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherKind, buildWeatherUrl, parseWeather, getWeather } from '../js/weather.js';
import { RESORTS } from '../js/data.js';

const two = [
  { id: 'a', lat: 37.5, lon: 128.5 },
  { id: 'b', lat: 35.9, lon: 127.7 },
];

function location(temp, code) {
  return {
    current: { temperature_2m: temp, precipitation: 0.4, rain: 0, snowfall: 0.3, weather_code: code },
    daily: {
      time: ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'],
      weather_code: [53, 3, 51, 63, 73, 1, 0],
      temperature_2m_max: [8.2, 12.1, 6.0, 9.9, 6.0, -2.6, -3.9],
      temperature_2m_min: [5.3, 5.5, 4.4, 5.5, -5.2, -9.1, -11.5],
      precipitation_sum: [3.1, 0, 0.5, 10.1, 1.3, 0, 0],
      snowfall_sum: [0, 0, 0, 0, 2.1, 0, 0],
    },
  };
}

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
}
const okFetch = (body, counter = { n: 0 }) => async () => {
  counter.n += 1;
  return { ok: true, json: async () => body };
};

test('날씨 코드 분류', () => {
  const cases = { 0: 'clear', 1: 'cloudy', 3: 'cloudy', 45: 'fog', 48: 'fog', 51: 'rain', 67: 'rain', 71: 'snow', 77: 'snow', 80: 'rain', 82: 'rain', 85: 'snow', 86: 'snow', 95: 'thunder', 99: 'thunder', 4: 'cloudy' };
  for (const [code, kind] of Object.entries(cases)) assert.equal(weatherKind(Number(code)), kind, code);
  assert.equal(weatherKind(undefined), 'cloudy');
});

test('호출 주소에 필수 조건과 좌표 13쌍이 들어간다', () => {
  const url = new URL(buildWeatherUrl(RESORTS));
  assert.equal(url.origin + url.pathname, 'https://api.open-meteo.com/v1/forecast');
  assert.equal(url.searchParams.get('latitude').split(',').length, 13);
  assert.equal(url.searchParams.get('longitude').split(',').length, 13);
  assert.equal(url.searchParams.get('past_days'), '3');
  assert.equal(url.searchParams.get('forecast_days'), '8'); // 오늘 + 앞으로 7일
  assert.equal(url.searchParams.get('timezone'), 'Asia/Seoul');
  assert.match(url.searchParams.get('current'), /temperature_2m/);
  assert.match(url.searchParams.get('daily'), /snowfall_sum/);
});

test('응답 변환: 여러 곳', () => {
  const w = parseWeather([location(-3.2, 73), location(7.9, 51)], two);
  assert.equal(w.a.temp, -3.2);
  assert.equal(w.a.kind, 'snow');
  assert.equal(w.a.precip, 0.4);
  assert.equal(w.b.kind, 'rain');
  assert.equal(w.a.days.length, 7);
  assert.deepEqual(w.a.days.map((d) => d.isToday), [false, false, false, true, false, false, false]);
  assert.deepEqual(w.a.days[4], { date: '2026-11-18', kind: 'snow', max: 6.0, min: -5.2, precip: 1.3, snow: 2.1, isToday: false });
});

test('응답 변환: 한 곳이면 배열이 아니어도 처리', () => {
  const w = parseWeather(location(1, 0), [two[0]]);
  assert.equal(w.a.kind, 'clear');
});

test('응답 변환: 일부 항목이 빠진 곳은 건너뛴다', () => {
  const w = parseWeather([location(1, 0), { error: true }], two);
  assert.ok(w.a);
  assert.equal(w.b, undefined);
});

test('불러오기 실패는 null', async () => {
  const base = { storage: memoryStorage(), now: () => 1000, resorts: two };
  assert.equal(await getWeather({ ...base, fetch: async () => { throw new Error('offline'); } }), null);
  assert.equal(await getWeather({ ...base, fetch: async () => ({ ok: false, json: async () => ({}) }) }), null);
  assert.equal(await getWeather({ ...base, fetch: async () => ({ ok: true, json: async () => ({ error: true, reason: 'x' }) }) }), null);
});

test('30분 캐시', async () => {
  const storage = memoryStorage();
  const counter = { n: 0 };
  const body = [location(-3.2, 73), location(7.9, 51)];
  const t0 = 1_000_000;
  const first = await getWeather({ fetch: okFetch(body, counter), storage, now: () => t0, resorts: two });
  assert.equal(first.a.temp, -3.2);
  assert.equal(counter.n, 1);
  await getWeather({ fetch: okFetch(body, counter), storage, now: () => t0 + 29 * 60_000, resorts: two });
  assert.equal(counter.n, 1);
  await getWeather({ fetch: okFetch(body, counter), storage, now: () => t0 + 31 * 60_000, resorts: two });
  assert.equal(counter.n, 2);
});

test('저장소가 막혀 있거나 캐시가 깨져도 동작', async () => {
  const throwing = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const body = [location(1, 0), location(2, 0)];
  const w = await getWeather({ fetch: okFetch(body), storage: throwing, now: () => 1, resorts: two });
  assert.equal(w.b.temp, 2);
  const broken = memoryStorage({ 'ski.weather.v2': '{nope' });
  const w2 = await getWeather({ fetch: okFetch(body), storage: broken, now: () => 1, resorts: two });
  assert.equal(w2.a.temp, 1);
});

test('저장소 접근 자체가 예외를 던지는 환경에서도 날씨를 불러온다', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
  try {
    const body = [location(1, 0), location(2, 0)];
    const w = await getWeather({ fetch: okFetch(body), storage: undefined, now: () => 1, resorts: two });
    assert.equal(w.a.temp, 1);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('형태가 맞지 않거나 미래 시각인 캐시는 버린다', async () => {
  const body = [location(1, 0), location(2, 0)];
  const counter = { n: 0 };
  const bad = memoryStorage({ 'ski.weather.v2': JSON.stringify({ at: 1000, data: { a: {} } }) });
  const w = await getWeather({ fetch: okFetch(body, counter), storage: bad, now: () => 1000, resorts: two });
  assert.equal(w.a.temp, 1);
  const future = memoryStorage({ 'ski.weather.v2': JSON.stringify({ at: 9_999_999, data: w }) });
  await getWeather({ fetch: okFetch(body, counter), storage: future, now: () => 1000, resorts: two });
  assert.equal(counter.n, 2);
});

test('응답이 오지 않으면 제한 시간 뒤 null (무한 대기 금지)', async () => {
  const hanging = (_url, { signal } = {}) =>
    new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });
  const started = Date.now();
  const w = await getWeather({ fetch: hanging, storage: memoryStorage(), now: () => 1, resorts: two, timeoutMs: 50 });
  assert.equal(w, null);
  assert.ok(Date.now() - started < 2000);
});

test('응답 본문을 읽다 멈춰도 제한 시간 뒤 null', async () => {
  const stuckBody = async () => ({ ok: true, json: () => new Promise(() => {}) });
  const w = await getWeather({ fetch: stuckBody, storage: memoryStorage(), now: () => 1, resorts: two, timeoutMs: 50 });
  assert.equal(w, null);
});

test('실패 원인을 기록한다', async () => {
  const mod = await import('../js/weather.js');
  const base = { storage: memoryStorage(), now: () => 1, resorts: two, timeoutMs: 50 };
  await getWeather({ ...base, storage: memoryStorage(), fetch: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
  assert.equal(mod.lastWeatherError, 'http-429');
  await getWeather({ ...base, storage: memoryStorage(), fetch: async () => { throw new TypeError('Load failed'); } });
  assert.equal(mod.lastWeatherError, 'network');
  await getWeather({ ...base, storage: memoryStorage(), fetch: () => new Promise(() => {}) });
  assert.equal(mod.lastWeatherError, 'timeout');
  await getWeather({ ...base, storage: memoryStorage(), fetch: async () => ({ ok: true, json: async () => ({ error: true }) }) });
  assert.equal(mod.lastWeatherError, 'empty');
  await getWeather({ ...base, storage: memoryStorage(), fetch: okFetch([location(1, 0), location(2, 0)]) });
  assert.equal(mod.lastWeatherError, null);
});

test('우리 사이트 경유를 먼저 쓰고, 실패하면 날씨 서버에 직접 요청한다', async () => {
  const body = [location(1, 0), location(2, 0)];
  const calls = [];
  const proxyOk = async (url) => { calls.push(url); return { ok: true, json: async () => body }; };
  const w1 = await getWeather({ fetch: proxyOk, storage: memoryStorage(), now: () => 1, resorts: two });
  assert.equal(w1.a.temp, 1);
  assert.deepEqual(calls, ['/api/weather']);

  calls.length = 0;
  const proxyDown = async (url) => {
    calls.push(url);
    if (url === '/api/weather') return { ok: false, status: 502, json: async () => ({}) };
    return { ok: true, json: async () => body };
  };
  const w2 = await getWeather({ fetch: proxyDown, storage: memoryStorage(), now: () => 1, resorts: two });
  assert.equal(w2.b.temp, 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[0], '/api/weather');
  assert.match(calls[1], /^https:\/\/api\.open-meteo\.com\//);
  const mod = await import('../js/weather.js');
  assert.equal(mod.lastWeatherError, null);
});
