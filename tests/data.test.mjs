import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RESORTS } from '../js/data.js';

const byId = Object.fromEntries(RESORTS.map((r) => [r.id, r]));

test('13곳, id 중복 없음', () => {
  assert.equal(RESORTS.length, 13);
  assert.equal(new Set(RESORTS.map((r) => r.id)).size, 13);
});

test('방식별 분류', () => {
  const ids = (mode) => RESORTS.filter((r) => r.mode === mode).map((r) => r.id).sort();
  assert.deepEqual(ids('direct'), ['alpensia', 'jisan', 'oakvalley', 'phoenix', 'welli', 'yongpyong']);
  assert.deepEqual(ids('official'), ['elysian', 'high1', 'konjiam', 'muju', 'o2', 'vivaldi']);
  assert.deepEqual(ids('none'), ['eden']);
});

test('직접 재생 카메라 수와 주소', () => {
  const counts = { yongpyong: 5, phoenix: 7, welli: 6, jisan: 5, alpensia: 1, oakvalley: 5 };
  for (const [id, n] of Object.entries(counts)) {
    assert.equal(byId[id].cams.length, n, id);
    for (const cam of byId[id].cams) {
      assert.ok(cam.name, id);
      if (cam.type === 'hls') assert.match(cam.src, /^https:\/\/.+\.m3u8$/);
      else assert.equal(cam.type, 'youtube');
    }
  }
  assert.equal(byId.alpensia.cams[0].src, 'Aqlk0xGVoBw');
});

test('공식 연결 스키장은 카메라 수만 가진다', () => {
  const counts = { konjiam: 5, high1: 18, muju: 11, o2: 8, elysian: 6, vivaldi: 7 };
  for (const [id, n] of Object.entries(counts)) {
    assert.equal(byId[id].camCount, n, id);
    assert.deepEqual(byId[id].cams, []);
  }
  assert.deepEqual(byId.eden.cams, []);
});

test('공식 페이지 주소는 모두 https, 좌표는 국내 범위', () => {
  for (const r of RESORTS) {
    assert.match(r.officialUrl, /^https:\/\//, r.id);
    assert.ok(r.lat > 33 && r.lat < 39, r.id);
    assert.ok(r.lon > 124 && r.lon < 131, r.id);
  }
});

test('재생 시간 제한은 지산만', () => {
  assert.equal(byId.jisan.limitSec, 30);
  for (const r of RESORTS) if (r.id !== 'jisan') assert.equal(r.limitSec, undefined, r.id);
});

test('데이터 파일에 IP 주소와 토큰이 없다', () => {
  const text = readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
  assert.doesNotMatch(text, /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  assert.doesNotMatch(text, /token=/i);
});

test('휴대폰에서는 모바일 전용 공식 페이지가 있으면 그 주소를 쓴다', async () => {
  const { officialUrlFor } = await import('../js/data.js');
  const mobile = 'https://m.konjiamresort.co.kr/ski/skiLveCam.dev';
  const desktop = 'https://www.konjiamresort.co.kr/ski/liveCam.dev';
  assert.equal(officialUrlFor(byId.konjiam, 'ios'), mobile);
  assert.equal(officialUrlFor(byId.konjiam, 'android'), mobile);
  assert.equal(officialUrlFor(byId.konjiam, 'macos'), desktop);
  assert.equal(officialUrlFor(byId.konjiam, 'windows'), desktop);
  assert.equal(officialUrlFor(byId.high1, 'ios'), byId.high1.officialUrl);
  for (const r of RESORTS) if (r.officialUrlMobile) assert.match(r.officialUrlMobile, /^https:\/\//, r.id);
});
