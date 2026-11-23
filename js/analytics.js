// 방문 통계. Firebase 프로젝트(jhan-e7f61)의 웹 앱 'ski-webcams' 에 연결된 Google Analytics 측정 ID 로 보낸다.
// 측정 ID 는 공개되어도 되는 값이다(브라우저로 전달되는 값). API 키는 쓰지 않는다.
import { isSharedVisit } from './share.js';

export const MEASUREMENT_ID = 'G-RXMW94T77H';

// 운영 주소에서만 수집한다. 로컬 개발과 미리보기 배포가 통계에 섞이지 않게 한다.
const PRODUCTION_HOST = 'ski-webcams.vercel.app';

// 공유 표식이 있는 주소면 utm 을 붙인 주소를, 아니면 null 을 돌려준다.
export function sharedLocation(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!isSharedVisit(url.search)) return null;
  url.searchParams.set('utm_source', 'share');
  url.searchParams.set('utm_medium', 'social');
  return url.href;
}

// 공유 표식과 utm 을 뺀 주소. 측정이 끝난 뒤 주소창을 되돌릴 때 쓴다.
export function cleanLocation(href) {
  const url = new URL(href);
  for (const key of ['s', 'utm_source', 'utm_medium']) url.searchParams.delete(key);
  return url.href;
}

const CLEAN_DELAY_MS = 3000; // 측정 스크립트가 첫 기록을 보낼 시간을 준다

// track(name, params) 하나만 가진 객체를 돌려준다. 통계는 어떤 경우에도 사이트 동작을 막지 않는다.
export function createAnalytics({
  win = globalThis.window,
  doc = globalThis.document,
  host = globalThis.location?.hostname,
  href = globalThis.location?.href,
} = {}) {
  if (host !== PRODUCTION_HOST) return { track() {} };

  try {
    win.dataLayer = win.dataLayer || [];
    // gtag 는 배열이 아니라 arguments 객체를 그대로 넣어야 인식한다.
    win.gtag = function gtag() {
      win.dataLayer.push(arguments);
    };
    win.gtag('js', new Date());
    // 공유 버튼으로 만든 주소(s=1)로 들어온 방문은 출처를 "share", 매체를 "social" 로 적는다.
    // 애널리틱스는 실제 페이지 주소의 utm 값으로 출처를 정한다(설정값으로 넘기는 방법은 전송되지 않는 것을 확인했다).
    // 그래서 측정 스크립트가 주소를 읽기 전에 주소창의 주소에 utm 을 붙여 둔다. 화면은 다시 불러오지 않는다.
    const shared = sharedLocation(href);
    if (shared) win.history?.replaceState(win.history.state, '', shared);
    win.gtag('config', MEASUREMENT_ID);

    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    if (shared) {
      // 표식이 주소에 남으면 새로고침하거나 즐겨찾기로 다시 올 때마다 공유 방문으로 잡힌다.
      // 측정 스크립트가 주소를 읽은 뒤(불러오지 못했을 때도) 표식을 지운다. 그 사이 화면을 옮겼으면 그 주소를 지킨다.
      const clean = () => (win.setTimeout ?? setTimeout)(() => {
        try {
          win.history?.replaceState(win.history.state, '', cleanLocation(win.location?.href ?? shared));
        } catch {
          // 주소를 못 바꿔도 사이트는 그대로 쓴다.
        }
      }, CLEAN_DELAY_MS);
      script.addEventListener?.('load', clean, { once: true });
      script.addEventListener?.('error', clean, { once: true });
    }
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
