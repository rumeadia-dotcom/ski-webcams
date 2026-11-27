import { RESORTS, officialUrlFor, isJapan } from './data.js';
import { loadFavorites, toggleFavorite, sortResorts } from './favorites.js';
import { getWeather, lastWeatherError, weatherNote, amountLabel, boardWeather } from './weather.js';
import { detectEnv } from './browser.js';
import { createPlayer } from './player.js';
import { checkCam, decideStart } from './health.js';
import { parseRoute } from './route.js';
import { createAnalytics } from './analytics.js';
import { share, shareUrl } from './share.js';
import { loadTraffic, formatDuration, loadOrigin, saveOrigin, arrangeRoutes } from './traffic.js';
import { josa } from './text.js';

// 배포용 빌드는 식별값이 붙은 아이콘 경로를 넣어 준다. 개발 중에는 원본 경로를 쓴다.
const BUILT = typeof __ICON_URL__ === 'string';
const ICON_URL = BUILT ? __ICON_URL__ : 'img/sticker-144.png';
const storage = safeStorage();
const analytics = createAnalytics();
const app = document.getElementById('app');

const state = {
  favorites: loadFavorites(storage),
  weather: undefined, // undefined 불러오는 중 / null 실패 / 객체 성공
};
let stopStage = null; // 지금 화면의 영상을 모두 멈추고 정리하는 함수
let autoStart = null; // 상세 화면이 붙은 뒤 웹캠을 재생하는 함수
let currentCam = -1; // 지금 고른 카메라 순서(공유 주소에 쓴다). 없으면 -1
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
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

// 넓은 화면(PC)에서는 왼쪽에 스키장 목록을 늘 두고, 오른쪽에 화면 내용을 그린다.
const wideQuery = window.matchMedia('(min-width: 1100px)');
const isWide = () => wideQuery.matches;
let side = null; // 넓은 화면의 왼쪽 목록
let redrawTopFav = null; // 스키장 화면 제목 옆 즐겨찾기 단추를 다시 그리는 함수

// 비어 있는 자리(null)는 건너뛰고 화면을 바꾼다.
function mount(...nodes) {
  const page = nodes.filter(Boolean);
  app.classList.toggle('is-wide', isWide());
  if (!isWide()) {
    side = null;
    app.replaceChildren(...page);
    return;
  }
  const pageEl = h('div', { class: 'page' }, ...page);
  const old = app.querySelector(':scope > .page');
  // 목록은 그대로 두고 내용만 바꾼다. 목록을 스크롤한 자리가 유지된다.
  if (side?.parentNode === app && old) old.replaceWith(pageEl);
  else {
    side = h('aside', { class: 'side', 'aria-label': '스키장 목록' });
    app.replaceChildren(side, pageEl);
  }
  drawSide();
}

// 날씨를 불러오지 못했을 때의 안내. 원인을 함께 보여 준다.
function weatherFailure(cls) {
  const reason =
    lastWeatherError === 'timeout' ? '응답 시간 초과'
    : lastWeatherError === 'http-429' ? '날씨 서버 요청 한도 초과'
    : lastWeatherError?.startsWith('http-') ? `날씨 서버 오류 ${lastWeatherError.slice(5)}`
    : lastWeatherError === 'network' ? '날씨 서버 연결 실패'
    : lastWeatherError === 'empty' ? '날씨 데이터 없음'
    : null;
  return h('p', { class: cls },
    `날씨 정보를 불러오지 못했습니다${reason ? ` (${reason})` : ''}. `,
    h('button', {
      class: 'link-btn',
      type: 'button',
      onclick: () => {
        state.weather = undefined;
        redrawWeather();
        loadWeather();
      },
    }, '다시 시도'),
  );
}

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
  share: svg('<path d="M12 15V3.5M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v7.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1h-1"/>'),
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

// 목록에서 이 스키장을 누르면 무엇이 나오는지 미리 알려 준다.
function camSummary(resort) {
  if (resort.mode === 'direct') return h('span', { class: 'row-sub is-live' }, `바로 재생 · 카메라 ${resort.cams.length}`);
  if (resort.mode === 'official') return h('span', { class: 'row-sub' }, `공식 페이지 · 카메라 ${resort.camCount}`);
  return h('span', { class: 'row-sub' }, '웹캠 없음');
}

function officialLink(resort, label, cls) {
  return h('a', {
    class: cls,
    href: officialUrlFor(resort, env.os),
    target: '_blank',
    rel: 'noopener noreferrer',
    onclick: () => analytics.track('open_official', { resort_id: resort.id }),
  }, label, icon('external', 'icon-sm'));
}

// 지금 눈이 오는 곳에만 붙이는 눈 내리는 표현(.snowfall). 화면 밖이거나 탭이 가려지면 멈춘다.
const snowWatcher = typeof IntersectionObserver === 'function'
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.classList.toggle('is-paused', !entry.isIntersecting);
    })
  : null;
function watchSnow() {
  snowWatcher?.disconnect();
  for (const el of document.querySelectorAll('.snowfall')) snowWatcher?.observe(el);
}

// 목록 화면 제목 아래의 산 능선. 장식이라 읽기 도구에는 숨긴다.
const RIDGE = '<svg viewBox="0 0 360 44" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
  + '<path class="ridge-far" d="M0 44V30l34-12 22 9 40-21 30 16 26-10 44 20 36-18 30 12 28-9 34 13 36-8v22z"/>'
  + '<path class="ridge-near" d="M0 44V36l46-13 30 10 52-17 38 14 44-9 50 15 44-11 56 9v10z"/>'
  + '</svg>';

// ---------- 공통 영역 ----------

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
      const added = state.favorites.includes(resort.id);
      analytics.track(added ? 'add_favorite' : 'remove_favorite', { resort_id: resort.id });
      const y = window.scrollY;
      onChange();
      // 행이 맨 위로 옮겨가도 보던 자리를 지킨다.
      document.querySelector(`[data-fav="${resort.id}"]`)?.focus({ preventScroll: true });
      window.scrollTo(0, y);
      toast(added ? `${josa(resort.name, '을', '를')} 목록 맨 위에 올렸습니다` : `${resort.name} 즐겨찾기를 해제했습니다`);
    },
  });
}

// 공유 버튼. 휴대폰은 공유 창을 띄우고, 공유 창이 없는 브라우저는 주소를 복사한다.
function shareButton(resort) {
  return h('button', {
    class: 'icon-btn',
    type: 'button',
    'aria-label': resort ? `${resort.name} 공유` : '사이트 공유',
    html: ICONS.share,
    onclick: async () => {
      const url = shareUrl({ origin: location.origin, pages: BUILT, resortId: resort?.id, cam: currentCam });
      const cam = resort?.cams?.[currentCam];
      const title = resort ? `${resort.name}${cam ? ` ${cam.name}` : ''} 실시간 웹캠` : '스키장 웹캠';
      const result = await share({ title, url });
      if (result === 'cancelled') return;
      if (result === 'failed') {
        toast(`복사하지 못했습니다. ${url}`); // 공유되지 않았으므로 공유 횟수에 넣지 않는다
        return;
      }
      analytics.track('share', { resort_id: resort?.id ?? 'site', method: result });
      if (result === 'copied') toast('주소를 복사했습니다');
    },
  });
}

let toastTimer;
function toast(message) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const el = h('div', { class: 'toast', role: 'status' }, message);
  document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), 3000);
}

function footer() {
  return h('footer', { class: 'footer' },
    h('p', {}, '영상은 각 스키장이 공개한 웹캠입니다. 개장 전이나 야간에는 송출되지 않을 수 있습니다.'),
    h('p', {}, '날씨: ', h('a', { href: 'https://open-meteo.com/', target: '_blank', rel: 'noopener noreferrer' }, 'Open-Meteo'), ' (CC BY 4.0)'),
    h('p', {}, '방문 통계를 위해 Google Analytics를 사용합니다.'),
  );
}

// ---------- 목록 화면 ----------

function listWeather(resort) {
  if (state.weather === undefined) return h('span', { class: 'row-weather is-loading', 'aria-hidden': 'true' }, '…');
  const w = state.weather?.[resort.id];
  if (!w) return null;
  const note = weatherNote(w);
  return h('span', { class: 'row-weather', 'aria-label': `${KIND_LABEL[w.kind]}, ${temp(w.temp)}${note ? `, ${note.text}` : ''}` },
    h('span', { class: 'row-now' },
      h('span', { class: 'row-temp' }, temp(w.temp)),
      icon(w.kind, `kind-${w.kind}`),
    ),
    note ? h('span', { class: `row-note kind-${note.kind}` }, note.text) : null,
  );
}

// 스키장 목록. onFav: 즐겨찾기를 바꾼 뒤 다시 그리는 함수. activeId: 지금 보고 있는 스키장
function resortList(onFav, activeId = null) {
  const favCount = RESORTS.filter((r) => state.favorites.includes(r.id)).length;
  const sorted = sortResorts(RESORTS, state.favorites);
  // 즐겨찾기 아래에서 일본 스키장은 지역이 바뀌는 자리마다 구분 제목을 넣는다(일본 · 홋카이도 등).
  const startsGroup = (resort, i) => i >= favCount && isJapan(resort) && (i === favCount || sorted[i - 1].area !== resort.area);
  const rows = sorted.flatMap((resort, i) => [
    startsGroup(resort, i) ? h('li', { class: 'row-group' }, h('h2', { class: 'row-group-title' }, `일본 · ${resort.area}`)) : null,
    h('li', { class: `row${favCount > 0 && i === favCount ? ' is-rest-start' : ''}${state.weather?.[resort.id]?.kind === 'snow' ? ' snowfall' : ''}${resort.id === activeId ? ' is-current' : ''}` },
      favButton(resort, onFav),
      h('a', { class: 'row-link', href: `#/resort/${resort.id}`, 'aria-current': resort.id === activeId ? 'page' : null },
        h('span', { class: 'row-text' },
          h('span', { class: 'row-name' }, resort.name),
          camSummary(resort),
        ),
        listWeather(resort),
      ),
    ),
  ]).filter(Boolean);
  return h('ul', { class: 'list' }, ...rows);
}

// 넓은 화면의 왼쪽 목록을 다시 그린다.
function drawSide() {
  if (!side?.isConnected) return;
  const y = side.scrollTop;
  side.replaceChildren(
    h('div', { class: 'side-head' },
      h('a', { class: 'side-brand', href: '#/' }, '스키장 웹캠',
        h('img', { class: 'app-icon', src: ICON_URL, alt: '', width: '144', height: '144' })),
      shareButton(null),
    ),
    resortList(() => { drawSide(); redrawTopFav?.(); watchSnow(); }, route.view === 'detail' ? route.resort.id : null),
  );
  side.scrollTop = y;
}

function renderList() {
  document.title = '스키장 웹캠';
  mount(
    h('header', { class: 'top' },
      h('h1', { class: 'brand', tabindex: '-1' }, '스키장 웹캠',
        h('img', { class: 'app-icon', src: ICON_URL, alt: '', width: '144', height: '144' })),
      h('span', { class: 'top-actions' }, shareButton(null)),
    ),
    h('div', { class: 'ridge', html: RIDGE }),
    state.weather === null ? weatherFailure('notice') : null,
    h('main', {}, resortList(renderList)),
    footer(),
  );
  watchSnow();
}

// ---------- 상세 화면 ----------

function weatherSection(resort) {
  const section = h('section', { class: 'weather', 'aria-label': '날씨' }, h('h2', { class: 'sr-only' }, '날씨'));
  if (state.weather === undefined) {
    section.classList.add('is-loading'); // 불러온 뒤의 크기만큼 자리를 잡아 둔다
    section.append(h('p', { class: 'muted' }, '날씨를 불러오는 중…'));
    return section;
  }
  const w = state.weather?.[resort.id];
  if (!w) {
    section.append(weatherFailure('muted'));
    return section;
  }
  if (w.kind === 'snow') section.classList.add('snowfall');
  const todayIndex = w.days.findIndex((day) => day.isToday);
  const days = h('ol', { class: 'days', tabindex: '0', 'aria-label': '일별 날씨, 좌우로 스크롤' }, ...w.days.map((day) =>
    h('li', { class: `day${day.isToday ? ' is-today' : ''}` },
      h('span', { class: 'day-name' }, dayLabel(day)),
      icon(day.kind, `kind-${day.kind}`),
      h('span', { class: 'sr-only' }, `${KIND_LABEL[day.kind]}, 최고 `),
      h('span', { class: 'day-max' }, temp(day.max)),
      h('span', { class: 'sr-only' }, ', 최저 '),
      h('span', { class: 'day-min' }, temp(day.min)),
      day.snow > 0
        ? h('span', { class: 'day-precip is-snow' }, h('span', { class: 'sr-only' }, ', 적설 '), amountLabel(day.snow, 'cm'))
        : h('span', { class: 'day-precip' }, day.precip > 0 ? [h('span', { class: 'sr-only' }, ', 강수 '), amountLabel(day.precip, 'mm')] : '-'),
    ),
  ));
  section.append(
    h('div', { class: 'now' },
      icon(w.kind, `icon-lg kind-${w.kind}`),
      h('span', { class: 'now-temp' }, temp(w.temp)),
      h('span', { class: 'now-text' },
        h('strong', {}, KIND_LABEL[w.kind]),
        w.precip > 0 ? h('span', {}, `지금 강수량 ${amount(w.precip)}mm`) : null,
      ),
      w.time ? h('span', { class: 'stamp' }, `${w.time} 기준`) : null,
    ),
    days,
    h('p', { class: 'muted small' }, 'mm 강수량 · cm 적설량. 예보 모델 값이라 스키장 발표와 다를 수 있습니다.'),
  );
  // 어제부터 보이게 맞춘다. 오늘과 앞으로의 예보가 한 화면에 더 들어온다.
  requestAnimationFrame(() => {
    const yesterday = days.children[todayIndex - 1];
    if (yesterday) days.scrollLeft = yesterday.offsetLeft - days.offsetLeft;
  });
  return section;
}

const LEVEL_LABEL = { smooth: '원활', slow: '서행', jam: '정체' };

// 전광판 한 줄: 영상 바로 아래에서 지금 날씨와 내 출발지 소요 시간을 한눈에 보여 준다.
// 조각을 누르면 해당 구역으로 내려간다. 교통은 출발지를 고른 사람에게만 나온다.
const board = { el: null, resort: null, mine: null, ready: false }; // ready: 교통상황을 불러왔는지
function drawBoard() {
  if (!board.el?.isConnected) return; // 영상이 없는 스키장에는 전광판 한 줄이 없다
  const jump = (selector) => () => document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const weather = boardWeather(state.weather?.[board.resort.id], KIND_LABEL);
  const parts = [];
  if (weather) {
    parts.push(h('button', { class: 'board-part', type: 'button', onclick: jump('.weather') },
      h('span', { class: 'sr-only' }, '날씨 '), weather.join(' · '), h('span', { class: 'sr-only' }, ', 날씨로 이동')));
  } else if (state.weather === undefined) {
    parts.push(h('span', { class: 'board-part is-wait' }, '날씨 확인 중'));
  }
  if (board.mine && board.mine.minutes !== null) {
    parts.push(h('button', { class: 'board-part', type: 'button', onclick: jump('.traffic') },
      `${board.mine.from}에서 ${formatDuration(board.mine.minutes)}`,
      LEVEL_LABEL[board.mine.level]
        ? h('span', { class: `level level-${board.mine.level}` }, h('span', { class: 'sr-only' }, ', '), LEVEL_LABEL[board.mine.level])
        : null,
      h('span', { class: 'sr-only' }, ', 교통상황으로 이동')));
  }
  // 출발지를 아직 고르지 않은 사람에게는 소요 시간 기능이 있다는 것을 여기서 알린다.
  if (board.ready && !board.mine && !loadOrigin(storage)) {
    parts.push(h('button', { class: 'board-part is-hint', type: 'button', onclick: jump('.traffic') }, '출발지 고르기'));
  }
  board.el.hidden = parts.length === 0;
  board.el.replaceChildren(...parts);
}

// 교통상황: 스키장 화면에 들어오면 바로 불러온다. 서버가 5분 저장한 결과를 준다.
// 출발지를 한 번 누르면 기억해서, 다음부터는 그 도시를 맨 위에 크게 보여 주고 나머지는 접는다.
function trafficSection(resort) {
  const section = h('section', { class: 'traffic', 'aria-label': '교통상황' });
  const clock = (at) => new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const retry = () => h('button', { class: 'btn-line', type: 'button', onclick: load }, '다시 시도');
  let origin = loadOrigin(storage);

  const level = (route) => (LEVEL_LABEL[route.level]
    ? h('span', { class: `level level-${route.level}` }, h('span', { class: 'sr-only' }, ', '), LEVEL_LABEL[route.level])
    : null);
  const figures = (route) => (route.minutes === null
    ? [h('span', { class: 'muted' }, '확인 안 됨')]
    : [h('strong', {}, formatDuration(route.minutes)), h('span', { class: 'muted' }, ` · ${route.km}km`), level(route)]);

  function draw(data) {
    const { mine, others } = arrangeRoutes(data.routes, origin);
    board.mine = mine;
    board.ready = true;
    drawBoard();
    const pick = (route) => () => {
      origin = route.from;
      saveOrigin(storage, origin);
      analytics.track('set_origin', { origin });
      draw(data);
      section.querySelector('.mine')?.focus();
      toast(`${origin} 출발로 기억했습니다`);
    };
    const list = h('ul', { class: 'routes' }, ...others.map((route) =>
      h('li', {},
        h('button', { class: 'route', type: 'button', onclick: pick(route) },
          h('span', { class: 'route-name' }, route.from),
          h('span', { class: 'route-time' }, ...figures(route)),
          h('span', { class: 'sr-only' }, ', 내 출발지로 지정')))));
    section.replaceChildren(
      h('div', { class: 'traffic-head' },
        h('h2', { class: 'traffic-title' }, '지금 차로 가면'),
        h('span', { class: 'stamp' }, `${clock(data.at)} 기준`)),
      mine
        ? h('p', { class: 'mine', tabindex: '-1' },
            h('span', { class: 'mine-from' }, `${mine.from}에서`),
            h('span', { class: 'mine-time' }, ...figures(mine)))
        : h('p', { class: 'muted small' }, '출발지를 누르면 다음부터 맨 위에 보여 줍니다.'),
      mine ? h('details', { class: 'more' }, h('summary', {}, '출발지 바꾸기'), list) : list,
      h('p', { class: 'muted small' }, '시청 출발 기준 예상 시간 · 5분마다 갱신 · 제공 카카오모빌리티'),
    );
  }

  async function load() {
    // 불러온 뒤의 크기만큼 자리를 미리 잡아 아래 내용이 밀리지 않게 한다.
    section.className = `traffic is-loading${origin ? ' is-compact' : ''}`;
    section.replaceChildren(h('p', { class: 'muted' }, '교통상황을 불러오는 중…'));
    const data = await loadTraffic(resort.id);
    if (!section.isConnected) return; // 그 사이 다른 화면으로 이동했다
    section.className = 'traffic';
    if (!data) {
      section.replaceChildren(
        h('h2', { class: 'traffic-title' }, '지금 차로 가면'),
        h('p', { class: 'muted' }, '교통상황을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'),
        retry());
      return;
    }
    draw(data);
  }

  load();
  return section;
}

const MAX_TILES = 4; // 넓은 화면에서 함께 보는 영상 수의 상한

function directStage(resort, firstCam = 0) {
  const buttons = resort.cams.map((cam) =>
    h('button', { class: 'cam', type: 'button', onclick: () => select(cam) }, cam.name, h('span', { class: 'sr-only' })));
  const off = new Set(); // 이번 화면에서 송출이 없다고 확인된 카메라
  const tiles = []; // 지금 띄운 영상들. 휴대폰은 1개, 넓은 화면은 4개까지
  const stages = h('div', { class: 'stages' });
  // 띄운 영상이 없을 때 안내를 보여 주는 빈 화면
  const emptyOverlay = h('div', { class: 'overlay', role: 'status' });
  const empty = h('div', { class: 'stage' }, emptyOverlay);
  const showEmpty = (...nodes) => emptyOverlay.replaceChildren(...nodes);
  let userChose = false; // 사용자가 직접 카메라를 골랐는지

  // 영상 칸을 다시 넣으면 재생이 끊기므로, 있는 칸은 건드리지 않고 빈 화면만 넣었다 뺀다.
  function layout() {
    stages.dataset.count = String(Math.max(tiles.length, 1));
    if (tiles.length === 0) stages.append(empty);
    else empty.remove();
    currentCam = tiles.length > 0 ? resort.cams.indexOf(tiles[tiles.length - 1].cam) : -1;
    paintButtons();
  }

  function paintButtons() {
    resort.cams.forEach((cam, i) => {
      const on = tiles.some((tile) => tile.cam === cam);
      buttons[i].classList.toggle('is-on', on);
      buttons[i].classList.toggle('is-off', off.has(cam));
      buttons[i].setAttribute('aria-pressed', String(on));
      buttons[i].lastChild.textContent = off.has(cam) ? ', 송출 없음' : '';
    });
  }

  const play = (tile) => tile.player.play(tile.cam, { limitSec: resort.limitSec });

  function addTile(cam, auto) {
    const media = h('div', { class: 'media' });
    const overlay = h('div', { class: 'overlay', role: 'status' });
    const label = h('span', { class: 'stage-label' }, cam.name);
    // auto: 화면에 들어오며 자동으로 시작한 재생인지 여부
    const tile = { cam, auto, playing: false, label, el: h('div', { class: 'stage' }, media, overlay, label), player: null };
    const messages = {
      // 탭이 가려져 멈춘 영상은 저절로 다시 틀지 않는다. 눌러야 다시 나온다.
      idle: () => [
        h('p', {}, '재생을 멈췄습니다'),
        h('button', { class: 'btn', type: 'button', onclick: () => play(tile) }, '다시 재생'),
      ],
      loading: () => [h('p', {}, '불러오는 중…')],
      playing: () => [],
      blocked: () => [],
      offline: () => [
        h('p', {}, h('strong', {}, tile.cam.name), ' 카메라는 현재 송출이 없습니다'),
        h('div', { class: 'overlay-actions' },
          h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => play(tile) }, '다시 시도'),
          officialLink(resort, '공식 페이지에서 보기', 'btn'),
        ),
      ],
      unsupported: () => [
        h('p', {}, '이 브라우저에서는 재생할 수 없습니다. 새로고침하거나 공식 페이지에서 확인해 주세요.'),
        officialLink(resort, '공식 페이지에서 보기', 'btn'),
      ],
      limit: () => [
        h('p', {}, `${resort.limitSec}초 재생 후 정지했습니다`),
        h('button', { class: 'btn', type: 'button', onclick: () => play(tile) }, '계속 보기'),
      ],
    };
    const onState = (next) => {
      // 재생 성공과 송출 없음만 기록한다.
      if (next === 'playing' || next === 'offline') {
        analytics.track(next === 'playing' ? 'play_camera' : 'camera_offline', {
          resort_id: resort.id,
          camera_name: tile.cam.name,
          auto: tile.auto,
        });
      }
      tile.playing = next === 'playing';
      overlay.replaceChildren(...messages[next]());
      overlay.hidden = next === 'playing' || next === 'blocked';
      if (next === 'offline') off.add(tile.cam);
      if (next === 'playing') off.delete(tile.cam);
      paintButtons();
    };
    tile.player = createPlayer(media, { onState, preferNative: env.os === 'ios' });
    tiles.push(tile);
    stages.append(tile.el);
    layout();
    play(tile);
  }

  function removeTile(tile) {
    tile.player.destroy();
    tile.el.remove();
    tiles.splice(tiles.indexOf(tile), 1);
    if (tiles.length === 0) showEmpty(h('p', {}, '카메라를 선택하세요'));
    layout();
  }

  // 카메라 단추를 눌렀을 때. 휴대폰은 보던 영상을 바꾸고, 넓은 화면은 함께 보기에 넣거나 뺀다.
  function select(cam) {
    userChose = true;
    const max = isWide() ? MAX_TILES : 1;
    const shown = tiles.find((tile) => tile.cam === cam);
    if (shown && max > 1) {
      removeTile(shown);
      return;
    }
    if (max === 1 && tiles.length > 0) {
      // 창을 좁혀 여러 개가 남아 있었다면 하나만 남긴다.
      while (tiles.length > 1) removeTile(tiles[tiles.length - 1]);
      const tile = tiles[0];
      tile.cam = cam;
      tile.auto = false;
      tile.label.textContent = cam.name;
      layout();
      play(tile);
      return;
    }
    if (tiles.length >= max) {
      toast(`한 번에 ${MAX_TILES}대까지 볼 수 있습니다. 보고 있는 카메라를 하나 끄고 골라 주세요`);
      return;
    }
    addTile(cam, false);
  }

  // 확인해 보니 모든 카메라가 꺼져 있을 때: 재생을 기다리게 하지 않고 바로 알린다.
  function showAllOff() {
    showEmpty(
      h('p', {}, '지금은 모든 카메라의 송출이 없습니다'),
      h('div', { class: 'overlay-actions' },
        h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => autoStart?.() }, '다시 확인'),
        officialLink(resort, '공식 페이지에서 보기', 'btn'),
      ),
    );
  }

  stopStage = () => tiles.forEach((tile) => tile.player.destroy());
  showEmpty(h('p', {}, '카메라를 선택하세요'));
  layout();
  // 들어오면 각 카메라의 스트림이 살아 있는지 먼저 확인하고, 꺼진 카메라는 건너뛰어 재생한다.
  let checkRun = 0;
  autoStart = () => {
    const mine = ++checkRun;
    const preferred = resort.cams[firstCam] ?? resort.cams[0];
    const states = new Map();
    let decided = false;
    userChose = false;
    showEmpty(h('p', {}, '불러오는 중…'));

    const onResult = (cam, state) => {
      // 그 사이 화면을 떠났거나 "다시 확인"을 눌렀으면 이 결과는 버린다.
      if (mine !== checkRun || !stages.isConnected) return;
      states.set(cam, state);
      // 지금 잘 나오고 있는 카메라는 확인 요청이 한 번 실패했다고 꺼짐으로 바꾸지 않는다.
      const playingNow = tiles.some((tile) => tile.cam === cam && tile.playing);
      if (state === 'off' && !playingNow) off.add(cam);
      else if (state !== 'off') off.delete(cam);
      paintButtons();

      // 사용자가 직접 카메라를 골랐으면 자동 재생은 하지 않는다.
      if (decided || userChose || tiles.length > 0) return;
      const decision = decideStart(resort.cams, states, preferred);
      if (decision.action === 'wait') return;
      decided = true;
      if (decision.action === 'allOff') {
        showAllOff();
        return;
      }
      // 확인하는 사이 탭이 가려졌으면 틀지 않는다. 보지 않는 영상이 데이터를 쓰지 않게 한다.
      if (document.hidden) {
        showEmpty(h('p', {}, '카메라를 선택하세요'));
        return;
      }
      addTile(decision.cam, true);
      // 공유받은 주소가 가리킨 카메라가 꺼져 있을 때만 바뀐 것을 알린다.
      if (decision.cam !== preferred && firstCam > 0) {
        toast(`${preferred.name} 카메라는 송출이 없어 ${decision.cam.name} 카메라를 보여 줍니다`);
      }
    };
    // 틀려던 카메라는 재생 시작을 붙잡고 있으므로 짧게만 기다린다. 나머지는 늦게 답하는 서버도 있어 넉넉히 기다려 표시한다.
    for (const cam of resort.cams) {
      checkCam(cam, { timeoutMs: cam === preferred ? 4000 : 12000 }).then((state) => onResult(cam, state));
    }
  };

  return [
    stages,
    // 카메라와 공식 페이지 링크가 한 격자를 나눠 쓴다. 카메라가 홀수면 링크가 빈칸을 채우고, 짝수면 한 줄을 차지한다.
    h('div', { class: 'cams' },
      h('div', { class: 'cam-group', role: 'group', 'aria-label': '카메라' }, ...buttons),
      officialLink(resort, '공식 페이지에서 보기', `cam cam-link${resort.cams.length % 2 === 0 ? ' is-wide' : ''}`)),
    resort.cams.length > 1
      ? h('p', { class: 'muted small multi-hint' }, `카메라를 누르면 함께 보기에 추가되고, 다시 누르면 꺼집니다. 한 번에 ${MAX_TILES}대까지 볼 수 있습니다.`)
      : null,
    resort.limitSec
      ? h('p', { class: 'muted small' }, `이 스키장은 공식 페이지와 같이 ${resort.limitSec}초 재생 후 정지합니다.`)
      : null,
  ];
}

function officialStage(resort) {
  return [
    h('section', { class: 'linkout', 'aria-label': '웹캠' },
      h('p', {}, `웹캠 ${resort.camCount}대는 공식 페이지에서 볼 수 있습니다.`),
      officialLink(resort, '공식 웹캠 페이지 열기', 'btn'),
    ),
  ];
}

function noneStage(resort) {
  return [
    h('section', { class: 'linkout', 'aria-label': '웹캠' },
      h('p', {}, '이 스키장은 공개된 웹캠이 없습니다.'),
      officialLink(resort, '리조트 홈페이지 열기', 'btn'),
    ),
  ];
}

function renderDetail(resort, firstCam) {
  document.title = `${resort.name} · 스키장 웹캠`;
  analytics.track('view_resort', { resort_id: resort.id, resort_mode: resort.mode });
  const stage = { direct: directStage, official: officialStage, none: noneStage }[resort.mode](resort, firstCam);
  const fav = h('span', { class: 'top-fav' });
  const drawFav = () => fav.replaceChildren(favButton(resort, () => { drawFav(); drawSide(); }));
  redrawTopFav = drawFav;
  drawFav();
  const weatherSlot = h('div', { id: 'weather-slot' }, weatherSection(resort));
  board.resort = resort;
  board.mine = null;
  board.ready = false;
  // 전광판 한 줄은 영상에 붙어 있을 때만 둔다. 영상이 없으면 바로 아래 날씨 카드와 내용이 겹친다.
  board.el = resort.mode === 'direct' ? h('div', { class: 'board is-attached', role: 'group', 'aria-label': '지금 상황 요약' }) : null;

  mount(
    h('header', { class: 'top' },
      h('a', { class: 'back', href: '#/', 'aria-label': '목록으로', html: ICONS.back }),
      h('h1', { tabindex: '-1' }, resort.name),
      h('span', { class: 'top-actions' }, shareButton(resort), fav),
    ),
    // 세 묶음: 보기(영상·요약·카메라), 날씨, 교통. 묶음 안은 촘촘하게, 묶음 사이는 넉넉하게 둔다.
    // 영상이 없는 스키장은 날씨와 교통이 화면의 주인공이 되도록 배치를 달리한다(no-video).
    h('main', { class: `detail${resort.mode === 'direct' ? '' : ' no-video'}` },
      board.el ? h('div', { class: 'watch' }, stage[0], board.el, ...stage.slice(1)) : stage,
      weatherSlot, isJapan(resort) ? null : trafficSection(resort)), // 교통은 국내 출발 기준이라 일본에는 없다
    footer(),
  );
  drawBoard();
  watchSnow();
  // 스키장에 들어오면 첫 번째 웹캠을 바로 재생한다. 가려진 탭에서는 데이터를 쓰지 않도록 건너뛴다.
  if (!document.hidden) {
    // 재생이 안 되어도 나머지 화면은 그대로 쓴다.
    Promise.resolve()
      .then(() => autoStart?.())
      .catch((error) => console.error('자동 재생 시작 실패', error));
  }
}

// ---------- 화면 전환 ----------

let route = { view: 'list' };

function render() {
  stopStage?.(); // 화면을 떠나면 재생을 멈추고 정리한다
  stopStage = null;
  redrawTopFav = null;
  autoStart = null;
  currentCam = -1;
  route = parseRoute(location.hash, RESORTS);
  // 넓은 화면은 목록이 늘 왼쪽에 있으므로, 첫 화면에서는 목록 맨 위 스키장을 바로 보여 준다(즐겨찾기가 있으면 그 첫째).
  if (route.view === 'list' && isWide()) {
    route = { view: 'detail', resort: sortResorts(RESORTS, state.favorites)[0], cam: 0 };
  }
  if (route.view === 'detail') renderDetail(route.resort, route.cam);
  else renderList();
  window.scrollTo(0, 0);
}

let weatherLoading = false;
let weatherAt = 0; // 지금 화면의 날씨를 받은 시각
const WEATHER_REFRESH_MS = 30 * 60 * 1000;

// 날씨는 화면과 따로 불러온다. 실패했으면 다음 화면 이동 때 다시 시도한다.
// 받은 지 30분이 지났으면 다시 받는다. 탭을 오래 열어 두어도 옛 날씨가 남지 않게 한다.
function loadWeather() {
  if (weatherLoading) return;
  if (state.weather && Date.now() - weatherAt < WEATHER_REFRESH_MS) return;
  weatherLoading = true;
  getWeather({ storage })
    .catch(() => null)
    .then((weather) => {
      weatherLoading = false;
      // 다시 받기에 실패했으면 보이던 날씨를 지우지 않고 다음 기회에 다시 시도한다.
      if (!weather && state.weather) return;
      state.weather = weather;
      weatherAt = Date.now();
      redrawWeather();
    });
}

// 재생 중인 영상을 끊지 않도록 상세 화면에서는 날씨 영역만 다시 그린다.
function redrawWeather() {
  if (route.view === 'detail') {
    document.getElementById('weather-slot')?.replaceChildren(weatherSection(route.resort));
    drawBoard();
    drawSide();
    watchSnow();
  } else {
    renderList();
  }
}

window.addEventListener('hashchange', () => {
  render();
  // 화면이 바뀌면 제목으로 포커스를 옮겨, 키보드·스크린리더가 새 화면 처음부터 읽게 한다.
  app.querySelector('h1')?.focus({ preventScroll: true });
  loadWeather();
});
// 창 너비가 휴대폰 배치와 PC 배치의 경계를 넘으면 화면을 다시 그린다(이때 재생 중인 영상은 멈춘다).
wideQuery.addEventListener('change', () => render());
// 가려 두었던 탭으로 돌아오면 날씨가 오래됐는지 확인한다(영상은 다시 틀지 않는다).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadWeather();
});
loadWeather(); // 화면 그리기에서 오류가 나더라도 날씨는 불러오도록 먼저 시작한다
render();

