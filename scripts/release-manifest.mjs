import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');

function gitOrNull(...args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
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
    commit: process.env.VERCEL_GIT_COMMIT_SHA
      || process.env.RELEASE_COMMIT
      || gitOrNull('rev-parse', 'HEAD')
      || 'unknown',
    branch: process.env.VERCEL_GIT_COMMIT_REF
      || process.env.RELEASE_BRANCH
      || gitOrNull('branch', '--show-current')
      || 'detached',
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
