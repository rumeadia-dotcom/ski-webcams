// 교통상황 중계. /api/traffic?resort={id}
// 카카오모빌리티 길찾기 API 키는 Vercel 환경변수(KAKAO_REST_API_KEY)에만 있고 브라우저로 나가지 않는다.
// 응답을 CDN 이 5분 저장하므로, 방문자가 아무리 많아도 호출은 스키장마다 5분에 한 번이다.
// CDN 은 주소가 한 글자만 달라도 따로 저장한다. 그래서 정해진 주소(/api/traffic?resort={id})가 아니면
// 카카오를 부르지 않고 거절한다. 그러지 않으면 주소에 아무 값이나 붙여 하루 한도를 소진시킬 수 있다.
// 주의: 13곳이 하루 종일 끊임없이 조회되면 13 × 288 × 7 = 26,208건으로 무료 한도(하루 10,000건)를 넘는다.
// 방문자가 늘면 저장 시간을 20분(6,552건)으로 되돌린다.
import { RESORTS, isJapan } from '../js/data.js';
import { originsFor, buildDirectionsUrl, parseDirections, driveTarget } from '../js/traffic.js';

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
  if (!resort || isJapan(resort)) return fail(404, 'unknown-resort'); // 길찾기는 국내 출발 기준이라 일본은 다루지 않는다
  if (typeof req.url === 'string' && req.url !== `/api/traffic?resort=${resort.id}`) return fail(400, 'bad-request');
  if (!key) return fail(503, 'no-key');

  const routes = await Promise.all(originsFor(resort).map(async (origin) => {
    try {
      const upstream = await fetch(buildDirectionsUrl(origin, driveTarget(resort)), {
        headers: { Authorization: `KakaoAK ${key}` },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      const parsed = upstream.ok ? parseDirections(await upstream.json()) : null;
      return { from: origin.name, minutes: parsed?.minutes ?? null, km: parsed?.km ?? null, level: parsed?.level ?? null };
    } catch {
      return { from: origin.name, minutes: null, km: null, level: null };
    }
  }));

  if (routes.every((r) => r.minutes === null)) return fail(502, 'upstream');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=60');
  res.status(200).json({ at: now(), routes });
}
