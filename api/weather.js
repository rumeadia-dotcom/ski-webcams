// 날씨 중계. 방문자의 브라우저 대신 서버가 날씨를 받아 오고, 응답을 30분간 저장해 재사용한다.
// 앱 안 브라우저처럼 다른 사이트로의 요청이 막히는 환경에서도 같은 사이트 주소로 날씨를 받을 수 있다.
import { RESORTS } from '../js/data.js';
import { buildWeatherUrl } from '../js/weather.js';

const UPSTREAM_TIMEOUT_MS = 8000;

export default async function handler(_req, res) {
  try {
    const upstream = await fetch(buildWeatherUrl(RESORTS), { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!upstream.ok) {
      res.status(502).json({ error: true, upstream: upstream.status });
      return;
    }
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // 방문자 쪽에는 저장하지 않고, Vercel CDN 이 30분 저장한다. 갱신 중에는 이전 응답을 준다.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400');
    res.status(200).send(body);
  } catch {
    res.status(502).json({ error: true });
  }
}
