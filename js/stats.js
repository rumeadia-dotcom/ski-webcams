// 통계 대시보드 화면. 구글 계정으로 로그인한 사람의 권한으로 Google Analytics 데이터를 읽어 온다.
// 비밀 키는 없다. 클라이언트 ID 와 속성 ID 는 공개되어도 되는 값이고,
// 애널리틱스 권한이 없는 계정으로 로그인하면 구글이 조회를 거부한다.
import { RESORTS } from './data.js';
import {
  RANGES, REALTIME_REQUEST, buildBatchRequest, buildChannelRequest,
  parseChannels, parseDashboard, parseRealtime, todayInSeoul,
} from './stats-data.js';

const CLIENT_ID = '280201564860-7n2jhc6vjc1fe7sleqq2ojcgqe0bccib.apps.googleusercontent.com';
const PROPERTY = 'properties/530849503';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const API = `https://analyticsdata.googleapis.com/v1beta/${PROPERTY}`;

const root = document.getElementById('stats');
const state = { token: null, range: '7d', loading: false, error: null, data: null, channels: [], realtime: 0, loadedAt: null };
let tokenClient = null;

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style') el.style.cssText = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.filter((c) => c != null && c !== false));
  return el;
}
const fmt = (n) => Number(n).toLocaleString('ko-KR');

// ---------- 로그인 ----------

// 구글 로그인 스크립트는 비동기로 불러오므로 준비될 때까지 기다린다.
function whenGoogleReady() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve(true);
  const script = document.querySelector('script[data-gis]');
  return new Promise((resolve) => {
    const done = () => resolve(Boolean(globalThis.google?.accounts?.oauth2));
    script?.addEventListener('load', done, { once: true });
    script?.addEventListener('error', done, { once: true });
    setTimeout(done, 8000);
  });
}

async function login() {
  state.error = null;
  if (!(await whenGoogleReady())) {
    state.error = '구글 로그인 기능을 불러오지 못했습니다. 네트워크를 확인하고 새로고침해 주세요.';
    render();
    return;
  }
  tokenClient ??= google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (response) => {
      if (response.error || !response.access_token) {
        state.error = '로그인이 완료되지 않았습니다. 다시 시도해 주세요.';
        render();
        return;
      }
      state.token = response.access_token; // 메모리에만 둔다. 새로고침하면 다시 로그인한다.
      load();
    },
    error_callback: () => {
      state.error = '로그인 창이 닫혔거나 차단됐습니다. 팝업 차단을 해제하고 다시 시도해 주세요.';
      render();
    },
  });
  tokenClient.requestAccessToken();
}

// ---------- 데이터 ----------

async function call(path, body) {
  const res = await fetch(`${API}:${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('expired');
  if (res.status === 403) throw new Error('forbidden');
  if (!res.ok) throw new Error(`http-${res.status}`);
  return res.json();
}

const ERROR_TEXT = {
  expired: '로그인이 만료됐습니다. 다시 로그인해 주세요.',
  forbidden: '이 구글 계정에는 통계를 볼 권한이 없습니다. 애널리틱스 권한이 있는 계정으로 로그인해 주세요.',
};

async function load() {
  state.loading = true;
  state.error = null;
  render();
  const range = state.range;
  try {
    const [batch, channels, realtime] = await Promise.all([
      call('batchRunReports', buildBatchRequest(range)),
      call('runReport', buildChannelRequest(range)),
      call('runRealtimeReport', REALTIME_REQUEST),
    ]);
    if (range !== state.range) return; // 그 사이 기간을 바꿨으면 버린다
    state.data = parseDashboard(batch, RESORTS, { days: RANGES[range].days, today: todayInSeoul() });
    state.channels = parseChannels(channels);
    state.realtime = parseRealtime(realtime);
    state.loadedAt = new Date();
  } catch (error) {
    if (error.message === 'expired' || error.message === 'forbidden') state.token = null;
    state.error = ERROR_TEXT[error.message] ?? `통계를 불러오지 못했습니다 (${error.message}). 잠시 후 다시 시도해 주세요.`;
  } finally {
    state.loading = false;
    render();
  }
}

// ---------- 화면 조각 ----------

function tile(label, value, note) {
  return h('div', { class: 'tile' },
    h('span', { class: 'tile-label' }, label),
    h('span', { class: 'tile-value' }, fmt(value)),
    note ? h('span', { class: 'tile-note' }, note) : null,
  );
}

function card(title, description, ...body) {
  return h('section', { class: 'card' },
    h('h2', {}, title),
    description ? h('p', { class: 'card-desc' }, description) : null,
    ...body,
  );
}

const empty = (text = '아직 데이터가 없습니다.') => h('p', { class: 'empty' }, text);

// 날짜별 방문자: 세로 막대. 막대에 올리면 날짜와 값을 보여 준다.
function dailyChart(daily) {
  if (daily.length < 2) return null;
  const max = Math.max(1, ...daily.map((d) => d.users));
  const label = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
  const every = daily.length > 10 ? 7 : 1; // 28일일 때는 일주일마다만 날짜를 적는다
  return h('div', { class: 'daily' },
    h('div', { class: 'daily-plot', role: 'img', 'aria-label': `날짜별 방문자 수, 최대 ${fmt(max)}명` },
      ...daily.map((d) =>
        h('div', { class: 'daily-col', tabindex: '0', 'data-tip': `${label(d.date)} · ${fmt(d.users)}명` },
          h('div', { class: 'daily-bar', style: `height:${(d.users / max) * 100}%` })))),
    h('div', { class: 'daily-axis', 'aria-hidden': 'true' },
      ...daily.map((d, i) => h('span', {}, (daily.length - 1 - i) % every === 0 ? label(d.date) : ''))),
    h('details', { class: 'table-view' },
      h('summary', {}, '표로 보기'),
      h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, '날짜'), h('th', { class: 'num' }, '방문자'))),
        h('tbody', {}, ...daily.map((d) => h('tr', {}, h('td', {}, d.date), h('td', { class: 'num' }, fmt(d.users))))))),
  );
}

// 순위 막대: 이름, 가로 막대, 값. 한 가지 색만 쓴다.
function rankRows(items, { valueOf, labelOf, unit, extra }) {
  const max = Math.max(1, ...items.map(valueOf));
  return h('ol', { class: 'rank' }, ...items.map((item) =>
    h('li', { class: 'rank-row' },
      h('span', { class: 'rank-name' }, labelOf(item)),
      h('span', { class: 'rank-track' }, valueOf(item) > 0 ? h('span', { class: 'rank-bar', style: `width:${(valueOf(item) / max) * 100}%` }) : null),
      h('span', { class: 'rank-value' }, `${fmt(valueOf(item))}${unit}`),
      extra ? h('span', { class: 'rank-extra' }, extra(item)) : null,
    )));
}

function cameraTable(cameras) {
  const max = Math.max(1, ...cameras.map((c) => Math.max(c.plays, c.offline)));
  const bar = (value, cls) => h('span', { class: 'cam-cell' },
    h('span', { class: 'rank-track' }, value > 0 ? h('span', { class: `rank-bar ${cls}`, style: `width:${(value / max) * 100}%` }) : null),
    h('span', { class: 'rank-value' }, fmt(value)));
  return h('div', {},
    h('div', { class: 'legend' },
      h('span', {}, h('i', { class: 'swatch' }), '재생'),
      h('span', {}, h('i', { class: 'swatch is-offline' }), '송출 없음')),
    h('table', { class: 'cam-table' },
      h('thead', {}, h('tr', {}, h('th', {}, '카메라'), h('th', {}, '재생'), h('th', {}, '송출 없음'))),
      h('tbody', {}, ...cameras.map((c) =>
        h('tr', {},
          h('td', {}, h('strong', {}, c.camera), h('span', { class: 'cam-resort' }, c.resort)),
          h('td', {}, bar(c.plays, '')),
          h('td', {}, bar(c.offline, 'is-offline')))))));
}

function dashboard() {
  const { data, channels } = state;
  const rangeLabel = RANGES[state.range].label;
  return [
    h('div', { class: 'tiles' },
      tile('지금 접속 중', state.realtime, '최근 30분'),
      tile('방문자', data.kpi.users, rangeLabel),
      tile('처음 온 방문자', data.kpi.newUsers, rangeLabel),
      tile('방문 횟수', data.kpi.sessions, rangeLabel),
      tile('화면 조회', data.kpi.views, rangeLabel),
    ),
    state.range === 'today' ? null : card('날짜별 방문자', null, dailyChart(data.daily)),
    card('스키장별 조회', '많이 본 스키장 순서입니다. 오른쪽은 공식 페이지로 이동한 횟수와 즐겨찾기에 추가한 횟수입니다.',
      data.resorts.length
        ? rankRows(data.resorts, {
          valueOf: (r) => r.views,
          labelOf: (r) => r.name,
          unit: '회',
          extra: (r) => `공식 ${fmt(r.official)} · 즐겨찾기 ${fmt(r.favorites)}`,
        })
        : empty('아직 데이터가 없습니다. 스키장별 통계는 수집을 시작한 뒤 하루 정도 지나야 나옵니다.')),
    card('카메라별 재생', '"송출 없음"이 많은 카메라는 영상 주소가 바뀌었거나 꺼져 있을 수 있습니다.',
      data.cameras.length ? cameraTable(data.cameras) : empty('아직 데이터가 없습니다. 카메라별 통계는 수집을 시작한 뒤 하루 정도 지나야 나옵니다.')),
    h('div', { class: 'pair' },
      card('기기', null, data.devices.length
        ? rankRows(data.devices, { valueOf: (d) => d.users, labelOf: (d) => d.label, unit: '명' })
        : empty()),
      card('유입 경로', null, channels.length
        ? rankRows(channels, { valueOf: (c) => c.sessions, labelOf: (c) => c.label, unit: '회' })
        : empty()),
    ),
  ];
}

function render() {
  const signedIn = Boolean(state.token);
  // 비어 있는 자리(null)는 건너뛴다.
  const mount = (...nodes) => root.replaceChildren(...nodes.filter(Boolean));
  mount(
    h('header', { class: 'head' },
      h('h1', {}, '스키장 웹캠 통계'),
      h('a', { class: 'head-link', href: './' }, '사이트로 가기')),
    signedIn
      ? h('div', { class: 'filters', role: 'group', 'aria-label': '기간' },
        ...Object.entries(RANGES).map(([key, range]) =>
          h('button', {
            type: 'button',
            class: `seg${state.range === key ? ' is-on' : ''}`,
            'aria-pressed': String(state.range === key),
            onclick: () => {
              state.range = key;
              load();
            },
          }, range.label)),
        h('button', { type: 'button', class: 'seg seg-refresh', onclick: load }, '새로고침'))
      : null,
    state.error ? h('p', { class: 'alert', role: 'alert' }, state.error) : null,
    !signedIn
      ? h('section', { class: 'card login' },
        h('p', {}, '통계는 애널리틱스 권한이 있는 구글 계정으로 로그인해야 볼 수 있습니다.'),
        h('button', { type: 'button', class: 'btn', onclick: login }, '구글 계정으로 로그인'),
        h('p', { class: 'card-desc' }, '"Google에서 확인하지 않은 앱" 안내가 나오면 계속을 눌러 진행합니다. 본인만 쓰는 테스트 모드라서 나오는 안내입니다.'))
      : null,
    signedIn && state.loading && !state.data ? h('p', { class: 'empty' }, '통계를 불러오는 중…') : null,
    ...(signedIn && state.data ? dashboard() : []),
    signedIn && state.loadedAt
      ? h('p', { class: 'foot' },
        `${state.loading ? '불러오는 중… · ' : ''}기준 시각 ${state.loadedAt.toLocaleTimeString('ko-KR')} · 오늘 수치는 반영이 늦을 수 있습니다. 운영 주소(ski-webcams.vercel.app) 방문만 집계합니다.`)
      : null,
  );
}

render();
