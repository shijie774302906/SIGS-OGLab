import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const workspaceRoot = process.cwd();
const publicRoot = path.resolve(workspaceRoot, 'public');
const target = path.resolve(publicRoot, 'help');
const sourceArgument = argument('--source') ?? process.env.SIGS_OGLAB_DOCS_DIST;
const sourceCommit = argument('--source-commit') ?? 'unknown';

if (!sourceArgument) throw new Error('请通过 --source 指定已用 /help/ base 构建的 VitePress dist 目录。');
const source = path.resolve(sourceArgument);
if (!target.startsWith(`${publicRoot}${path.sep}`)) throw new Error(`拒绝写入 public 之外的目录：${target}`);
if (!(await stat(path.join(source, 'index.html'))).isFile()) throw new Error(`手册构建目录无效：${source}`);

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true, filter: (entry) => path.basename(entry) !== 'CNAME' });

const textExtensions = new Set(['.html', '.xml', '.json', '.js', '.css']);
async function rewriteTree(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await rewriteTree(entryPath);
    else if (textExtensions.has(path.extname(entry.name))) {
      const original = await readFile(entryPath, 'utf8');
      const rewritten = original
        .replaceAll('https://docs.sigs-oglab.com', 'https://sigs-oglabx.com/help')
        .replaceAll('https://sigs-oglab.com', 'https://sigs-oglabx.com')
        .replace(/[ \t]+$/gm, '');
      if (rewritten !== original) await writeFile(entryPath, rewritten, 'utf8');
    }
  }
}

await rewriteTree(target);
await writeFile(path.join(target, 'mirror.json'), `${JSON.stringify({
  source: 'https://github.com/shijie774302906/SIGS-OGLab-Docs',
  sourceCommit,
  base: '/help/',
  canonicalSite: 'https://sigs-oglabx.com',
  generatedAt: new Date().toISOString(),
}, null, 2)}\n`, 'utf8');

console.log(`手册镜像已更新：${target}`);
