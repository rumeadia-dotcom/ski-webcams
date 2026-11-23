import test from 'node:test';
import assert from 'node:assert/strict';
import { shareUrl, sharePageHtml, share, isSharedVisit } from '../js/share.js';

const origin = 'https://example.test';

test('공유 주소: 배포본은 미리보기용 주소, 개발 중에는 화면 주소', () => {
  assert.equal(shareUrl({ origin, pages: true }), 'https://example.test/?s=1');
  assert.equal(shareUrl({ origin, pages: true, resortId: 'jisan' }), 'https://example.test/r/jisan?s=1');
  assert.equal(shareUrl({ origin, pages: true, resortId: 'jisan', cam: 0 }), 'https://example.test/r/jisan?s=1');
  assert.equal(shareUrl({ origin, pages: true, resortId: 'jisan', cam: 2 }), 'https://example.test/r/jisan?cam=3&s=1');
  assert.equal(shareUrl({ origin, pages: false, resortId: 'jisan', cam: 2 }), 'https://example.test/?s=1#/resort/jisan/3');
  assert.equal(shareUrl({ origin, pages: false, resortId: 'jisan' }), 'https://example.test/?s=1#/resort/jisan');
});

test('공유 표식: s=1 일 때만 공유로 온 방문으로 본다', () => {
  assert.equal(isSharedVisit('?s=1'), true);
  assert.equal(isSharedVisit('?cam=3&s=1'), true);
  assert.equal(isSharedVisit('?s=2'), false);
  assert.equal(isSharedVisit('?range=7d'), false);
  assert.equal(isSharedVisit(''), false);
  assert.equal(isSharedVisit(undefined), false);
});

test('미리보기용 페이지는 공유 표식과 카메라 번호를 사이트 화면으로 넘긴다', () => {
  const html = sharePageHtml({ id: 'jisan', name: '지산' }, { siteUrl: origin, image: 'img/og.png' });
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const go = (search) => {
    let target;
    new Function('location', 'URLSearchParams', script)({ search, replace: (url) => { target = url; } }, URLSearchParams);
    return target;
  };
  assert.equal(go(''), '/#/resort/jisan');
  assert.equal(go('?s=1'), '/?s=1#/resort/jisan');
  assert.equal(go('?cam=3&s=1'), '/?s=1#/resort/jisan/3');
  assert.equal(go('?cam=3'), '/#/resort/jisan/3');
  assert.equal(go('?cam=abc&s=9'), '/#/resort/jisan');
});

test('미리보기용 페이지: 스키장 이름이 들어가고 사이트 화면으로 넘긴다', () => {
  const html = sharePageHtml({ id: 'jisan', name: '지산 <포레스트>' }, { siteUrl: origin, image: 'img/og.png' });
  assert.match(html, /<meta property="og:title" content="지산 &lt;포레스트&gt; 실시간 웹캠">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.test\/img\/og\.png">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/example\.test\/r\/jisan">/);
  assert.match(html, /#\/resort\/jisan/);
  assert.doesNotMatch(html, /<포레스트>/);
});

test('공유: 공유 창이 있으면 쓰고, 없으면 주소를 복사한다', async () => {
  const data = { title: '제목', url: 'https://example.test/' };
  const shared = [];
  assert.equal(await share(data, { share: async (d) => shared.push(d) }), 'shared');
  assert.deepEqual(shared, [data]);

  const copied = [];
  assert.equal(await share(data, { clipboard: { writeText: async (t) => copied.push(t) } }), 'copied');
  assert.deepEqual(copied, [data.url]);

  // 공유 창을 닫은 것은 실패가 아니다
  const cancel = Object.assign(new Error('x'), { name: 'AbortError' });
  assert.equal(await share(data, { share: async () => { throw cancel; } }), 'cancelled');
  // 공유 창이 실패하면 복사로 넘어간다
  assert.equal(await share(data, { share: async () => { throw new Error('x'); }, clipboard: { writeText: async () => {} } }), 'copied');
  assert.equal(await share(data, { clipboard: { writeText: async () => { throw new Error('x'); } } }), 'failed');
  assert.equal(await share(data, {}), 'failed');
});
