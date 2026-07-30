import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  contextSnapshot,
  expandInputPaths,
  fail,
  fromRoot,
  listFiles,
  normalizeProcessId,
  optionList,
  parseArgs,
  printFailure,
  readJson,
  relativePosix,
  snapshotFiles,
  writeJsonAtomic
} from './process-utils.mjs'

export const EVIDENCE_MANIFEST_NAME = 'evidence-manifest.json'

function readEnvironment(root) {
  const packagePath = path.join(root, 'node_modules', '@playwright', 'test', 'package.json')
  const browsersPath = path.join(root, 'node_modules', 'playwright-core', 'browsers.json')
  const playwrightVersion = fs.existsSync(packagePath) ? readJson(packagePath, 'Playwright package').version : 'unavailable'
  const browsers = fs.existsSync(browsersPath) ? readJson(browsersPath, 'Playwright browser registry').browsers ?? [] : []
  const chromium = browsers.find((browser) => browser.name === 'chromium')
  return {
    nodeVersion: process.version,
    platform: `${process.platform}-${process.arch}`,
    playwrightVersion,
    browser: {
      engine: 'chromium',
      revision: chromium?.revision ?? 'unavailable',
      browserVersion: chromium?.browserVersion ?? 'unavailable'
    }
  }
}

function validateRuns(commands, exitCodes, finalClosure) {
  if (commands.length !== exitCodes.length) {
    fail(`--command 与 --exit-code 数量必须一致；当前为 ${commands.length} 与 ${exitCodes.length}。`)
  }
  const runs = commands.map((command, index) => {
    const exitCode = Number(exitCodes[index])
    if (!Number.isInteger(exitCode) || exitCode < 0) fail(`退出码无效：${exitCodes[index]}`)
    return { command, exitCode }
  })
  if (finalClosure && runs.length === 0) fail('最终关闭 manifest 至少需要一条验证命令。')
  if (finalClosure && runs.some((run) => run.exitCode !== 0)) {
    fail('最终关闭 manifest 不能记录失败的验证命令。', runs.filter((run) => run.exitCode !== 0).map((run) => `${run.command} -> ${run.exitCode}`))
  }
  return runs
}

export function createEvidenceManifest({
  root = process.cwd(),
  processId,
  evidenceDirectory,
  contextPath,
  inputs,
  commands = [],
  exitCodes = [],
  seeds = [],
  finalClosure = false,
  now = new Date()
}) {
  const normalizedProcessId = normalizeProcessId(processId)
  const evidenceAbsolute = fromRoot(root, evidenceDirectory)
  const manifestPath = path.join(evidenceAbsolute, EVIDENCE_MANIFEST_NAME)
  const context = contextSnapshot(root, contextPath)
  if (!Array.isArray(inputs) || inputs.length === 0) fail('manifest 至少需要一个 --input 源码、测试或配置路径。')
  const sourceSnapshot = snapshotFiles(root, expandInputPaths(root, inputs))
  const artifactFiles = listFiles(evidenceAbsolute, { exclude: [manifestPath] })
  if (artifactFiles.length === 0) fail(`精选证据目录为空：${relativePosix(root, evidenceAbsolute)}`)
  const artifactSnapshot = snapshotFiles(root, artifactFiles)
  const verificationRuns = validateRuns(commands, exitCodes, finalClosure)

  const manifest = {
    schemaVersion: 1,
    processId: normalizedProcessId,
    generatedAt: now.toISOString(),
    finalClosure: Boolean(finalClosure),
    evidenceDirectory: relativePosix(root, evidenceAbsolute),
    context,
    inputs: sourceSnapshot,
    artifacts: artifactSnapshot,
    verificationRuns,
    seedOrSource: seeds,
    environment: readEnvironment(root)
  }
  writeJsonAtomic(manifestPath, manifest)
  return { manifest, manifestPath }
}

function compareRecords(label, recorded, current, errors) {
  const recordedMap = new Map(recorded.files.map((item) => [item.path, item]))
  const currentMap = new Map(current.files.map((item) => [item.path, item]))
  for (const [filePath, item] of recordedMap) {
    const actual = currentMap.get(filePath)
    if (!actual) errors.push(`${label}已缺失：${filePath}`)
    else if (actual.sha256 !== item.sha256 || actual.size !== item.size) errors.push(`${label}已变化：${filePath}`)
  }
  for (const filePath of currentMap.keys()) {
    if (!recordedMap.has(filePath)) errors.push(`${label}新增了未登记文件：${filePath}`)
  }
  if (recorded.aggregateSha256 !== current.aggregateSha256) errors.push(`${label}聚合哈希已失效。`)
}

export function auditEvidenceManifest({ root = process.cwd(), manifestPath, requireFinal = false }) {
  const absoluteManifest = fromRoot(root, manifestPath)
  const manifest = readJson(absoluteManifest, '证据 manifest')
  const errors = []
  if (manifest.schemaVersion !== 1 || !/^Process\d{3}$/.test(manifest.processId ?? '')) errors.push('manifest 结构或 Process 编号无效。')
  if (requireFinal && manifest.finalClosure !== true) errors.push('manifest 未标记为最终关闭运行。')
  if (!Array.isArray(manifest.verificationRuns) || manifest.verificationRuns.length === 0) errors.push('manifest 没有验证命令。')
  for (const run of manifest.verificationRuns ?? []) {
    if (!run.command || run.exitCode !== 0) errors.push(`验证命令未成功：${run.command || '(missing)'} -> ${run.exitCode}`)
  }

  try {
    const currentContext = contextSnapshot(root, manifest.context?.path)
    if (currentContext.sha256 !== manifest.context?.sha256 || currentContext.size !== manifest.context?.size) {
      errors.push(`流程上下文已变化：${manifest.context?.path}`)
    }
  } catch (error) {
    errors.push(...(error.details?.length ? error.details : [error.message]))
  }

  try {
    const inputFiles = (manifest.inputs?.files ?? []).map((item) => fromRoot(root, item.path))
    const currentInputs = snapshotFiles(root, inputFiles.filter((filePath) => fs.existsSync(filePath)))
    compareRecords('绑定输入', manifest.inputs ?? { files: [], aggregateSha256: '' }, currentInputs, errors)
  } catch (error) {
    errors.push(...(error.details?.length ? error.details : [error.message]))
  }

  try {
    const evidenceAbsolute = fromRoot(root, manifest.evidenceDirectory)
    const currentArtifacts = snapshotFiles(root, listFiles(evidenceAbsolute, { exclude: [absoluteManifest] }))
    compareRecords('精选证据', manifest.artifacts ?? { files: [], aggregateSha256: '' }, currentArtifacts, errors)
  } catch (error) {
    errors.push(...(error.details?.length ? error.details : [error.message]))
  }

  if (errors.length > 0) fail('证据 manifest 审计失败。', errors)
  return { ok: true, manifest, manifestPath: absoluteManifest }
}

function printHelp() {
  console.log(`用法：
  npm.cmd run evidence:manifest -- create --process 094 --evidence <dir> --context plan.md --input src --input tests/e2e/example.spec.ts --command "npm.cmd run build" --exit-code 0 --seed "seed-or-source" --final
  npm.cmd run evidence:manifest -- audit --manifest <evidence-manifest.json> --require-final`)
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2))
  if (command === 'create') {
    if (!options.process || !options.evidence || !options.context) fail('create 需要 --process、--evidence 和 --context。')
    const result = createEvidenceManifest({
      processId: options.process,
      evidenceDirectory: options.evidence,
      contextPath: options.context,
      inputs: optionList(options, 'input'),
      commands: optionList(options, 'command'),
      exitCodes: optionList(options, 'exit-code'),
      seeds: optionList(options, 'seed'),
      finalClosure: options.final === true
    })
    console.log(`证据 manifest 已生成：${relativePosix(process.cwd(), result.manifestPath)}`)
    return
  }
  if (command === 'audit') {
    if (!options.manifest) fail('audit 需要 --manifest。')
    const result = auditEvidenceManifest({ manifestPath: options.manifest, requireFinal: options['require-final'] === true })
    console.log(`证据 manifest 有效：${relativePosix(process.cwd(), result.manifestPath)}；${result.manifest.inputs.files.length} 个输入，${result.manifest.artifacts.files.length} 个证据。`)
    return
  }
  printHelp()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (error) {
    printFailure(error)
  }
}
