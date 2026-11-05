import MarkdownIt from 'markdown-it';
import { BASE, REPO, SITE, SITE_URL, assetName, mediaValid } from './model.ts';
import type { Article, Asset, Person, Relationship, Source, Years } from './model.ts';
import { BOOKS, ERAS, TOPICS, chronologyYear, era } from './catalog.ts';

export const link = (route = '') => BASE + route.replace(/^\/+/, '');
export const personRoute = (person: Person) => 'thinkers/' + person.slug + '/';
export const articleRoute = (person: Person, kind: string) => 'articles/' + person.slug + '-' + kind.toLowerCase() + '/';
export const topicRoute = (id: string) => 'topics/' + id + '/';
export const e = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const scrub = (value: string) => value.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
export const excerpt = (text: string, length = 105) => {
  const plain = scrub(text);
  return plain.length > length ? plain.slice(0, length).replace(/[，、；：]$/, '') + '…' : plain;
};
export const external = (value?: string) => {
  if (!value) return null;
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
};

const nav = [
  ['首页', ''], ['人物总览', 'thinkers/'], ['时间长河', 'timeline/'],
  ['现实问题', 'topics/'], ['书单与路径', 'reading/'],
];
export const infoNav = [
  ['关于与联系', 'about/'], ['编辑方法与 AI 使用', 'editorial/'], ['来源与版权', 'sources/'],
  ['广告与推广', 'disclosure/'], ['隐私与 Cookie', 'privacy/'], ['使用条款', 'terms/'],
];
const arrow = '<span aria-hidden="true">↗</span>';
const right = '<span aria-hidden="true">→</span>';
const seal = '<svg width="29" height="29" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="none" stroke="currentColor"/><path d="M7 20c4-8 8 3 12-4 2-4 3-6 6-5M7 24c5-5 8 2 13-3M10 10h6m-6 4h4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
const searchIcon = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
const savedIcon = '<svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h10v15l-5-4-5 4V3Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const heading = (title: string, lead = '', label = '') =>
  `<header class="page-heading">${label ? `<span class="eyebrow">${e(label)}</span>` : ''}<h1>${e(title)}</h1>${lead ? `<p class="lede">${e(lead)}</p>` : ''}</header>`;
const button = (label: string, href: string, outline = false) =>
  `<a class="button${outline ? ' outline' : ''}" href="${e(href)}">${e(label)} ${right}</a>`;

export interface PageOptions {
  title: string;
  description: string;
  route: string;
  active?: string;
  noindex?: boolean;
  draft?: boolean;
  kind?: string;
  share?: string;
  crumbs?: [string, string][];
  structured?: unknown[];
  ad?: unknown;
}

export function layout(content: string, options: PageOptions, assetRevision: string) {
  const canonical = new URL(link(options.route), SITE_URL).href;
  const assets = '?v=' + encodeURIComponent(assetRevision);
  const title = options.route ? options.title + ' · ' + SITE : SITE;
  const trail = options.crumbs ?? (options.route ? [['首页', ''], [options.title, options.route]] : []);
  const breadcrumb = trail.length ? {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, route], index) => ({
      '@type': 'ListItem', position: index + 1, name, item: new URL(link(route), SITE_URL).href,
    })),
  } : null;
  const inHead = [breadcrumb, ...(options.structured ?? [])].filter(Boolean).map(value =>
    `<script type="application/ld+json">${json(value)}</script>`).join('');
  return `<!doctype html>
<html lang="zh-CN" data-base="${e(BASE)}" data-page="${e(options.kind || 'content')}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title><meta name="description" content="${e(options.description)}">
${options.noindex || options.draft ? '<meta name="robots" content="noindex,follow">' : ''}
<link rel="canonical" href="${e(canonical)}"><meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(options.description)}"><meta property="og:url" content="${e(canonical)}">
<meta property="og:site_name" content="${e(SITE)}"><meta property="og:locale" content="zh_CN">
<meta property="og:type" content="${options.kind === 'article' ? 'article' : 'website'}">
<meta property="og:image" content="${e(new URL(options.share || link('assets/river.svg'), SITE_URL).href)}">
<meta name="color-scheme" content="light"><meta name="theme-color" content="#f7f5ed">
<link rel="icon" type="image/svg+xml" href="${link('assets/icon.svg')}">
<link rel="stylesheet" href="${link('assets/style.css') + assets}"><script src="${link('assets/client.js') + assets}" type="module"></script>
${inHead}</head>
<body><a class="skip" href="#main">跳至正文</a>
<header class="mast"><div class="wrap mast-inner">
<a class="brand" href="${link()}" aria-label="${e(SITE)}首页">${seal}<span>思想长河<small>THE PHILOSOPHY RIVER</small></span></a>
<nav class="main-nav" aria-label="主导航">${nav.map(([label, route]) =>
    `<a href="${link(route)}"${options.active === route ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
<div class="tools"><a href="${link('search/')}" aria-label="搜索">${searchIcon}<span>搜索</span></a><a href="${link('saved/')}" aria-label="我的收藏">${savedIcon}<span>收藏</span></a></div>
</div></header>
${options.draft ? '<div class="preview-note">受保护预览 · 此处显示本地导入版本</div>' : ''}
<main id="main" tabindex="-1">
${trail.length ? `<nav class="wrap crumbs" aria-label="面包屑">${trail.map(([name, route], i) => i === trail.length - 1
    ? `<span aria-current="page">${e(name)}</span>` : `<a href="${link(route)}">${e(name)}</a><span aria-hidden="true">/</span>`).join('')}</nav>` : ''}
${content}</main>
<footer class="footer"><div class="wrap footer-inner"><div><a class="brand" href="${link()}">${seal}<span>思想长河<small>THE PHILOSOPHY RIVER</small></span></a><p>在时间里认识思想，在问题里阅读经典。</p></div>
<nav aria-label="网站说明">${infoNav.map(([label, route]) => `<a href="${link(route)}">${label}</a>`).join('')}</nav>
<a class="back-top" href="#main">回到顶部 ↑</a></div></footer>
${options.ad ? `<script type="application/json" id="ad-config">${json(options.ad)}</script>` : ''}
</body></html>
`;
}

export function image(person: Person, asset: Asset, eager = false, alt = asset.alt) {
  const small = link('assets/images/' + assetName(person, asset, 480));
  const large = link('assets/images/' + assetName(person, asset, 1100));
  return `<img src="${e(small)}" srcset="${e(small)} ${Math.min(480, asset.width)}w, ${e(large)} ${Math.min(1100, asset.width)}w"
sizes="(max-width: 640px) 92vw, (max-width: 900px) 45vw, 40vw" width="${asset.width}" height="${asset.height}"
alt="${e(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" data-fallback-image>`;
}

function picture(person: Person, slot: string = 'A1') {
  const art = person.assets.find(asset => asset.slot === slot);
  return `<div class="picture"><span class="picture-placeholder" aria-hidden="true">${e(person.name)}</span>${art ? image(person, art) : ''}</div>`;
}

function card(person: Person, search = false, top = false) {
  const tags = [person.region, person.tradition].filter(Boolean);
  const data = search ? ` data-record data-search="${e([person.name, person.originalName, ...person.aliases, ...tags,
    person.featured?.direction || '', ...person.topics.map(id => TOPICS.find(topic => topic.id === id)?.name || ''),
    ...person.articles.map(article => article.title)].join(' '))}" data-era="${e(era(chronologyYear(person.years)))}"
data-region="${e(person.region || '待核实')}" data-tradition="${e(person.tradition || '待核实')}" data-topics="${e(person.topics.join(' '))}"` : '';
  return `<article class="person-card"${data}><a href="${link(personRoute(person))}" class="card-link">
${top ? picture(person) : ''}<div class="card-copy"><div class="card-meta"><span>NO. ${person.id}</span>${person.featured ? '<span class="mini-tag">重点人物</span>' : ''}</div>
<h3>${e(person.name)} ${right}</h3><p class="person-dates">${e(person.years.label)}${person.region ? ' · ' + e(person.region) : ''}</p>
${person.featured ? `<p class="card-description">${e(person.featured.direction)}</p>` : ''}
</div></a></article>`;
}

const featureOrder = (people: Person[]) => people.filter(person => person.featured)
  .sort((a, b) => a.featured!.order - b.featured!.order);
const topicCards = () => TOPICS.map(topic =>
  `<a class="topic-card ${topic.color}" href="${link(topicRoute(topic.id))}"><span class="topic-no">${topic.number} / ${topic.short}</span>
<h3>${e(topic.name)}</h3><p>${e(topic.line)}</p><span class="topic-arrow" aria-hidden="true">↗</span></a>`).join('');

function globalSearch() {
  return `<form class="search-form" action="${link('search/')}" role="search"><label class="sr-only" for="global-q">搜索人物、概念或问题</label>
<input id="global-q" name="q" type="search" placeholder="搜索人物、概念或问题" required><button type="submit">${searchIcon}<span>搜索</span></button></form>`;
}

export function home(people: Person[]) {
  const spotlight = featureOrder(people).slice(0, 4);
  const stats = [[people.length, '位思想者'], [people.reduce((n, p) => n + p.articles.length, 0), '篇图文阅读'],
    [featureOrder(people).length, '位重点人物'], [TOPICS.length, '条现实主线']];
  return `<section class="hero wrap"><div class="hero-copy">
<p class="eyebrow"><span class="dot"></span> 中文思想史阅读资料库</p>
<h1>世界哲学与<br><span>思想者长河</span></h1>
<p class="hero-lead">沿着年代认识思想者，也从自己的问题出发。每个人物提供生平与思想、现代意义两条阅读线索，带你回到原典。</p>
<div class="actions">${button('浏览人物总览', link('thinkers/'))}${button('进入时间长河', link('timeline/'), true)}</div>
${globalSearch()}
</div><figure class="hero-art"><img src="${link('assets/river.svg')}" width="780" height="660" alt="" fetchpriority="high">
<figcaption><span>THE PHILOSOPHY RIVER</span><span>思想史 · 阅读地图</span></figcaption>
<div class="hero-art-index"><span>01</span><strong>循流而读</strong><span>人物 / 时间 / 问题</span></div></figure></section>
<section class="stats wrap" aria-label="公开内容统计">${stats.map(([n, label]) => `<div><strong>${n}</strong><span>${label}</span></div>`).join('')}</section>
<section class="wrap home-section" aria-labelledby="focus"><div class="section-bar"><div><span class="eyebrow">01 / 深度阅读</span><h2 id="focus">重点人物</h2><p>从一个概念、一段思想脉络或一本原典开始。</p></div>
<a class="text-link" href="${link('thinkers/featured/')}">查看全部重点人物 ${right}</a></div>
<div class="grid person-grid">${spotlight.map(person => card(person, false, true)).join('')}</div></section>
<section class="wrap home-section" aria-labelledby="theme"><div class="section-bar"><div><span class="eyebrow">02 / 从处境出发</span><h2 id="theme">带着问题读</h2><p>五条主题主线，把生活中的困惑接回思想原来的语境。</p></div>
<a class="text-link" href="${link('topics/')}">浏览所有主题 ${right}</a></div>
<div class="topic-grid">${topicCards()}</div></section>
<section class="wrap home-section"><div class="reading-banner"><div><span class="eyebrow">03 / 原典入口</span><h2>找到下一本书</h2><p>按入门、深入和延伸的顺序阅读，随时回到所关心的问题。</p></div>${button('书单与阅读路径', link('reading/'), true)}</div></section>`;
}

function select(name: string, label: string, values: [string, string][]) {
  return `<label>${label}<select data-filter="${name}"><option value="">全部</option>${values.map(([id, value]) =>
    `<option value="${e(id)}">${e(value)}</option>`).join('')}</select></label>`;
}
const pairs = (items: string[]): [string, string][] => [...new Set(items)].map(item => [item, item]);
export function directory(people: Person[], search = false) {
  const head = search ? heading('站内搜索', '检索中文名、原文名、已录入别名、重点概念与主题。', '检索')
    : heading('人物总览', '以人物为入口。用名字、时代、地区、传统或主题缩小范围。', '人物索引');
  const presentEras = new Set(people.map(person => era(chronologyYear(person.years))));
  return `<div class="wrap page">${head}
${!search ? `<div class="inline-callout"><div><strong>重点人物 · 深度阅读</strong><p>循导读、概念、思想脉络和原典继续阅读。</p></div>${button('进入重点人物', link('thinkers/featured/'), true)}</div>` : ''}
<section class="catalog" data-catalog data-search-page="${String(search)}" aria-label="人物检索">
<h2 class="sr-only">匹配人物</h2>
<form class="filters" data-filters><label class="keyword">${searchIcon}<span class="sr-only">关键词</span><input name="q" data-query type="search" placeholder="例：庄子、Hume、知行合一"></label>
${select('era', '时代', pairs(ERAS.filter(range => presentEras.has(range))))}${select('region', '地区', pairs(people.map(person => person.region || '待核实').sort()))}
${select('tradition', '传统', pairs(people.map(person => person.tradition || '待核实').sort()))}
${select('topics', '主题', TOPICS.map(topic => [topic.id, topic.short]))}
<button class="quiet" type="reset">清除筛选</button></form>
<noscript><p class="note">开启 JavaScript 可用搜索和筛选。下方名录可直接浏览。</p></noscript>
<p class="result-count" data-count role="status">${people.length} 位人物</p>
<p class="note" data-empty hidden>没有找到匹配。可以尝试较短的名字、原文拼写，或清除筛选后浏览人物总览。</p>
<div class="grid directory-grid">${people.map(person => card(person, true)).join('')}</div></section>
${search ? `<div class="section-bar"><div><h2>按现实问题浏览</h2></div></div><div class="topic-grid">${topicCards()}</div>` : ''}
</div>`;
}

export function featuredDirectory(people: Person[]) {
  return `<div class="wrap page">${heading('重点人物', '从概念、作品和现实问题进入。每位人物使用与完整名录相同的详情页。', '深度阅读')}
<a class="text-link" href="${link('thinkers/')}">← 返回完整人物总览</a>
<div class="chip-row">${TOPICS.map(topic => `<a class="chip" href="${link(topicRoute(topic.id))}">${e(topic.short)}</a>`).join('')}</div>
<h2 class="sr-only">重点人物列表</h2>
<div class="grid person-grid">${featureOrder(people).map(person => card(person, false, true)).join('')}</div></div>`;
}

export function timeline(people: Person[]) {
  const ordered = people.map(person => ({ person, year: chronologyYear(person.years) }))
    .sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) || a.person.id.localeCompare(b.person.id));
  const periods = ERAS.map((range, index) => ({ range, index, group: ordered.filter(item => era(item.year) === range) }))
    .filter(period => period.group.length > 0);
  return `<div class="wrap page">${heading('时间长河', '以生年为主排序。生年只有区间时用较早界线，生年不详时用所列活动期或传统纪年定位。约数和不同说法可在年代依据中查看。', '时间索引')}
<div class="timeline-tools"><nav aria-label="时代跳转" class="chip-row">${periods.map(({ range, index }) =>
    `<a class="chip" href="#period-${index}">${e(range)}</a>`).join('')}</nav>
<label>阅读方向 <select data-time-direction><option value="asc">由早到晚</option><option value="desc">由晚到早</option></select></label></div>
<div class="timeline" data-timeline>${periods.map(({ range, index, group }) => `<section data-period="${index}"${range === era(null) ? ' data-unknown' : ''} id="period-${index}"><h2>${e(range)} <span>${group.length} 位</span></h2>
<ol>${group.map(({ person, year }) => {
    const href = link(personRoute(person));
    return `<li data-timeline-id="${e(person.id)}" data-timeline-year="${e(year)}"><a class="timeline-person" href="${href}"><strong>${e(person.name)}</strong><span class="timeline-date">${e(person.years.label)}</span>${right}</a>
${person.years.sources?.length ? `<a class="timeline-citation" href="${href}#chronology">年代依据<span class="sr-only"> · ${e(person.name)}</span></a>` : ''}</li>`;
  }).join('')}</ol></section>`).join('')}</div></div>`;
}

function chronologySources(years: Years) {
  if (!years.sources?.length) return '';
  return `<section class="module chronology-info" id="chronology"><h2>年代依据</h2>
${years.note ? `<p>${e(years.note)}</p>` : ''}<ul class="chronology-sources">${years.sources.map(source => {
    const url = external(source.url);
    return `<li>${url ? `<a href="${e(url)}" rel="noopener noreferrer">${e(source.title)} ${arrow}</a>` : e(source.title)}
<p>${e(source.supports)}</p></li>`;
  }).join('')}</ul></section>`;
}

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
md.disable('image');
const defaultLinkOpen = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, i, options, env, self) => {
  const href = tokens[i].attrGet('href');
  if (href && !external(href) && !/^#[a-z0-9-]+$/i.test(href)) tokens[i].attrSet('href', '#main');
  if (external(href ?? undefined)) tokens[i].attrSet('rel', 'noopener noreferrer');
  return defaultLinkOpen ? defaultLinkOpen(tokens, i, options, env, self) : self.renderToken(tokens, i, options);
};
const SOURCE_HEADING = /^#{1,4}\s+[^\n]*(?:尾注与来源|参考文献|参考资料|注释与来源)[^\n]*$/m;

export function renderArticleBody(article: Article) {
  const entries: { id: string; title: string }[] = [];
  const back = new Map<string, string>();
  const body = article.body.split(SOURCE_HEADING)[0];
  const marked = body.replace(/(?:〔(\d+)〕|(?<!!)\[(\d+)\](?!\())/g, (match, a, b) => {
    const key = a || b;
    if (!article.sources.some(source => source.key === key)) return match;
    return '〔' + key + '〕';
  });
  const tokens = md.parse(marked, {});
  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') return;
    const id = 'section-' + (entries.length + 1);
    token.attrSet('id', id);
    if (token.tag === 'h1') { token.tag = 'h2'; tokens[index + 2].tag = 'h2'; }
    entries.push({ id, title: tokens[index + 1].content });
  });
  md.renderer.rules.text = (tokens, i) => {
    const safe = e(tokens[i].content);
    return safe.replace(/〔(\d+)〕/g, (match, key) => {
      if (!article.sources.some(source => source.key === key)) return match;
      const id = back.has(key) ? '' : ` id="ref-${key}"`;
      if (id) back.set(key, 'ref-' + key);
      return `<sup${id}><a href="#source-${key}" aria-label="尾注 ${key}">${key}</a></sup>`;
    });
  };
  try { return { html: md.renderer.render(tokens, md.options, {}), entries, back }; }
  finally { delete md.renderer.rules.text; }
}

function sourceList(sources: Source[], back?: Map<string, string>) {
  if (!sources.length) return '';
  return `<ol class="sources">${sources.map((source, i) => {
    const url = external(source.url);
    return `<li${back ? ` id="source-${e(source.key)}"` : ''}><span class="ref-number">${e(source.key || i + 1)}</span>
<span>${e(source.title)}${url ? ` <a href="${e(url)}" rel="noopener noreferrer">查看来源 ${arrow}</a>` : ''}
${back ? ` <a class="back-ref" href="#${back.get(source.key) || 'article-toc'}">${back.has(source.key) ? '返回引用处' : '返回正文目录'}</a>` : ''}</span></li>`;
  }).join('')}</ol>`;
}

function gallery(person: Person, kind?: 'A' | 'B') {
  const assets = kind ? person.assets.filter(asset => asset.slot.startsWith(kind)) : person.assets;
  return assets.length ? `<details class="gallery"><summary>查看相关插图 · ${assets.length} 幅</summary>
<div class="grid gallery-grid">${assets.map(asset => `<figure><div class="picture"><span class="picture-placeholder" aria-hidden="true">${e(person.name)}</span>${image(person, asset)}</div>
<figcaption>${asset.slot} · ${e(asset.caption)} <span>创作插图</span></figcaption></figure>`).join('')}</div></details>` : '';
}

function bookmark(id: string, title: string, route: string) {
  return `<button type="button" class="button outline js-control" data-bookmark="${e(id)}" data-title="${e(title)}" data-route="${e(link(route))}" aria-pressed="false">${savedIcon}<span>收藏</span></button>`;
}

function correction(title: string, route: string, section = '') {
  const url = new URL(REPO + '/issues/new');
  url.searchParams.set('title', '内容纠错 · ' + title);
  url.searchParams.set('body', '页面：' + new URL(link(route), SITE_URL).href + (section ? '#' + section : '') + '\n问题位置：' + (section || '请填写小节标题或段落') + '\n问题说明：\n可核对的来源：');
  return `<a class="text-link" data-correction href="${e(url.href)}" rel="noopener noreferrer">报告问题 ${arrow}</a>`;
}

export function mediaPanel(person: Person) {
  const media = person.media;
  if (media?.display_state === 'hidden' || !person.featured) return '';
  const asset = person.assets.find(asset => asset.slot === media?.poster_asset_id);
  const ready = media?.display_state === 'video_ready' && mediaValid(media);
  const ratio = /^\d{1,3}:\d{1,3}$/.test(media?.aspect_ratio || '') ? media!.aspect_ratio.split(':').map(Number) : [16, 9];
  const aspect = ratio.every(value => value > 0) ? ratio.join(' / ') : '16 / 9';
  const url = ready ? external(media!.video_url!) || link(media!.video_url!) : '';
  return `<section class="module" id="media"><h2>人物影像</h2><figure class="media" style="--frame-ratio:${aspect}"${ready ? ` data-video="${e(url)}" data-captions="${e(media?.captions_url ? link(media.captions_url) : '')}"` : ''}>
<div class="media-frame"><div class="media-poster"><span class="picture-placeholder">${e(person.name)}</span>${asset ? image(person, asset, false, media?.poster_alt) : ''}</div>
${ready ? '<button class="button play js-control" type="button" data-play>播放影片</button><p class="video-message" role="status" hidden></p>' : ''}</div>
<figcaption>${e(media?.caption || '人物影像 · 栏目底图')}${asset ? ' · 创作插图' : ''}</figcaption></figure>
${ready && media?.transcript ? `<details><summary>查看文字稿</summary><p>${e(media.transcript)}</p></details>` : ''}</section>`;
}

function entryFor(body: string, rule: RegExp, skip = '') {
  const pieces = body.split(/^##\s+/m).slice(1);
  for (const piece of pieces) {
    const title = piece.split('\n', 1)[0];
    if (!rule.test(title)) continue;
    const first = piece.slice(title.length).trim().split(/\n\s*\n/).find(line => line.trim() !== skip.trim());
    if (first) return excerpt(first, 178);
  }
  return '';
}
const info = {
  '005': ['把自己置于不同尺度下，考察何种评价塑造了选择。', '“无用”在具体寓言中改变评价的立场，阅读时应辨认叙述者与语境。'],
  '040': ['从一次明知却没有行动的经验进入，比较判断、动机与实践。', '知行合一的语境包括道德修养，和提升执行效率的练习有不同目的。'],
  '123': ['比较被竞争占据的时间和能够培养广泛兴趣的时间。', '关于幸福的建议要放回个人处境，区分生活观察与普遍的制度解释。'],
  '140': ['先区分具体处境造成的不安，与对自我施加的僵硬要求。', '精神分析概念用于理解理论和历史，个人诊断需要有资质的专业评估。'],
  '065': ['从反复看见两件事相继发生的例子入手，追问经验支持了何种判断。', '对必然性的怀疑仍容纳基于习惯和经验的审慎推断。'],
  '115': ['挑选一条熟悉的组织流程，观察手续、权责和执行判断如何相互作用。', '把官僚制当作分析类型，可以比较秩序带来的可预测性及其代价。'],
  '016': ['把几个实际欲望写下来，比较它们对生活安定和友谊的影响。', '讨论快乐时同时阅读欲望的区分、痛苦的消除与维持安定的条件。'],
  '046': ['从一次自己改变意见的经历读起，看经验和自我观察怎样相互校正。', '随笔保留犹疑与具体情境，读到矛盾处可以追问写作的对象与时刻。'],
  '100': ['选一个视为理所当然的评价，追问它来自哪些生活方式和历史实践。', '价值批判涉及历史语境与多重解释，须分辨作者论证与后来的政治挪用。'],
  '054': ['记录一种情感怎样产生，再读情感、原因与行动能力的关系。', '因果理解与行动能力之间有复杂的推论，宜从文本的定义和命题逐层读。'],
  '015': ['用同一德性比较两个不同情境中的选择，观察习惯和判断的作用。', '中道依情境、行动者和目的而定，应结合实践智慧理解。'],
  '114': ['把一次行动看成可以修正的尝试，记录情境、证据和反馈。', '经验可能促进或阻碍进一步学习，要检视经验的组织方式和后果。'],
  '111': ['比较一次以礼物建立联系和一次由价格完成的交换。', '货币的抽象化可带来选择空间，也可能改变人与物的距离。'],
  '068': ['先读道德判断，再读交换，观察理解他人与个人利益如何同时出现。', '《道德情操论》与经济论述各有问题和语境，宜对照阅读。'],
  '086': ['用一场意见分歧检验自由讨论和行动边界的不同要求。', '理解伤害原则需要辨认所讨论的行为、他人利益以及具体条件。'],
  '130': ['留意对话中把对方当作一个可处理对象或具体相遇者的不同方式。', '“我与你”与“我与它”描述关系的样态，阅读时保留其宗教哲学语境。'],
} as Record<string, [string, string]>;

function bookList(person?: Person) {
  const items = person ? BOOKS.filter(book => book.person === person.id) : BOOKS;
  return items.map(book => `<article class="book-card"><span class="eyebrow">${e(book.category)} · ${e(book.difficulty)}</span>
<h3>${e(book.work)}</h3><p class="muted">${e(book.name)}</p><p>${e(book.why)}</p><a class="text-link" href="${e(book.url)}" rel="noopener noreferrer">馆藏或原文 ${arrow}</a></article>`).join('');
}

function featureModules(person: Person) {
  if (!person.featured) return '';
  const feature = person.featured;
  const a = person.articles.find(article => article.kind === 'A');
  const b = person.articles.find(article => article.kind === 'B');
  const [guide, boundary] = info[person.id] || [feature.direction, '对照原典和现代应用的小节，明确解释的适用范围。'];
  const history = entryFor(a?.body || '', /生平|历史|脉络/);
  const applied = entryFor(b?.body || '', /现代启发|意义和启发|对现代人|使用方法|深化/);
  const concepts = feature.concepts.map(concept => {
    const snippet = (a?.body || '').split(/\n\s*\n/).find(block => !block.startsWith('#') && block.includes(concept));
    return `<li><strong>${e(concept)}</strong><p>${e(snippet ? excerpt(snippet, 132) : '从文章 A 的主要思想小节核对相关概念和上下文。')}</p></li>`;
  }).join('');
  const personalSources = a?.sources.filter(source => /原典|作品|著作|文集|传习|逍遥|随笔|伦理|On |Works|Essay|Philosophy/i.test(source.title)) || [];
  return `<section class="module" id="guide"><span class="eyebrow">深度阅读导读</span><h2>${e(feature.direction.split('：')[0])}</h2><p>${e(guide)}</p></section>
<section class="module" id="concepts"><h2>核心概念</h2><ul class="concept-list">${concepts}</ul>${a ? `<a class="text-link" href="${link(articleRoute(person, 'A'))}">回到文章 A 的主要思想 ${right}</a>` : ''}</section>
${history ? `<section class="module" id="intellectual-history"><h2>思想发展脉络</h2><p>${e(history)}</p><a href="${link(articleRoute(person, 'A'))}">查看生平和思想的完整叙述 ${right}</a></section>` : ''}
<section class="module" id="application"><h2>现实问题导读</h2><p>${e(applied || guide)}</p>${b ? `<a href="${link(articleRoute(person, 'B'))}">进入现代意义与启发 ${right}</a>` : ''}</section>
<section class="module" id="boundaries"><h2>常见误读与适用边界</h2><p>${e(boundary)}</p></section>
<section class="module" id="books"><h2>原典及分层阅读</h2><ol class="route-steps"><li><strong>入门</strong> · 先看生平与主要问题，圈出在原典中需要追索的概念。</li><li><strong>深入</strong> · 读源文所列作品的相关章节，记录论点、理由和限定条件。</li><li><strong>延伸</strong> · 带着一个现实问题读文章 B，再到相关主题比较不同作者。</li></ol>
<div class="grid book-grid">${bookList(person)}</div>${sourceList(personalSources.slice(0, 3))}<a class="text-link" href="${link('reading/')}">查看书单与阅读路径 ${right}</a></section>
${feature.sections?.map(section => `<section class="module"><h2>${e(section.title)}</h2><p>${e(section.body)}</p>
<a href="${link(articleRoute(person, section.source))}">查看关联正文 ${right}</a></section>`).join('') || ''}`;
}

export function personPage(person: Person, people: Person[]) {
  const available = people.filter(other => other.id !== person.id);
  const related = available.flatMap(other => {
    const common = TOPICS.find(topic => person.topics.includes(topic.id) && other.topics.includes(topic.id));
    if (common) return [{ other, reason: '同列“' + common.name + '”主题' }];
    if (person.region && person.tradition && other.region === person.region && other.tradition === person.tradition) {
      return [{ other, reason: '可从相同地区和传统比较各自的问题与语境' }];
    }
    return [];
  }).sort((a, b) => Number(b.reason.startsWith('同列')) - Number(a.reason.startsWith('同列'))).slice(0, 4)
    .map(({ other, reason }) => ({ other, relation: { from: person.id, to: other.id, kind: 'editorial_comparison', reason } as Relationship }));
  const references = [...new Map(person.articles.flatMap(article => article.sources).map(source => [source.url || source.title, source])).values()];
  const art = person.assets.find(asset => asset.slot === 'A1');
  const aliases = person.aliases.filter(alias => alias.toLowerCase() !== person.originalName.toLowerCase());
  return `<div class="wrap page"><section class="profile-head"><div class="profile-intro"><div class="eyebrow">人物 NO. ${person.id} ${person.featured ? ' · 重点人物' : ''}</div>
<h1>${e(person.name)}</h1>${person.originalName ? `<p class="original-name" lang="en">${e(person.originalName)}</p>` : ''}
${aliases.length ? `<p class="muted">检索别名 ${e(aliases.join(' · '))}</p>` : ''}
<p class="profile-date">${e(person.years.label)}${person.region ? ' · ' + e(person.region) : ''}${person.tradition ? ' · ' + e(person.tradition) : ''}</p>
${person.years.sources?.length ? '<p class="profile-citation"><a href="#chronology">查看年代依据 ↓</a></p>' : ''}
<p class="lede">${e(excerpt(person.overview, 230))}</p><div class="actions">${bookmark('person-' + person.id, person.name, personRoute(person))}${correction(person.name, personRoute(person))}</div>
</div><figure class="profile-figure"><div class="picture"><span class="picture-placeholder" aria-hidden="true">${e(person.name)}</span>${art ? image(person, art, true) : ''}</div><figcaption>${e(person.name)} · 人物主题插图</figcaption></figure></section>
${chronologySources(person.years)}
<section class="module" id="articles"><div class="section-bar"><div><span class="eyebrow">A / B</span><h2>从两篇文章开始</h2></div></div>
<div class="grid two">${person.articles.map(article => `<a class="article-card" href="${link(articleRoute(person, article.kind))}"><span class="article-letter">${article.kind}</span>
<div><h3>${article.kind === 'A' ? '生平与主要思想' : '现代意义与启发'}</h3><p>${article.kind === 'A' ? '由处境和作品理解主要问题。' : '把思想放回现实处境，辨认解释的限度。'}</p></div>${right}</a>`).join('')}</div></section>
${person.featured ? `<nav class="jump-list" aria-label="深度阅读导航"><a href="#guide">导读</a><a href="#concepts">概念</a><a href="#application">现实问题</a><a href="#books">原典</a>${person.media?.display_state !== 'hidden' ? '<a href="#media">人物影像</a>' : ''}<a href="#references">来源</a></nav>` : ''}
<div class="profile-content">${featureModules(person)}${mediaPanel(person)}
<section class="module" id="illustrations"><h2>图像与说明</h2><p>每组图像随文章组织，呈现人物、场景、概念与当代映射。</p>${gallery(person)}</section>
<section class="module" id="references"><h2>出处与继续阅读</h2>${sourceList(references)}
${person.topics.length ? `<div class="chip-row">${person.topics.map(id => {
    const topic = TOPICS.find(topic => topic.id === id);
    return topic ? `<a class="chip" href="${link(topicRoute(id))}">${e(topic.name)}</a>` : '';
  }).join('')}</div>` : ''}</section>
${related.length ? `<section class="module"><h2>相关人物</h2><p>以下为编辑比较，可沿共享主题、地区和思想传统继续阅读。</p><ul class="related-list">${related.map(({ other, relation }) =>
    `<li><a href="${link(personRoute(other))}">${e(other.name)} ${right}</a><span>${e(relation.reason)}</span></li>`).join('')}</ul></section>` : ''}
</div></div>`;
}

export function articlePage(person: Person, article: Article, publishedAt: string, previous?: [Person, Article], next?: [Person, Article], ad = false) {
  const { html, entries, back } = renderArticleBody(article);
  const other = person.articles.find(item => item.kind !== article.kind);
  const id = 'article-' + person.id + '-' + article.kind;
  const route = articleRoute(person, article.kind);
  return `<div class="wrap page article-page" data-reading-id="${e(id)}" data-title="${e(article.title)}" data-route="${e(link(route))}">
<header class="article-head"><span class="eyebrow">文章 ${article.kind} · ${article.kind === 'A' ? '人物与思想' : '当代阅读'}</span>
<h1>${e(article.title)}</h1><p class="article-meta">项目资料编整 · ${e(person.name)} ${publishedAt ? '· 首发 ' + e(publishedAt) : ''}</p>
<div class="actions">${bookmark(id, article.title, route)}<button type="button" class="button outline js-control" data-share>复制原链接</button>
<button type="button" class="button outline js-control" data-print>打印</button><span data-action-status role="status"></span></div></header>
<div class="reading-layout"><aside class="toc" id="article-toc" aria-label="文章目录"><h2>文章目录</h2><ol>${entries.map(entry =>
    `<li><a href="#${entry.id}">${e(entry.title)}</a></li>`).join('')}</ol>${article.sources.length ? '<a href="#article-sources">尾注与来源</a>' : ''}
<p class="progress-label js-control" data-reading-progress></p><a data-resume-reading class="js-control" hidden href="#article-body">继续上次阅读</a></aside>
<div class="reading-main"><article id="article-body" class="prose">${html}</article>
${article.sources.length ? `<section class="module" id="article-sources"><h2>尾注与来源</h2>${sourceList(article.sources, back)}</section>` : ''}
${gallery(person, article.kind)}
<div class="article-actions"><a href="${link(personRoute(person))}">← 返回${e(person.name)}人物页</a>
${other ? `<a href="${link(articleRoute(person, other.kind))}">转到文章 ${other.kind} ${right}</a>` : ''}
${correction(article.title, route)}</div>
<nav class="article-pagination" aria-label="连续阅读">${previous ? `<a href="${link(articleRoute(previous[0], previous[1].kind))}"><span>上一篇</span>${e(previous[1].title)}</a>` : ''}
${next ? `<a href="${link(articleRoute(next[0], next[1].kind))}"><span>下一篇</span>${e(next[1].title)}</a>` : ''}</nav>
${ad ? '<div class="ad-slot" data-ad-slot hidden aria-label="广告"></div>' : ''}
<p class="article-meta">源文件修订日期 ${e(article.sourceDate.slice(0, 10))}</p></div></div></div>`;
}

export function topics() {
  return `<div class="wrap page">${heading('带着问题读', '从五个现实问题出发，沿着人物、两类文章和原典建立自己的阅读顺序。', '主题总览')}
<h2 class="sr-only">首发主题</h2>
<div class="topic-grid">${topicCards()}</div></div>`;
}

export function topicPage(topic: (typeof TOPICS)[number], people: Person[]) {
  const order = [...topic.ids, ...people.filter(person => person.topics.includes(topic.id) && !(topic.ids as readonly string[]).includes(person.id)).map(p => p.id)];
  const group = order.flatMap(id => people.find(person => person.id === id && person.topics.includes(topic.id)) || []);
  return `<div class="wrap page">${heading(topic.name, topic.line, '主题 ' + topic.number + ' · ' + topic.short)}
<section class="module intro-panel"><h2>带着这个问题阅读</h2><p>${e(topic.prompt)}</p></section>
<section class="module"><h2>阅读顺序</h2><ol class="topic-steps">${group.map(person => `<li><h3><a href="${link(personRoute(person))}">${e(person.name)}</a></h3>
<p>${e(info[person.id]?.[0] || person.featured?.direction || excerpt(person.overview, 95))}</p>
<div class="chip-row">${person.articles.map(article => `<a class="chip" href="${link(articleRoute(person, article.kind))}">${article.kind === 'A' ? '生平与思想' : '现代意义与启发'} ${right}</a>`).join('')}</div></li>`).join('')}</ol>
</section><a class="text-link" href="${link('reading/')}">进入原典书单 ${right}</a></div>`;
}

export function reading() {
  const shopCode = link('assets/wechat-shop-code.png');
  return `<div class="wrap page">${heading('书单与阅读路径', '从原著、导读或现代延伸出发，选择适合当前问题的阅读深度。', '原典与继续阅读')}
<section class="module"><h2>三步读懂一个问题</h2><ol class="route-steps">
<li><strong>入门 · 找到切入点</strong><p>适合初次接触的读者。先在<a href="${link('thinkers/featured/')}">重点人物</a>选择一位作者，阅读人物导读和文章 A。</p></li>
<li><strong>深入 · 读一段原典</strong><p>适合已经有一个概念疑问的读者。在下方找原文或可靠导读，记录论点和证据。</p></li>
<li><strong>延伸 · 对照现实处境</strong><p>适合想继续比较的读者。读文章 B，再返回<a href="${link('topics/')}">现实问题</a>比较不同作者。</p></li>
</ol></section><section class="module"><h2>从这些书与资料开始</h2><div class="grid book-grid">${bookList()}
<aside class="book-card wechat-shop-card" aria-labelledby="wechat-shop-title">
  <div><span class="eyebrow">购书入口</span><h3 id="wechat-shop-title">微信小店</h3><p>用微信扫一扫，浏览小店书目。点击小店码可查看原图。</p></div>
  <a class="wechat-shop-code" href="${shopCode}" aria-label="查看微信小店码原图"><img src="${shopCode}" width="834" height="650" alt="微信小店橱窗小程序码"></a>
</aside></div></section></div>`;
}

export function saved() {
  return `<div class="wrap page">${heading('收藏与继续阅读', '收藏和进度保存在当前浏览器。更换设备或清理浏览器数据后，记录可能丢失。', '本地书签')}
<noscript><p class="note">启用 JavaScript 后可以查看此设备的收藏和进度。</p></noscript>
<section class="module"><div class="section-bar"><h2>收藏</h2><button type="button" class="button outline js-control" data-clear="saved">清除收藏</button></div><div data-saved-list></div></section>
<section class="module"><div class="section-bar"><h2>继续阅读</h2><button type="button" class="button outline js-control" data-clear="progress">清除进度</button></div><div data-progress-list></div></section>
<p data-saved-status role="status"></p><a class="text-link" href="${link('thinkers/')}">浏览人物总览 ${right}</a></div>`;
}

export function infoPage(route: string) {
  const sections: Record<string, [string, string]> = {
    'about/': ['关于与联系', `<p>《${SITE}》以人物、时间与现实问题组织中文阅读资料。每位人物的两篇文章分别提供历史语境、主要思想与现代阅读线索。</p>
<p>站点由 GitHub 账号 <a href="https://github.com/jackie8410">jackie8410</a> 的项目仓库维护，托管于 GitHub Pages。</p>
<h2>联系与纠错</h2><p>可用项目的公开 GitHub Issues 反馈错误、补充来源和报告功能问题。页面上的纠错入口会带入网页地址。请在反馈中填写小节或段落，以及可核对的资料出处。</p>
<p>${correction('站点', 'about/')}</p>`],
    'editorial/': ['编辑方法与 AI 使用', '<p>站点将原始名录、文章和图像按人物永久编号关联，保留源文件校验和版本记录。主题关联用于编辑比较，人物插图服务于阅读。</p><p>项目所有者授权使用本地资料上线。本版使用程序核对文件、映射和页面，并由 AI 辅助开发、结构化与撰写导读。正文中的观点、引文和历史细节应结合尾注及原典核对。年代区间来自可识别的源稿表述，缺项列为待核实。</p><p>心理学介绍属于思想史阅读材料。涉及具体健康问题时，请通过有资质的专业渠道求助。</p>'],
    'sources/': ['来源与版权', '<p>文章尾注保留资料所列的原典、书目、网页和写作边界说明。阅读原著与译本时，请核对实际版本、页码与授权。</p><p>站内人物图像是与文字配套的创作插图。公开端使用压缩副本，项目维护者保存原件。转引、转载或商用时，请依据具体作品和版本的使用条件。</p>'],
    'disclosure/': ['广告与推广', `<p><a href="${link('reading/')}">书单页</a>的微信小店卡片是本站维护者提供的购书入口。扫码可在微信浏览小店橱窗及在售信息。</p><p>原文和档案可通过书目卡片查阅。本站当前未启用第三方广告。</p>`],
    'privacy/': ['隐私与 Cookie', '<p>网站在浏览器本地存储收藏和阅读进度，可在收藏页清除。站内搜索在浏览器中匹配公开目录。搜索页通过地址传递搜索词，地址可能进入浏览器历史及托管方的访问处理。</p><p>站点托管由 GitHub Pages 提供。访问外部书目、来源与公开纠错区时，由目的站点处理相应请求。反馈内容在 GitHub Issues 上公开，请避免提交个人联系信息。</p><p>当前部署关闭第三方广告、统计和自动视频嵌入。GitHub 的数据处理说明见 <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener noreferrer">GitHub 隐私声明</a>。</p>'],
    'terms/': ['使用条款', '<p>本项目提供教育与阅读参考。引用历史观点时，请回到原典、版本和上下文。图像、译文和外部资料的权利依据其具体作品和来源处理。</p><p>纠错请说明页面、段落和来源。维护者通过项目记录跟踪修订与撤回。</p>'],
  };
  const [title, body] = sections[route];
  return `<div class="wrap page info-page">${heading(title, '', '站点说明')}<div class="prose">${body}</div></div>`;
}

export function notFound() {
  return `<div class="wrap page">${heading('页面没有找到', '这个地址可能已迁移或撤回。请通过人物总览或搜索重新定位。', '404')}
<div class="actions">${button('返回首页', link())}${button('搜索', link('search/'), true)}</div></div>`;
}
