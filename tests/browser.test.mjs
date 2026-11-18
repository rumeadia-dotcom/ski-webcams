import test from 'node:test';
import assert from 'node:assert/strict';
import { detectEnv } from '../js/browser.js';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  iphoneKakao: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 11.2.0',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  androidSamsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  androidNaver: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.9.5)',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0',
  androidInstagram: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36 Instagram 360.0.0.52.192 Android',
  windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  windowsFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
};

test('환경 판별', () => {
  assert.deepEqual(detectEnv(UA.iphoneSafari), { os: 'ios', browser: 'safari', inApp: null });
  assert.deepEqual(detectEnv(UA.iphoneChrome), { os: 'ios', browser: 'chrome', inApp: null });
  assert.deepEqual(detectEnv(UA.iphoneKakao), { os: 'ios', browser: 'other', inApp: 'kakaotalk' });
  assert.deepEqual(detectEnv(UA.androidChrome), { os: 'android', browser: 'chrome', inApp: null });
  assert.deepEqual(detectEnv(UA.androidSamsung), { os: 'android', browser: 'samsung', inApp: null });
  assert.equal(detectEnv(UA.androidNaver).inApp, 'naver');
  assert.equal(detectEnv(UA.androidInstagram).inApp, 'other');
  assert.deepEqual(detectEnv(UA.androidFirefox), { os: 'android', browser: 'firefox', inApp: null });
  assert.deepEqual(detectEnv(UA.windowsEdge), { os: 'windows', browser: 'edge', inApp: null });
  assert.deepEqual(detectEnv(UA.macSafari), { os: 'macos', browser: 'safari', inApp: null });
});

test('아이패드는 맥 UA 여도 터치 지점으로 iOS 로 본다', () => {
  assert.equal(detectEnv(UA.macSafari, 5).os, 'ios');
  assert.equal(detectEnv(UA.macSafari, 0).os, 'macos');
});

test('빈 UA 에도 예외 없음', () => {
  assert.deepEqual(detectEnv(''), { os: 'other', browser: 'other', inApp: null });
  assert.deepEqual(detectEnv(undefined), { os: 'other', browser: 'other', inApp: null });
});
