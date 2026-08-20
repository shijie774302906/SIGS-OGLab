import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'public/help');
const required = [
  'index.html',
  'start/index.html',
  'quick/import.html',
  'professional/import.html',
  'professional/check.html',
  'professional/stratification.html',
  'professional/parameters.html',
  'professional/output.html',
  'mirror.json',
];

for (const relative of required) await access(path.join(root, relative));
const index = await readFile(path.join(root, 'index.html'), 'utf8');
const metadata = JSON.parse(await readFile(path.join(root, 'mirror.json'), 'utf8'));
if (!index.includes('/help/assets/')) throw new Error('手册资源路径没有绑定 /help/ base。');
if (index.includes('https://docs.sigs-oglab.com')) throw new Error('手册仍引用境外旧域名。');
if (metadata.base !== '/help/' || metadata.canonicalSite !== 'https://sigs-oglabx.com') throw new Error('手册镜像元数据不正确。');
console.log(`手册镜像可用：${metadata.sourceCommit}`);
