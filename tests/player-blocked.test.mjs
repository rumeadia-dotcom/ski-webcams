import test from 'node:test';
import assert from 'node:assert/strict';

// 화면 없이 플레이어를 돌리기 위한 최소한의 가짜 화면 요소
function fakeDom() {
  const listeners = new Map();
  const video = {
    setAttribute() {}, removeAttribute() {}, pause() {}, load() {},
    canPlayType: () => 'maybe',
    addEventListener: (name, fn) => listeners.set(name, [...(listeners.get(name) ?? []), fn]),
    play: () => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })),
  };
  let child = null;
  const container = {
    append: (el) => { child = el; },
    replaceChildren: () => { child = null; },
    querySelector: () => child,
    get firstChild() { return child; },
  };
  globalThis.document = { createElement: () => video, addEventListener() {}, removeEventListener() {}, hidden: false };
  const fire = (name) => (listeners.get(name) ?? []).forEach((fn) => fn());
  return { container, fire };
}

test('자동 재생이 막힌 상태에서는 내려받기가 이어져도 송출 없음으로 바꾸지 않는다', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { container, fire } = fakeDom();
  const { createPlayer } = await import('../js/player.js');
  const states = [];
  const player = createPlayer(container, { onState: (s) => states.push(s), preferNative: true });
  player.play({ name: '베이스', type: 'hls', src: 'https://stream.example/a.m3u8' });
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(states, ['loading', 'blocked']);

  fire('progress'); // 재생 버튼을 누르기 전에도 브라우저는 영상을 조금씩 내려받는다
  t.mock.timers.tick(20000);
  assert.deepEqual(states, ['loading', 'blocked']);

  fire('playing'); // 사용자가 재생 버튼을 누름
  assert.deepEqual(states, ['loading', 'blocked', 'playing']);
  player.destroy();
});
