import { RESORTS } from './data.js';

const KEY = 'ski.weather.v2'; // 기간이 바뀌면 이름을 바꿔 예전 저장본을 버린다
const TTL_MS = 30 * 60 * 1000;
const TIMEOUT_MS = 8000; // 응답이 멈춘 채 끝나지 않는 연결을 끊는 시간
const TODAY_INDEX = 3; // past_days=3 이므로 네 번째 날이 오늘

// WMO 날씨 코드 → 화면 표시용 분류
export function weatherKind(code) {
  if (code === 0) return 'clear';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95 && code <= 99) return 'thunder';
  return 'cloudy';
}

export function buildWeatherUrl(resorts) {
  const params = new URLSearchParams({
    latitude: resorts.map((r) => r.lat).join(','),
    longitude: resorts.map((r) => r.lon).join(','),
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
  return {
    temp: current.temperature_2m,
    precip: current.precipitation,
    kind: weatherKind(current.weather_code),
    days: daily.time.map((date, i) => ({
      date,
      kind: weatherKind(daily.weather_code?.[i]),
      max: daily.temperature_2m_max?.[i],
      min: daily.temperature_2m_min?.[i],
      precip: daily.precipitation_sum?.[i],
      snow: daily.snowfall_sum?.[i],
      isToday: i === TODAY_INDEX,
    })),
  };
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

// 좌표가 여러 개면 배열, 하나면 객체로 응답이 온다.
export function parseWeather(json, resorts) {
  const list = Array.isArray(json) ? json : [json];
  const result = {};
  resorts.forEach((resort, i) => {
    const parsed = parseLocation(list[i]);
    if (parsed) result[resort.id] = parsed;
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

// 마지막 실패 원인: null(성공) | 'timeout' | 'http-<상태코드>' | 'network' | 'empty'
export let lastWeatherError = null;

// 같은 사이트의 서버 기능. 카카오톡 같은 앱 안 브라우저는 다른 사이트(날씨 서버)로 보내는 요청이
// 멈추는 경우가 있어, 우리 사이트를 먼저 거치고 실패하면 날씨 서버에 직접 요청한다.
export const PROXY_URL = '/api/weather';

// 주소 하나에서 날씨를 받아 온다. 실패하면 원인 코드를 message 로 가진 Error 를 던진다.
async function fetchFrom(fetch, url, resorts, timeoutMs) {
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
    return data;
  } catch (error) {
    const code = timedOut ? 'timeout' : /^(http-\d+|empty)$/.test(error?.message) ? error.message : 'network';
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
  if (cached) return cached;
  for (const url of [PROXY_URL, buildWeatherUrl(resorts)]) {
    try {
      const data = await fetchFrom(fetch, url, resorts, timeoutMs);
      lastWeatherError = null;
      try {
        storage.setItem(KEY, JSON.stringify({ at: now(), data }));
      } catch {
        // 캐시 저장 실패는 무시한다.
      }
      return data;
    } catch (error) {
      lastWeatherError = error.message; // 다음 주소로 넘어간다
    }
  }
  return null;
}
