import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

test('배포용 빌드', async (t) => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'pipe' });
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="(assets\/[^"]+)"/g)].map((m) => m[1]);

  await t.test('첫 화면이 식별값이 붙은 파일 4개를 가리키고, 모두 실제로 있다', () => {
    assert.equal(refs.length, 4);
    for (const ref of refs) {
      assert.match(ref, /^assets\/[\w-]+\.[\w-]{8,}\.(js|css|png)$/, ref);
      assert.ok(existsSync(path.join(dist, ref)), ref);
    }
    assert.doesNotMatch(html, /\?v=\d+/);
    assert.doesNotMatch(html, /"(js|css)\//);
  });

  await t.test('자바스크립트는 파일 하나로 합쳐지고, 식별값이 붙은 아이콘을 쓴다', () => {
    const scripts = readdirSync(path.join(dist, 'assets')).filter((f) => /^app\..+\.js$/.test(f));
    assert.equal(scripts.length, 1);
    const code = readFileSync(path.join(dist, 'assets', scripts[0]), 'utf8');
    assert.doesNotMatch(code, /from\s*["']\.\//); // 남은 상대 경로 가져오기가 없어야 한다
    const icon = refs.find((r) => /sticker-144\.[\w-]+\.png$/.test(r));
    assert.ok(code.includes(icon), '아이콘 경로');
    assert.ok(code.includes('/api/weather'));
    assert.ok(code.includes('live.yongpyong.co.kr'));
  });

  await t.test('통계 페이지도 식별값이 붙은 파일을 가리키고 검색에 노출되지 않는다', () => {
    const stats = readFileSync(path.join(dist, 'stats.html'), 'utf8');
    const statsRefs = [...stats.matchAll(/(?:href|src)="(assets\/[^"]+)"/g)].map((m) => m[1]);
    assert.equal(statsRefs.length, 3);
    for (const ref of statsRefs) assert.ok(existsSync(path.join(dist, ref)), ref);
    assert.match(stats, /name="robots" content="noindex/);
    assert.doesNotMatch(html, /stats/); // 사이트 첫 화면에서 통계 페이지로 가는 링크는 없다
  });

  await t.test('홈 화면 추가용 앱 정보와 아이콘이 함께 나간다', () => {
    assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
    const manifest = JSON.parse(readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some((i) => i.sizes === '192x192'));
    assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
    for (const i of manifest.icons) assert.ok(existsSync(path.join(dist, i.src)), i.src);
  });

  await t.test('스키장마다 공유 미리보기 페이지가 있고 미리보기 그림이 실제로 있다', () => {
    const pages = readdirSync(path.join(dist, 'r'));
    assert.equal(pages.length, 13);
    const page = readFileSync(path.join(dist, 'r', 'yongpyong.html'), 'utf8');
    assert.match(page, /og:title" content="[^"]*용평[^"]*"/);
    assert.match(page, /#\/resort\/yongpyong/);
    const image = /og:image" content="https:\/\/ski-webcams\.vercel\.app\/([^"]+)"/.exec(html)[1];
    assert.ok(existsSync(path.join(dist, image)), image);
  });

  await t.test('같은 내용이면 같은 파일 이름이 나온다', () => {
    const before = readdirSync(path.join(dist, 'assets')).sort();
    execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'pipe' });
    assert.deepEqual(readdirSync(path.join(dist, 'assets')).sort(), before);
  });
});
