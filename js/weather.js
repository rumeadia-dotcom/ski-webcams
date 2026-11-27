import { RESORTS } from './data.js';

const KEY = 'ski.weather.v5'; // 기간이나 스키장 목록이 바뀌면 이름을 바꿔 예전 저장본을 버린다
const TTL_MS = 30 * 60 * 1000;
const TIMEOUT_MS = 8000; // 응답이 멈춘 채 끝나지 않는 연결을 끊는 시간
const TODAY_INDEX = 3; // past_days=3 이므로 보통 네 번째 날이 오늘. 응답에 현재 시각이 없을 때만 쓴다
const STALE_MS = 2 * 60 * 60 * 1000; // 현재 시각이 이보다 오래된 응답은 쓰지 않는다
const KST_MS = 9 * 60 * 60 * 1000;

const seoulDate = (ms) => new Date(ms + KST_MS).toISOString().slice(0, 10);

// WMO 날씨 코드 → 화면 표시용 분류
export function weatherKind(code) {
  if (code === 0) return 'clear';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95 && code <= 99) return 'thunder';
  return 'cloudy';
}

// 날씨를 받는 지점들. 앞쪽은 스키장마다 하나씩(하단, 따로 없으면 기본 좌표)이고, 뒤쪽은 정상 지점이 있는 스키장의 정상이다.
// 스키장 순서를 앞에 그대로 두어, 정상 지점이 생기기 전 화면 코드가 받아도 스키장과 날씨가 어긋나지 않는다.
export function weatherPoints(resorts) {
  const bases = resorts.map((r) => ({ id: r.id, level: 'base', lat: r.base?.lat ?? r.lat, lon: r.base?.lon ?? r.lon }));
  const tops = resorts.filter((r) => r.top).map((r) => ({ id: r.id, level: 'top', lat: r.top.lat, lon: r.top.lon }));
  return [...bases, ...tops];
}

export function buildWeatherUrl(resorts) {
  const points = weatherPoints(resorts);
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(','),
    longitude: points.map((p) => p.lon).join(','),
    current: 'temperature_2m,precipitation,rain,snowfall,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum',
    past_days: '3',
    forecast_days: '8', // 오늘 + 앞으로 7일
    timezone: 'Asia/Seoul',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

function parseLocation(loc) {
  const { current, daily } = loc ?? {};
  if (!current || !daily || !Array.isArray(daily.time)) return null;
  // 오늘은 응답에 적힌 현재 시각의 날짜로 정한다. 칸 순서로 정하면 묵은 응답에서 어제가 오늘이 된다.
  const nowDate = typeof current.time === 'string' ? current.time.slice(0, 10) : null;
  const todayIndex = daily.time.includes(nowDate) ? daily.time.indexOf(nowDate) : TODAY_INDEX;
  return {
    alt: typeof loc.elevation === 'number' ? Math.round(loc.elevation) : null, // 이 지점의 고도(m). 기온은 이 고도에 맞춰 계산된 값이다
    at: typeof current.time === 'string' ? current.time : null, // 관측 기준 시각 'YYYY-MM-DDTHH:MM' (한국 시간)
    temp: current.temperature_2m,
    precip: current.precipitation,
    kind: weatherKind(current.weather_code),
    time: typeof current.time === 'string' ? current.time.slice(11, 16) : null, // 관측 기준 시각 'HH:MM'
    days: daily.time.map((date, i) => ({
      date,
      kind: weatherKind(daily.weather_code?.[i]),
      max: daily.temperature_2m_max?.[i],
      min: daily.temperature_2m_min?.[i],
      precip: daily.precipitation_sum?.[i],
      snow: daily.snowfall_sum?.[i],
      isToday: i === todayIndex,
    })),
  };
}

// 일별 칸에 넣는 강수·적설 표기. 칸이 좁아 10 이상은 소수점을 뺀다.
export function amountLabel(value, unit) {
  const rounded = value >= 9.95 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${unit}`;
}

// 목록에 붙이는 한 줄 요약. 지금 내리는 눈·비가 먼저고, 없으면 오늘·내일 예상 적설을 알린다.
export function weatherNote(w) {
  if (!w) return null;
  if (w.kind === 'snow') return { kind: 'snow', text: '지금 눈' };
  if (w.kind === 'rain' || w.kind === 'thunder') return { kind: 'rain', text: '지금 비' };
  const days = Array.isArray(w.days) ? w.days : [];
  const today = days.findIndex((d) => d.isToday);
  if (today < 0) return null;
  for (const [offset, label] of [[0, '오늘'], [1, '내일']]) {
    const cm = Math.round((days[today + offset]?.snow ?? 0) * 10) / 10;
    if (cm > 0) return { kind: 'snow', text: `${label} 눈 ${cm}cm` };
  }
  return null;
}

// 스키장 화면 영상 아래 전광판 한 줄에 넣는 날씨 조각들.
// 지금 내리는 눈·비는 날씨 이름 자리에 쓰고, 오늘·내일 눈 예보는 뒤에 덧붙인다.
export function boardWeather(w, labels) {
  if (!w) return null;
  const note = weatherNote(w);
  const degree = typeof w.temp === 'number' ? `${Math.round(w.temp)}°` : '–';
  if (note?.text.startsWith('지금')) return [note.text, degree];
  return [labels[w.kind] ?? '', degree, ...(note ? [note.text] : [])];
}

// 좌표가 여러 개면 배열, 하나면 객체로 응답이 온다.
export function parseWeather(json, resorts) {
  const list = Array.isArray(json) ? json : [json];
  const result = {};
  weatherPoints(resorts).forEach((point, i) => {
    const parsed = parseLocation(list[i]);
    if (!parsed) return;
    if (point.level === 'base') result[point.id] = parsed;
    else if (result[point.id]) result[point.id].top = parsed; // 정상 날씨는 그 스키장 날씨 안에 넣는다
  });
  return result;
}

// 저장소 접근 자체가 예외를 던지는 환경(사이트 데이터 차단)이 있다.
function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

const isValid = (data) =>
  data && typeof data === 'object' && Object.keys(data).length > 0 &&
  Object.values(data).every((w) => w && Array.isArray(w.days));

function readCache(storage, now) {
  try {
    const cached = JSON.parse(storage.getItem(KEY));
    const age = now - cached.at;
    if (age >= 0 && age < TTL_MS && isValid(cached.data)) return cached.data;
  } catch {
    // 캐시를 못 읽으면 새로 불러온다.
  }
  return null;
}

// 마지막 실패 원인: null(성공) | 'timeout' | 'http-<상태코드>' | 'network' | 'empty' | 'stale'
export let lastWeatherError = null;

// 같은 사이트의 서버 기능. 카카오톡 같은 앱 안 브라우저는 다른 사이트(날씨 서버)로 보내는 요청이
// 멈추는 경우가 있어, 우리 사이트를 먼저 거치고 실패하면 날씨 서버에 직접 요청한다.
export const PROXY_URL = '/api/weather';

// 주소 하나에서 날씨를 받아 온다. 실패하면 원인 코드를 message 로 가진 Error 를 던진다.
// 응답의 현재 시각이 지금보다 2시간 넘게 뒤처졌으면 묵은 응답이다(중간 저장소가 옛 응답을 준 경우).
function isStale(data, now) {
  const at = Object.values(data)[0]?.at;
  if (!at) return false;
  const measured = Date.parse(`${at}:00+09:00`);
  return Number.isFinite(measured) && now - measured > STALE_MS;
}

// 저장해 둔 날씨를 자정 넘어 꺼내면 오늘 표시가 어제에 남는다. 지금 날짜가 목록에 있으면 그 날로 옮긴다.
function markToday(data, now) {
  const today = seoulDate(now);
  for (const w of Object.values(data).flatMap((base) => [base, base.top]).filter((x) => x && Array.isArray(x.days))) {
    if (!w.days.some((d) => d.date === today)) continue;
    w.days = w.days.map((d) => ({ ...d, isToday: d.date === today }));
  }
  return data;
}

async function fetchFrom(fetch, url, resorts, timeoutMs, now) {
  const controller = new AbortController();
  let timer;
  let timedOut = false;
  // 연결이나 본문 읽기가 멈춰도 제한 시간이 지나면 실패로 끝낸다.
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error('timeout'));
    }, timeoutMs);
  });
  try {
    const load = async () => {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`http-${res.status}`);
      return res.json();
    };
    const data = parseWeather(await Promise.race([load(), timeout]), resorts);
    if (Object.keys(data).length === 0) throw new Error('empty');
    if (isStale(data, now)) throw new Error('stale');
    return data;
  } catch (error) {
    const code = timedOut ? 'timeout' : /^(http-\d+|empty|stale)$/.test(error?.message) ? error.message : 'network';
    throw new Error(code);
  } finally {
    clearTimeout(timer);
  }
}

// 실패하면 예외 대신 null 을 돌려준다. 날씨가 없어도 사이트는 동작해야 한다.
export async function getWeather({
  fetch = globalThis.fetch,
  storage = defaultStorage(),
  now = Date.now,
  resorts = RESORTS,
  timeoutMs = TIMEOUT_MS,
} = {}) {
  const cached = readCache(storage, now());
  if (cached) return markToday(cached, now());
  for (const url of [PROXY_URL, buildWeatherUrl(resorts)]) {
    try {
      const data = await fetchFrom(fetch, url, resorts, timeoutMs, now());
      lastWeatherError = null;
      try {
        storage.setItem(KEY, JSON.stringify({ at: now(), data }));
      } catch {
        // 캐시 저장 실패는 무시한다.
      }
      return markToday(data, now());
    } catch (error) {
      lastWeatherError = error.message; // 다음 주소로 넘어간다
    }
  }
  return null;
}

// 사이트 맨 위 그림을 고르는 기준: 국내 스키장(하단) 지금 기온의 평균을 반올림해서
// -10도 이하면 추움(cold), -9도에서 2도면 극성수기(happy), 3도 이상이면 더움(hot).
// 문구(word)는 그림과 같되, -15도 이하면 추움 그림에 '개추움'이라고 적는다.
// 기온을 하나도 모르면 null.
export function moodOf(weather, resorts) {
  const temps = resorts
    .filter((resort) => resort.country !== 'jp')
    .map((resort) => weather?.[resort.id]?.temp)
    .filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (temps.length === 0) return null;
  const avg = Math.round(temps.reduce((sum, value) => sum + value, 0) / temps.length);
  const mood = avg <= -10 ? 'cold' : avg <= 2 ? 'happy' : 'hot';
  const word = avg <= -15 ? '개추움' : { cold: '추움', happy: '극성수기', hot: '더움' }[mood];
  return { avg, mood, word };
}
