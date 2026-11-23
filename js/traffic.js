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
    summary: 'false', // 구간별 교통 상태(roads)를 받아 정체 정도를 계산한다
  });
  return `https://apis-navi.kakaomobility.com/v1/directions?${params}`;
}

// 정체 정도. 경로의 구간별 교통 상태를 거리로 따진다.
// 카카오 상태 코드: 0 정보 없음, 1 정체, 2 지체, 3 서행, 4 원활, 6 사고(통행 불가)
// 기준(우리가 정한 값): 정체·지체가 경로의 15% 이상이거나 사고 구간이 있으면 'jam',
// 정체·지체 5% 이상 또는 서행까지 합쳐 20% 이상이면 'slow', 그 밖은 'smooth'.
// 교통 정보가 있는 구간이 경로의 절반 미만이면 판단하지 않는다(null).
export function congestionLevel(route) {
  const roads = (route?.sections ?? []).flatMap((section) => section.roads ?? []);
  let total = 0, known = 0, heavy = 0, slow = 0, blocked = false;
  for (const road of roads) {
    const m = road.distance ?? 0;
    total += m;
    if (road.traffic_state === 6) blocked = true;
    if (road.traffic_state === 0 || road.traffic_state == null) continue;
    known += m;
    if (road.traffic_state === 1 || road.traffic_state === 2) heavy += m;
    else if (road.traffic_state === 3) slow += m;
  }
  if (total === 0 || known / total < 0.5) return null;
  if (blocked || heavy / total >= 0.15) return 'jam';
  if (heavy / total >= 0.05 || (heavy + slow) / total >= 0.2) return 'slow';
  return 'smooth';
}

// 성공한 경로면 { minutes, km, level }, 아니면 null
export function parseDirections(json) {
  const route = json?.routes?.[0];
  const summary = route?.summary;
  if (!route || route.result_code !== 0 || typeof summary?.duration !== 'number') return null;
  return { minutes: Math.round(summary.duration / 60), km: Math.round(summary.distance / 1000), level: congestionLevel(route) };
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}분`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

// 화면에서 쓰는 불러오기. 실패하면 null.
export async function loadTraffic(resortId, { fetch = globalThis.fetch, timeoutMs = 10000 } = {}) {
  // AbortSignal.timeout 은 오래된 브라우저에 없어서 직접 시간을 잰다.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/traffic?resort=${encodeURIComponent(resortId)}`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.routes) && data.routes.length > 0 ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 내 출발지. 한 번 고르면 휴대폰에 기억해 두고, 그 도시를 맨 위에 크게 보여 준다.
const ORIGIN_KEY = 'ski.origin';

export function loadOrigin(storage) {
  try {
    return storage.getItem(ORIGIN_KEY) || null;
  } catch {
    return null;
  }
}

export function saveOrigin(storage, name) {
  try {
    storage.setItem(ORIGIN_KEY, name);
  } catch {
    // 저장하지 못하면 이번 화면에서만 유지된다.
  }
}

export function arrangeRoutes(routes, origin) {
  const mine = routes.find((r) => r.from === origin) ?? null;
  return { mine, others: mine ? routes.filter((r) => r !== mine) : routes };
}
