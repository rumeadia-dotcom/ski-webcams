// 유튜브 생중계 주소 자동 갱신. `node scripts/refresh-youtube.mjs` (바꾸지 않고 보기만: --dry)
// 유튜브 생중계는 다시 시작하면 영상 ID 가 바뀐다. 카메라마다 지금 ID 가 생중계 중인지 확인하고,
// 끝난 것으로 확인되면 같은 채널·공식 페이지에서 제목이 같은 생중계를 찾아 js/data.js 의 ID 를 바꾼다.
// 확실하지 않으면(확인 실패, 후보 없음, 후보 여럿) 아무것도 바꾸지 않는다.
import { readFileSync, writeFileSync } from 'node:fs';
import { RESORTS } from '../js/data.js';
import { parseLive, parseTitle, parseFeed, parsePageIds, chooseReplacement, applyReplacements } from './youtube-refresh-lib.mjs';

const DATA = new URL('../js/data.js', import.meta.url);
const SOURCES = JSON.parse(readFileSync(new URL('./youtube-sources.json', import.meta.url), 'utf8'));
const dry = process.argv.includes('--dry');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; webcam-link-check)', 'Accept-Language': 'en' };
const MAX_CANDIDATES = 25; // 카메라 하나를 위해 확인하는 후보 영상 수의 상한

async function get(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}
const cache = new Map(); // 같은 주소는 한 번만 받는다
const once = (url) => {
  if (!cache.has(url)) cache.set(url, get(url));
  return cache.get(url);
};
// 생중계 표시를 못 읽었을 때 그 까닭을 짧게 남긴다.
const whyUnknown = (html) => {
  if (html === null) return '응답 없음';
  if (/consent\.youtube\.com|consent\.google\.com/.test(html)) return '동의 화면';
  if (/confirm you.{0,10}re not a bot|unusual traffic/i.test(html)) return '자동 접속 차단';
  return '표시 없음';
};
const watch = async (id) => {
  const html = await once(`https://www.youtube.com/watch?v=${id}`);
  const live = parseLive(html);
  return { id, live, title: parseTitle(html), why: live === null ? whyUnknown(html) : null };
};

const changes = [];
const taken = RESORTS.flatMap((r) => r.cams.filter((c) => c.type === 'youtube').map((c) => c.src));
const summary = { live: 0, unknown: 0, ended: 0, replaced: 0 };

for (const resort of RESORTS) {
  for (const cam of resort.cams) {
    const source = SOURCES[`${resort.id}/${cam.name}`];
    if (cam.type !== 'youtube' || !source) continue;
    const now = await watch(cam.src);
    if (now.live === true) { summary.live += 1; continue; }
    if (now.live === null) { summary.unknown += 1; console.log(`확인 못 함(${now.why}): ${resort.id}/${cam.name}`); continue; }
    summary.ended += 1;

    const ids = [];
    if (source.channel) {
      const feed = parseFeed(await once(`https://www.youtube.com/feeds/videos.xml?channel_id=${source.channel}`));
      ids.push(...feed.map((entry) => entry.id));
    }
    if (source.page) ids.push(...parsePageIds(await once(source.page)));
    const candidates = [];
    for (const id of [...new Set(ids)].filter((id) => id !== cam.src).slice(0, MAX_CANDIDATES)) candidates.push(await watch(id));

    const next = chooseReplacement({ current: cam.src, currentLive: now.live, wantedTitle: source.title, candidates, taken });
    if (next) {
      changes.push({ from: cam.src, to: next });
      taken.push(next);
      summary.replaced += 1;
      console.log(`바꿈: ${resort.id}/${cam.name} ${cam.src} → ${next}`);
    } else {
      console.log(`중계 끝남, 대신할 생중계 없음: ${resort.id}/${cam.name}`);
    }
  }
}

console.log(JSON.stringify(summary));
if (changes.length > 0 && !dry) {
  writeFileSync(DATA, applyReplacements(readFileSync(DATA, 'utf8'), changes));
}
