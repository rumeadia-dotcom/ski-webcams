import test from 'node:test';
import assert from 'node:assert/strict';
import { pickEngine, youtubeEmbedUrl } from '../js/engine.js';
import { parseRoute } from '../js/route.js';

test('재생 방식 선택: 재생 라이브러리 우선', () => {
  assert.equal(pickEngine({ hlsSupported: true, nativeHls: true }), 'hlsjs');
  assert.equal(pickEngine({ hlsSupported: true, nativeHls: false }), 'hlsjs');
  assert.equal(pickEngine({ hlsSupported: false, nativeHls: true }), 'native');
  assert.equal(pickEngine({ hlsSupported: false, nativeHls: false }), 'none');
});

test('재생 방식 선택: iOS 는 자체 재생이 가능하면 자체 재생 우선', () => {
  assert.equal(pickEngine({ hlsSupported: true, nativeHls: true, preferNative: true }), 'native');
  assert.equal(pickEngine({ hlsSupported: true, nativeHls: false, preferNative: true }), 'hlsjs');
  assert.equal(pickEngine({ hlsSupported: false, nativeHls: false, preferNative: true }), 'none');
});

test('유튜브 삽입 주소', () => {
  assert.equal(youtubeEmbedUrl('abc'), 'https://www.youtube.com/embed/abc?autoplay=1&mute=1&playsinline=1');
});

test('주소 해석', () => {
  const resorts = [{ id: 'jisan' }, { id: 'muju' }];
  assert.deepEqual(parseRoute('', resorts), { view: 'list' });
  assert.deepEqual(parseRoute('#/', resorts), { view: 'list' });
  assert.deepEqual(parseRoute('#/resort/jisan', resorts), { view: 'detail', resort: resorts[0] });
  assert.deepEqual(parseRoute('#/resort/nope', resorts), { view: 'list' });
  assert.deepEqual(parseRoute('#/resort/', resorts), { view: 'list' });
  assert.deepEqual(parseRoute('#/x/y', resorts), { view: 'list' });
  assert.deepEqual(parseRoute(undefined, resorts), { view: 'list' });
  assert.deepEqual(parseRoute('#/resort/%', resorts), { view: 'list' });
  assert.deepEqual(parseRoute('#/resort/%E0%A4%A', resorts), { view: 'list' });
});
