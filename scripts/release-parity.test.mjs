import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('release parity checks the canonical China release contract', () => {
  const source = readFileSync(new URL('./release-parity.mjs', import.meta.url), 'utf8');
  assert.match(source, /release\/process158-dual-production-deployment/);
  assert.match(source, /Process161/);
  assert.match(source, /使用当前分层/);
  assert.match(source, /standaloneAgentLab === false/);
  assert.match(source, /dist\/help\/index\.html/);
});
