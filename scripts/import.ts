import { readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';
import {
  EDITS, GALLERY, INDEX, PRIVATE, ROOT, SOURCE, digest, edition, load, readSources, safeSource, save,
} from './model.ts';
import type { Article, Asset, EditRecord, Person, Slot } from './model.ts';
import { chronologyYear, extractMetadata, featured, TOPICS } from './catalog.ts';

type RosterRow = { id: string; name: string; batch: string; manifestStatus: string };
const manifest = '世界哲学与思想者长河-140位人物及资料完成总表.docx';
const MAX_TEXT = 16 * 1024 * 1024;
const MAX_IMAGE = 32 * 1024 * 1024;
const sourceEntries = readdirSync(SOURCE, { withFileTypes: true });
const inventory: { person: string; type: string; path: string; hash: string; bytes: number }[] = [];
const issues: { person: string; kind: string; path: string; detail: string }[] = [];
const decoder = new TextDecoder('utf-8', { fatal: true });

function readInput(relative: string, limit: number) {
  const file = safeSource(relative);
  const stat = statSync(file);
  if (!stat.isFile() || stat.size === 0 || stat.size > limit) throw new Error('文件为空、类型错误或超出大小限制');
  return { file, stat, bytes: readFileSync(file) };
}

function docx<T>(mode: string, file: string): T {
  const python = process.env.PHILOSOPHY_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const out = spawnSync(python, [path.join(ROOT, 'scripts', 'read_docx.py'), mode, file], {
    encoding: 'utf8', maxBuffer: MAX_TEXT, timeout: 30_000, windowsHide: true,
  });
  if (out.error || out.status !== 0) throw new Error('无法读取 DOCX。请检查文件和 Python 3 配置。');
  return JSON.parse(out.stdout) as T;
}

function inputText(relative: string, data: { file: string; bytes: Buffer }): string {
  const ext = path.extname(relative).toLowerCase();
  if (ext === '.docx') return docx<string>('article', data.file);
  const text = decoder.decode(data.bytes).replace(/\r\n?/g, '\n');
  if (ext === '.json') {
    const data = JSON.parse(text) as { title?: unknown; body?: unknown };
    if (typeof data.title !== 'string' || typeof data.body !== 'string') throw new Error('JSON 文章需要 title 和 body');
    return '# ' + data.title + '\n\n' + data.body;
  }
  return text;
}

function issue(person: string, kind: string, relative: string, detail: string) {
  issues.push({ person, kind, path: relative, detail });
}
function list(relative: string) {
  return readdirSync(safeSource(relative), { withFileTypes: true }).filter(entry => entry.isFile())
    .map(entry => entry.name).sort((a, b) => a.localeCompare(b, 'zh'));
}
function single(files: string[], id: string, dir: string, kind: string, predicate: RegExp) {
  const matching = files.filter(file => predicate.test(file));
  if (matching.length !== 1) {
    issue(id, matching.length ? '重复' : '缺失', dir, kind + ' ' + matching.join('、'));
    return null;
  }
  return dir + '/' + matching[0];
}
function record(id: string, type: string, relative: string, bytes: Buffer) {
  const hash = digest(bytes);
  inventory.push({ person: id, type, path: relative, hash, bytes: bytes.length });
  return hash;
}
function intro(article?: Article) {
  return article?.body.split(/\n\s*\n/).map(block => block.trim())
    .find(block => block && !/^#|\[|[-*]\s/.test(block)) || '';
}
const normalizeName = (name: string) => name.normalize('NFKC').replace(/[\s·・‧—-]/g, '');

const rosterInput = readInput(manifest, MAX_TEXT);
record('', '总表', manifest, rosterInput.bytes);
const roster = docx<RosterRow[]>('roster', rosterInput.file);
if (roster.length !== 140 || new Set(roster.map(row => row.id)).size !== 140 ||
    roster.some((row, index) => row.id !== String(index + 1).padStart(3, '0') || !row.name)) {
  throw new Error('总表必须含连续且唯一的 001 至 140 永久 ID');
}

const old = load<Person[]>(INDEX, []);
const edits = load<Record<string, EditRecord>>(EDITS, {});
const published = edition().people;
const researchedYears = new Map(published.filter(person => person.years.sources?.length)
  .map(person => [person.id, person.years]));
const oldById = new Map(old.map(person => [person.id, person]));
const dirs = sourceEntries.filter(entry => entry.isDirectory() && /^\d{2,3}-[a-z0-9-]+$/.test(entry.name));
const slugs = new Set<string>();
const people: Person[] = [];

for (const row of roster) {
  const { id, name, batch } = row;
  const match = dirs.filter(entry => Number(entry.name.split('-', 1)[0]) === Number(id));
  if (match.length !== 1) issue(id, '人物目录', SOURCE, '编号应对应唯一目录');
  const dir = match.length === 1 ? match[0].name : null;
  let slug = oldById.get(id)?.slug || dir?.replace(/^\d+-/, '') || 'thinker-' + id;
  if (slug === 'featured' || slugs.has(slug)) slug = 'thinker-' + id;
  slugs.add(slug);
  const articles: Article[] = [];
  const assets: Asset[] = [];
  const profile = featured(id);
  let plan = null;
  if (dir) {
    const files = list(dir);
    for (const kind of ['A', 'B'] as const) {
      const prefix = kind === 'A' ? '01' : '02';
      const relative = single(files, id, dir, '文章 ' + kind,
        new RegExp('^' + prefix + '-.+文章' + kind + '.+\\.(md|txt|docx|json)$', 'i'));
      if (!relative) continue;
      try {
        const data = readInput(relative, MAX_TEXT);
        const markdown = inputText(relative, data).trim();
        const first = markdown.match(/^#\s+(.+)\n/);
        const title = first?.[1].trim() || name + ' · ' + (kind === 'A' ? '生平与主要思想' : '现代意义与启发');
        const fromTitle = first?.[1].split(/[：:]/, 1)[0]?.trim();
        if (fromTitle && normalizeName(fromTitle) !== normalizeName(name)) issue(id, '姓名需核验', relative, name + ' / ' + fromTitle);
        const body = first ? markdown.slice(first[0].length).trim() : markdown;
        if (body.length < 120) throw new Error('正文过短');
        articles.push({ kind, title, body, source: relative, hash: record(id, kind, relative, data.bytes),
          sourceDate: data.stat.mtime.toISOString(), sources: readSources(body) });
      } catch (error) {
        issue(id, '解析失败', relative, (error as Error).message);
      }
    }
    const candidate = single(files, id, dir, '配图方案', /^03-.+配图方案.+\.(md|txt|docx|json)$/i);
    if (candidate) {
      try {
        const data = readInput(candidate, MAX_TEXT);
        if (!inputText(candidate, data).trim()) throw new Error('方案内容为空');
        record(id, '配图方案', candidate, data.bytes);
        plan = candidate;
      } catch (error) {
        issue(id, '解析失败', candidate, (error as Error).message);
      }
    }
    const imageDir = dir + '/images';
    let imageFiles: string[] = [];
    try { imageFiles = list(imageDir); } catch { issue(id, '图片目录', imageDir, '无法读取目录'); }
    for (const slot of GALLERY) {
      const relative = single(imageFiles, id, imageDir, slot,
        new RegExp('^' + slot + '[-_].+\\.(png|jpe?g|webp)$', 'i'));
      if (!relative) continue;
      try {
        const data = readInput(relative, MAX_IMAGE);
        const meta = await sharp(data.bytes, { limitInputPixels: 25_000_000, failOn: 'error' }).metadata();
        if (!meta.width || !meta.height || !['png', 'jpeg', 'webp'].includes(meta.format)) throw new Error('图片类型或尺寸不合法');
        const caption = path.basename(relative, path.extname(relative)).slice(slot.length + 1);
        assets.push({ slot: slot as Slot, file: relative, hash: record(id, slot, relative, data.bytes),
          width: meta.width, height: meta.height, alt: name + '相关插图 · ' + caption, caption });
      } catch (error) {
        issue(id, '解析失败', relative, (error as Error).message);
      }
    }
  }
  const overview = intro(articles.find(article => article.kind === 'A'));
  const meta = extractMetadata(overview, name, slug, articles.find(article => article.kind === 'A')?.body);
  const topicIds = TOPICS.filter(topic => (topic.ids as readonly string[]).includes(id)).map(topic => topic.id);
  const poster = assets.find(asset => asset.slot === 'A1') || assets[0];
  people.push({ id, name, slug, batch, ...meta, years: researchedYears.get(id) ?? meta.years,
    overview, articles, assets, plan, topics: topicIds, featured: profile,
    media: profile ? { display_state: 'placeholder', poster_asset_id: poster?.slot ?? null,
      poster_alt: poster?.alt ?? name + '的人物影像', caption: '人物影像 · ' + (poster?.caption ?? '栏目底图'),
      aspect_ratio: '16:9', video_url: null, duration_seconds: null, captions_url: null, transcript: null } : null,
    flags: issues.filter(item => item.person === id).map(item => item.kind + ' ' + item.detail),
  });
}

const changes = people.flatMap(person => {
  const previous = oldById.get(person.id);
  return (['A', 'B'] as const).flatMap(kind => {
    const before = previous?.articles.find(article => article.kind === kind)?.hash;
    const after = person.articles.find(article => article.kind === kind)?.hash;
    const edit = edits[person.id]?.articles?.[kind];
    if (before === after && (!edit || !after || after === edit.sourceHash)) return [];
    return [{ person: person.id, kind, before: before || null, after: after || null,
      status: edit && after !== edit.sourceHash ? '人工版本冲突' : !before ? '新增' : !after ? '源文件缺失' : '源文件变化' }];
  });
});

const hashes = new Map<string, string[]>();
for (const file of inventory.filter(file => /^[AB][1-4]$/.test(file.type))) {
  const same = hashes.get(file.hash) || [];
  same.push(file.path);
  hashes.set(file.hash, same);
}
const duplicateImages = [...hashes.values()].filter(files => files.length > 1);
const report = {
  expected: { people: 140, articles: 280, plans: 140, images: 1120 },
  parsed: { people: people.length, articles: people.reduce((sum, person) => sum + person.articles.length, 0),
    plans: people.filter(person => person.plan).length, images: people.reduce((sum, person) => sum + person.assets.length, 0) },
  published: published.length,
  roster,
  auxiliary: sourceEntries.filter(entry => !dirs.includes(entry) && entry.name !== manifest).map(entry => entry.name).sort(),
  issues, duplicateImages, changes, inventory,
};
save(INDEX, people);
save(path.join(PRIVATE, 'import-report.json'), report);
console.log(JSON.stringify({ parsed: report.parsed, issues: issues.length, duplicateImageGroups: duplicateImages.length,
  changes: changes.length, datesKnown: people.filter(person => person.years.birth !== null).length,
  datesPositioned: people.filter(person => chronologyYear(person.years) !== null).length,
  titleIssues: issues.filter(issue => issue.kind === '姓名需核验') }, null, 2));
