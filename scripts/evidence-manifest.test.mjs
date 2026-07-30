import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { auditEvidenceManifest, createEvidenceManifest } from './evidence-manifest.mjs'

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sigs-evidence-'))
  fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  fs.mkdirSync(path.join(root, 'tests', 'e2e'), { recursive: true })
  fs.mkdirSync(path.join(root, 'process_logs', 'playwright-mcp', 'process094'), { recursive: true })
  fs.writeFileSync(path.join(root, 'plan.md'), '# Process094\nStatus: active\n', 'utf8')
  fs.writeFileSync(path.join(root, 'src', 'tool.mjs'), 'export const value = 1\n', 'utf8')
  fs.writeFileSync(path.join(root, 'tests', 'e2e', 'tool.spec.ts'), 'test("tool")\n', 'utf8')
  fs.writeFileSync(path.join(root, 'process_logs', 'playwright-mcp', 'process094', 'result.json'), '{"ok":true}\n', 'utf8')
  return root
}

function createFinalManifest(root) {
  return createEvidenceManifest({
    root,
    processId: '094',
    evidenceDirectory: 'process_logs/playwright-mcp/process094',
    contextPath: 'plan.md',
    inputs: ['src', 'tests/e2e/tool.spec.ts'],
    commands: ['npm.cmd run build', 'node --test scripts/tool.test.mjs'],
    exitCodes: ['0', '0'],
    seeds: ['fixture-seed-094'],
    finalClosure: true,
    now: new Date('2026-07-15T00:00:00.000Z')
  })
}

test('creates and audits a deterministic final evidence manifest', () => {
  const root = createFixture()
  const { manifestPath, manifest } = createFinalManifest(root)
  assert.equal(manifest.processId, 'Process094')
  assert.equal(manifest.finalClosure, true)
  assert.equal(manifest.inputs.files.length, 2)
  assert.equal(manifest.artifacts.files.length, 1)
  assert.equal(manifest.environment.browser.engine, 'chromium')
  assert.equal(auditEvidenceManifest({ root, manifestPath, requireFinal: true }).ok, true)
})

test('reports the exact source file when a bound input becomes stale', () => {
  const root = createFixture()
  const { manifestPath } = createFinalManifest(root)
  fs.writeFileSync(path.join(root, 'src', 'tool.mjs'), 'export const value = 2\n', 'utf8')
  assert.throws(
    () => auditEvidenceManifest({ root, manifestPath, requireFinal: true }),
    (error) => error.details.some((detail) => detail.includes('绑定输入已变化：src/tool.mjs'))
  )
})

test('detects changed, added, and missing curated evidence', () => {
  const root = createFixture()
  const { manifestPath } = createFinalManifest(root)
  const resultPath = path.join(root, 'process_logs', 'playwright-mcp', 'process094', 'result.json')
  fs.writeFileSync(resultPath, '{"ok":false}\n', 'utf8')
  fs.writeFileSync(path.join(path.dirname(resultPath), 'unexpected.txt'), 'new\n', 'utf8')
  assert.throws(
    () => auditEvidenceManifest({ root, manifestPath, requireFinal: true }),
    (error) => error.details.some((detail) => detail.includes('精选证据已变化'))
      && error.details.some((detail) => detail.includes('精选证据新增了未登记文件'))
  )
  fs.rmSync(resultPath)
  assert.throws(
    () => auditEvidenceManifest({ root, manifestPath, requireFinal: true }),
    (error) => error.details.some((detail) => detail.includes('精选证据已缺失'))
  )
})

test('rejects a failed final run without overwriting the previous manifest', () => {
  const root = createFixture()
  const { manifestPath } = createFinalManifest(root)
  const before = fs.readFileSync(manifestPath, 'utf8')
  assert.throws(() => createEvidenceManifest({
    root,
    processId: '094',
    evidenceDirectory: 'process_logs/playwright-mcp/process094',
    contextPath: 'plan.md',
    inputs: ['src'],
    commands: ['npm.cmd run build'],
    exitCodes: ['1'],
    finalClosure: true
  }), /不能记录失败/)
  assert.equal(fs.readFileSync(manifestPath, 'utf8'), before)
})

test('rejects empty artifacts and mismatched command metadata', () => {
  const root = createFixture()
  fs.rmSync(path.join(root, 'process_logs', 'playwright-mcp', 'process094', 'result.json'))
  assert.throws(() => createEvidenceManifest({
    root,
    processId: '094',
    evidenceDirectory: 'process_logs/playwright-mcp/process094',
    contextPath: 'plan.md',
    inputs: ['src'],
    commands: [],
    exitCodes: [],
    finalClosure: true
  }), /精选证据目录为空/)

  fs.writeFileSync(path.join(root, 'process_logs', 'playwright-mcp', 'process094', 'result.json'), '{}', 'utf8')
  assert.throws(() => createEvidenceManifest({
    root,
    processId: '094',
    evidenceDirectory: 'process_logs/playwright-mcp/process094',
    contextPath: 'plan.md',
    inputs: ['src'],
    commands: ['npm.cmd run build'],
    exitCodes: [],
    finalClosure: true
  }), /数量必须一致/)
})
