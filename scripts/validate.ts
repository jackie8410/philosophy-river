import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { BASE, GALLERY, ROOT, SITE_URL, assetName, digest, edition, mediaValid } from './model.ts';
import { articleRoute, personRoute } from './views.ts';

const output = path.join(ROOT, 'dist');
const catalogue = edition();
const people = catalogue.people;
const errors: string[] = [];
const check = (valid: unknown, detail: string) => { if (!valid) errors.push(detail); };
const read = (name: string) => readFileSync(path.join(output, name), 'utf8');
const publicPaths = readdirSync(output, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile()).map(entry => path.relative(output, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
const files = new Set(publicPaths);
const docs = new Map<string, { markup: string; anchors: Set<string> }>();
const decode = (value: string) => value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
let totalBytes = 0;
for (const file of files) {
  totalBytes += statSync(path.join(output, file)).size;
  check(!file.startsWith('.private/') && !/\.(docx|ps1|md|tmp|env)$|contact-sheet|import-report/i.test(file), '发布包含内部文件 ' + file);
  if (!file.endsWith('.html')) continue;
  const markup = read(file);
  const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const anchors = new Set(ids);
  check(ids.length === anchors.size, '重复锚点 ' + file);
  docs.set(file, { markup, anchors });
  check(markup.includes('<html lang="zh-CN"') && markup.includes('<main id="main"') && markup.includes('rel="canonical"'), 'HTML 元信息不完整 ' + file);
  check(!/<script[^>]*src=["']https?:/i.test(markup), '公开页面预先加载外部脚本 ' + file);
  check(!/"@type":"VideoObject"/.test(markup), '静态封面不应输出视频结构化数据 ' + file);
}
for (const [file, { markup }] of docs) {
  for (const [, raw] of markup.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = decode(raw);
    if (!(value.startsWith(BASE) || value.startsWith('#'))) continue;
    const route = file === 'index.html' ? '' : file.replace(/index\.html$/, '');
    const parsed = new URL(value, new URL(route, SITE_URL));
    const target = decodeURIComponent(parsed.pathname.slice(BASE.length)) + (parsed.pathname.endsWith('/') ? 'index.html' : '');
    check(files.has(target), '断链 ' + file + ' -> ' + value);
    if (parsed.hash && docs.has(target)) {
      check(docs.get(target)!.anchors.has(decodeURIComponent(parsed.hash.slice(1))), '不存在的锚点 ' + file + ' -> ' + value);
    }
  }
  for (const [, list] of markup.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of list.split(',')) {
      const url = candidate.trim().split(' ')[0];
      check(url.startsWith(BASE) && files.has(url.slice(BASE.length)), '缺失响应式图片 ' + file + ' -> ' + url);
    }
  }
}
check(new Set(people.map(person => person.id)).size === people.length, '人物 ID 必须唯一');
check(new Set(people.map(person => person.slug)).size === people.length, '人物 slug 必须唯一');
for (const person of people) {
  const record = catalogue.records.findLast(entry => entry.id === person.id);
  check(record?.state === 'published' && record.version === digest(JSON.stringify(person)), '公开快照未对应发布记录 ' + person.id);
  check(person.articles.length === 2 && new Set(person.articles.map(article => article.kind)).size === 2, 'A/B 对应关系错误 ' + person.id);
  check(person.slug !== 'featured' && docs.has(personRoute(person) + 'index.html'), '人物路由错误 ' + person.id);
  check(mediaValid(person.media), '媒体配置错误 ' + person.id);
  for (const slot of GALLERY) {
    const items = person.assets.filter(asset => asset.slot === slot);
    check(items.length === 1, '图位 ' + person.id + '/' + slot);
    for (const asset of items) for (const width of [480, 1100] as const) {
      check(files.has('assets/images/' + assetName(person, asset, width)), '缺图 ' + person.id + '/' + slot);
    }
  }
  for (const article of person.articles) {
    const markup = docs.get(articleRoute(person, article.kind) + 'index.html')?.markup || '';
    check(article.sources.length > 0 && /<article id="article-body" class="prose">[\s\S]{150,}<\/article>/.test(markup),
      '阅读页缺正文或来源 ' + person.id + '/' + article.kind);
  }
}
const sitemap = read('sitemap.xml');
for (const route of ['search/', 'saved/', '404.html']) {
  const filename = route.endsWith('/') ? route + 'index.html' : route;
  check(!sitemap.includes(new URL(route, SITE_URL).href) && docs.get(filename)?.markup.includes('noindex'), '索引排除规则错误 ' + route);
}
check(totalBytes < 1_000_000_000, '产物超过 GitHub Pages 容量');
check(existsSync(path.join(output, '.nojekyll')), '缺少 .nojekyll');
if (errors.length) { console.error(errors.slice(0, 40).join('\n')); throw new Error('校验失败 ' + errors.length + ' 项'); }
console.log(JSON.stringify({ people: people.length, articles: people.reduce((n, p) => n + p.articles.length, 0),
  featured: people.filter(person => person.featured).length, pages: docs.size,
  files: files.size, totalBytes, internalLinks: '通过', render: '正文在 HTML 内', assets: '通过' }, null, 2));
