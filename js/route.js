// '#/resort/{id}' 만 상세 화면이고, 그 외와 없는 id 는 목록 화면이다.
export function parseRoute(hash, resorts) {
  const match = /^#\/resort\/([^/?#]+)$/.exec(hash ?? '');
  const resort = match && resorts.find((r) => r.id === match[1]);
  return resort ? { view: 'detail', resort } : { view: 'list' };
}
