import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { PRIVATE, ROOT } from './model.ts';

const dist = path.join(ROOT, 'dist');
if (!existsSync(path.join(dist, '.nojekyll'))) throw new Error('请先构建并验证 dist');
if (execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'validate.ts')], { cwd: ROOT, encoding: 'utf8' })) {
  console.log('公开产物校验通过');
}
mkdirSync(PRIVATE, { recursive: true });
const index = path.join(PRIVATE, 'deploy-' + process.pid + '.index');
const git = (args: string[], staging = false) => execFileSync('git', args, {
  cwd: staging ? dist : ROOT, encoding: 'utf8', windowsHide: true,
  env: { ...process.env, ...(staging ? { GIT_INDEX_FILE: index } : {}) }, stdio: ['ignore', 'pipe', 'inherit'],
}).trim();
const gitDir = git(['rev-parse', '--absolute-git-dir']);
const prefix = ['--git-dir=' + gitDir, '--work-tree=' + dist];
const branch = 'refs/heads/gh-pages';
const lookup = git(['for-each-ref', '--format=%(objectname)', branch]);
try {
  git([...prefix, 'read-tree', '--empty'], true);
  git([...prefix, 'add', '-f', '--all', '.'], true);
  const tree = git([...prefix, 'write-tree'], true);
  const parentTree = lookup ? git(['rev-parse', lookup + '^{tree}']) : '';
  if (parentTree !== tree) {
    const next = git(['commit-tree', tree, ...(lookup ? ['-p', lookup] : []), '-m', 'Publish verified static site']);
    git(['update-ref', branch, next, lookup || '0'.repeat(40)]);
  }
  if (!process.argv.includes('--local')) git(['push', 'origin', 'gh-pages']);
  console.log('gh-pages ' + git(['rev-parse', branch]));
} finally {
  rmSync(index, { force: true });
}
