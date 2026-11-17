const KEY = 'ski.favorites';

export function loadFavorites(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(KEY));
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

// current 를 넘기면 저장소를 다시 읽지 않는다(저장소가 막힌 환경에서도 화면 상태가 유지되도록).
export function toggleFavorite(storage, id, current = loadFavorites(storage)) {
  const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
  try {
    storage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장 실패는 무시한다. 이번 방문 동안만 유지된다.
  }
  return next;
}

export function sortResorts(resorts, favIds) {
  const fav = new Set(favIds);
  return [...resorts.filter((r) => fav.has(r.id)), ...resorts.filter((r) => !fav.has(r.id))];
}
