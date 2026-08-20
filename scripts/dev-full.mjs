import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ASSISTANT_BUILD_ID,
  ASSISTANT_PROTOCOL_VERSIONS,
  ASSISTANT_SERVICE_ID,
} from '../server/assistant/protocol.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildDevCommands(extraViteArguments = [], workspaceRoot = root) {
  return [
    {
      label: '网页',
      command: process.execPath,
      arguments: [
        path.join(workspaceRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
        '--host',
        '127.0.0.1',
        '--strictPort',
        ...extraViteArguments,
      ],
    },
    {
      label: 'AI 服务',
      command: process.execPath,
      arguments: [path.join(workspaceRoot, 'server', 'assistant', 'server.mjs')],
    },
  ];
}

function requestedVitePort(argumentsList) {
  const equalsArgument = argumentsList.find((argument) => argument.startsWith('--port='));
  if (equalsArgument) return Number(equalsArgument.slice('--port='.length)) || 5173;
  const index = argumentsList.indexOf('--port');
  return index >= 0 ? Number(argumentsList[index + 1]) || 5173 : 5173;
}

async function existingSigsService(url, verify) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 800);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return false;
    return verify(response);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function inspectExistingDevelopmentServices(extraViteArguments = []) {
  const webPort = requestedVitePort(extraViteArguments);
  const assistantPort = Number(process.env.ASSISTANT_PORT || 8787);
  const [web, assistantReachable, assistant] = await Promise.all([
    existingSigsService(`http://127.0.0.1:${webPort}/`, async (response) => {
      const html = await response.text();
      return html.includes('<div id="root"></div>') && html.includes('/src/main.tsx');
    }),
    existingSigsService(`http://127.0.0.1:${assistantPort}/api/assistant/capabilities`, async () => true),
    existingSigsService(`http://127.0.0.1:${assistantPort}/api/assistant/capabilities`, async (response) => {
      const payload = await response.json();
      return payload?.serviceAvailable === true
        && payload?.serviceId === ASSISTANT_SERVICE_ID
        && payload?.buildId === ASSISTANT_BUILD_ID
        && ASSISTANT_PROTOCOL_VERSIONS.every((version) => payload?.protocolVersions?.includes(version));
    }),
  ]);
  return { web, assistant, assistantReachable, webPort, assistantPort };
}

export function developmentServiceCompatibilityProblem(existing) {
  return existing.assistantReachable && !existing.assistant
    ? `端口 ${existing.assistantPort} 上运行的是旧版或不兼容的 AI 服务。请先关闭旧服务，再重新运行 npm run dev。`
    : null;
}

export async function startDevelopmentServices(extraViteArguments = process.argv.slice(2)) {
  const existing = await inspectExistingDevelopmentServices(extraViteArguments);
  const compatibilityProblem = developmentServiceCompatibilityProblem(existing);
  if (compatibilityProblem) throw new Error(compatibilityProblem);
  const commands = buildDevCommands(extraViteArguments).filter((entry) =>
    entry.label === '网页' ? !existing.web : !existing.assistant);
  if (existing.web) process.stdout.write(`网页已在 http://127.0.0.1:${existing.webPort}/ 运行，将继续使用。\n`);
  if (existing.assistant) process.stdout.write(`AI 服务已在 http://127.0.0.1:${existing.assistantPort}/ 运行，将继续使用。\n`);
  if (!commands.length) {
    process.stdout.write('SIGS-OGLab 网页与 AI 服务均已就绪。\n');
    return [];
  }
  const children = commands.map((entry) => ({
    ...entry,
    child: spawn(entry.command, entry.arguments, {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
    }),
  }));
  let shuttingDown = false;
  let finalExitCode = 0;

  process.stdout.write('SIGS-OGLab 开发环境：网页与 AI 服务正在一起启动。\n');

  function finishWhenStopped() {
    if (children.every(({ child }) => child.exitCode !== null || child.signalCode !== null)) {
      process.exit(finalExitCode);
    }
  }

  function shutdown(exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    finalExitCode = exitCode;
    for (const { child } of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill();
    }
    const forceTimer = setTimeout(() => {
      for (const { child } of children) {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      }
      process.exit(finalExitCode);
    }, 2_000);
    forceTimer.unref();
    finishWhenStopped();
  }

  for (const entry of children) {
    entry.child.on('error', (error) => {
      process.stderr.write(`${entry.label}启动失败：${error.message}\n`);
      shutdown(1);
    });
    entry.child.on('exit', (code, signal) => {
      if (!shuttingDown) {
        process.stderr.write(`${entry.label}已停止（${signal || `退出码 ${code ?? 1}`}），正在关闭另一项服务。\n`);
        shutdown(code ?? 1);
        return;
      }
      finishWhenStopped();
    });
  }

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
  return children;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startDevelopmentServices();
}
