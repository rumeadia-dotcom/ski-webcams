import { pickEngine, youtubeEmbedUrl } from './engine.js';

const HLS_WAIT_MS = 8000;

// 재생 라이브러리는 화면 표시를 막지 않도록 비동기로 불러오므로, 첫 재생 때 아직 없을 수 있다.
function waitForHls() {
  const script = document.querySelector('script[data-hls]');
  if (globalThis.Hls || !script) return Promise.resolve();
  return new Promise((resolve) => {
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', resolve, { once: true });
    setTimeout(resolve, HLS_WAIT_MS);
  });
}

const STALL_TIMEOUT_MS = 15000; // 이 시간 동안 아무 진행이 없으면 송출 없음으로 본다

// 한 번에 영상 하나만 재생하는 플레이어.
// onState: 'idle' | 'loading' | 'playing' | 'blocked' | 'offline' | 'unsupported' | 'limit'
//   blocked     자동 재생이 막혀 사용자가 영상의 재생 버튼을 눌러야 하는 상태
//   unsupported 재생 수단이 없는 상태(재생 라이브러리 로드 실패 등)
// preferNative: 브라우저 자체 재생이 가능하면 그것을 우선한다(iOS).
export function createPlayer(container, { onState, preferNative = false }) {
  let hls = null;
  let timers = [];
  let stallTimer = null;
  let session = 0; // 이전 재생에서 늦게 도착한 이벤트를 무시하기 위한 번호

  function teardown() {
    session += 1;
    timers.forEach(clearTimeout);
    timers = [];
    clearTimeout(stallTimer);
    stallTimer = null;
    if (hls) {
      hls.destroy();
      hls = null;
    }
    const video = container.querySelector('video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load(); // 자체 재생 중이던 스트림 내려받기를 끊는다
    }
    container.replaceChildren();
  }

  function stop(state = 'idle') {
    teardown();
    onState(state);
  }

  function play(cam, { limitSec } = {}) {
    teardown();
    const mine = session;
    const alive = () => mine === session;
    let hasStarted = false;
    onState('loading');

    const fail = () => alive() && stop('offline');
    // 내려받기가 진행되는 동안에는 기다린다. 느린 회선에서 정상 스트림을 끊지 않기 위해서다.
    const progress = () => {
      if (!alive() || hasStarted) return;
      clearTimeout(stallTimer);
      stallTimer = setTimeout(fail, STALL_TIMEOUT_MS);
    };
    const started = () => {
      if (!alive() || hasStarted) return;
      hasStarted = true;
      clearTimeout(stallTimer);
      onState('playing');
      if (limitSec) timers.push(setTimeout(() => alive() && stop('limit'), limitSec * 1000));
    };
    progress();

    if (cam.type === 'youtube') {
      const iframe = document.createElement('iframe');
      iframe.src = youtubeEmbedUrl(cam.src);
      iframe.title = cam.name;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.addEventListener('load', started, { once: true });
      container.append(iframe);
      return;
    }

    const video = document.createElement('video');
    video.muted = true;
    video.autoplay = true;
    video.controls = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.addEventListener('playing', started);
    video.addEventListener('progress', progress);
    container.append(video);

    const nativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== '';

    const startEngine = () => {
      if (!alive()) return;
      const Hls = globalThis.Hls;
      const engine = pickEngine({ hlsSupported: Boolean(Hls?.isSupported?.()), nativeHls, preferNative });

      if (engine === 'hlsjs') {
        hls = new Hls({ liveDurationInfinity: true });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) fail();
        });
        hls.on(Hls.Events.MANIFEST_PARSED, progress);
        hls.on(Hls.Events.FRAG_LOADED, progress);
        hls.loadSource(cam.src);
        hls.attachMedia(video);
      } else if (engine === 'native') {
        video.addEventListener('error', fail, { once: true });
        video.src = cam.src;
      } else {
        stop('unsupported');
        return;
      }

      video.play().catch((error) => {
        // 자동 재생이 막힌 경우에만 사용자가 영상의 재생 버튼을 누르도록 넘긴다.
        if (!alive() || hasStarted || error?.name !== 'NotAllowedError') return;
        clearTimeout(stallTimer);
        onState('blocked');
      });
    };

    if (preferNative && nativeHls) startEngine();
    else waitForHls().then(startEngine);
  }

  // 탭이 가려지면 데이터를 쓰지 않도록 멈춘다.
  const onVisibility = () => {
    if (document.hidden && container.firstChild) stop('idle');
  };
  document.addEventListener('visibilitychange', onVisibility);

  function destroy() {
    document.removeEventListener('visibilitychange', onVisibility);
    teardown();
  }

  return { play, stop, destroy };
}
