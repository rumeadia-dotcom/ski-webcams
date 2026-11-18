// 교통상황: 대표 도시에서 스키장까지 지금 차로 얼마나 걸리는지.
// 소요 시간은 카카오모빌리티 길찾기 API 가 실시간 교통을 반영해 계산한다. 키는 서버 기능(api/traffic.js)만 쓴다.

// 출발 지점은 각 도시 시청이다.
const CITIES = {
  seoul: { name: '서울', lat: 37.5665, lon: 126.978 },
  incheon: { name: '인천', lat: 37.4563, lon: 126.7052 },
  suwon: { name: '수원', lat: 37.2636, lon: 127.0286 },
  daejeon: { name: '대전', lat: 36.3504, lon: 127.3845 },
  daegu: { name: '대구', lat: 35.8714, lon: 128.6014 },
  gwangju: { name: '광주', lat: 35.1595, lon: 126.8526 },
  busan: { name: '부산', lat: 35.1796, lon: 129.0756 },
  ulsan: { name: '울산', lat: 35.5384, lon: 129.3114 },
  changwon: { name: '창원', lat: 35.228, lon: 128.6811 },
};

// 경기·강원 스키장은 수도권에서, 남쪽 스키장은 가까운 광역시에서 출발한다.
const DEFAULT_ORIGINS = ['seoul', 'incheon', 'suwon'];
const ORIGINS_BY_RESORT = {
  muju: ['seoul', 'daejeon', 'daegu', 'gwangju'],
  eden: ['busan', 'ulsan', 'daegu', 'changwon'],
};

export function originsFor(resort) {
  return (ORIGINS_BY_RESORT[resort.id] ?? DEFAULT_ORIGINS).map((key) => CITIES[key]);
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
