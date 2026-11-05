import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { BASE, PRIVATE, ROOT } from './model.ts';

const drafts = process.argv.includes('--drafts');
const output = drafts ? path.join(PRIVATE, 'preview') : path.join(ROOT, 'dist');
const port = Number(process.env.PORT || 4173);
const host = '127.0.0.1';
const secret = drafts ? randomBytes(32).toString('base64url') : '';
const cookie = 'philosophy_local_preview';
const login = BASE + '_unlock/';
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt; charset=utf-8',
};
if (drafts || !existsSync(output)) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build.ts'), ...(drafts ? ['--drafts'] : [])], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const root = realpathSync(output);
const expected = Buffer.from(secret);
function same(value: string | undefined) {
  const candidate = Buffer.from(value || '');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
const server = createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (drafts) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  if (!['GET', 'HEAD'].includes(req.method || '')) { res.writeHead(405); res.end(); return; }
  const raw = req.url || '/';
  if (raw.includes('\\') || /%2f|%5c|%00/i.test(raw)) { res.writeHead(400); res.end(); return; }
  let route: string;
  try { route = decodeURIComponent(new URL(raw, 'http://127.0.0.1').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  if (drafts && route.startsWith(login) && same(route.slice(login.length))) {
    res.writeHead(303, { 'Set-Cookie': cookie + '=' + secret + '; HttpOnly; SameSite=Strict; Path=' + BASE, Location: BASE });
    res.end();
    return;
  }
  const session = req.headers.cookie?.split('; ').find(value => value.startsWith(cookie + '='))?.split('=')[1];
  if (drafts && !same(session)) {
    res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('受保护预览。请在本机终端使用启动时显示的访问地址。');
    return;
  }
  if (route === '/' && BASE !== '/') { res.writeHead(302, { Location: BASE }); res.end(); return; }
  const rel = route.startsWith(BASE) ? route.slice(BASE.length) : null;
  let file = rel === null ? '' : path.join(root, rel);
  if (file && existsSync(file) && statSync(file).isDirectory()) {
    if (!route.endsWith('/')) { res.writeHead(308, { Location: route + '/' }); res.end(); return; }
    file = path.join(file, 'index.html');
  }
  if (file && existsSync(file)) {
    file = realpathSync(file);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !statSync(file).isFile()) file = '';
  } else file = '';
  const status = file ? 200 : 404;
  file ||= path.join(root, '404.html');
  const type = types[path.extname(file)] || 'application/octet-stream';
  const total = statSync(file).size;
  const range = status === 200 && /^video\//.test(type) ? req.headers.range?.match(/^bytes=(\d+)-(\d*)$/) : null;
  if (range) {
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + total }); res.end(); return; }
    res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1,
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': total });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
}).listen(port, host, () => {
  const bound = server.address();
  if (!bound || typeof bound === 'string') throw new Error('本地预览无法分配端口');
  console.log('Local: http://' + host + ':' + bound.port + (drafts ? login + secret : BASE));
});
