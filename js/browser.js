// 접속 환경 판별. 재생 방식(iOS 는 자체 재생 우선)과 모바일 전용 공식 페이지 선택에 쓴다.

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
