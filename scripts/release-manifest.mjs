import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

if (!existsSync(dist)) throw new Error('dist 不存在，请先运行 npm run build。');

const helpMetadataPath = resolve(root, 'public/help/mirror.json');
const helpMetadata = existsSync(helpMetadataPath)
  ? JSON.parse(readFileSync(helpMetadataPath, 'utf8'))
  : null;

const manifest = {
  schemaVersion: 1,
  process: 'Process158',
  product: 'SIGS-OGLab',
  canonicalSite: 'https://sigs-oglabx.com',
  source: {
    commit: git('rev-parse', 'HEAD'),
    branch: git('branch', '--show-current') || 'detached',
  },
  help: {
    path: '/help/',
    sourceCommit: helpMetadata?.sourceCommit ?? null,
  },
  capabilities: {
    professionalWorkflow: true,
    quickReport: true,
    professionalFirstUseGuides: true,
    safeAssistantMarkdown: true,
    cloudBaseApi: true,
    standaloneAgentLab: false,
  },
  generatedAt: new Date().toISOString(),
};

mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`Release manifest: ${manifest.process} @ ${manifest.source.commit.slice(0, 12)}\n`);
