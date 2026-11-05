import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './model.ts';

const [mode, location, restoreTarget] = process.argv.slice(2);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const bundle = path.resolve(ROOT, location || ('backups/' + stamp));
const paths = ['content/published.json', 'content/images', 'content/media', '.private/index.json',
  '.private/edits.json', '.private/import-report.json', '.private/versions', 'config/ads.example.json'];
const restorePaths = paths.filter(file => file !== 'config/ads.example.json');
function copy(source: string, destination: string) {
  const info = lstatSync(source);
  if (info.isSymbolicLink()) throw new Error('跳过链接路径 ' + path.basename(source));
  if (info.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source)) copy(path.join(source, name), path.join(destination, name));
    return;
  }
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

if (mode === 'backup') {
  if (existsSync(bundle)) throw new Error('请指定尚未存在的备份目录');
  if (!existsSync(path.join(ROOT, 'content/published.json'))) throw new Error('当前没有公开版本可以备份');
  for (const file of paths) if (existsSync(path.join(ROOT, file))) copy(path.join(ROOT, file), path.join(bundle, file));
  console.log('已备份到 ' + bundle);
} else if (mode === 'restore') {
  if (!location || !restoreTarget || !existsSync(path.join(bundle, 'content/published.json'))) {
    throw new Error('用法 npm run restore -- <备份目录> <独立目标目录>');
  }
  const target = path.resolve(ROOT, restoreTarget);
  if (target === bundle || target === path.resolve(ROOT) || restorePaths.some(file => existsSync(path.join(target, file)))) {
    throw new Error('请选择独立且未包含项目数据的目标目录');
  }
  for (const file of restorePaths) if (existsSync(path.join(bundle, file))) copy(path.join(bundle, file), path.join(target, file));
  console.log('已恢复到 ' + target);
} else {
  throw new Error('操作须为 backup 或 restore');
}
