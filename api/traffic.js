// 교통상황 중계. /api/traffic?resort={id}
// 카카오모빌리티 길찾기 API 키는 Vercel 환경변수(KAKAO_REST_API_KEY)에만 있고 브라우저로 나가지 않는다.
// 응답을 CDN 이 10분 저장하므로, 방문자가 아무리 많아도 호출은 스키장마다 10분에 한 번이다.
import { RESORTS } from '../js/data.js';
import { originsFor, buildDirectionsUrl, parseDirections } from '../js/traffic.js';

const UPSTREAM_TIMEOUT_MS = 8000;

export default async function handler(req, res, {
  key = process.env.KAKAO_REST_API_KEY,
  fetch = globalThis.fetch,
  now = Date.now,
} = {}) {
  const fail = (status, error) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(status).json({ error });
  };
  const resort = RESORTS.find((r) => r.id === req.query?.resort);
  if (!resort) return fail(404, 'unknown-resort');
  if (!key) return fail(503, 'no-key');

  const routes = await Promise.all(originsFor(resort).map(async (origin) => {
    try {
      const upstream = await fetch(buildDirectionsUrl(origin, resort), {
        headers: { Authorization: `KakaoAK ${key}` },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      const parsed = upstream.ok ? parseDirections(await upstream.json()) : null;
      return { from: origin.name, minutes: parsed?.minutes ?? null, km: parsed?.km ?? null };
    } catch {
      return { from: origin.name, minutes: null, km: null };
    }
  }));

  if (routes.every((r) => r.minutes === null)) return fail(502, 'upstream');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=60');
  res.status(200).json({ at: now(), routes });
}
