import { ADSENSE_SCRIPT, canRequestAd } from './ad-policy.js';

document.documentElement.classList.add('js');
const base = document.documentElement.dataset.base;
const key = 'philosophy-river:' + base + ':';
const get = selector => document.querySelector(selector);
const all = selector => Array.from(document.querySelectorAll(selector));
const normalize = text => text.normalize('NFKC').toLocaleLowerCase('zh').replace(/[\s·・'’-]+/g, '');

function read(name) {
  try {
    const value = JSON.parse(localStorage.getItem(key + name) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
function write(name, value) {
  try { localStorage.setItem(key + name, JSON.stringify(value)); return true; }
  catch { return false; }
}
function setStatus(selector, text) {
  const status = get(selector);
  if (status) status.textContent = text;
}
function safeRoute(route) {
  if (typeof route !== 'string' || !route.startsWith(base) || route.startsWith('//')) return null;
  try {
    const url = new URL(route, location.origin);
    return url.origin === location.origin && url.pathname.startsWith(base) ? url : null;
  } catch { return null; }
}

for (const image of all('[data-fallback-image]')) {
  const fallback = () => { image.hidden = true; };
  image.addEventListener('error', fallback, { once: true });
  if (image.complete && !image.naturalWidth) fallback();
}

const catalog = get('[data-catalog]');
if (catalog) {
  const form = get('[data-filters]');
  const query = get('[data-query]');
  const fields = all('[data-filter]');
  const rows = all('[data-record]');
  const params = new URLSearchParams(location.search);
  query.value = params.get('q') || '';
  const apply = () => {
    const words = query.value.trim().split(/\s+/).map(normalize).filter(Boolean);
    let count = 0;
    for (const row of rows) {
      const tokens = normalize(row.dataset.search || '');
      const visible = words.every(word => tokens.includes(word)) && fields.every(field => {
        const value = field.value;
        const data = row.dataset[field.dataset.filter] || '';
        return !value || (field.dataset.filter === 'topics' ? data.split(' ').includes(value) : data === value);
      });
      row.hidden = !visible;
      if (visible) count++;
    }
    setStatus('[data-count]', '匹配 ' + count + ' 位人物');
    get('[data-empty]').hidden = count > 0;
  };
  form.addEventListener('input', apply);
  form.addEventListener('change', apply);
  form.addEventListener('submit', event => { event.preventDefault(); apply(); });
  form.addEventListener('reset', () => {
    requestAnimationFrame(() => {
      if (location.search) history.replaceState(null, '', location.pathname);
      apply();
    });
  });
  apply();
}

const direction = get('[data-time-direction]');
const timeline = get('[data-timeline]');
if (direction && timeline) {
  const periods = Array.from(timeline.children);
  const items = periods.map(period => Array.from(period.querySelector('ol').children));
  direction.addEventListener('change', () => {
    const desc = direction.value === 'desc';
    const known = periods.slice(0, -1);
    timeline.append(...(desc ? known.reverse() : known), periods.at(-1));
    periods.forEach((period, i) => period.querySelector('ol').append(...(desc && i < periods.length - 1 ? [...items[i]].reverse() : items[i])));
  });
}

for (const control of all('[data-bookmark]')) {
  const id = control.dataset.bookmark;
  const show = () => {
    const active = Boolean(read('saved')[id]);
    control.setAttribute('aria-pressed', String(active));
    control.querySelector('span').textContent = active ? '已收藏' : '收藏';
  };
  show();
  control.addEventListener('click', () => {
    const records = read('saved');
    if (records[id]) delete records[id];
    else records[id] = { title: control.dataset.title, route: control.dataset.route, at: Date.now() };
    if (write('saved', records)) show();
    else setStatus('[data-action-status]', '浏览器当前无法写入本地收藏');
  });
}

const reader = get('[data-reading-id]');
const body = get('#article-body');
if (reader && body) {
  const id = reader.dataset.readingId;
  const resume = get('[data-resume-reading]');
  const previous = read('progress')[id];
  const view = () => {
    const rect = body.getBoundingClientRect();
    return Math.min(100, Math.max(0, Math.round(-rect.top / Math.max(1, rect.height - innerHeight * .65) * 100)));
  };
  if (previous?.percent > 0 && !location.hash) {
    resume.hidden = false;
    resume.textContent = '继续上次阅读 · ' + previous.percent + '%';
    resume.addEventListener('click', event => {
      event.preventDefault();
      window.scrollTo(0, window.scrollY + body.getBoundingClientRect().top +
        Math.max(1, body.offsetHeight - innerHeight * .65) * previous.percent / 100);
    });
  }
  let scheduled = false;
  const remember = () => {
    scheduled = false;
    const percent = view();
    setStatus('[data-reading-progress]', '当前阅读进度 ' + percent + '%');
    if (percent <= 0) return;
    const records = read('progress');
    if (records[id]?.percent === percent) return;
    records[id] = { title: reader.dataset.title, route: reader.dataset.route, at: Date.now(), percent };
    const ordered = Object.entries(records).sort((a, b) => b[1].at - a[1].at).slice(0, 140);
    write('progress', Object.fromEntries(ordered));
  };
  addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(remember);
    }
  }, { passive: true });
}

function savedList(selector, name) {
  const parent = get(selector);
  if (!parent) return;
  parent.replaceChildren();
  const records = Object.values(read(name))
    .filter(record => record && typeof record.title === 'string' && safeRoute(record.route))
    .sort((a, b) => b.at - a.at);
  if (!records.length) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = name === 'saved' ? '还没有收藏。在人物页或文章页点击收藏即可保存。' : '阅读文章时滚动正文，本站会在这个浏览器保存进度。';
    parent.append(p);
    return;
  }
  const list = document.createElement('ul');
  list.className = 'saved-items';
  for (const record of records) {
    const item = document.createElement('li');
    const anchor = document.createElement('a');
    const url = safeRoute(record.route);
    anchor.href = url.href;
    anchor.textContent = record.title;
    item.append(anchor);
    if (name === 'progress' && Number.isFinite(record.percent)) {
      const progress = document.createElement('span');
      progress.textContent = '进度 ' + record.percent + '%';
      item.append(progress);
    }
    list.append(item);
  }
  parent.append(list);
}

function refreshSaved() {
  savedList('[data-saved-list]', 'saved');
  savedList('[data-progress-list]', 'progress');
}
refreshSaved();
for (const control of all('[data-clear]')) {
  control.addEventListener('click', () => {
    const ok = write(control.dataset.clear, {});
    refreshSaved();
    setStatus('[data-saved-status]', ok ? '已清除当前设备上的' + (control.dataset.clear === 'saved' ? '收藏' : '进度') : '浏览器当前无法写入本地记录');
  });
}

get('[data-share]')?.addEventListener('click', async () => {
  const canonical = get('link[rel="canonical"]').href;
  try { await navigator.clipboard.writeText(canonical); setStatus('[data-action-status]', '已复制原链接'); }
  catch {
    const status = get('[data-action-status]');
    const field = document.createElement('input');
    field.value = canonical;
    field.setAttribute('aria-label', '可手动复制的原链接');
    field.readOnly = true;
    status.replaceChildren(field);
    field.select();
  }
});
get('[data-print]')?.addEventListener('click', () => window.print());
for (const anchor of all('[data-correction]')) {
  anchor.addEventListener('click', () => {
    const canonical = get('link[rel="canonical"]').href;
    const marked = location.hash && document.getElementById(location.hash.slice(1));
    const latest = [...all('#article-body h2[id], #article-body h3[id], .profile-content section[id]')].reverse()
      .find(node => node.getBoundingClientRect().top <= 160);
    const target = marked || latest;
    if (!target) return;
    const url = new URL(anchor.href);
    const title = target.querySelector('h2')?.textContent || target.textContent;
    url.searchParams.set('body', '页面：' + canonical + '#' + target.id + '\n问题位置：' + title.trim().slice(0, 85) +
      '\n问题说明：\n可核对的来源：');
    anchor.href = url.href;
  });
}

for (const figure of all('figure[data-video]')) {
  const play = figure.querySelector('[data-play]');
  const frame = figure.querySelector('.media-frame');
  const message = frame.querySelector('.video-message');
  const url = new URL(figure.dataset.video, location.origin);
  const remote = url.origin !== location.origin;
  if (remote) play.textContent = '同意连接 YouTube 后播放';
  play.addEventListener('click', () => {
    if (remote && (url.origin !== 'https://www.youtube-nocookie.com' || !/^\/embed\/[\w-]{11}$/.test(url.pathname))) {
      message.textContent = '该视频服务目前不可用。';
      message.hidden = false;
      return;
    }
    let player;
    const fail = () => {
      player?.remove();
      message.hidden = false;
      message.textContent = '视频暂时无法播放。可以继续阅读正文。';
      play.hidden = false;
    };
    message.hidden = true;
    play.hidden = true;
    if (remote) {
      player = document.createElement('iframe');
      player.title = '人物影片';
      player.referrerPolicy = 'no-referrer';
      player.allow = 'fullscreen; encrypted-media';
      player.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
      const timer = setTimeout(fail, 9_000);
      player.addEventListener('load', () => clearTimeout(timer), { once: true });
      player.addEventListener('error', () => { clearTimeout(timer); fail(); }, { once: true });
      player.src = url.href;
    } else {
      player = document.createElement('video');
      player.controls = true;
      player.playsInline = true;
      player.preload = 'metadata';
      player.setAttribute('aria-label', '人物影片');
      player.addEventListener('error', fail, { once: true });
      if (figure.dataset.captions) {
        const track = document.createElement('track');
        track.kind = 'captions';
        track.label = '中文字幕';
        track.srclang = 'zh';
        track.src = figure.dataset.captions;
        player.append(track);
      }
      player.src = url.href;
    }
    frame.append(player);
    if (!remote) player.play().catch(() => {});
  });
}

const adState = get('#ad-config');
const adSlot = get('[data-ad-slot]');
if (adState && adSlot) {
  const config = JSON.parse(adState.textContent);
  let script;
  let adTimer;
  let observer;
  const update = consent => {
    if (!canRequestAd(config, consent)) {
      const hadLiveScript = Boolean(script);
      script?.remove();
      adSlot.replaceChildren();
      adSlot.hidden = true;
      clearTimeout(adTimer);
      observer?.disconnect();
      script = undefined;
      if (hadLiveScript) location.reload();
      return;
    }
    if (script) return;
    const label = document.createElement('span');
    label.textContent = '广告';
    const slot = document.createElement('ins');
    slot.className = 'adsbygoogle';
    slot.style.display = 'block';
    slot.dataset.adClient = config.publisherId;
    slot.dataset.adSlot = config.slot;
    slot.dataset.adFormat = 'auto';
    adSlot.append(label, slot);
    adSlot.hidden = false;
    const hide = () => { adSlot.hidden = true; observer?.disconnect(); clearTimeout(adTimer); };
    observer = new MutationObserver(() => {
      if (slot.dataset.adStatus === 'unfilled') hide();
      if (slot.dataset.adStatus === 'filled') clearTimeout(adTimer);
    });
    observer.observe(slot, { attributes: true, attributeFilter: ['data-ad-status'] });
    script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = ADSENSE_SCRIPT + '?client=' + encodeURIComponent(config.publisherId);
    script.addEventListener('load', () => {
      if (adSlot.isConnected && !adSlot.hidden) (window.adsbygoogle ||= []).push({});
    }, { once: true });
    script.addEventListener('error', hide, { once: true });
    adTimer = setTimeout(hide, 8_000);
    document.head.append(script);
  };
  // 运营环境的 CMP 集成负责提供这些事实，缺失、拒绝及撤回均走关闭分支。
  window.addEventListener('philosophy:consent', event => update(event.detail));
  update(window.philosophyConsent);
}
