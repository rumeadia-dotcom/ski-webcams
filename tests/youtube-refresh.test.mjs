import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RESORTS } from '../js/data.js';
import { normalize, titleMatches, parseLive, parseTitle, parseFeed, parsePageIds, parseApiVideos, chooseReplacement, applyReplacements } from '../scripts/youtube-refresh-lib.mjs';

test('제목 비교: 전각·반각·공백 차이는 무시하고, 뒤에 붙은 날짜는 허용한다', () => {
  assert.equal(normalize('ＬＩＶＥ　 Camera'), 'livecamera');
  assert.ok(titleMatches('Camera 白馬八方尾根 - 2026-03-09 09:05', 'Camera 白馬八方尾根'));
  assert.ok(!titleMatches('天狗山山頂エリア', '天狗山山麓エリア'));
  assert.ok(!titleMatches('아무 제목', ''));
});

test('생중계 여부: 표시가 없으면 모른다고 한다', () => {
  assert.equal(parseLive('..."isLiveNow":true,...'), true);
  assert.equal(parseLive('..."isLiveNow":false,...'), false);
  assert.equal(parseLive('<html>동의 화면</html>'), null);
  assert.equal(parseLive(null), null);
});

test('영상 제목·피드·공식 페이지 읽기', () => {
  assert.equal(parseTitle('<meta name="title" content="A &amp; B">'), 'A & B');
  assert.equal(parseTitle('<html></html>'), null);
  const feed = parseFeed('<feed><entry><yt:videoId>aaaaaaaaaaa</yt:videoId><title>하나</title></entry><entry><yt:videoId>bbbbbbbbbbb</yt:videoId><title>둘 &amp; 셋</title></entry></feed>');
  assert.deepEqual(feed, [{ id: 'aaaaaaaaaaa', title: '하나' }, { id: 'bbbbbbbbbbb', title: '둘 & 셋' }]);
  const page = '<iframe src="https://www.youtube.com/embed/aaaaaaaaaaa?x=1"></iframe><a href="https://youtu.be/bbbbbbbbbbb">x</a><iframe src="https://www.youtube.com/embed/aaaaaaaaaaa">';
  assert.deepEqual(parsePageIds(page), ['aaaaaaaaaaa', 'bbbbbbbbbbb']);
});

test('바꿀 주소 고르기: 확실할 때만 바꾼다', () => {
  const base = { current: 'aaaaaaaaaaa', wantedTitle: '베이스', taken: [] };
  const live = { id: 'bbbbbbbbbbb', title: '베이스', live: true };
  assert.equal(chooseReplacement({ ...base, currentLive: false, candidates: [live] }), 'bbbbbbbbbbb');
  assert.equal(chooseReplacement({ ...base, currentLive: true, candidates: [live] }), null, '지금 주소가 살아 있으면 그대로');
  assert.equal(chooseReplacement({ ...base, currentLive: null, candidates: [live] }), null, '확인 못 했으면 그대로');
  assert.equal(chooseReplacement({ ...base, currentLive: false, candidates: [{ ...live, live: false }] }), null, '끝난 중계로는 안 바꾼다');
  assert.equal(chooseReplacement({ ...base, currentLive: false, candidates: [{ ...live, live: null }] }), null);
  assert.equal(chooseReplacement({ ...base, currentLive: false, candidates: [{ ...live, title: '정상' }] }), null, '제목이 다르면 안 바꾼다');
  assert.equal(chooseReplacement({ ...base, currentLive: false, candidates: [live, { ...live, id: 'ccccccccccc' }] }), null, '후보가 여럿이면 안 바꾼다');
  assert.equal(chooseReplacement({ ...base, currentLive: false, candidates: [live], taken: ['bbbbbbbbbbb'] }), null, '다른 카메라가 쓰는 주소로는 안 바꾼다');
});

test('자료 파일 고치기: 한 번만 나오는 ID 만 바꾼다', () => {
  const text = "yt('가', 'aaaaaaaaaaa'), yt('나', 'bbbbbbbbbbb')";
  assert.equal(applyReplacements(text, [{ from: 'aaaaaaaaaaa', to: 'ccccccccccc' }]), "yt('가', 'ccccccccccc'), yt('나', 'bbbbbbbbbbb')");
  assert.throws(() => applyReplacements(text, [{ from: 'zzzzzzzzzzz', to: 'ccccccccccc' }]));
  assert.throws(() => applyReplacements(text, [{ from: 'aaaaaaaaaaa', to: 'bbbbbbbbbbb' }]));
  assert.throws(() => applyReplacements(text, [{ from: 'aaaaaaaaaaa', to: "x'); evil(" }]));
});

test('갱신 기준 자료는 실제 카메라와 짝이 맞는다', () => {
  const sources = JSON.parse(readFileSync(new URL('../scripts/youtube-sources.json', import.meta.url), 'utf8'));
  const cams = new Map(RESORTS.flatMap((r) => r.cams.map((cam) => [`${r.id}/${cam.name}`, cam])));
  for (const [key, source] of Object.entries(sources)) {
    assert.equal(cams.get(key)?.type, 'youtube', key);
    assert.ok(source.title, key);
    assert.ok(source.channel || source.page, key);
    if (source.channel) assert.match(source.channel, /^UC[\w-]{22}$/, key);
    if (source.page) assert.match(source.page, /^https:\/\//, key);
  }
});

test('공식 API 응답 읽기: 없는 영상은 생중계 아님, 응답이 잘못되면 모름', () => {
  const json = { items: [
    { id: 'aaaaaaaaaaa', snippet: { title: '베이스', liveBroadcastContent: 'live' } },
    { id: 'bbbbbbbbbbb', snippet: { title: '정상', liveBroadcastContent: 'none' } },
  ] };
  assert.deepEqual(parseApiVideos(json, ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc']).map((v) => [v.id, v.live, v.title]), [
    ['aaaaaaaaaaa', true, '베이스'], ['bbbbbbbbbbb', false, '정상'], ['ccccccccccc', false, null],
  ]);
  assert.deepEqual(parseApiVideos(null, ['aaaaaaaaaaa']).map((v) => v.live), [null]);
  assert.deepEqual(parseApiVideos({ error: {} }, ['aaaaaaaaaaa']).map((v) => v.live), [null]);
});
