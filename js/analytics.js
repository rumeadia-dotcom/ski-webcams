// 방문 통계. Firebase 프로젝트(jhan-e7f61)의 웹 앱 'ski-webcams' 에 연결된 Google Analytics 측정 ID 로 보낸다.
// 측정 ID 는 공개되어도 되는 값이다(브라우저로 전달되는 값). API 키는 쓰지 않는다.
export const MEASUREMENT_ID = 'G-RXMW94T77H';

// 운영 주소에서만 수집한다. 로컬 개발과 미리보기 배포가 통계에 섞이지 않게 한다.
const PRODUCTION_HOST = 'ski-webcams.vercel.app';

// track(name, params) 하나만 가진 객체를 돌려준다. 통계는 어떤 경우에도 사이트 동작을 막지 않는다.
export function createAnalytics({
  win = globalThis.window,
  doc = globalThis.document,
  host = globalThis.location?.hostname,
} = {}) {
  if (host !== PRODUCTION_HOST) return { track() {} };

  try {
    win.dataLayer = win.dataLayer || [];
    // gtag 는 배열이 아니라 arguments 객체를 그대로 넣어야 인식한다.
    win.gtag = function gtag() {
      win.dataLayer.push(arguments);
    };
    win.gtag('js', new Date());
    win.gtag('config', MEASUREMENT_ID);

    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    doc.head.append(script);
  } catch {
    // 스크립트를 넣지 못해도 사이트는 그대로 쓴다.
  }

  return {
    track(name, params = {}) {
      try {
        win.gtag('event', name, params);
      } catch {
        // 통계 실패는 무시한다.
      }
    },
  };
}
