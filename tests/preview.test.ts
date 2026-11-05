import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { BASE, INDEX, ROOT, assetName, currentPeople } from '../scripts/model.ts';

test('独立回环进程验证草稿正文和素材鉴权', {
  skip: process.env.PHILOSOPHY_PREVIEW_QA !== '1' || !existsSync(INDEX),
  timeout: 45_000,
}, async () => {
  const proc = spawn(process.execPath, [path.join(ROOT, 'scripts', 'serve.ts'), '--drafts'], {
    cwd: ROOT, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  try {
    const access = await new Promise<URL>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('受保护预览启动超时')), 35_000);
      proc.stdout.on('data', chunk => {
        output += String(chunk);
        const found = output.match(/^Local: (http:\/\/127\.0\.0\.1:\d+\/\S+)$/m);
        if (found) { clearTimeout(timer); resolve(new URL(found[1])); }
      });
      proc.once('error', error => { clearTimeout(timer); reject(error); });
      proc.once('exit', code => { clearTimeout(timer); reject(new Error('预览进程退出 ' + code)); });
    });
    const person = currentPeople().find(person => person.id === '005')!;
    const article = BASE + 'articles/' + person.slug + '-a/';
    const image = BASE + 'assets/images/' + assetName(person, person.assets[0], 480);
    for (const url of [article, image]) {
      const denied = await fetch(new URL(url, access));
      assert.equal(denied.status, 401);
      assert.match(denied.headers.get('cache-control') || '', /no-store/);
      assert.match(denied.headers.get('x-robots-tag') || '', /noindex/);
    }
    const bogus = await fetch(new URL(article, access), {
      headers: { cookie: 'philosophy_local_preview=' + 'x'.repeat(43) },
    });
    assert.equal(bogus.status, 401);
    const unlocked = await fetch(access, { redirect: 'manual' });
    assert.equal(unlocked.status, 303);
    const cookie = unlocked.headers.get('set-cookie')!.split(';')[0];
    const preview = await fetch(new URL(article, access), { headers: { cookie } });
    assert.equal(preview.status, 200);
    assert.match(await preview.text(), /受保护预览[\s\S]*article-body/);
    const inaccessible = await fetch(new URL(BASE + '.private/index.json', access), { headers: { cookie } });
    assert.equal(inaccessible.status, 404);
  } finally {
    proc.kill();
  }
});
