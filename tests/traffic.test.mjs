import test from 'node:test';
import assert from 'node:assert/strict';
import { originsFor, buildDirectionsUrl, parseDirections, formatDuration, loadTraffic } from '../js/traffic.js';
import { RESORTS } from '../js/data.js';
import handler from '../api/traffic.js';

test('출발 도시: 수도권·충청권 도시 7곳', () => {
  const names = originsFor().map((o) => o.name);
  assert.deepEqual(names, ['서울', '의정부', '인천', '안산', '수원', '청주', '대전']);
});

test('길찾기 주소: 경도,위도 순서이고 요약만 요청한다', () => {
  const url = new URL(buildDirectionsUrl({ lon: 126.978, lat: 37.5665 }, { lon: 127.2875, lat: 37.3346 }));
  assert.equal(url.origin + url.pathname, 'https://apis-navi.kakaomobility.com/v1/directions');
  assert.equal(url.searchParams.get('origin'), '126.978,37.5665');
  assert.equal(url.searchParams.get('destination'), '127.2875,37.3346');
  assert.equal(url.searchParams.get('summary'), 'false'); // 구간별 교통 상태가 필요하다
});

test('길찾기 응답 해석', () => {
  const ok = { routes: [{ result_code: 0, summary: { duration: 4349, distance: 52340 } }] };
  assert.deepEqual(parseDirections(ok), { minutes: 72, km: 52, level: null });
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

test('서버 기능: 출발 도시별 소요 시간을 돌려주고 5분 저장한다', async () => {
  const calls = [];
  const res = fakeRes();
  await handler({ query: { resort: 'konjiam' } }, res, { key: 'k', fetch: okFetch(calls), now: () => 1000 });
  assert.equal(res.code, 200);
  assert.equal(calls.length, 7);
  assert.equal(calls[0].init.headers.Authorization, 'KakaoAK k');
  assert.equal(res.body.at, 1000);
  assert.deepEqual(res.body.routes.slice(0, 2), [
    { from: '서울', minutes: 60, km: 50, level: null },
    { from: '의정부', minutes: 60, km: 50, level: null },
  ]);
  assert.equal(res.body.routes.length, 7);
  assert.match(res.headers['Cache-Control'], /s-maxage=300/);
  assert.doesNotMatch(JSON.stringify(res.body), /KakaoAK/);
});

test('서버 기능: 일부만 실패하면 그 도시만 비우고, 전부 실패하면 오류로 답한다', async () => {
  let n = 0;
  const flaky = async () => (n++ === 1 ? { ok: false, status: 500 } : { ok: true, json: async () => ({ routes: [{ result_code: 0, summary: { duration: 600, distance: 9000 } }] }) });
  const res = fakeRes();
  await handler({ query: { resort: 'konjiam' } }, res, { key: 'k', fetch: flaky, now: () => 1 });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.routes[1], { from: '의정부', minutes: null, km: null, level: null });

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

test('서버 기능: 도로에서 먼 스키장은 차로 도착하는 지점으로 길을 찾는다', async () => {
  const calls = [];
  await handler({ query: { resort: 'yongpyong' } }, fakeRes(), { key: 'k', fetch: okFetch(calls) });
  const resort = RESORTS.find((r) => r.id === 'yongpyong');
  assert.ok(resort.drive);
  assert.equal(new URL(calls[0].url).searchParams.get('destination'), `${resort.drive.lon},${resort.drive.lat}`);
  calls.length = 0;
  await handler({ query: { resort: 'konjiam' } }, fakeRes(), { key: 'k', fetch: okFetch(calls) });
  assert.equal(new URL(calls[0].url).searchParams.get('destination'), '127.2875,37.3346');
});

test('정체 정도: 구간별 교통 상태를 거리로 따져 원활·서행·정체로 나눈다', async () => {
  const { congestionLevel } = await import('../js/traffic.js');
  // [상태 코드, 거리(m)] — 1 정체, 2 지체, 3 서행, 4 원활, 0 정보 없음, 6 사고
  const route = (...roads) => ({ routes: [{ result_code: 0, summary: { duration: 600, distance: 1000 }, sections: [{ roads: roads.map(([traffic_state, distance]) => ({ traffic_state, distance })) }] }] });
  const level = (...roads) => parseDirections(route(...roads)).level;
  assert.equal(level([4, 1000]), 'smooth');
  assert.equal(level([4, 960], [1, 40]), 'smooth'); // 막히는 구간 4%
  assert.equal(level([4, 900], [2, 100]), 'slow'); // 정체·지체 10%
  assert.equal(level([4, 750], [3, 250]), 'slow'); // 서행 25%
  assert.equal(level([4, 800], [1, 100], [2, 100]), 'jam'); // 정체·지체 20%
  assert.equal(level([4, 990], [6, 10]), 'jam'); // 사고로 통행 불가인 구간이 있다
  assert.equal(level([0, 600], [4, 400]), null); // 교통 정보가 절반도 안 된다
  assert.equal(level(), null);
  assert.equal(congestionLevel(undefined), null);
});

test('내 출발지: 저장하고, 고른 도시를 맨 앞으로 나눈다', async () => {
  const { loadOrigin, saveOrigin, arrangeRoutes } = await import('../js/traffic.js');
  const map = new Map();
  const storage = { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
  assert.equal(loadOrigin(storage), null);
  saveOrigin(storage, '수원');
  assert.equal(loadOrigin(storage), '수원');
  assert.equal(loadOrigin(undefined), null); // 저장소가 막힌 환경
  saveOrigin(undefined, '수원'); // 예외 없이 지나간다

  const routes = [{ from: '서울' }, { from: '수원' }, { from: '대전' }];
  assert.deepEqual(arrangeRoutes(routes, '수원'), { mine: routes[1], others: [routes[0], routes[2]] });
  assert.deepEqual(arrangeRoutes(routes, null), { mine: null, others: routes });
  assert.deepEqual(arrangeRoutes(routes, '부산'), { mine: null, others: routes }); // 목록에서 빠진 도시
});

test('교통 불러오기는 AbortSignal.timeout 이 없는 브라우저에서도 동작하고, 제한 시간이 지나면 끊는다', async () => {
  const { loadTraffic } = await import('../js/traffic.js');
  const original = AbortSignal.timeout;
  AbortSignal.timeout = undefined;
  try {
    const ok = async (_url, { signal }) => {
      assert.equal(signal.aborted, false);
      return { ok: true, json: async () => ({ routes: [{ from: '서울' }] }) };
    };
    assert.deepEqual(await loadTraffic('jisan', { fetch: ok }), { routes: [{ from: '서울' }] });
    const hang = (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    });
    assert.equal(await loadTraffic('jisan', { fetch: hang, timeoutMs: 20 }), null);
  } finally {
    AbortSignal.timeout = original;
  }
});

test('서버 기능: 정해진 주소가 아니면 카카오를 부르지 않고 거절한다', async () => {
  const odd = [
    '/api/traffic?resort=konjiam&_=123',
    '/api/traffic?_=1&resort=konjiam',
    '/api/traffic?resort=konjiam&',
    '/api/traffic?resort=%6Bonjiam',
    '/api/traffic/?resort=konjiam',
    '/API/traffic?resort=konjiam',
  ];
  for (const url of odd) {
    const calls = [];
    const res = fakeRes();
    await handler({ url, query: { resort: 'konjiam' } }, res, { key: 'k', fetch: okFetch(calls) });
    assert.equal(res.code, 400, url);
    assert.equal(calls.length, 0, url);
    assert.equal(res.headers['Cache-Control'], 'no-store', url);
  }
});

test('서버 기능: 정해진 주소는 그대로 처리한다', async () => {
  const calls = [];
  const res = fakeRes();
  await handler({ url: '/api/traffic?resort=konjiam', query: { resort: 'konjiam' } }, res, { key: 'k', fetch: okFetch(calls) });
  assert.equal(res.code, 200);
  assert.equal(calls.length, 7);
});
