import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createEvidenceManifest } from './evidence-manifest.mjs'
import { diagnoseProcess } from './process-doctor.mjs'
import { sha256 } from './process-utils.mjs'

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function libraryHash(problems, updates) {
  return sha256(`${JSON.stringify(problems)}\n${JSON.stringify(updates)}`)
}

function contextHash(root, contextPath) {
  const content = fs.readFileSync(path.join(root, contextPath), 'utf8')
  return sha256(`# ${contextPath}\n${content}`)
}

function createClosedFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sigs-doctor-closed-'))
  const archivePath = 'process_logs/Process094.md'
  const reportPath = 'process_logs/knowledge-reviews/Process094.json'
  const evidenceDirectory = 'process_logs/playwright-mcp/process094'
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true })
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true })
  fs.mkdirSync(path.join(root, evidenceDirectory), { recursive: true })
  fs.writeFileSync(path.join(root, 'plan.md'), '# Active Plan\n\nStatus: `no active slice`\n', 'utf8')
  fs.writeFileSync(path.join(root, 'Process.md'), '## Current - Process094 Tooling\n\n- Status: `closed / verified`\n', 'utf8')
  fs.writeFileSync(path.join(root, 'scripts', 'tool.mjs'), 'export const ok = true\n', 'utf8')
  fs.writeFileSync(path.join(root, 'tests', 'tool.test.mjs'), 'test("ok")\n', 'utf8')
  fs.writeFileSync(path.join(root, 'package.json'), '{"scripts":{"build":"ok"}}\n', 'utf8')
  fs.writeFileSync(path.join(root, evidenceDirectory, 'result.json'), '{"ok":true}\n', 'utf8')
  const archive = `# Process094\n\nStatus: \`closed / verified\`\n\n## Evidence\n\n- \`${evidenceDirectory}/result.json\`\n- \`${evidenceDirectory}/evidence-manifest.json\`\n- \`${reportPath}\`\n`
  fs.mkdirSync(path.join(root, 'process_logs'), { recursive: true })
  fs.writeFileSync(path.join(root, archivePath), archive, 'utf8')

  const problems = {
    schema_version: 1,
    updated_at: '2026-07-15',
    problems: [{
      id: 'KPB-999', title: 'fixture', status: 'active', severity: 'important', closure_gate: true,
      areas: ['process'], match_groups: [['never-match']], symptoms: ['x'], root_causes: ['x'], prevention: ['x'], required_checks: ['x'],
      related_updates: ['Process094'], related_tests: ['tests/tool.test.mjs']
    }]
  }
  const updates = {
    schema_version: 1,
    updated_at: '2026-07-15',
    updates: [{ id: 'Process094', date: '2026-07-15', title: 'fixture', status: 'closed', record: archivePath, problems: ['KPB-999'] }]
  }
  writeJson(path.join(root, 'docs', 'knowledge', 'problem-library.json'), problems)
  writeJson(path.join(root, 'docs', 'knowledge', 'update-library.json'), updates)
  writeJson(path.join(root, reportPath), {
    schema_version: 1,
    generated_at: '2026-07-15T00:00:00.000Z',
    context_files: [archivePath],
    context_hash: contextHash(root, archivePath),
    library_hash: libraryHash(problems, updates),
    status: 'reviewed',
    matches: []
  })
  const { manifestPath } = createEvidenceManifest({
    root,
    processId: '094',
    evidenceDirectory,
    contextPath: archivePath,
    inputs: ['scripts/tool.mjs', 'tests/tool.test.mjs', reportPath],
    commands: ['npm.cmd run build', 'node --test tests/tool.test.mjs'],
    exitCodes: ['0', '0'],
    seeds: ['fixture-094'],
    finalClosure: true,
    now: new Date('2026-07-15T00:00:00.000Z')
  })
  return { root, archivePath, reportPath, manifestPath, evidenceDirectory }
}

function createActiveFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sigs-doctor-active-'))
  fs.mkdirSync(path.join(root, 'process_logs', 'knowledge-reviews'), { recursive: true })
  fs.writeFileSync(path.join(root, 'plan.md'), '# Active Plan — Process094\n\nStatus: `confirmed / implementation in progress`\n\n- [ ] pending\n', 'utf8')
  fs.writeFileSync(path.join(root, 'Process.md'), '## Current - Process094 Tooling\n\n- Status: `active / confirmed`\n', 'utf8')
  const problems = { schema_version: 1, updated_at: '2026-07-15', problems: [] }
  const updates = { schema_version: 1, updated_at: '2026-07-15', updates: [] }
  writeJson(path.join(root, 'docs', 'knowledge', 'problem-library.json'), problems)
  writeJson(path.join(root, 'docs', 'knowledge', 'update-library.json'), updates)
  writeJson(path.join(root, 'process_logs', 'knowledge-reviews', 'Process094.json'), {
    schema_version: 1,
    generated_at: '2026-07-15T00:00:00.000Z',
    context_files: ['plan.md'],
    context_hash: contextHash(root, 'plan.md'),
    library_hash: libraryHash(problems, updates),
    status: 'pending',
    matches: [{ problem_id: 'KPB-999', closure_gate: true, disposition: 'pending' }]
  })
  return root
}

test('passes a complete closed process with current context and final evidence', () => {
  const fixture = createClosedFixture()
  const result = diagnoseProcess({ root: fixture.root, processId: '094' })
  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.equal(result.phase, 'closed')
  assert.equal(result.readyForClosure, true)
})

test('accepts a standalone public page as a bound implementation input', () => {
  const fixture = createClosedFixture()
  fs.mkdirSync(path.join(fixture.root, 'public', 'standalone'), { recursive: true })
  fs.writeFileSync(path.join(fixture.root, 'public', 'standalone', 'index.html'), '<!doctype html><title>standalone</title>\n', 'utf8')
  createEvidenceManifest({
    root: fixture.root,
    processId: '094',
    evidenceDirectory: fixture.evidenceDirectory,
    contextPath: fixture.archivePath,
    inputs: ['public/standalone/index.html', 'tests/tool.test.mjs', fixture.reportPath],
    commands: ['npm.cmd run build', 'node --test tests/tool.test.mjs'],
    exitCodes: ['0', '0'],
    seeds: ['standalone-public-page'],
    finalClosure: true
  })
  const result = diagnoseProcess({ root: fixture.root, processId: '094' })
  assert.equal(result.ok, true, result.errors.join('\n'))
})

test('passes a historical closed process when the index has advanced and retains its row', () => {
  const fixture = createClosedFixture()
  fs.writeFileSync(path.join(fixture.root, 'Process.md'), '## Current - Process095 Later\n\n- Status: `closed / verified`\n\n| Process | Detail |\n| --- | --- |\n| 094 | `process_logs/Process094.md` |\n', 'utf8')
  const result = diagnoseProcess({ root: fixture.root, processId: '094' })
  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.ok(result.notices.some((notice) => notice.includes('历史关闭项')))
})

test('audits a referenced historical manifest without assigning it to the current closure', () => {
  const fixture = createClosedFixture()
  const externalDirectory = 'process_logs/playwright-mcp/process093'
  fs.mkdirSync(path.join(fixture.root, externalDirectory), { recursive: true })
  fs.writeFileSync(path.join(fixture.root, externalDirectory, 'result.json'), '{}\n', 'utf8')
  fs.writeFileSync(path.join(fixture.root, 'process_logs', 'Process093.md'), '# Process093\n\nStatus: `closed`\n', 'utf8')
  const external = createEvidenceManifest({
    root: fixture.root,
    processId: '093',
    evidenceDirectory: externalDirectory,
    contextPath: 'process_logs/Process093.md',
    inputs: ['scripts/tool.mjs', 'tests/tool.test.mjs'],
    commands: ['npm.cmd run build', 'node --test tests/tool.test.mjs'],
    exitCodes: ['0', '0'],
    finalClosure: true
  })
  fs.appendFileSync(path.join(fixture.root, fixture.archivePath), `\n- \`${path.relative(fixture.root, external.manifestPath).split(path.sep).join('/')}\`\n`, 'utf8')
  const report = JSON.parse(fs.readFileSync(path.join(fixture.root, fixture.reportPath), 'utf8'))
  report.context_hash = contextHash(fixture.root, fixture.archivePath)
  writeJson(path.join(fixture.root, fixture.reportPath), report)
  const currentManifestPath = path.join(fixture.root, fixture.evidenceDirectory, 'evidence-manifest.json')
  const currentManifest = JSON.parse(fs.readFileSync(currentManifestPath, 'utf8'))
  currentManifest.context = {
    path: fixture.archivePath,
    size: fs.statSync(path.join(fixture.root, fixture.archivePath)).size,
    sha256: sha256(fs.readFileSync(path.join(fixture.root, fixture.archivePath)))
  }
  const reportRecord = currentManifest.inputs.files.find((item) => item.path === fixture.reportPath)
  reportRecord.size = fs.statSync(path.join(fixture.root, fixture.reportPath)).size
  reportRecord.sha256 = sha256(fs.readFileSync(path.join(fixture.root, fixture.reportPath)))
  currentManifest.inputs.aggregateSha256 = sha256(currentManifest.inputs.files.map((item) => `${item.path}\0${item.size}\0${item.sha256}`).join('\n'))
  writeJson(currentManifestPath, currentManifest)
  const result = diagnoseProcess({ root: fixture.root, processId: '094' })
  assert.equal(result.ok, true, result.errors.join('\n'))
})

test('active doctor accepts expected incomplete work but reports notices', () => {
  const root = createActiveFixture()
  const result = diagnoseProcess({ root, processId: '094' })
  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.equal(result.phase, 'active')
  assert.equal(result.readyForClosure, false)
  assert.ok(result.notices.some((notice) => notice.includes('待办')))
  assert.ok(result.notices.some((notice) => notice.includes('待处置门禁')))
})

test('detects plan and Process index disagreement', () => {
  const root = createActiveFixture()
  fs.writeFileSync(path.join(root, 'Process.md'), '## Current - Process093 Old\n\n- Status: `closed`\n', 'utf8')
  const result = diagnoseProcess({ root, processId: '094' })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((error) => error.includes('与活动计划 Process094 不一致')))
})

test('detects a closed archive missing from the update library', () => {
  const fixture = createClosedFixture()
  fs.writeFileSync(path.join(fixture.root, 'process_logs', 'Process095.md'), '# Process095\n\nStatus: `closed`\n', 'utf8')
  const result = diagnoseProcess({ root: fixture.root, processId: '094' })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((error) => error.includes('Process095 未进入 update-library')))
})

test('detects stale knowledge context and stale evidence inputs', () => {
  const fixture = createClosedFixture()
  fs.appendFileSync(path.join(fixture.root, fixture.archivePath), '\nchanged after closure\n', 'utf8')
  fs.writeFileSync(path.join(fixture.root, 'scripts', 'tool.mjs'), 'export const ok = false\n', 'utf8')
  const result = diagnoseProcess({ root: fixture.root, processId: '094' })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((error) => error.includes('知识报告上下文已失效')))
  assert.ok(result.errors.some((error) => error.includes('流程上下文已变化')))
  assert.ok(result.errors.some((error) => error.includes('绑定输入已变化：scripts/tool.mjs')))
})

test('closure phase rejects active plan and pending knowledge', () => {
  const root = createActiveFixture()
  const result = diagnoseProcess({ root, processId: '094', phase: 'closure' })
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((error) => error.includes('no active slice')))
  assert.ok(result.errors.some((error) => error.includes('待处置门禁')))
})
