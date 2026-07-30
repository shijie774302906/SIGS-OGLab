import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const ROOT = process.cwd()
const SCRIPT = path.join(ROOT, 'scripts/knowledge-check.mjs')

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8'
  })
}

test('validates the problem and update libraries', () => {
  const result = run(['validate'])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /知识库有效/)
})

test('queries a known interaction problem without creating a report', () => {
  const result = run(['query', '--text', '地层分层按钮点击没有反应'])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /KPB-002/)
  assert.match(result.stdout, /Process086/)
})

test('blocks pending matches, accepts evidence, and rejects stale reports', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sigs-knowledge-'))
  const context = path.join(directory, 'context.md')
  const report = path.join(directory, 'report.json')
  fs.writeFileSync(context, '建立问题库和更新库，后续自动查阅相似问题。\n', 'utf8')

  const checked = run(['check', '--context', context, '--report', report])
  assert.equal(checked.status, 0, checked.stderr)
  const checkedReport = JSON.parse(fs.readFileSync(report, 'utf8'))
  assert.deepEqual(checkedReport.matches.map((match) => match.problem_id), ['KPB-010'])

  const pendingGate = run(['gate', '--context', context, '--report', report])
  assert.notEqual(pendingGate.status, 0)
  assert.match(pendingGate.stderr, /KPB-010 尚未处置/)

  const resolved = run([
    'resolve',
    '--report', report,
    '--id', 'KPB-010',
    '--disposition', 'covered',
    '--evidence', 'scripts/knowledge-check.test.mjs：passed'
  ])
  assert.equal(resolved.status, 0, resolved.stderr)

  const passedGate = run(['gate', '--context', context, '--report', report])
  assert.equal(passedGate.status, 0, passedGate.stderr)
  assert.match(passedGate.stdout, /关闭门禁通过/)

  fs.appendFileSync(context, '计划已经变化。\n', 'utf8')
  const staleGate = run(['gate', '--context', context, '--report', report])
  assert.notEqual(staleGate.status, 0)
  assert.match(staleGate.stderr, /报告已失效/)
})

test('allows a current report with no historical match', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sigs-knowledge-empty-'))
  const context = path.join(directory, 'context.md')
  const report = path.join(directory, 'report.json')
  fs.writeFileSync(context, 'isolated-token-without-library-keywords\n', 'utf8')

  const checked = run(['check', '--context', context, '--report', report])
  assert.equal(checked.status, 0, checked.stderr)
  assert.match(checked.stdout, /未发现相似历史问题/)

  const gate = run(['gate', '--context', context, '--report', report])
  assert.equal(gate.status, 0, gate.stderr)
})

test('fails clearly when the context file is missing', () => {
  const result = run(['check', '--context', 'missing-context.md', '--report', path.join(os.tmpdir(), 'missing-report.json')])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /上下文不存在/)
})
