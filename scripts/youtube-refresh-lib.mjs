// 유튜브 생중계 주소 자동 갱신에 쓰는 계산 부분. 네트워크를 쓰지 않아 테스트할 수 있다.

const unescape = (text) => text
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// 제목 비교용: 전각·반각과 공백 차이를 없앤다.
export const normalize = (text) => String(text ?? '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();

// 카메라 제목으로 시작하면 같은 카메라로 본다(뒤에 날짜가 붙는 중계가 있다).
export const titleMatches = (title, wanted) => {
  const want = normalize(wanted);
  return want.length > 0 && normalize(title).startsWith(want);
};

// 유튜브 영상 페이지에서 지금 생중계 중인지 읽는다. 표시가 없으면(차단·동의 화면 등) null.
export function parseLive(html) {
  const found = /"isLiveNow":(true|false)/.exec(String(html ?? ''));
  return found ? found[1] === 'true' : null;
}

export function parseTitle(html) {
  const found = /<meta name="title" content="([^"]*)"/.exec(String(html ?? ''));
  return found ? unescape(found[1]) : null;
}

// 채널 공개 피드(videos.xml)에서 영상 목록을 읽는다.
export function parseFeed(xml) {
  const entries = [];
  for (const [, body] of String(xml ?? '').matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(body)?.[1];
    const title = /<title>([\s\S]*?)<\/title>/.exec(body)?.[1];
    if (id && title !== undefined) entries.push({ id, title: unescape(title) });
  }
  return entries;
}

// 공식 웹캠 페이지에 끼워진 유튜브 영상 ID 를 나온 순서대로 모은다.
export function parsePageIds(html) {
  const ids = [];
  const pattern = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|live\/)|youtu\.be\/)([\w-]{11})/g;
  for (const [, id] of String(html ?? '').matchAll(pattern)) if (!ids.includes(id)) ids.push(id);
  return ids;
}

// 바꿀 주소를 고른다. 확실할 때만 바꾼다:
// 지금 주소가 "생중계 아님"으로 확인됐고, 제목이 같은 후보 중 "생중계 중"으로 확인된 것이 정확히 하나일 때.
export function chooseReplacement({ current, currentLive, wantedTitle, candidates, taken = [] }) {
  if (currentLive !== false) return null;
  const live = candidates.filter((c) => c.id !== current && !taken.includes(c.id) && c.live === true && titleMatches(c.title, wantedTitle));
  const ids = [...new Set(live.map((c) => c.id))];
  return ids.length === 1 ? ids[0] : null;
}

// 자료 파일 글자에서 영상 ID 를 바꾼다. 따옴표로 감싼 ID 가 정확히 한 번 나올 때만 바꾼다.
export function applyReplacements(text, changes) {
  let out = text;
  for (const { from, to } of changes) {
    if (!/^[\w-]{11}$/.test(from) || !/^[\w-]{11}$/.test(to)) throw new Error(`잘못된 영상 ID: ${from} → ${to}`);
    const quoted = `'${from}'`;
    if (out.split(quoted).length !== 2) throw new Error(`자료 파일에서 ${from} 을 한 번만 찾지 못했다`);
    if (out.includes(`'${to}'`)) throw new Error(`${to} 는 이미 다른 카메라가 쓰고 있다`);
    out = out.replace(quoted, `'${to}'`);
  }
  return out;
}

// 유튜브 공식 API(videos.list, part=snippet) 응답을 읽는다.
// 응답에 없는 ID 는 지워졌거나 비공개가 된 영상이므로 생중계 아님으로 본다. 응답 자체가 잘못됐으면 모두 모름(null).
export function parseApiVideos(json, ids) {
  if (!json || !Array.isArray(json.items)) return ids.map((id) => ({ id, live: null, title: null, why: 'API 응답 오류' }));
  const byId = new Map(json.items.map((item) => [item.id, item.snippet ?? {}]));
  return ids.map((id) => {
    const snippet = byId.get(id);
    if (!snippet) return { id, live: false, title: null, why: null };
    return { id, live: snippet.liveBroadcastContent === 'live', title: snippet.title ?? null, why: null };
  });
}
