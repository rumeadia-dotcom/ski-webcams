// 카메라 스트림이 지금 나오는지 가볍게 확인한다. 스키장 화면에 들어올 때 꺼진 카메라를 피해 재생하려고 쓴다.
//   'live'    재생 목록을 받았다
//   'off'     서버가 없다고 답했거나 연결하지 못했다
//   'unknown' 확인할 수 없는 종류이거나 시간 안에 답이 없다(재생은 시도한다)
export async function checkCam(cam, { fetchFn = globalThis.fetch, timeoutMs = 4000 } = {}) {
  if (cam.type === 'youtube' || typeof fetchFn !== 'function') return 'unknown';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(cam.src, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) return 'off';
    return (await res.text()).includes('#EXTM3U') ? 'live' : 'off';
  } catch (error) {
    // 시간 초과는 느린 회선일 수 있어 꺼졌다고 단정하지 않는다.
    return error?.name === 'AbortError' ? 'unknown' : 'off';
  } finally {
    clearTimeout(timer);
  }
}

// 자동으로 틀 카메라: 원래 틀려던 카메라가 꺼져 있으면 꺼지지 않은 첫 카메라. 모두 꺼졌으면 null.
export function pickCam(cams, states, preferred) {
  if (states.get(preferred) !== 'off') return preferred;
  return cams.find((cam) => states.get(cam) !== 'off') ?? null;
}
