// 공유. 카카오톡 같은 메신저는 '#' 뒤를 읽지 못해 스키장별 미리보기를 만들 수 없으므로,
// 배포본에서는 스키장마다 미리보기용 페이지(/r/{id})를 만들어 두고 그 주소를 공유한다.

// cam 은 0부터 세는 카메라 순서. 첫 번째 카메라는 기본값이라 주소에 넣지 않는다.
// 공유 버튼으로 만든 주소에는 s=1 을 붙인다. 이 표식으로 들어온 방문은 통계에서 "공유 링크"로 잡힌다
// (카카오톡 같은 앱은 어디서 왔는지 알려 주지 않아, 표식이 없으면 직접 방문과 구분되지 않는다).
export const SHARE_MARK = 's=1';

export function shareUrl({ origin, pages, resortId, cam }) {
  if (!resortId) return `${origin}/?${SHARE_MARK}`;
  const number = cam > 0 ? cam + 1 : 0;
  if (pages) return `${origin}/r/${resortId}?${number ? `cam=${number}&` : ''}${SHARE_MARK}`;
  return `${origin}/?${SHARE_MARK}#/resort/${resortId}${number ? `/${number}` : ''}`;
}

export function isSharedVisit(search = '') {
  return new URLSearchParams(search).get('s') === '1';
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 미리보기용 페이지. 메신저는 여기서 제목과 그림을 읽고, 사람이 열면 바로 사이트 화면으로 넘어간다.
export function sharePageHtml(resort, { siteUrl, image }) {
  const title = escapeHtml(`${resort.name} 실시간 웹캠`);
  const description = escapeHtml(`${resort.name} 스키장의 지금 모습과 날씨를 확인하세요.`);
  const target = `/#/resort/${resort.id}`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="스키장 웹캠">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${siteUrl}/${image}">
<meta property="og:url" content="${siteUrl}/r/${resort.id}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${siteUrl}/">
<script>
var q = new URLSearchParams(location.search);
var cam = q.get('cam');
location.replace('/' + (q.get('s') === '1' ? '?s=1' : '') + ${JSON.stringify(target.slice(1))} + (/^\\d{1,3}$/.test(cam || '') ? '/' + cam : ''));
</script>
<noscript><meta http-equiv="refresh" content="0;url=${target}"></noscript>
</head>
<body><p><a href="${target}">${title}</a></p></body>
</html>
`;
}

// 결과: 'shared' 공유 창으로 보냄 / 'copied' 주소 복사 / 'cancelled' 공유 창을 닫음 / 'failed'
export async function share(data, nav = globalThis.navigator) {
  if (typeof nav?.share === 'function') {
    try {
      await nav.share(data);
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // 그 밖의 실패는 주소 복사로 넘어간다.
    }
  }
  try {
    await nav.clipboard.writeText(data.url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
