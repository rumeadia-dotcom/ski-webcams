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

// 확인 결과가 하나씩 들어올 때마다 무엇을 할지 정한다.
//   { action: 'start', cam } 이 카메라를 튼다 / { action: 'allOff' } 모두 꺼졌다 / { action: 'wait' } 결과를 더 기다린다
// 틀려던 카메라가 꺼지지 않았으면 그 카메라, 꺼졌으면 살아 있다고 확인된 카메라 중 목록에서 가장 앞선 것.
// 답이 늦은 카메라를 기다리느라 살아 있는 카메라의 재생을 미루지 않는다.
export function decideStart(cams, states, preferred) {
  const wanted = states.get(preferred);
  if (wanted === undefined) return { action: 'wait' };
  if (wanted !== 'off') return { action: 'start', cam: preferred };
  const alive = cams.find((cam) => states.has(cam) && states.get(cam) !== 'off');
  if (alive) return { action: 'start', cam: alive };
  return cams.every((cam) => states.has(cam)) ? { action: 'allOff' } : { action: 'wait' };
}
