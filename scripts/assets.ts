import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PRIVATE, ROOT, assetName, currentPeople, digest, edition, safeSource } from './model.ts';

export const CACHE = path.join(PRIVATE, 'images');
const people = currentPeople();
if (!people.length) throw new Error('请先运行 npm run import');
mkdirSync(CACHE, { recursive: true });
const tasks = people.flatMap(person => person.assets.map(asset => ({ person, asset })));
let next = 0;
let completed = 0;
sharp.cache({ memory: 60, files: 0, items: 32 });
sharp.concurrency(1);

async function worker() {
  for (;;) {
    const task = tasks[next++];
    if (!task) return;
    const { person, asset } = task;
    const destinations = ([480, 1100] as const).map(width => ({ width, file: path.join(CACHE, assetName(person, asset, width)) }))
      .filter(({ file }) => !existsSync(file));
    if (destinations.length) {
      const input = readFileSync(safeSource(asset.file));
      if (digest(input) !== asset.hash) throw new Error('源文件已有变化，请重新导入 ' + asset.file);
      for (const { width, file } of destinations) {
        const temp = file + '.tmp';
        await sharp(input, { limitInputPixels: 25_000_000, failOn: 'error' })
          .rotate().resize({ width, withoutEnlargement: true })
          .webp({ quality: width === 480 ? 72 : 76, effort: 2 }).toFile(temp);
        renameSync(temp, file);
      }
    }
    completed++;
    if (completed % 140 === 0 || completed === tasks.length) console.log('响应式图像 ' + completed + '/' + tasks.length);
  }
}
await Promise.all(Array.from({ length: Math.min(4, tasks.length) }, worker));

if (process.argv.includes('--export-published')) {
  const approved = edition().people.flatMap(person => person.assets.flatMap(asset =>
    ([480, 1100] as const).map(width => assetName(person, asset, width))));
  if (!approved.length) throw new Error('请先生成公开版本');
  const output = path.join(ROOT, 'content', 'images');
  mkdirSync(output, { recursive: true });
  if (path.relative(realpathSync(ROOT), realpathSync(output)) !== path.join('content', 'images')) throw new Error('图片导出路径越界');
  for (const name of approved) {
    const cache = path.join(CACHE, name);
    const file = path.join(output, name);
    if (existsSync(cache)) copyFileSync(cache, file);
    else if (!existsSync(file)) throw new Error('缺少已发布图片 ' + name);
  }
  const keep = new Set(approved);
  for (const name of readdirSync(output)) {
    const file = path.join(output, name);
    if (/^\d{3}-[ab][1-4]-[a-f0-9]{14}-(480|1100)\.webp$/.test(name) && !keep.has(name) && lstatSync(file).isFile()) {
      unlinkSync(file);
    }
  }
  console.log('已导出 ' + keep.size + ' 张公开响应式图片');
}
