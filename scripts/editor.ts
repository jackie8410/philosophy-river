import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { TOPICS } from './catalog.ts';
import { EDITS, PRIVATE, PUBLISHED, currentPeople, digest, edition, load, mediaValid, save } from './model.ts';
import type { ContentStatus, EditRecord, Person, PublicationRecord } from './model.ts';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { actor: { type: 'string' }, note: { type: 'string' }, file: { type: 'string' },
    kind: { type: 'string' }, topic: { type: 'string' }, ids: { type: 'string' },
    'owner-authorized': { type: 'boolean' } },
});
const [command = 'status', id] = positionals;
const people = currentPeople();
const published = edition();
const edits = load<Record<string, EditRecord>>(EDITS, {});
const selected = people.find(person => person.id === id);
const existing = (id: string) => edits[id] ??= { patch: {}, history: [] };
const version = (person: Person) => digest(JSON.stringify(person));
const snapshots = (id: string, hash: string) => path.join(PRIVATE, 'versions', id, hash + '.json');
const latest = (id: string) => existing(id).history.at(-1);
const actor = values.actor?.trim() || '';
const note = values.note?.trim() || '';

function assertEditor() {
  if (!actor || !note) throw new Error('状态变更须提供 --actor 实际操作人和 --note 变更摘要。');
}
function assertContent(person: Person) {
  if (person.articles.length !== 2 || person.articles.some(article => article.body.trim().length < 120 || !article.sources.length)) {
    throw new Error(person.id + ' 缺少完整 A/B 正文或可追溯来源。');
  }
  if (!mediaValid(person.media)) throw new Error(person.id + ' 的视频配置缺少有效来源、权限或时长。');
}
function append(person: Person, state: ContentStatus, review: PublicationRecord['review'] = null) {
  const record = { id: person.id, state, version: version(person), at: new Date().toISOString(), actor, note, review };
  existing(person.id).history.push(record);
  return record;
}
function publish(person: Person, record: PublicationRecord) {
  assertContent(person);
  save(snapshots(person.id, record.version), person);
  const index = published.people.findIndex(entry => entry.id === person.id);
  if (index === -1) published.people.push(person);
  else published.people[index] = person;
  published.records.push(record);
}
function finish(writePublic = false) {
  if (writePublic) {
    published.people.sort((a, b) => a.id.localeCompare(b.id));
    save(PUBLISHED, published);
  }
  save(EDITS, edits);
}

switch (command) {
  case 'status': {
    const rows = (selected ? [selected] : people).map(person => ({
      id: person.id, name: person.name, active: published.people.some(entry => entry.id === person.id),
      status: latest(person.id)?.state || 'draft', flags: person.flags, history: selected ? existing(person.id).history : undefined,
    }));
    console.log(JSON.stringify(rows, null, 2));
    break;
  }
  case 'diff': {
    const reportPath = path.join(PRIVATE, 'import-report.json');
    if (!existsSync(reportPath)) throw new Error('先运行 npm run import');
    const report = load<{ changes: { person: string; kind: string }[]; issues: unknown[] }>(reportPath, { changes: [], issues: [] });
    console.log(JSON.stringify(id ? { changes: report.changes.filter(change => change.person === id),
      source: selected?.articles.map(({ kind, hash, source }) => ({ kind, hash, source })),
      overrides: edits[id]?.articles || {} } : { changes: report.changes, issues: report.issues }, null, 2));
    break;
  }
  case 'release': {
    assertEditor();
    if (!values['owner-authorized'] || published.records.length || people.length !== 140) {
      throw new Error('批量首发需要明确的项目所有者授权、完整名录与空白发布记录。后续更新使用逐条审核流程。');
    }
    people.forEach(assertContent);
    for (const person of people) publish(person, append(person, 'published', 'owner_authorized'));
    finish(true);
    console.log('已生成公开版本，共 ' + published.people.length + ' 位人物。');
    break;
  }
  case 'patch': {
    assertEditor();
    if (!selected || !values.file) throw new Error('用法 patch 005 --file <编辑 JSON> --actor <操作人> --note <摘要>');
    const change = JSON.parse(readFileSync(values.file, 'utf8').replace(/^\uFEFF/, '')) as {
      fields?: EditRecord['patch']; articles?: Partial<Record<'A' | 'B', { title: string; body: string }>>;
    };
    const entry = existing(selected.id);
    const allowed = new Set(['name', 'originalName', 'aliases', 'years', 'region', 'tradition', 'overview', 'topics', 'featured', 'media']);
    if (Object.keys(change.fields || {}).some(field => !allowed.has(field))) throw new Error('编辑字段超出允许范围');
    const next = { ...selected, ...change.fields };
    if (!next.name?.trim() || !Array.isArray(next.aliases) || !Array.isArray(next.topics) || !mediaValid(next.media)) {
      throw new Error('人物字段或媒体设置无效');
    }
    const imported = load<Person[]>(path.join(PRIVATE, 'index.json'), []).find(person => person.id === selected.id);
    for (const kind of ['A', 'B'] as const) {
      const draft = change.articles?.[kind];
      const source = imported?.articles.find(article => article.kind === kind);
      if (draft && (!source || !draft.title?.trim() || !draft.body?.trim())) throw new Error('文章编辑缺少来源、标题或正文');
      if (draft && source) (entry.articles ??= {})[kind] = { ...draft, sourceHash: source.hash };
    }
    entry.patch = { ...entry.patch, ...change.fields };
    append(next, 'draft');
    finish();
    break;
  }
  case 'accept-source': {
    assertEditor();
    const kind = values.kind;
    if (!selected || (kind !== 'A' && kind !== 'B')) throw new Error('请指定人物 ID 和 --kind A 或 B');
    const entry = existing(selected.id);
    if (entry.articles?.[kind]) delete entry.articles[kind];
    append(selected, 'draft');
    finish();
    break;
  }
  case 'topic': {
    assertEditor();
    const topic = TOPICS.find(topic => topic.id === values.topic);
    const ids = new Set(values.ids?.split(',').map(id => id.trim()));
    const group = people.filter(person => ids.has(person.id));
    if (!topic || !ids.size || group.length !== ids.size) throw new Error('指定有效的 --topic 和逗号分隔的 --ids');
    for (const person of group) {
      const topics = [...new Set([...person.topics, topic.id])];
      existing(person.id).patch.topics = topics;
      append({ ...person, topics }, 'draft');
    }
    finish();
    break;
  }
  case 'submit':
  case 'review':
  case 'publish':
  case 'withdraw': {
    assertEditor();
    if (!selected) throw new Error('请指定有效的三位永久 ID');
    const prev = latest(selected.id);
    if (command === 'submit') append(selected, 'needs_review');
    if (command === 'review') {
      if (prev?.state !== 'needs_review' || prev.version !== version(selected)) throw new Error('请先提交当前草稿版本');
      assertContent(selected);
      append(selected, 'reviewed', 'operator');
    }
    if (command === 'publish') {
      if (prev?.state !== 'reviewed' || prev.version !== version(selected)) throw new Error('请先审核当前版本');
      publish(selected, append(selected, 'published', prev.review));
    }
    if (command === 'withdraw') {
      const active = published.people.find(person => person.id === selected.id);
      if (!active) throw new Error('该人物当前没有公开版本');
      published.people = published.people.filter(person => person.id !== selected.id);
      published.records.push(append(active, 'withdrawn'));
    }
    finish(command === 'publish' || command === 'withdraw');
    console.log(JSON.stringify(latest(selected.id), null, 2));
    break;
  }
  default:
    throw new Error('命令为 status、diff、patch、accept-source、topic、submit、review、publish、withdraw 或 release');
}
