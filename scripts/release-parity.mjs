import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const allowDirty = process.argv.includes('--allow-dirty');
const checks = [];

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function walk(path) {
  const base = resolve(root, path);
  if (!existsSync(base)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else files.push(relative(root, full).replaceAll('\\', '/'));
    }
  };
  visit(base);
  return files;
}

const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
check('发布分支', branch === 'release/process154-production-parity', `branch=${branch || 'detached'}`);
check('干净工作树', allowDirty || status.length === 0, allowDirty ? '开发检查允许未提交修改' : status || 'clean');

const app = read('src/App.tsx');
const guide = read('src/components/ProfessionalFirstUseGuide.tsx');
const feedback = read('src/components/ProjectFeedbackLauncher.tsx');
const markdown = read('src/features/assistant/AssistantMarkdown.tsx');
const main = read('src/main.tsx');

check('保留当前分层', app.includes('使用当前分层'), '专业分层可直接采用现有候选。');
check('六页独立指引', ['project', 'import', 'check', 'stratification', 'parameters', 'output'].every((route) => guide.includes(`${route}:`)), '六个专业页面均有独立说明。');
check('指引可重播', feedback.includes('新手指引') && app.includes('professionalGuideReplayToken'), '侧栏入口与重播状态存在。');
check('专业 Markdown', read('src/features/assistant/ProfessionalAssistantPanel.tsx').includes('AssistantMarkdown'), '专业助手使用共享渲染器。');
check('Markdown 禁止原始 HTML', markdown.includes('skipHtml') && markdown.includes('allowedElements'), '脚本与未许可 HTML 不渲染。');
check('同源国内手册', feedback.includes("PROJECT_DOCS_ROOT = '/help'"), '运行时不跳转 GitHub Pages。');
check('排除实验智能体', !main.includes('/agent-lab') && !app.includes('AgentLab'), '正式入口无实验室路由。');

const helpRequired = [
  'public/help/index.html',
  'public/help/professional/import.html',
  'public/help/professional/stratification.html',
  'public/help/mirror.json',
];
check('手册镜像完整', helpRequired.every((file) => existsSync(resolve(root, file))), helpRequired.filter((file) => !existsSync(resolve(root, file))).join(', ') || 'ready');

const forbiddenTracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => /(^|\/)(mishi\.md|\.env(?:\.(?!example$).*)?|agent-lab\.(?:ts|tsx|js|jsx|mjs))$/i.test(file)
    || /^sample_data\/source\/yingkou\//i.test(file)
    || /^public\/leadership\//i.test(file));
check('无禁止发布文件', forbiddenTracked.length === 0, forbiddenTracked.join(', ') || 'none');

const distManifestPath = resolve(root, 'dist/release-manifest.json');
if (existsSync(distManifestPath)) {
  const manifest = JSON.parse(readFileSync(distManifestPath, 'utf8'));
  check('构建清单 Process', manifest.process === 'Process154', `process=${manifest.process}`);
  check('构建清单域名', manifest.canonicalSite === 'https://sigs-oglabx.com', `site=${manifest.canonicalSite}`);
  check('构建清单排除实验室', manifest.capabilities?.standaloneAgentLab === false, `standaloneAgentLab=${manifest.capabilities?.standaloneAgentLab}`);
  check('构建内含手册', existsSync(resolve(root, 'dist/help/index.html')), 'dist/help/index.html');
  const distTextFiles = walk('dist').filter((file) => /\.(?:html|js|json|css)$/i.test(file));
  const hasAgentLab = distTextFiles.some((file) => /agent-lab|AI 实验室|智能体实验/.test(read(file)));
  check('构建不含实验室', !hasAgentLab, hasAgentLab ? 'dist 中发现实验室内容' : 'clean');
} else {
  check('构建清单存在', false, '请运行 npm run build:release。');
}

const failed = checks.filter((item) => !item.ok);
for (const item of checks) process.stdout.write(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}：${item.detail}\n`);
process.stdout.write(`Release parity: ${failed.length ? 'fail' : 'pass'} (${checks.length - failed.length}/${checks.length})\n`);
if (failed.length) process.exitCode = 1;
