import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  articlePage, articleRoute, directory, e, excerpt, featuredDirectory, home, infoNav, infoPage, layout,
  link, notFound, personPage, personRoute, reading, saved, timeline, topicPage, topicRoute, topics,
} from './views.ts';
import type { PageOptions } from './views.ts';
import { BOOKS, TOPICS } from './catalog.ts';
import { PRIVATE, ROOT, SITE, SITE_URL, assetName, currentPeople, digest, edition, load, mediaValid } from './model.ts';
import type { Article, Person } from './model.ts';

const draft = process.argv.includes('--drafts');
const publicEdition = edition();
const people = draft ? currentPeople() : publicEdition.people;
if (!people.length) throw new Error(draft ? '先运行 npm run import' : '缺少公开版本，请先发布经过授权的内容');

mkdirSync(PRIVATE, { recursive: true });
const rootReal = realpathSync(ROOT);
const privateReal = realpathSync(PRIVATE);
if (path.relative(rootReal, privateReal) !== '.private') throw new Error('构建目录必须在项目内');
const stage = mkdtempSync(path.join(PRIVATE, 'site-'));
const out = draft ? path.join(PRIVATE, 'preview') : path.join(ROOT, 'dist');
const routes: string[] = [];
const noindex = new Set<string>();
const emitted = new Set<string>();
const ads = load(path.join(ROOT, 'config', 'ads.json'), {
  siteEnabled: false, provider: 'none', providerEnabled: false, publisherId: '',
  slot: '', countries: [] as string[], eligiblePages: [] as string[], adsTxt: [] as string[], googleVerification: '',
});
const production = !draft && process.env.SITE_PRODUCTION === '1';
const mediaFolder = path.join(ROOT, 'content', 'media');
const assetRevision = digest(Buffer.concat(['style.css', 'client.js'].map(name => readFileSync(path.join(ROOT, 'public', name))))).slice(0, 12);

function write(relative: string, content: string) {
  const file = path.join(stage, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}
function copy(source: string, relative: string) {
  const file = path.join(stage, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  copyFileSync(source, file);
}
function page(content: string, options: PageOptions) {
  const route = options.route;
  if (!/^(?:[a-z0-9][a-z0-9/-]*\/)?$/.test(route) && route !== '404.html') throw new Error('非法发布路由 ' + route);
  const file = route === '404.html' ? route : route + 'index.html';
  if (emitted.has(file)) throw new Error('重复发布路由 ' + route);
  emitted.add(file);
  write(file, layout(content, { ...options, draft }, assetRevision));
  routes.push(route);
  if (options.noindex || draft) noindex.add(route);
}
const description = (text: string) => excerpt(text, 148);
const canonical = (route: string) => new URL(link(route), SITE_URL).href;
const leadArt = (person: Person) => {
  const art = person.assets.find(asset => asset.slot === 'A1');
  return art ? link('assets/images/' + assetName(person, art, 1100)) : undefined;
};

for (const name of ['icon.svg', 'river.svg', 'style.css', 'client.js', 'ad-policy.js', 'wechat-shop-code.png']) {
  copy(path.join(ROOT, 'public', name), 'assets/' + name);
}
for (const person of people) {
  for (const asset of person.assets) {
    for (const width of [480, 1100] as const) {
      const name = assetName(person, asset, width);
      const cache = path.join(PRIVATE, 'images', name);
      const checkedIn = path.join(ROOT, 'content', 'images', name);
      const file = existsSync(cache) ? cache : checkedIn;
      if (!existsSync(file)) throw new Error('缺少响应式图片 ' + name + '，请运行 npm run assets');
      copy(file, 'assets/images/' + name);
    }
  }
  const media = person.media;
  if (media?.display_state === 'video_ready' && mediaValid(media)) {
    for (const url of [media.video_url, media.captions_url]) {
      if (!url || !/^assets\/media\/[a-z0-9][a-z0-9._-]*\.(mp4|webm|vtt)$/i.test(url)) continue;
      const file = path.join(mediaFolder, path.basename(url));
      if (existsSync(file) && !lstatSync(file).isSymbolicLink() && statSync(file).size <= 40 * 1024 * 1024) copy(file, url);
    }
  }
}

page(home(people), { title: SITE, description: '从人物、时间与现实问题进入中文哲学思想史阅读。', route: '', active: '' });
page(directory(people), { title: '人物总览', description: '按时代、地区、思想传统及主题浏览人物。', route: 'thinkers/', active: 'thinkers/' });
page(featuredDirectory(people), { title: '重点人物', description: '沿导读、核心概念、现实问题与原典深入阅读重点人物。',
  route: 'thinkers/featured/', active: 'thinkers/', crumbs: [['首页', ''], ['人物总览', 'thinkers/'], ['重点人物', 'thinkers/featured/']] });
page(timeline(people), { title: '时间长河', description: '按年代浏览思想者并切换阅读方向。', route: 'timeline/', active: 'timeline/' });
page(directory(people, true), { title: '站内搜索', description: '搜索人物、概念与主题。', route: 'search/', noindex: true, kind: 'search' });
page(saved(), { title: '收藏与继续阅读', description: '查看和清除此设备保存的阅读记录。', route: 'saved/', noindex: true, kind: 'saved' });
page(topics(), { title: '带着问题读', description: '五条现实主题与思想阅读路径。', route: 'topics/', active: 'topics/' });
for (const topic of TOPICS) page(topicPage(topic, people), { title: topic.name, description: topic.line,
  route: topicRoute(topic.id), active: 'topics/', crumbs: [['首页', ''], ['现实问题', 'topics/'], [topic.name, topicRoute(topic.id)]] });
page(reading(), { title: '书单与阅读路径', description: '按原著、导读和延伸选择书目及阅读顺序。', route: 'reading/', active: 'reading/',
  structured: BOOKS.filter(book => book.category === '原著').map(book => ({
    '@context': 'https://schema.org', '@type': 'Book', name: book.work, author: { '@type': 'Person', name: book.name }, url: book.url,
  })) });
for (const [title, route] of infoNav) page(infoPage(route), { title, route, description: SITE + ' · ' + title, kind: 'info' });
page(notFound(), { title: '页面没有找到', description: '此地址可能已迁移或撤回。', route: '404.html', noindex: true });

const pairs = people.flatMap(person => person.articles.map(article => [person, article] as [Person, Article]));
for (const person of people) {
  const route = personRoute(person);
  const art = leadArt(person);
  page(personPage(person, people), { title: person.name, route, description: description(person.overview), share: art,
    active: 'thinkers/', crumbs: [['首页', ''], ['人物总览', 'thinkers/'], [person.name, route]],
    structured: [{ '@context': 'https://schema.org', '@type': 'Person', name: person.name,
      url: canonical(route), alternateName: [person.originalName, ...person.aliases].filter(Boolean),
      image: art ? new URL(art, SITE_URL).href : undefined }],
  });
}
for (const [[person, article], index] of pairs.map((pair, index) => [pair, index] as const)) {
  const route = articleRoute(person, article.kind);
  const records = publicEdition.records.filter(record => record.id === person.id && record.state === 'published');
  const initial = records[0]?.at || '';
  const latest = records.at(-1)?.at || '';
  const eligible = production && ads.siteEnabled && ads.provider === 'adsense' && ads.providerEnabled &&
    ads.eligiblePages.includes(route) && Boolean(article.sources.length) && article.body.length >= 600;
  page(articlePage(person, article, initial.slice(0, 10), pairs[index - 1], pairs[index + 1], eligible), {
    title: article.title, description: description(person.overview), route, kind: 'article', share: leadArt(person),
    crumbs: [['首页', ''], ['人物总览', 'thinkers/'], [person.name, personRoute(person)], ['文章 ' + article.kind, route]],
    structured: [{ '@context': 'https://schema.org', '@type': 'Article', headline: article.title, inLanguage: 'zh-CN',
      url: canonical(route), mainEntityOfPage: canonical(route), about: { '@type': 'Person', name: person.name },
      datePublished: initial || undefined, dateModified: latest || undefined }],
    ad: eligible ? { production, siteEnabled: ads.siteEnabled, provider: ads.provider, providerEnabled: ads.providerEnabled,
      pageEligible: eligible, publisherId: ads.publisherId, slot: ads.slot, countries: ads.countries } : undefined,
  });
}

write('.nojekyll', '');
write('robots.txt', 'User-agent: *\n' + (draft ? 'Disallow: /\n' : 'Allow: /\nSitemap: ' + canonical('sitemap.xml') + '\n'));
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  routes.filter(route => !noindex.has(route)).map(route => '<url><loc>' + e(canonical(route)) + '</loc></url>').join('\n') + '\n</urlset>\n');
if (production && /^ca-pub-\d{16}$/.test(ads.publisherId)) {
  const allowed = ads.adsTxt.filter(row => /^google\.com,\s*pub-\d{16},\s*(DIRECT|RESELLER)(,\s*[a-f0-9]+)?$/i.test(row) &&
    row.includes(ads.publisherId.slice(3)));
  if (allowed.length) write('ads.txt', allowed.join('\n') + '\n');
}
if (production && /^google[a-f0-9]{16}\.html$/.test(ads.googleVerification)) {
  write(ads.googleVerification, 'google-site-verification: ' + ads.googleVerification + '\n');
}
if (existsSync(out)) {
  const rel = path.relative(rootReal, realpathSync(out));
  if (rel !== (draft ? path.join('.private', 'preview') : 'dist') || lstatSync(out).isSymbolicLink()) throw new Error('拒绝覆盖项目之外的目录');
  rmSync(out, { recursive: true });
}
renameSync(stage, out);
console.log(JSON.stringify({ output: path.relative(ROOT, out), pages: routes.length, people: people.length,
  articles: pairs.length, mode: draft ? 'protected-preview' : 'public', url: SITE_URL.href }, null, 2));
