import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const PROBLEM_LIBRARY_PATH = path.join(ROOT, 'docs/knowledge/problem-library.json')
const UPDATE_LIBRARY_PATH = path.join(ROOT, 'docs/knowledge/update-library.json')

function fail(message, details = []) {
  const error = new Error(message)
  error.details = details
  throw error
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label}不存在：${path.relative(ROOT, filePath)}`)
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail(`${label}不是有效 JSON：${error.message}`)
  }
}

function unique(values) {
  return [...new Set(values)]
}

function normalize(value) {
  return value.normalize('NFKC').toLocaleLowerCase('zh-CN')
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function parseArgs(argv) {
  const command = argv[0] ?? 'help'
  const options = {}
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      fail(`无法识别的参数：${token}`)
    }
    const key = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      options[key] = true
      continue
    }
    index += 1
    if (options[key] === undefined) {
      options[key] = value
    } else if (Array.isArray(options[key])) {
      options[key].push(value)
    } else {
      options[key] = [options[key], value]
    }
  }
  return { command, options }
}

function optionList(options, key) {
  const value = options[key]
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function absoluteFromRoot(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath)
}

function loadLibraries() {
  return {
    problems: readJson(PROBLEM_LIBRARY_PATH, '问题库'),
    updates: readJson(UPDATE_LIBRARY_PATH, '更新库')
  }
}

export function validateLibraries() {
  const { problems, updates } = loadLibraries()
  const errors = []

  if (problems.schema_version !== 1 || !Array.isArray(problems.problems)) {
    errors.push('问题库 schema_version 必须为 1，problems 必须是数组。')
  }
  if (updates.schema_version !== 1 || !Array.isArray(updates.updates)) {
    errors.push('更新库 schema_version 必须为 1，updates 必须是数组。')
  }

  const problemIds = new Set()
  const updateIds = new Set()

  for (const problem of problems.problems ?? []) {
    if (!/^KPB-\d{3}$/.test(problem.id ?? '')) errors.push(`问题 ID 无效：${problem.id}`)
    if (problemIds.has(problem.id)) errors.push(`问题 ID 重复：${problem.id}`)
    problemIds.add(problem.id)
    if (!problem.title || !['active', 'retired'].includes(problem.status)) {
      errors.push(`${problem.id} 缺少标题或状态无效。`)
    }
    if (!['important', 'advisory'].includes(problem.severity) || typeof problem.closure_gate !== 'boolean') {
      errors.push(`${problem.id} 的 severity 或 closure_gate 无效。`)
    }
    if (!Array.isArray(problem.match_groups) || problem.match_groups.length === 0 || problem.match_groups.some((group) => !Array.isArray(group) || group.length === 0 || group.some((term) => typeof term !== 'string' || !term.trim()))) {
      errors.push(`${problem.id} 必须有有效的 match_groups。`)
    }
    for (const field of ['areas', 'symptoms', 'root_causes', 'prevention', 'required_checks', 'related_updates', 'related_tests']) {
      if (!Array.isArray(problem[field]) || problem[field].length === 0) errors.push(`${problem.id} 的 ${field} 不能为空。`)
    }
  }

  for (const update of updates.updates ?? []) {
    if (!/^Process\d{3}$/.test(update.id ?? '')) errors.push(`更新 ID 无效：${update.id}`)
    if (updateIds.has(update.id)) errors.push(`更新 ID 重复：${update.id}`)
    updateIds.add(update.id)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(update.date ?? '') || !update.title) {
      errors.push(`${update.id} 缺少有效日期或标题。`)
    }
    if (!['active', 'closed'].includes(update.status)) errors.push(`${update.id} 状态无效。`)
    if (!update.record || !fs.existsSync(absoluteFromRoot(update.record))) {
      errors.push(`${update.id} 的记录不存在：${update.record}`)
    }
    if (!Array.isArray(update.problems) || update.problems.length === 0) {
      errors.push(`${update.id} 必须关联至少一个问题。`)
    }
  }

  for (const problem of problems.problems ?? []) {
    for (const updateId of problem.related_updates ?? []) {
      if (!updateIds.has(updateId)) errors.push(`${problem.id} 关联了不存在的更新：${updateId}`)
    }
    for (const testPath of problem.related_tests ?? []) {
      if (!fs.existsSync(absoluteFromRoot(testPath))) errors.push(`${problem.id} 关联了不存在的检查：${testPath}`)
    }
  }
  for (const update of updates.updates ?? []) {
    for (const problemId of update.problems ?? []) {
      if (!problemIds.has(problemId)) errors.push(`${update.id} 关联了不存在的问题：${problemId}`)
    }
  }

  for (const problem of problems.problems ?? []) {
    for (const updateId of problem.related_updates ?? []) {
      const update = updates.updates.find((item) => item.id === updateId)
      if (update && !update.problems.includes(problem.id)) {
        errors.push(`${problem.id} 与 ${updateId} 的关联不是双向的。`)
      }
    }
  }
  for (const update of updates.updates ?? []) {
    for (const problemId of update.problems ?? []) {
      const problem = problems.problems.find((item) => item.id === problemId)
      if (problem && !problem.related_updates.includes(update.id)) {
        errors.push(`${update.id} 与 ${problemId} 的关联不是双向的。`)
      }
    }
  }

  if (errors.length > 0) fail('知识库校验失败。', unique(errors))
  return {
    problemCount: problems.problems.length,
    updateCount: updates.updates.length,
    problems,
    updates
  }
}

function readContexts(contextPaths) {
  if (contextPaths.length === 0) fail('至少需要一个 --context 文件。')
  const files = contextPaths.map((contextPath) => {
    const absolutePath = absoluteFromRoot(contextPath)
    if (!fs.existsSync(absolutePath)) fail(`上下文不存在：${contextPath}`)
    return {
      path: path.relative(ROOT, absolutePath).replaceAll('\\', '/'),
      content: fs.readFileSync(absolutePath, 'utf8')
    }
  })
  const combined = files.map((file) => `# ${file.path}\n${file.content}`).join('\n\n')
  return { files, combined, hash: sha256(combined) }
}

function libraryHash(problems, updates) {
  return sha256(`${JSON.stringify(problems)}\n${JSON.stringify(updates)}`)
}

export function matchProblems(context, problems) {
  const normalizedContext = normalize(context)
  return problems
    .filter((problem) => problem.status === 'active')
    .map((problem) => {
      const matchedGroups = problem.match_groups.filter((group) => group.every((term) => normalizedContext.includes(normalize(term))))
      if (matchedGroups.length === 0) return null
      return { problem, matchedGroups }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.problem.closure_gate !== right.problem.closure_gate) return left.problem.closure_gate ? -1 : 1
      return left.problem.id.localeCompare(right.problem.id)
    })
}

function buildReport(context, problems, updates, previousReport) {
  const currentLibraryHash = libraryHash(problems, updates)
  const mayPreserve = previousReport && previousReport.context_hash === context.hash && previousReport.library_hash === currentLibraryHash
  const previousMatches = new Map((mayPreserve ? previousReport.matches : []).map((match) => [match.problem_id, match]))
  const matches = matchProblems(context.combined, problems.problems).map(({ problem, matchedGroups }) => {
    const previous = previousMatches.get(problem.id)
    return {
      problem_id: problem.id,
      title: problem.title,
      severity: problem.severity,
      closure_gate: problem.closure_gate,
      matched_groups: matchedGroups,
      related_updates: problem.related_updates,
      required_checks: problem.required_checks,
      disposition: previous?.disposition ?? 'pending',
      note: previous?.note ?? '',
      evidence: Array.isArray(previous?.evidence) ? previous.evidence : []
    }
  })
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    context_files: context.files.map((file) => file.path),
    context_hash: context.hash,
    library_hash: currentLibraryHash,
    status: matches.some((match) => match.closure_gate && match.disposition === 'pending') ? 'pending' : 'reviewed',
    matches
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function printMatchSummary(report) {
  if (report.matches.length === 0) {
    console.log('未发现相似历史问题。仍需按 Feature Coverage Gate 完成普通验收。')
    return
  }
  console.log(`发现 ${report.matches.length} 个相似历史问题：`)
  for (const match of report.matches) {
    const gate = match.closure_gate ? '关闭门禁' : '提示'
    const terms = match.matched_groups.map((group) => group.join(' + ')).join('；')
    console.log(`- ${match.problem_id} [${gate}] ${match.title}`)
    console.log(`  命中：${terms}`)
    console.log(`  历史：${match.related_updates.join(', ')}`)
    console.log(`  检查：${match.required_checks.join('；')}`)
  }
}

export function createCheckReport(contextPaths, reportPath) {
  const { problems, updates } = validateLibraries()
  const context = readContexts(contextPaths)
  const absoluteReportPath = absoluteFromRoot(reportPath)
  const previous = fs.existsSync(absoluteReportPath) ? readJson(absoluteReportPath, '既有检查报告') : null
  const report = buildReport(context, problems, updates, previous)
  writeJson(absoluteReportPath, report)
  printMatchSummary(report)
  console.log(`检查报告：${path.relative(ROOT, absoluteReportPath).replaceAll('\\', '/')}`)
  return report
}

export function queryProblems(text) {
  if (!text.trim()) fail('query 需要非空 --text。')
  const { problems } = validateLibraries()
  const matches = matchProblems(text, problems.problems).map(({ problem, matchedGroups }) => ({
    problem_id: problem.id,
    title: problem.title,
    severity: problem.severity,
    closure_gate: problem.closure_gate,
    matched_groups: matchedGroups,
    related_updates: problem.related_updates,
    required_checks: problem.required_checks,
    disposition: 'query-only',
    note: '',
    evidence: []
  }))
  printMatchSummary({ matches })
  return matches
}

export function resolveReport(reportPath, problemId, disposition, note, evidence) {
  const absoluteReportPath = absoluteFromRoot(reportPath)
  const report = readJson(absoluteReportPath, '检查报告')
  const match = report.matches?.find((item) => item.problem_id === problemId)
  if (!match) fail(`报告中没有 ${problemId}。`)
  if (!['covered', 'not-applicable', 'pending'].includes(disposition)) {
    fail('disposition 只能是 covered、not-applicable 或 pending。')
  }
  match.disposition = disposition
  match.note = note ?? ''
  match.evidence = evidence
  report.status = report.matches.some((item) => item.closure_gate && item.disposition === 'pending') ? 'pending' : 'reviewed'
  writeJson(absoluteReportPath, report)
  console.log(`${problemId} 已更新为 ${disposition}。`)
  return report
}

export function gateReport(contextPaths, reportPath) {
  const { problems, updates } = validateLibraries()
  const context = readContexts(contextPaths)
  const report = readJson(absoluteFromRoot(reportPath), '检查报告')
  const errors = []
  const currentLibraryHash = libraryHash(problems, updates)

  if (report.schema_version !== 1 || !Array.isArray(report.matches)) errors.push('报告结构无效。')
  if (report.context_hash !== context.hash) errors.push('报告已失效：上下文在检查后发生变化，请重新运行 knowledge:check。')
  if (report.library_hash !== currentLibraryHash) errors.push('报告已失效：问题库或更新库已变化，请重新运行 knowledge:check。')

  const currentIds = matchProblems(context.combined, problems.problems).map(({ problem }) => problem.id).sort()
  const reportIds = (report.matches ?? []).map((match) => match.problem_id).sort()
  if (JSON.stringify(currentIds) !== JSON.stringify(reportIds)) errors.push('报告的匹配集合与当前上下文不一致。')

  for (const match of report.matches ?? []) {
    if (!match.closure_gate) continue
    if (match.disposition === 'pending') {
      errors.push(`${match.problem_id} 尚未处置；使用 knowledge:resolve 记录 covered 证据或具体的 not-applicable 理由。`)
      continue
    }
    if (match.disposition === 'covered' && (!Array.isArray(match.evidence) || match.evidence.length === 0 || match.evidence.some((item) => typeof item !== 'string' || item.trim().length < 5))) {
      errors.push(`${match.problem_id} 标记为 covered，但缺少有效验收证据。`)
    }
    if (match.disposition === 'not-applicable' && (typeof match.note !== 'string' || match.note.trim().length < 8)) {
      errors.push(`${match.problem_id} 标记为 not-applicable，但缺少具体理由。`)
    }
    if (!['covered', 'not-applicable'].includes(match.disposition)) {
      errors.push(`${match.problem_id} 的 disposition 无效：${match.disposition}`)
    }
  }

  if (errors.length > 0) fail('知识库关闭门禁未通过。', unique(errors))
  console.log(`知识库关闭门禁通过：${report.matches.filter((match) => match.closure_gate).length} 个重要问题已处置，${report.matches.filter((match) => !match.closure_gate).length} 个提示已记录。`)
  return true
}

function printHelp() {
  console.log(`用法：
  npm.cmd run knowledge:validate
  npm.cmd run knowledge:query -- --text "点击按钮没有反应"
  npm.cmd run knowledge:check -- --context plan.md --report process_logs/knowledge-reviews/ProcessNNN.json
  npm.cmd run knowledge:resolve -- --report <report> --id KPB-001 --disposition covered --evidence "测试或检查：passed" --note "说明"
  npm.cmd run knowledge:gate -- --context plan.md --report process_logs/knowledge-reviews/ProcessNNN.json`)
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2))
  if (command === 'validate') {
    const result = validateLibraries()
    console.log(`知识库有效：${result.problemCount} 个问题，${result.updateCount} 条更新。`)
    return
  }
  if (command === 'check') {
    const contexts = optionList(options, 'context')
    if (!options.report || options.report === true) fail('check 需要 --report。')
    createCheckReport(contexts, options.report)
    return
  }
  if (command === 'query') {
    const text = optionList(options, 'text').join('\n')
    queryProblems(text)
    return
  }
  if (command === 'resolve') {
    if (!options.report || !options.id || !options.disposition) fail('resolve 需要 --report、--id 和 --disposition。')
    resolveReport(options.report, options.id, options.disposition, options.note === true ? '' : options.note, optionList(options, 'evidence'))
    return
  }
  if (command === 'gate') {
    const contexts = optionList(options, 'context')
    if (!options.report || options.report === true) fail('gate 需要 --report。')
    gateReport(contexts, options.report)
    return
  }
  printHelp()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    for (const detail of error.details ?? []) console.error(`- ${detail}`)
    process.exitCode = 1
  }
}
