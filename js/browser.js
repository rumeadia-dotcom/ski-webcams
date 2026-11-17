// 접속 환경 판별과 추천 브라우저 안내.
// 추천 근거: 영상(HLS)을 iOS 는 Safari 가 자체 재생하고, 그 외에는 크로미움 계열에서 재생 라이브러리로 재생한다.

export function detectEnv(ua = '', maxTouchPoints = 0) {
  ua = String(ua ?? '');

  let os = 'other';
  if (/iPhone|iPad|iPod/.test(ua)) os = 'ios';
  else if (/Android/.test(ua)) os = 'android';
  else if (/Macintosh/.test(ua)) os = maxTouchPoints > 1 ? 'ios' : 'macos'; // 아이패드는 맥 UA 를 쓴다
  else if (/Windows/.test(ua)) os = 'windows';

  let inApp = null;
  if (/KAKAOTALK/i.test(ua)) inApp = 'kakaotalk';
  else if (/NAVER\(inapp/i.test(ua)) inApp = 'naver';
  else if (/Instagram|FBAN|FBAV|Line\//.test(ua)) inApp = 'other';

  let browser = 'other';
  if (/Edg(e|A|iOS)?\//.test(ua)) browser = 'edge';
  else if (/SamsungBrowser\//.test(ua)) browser = 'samsung';
  else if (/Firefox\/|FxiOS\//.test(ua)) browser = 'firefox';
  else if (/Chrome\/|CriOS\//.test(ua)) browser = 'chrome';
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'safari';

  return { os, browser, inApp };
}

const ALLOWED = {
  ios: ['safari'],
  android: ['chrome', 'samsung', 'edge'],
  macos: ['safari', 'chrome', 'edge'],
  windows: ['chrome', 'edge'],
  other: ['chrome', 'edge'],
};

// 안내가 필요 없으면 null.
export function browserAdvice({ os, browser, inApp }) {
  if (inApp) {
    return os === 'ios'
      ? '앱 안 브라우저에서는 영상이 재생되지 않을 수 있습니다. Safari로 열어 주세요.'
      : '앱 안 브라우저에서는 영상이 재생되지 않을 수 있습니다. Chrome으로 열어 주세요.';
  }
  if ((ALLOWED[os] ?? ALLOWED.other).includes(browser)) return null;
  if (os === 'ios') return 'iPhone·iPad에서는 Safari를 권장합니다.';
  if (os === 'android') return 'Android에서는 Chrome을 권장합니다.';
  if (os === 'macos') return 'Mac에서는 Safari, Chrome 또는 Edge를 권장합니다.';
  return 'PC에서는 Chrome 또는 Edge를 권장합니다.';
}
