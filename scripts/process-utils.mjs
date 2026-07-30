import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export class ProcessToolError extends Error {
  constructor(message, details = []) {
    super(message)
    this.details = details
  }
}

export function fail(message, details = []) {
  throw new ProcessToolError(message, [...new Set(details)])
}

export function parseArgs(argv) {
  const command = argv[0] ?? 'help'
  const options = {}
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) fail(`无法识别的参数：${token}`)
    const key = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      options[key] = true
      continue
    }
    index += 1
    if (options[key] === undefined) options[key] = value
    else if (Array.isArray(options[key])) options[key].push(value)
    else options[key] = [options[key], value]
  }
  return { command, options }
}

export function optionList(options, key) {
  const value = options[key]
  if (value === undefined || value === true) return []
  return Array.isArray(value) ? value : [value]
}

export function normalizeProcessId(value) {
  const match = String(value ?? '').match(/^(?:Process)?(\d{1,3})$/i)
  if (!match) fail(`Process 编号无效：${value ?? ''}`)
  return `Process${match[1].padStart(3, '0')}`
}

export function relativePosix(root, filePath) {
  return path.relative(root, filePath).replaceAll('\\', '/') || '.'
}

export function fromRoot(root, filePath) {
  return path.isAbsolute(filePath) ? path.normalize(filePath) : path.join(root, filePath)
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function hashFile(filePath) {
  return sha256(fs.readFileSync(filePath))
}

export function readJson(filePath, label = 'JSON 文件') {
  if (!fs.existsSync(filePath)) fail(`${label}不存在：${filePath}`)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail(`${label}不是有效 JSON：${filePath}`, [error.message])
  }
}

export function listFiles(directory, { exclude = [] } = {}) {
  if (!fs.existsSync(directory)) fail(`目录不存在：${directory}`)
  if (!fs.statSync(directory).isDirectory()) fail(`路径不是目录：${directory}`)
  const excluded = new Set(exclude.map((item) => path.resolve(item)))
  const files = []
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name)
      if (excluded.has(path.resolve(absolute))) continue
      if (entry.isDirectory()) visit(absolute)
      else if (entry.isFile()) files.push(absolute)
    }
  }
  visit(directory)
  return files.sort((left, right) => left.localeCompare(right))
}

export function expandInputPaths(root, inputs) {
  const files = []
  for (const input of inputs) {
    const absolute = fromRoot(root, input)
    if (!fs.existsSync(absolute)) fail(`绑定输入不存在：${relativePosix(root, absolute)}`)
    if (fs.statSync(absolute).isDirectory()) files.push(...listFiles(absolute))
    else if (fs.statSync(absolute).isFile()) files.push(absolute)
    else fail(`绑定输入不是普通文件或目录：${relativePosix(root, absolute)}`)
  }
  return [...new Set(files.map((file) => path.resolve(file)))]
    .sort((left, right) => relativePosix(root, left).localeCompare(relativePosix(root, right)))
}

export function snapshotFiles(root, files) {
  const records = files.map((filePath) => ({
    path: relativePosix(root, filePath),
    size: fs.statSync(filePath).size,
    sha256: hashFile(filePath)
  }))
  const aggregateSha256 = sha256(records.map((record) => `${record.path}\0${record.size}\0${record.sha256}`).join('\n'))
  return { files: records, aggregateSha256 }
}

export function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    fs.renameSync(temporaryPath, filePath)
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true })
  }
}

export function contextSnapshot(root, contextPath) {
  const absolute = fromRoot(root, contextPath)
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    fail(`流程上下文不存在：${relativePosix(root, absolute)}`)
  }
  return {
    path: relativePosix(root, absolute),
    size: fs.statSync(absolute).size,
    sha256: hashFile(absolute)
  }
}

export function printFailure(error) {
  console.error(error.message)
  for (const detail of error.details ?? []) console.error(`- ${detail}`)
  process.exitCode = 1
}
