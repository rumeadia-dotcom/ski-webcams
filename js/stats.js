// 통계 대시보드 화면. 구글 계정으로 로그인한 사람의 권한으로 Google Analytics 데이터를 읽어 온다.
// 비밀 키는 없다. 클라이언트 ID 와 속성 ID 는 공개되어도 되는 값이고,
// 애널리틱스 권한이 없는 계정으로 로그인하면 구글이 조회를 거부한다.
import { RESORTS } from './data.js';
import {
  RANGES, REALTIME_REQUEST, buildBatchRequest, buildChannelRequest,
  flagCameras, offlineRate, parseChannels, parseDashboard, parseRealtime, todayInSeoul,
} from './stats-data.js';

const CLIENT_ID = '280201564860-7n2jhc6vjc1fe7sleqq2ojcgqe0bccib.apps.googleusercontent.com';
const PROPERTY = 'properties/530849503';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const API = `https://analyticsdata.googleapis.com/v1beta/${PROPERTY}`;

const root = document.getElementById('stats');
const initialRange = new URLSearchParams(location.search).get('range');
const state = {
  token: null,
  range: RANGES[initialRange] ? initialRange : '7d', // 고른 기간
  loadedRange: null, // 화면의 숫자가 실제로 속한 기간. 불러오는 동안에는 range 와 다를 수 있다.
  loading: false, error: null, data: null, channels: [], realtime: 0, loadedAt: null,
};
let tokenClient = null;
let latest = 0; // 가장 최근 요청 번호. 그보다 앞선 요청의 결과는 화면에 반영하지 않는다.

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

// 화면에는 보이지 않고 스크린리더에만 읽히는 진행 안내.
function announce(text) {
  const el = document.getElementById('stats-status');
  if (el) el.textContent = text;
}

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
  const mine = ++latest;
  const range = state.range;
  state.loading = true;
  state.error = null;
  render();
  announce('통계를 불러오는 중입니다.');
  try {
    const [batch, channels, realtime] = await Promise.all([
      call('batchRunReports', buildBatchRequest(range)),
      call('runReport', buildChannelRequest(range)),
      call('runRealtimeReport', REALTIME_REQUEST),
    ]);
    if (mine !== latest) return; // 그 사이 다시 요청했으면 버린다
    state.data = parseDashboard(batch, RESORTS, { days: RANGES[range].days, today: todayInSeoul() });
    state.loadedRange = range;
    state.channels = parseChannels(channels);
    state.realtime = parseRealtime(realtime);
    state.loadedAt = new Date();
    announce(`${RANGES[range].label} 통계를 불러왔습니다.`);
  } catch (error) {
    if (mine !== latest) return;
    if (error.message === 'expired' || error.message === 'forbidden') state.token = null;
    state.error = ERROR_TEXT[error.message] ?? '통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    console.warn('통계 조회 실패:', error.message);
  } finally {
    if (mine === latest) {
      state.loading = false;
      render();
    }
  }
}

function setRange(key) {
  state.range = key;
  const url = new URL(location.href);
  if (key === '7d') url.searchParams.delete('range');
  else url.searchParams.set('range', key);
  history.replaceState(null, '', url);
  load();
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

// 확인이 필요한 카메라: 주인이 이 화면에서 바로 손쓸 수 있는 유일한 정보라 요약 숫자 바로 아래에 둔다.
function flaggedCard(cameras) {
  const flagged = flagCameras(cameras);
  return card('확인이 필요한 카메라',
    '재생하려다 "송출 없음"으로 끝난 비율이 20% 이상인 카메라입니다. 야간이나 개장 전에는 정상일 수 있습니다.',
    flagged.length
      ? h('ul', { class: 'flags' }, ...flagged.map((c) =>
        h('li', { class: 'flag' },
          c.resortId
            ? h('a', { class: 'flag-name', href: `./#/resort/${c.resortId}` }, c.camera)
            : h('span', { class: 'flag-name' }, c.camera),
          h('span', { class: 'flag-rate' }, h('span', { class: 'sr-only' }, '송출 없음 비율 '), `${offlineRate(c)}%`),
          h('span', { class: 'flag-note' }, `${c.resort} · 송출 없음 ${fmt(c.offline)}회 · 재생 ${fmt(c.plays)}회`))))
      : empty('송출 없음이 잦은 카메라가 없습니다.'));
}

// 날짜별 방문자: 세로 막대. 7일은 막대 위에 값을 적고, 28일은 막대를 누르거나 올리면 값을 보여 준다.
function dailyChart(daily) {
  if (daily.length < 2) return null;
  if (daily.every((d) => d.users === 0)) return empty('이 기간에는 방문 기록이 없습니다.');
  const max = Math.max(1, ...daily.map((d) => d.users));
  const label = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
  const showValues = daily.length <= 10;
  const every = showValues ? 1 : 7; // 28일일 때는 일주일마다만 날짜를 적는다
  // 탭으로는 한 번만 멈추고, 좌우 화살표로 날짜를 옮긴다.
  const move = (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step) return;
    const cols = [...event.currentTarget.children];
    const next = cols[cols.indexOf(document.activeElement) + step];
    if (!next) return;
    event.preventDefault();
    for (const col of cols) col.tabIndex = col === next ? 0 : -1;
    next.focus();
  };
  return h('div', { class: 'daily' },
    h('p', { class: 'daily-max', 'aria-hidden': 'true' }, `가장 많은 날 ${fmt(max)}명`),
    h('ul', { class: `daily-plot${showValues ? ' has-values' : ''}`, 'aria-label': '날짜별 방문자 수. 좌우 화살표로 날짜를 옮깁니다.', onkeydown: move },
      ...daily.map((d, i) => {
        const height = (d.users / max) * 100;
        return h('li', { class: 'daily-col', tabindex: i === daily.length - 1 ? '0' : '-1', 'data-tip': `${label(d.date)} · ${fmt(d.users)}명` },
          h('span', { class: 'sr-only' }, `${label(d.date)} ${fmt(d.users)}명`),
          showValues ? h('span', { class: 'daily-num', 'aria-hidden': 'true', style: `bottom:${height}%` }, fmt(d.users)) : null,
          d.users > 0 ? h('span', { class: 'daily-bar', style: `height:${height}%` }) : null);
      })),
    h('div', { class: `daily-axis${showValues ? '' : ' is-sparse'}`, 'aria-hidden': 'true' },
      ...daily.map((d, i) => h('span', {}, (daily.length - 1 - i) % every === 0 ? label(d.date) : ''))),
    h('details', { class: 'table-view' },
      h('summary', {}, '표로 보기'),
      h('table', { 'aria-label': '날짜별 방문자 수' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, '날짜'), h('th', { scope: 'col', class: 'num' }, '방문자'))),
        h('tbody', {}, ...daily.map((d) => h('tr', {}, h('th', { scope: 'row' }, d.date), h('td', { class: 'num' }, fmt(d.users))))))),
  );
}

// 순위 막대: 이름, 가로 막대, 값. 값 칸의 폭이 같아서 모든 행의 막대가 같은 길이를 기준으로 한다.
function rankRows(items, { valueOf, labelOf, unit, extra, wideExtra = false }) {
  const max = Math.max(1, ...items.map(valueOf));
  return h('ol', { class: 'rank' }, ...items.map((item) =>
    h('li', { class: 'rank-row' },
      h('span', { class: 'rank-name', title: labelOf(item) }, labelOf(item)),
      h('span', { class: 'rank-track' }, valueOf(item) > 0 ? h('span', { class: 'rank-bar', style: `width:${(valueOf(item) / max) * 100}%` }) : null),
      h('span', { class: 'rank-value' }, `${fmt(valueOf(item))}${unit}`),
      extra && extra(item) ? h('span', { class: wideExtra ? 'rank-extra is-wide' : 'rank-extra' }, extra(item)) : null,
    )));
}

// 카메라 표: 재생은 막대로, 송출 없음은 횟수와 비율 글자로 적는다. 많이 본 10대만 먼저 보여 준다.
const CAMERA_TOP = 10;
function cameraTable(cameras) {
  const max = Math.max(1, ...cameras.map((c) => c.plays));
  const table = (list, label) =>
    h('table', { class: 'cam-table', 'aria-label': label },
      h('thead', {}, h('tr', {},
        h('th', { scope: 'col' }, '카메라'), h('th', { scope: 'col' }, '재생'), h('th', { scope: 'col', class: 'num' }, '송출 없음'))),
      h('tbody', {}, ...list.map((c) =>
        h('tr', {},
          h('th', { scope: 'row' }, h('span', { class: 'cam-name' }, c.camera), h('span', { class: 'cam-resort' }, c.resort)),
          h('td', {}, h('span', { class: 'cam-cell' },
            h('span', { class: 'rank-track' }, c.plays > 0 ? h('span', { class: 'rank-bar', style: `width:${(c.plays / max) * 100}%` }) : null),
            h('span', { class: 'rank-value' }, fmt(c.plays)))),
          c.offline > 0
            ? h('td', { class: 'num is-warn' }, `${fmt(c.offline)} (${offlineRate(c)}%)`)
            : h('td', { class: 'num is-none' }, h('span', { 'aria-hidden': 'true' }, '–'), h('span', { class: 'sr-only' }, '없음'))))));
  const rest = cameras.slice(CAMERA_TOP);
  return h('div', {},
    table(cameras.slice(0, CAMERA_TOP), '카메라별 재생과 송출 없음 횟수'),
    rest.length
      ? h('details', { class: 'table-view' },
        h('summary', {}, `나머지 ${fmt(rest.length)}대 보기`),
        table(rest, '나머지 카메라의 재생과 송출 없음 횟수'))
      : null);
}

function dashboard() {
  const { data, channels } = state;
  const rangeLabel = RANGES[state.loadedRange].label;
  return [
    h('div', { class: 'tiles' },
      tile('방문자', data.kpi.users, rangeLabel),
      tile('처음 온 방문자', data.kpi.newUsers, rangeLabel),
      tile('방문 횟수', data.kpi.sessions, rangeLabel),
      tile('화면 조회', data.kpi.views, rangeLabel),
    ),
    flaggedCard(data.cameras),
    state.loadedRange === 'today' ? null : card('날짜별 방문자', null, dailyChart(data.daily)),
    card('스키장별 조회', '많이 본 스키장 순서입니다. 작은 글씨는 공식 페이지로 이동한 횟수와 즐겨찾기에 추가한 횟수입니다.',
      data.resorts.length
        ? rankRows(data.resorts, {
          valueOf: (r) => r.views,
          labelOf: (r) => r.name,
          unit: '회',
          extra: (r) => `공식 페이지 이동 ${fmt(r.official)} · 즐겨찾기 ${fmt(r.favorites)}`,
        })
        : empty('아직 데이터가 없습니다. 스키장별 통계는 수집을 시작한 뒤 하루 정도 지나야 나옵니다.')),
    card('카메라별 재생', '재생이 많은 순서입니다. 송출 없음의 괄호는 재생을 시도한 횟수 중 비율입니다.',
      data.cameras.length ? cameraTable(data.cameras) : empty('아직 데이터가 없습니다. 카메라별 통계는 수집을 시작한 뒤 하루 정도 지나야 나옵니다.')),
    h('div', { class: 'pair' },
      card('기기', null, data.devices.length
        ? rankRows(data.devices, { valueOf: (d) => d.users, labelOf: (d) => d.label, unit: '명' })
        : empty()),
      card('유입 경로', null, channels.length
        ? rankRows(channels, {
          valueOf: (c) => c.sessions,
          labelOf: (c) => c.label,
          unit: '회',
          wideExtra: true,
          extra: (c) => c.sources.slice(0, 3).map((s) => `${s.label} ${fmt(s.sessions)}`).join(' · '),
        })
        : empty()),
    ),
  ].filter(Boolean);
}

// 기간 버튼과, 숫자가 언제 것인지 알리는 한 줄. 불러오는 중이라는 표시도 여기(화면 위쪽)에 둔다.
function toolbar() {
  const time = state.loadedAt?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const status = state.loading
    ? `${RANGES[state.range].label} 불러오는 중…`
    : state.loadedAt ? `지금 접속 중 ${fmt(state.realtime)}명(최근 30분) · ${time} 기준` : '';
  return h('div', { class: 'toolbar' },
    h('div', { class: 'filters', role: 'group', 'aria-label': '기간' },
      ...Object.entries(RANGES).map(([key, range]) =>
        h('button', {
          type: 'button',
          class: `seg${state.range === key ? ' is-on' : ''}`,
          'aria-pressed': String(state.range === key),
          'data-key': `range-${key}`,
          onclick: () => setRange(key),
        }, range.label))),
    h('p', { class: 'stamp' },
      h('span', {}, status),
      state.data ? h('button', { type: 'button', class: 'link-btn', 'data-key': 'refresh', onclick: load }, '새로고침') : null));
}

function render() {
  const signedIn = Boolean(state.token);
  // 화면을 통째로 다시 그리므로, 누르고 있던 버튼의 포커스를 같은 버튼에 돌려놓는다.
  const focusKey = document.activeElement?.dataset?.key;
  const parts = [
    signedIn ? toolbar() : null,
    state.error
      ? h('div', { class: 'alert', role: 'alert' },
        h('p', {}, state.error),
        signedIn ? h('button', { type: 'button', class: 'link-btn', 'data-key': 'retry', onclick: load }, '다시 시도') : null)
      : null,
    !signedIn
      ? h('section', { class: 'card login' },
        h('h2', {}, '로그인'),
        state.error ? null : h('p', {}, '통계는 애널리틱스 권한이 있는 구글 계정으로 로그인해야 볼 수 있습니다.'),
        h('button', { type: 'button', class: 'btn', 'data-key': 'login', onclick: login }, '구글 계정으로 로그인'),
        h('p', { class: 'card-desc' }, '"Google에서 확인하지 않은 앱" 안내가 나오면 계속을 눌러 진행합니다. 본인만 쓰는 테스트 모드라서 나오는 안내입니다.'))
      : null,
    signedIn && state.loading && !state.data ? h('p', { class: 'empty' }, '통계를 불러오는 중…') : null,
    signedIn && state.data
      ? h('div', { class: `dash${state.loading ? ' is-stale' : ''}`, 'aria-busy': String(state.loading) }, ...dashboard())
      : null,
    signedIn && state.data
      ? h('p', { class: 'foot' }, '오늘 수치는 반영이 늦을 수 있습니다. 운영 주소(ski-webcams.vercel.app) 방문만 집계합니다.')
      : null,
  ];
  root.replaceChildren(
    h('header', { class: 'head' },
      h('h1', {}, '스키장 웹캠 통계'),
      h('a', { class: 'head-link', href: './' }, '사이트로 가기')),
    h('main', {}, ...parts.filter(Boolean)));
  if (focusKey) root.querySelector(`[data-key="${focusKey}"]`)?.focus();
}

render();
