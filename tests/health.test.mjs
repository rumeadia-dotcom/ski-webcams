import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCam, pickCam } from '../js/health.js';

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

test('pickCam: 꺼진 카메라를 건너뛰고, 모두 꺼졌으면 null', () => {
  const [a, b, c] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
  const cams = [a, b, c];
  assert.equal(pickCam(cams, new Map([[a, 'live'], [b, 'off']]), a), a);
  assert.equal(pickCam(cams, new Map([[a, 'unknown']]), a), a);
  assert.equal(pickCam(cams, new Map([[a, 'off'], [b, 'off'], [c, 'live']]), a), c);
  assert.equal(pickCam(cams, new Map([[a, 'off'], [b, 'unknown'], [c, 'live']]), a), b);
  assert.equal(pickCam(cams, new Map([[a, 'live'], [b, 'off'], [c, 'live']]), b), a);
  assert.equal(pickCam(cams, new Map([[a, 'off'], [b, 'off'], [c, 'off']]), a), null);
});
