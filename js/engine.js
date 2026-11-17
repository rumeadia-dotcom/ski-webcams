// 재생 방식 선택. 재생 라이브러리(hls.js)가 동작하면 그것을 쓰고,
// 안 될 때만 브라우저 자체 재생을 쓴다(라이브러리 쪽이 송출 없음을 정확히 판정할 수 있다).
// preferNative(iOS)면 자체 재생이 가능할 때 그것을 먼저 쓴다(AirPlay, 배터리).
export function pickEngine({ hlsSupported, nativeHls, preferNative = false }) {
  if (preferNative && nativeHls) return 'native';
  if (hlsSupported) return 'hlsjs';
  if (nativeHls) return 'native';
  return 'none';
}

export function youtubeEmbedUrl(id) {
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&playsinline=1`;
}
