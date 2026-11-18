// 배포용 묶음 생성. 결과물은 dist/ 에 만든다.
// - 자바스크립트 8개를 하나로 합친다(요청 수 감소).
// - 모든 정적 파일 이름에 내용 기반 식별값을 붙인다. 내용이 바뀌면 이름이 바뀌므로
//   브라우저가 확인 요청 없이 오래 보관해도 예전 파일이 남지 않는다.
// 개발할 때는 이 과정 없이 저장소 루트를 그대로 띄운다(npm start).
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const assets = path.join(dist, 'assets');

// 파일을 assets/ 에 "이름.식별값.확장자" 로 복사하고, 사이트에서 쓸 경로를 돌려준다.
async function copyHashed(relative) {
  const data = await readFile(path.join(root, relative));
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 10);
  const { name, ext } = path.parse(relative);
  const file = `${name}.${hash}${ext}`;
  await writeFile(path.join(assets, file), data);
  return `assets/${file}`;
}

// 번들 결과에서 진입점에 해당하는 출력 파일 경로를 찾는다.
function outputFor(metafile, entry) {
  const found = Object.entries(metafile.outputs).find(([, info]) => info.entryPoint === entry);
  if (!found) throw new Error(`빌드 결과에 ${entry} 가 없습니다`);
  return path.relative(dist, path.join(root, found[0])).split(path.sep).join('/');
}

// 치환 대상이 정확히 한 번 있어야 한다. 아니면 index.html 이 바뀐 것이므로 빌드를 실패시킨다.
function replaceOnce(html, pattern, replacement) {
  const matches = html.match(new RegExp(pattern.source, 'g')) ?? [];
  if (matches.length !== 1) throw new Error(`index.html 에서 ${pattern} 이 ${matches.length}번 발견됐습니다(1번이어야 함)`);
  return html.replace(pattern, replacement);
}

await rm(dist, { recursive: true, force: true });
await mkdir(assets, { recursive: true });

const icon = await copyHashed('img/sticker-144.png');
const touchIcon = await copyHashed('img/touch-180.png');

const common = {
  bundle: true,
  minify: true,
  sourcemap: true,
  outdir: assets,
  entryNames: '[name].[hash]',
  absWorkingDir: root,
  metafile: true,
  logLevel: 'warning',
};
const js = await build({
  ...common,
  entryPoints: ['js/app.js'],
  format: 'esm',
  target: ['es2020'],
  define: { __ICON_URL__: JSON.stringify(icon) },
});
const css = await build({ ...common, entryPoints: ['css/style.css'] });

let html = await readFile(path.join(root, 'index.html'), 'utf8');
html = replaceOnce(html, /href="css\/style\.css\?v=\d+"/, `href="${outputFor(css.metafile, 'css/style.css')}"`);
html = replaceOnce(html, /src="js\/app\.js\?v=\d+"/, `src="${outputFor(js.metafile, 'js/app.js')}"`);
html = replaceOnce(html, /href="img\/sticker-144\.png"/, `href="${icon}"`);
html = replaceOnce(html, /href="img\/touch-180\.png"/, `href="${touchIcon}"`);
await writeFile(path.join(dist, 'index.html'), html);

// 이전 배포의 첫 화면을 캐시한 방문자가 요청할 수 있는 예전 아이콘 경로를 한동안 유지한다.
await cp(path.join(root, 'img'), path.join(dist, 'img'), { recursive: true });

console.log('빌드 완료:', [outputFor(js.metafile, 'js/app.js'), outputFor(css.metafile, 'css/style.css'), icon, touchIcon].join(', '));
