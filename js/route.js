// '#/resort/{id}' 와 '#/resort/{id}/{카메라 번호}' 만 상세 화면이고, 그 외와 없는 id 는 목록 화면이다.
// 카메라 번호는 1부터 센다. 없는 번호이거나 우리 사이트에서 재생하지 않는 스키장이면 무시한다.
export function parseRoute(hash, resorts) {
  const match = /^#\/resort\/([^/?#]+)(?:\/([^/?#]*))?$/.exec(hash ?? '');
  const resort = match && resorts.find((r) => r.id === match[1]);
  if (!resort) return { view: 'list' };
  const route = { view: 'detail', resort };
  const number = /^\d{1,3}$/.test(match[2] ?? '') ? Number(match[2]) : 0;
  if (resort.mode === 'direct' && number >= 1 && number <= (resort.cams?.length ?? 0)) route.cam = number - 1;
  return route;
}
