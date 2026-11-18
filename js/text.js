// 한국어 조사 고르기. 마지막 글자에 받침이 있으면 첫 번째, 없으면 두 번째를 붙인다.
// 한글로 끝나지 않으면 '을(를)'처럼 둘 다 적는다.
export function josa(word, withFinal, withoutFinal) {
  const code = String(word).charCodeAt(String(word).length - 1) - 0xac00;
  if (!(code >= 0 && code <= 11171)) return `${word}${withFinal}(${withoutFinal})`;
  return `${word}${code % 28 ? withFinal : withoutFinal}`;
}
