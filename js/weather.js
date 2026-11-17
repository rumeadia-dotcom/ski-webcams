import { RESORTS } from './data.js';

const KEY = 'ski.weather';
const TTL_MS = 30 * 60 * 1000;
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
    forecast_days: '4',
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

// 실패하면 예외 대신 null 을 돌려준다. 날씨가 없어도 사이트는 동작해야 한다.
export async function getWeather({
  fetch = globalThis.fetch,
  storage = defaultStorage(),
  now = Date.now,
  resorts = RESORTS,
} = {}) {
  const cached = readCache(storage, now());
  if (cached) return cached;
  try {
    const res = await fetch(buildWeatherUrl(resorts));
    if (!res.ok) return null;
    const data = parseWeather(await res.json(), resorts);
    if (Object.keys(data).length === 0) return null;
    try {
      storage.setItem(KEY, JSON.stringify({ at: now(), data }));
    } catch {
      // 캐시 저장 실패는 무시한다.
    }
    return data;
  } catch {
    return null;
  }
}
