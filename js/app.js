import { RESORTS } from './data.js';
import { loadFavorites, toggleFavorite, sortResorts } from './favorites.js';
import { getWeather } from './weather.js';
import { detectEnv, browserAdvice } from './browser.js';
import { createPlayer } from './player.js';
import { parseRoute } from './route.js';

const ADVICE_KEY = 'ski.adviceDismissed';
const storage = safeStorage();
const app = document.getElementById('app');

const state = {
  favorites: loadFavorites(storage),
  weather: undefined, // undefined 불러오는 중 / null 실패 / 객체 성공
};
let player = null;
let autoStart = null; // 상세 화면이 붙은 뒤 첫 번째 웹캠을 재생하는 함수
let adviceDismissed = false; // 저장이 막힌 환경에서도 이번 방문 동안은 닫힌 상태를 유지한다
const env = detectEnv(navigator.userAgent, navigator.maxTouchPoints);

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined; // 저장소 접근이 막힌 환경
  }
}

// ---------- 작은 도구 ----------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value; // 코드에 적힌 고정 SVG 에만 쓴다
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.filter((c) => c != null && c !== false));
  return el;
}

// 비어 있는 자리(null)는 건너뛰고 화면을 바꾼다.
const mount = (...nodes) => app.replaceChildren(...nodes.filter(Boolean));

const svg = (body) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const CLOUD = '<path d="M7 16.5a4 4 0 0 1 .6-7.96 5.5 5.5 0 0 1 10.5 1.5A3.3 3.3 0 0 1 17.5 16.5z"/>';
const ICONS = {
  clear: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  cloudy: svg('<path d="M7 18a4.5 4.5 0 0 1 .7-8.95A6 6 0 0 1 19.2 10.7 3.7 3.7 0 0 1 18 18z"/>'),
  fog: svg('<path d="M4 8h16M4 12h12M6 16h14M4 20h10"/>'),
  rain: svg(`${CLOUD}<path d="M8.5 19.5l-.8 2M12.5 19.5l-.8 2M16.5 19.5l-.8 2"/>`),
  snow: svg('<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/>'),
  thunder: svg(`${CLOUD}<path d="M12.5 17l-2 3h3l-2 3"/>`),
  star: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1L3.2 9.6l6.1-.8z"/></svg>',
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  external: svg('<path d="M14 5h5v5M19 5l-8 8M11 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-5"/>'),
};
const KIND_LABEL = { clear: '맑음', cloudy: '흐림', fog: '안개', rain: '비', snow: '눈', thunder: '뇌우' };

const icon = (name, cls = '') => h('span', { class: `icon ${cls}`, html: ICONS[name] });
const temp = (value) => (typeof value === 'number' ? `${Math.round(value)}°` : '–');
const amount = (value) => (typeof value === 'number' ? (Math.round(value * 10) / 10).toString() : '–');

function dayLabel(day) {
  if (day.isToday) return '오늘';
  const [y, m, d] = day.date.split('-').map(Number);
  return '일월화수목금토'[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function camSummary(resort) {
  if (resort.mode === 'direct') return `웹캠 ${resort.cams.length}`;
  if (resort.mode === 'official') return `웹캠 ${resort.camCount} · 공식 페이지에서 보기`;
  return '웹캠 없음';
}

function officialLink(resort, label, cls) {
  return h('a', { class: cls, href: resort.officialUrl, target: '_blank', rel: 'noopener noreferrer' }, label, icon('external', 'icon-sm'));
}

// ---------- 공통 영역 ----------

function adviceBanner() {
  let dismissed = adviceDismissed;
  try {
    dismissed = dismissed || storage?.getItem(ADVICE_KEY) === '1';
  } catch {
    // 읽지 못하면 안내를 보여 준다.
  }
  const message = browserAdvice(env);
  if (!message || dismissed) return null;
  const banner = h('div', { class: 'advice', role: 'status' },
    h('span', {}, message),
    h('button', {
      class: 'advice-close',
      type: 'button',
      'aria-label': '안내 닫기',
      onclick: () => {
        adviceDismissed = true;
        try {
          storage?.setItem(ADVICE_KEY, '1');
        } catch {
          // 저장 실패는 무시한다.
        }
        banner.remove();
      },
    }, '✕'),
  );
  return banner;
}

function favButton(resort, onChange) {
  const on = state.favorites.includes(resort.id);
  return h('button', {
    class: `fav${on ? ' is-on' : ''}`,
    type: 'button',
    'data-fav': resort.id,
    'aria-pressed': String(on),
    'aria-label': `${resort.name} 즐겨찾기`,
    html: ICONS.star,
    onclick: () => {
      state.favorites = toggleFavorite(storage, resort.id, state.favorites);
      onChange();
      document.querySelector(`[data-fav="${resort.id}"]`)?.focus();
    },
  });
}

function footer() {
  return h('footer', { class: 'footer' },
    h('p', {}, '영상은 각 스키장이 공개한 웹캠입니다. 개장 전이나 야간에는 송출되지 않을 수 있습니다.'),
    h('p', {}, '날씨: ', h('a', { href: 'https://open-meteo.com/', target: '_blank', rel: 'noopener noreferrer' }, 'Open-Meteo'), ' (CC BY 4.0)'),
  );
}

// ---------- 목록 화면 ----------

function listWeather(resort) {
  if (state.weather === undefined) return h('span', { class: 'row-weather is-loading', 'aria-hidden': 'true' }, '…');
  const w = state.weather?.[resort.id];
  if (!w) return null;
  return h('span', { class: 'row-weather', 'aria-label': `${KIND_LABEL[w.kind]}, ${temp(w.temp)}` },
    h('span', { class: 'row-temp' }, temp(w.temp)),
    icon(w.kind, `kind-${w.kind}`),
  );
}

function renderList() {
  document.title = '스키장 웹캠';
  const rows = sortResorts(RESORTS, state.favorites).map((resort) =>
    h('li', { class: 'row' },
      favButton(resort, renderList),
      h('a', { class: 'row-link', href: `#/resort/${resort.id}` },
        h('span', { class: 'row-text' },
          h('span', { class: 'row-name' }, resort.name),
          h('span', { class: 'row-sub' }, camSummary(resort)),
        ),
        listWeather(resort),
      ),
    ),
  );
  mount(
    h('header', { class: 'top' }, h('h1', {}, '스키장 웹캠')),
    adviceBanner(),
    state.weather === null ? h('p', { class: 'notice' }, '날씨 정보를 불러오지 못했습니다.') : null,
    h('ul', { class: 'list' }, ...rows),
    footer(),
  );
}

// ---------- 상세 화면 ----------

function weatherSection(resort) {
  const section = h('section', { class: 'weather', 'aria-label': '날씨' });
  if (state.weather === undefined) {
    section.append(h('p', { class: 'muted' }, '날씨를 불러오는 중…'));
    return section;
  }
  const w = state.weather?.[resort.id];
  if (!w) {
    section.append(h('p', { class: 'muted' }, '날씨 정보를 불러오지 못했습니다.'));
    return section;
  }
  section.append(
    h('div', { class: 'now' },
      icon(w.kind, `icon-lg kind-${w.kind}`),
      h('span', { class: 'now-temp' }, temp(w.temp)),
      h('span', { class: 'now-text' },
        h('strong', {}, KIND_LABEL[w.kind]),
        h('span', {}, `지금 강수량 ${amount(w.precip)}mm`),
      ),
    ),
    h('ol', { class: 'days' }, ...w.days.map((day) =>
      h('li', { class: `day${day.isToday ? ' is-today' : ''}` },
        h('span', { class: 'day-name' }, dayLabel(day)),
        icon(day.kind, `kind-${day.kind}`),
        h('span', { class: 'day-max' }, temp(day.max)),
        h('span', { class: 'day-min' }, temp(day.min)),
        day.snow > 0
          ? h('span', { class: 'day-precip is-snow', 'aria-label': `적설 ${amount(day.snow)}cm` }, `${amount(day.snow)}cm`)
          : h('span', { class: 'day-precip' }, day.precip > 0 ? `${amount(day.precip)}mm` : '-'),
      ),
    )),
    h('p', { class: 'muted small' }, '지난 3일과 앞으로 3일입니다. mm는 강수량, cm는 적설량입니다. 예보 모델 값이라 스키장 발표 수치와 다를 수 있습니다.'),
  );
  return section;
}

function directStage(resort) {
  const media = h('div', { class: 'media' });
  const overlay = h('div', { class: 'overlay', role: 'status' });
  const buttons = resort.cams.map((cam) =>
    h('button', { class: 'cam', type: 'button', onclick: () => start(cam) }, cam.name));
  let current = null;

  const messages = {
    idle: () => [h('p', {}, '카메라를 선택하세요')],
    loading: () => [h('p', {}, '불러오는 중…')],
    playing: () => [],
    blocked: () => [],
    offline: () => [
      h('p', {}, '현재 송출이 없습니다'),
      h('div', { class: 'overlay-actions' },
        h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => start(current) }, '다시 시도'),
        officialLink(resort, '공식 페이지에서 보기', 'btn'),
      ),
    ],
    unsupported: () => [
      h('p', {}, '이 브라우저에서는 재생할 수 없습니다. 새로고침하거나 공식 페이지에서 확인해 주세요.'),
      officialLink(resort, '공식 페이지에서 보기', 'btn'),
    ],
    limit: () => [
      h('p', {}, `${resort.limitSec}초 재생 후 정지했습니다`),
      h('button', { class: 'btn', type: 'button', onclick: () => start(current) }, '계속 보기'),
    ],
  };

  function onState(next) {
    overlay.replaceChildren(...messages[next]());
    overlay.hidden = next === 'playing' || next === 'blocked';
    const active = next === 'loading' || next === 'playing' || next === 'blocked';
    resort.cams.forEach((cam, i) => {
      const on = active && cam === current;
      buttons[i].classList.toggle('is-on', on);
      buttons[i].setAttribute('aria-pressed', String(on));
    });
  }

  function start(cam) {
    current = cam;
    player.play(cam, { limitSec: resort.limitSec });
  }

  player = createPlayer(media, { onState, preferNative: env.os === 'ios' });
  onState('idle');
  autoStart = () => start(resort.cams[0]);

  return [
    h('div', { class: 'stage' }, media, overlay),
    h('div', { class: 'cams', role: 'group', 'aria-label': '카메라' }, ...buttons),
    resort.limitSec
      ? h('p', { class: 'muted small' }, `이 스키장은 공식 페이지와 같이 ${resort.limitSec}초 재생 후 정지합니다.`)
      : null,
    officialLink(resort, '공식 페이지에서 보기', 'text-link'),
  ];
}

function officialStage(resort) {
  return [
    h('div', { class: 'stage stage-plain' },
      h('div', { class: 'overlay' },
        h('p', {}, '이 스키장은 공식 페이지에서만 볼 수 있습니다'),
        officialLink(resort, '공식 웹캠 페이지 열기', 'btn'),
      ),
    ),
  ];
}

function noneStage(resort) {
  return [
    h('div', { class: 'stage stage-plain' },
      h('div', { class: 'overlay' },
        h('p', {}, '공식 사이트에서 웹캠을 제공하지 않습니다'),
        officialLink(resort, '리조트 홈페이지 열기', 'btn'),
      ),
    ),
  ];
}

function renderDetail(resort) {
  document.title = `${resort.name} · 스키장 웹캠`;
  const stage = { direct: directStage, official: officialStage, none: noneStage }[resort.mode](resort);
  const fav = h('span', { class: 'top-fav' });
  const drawFav = () => fav.replaceChildren(favButton(resort, drawFav));
  drawFav();
  const weatherSlot = h('div', { id: 'weather-slot' }, weatherSection(resort));

  mount(
    h('header', { class: 'top' },
      h('a', { class: 'back', href: '#/', 'aria-label': '목록으로', html: ICONS.back }),
      h('h1', {}, resort.name),
      fav,
    ),
    adviceBanner(),
    h('main', { class: 'detail' }, ...stage, weatherSlot),
    footer(),
  );
  // 스키장에 들어오면 첫 번째 웹캠을 바로 재생한다. 가려진 탭에서는 데이터를 쓰지 않도록 건너뛴다.
  if (!document.hidden) {
    try {
      autoStart?.();
    } catch (error) {
      console.error('자동 재생 시작 실패', error); // 재생이 안 되어도 나머지 화면은 그대로 쓴다
    }
  }
}

// ---------- 화면 전환 ----------

let route = { view: 'list' };

function render() {
  player?.destroy(); // 화면을 떠나면 재생을 멈추고 정리한다
  player = null;
  autoStart = null;
  route = parseRoute(location.hash, RESORTS);
  if (route.view === 'detail') renderDetail(route.resort);
  else renderList();
  window.scrollTo(0, 0);
}

let weatherLoading = false;

// 날씨는 화면과 따로 불러온다. 실패했으면 다음 화면 이동 때 다시 시도한다.
function loadWeather() {
  if (weatherLoading || state.weather) return;
  weatherLoading = true;
  getWeather({ storage })
    .catch(() => null)
    .then((weather) => {
      weatherLoading = false;
      state.weather = weather;
      // 재생 중인 영상을 끊지 않도록 상세 화면에서는 날씨 영역만 다시 그린다.
      if (route.view === 'detail') {
        document.getElementById('weather-slot')?.replaceChildren(weatherSection(route.resort));
      } else {
        renderList();
      }
    });
}

window.addEventListener('hashchange', () => {
  render();
  loadWeather();
});
loadWeather(); // 화면 그리기에서 오류가 나더라도 날씨는 불러오도록 먼저 시작한다
render();

