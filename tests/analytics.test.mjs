import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics, MEASUREMENT_ID } from '../js/analytics.js';

// 브라우저 대신 쓰는 최소한의 가짜 환경
function fakeBrowser() {
  const scripts = [];
  const win = {};
  const doc = {
    createElement: () => ({}),
    head: { append: (el) => scripts.push(el) },
  };
  return { win, doc, scripts };
}
const events = (win) => (win.dataLayer ?? []).map((args) => Array.from(args));

test('운영 주소에서만 수집한다', () => {
  for (const host of ['localhost', '127.0.0.1', 'ski-webcams-git-test.vercel.app', '']) {
    const { win, doc, scripts } = fakeBrowser();
    const analytics = createAnalytics({ win, doc, host });
    analytics.track('view_resort', { resort_id: 'jisan' });
    assert.equal(scripts.length, 0, host);
    assert.equal(win.dataLayer, undefined, host);
  }
});

test('운영 주소에서는 측정 스크립트를 한 번 불러오고 설정을 보낸다', () => {
  const { win, doc, scripts } = fakeBrowser();
  createAnalytics({ win, doc, host: 'ski-webcams.vercel.app' });
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].async, true);
  assert.equal(scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`);
  assert.match(MEASUREMENT_ID, /^G-[A-Z0-9]+$/);
  const sent = events(win);
  assert.equal(sent[0][0], 'js');
  assert.deepEqual(sent[1], ['config', MEASUREMENT_ID]);
});

test('공유 표식이 붙은 주소로 들어오면 출처를 공유로 적는다', () => {
  const shared = fakeBrowser();
  createAnalytics({ win: shared.win, doc: shared.doc, host: 'ski-webcams.vercel.app', href: 'https://ski-webcams.vercel.app/?s=1#/resort/jisan' });
  assert.deepEqual(events(shared.win)[1], ['config', MEASUREMENT_ID, {
    page_location: 'https://ski-webcams.vercel.app/?s=1&utm_source=share&utm_medium=social#/resort/jisan',
  }]);
  const plain = fakeBrowser();
  createAnalytics({ win: plain.win, doc: plain.doc, host: 'ski-webcams.vercel.app', href: 'https://ski-webcams.vercel.app/#/resort/jisan' });
  assert.deepEqual(events(plain.win)[1], ['config', MEASUREMENT_ID]);
});

test('이벤트를 이름과 값으로 보낸다', () => {
  const { win, doc } = fakeBrowser();
  const analytics = createAnalytics({ win, doc, host: 'ski-webcams.vercel.app' });
  analytics.track('play_camera', { resort_id: 'jisan', camera_name: '레몬탑승장', auto: true });
  assert.deepEqual(events(win).at(-1), ['event', 'play_camera', { resort_id: 'jisan', camera_name: '레몬탑승장', auto: true }]);
});

test('측정 스크립트 삽입이 실패해도 예외를 던지지 않는다', () => {
  const win = {};
  const doc = { createElement: () => { throw new Error('blocked'); }, head: { append() {} } };
  const analytics = createAnalytics({ win, doc, host: 'ski-webcams.vercel.app' });
  assert.doesNotThrow(() => analytics.track('view_resort', { resort_id: 'muju' }));
});
