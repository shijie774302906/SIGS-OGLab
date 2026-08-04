import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { auditEvidenceManifest } from './evidence-manifest.mjs'
import {
  fail,
  fromRoot,
  normalizeProcessId,
  parseArgs,
  printFailure,
  readJson,
  relativePosix,
  sha256,
  writeJsonAtomic
} from './process-utils.mjs'

function readText(root, filePath, label, errors) {
  const absolute = fromRoot(root, filePath)
  if (!fs.existsSync(absolute)) {
    errors.push(`${label}不存在：${relativePosix(root, absolute)}`)
    return ''
  }
  return fs.readFileSync(absolute, 'utf8')
}

function numericProcessId(processId) {
  return Number(processId.slice(-3))
}

function knowledgeContextHash(root, contextFiles, errors) {
  const records = []
  for (const contextPath of contextFiles ?? []) {
    const absolute = fromRoot(root, contextPath)
    if (!fs.existsSync(absolute)) {
      errors.push(`知识报告上下文不存在：${contextPath}`)
      continue
    }
    records.push({ path: relativePosix(root, absolute), content: fs.readFileSync(absolute, 'utf8') })
  }
  return sha256(records.map((record) => `# ${record.path}\n${record.content}`).join('\n\n'))
}

function currentLibraryHash(root, errors) {
  try {
    const problems = readJson(path.join(root, 'docs', 'knowledge', 'problem-library.json'), '问题库')
    const updates = readJson(path.join(root, 'docs', 'knowledge', 'update-library.json'), '更新库')
    return sha256(`${JSON.stringify(problems)}\n${JSON.stringify(updates)}`)
  } catch (error) {
    errors.push(...(error.details?.length ? error.details : [error.message]))
    return ''
  }
}

function inspectKnowledgeReport(root, reportPath, { closure, requireCurrentLibrary }, errors, notices) {
  const absolute = fromRoot(root, reportPath)
  if (!fs.existsSync(absolute)) {
    errors.push(`知识报告不存在：${relativePosix(root, absolute)}；运行 knowledge:check。`)
    return null
  }
  let report
  try {
    report = readJson(absolute, '知识报告')
  } catch (error) {
    errors.push(...(error.details?.length ? error.details : [error.message]))
    return null
  }
  if (report.schema_version !== 1 || !Array.isArray(report.matches)) errors.push(`知识报告结构无效：${relativePosix(root, absolute)}`)
  const contextHash = knowledgeContextHash(root, report.context_files, errors)
  if (contextHash !== report.context_hash) errors.push(`知识报告上下文已失效：${relativePosix(root, absolute)}；重新运行 knowledge:check。`)
  if (requireCurrentLibrary && currentLibraryHash(root, errors) !== report.library_hash) {
    errors.push(`当前切片知识报告已落后于问题库：${relativePosix(root, absolute)}；重新运行 knowledge:check。`)
  }
  const pending = report.matches.filter((match) => match.closure_gate && match.disposition === 'pending')
  if (pending.length > 0) {
    const detail = `知识报告仍有 ${pending.length} 个待处置门禁：${pending.map((match) => match.problem_id).join(', ')}`
    if (closure) errors.push(`${detail}；使用 knowledge:resolve 记录证据或具体理由。`)
    else notices.push(detail)
  }
  if (closure && report.status !== 'reviewed') errors.push(`知识报告尚未 reviewed：${relativePosix(root, absolute)}`)
  return { report, path: relativePosix(root, absolute) }
}

function inspectLibraryRelations(root, errors) {
  let problems
  let updates
  try {
    problems = readJson(path.join(root, 'docs', 'knowledge', 'problem-library.json'), '问题库')
    updates = readJson(path.join(root, 'docs', 'knowledge', 'update-library.json'), '更新库')
  } catch (error) {
    errors.push(...(error.details?.length ? error.details : [error.message]))
    return null
  }
  const problemById = new Map((problems.problems ?? []).map((item) => [item.id, item]))
  const updateById = new Map((updates.updates ?? []).map((item) => [item.id, item]))
  for (const update of updates.updates ?? []) {
    for (const problemId of update.problems ?? []) {
      const problem = problemById.get(problemId)
      if (!problem) errors.push(`${update.id} 引用了不存在的问题：${problemId}`)
      else if (!(problem.related_updates ?? []).includes(update.id)) errors.push(`知识关系只有单向：${update.id} -> ${problemId}，请在问题库补回 ${update.id}。`)
    }
  }
  for (const problem of problems.problems ?? []) {
    for (const updateId of problem.related_updates ?? []) {
      const update = updateById.get(updateId)
      if (!update) errors.push(`${problem.id} 引用了不存在的更新：${updateId}`)
      else if (!(update.problems ?? []).includes(problem.id)) errors.push(`知识关系只有单向：${problem.id} -> ${updateId}，请在更新库补回 ${problem.id}。`)
    }
  }

  const managedNumbers = [...updateById.keys()].map(numericProcessId).filter(Number.isFinite)
  const managedBaseline = managedNumbers.length > 0 ? Math.min(...managedNumbers) : Number.POSITIVE_INFINITY
  const logsDirectory = path.join(root, 'process_logs')
  if (fs.existsSync(logsDirectory)) {
    for (const name of fs.readdirSync(logsDirectory)) {
      const match = name.match(/^Process(\d{3})\.md$/)
      if (!match || Number(match[1]) < managedBaseline) continue
      const processId = `Process${match[1]}`
      const content = fs.readFileSync(path.join(logsDirectory, name), 'utf8')
      if (/Status:\s*`closed\b/i.test(content) && !updateById.has(processId)) {
        errors.push(`已关闭 ${processId} 未进入 update-library.json；补充双向问题关系后重试。`)
      }
    }
  }
  return { problems, updates, problemById, updateById }
}

function evidenceReferences(archiveText) {
  return [...new Set([...archiveText.matchAll(/`(process_logs\/(?:playwright-mcp|knowledge-reviews)\/[^`]+)`/g)].map((match) => match[1]))]
}

function inspectClosedEvidence(root, processId, archivePath, archiveText, errors) {
  const references = evidenceReferences(archiveText)
  for (const reference of references) {
    if (!fs.existsSync(fromRoot(root, reference))) errors.push(`归档证据路径不存在：${reference}`)
  }
  const manifestReferences = references.filter((reference) => reference.endsWith('/evidence-manifest.json'))
  if (manifestReferences.length === 0) {
    errors.push(`${processId} 归档没有引用 evidence-manifest.json。`)
    return
  }
  let hasFinal = false
  for (const manifestPath of manifestReferences) {
    try {
      const result = auditEvidenceManifest({ root, manifestPath, requireFinal: true })
      if (result.manifest.processId !== processId) continue
      if (result.manifest.context.path !== archivePath) errors.push(`证据 manifest 未绑定当前归档：${manifestPath}`)
      const inputPaths = result.manifest.inputs.files.map((item) => item.path)
      if (!inputPaths.some((item) => item.startsWith('src/') || item.startsWith('scripts/') || item.startsWith('public/'))) errors.push(`证据 manifest 未绑定实现文件：${manifestPath}`)
      if (!inputPaths.some((item) => item.startsWith('tests/') || item.endsWith('.test.mjs'))) errors.push(`证据 manifest 未绑定相关测试：${manifestPath}`)
      if (!result.manifest.verificationRuns.some((run) => /\bbuild\b/i.test(run.command))) errors.push(`证据 manifest 没有成功 build 记录：${manifestPath}`)
      if (!result.manifest.verificationRuns.some((run) => /test|playwright/i.test(run.command))) errors.push(`证据 manifest 没有成功测试记录：${manifestPath}`)
      hasFinal = hasFinal || result.manifest.finalClosure === true
    } catch (error) {
      errors.push(error.message, ...(error.details ?? []))
    }
  }
  if (!hasFinal) errors.push(`${processId} 没有有效的最终关闭证据 manifest。`)
}

export function diagnoseProcess({ root = process.cwd(), processId, phase = 'auto' }) {
  const normalizedProcessId = normalizeProcessId(processId)
  const errors = []
  const notices = []
  const planText = readText(root, 'plan.md', '活动计划', errors)
  const indexText = readText(root, 'Process.md', 'Process 索引', errors)
  const noActivePlan = /Status:\s*`no active slice`/i.test(planText)
  const activePlanHeaders = [...planText.matchAll(/^# Active Plan[^\n]*?(Process\d{3})\b/gm)].map((match) => match[1])
  const archivePath = `process_logs/${normalizedProcessId}.md`
  const hasArchive = fs.existsSync(fromRoot(root, archivePath))
  const inferredPhase = activePlanHeaders[0] === normalizedProcessId ? 'active' : hasArchive || noActivePlan ? 'closed' : 'active'
  const effectivePhase = phase === 'auto' ? inferredPhase : phase
  if (!['active', 'closed', 'closure'].includes(effectivePhase)) errors.push(`无法识别的 doctor phase：${phase}`)
  const closure = effectivePhase === 'closed' || effectivePhase === 'closure'

  const currentIndexMatch = indexText.match(/## Current - (Process\d{3})\b/)
  const currentIndexId = currentIndexMatch?.[1] ?? null
  if (effectivePhase === 'active') {
    if (noActivePlan) errors.push(`要求检查 active，但 plan.md 标记为 no active slice。`)
    if (activePlanHeaders.length !== 1 || activePlanHeaders[0] !== normalizedProcessId) errors.push(`plan.md 必须只有一个活动计划标题 ${normalizedProcessId}；当前为 ${activePlanHeaders.join(', ') || '无'}。`)
    if (currentIndexId !== normalizedProcessId) errors.push(`Process.md 当前项为 ${currentIndexId ?? '无'}，与活动计划 ${normalizedProcessId} 不一致。`)
    if (!/Status:\s*`active\b/i.test(indexText)) errors.push(`Process.md 当前状态未标记 active。`)
  } else {
    if (effectivePhase === 'closure' && !noActivePlan) errors.push(`关闭检查要求 plan.md 为 no active slice；当前仍有活动计划。`)
    if (currentIndexId === normalizedProcessId) {
      if (!/Status:\s*`closed\b/i.test(indexText)) errors.push(`Process.md 当前状态未标记 closed。`)
    } else {
      const historicalRow = new RegExp(`^\\|\\s*${normalizedProcessId.slice(-3)}\\s*\\|[^\\n]*${normalizedProcessId}\\.md`, 'mi')
      if (!currentIndexId || numericProcessId(normalizedProcessId) >= numericProcessId(currentIndexId) || !historicalRow.test(indexText)) {
        errors.push(`Process.md 未把 ${normalizedProcessId} 记录为当前关闭项或历史关闭项；当前为 ${currentIndexId ?? '无'}。`)
      } else {
        notices.push(`${normalizedProcessId} 是历史关闭项；当前索引已前进到 ${currentIndexId}。`)
      }
    }
  }

  const libraries = inspectLibraryRelations(root, errors)
  let archiveText = ''
  if (closure) {
    archiveText = readText(root, archivePath, `${normalizedProcessId} 归档`, errors)
    if (archiveText && !/Status:\s*`closed\b/i.test(archiveText)) errors.push(`${archivePath} 未标记 closed。`)
    if (/^- \[ \]/m.test(archiveText)) errors.push(`${archivePath} 仍有未完成待办，却已声明关闭。`)
    if (!libraries?.updateById.has(normalizedProcessId)) errors.push(`${normalizedProcessId} 未进入 update-library.json。`)
  }

  let knowledgePath = `process_logs/knowledge-reviews/${normalizedProcessId}.json`
  if (closure && archiveText) {
    const referenced = evidenceReferences(archiveText).find((item) => item.includes('/knowledge-reviews/') && item.endsWith('.json'))
    if (referenced) knowledgePath = referenced
  }
  const knowledge = inspectKnowledgeReport(root, knowledgePath, {
    closure,
    requireCurrentLibrary: effectivePhase === 'active' || effectivePhase === 'closure'
  }, errors, notices)

  if (closure && archiveText) {
    inspectClosedEvidence(root, normalizedProcessId, archivePath, archiveText, errors)
    if (knowledge) {
      const manifestPaths = evidenceReferences(archiveText).filter((item) => item.endsWith('/evidence-manifest.json'))
      for (const manifestPath of manifestPaths) {
        try {
          const manifest = readJson(fromRoot(root, manifestPath), '证据 manifest')
          if (manifest.processId !== normalizedProcessId) continue
          if (!(manifest.inputs?.files ?? []).some((item) => item.path === knowledge.path)) {
            errors.push(`证据 manifest 未绑定知识报告：${manifestPath} -> ${knowledge.path}`)
          }
        } catch {
          // The evidence audit already reports the concrete parse or path error.
        }
      }
    }
  } else {
    const unchecked = [...planText.matchAll(/^- \[ \] (.+)$/gm)].length
    if (unchecked > 0) notices.push(`活动计划仍有 ${unchecked} 项待办；这是正常进行状态，关闭前必须归零。`)
    notices.push('活动切片尚未要求最终 evidence manifest；关闭阶段将转为强制。')
  }

  return {
    ok: errors.length === 0,
    processId: normalizedProcessId,
    phase: effectivePhase,
    readyForClosure: closure && errors.length === 0,
    errors: [...new Set(errors)],
    notices: [...new Set(notices)]
  }
}

function printHelp() {
  console.log(`用法：
  npm.cmd run process:doctor -- --process 094
  npm.cmd run process:doctor -- --process 094 --phase active
  npm.cmd run process:doctor -- --process 094 --phase closure --output <result.json> --json`)
}

function main() {
  const { command, options } = parseArgs(['doctor', ...process.argv.slice(2)])
  if (command !== 'doctor' || !options.process) {
    printHelp()
    if (!options.process) process.exitCode = 1
    return
  }
  const result = diagnoseProcess({ processId: options.process, phase: options.phase ?? 'auto' })
  if (options.output && options.output !== true) writeJsonAtomic(fromRoot(process.cwd(), options.output), { ...result, generatedAt: new Date().toISOString() })
  if (options.json === true) console.log(JSON.stringify(result, null, 2))
  else for (const notice of result.notices) console.log(`提示：${notice}`)
  if (!result.ok) fail(`${result.processId} 流程检查失败（${result.phase}）。`, result.errors)
  if (options.json !== true) console.log(`${result.processId} 流程检查通过（${result.phase}）；${result.readyForClosure ? '可以关闭' : '当前状态一致，尚在实施中'}。`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (error) {
    printFailure(error)
  }
}
