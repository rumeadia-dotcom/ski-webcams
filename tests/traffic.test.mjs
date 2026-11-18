import test from 'node:test';
import assert from 'node:assert/strict';
import { originsFor, buildDirectionsUrl, parseDirections, formatDuration, loadTraffic } from '../js/traffic.js';
import { RESORTS } from '../js/data.js';
import handler from '../api/traffic.js';

test('출발 도시: 스키장 위치에 따라 3~5곳', () => {
  for (const resort of RESORTS) {
    const names = originsFor(resort).map((o) => o.name);
    assert.ok(names.length >= 3 && names.length <= 5, resort.id);
    assert.equal(new Set(names).size, names.length);
  }
  assert.deepEqual(originsFor({ id: 'konjiam' }).map((o) => o.name), ['서울', '인천', '수원']);
  assert.deepEqual(originsFor({ id: 'muju' }).map((o) => o.name), ['서울', '대전', '대구', '광주']);
  assert.deepEqual(originsFor({ id: 'eden' }).map((o) => o.name), ['부산', '울산', '대구', '창원']);
});

test('길찾기 주소: 경도,위도 순서이고 요약만 요청한다', () => {
  const url = new URL(buildDirectionsUrl({ lon: 126.978, lat: 37.5665 }, { lon: 127.2875, lat: 37.3346 }));
  assert.equal(url.origin + url.pathname, 'https://apis-navi.kakaomobility.com/v1/directions');
  assert.equal(url.searchParams.get('origin'), '126.978,37.5665');
  assert.equal(url.searchParams.get('destination'), '127.2875,37.3346');
  assert.equal(url.searchParams.get('summary'), 'true');
});

test('길찾기 응답 해석', () => {
  const ok = { routes: [{ result_code: 0, summary: { duration: 4349, distance: 52340 } }] };
  assert.deepEqual(parseDirections(ok), { minutes: 72, km: 52 });
  assert.equal(parseDirections({ routes: [{ result_code: 104, result_msg: '실패' }] }), null);
  assert.equal(parseDirections({ routes: [] }), null);
  assert.equal(parseDirections(undefined), null);
});

test('소요 시간 표기', () => {
  assert.equal(formatDuration(45), '45분');
  assert.equal(formatDuration(60), '1시간');
  assert.equal(formatDuration(72), '1시간 12분');
  assert.equal(formatDuration(185), '3시간 5분');
});

function fakeRes() {
  return {
    code: 0, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
}
const okFetch = (calls) => async (url, init) => {
  calls.push({ url, init });
  return { ok: true, json: async () => ({ routes: [{ result_code: 0, summary: { duration: 3600, distance: 50000 } }] }) };
};

test('서버 기능: 키가 없으면 호출하지 않고 저장도 하지 않는다', async () => {
  const calls = [];
  const res = fakeRes();
  await handler({ query: { resort: 'konjiam' } }, res, { key: '', fetch: okFetch(calls) });
  assert.equal(res.code, 503);
  assert.equal(calls.length, 0);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('서버 기능: 없는 스키장은 거절한다', async () => {
  const res = fakeRes();
  await handler({ query: { resort: 'nope' } }, res, { key: 'k', fetch: okFetch([]) });
  assert.equal(res.code, 404);
});

test('서버 기능: 출발 도시별 소요 시간을 돌려주고 10분 저장한다', async () => {
  const calls = [];
  const res = fakeRes();
  await handler({ query: { resort: 'konjiam' } }, res, { key: 'k', fetch: okFetch(calls), now: () => 1000 });
  assert.equal(res.code, 200);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].init.headers.Authorization, 'KakaoAK k');
  assert.deepEqual(res.body, {
    at: 1000,
    routes: [
      { from: '서울', minutes: 60, km: 50 },
      { from: '인천', minutes: 60, km: 50 },
      { from: '수원', minutes: 60, km: 50 },
    ],
  });
  assert.match(res.headers['Cache-Control'], /s-maxage=600/);
  assert.doesNotMatch(JSON.stringify(res.body), /KakaoAK/);
});

test('서버 기능: 일부만 실패하면 그 도시만 비우고, 전부 실패하면 오류로 답한다', async () => {
  let n = 0;
  const flaky = async () => (n++ === 1 ? { ok: false, status: 500 } : { ok: true, json: async () => ({ routes: [{ result_code: 0, summary: { duration: 600, distance: 9000 } }] }) });
  const res = fakeRes();
  await handler({ query: { resort: 'konjiam' } }, res, { key: 'k', fetch: flaky, now: () => 1 });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.routes[1], { from: '인천', minutes: null, km: null });

  const bad = fakeRes();
  await handler({ query: { resort: 'konjiam' } }, bad, { key: 'k', fetch: async () => { throw new Error('x'); } });
  assert.equal(bad.code, 502);
  assert.equal(bad.headers['Cache-Control'], 'no-store');
});

test('화면 쪽 불러오기: 실패하면 null', async () => {
  const body = { at: 1, routes: [{ from: '서울', minutes: 60, km: 50 }] };
  assert.deepEqual(await loadTraffic('konjiam', { fetch: async (url) => { assert.equal(url, '/api/traffic?resort=konjiam'); return { ok: true, json: async () => body }; } }), body);
  assert.equal(await loadTraffic('konjiam', { fetch: async () => ({ ok: false, status: 503 }) }), null);
  assert.equal(await loadTraffic('konjiam', { fetch: async () => { throw new Error('x'); } }), null);
  assert.equal(await loadTraffic('konjiam', { fetch: async () => ({ ok: true, json: async () => ({ routes: [] }) }) }), null);
});
