import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCam, decideStart } from '../js/health.js';

const cam = { name: '정상', type: 'hls', src: 'https://stream.example/a.m3u8' };
const reply = (status, body = '') => async () => ({ ok: status >= 200 && status < 300, status, text: async () => body });

test('재생 목록을 받으면 live, 없다고 답하거나 엉뚱한 내용이면 off', async () => {
  assert.equal(await checkCam(cam, { fetchFn: reply(200, '#EXTM3U\n#EXT-X-VERSION:3') }), 'live');
  assert.equal(await checkCam(cam, { fetchFn: reply(404) }), 'off');
  assert.equal(await checkCam(cam, { fetchFn: reply(502) }), 'off');
  assert.equal(await checkCam(cam, { fetchFn: reply(200, '<html>점검 중</html>') }), 'off');
});

test('연결 실패는 off, 시간 초과는 unknown', async () => {
  assert.equal(await checkCam(cam, { fetchFn: async () => { throw new TypeError('Failed to fetch'); } }), 'off');
  const hang = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });
  assert.equal(await checkCam(cam, { fetchFn: hang, timeoutMs: 20 }), 'unknown');
});

test('유튜브처럼 확인할 수 없는 카메라는 요청하지 않고 unknown', async () => {
  let called = 0;
  const state = await checkCam({ name: '유튜브', type: 'youtube', src: 'abc' }, { fetchFn: async () => { called += 1; } });
  assert.equal(state, 'unknown');
  assert.equal(called, 0);
  assert.equal(await checkCam(cam, { fetchFn: null }), 'unknown');
});

test('요청은 캐시 없이 스트림 주소로 보낸다', async () => {
  const seen = [];
  await checkCam(cam, { fetchFn: async (url, init) => { seen.push([url, init.cache]); return { ok: true, text: async () => '#EXTM3U' }; } });
  assert.deepEqual(seen, [[cam.src, 'no-store']]);
});

test('decideStart: 틀려던 카메라의 결과가 오기 전에는 기다린다', () => {
  const [a, b, c] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
  const cams = [a, b, c];
  assert.deepEqual(decideStart(cams, new Map(), a), { action: 'wait' });
  assert.deepEqual(decideStart(cams, new Map([[b, 'live']]), a), { action: 'wait' });
});

test('decideStart: 틀려던 카메라가 꺼지지 않았으면 바로 그 카메라', () => {
  const [a, b] = [{ name: 'a' }, { name: 'b' }];
  assert.deepEqual(decideStart([a, b], new Map([[a, 'live']]), a), { action: 'start', cam: a });
  assert.deepEqual(decideStart([a, b], new Map([[a, 'unknown']]), a), { action: 'start', cam: a });
  assert.deepEqual(decideStart([a, b], new Map([[b, 'live'], [a, 'off']]), b), { action: 'start', cam: b });
});

test('decideStart: 틀려던 카메라가 꺼졌으면, 살아 있다고 확인된 카메라가 나오는 대로 그것을 튼다', () => {
  const [a, b, c] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
  const cams = [a, b, c];
  // 아직 다른 결과가 없으면 기다린다
  assert.deepEqual(decideStart(cams, new Map([[a, 'off']]), a), { action: 'wait' });
  // 늦게 답하는 b 를 기다리지 않고 이미 살아 있다고 확인된 c 를 튼다
  assert.deepEqual(decideStart(cams, new Map([[a, 'off'], [c, 'live']]), a), { action: 'start', cam: c });
  // 여러 대가 확인됐으면 목록에서 앞선 것
  assert.deepEqual(decideStart(cams, new Map([[a, 'off'], [b, 'unknown'], [c, 'live']]), a), { action: 'start', cam: b });
  assert.deepEqual(decideStart(cams, new Map([[a, 'off'], [b, 'off']]), a), { action: 'wait' });
});

test('decideStart: 모두 꺼졌다고 확인되면 allOff', () => {
  const [a, b] = [{ name: 'a' }, { name: 'b' }];
  assert.deepEqual(decideStart([a, b], new Map([[a, 'off'], [b, 'off']]), a), { action: 'allOff' });
});

test('끼워 넣기 화면은 미리 확인하지 않는다', async () => {
  let called = 0;
  const state = await checkCam({ name: '끼움', type: 'embed', src: 'https://example.test/embed' }, { fetchFn: async () => { called += 1; } });
  assert.equal(state, 'unknown');
  assert.equal(called, 0);
});
