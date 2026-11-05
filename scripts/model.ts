import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PRIVATE = path.join(ROOT, '.private');
const envFile = path.join(ROOT, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
export const SOURCE = path.resolve(ROOT, process.env.SOURCE_DIR || '../world-philosophy-series');
export const SITE = '世界哲学与思想者长河';
export const REPO = 'https://github.com/jackie8410/philosophy-river';
export const SITE_URL = new URL(process.env.SITE_URL || 'https://jackie8410.github.io/philosophy-river/');
if (!/^https?:$/.test(SITE_URL.protocol) || !SITE_URL.pathname.endsWith('/') || SITE_URL.search || SITE_URL.hash) {
  throw new Error('SITE_URL 必须为以 / 结尾的 HTTP(S) 地址');
}
export const BASE = SITE_URL.pathname;
export const PUBLISHED = path.join(ROOT, 'content', 'published.json');
export const INDEX = path.join(PRIVATE, 'index.json');
export const EDITS = path.join(PRIVATE, 'edits.json');
export const GALLERY = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'] as const;
export type Slot = (typeof GALLERY)[number];

export interface Years {
  birth: number | null;
  death: number | null;
  label: string;
  precision: 'source' | 'documented' | 'approximate' | 'disputed' | 'period' | 'unknown';
  sortAnchor?: { year: number; kind: 'birth-range' | 'activity' | 'tradition' };
  note?: string;
  sources?: { title: string; url: string; supports: string }[];
  checkedAt?: string;
}
export interface Source { title: string; url?: string; key: string }
export interface Article {
  kind: 'A' | 'B';
  title: string;
  body: string;
  source: string;
  hash: string;
  sourceDate: string;
  sources: Source[];
}
export interface Asset {
  slot: Slot;
  file: string;
  hash: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}
export interface FeaturedProfile {
  order: number;
  direction: string;
  concepts: string[];
  sections?: { title: string; body: string; source: 'A' | 'B' }[];
}
export interface MediaReference {
  display_state: 'placeholder' | 'video_ready' | 'hidden';
  poster_asset_id: Slot | null;
  poster_alt: string;
  caption: string;
  aspect_ratio: string;
  video_url: string | null;
  duration_seconds: number | null;
  captions_url: string | null;
  transcript: string | null;
  permission?: string;
}
export interface Person {
  id: string;
  name: string;
  originalName: string;
  aliases: string[];
  slug: string;
  batch: string;
  years: Years;
  region: string;
  tradition: string;
  overview: string;
  articles: Article[];
  assets: Asset[];
  plan: string | null;
  topics: string[];
  featured: FeaturedProfile | null;
  media: MediaReference | null;
  flags: string[];
}
export type ContentStatus = 'draft' | 'needs_review' | 'reviewed' | 'published' | 'withdrawn';
export interface PublicationRecord {
  id: string;
  state: ContentStatus;
  version: string;
  at: string;
  actor: string;
  note: string;
  review: 'operator' | 'owner_authorized' | null;
}
export interface Edition {
  people: Person[];
  records: PublicationRecord[];
}
export interface Relationship {
  from: string;
  to: string;
  kind: 'editorial_comparison' | 'documented_influence';
  reason: string;
  evidence?: Source;
}
export interface EditRecord {
  patch: Partial<Pick<Person, 'name' | 'originalName' | 'aliases' | 'years' | 'region' | 'tradition' | 'overview' | 'topics' | 'featured' | 'media'>>;
  articles?: Partial<Record<Article['kind'], Pick<Article, 'title' | 'body'> & { sourceHash: string }>>;
  history: PublicationRecord[];
}

export function load<T>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) as T;
}

export function save(file: string, data: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.' + randomUUID() + '.tmp';
  writeFileSync(temp, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
  renameSync(temp, file);
}

export function digest(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeSource(relative: string): string {
  if (!relative || path.isAbsolute(relative) || /(^|[/\\])\.\.([/\\]|$)|[:\0]/.test(relative)) throw new Error('输入路径越界');
  const root = realpathSync(SOURCE);
  const result = realpathSync(path.resolve(root, relative));
  const prefix = path.relative(root, result);
  if (!prefix || prefix.startsWith('..') || path.isAbsolute(prefix)) throw new Error('输入路径越界');
  return result;
}

export function applyEdit(person: Person, edit?: EditRecord): Person {
  if (!edit) return person;
  return {
    ...person,
    ...edit.patch,
    articles: person.articles.map(article => {
      const revision = edit.articles?.[article.kind];
      return revision ? { ...article, title: revision.title, body: revision.body, sources: readSources(revision.body) } : article;
    }),
  };
}

export function currentPeople(): Person[] {
  const imported = load<Person[]>(INDEX, []);
  const edits = load<Record<string, EditRecord>>(EDITS, {});
  return imported.map(person => applyEdit(person, edits[person.id]));
}

export function readSources(markdown: string): Source[] {
  const tail = markdown.split(/^#{1,4}\s+[^\n]*(?:尾注与来源|参考文献|参考资料|注释与来源)[^\n]*$/m).slice(1).join('\n');
  return Array.from(tail.matchAll(/^\s*\[(\d+)\]\s*(.+)$/gm), match => {
    const url = match[2].match(/https?:\/\/[^\s）。，、；；<>\]]+/)?.[0]?.replace(/[.)]+$/, '');
    return { key: match[1], title: match[2].replace(url || '\0', '').replace(/[:：\s。]+$/, ''), url };
  });
}

export function edition(): Edition {
  return load(PUBLISHED, { people: [], records: [] });
}

export function assetName(person: Person, asset: Asset, width: 480 | 1100): string {
  return [person.id, asset.slot.toLowerCase(), asset.hash.slice(0, 14), width].join('-') + '.webp';
}

export function mediaValid(media: MediaReference | null): boolean {
  if (!media || media.display_state !== 'video_ready') return true;
  return Boolean(
    media.permission?.trim() && Number.isFinite(media.duration_seconds) && media.duration_seconds! > 0 &&
    media.video_url && (
      /^assets\/media\/[a-z0-9][a-z0-9._-]*\.(mp4|webm)$/i.test(media.video_url) ||
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}$/.test(media.video_url)
    ) && (!media.captions_url || /^assets\/media\/[a-z0-9][a-z0-9._-]*\.vtt$/i.test(media.captions_url))
  );
}
