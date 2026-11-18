// 교통상황: 대표 도시에서 스키장까지 지금 차로 얼마나 걸리는지.
// 소요 시간은 카카오모빌리티 길찾기 API 가 실시간 교통을 반영해 계산한다. 키는 서버 기능(api/traffic.js)만 쓴다.

// 출발 지점은 각 도시 시청이다.
const CITIES = {
  seoul: { name: '서울', lat: 37.5665, lon: 126.978 },
  uijeongbu: { name: '의정부', lat: 37.7381, lon: 127.0337 },
  incheon: { name: '인천', lat: 37.4563, lon: 126.7052 },
  ansan: { name: '안산', lat: 37.3219, lon: 126.8309 },
  suwon: { name: '수원', lat: 37.2636, lon: 127.0286 },
  cheongju: { name: '청주', lat: 36.6424, lon: 127.489 },
  daejeon: { name: '대전', lat: 36.3504, lon: 127.3845 },
};

// 수도권과 충청권 도시 7곳. 북쪽에서 남쪽 순서로, 모든 스키장에 같은 순서로 보여 준다.
const ORIGINS = ['seoul', 'uijeongbu', 'incheon', 'ansan', 'suwon', 'cheongju', 'daejeon'];

export function originsFor() {
  return ORIGINS.map((key) => CITIES[key]);
}

// 날씨용 좌표(lat, lon)는 슬로프 위라 도로에서 멀 수 있다. 그런 스키장은 차로 도착하는 지점(drive)을 따로 둔다.
export const driveTarget = (resort) => resort.drive ?? resort;

export function buildDirectionsUrl(origin, destination) {
  const params = new URLSearchParams({
    origin: `${origin.lon},${origin.lat}`,
    destination: `${destination.lon},${destination.lat}`,
    summary: 'true', // 경로 모양은 필요 없고 시간과 거리만 쓴다
  });
  return `https://apis-navi.kakaomobility.com/v1/directions?${params}`;
}

// 성공한 경로면 { minutes, km }, 아니면 null
export function parseDirections(json) {
  const route = json?.routes?.[0];
  const summary = route?.summary;
  if (!route || route.result_code !== 0 || typeof summary?.duration !== 'number') return null;
  return { minutes: Math.round(summary.duration / 60), km: Math.round(summary.distance / 1000) };
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}분`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

// 화면에서 쓰는 불러오기. 실패하면 null.
export async function loadTraffic(resortId, { fetch = globalThis.fetch, timeoutMs = 10000 } = {}) {
  try {
    const res = await fetch(`/api/traffic?resort=${encodeURIComponent(resortId)}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.routes) && data.routes.length > 0 ? data : null;
  } catch {
    return null;
  }
}
