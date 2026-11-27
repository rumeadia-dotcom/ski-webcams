import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RESORTS } from '../js/data.js';

const byId = Object.fromEntries(RESORTS.map((r) => [r.id, r]));

const KR = RESORTS.filter((r) => r.country !== 'jp');
const JP = RESORTS.filter((r) => r.country === 'jp');

test('국내 13곳 + 일본 13곳, id 중복 없음', () => {
  assert.equal(KR.length, 13);
  assert.equal(JP.length, 13);
  assert.equal(new Set(RESORTS.map((r) => r.id)).size, 26);
});

test('일본 스키장: 국내 뒤에 모여 있고, 유튜브 카메라와 지역 이름을 가진다', () => {
  assert.deepEqual(RESORTS.slice(13), JP);
  const ids = new Set();
  for (const r of JP) {
    assert.equal(r.mode, 'direct', r.id);
    assert.ok(r.area, r.id);
    assert.ok(r.cams.length >= 1, r.id);
    assert.match(r.id, /^[a-z0-9-]+$/, r.id);
    assert.ok(r.lat > 30 && r.lat < 46 && r.lon > 129 && r.lon < 146, r.id);
    for (const cam of r.cams) {
      assert.ok(cam.name, r.id);
      if (cam.type === 'embed') {
        assert.match(cam.src, /^https:\/\/skiday\.app\/[\w/]+\/embed$/, r.id); // 끼워 넣기는 확인한 운영사 주소만
        continue;
      }
      assert.equal(cam.type, 'youtube', r.id);
      assert.match(cam.src, /^[\w-]{11}$/, r.id);
      assert.ok(!ids.has(cam.src), `${r.id} ${cam.src} 중복`);
      ids.add(cam.src);
    }
  }
  assert.equal(ids.size, 43);
});

test('방식별 분류', () => {
  const ids = (mode) => KR.filter((r) => r.mode === mode).map((r) => r.id).sort();
  assert.deepEqual(ids('direct'), ['alpensia', 'jisan', 'oakvalley', 'phoenix', 'welli', 'yongpyong']);
  assert.deepEqual(ids('official'), ['elysian', 'high1', 'konjiam', 'muju', 'o2', 'vivaldi']);
  assert.deepEqual(ids('none'), ['eden']);
});

test('직접 재생 카메라 수와 주소', () => {
  const counts = { yongpyong: 11, phoenix: 7, welli: 6, jisan: 5, alpensia: 1, oakvalley: 5 };
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

test('공식 페이지 주소는 모두 https, 국내 스키장 좌표는 국내 범위', () => {
  for (const r of RESORTS) assert.match(r.officialUrl, /^https:\/\//, r.id);
  for (const r of KR) {
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
  assert.equal(officialUrlFor(byId.welli, 'android'), 'https://m.wellihillipark.com/customer/webcam');
  assert.equal(officialUrlFor(byId.muju, 'ios'), 'https://m.mdysresort.com/webcam/webcam_20151124.asp');
  assert.equal(officialUrlFor(byId.welli, 'windows'), byId.welli.officialUrl);
  for (const r of RESORTS) if (r.officialUrlMobile) assert.match(r.officialUrlMobile, /^https:\/\//, r.id);
});
