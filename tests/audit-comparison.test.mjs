import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareAudits } from '../skills/touchdesigner/scripts/audit-comparison.mjs';

const scan = (ids, complete = true) => ({ path: '/test', maxExpressionLength: 70, complete, findings: ids.map(id => ({ id })) });

test('complete scans distinguish existing, new and resolved', () => {
  const result = compareAudits(scan(['same', 'new']), scan(['same', 'gone']));
  assert.deepEqual(result.findings.map(f => f.status), ['existing', 'new']);
  assert.deepEqual(result.comparison.resolved, [{ id: 'gone' }]);
});

test('incomplete scan cannot prove resolution', () => {
  const result = compareAudits(scan([], false), scan(['unscanned']));
  assert.deepEqual(result.comparison.resolved, []);
  assert.deepEqual(result.comparison.unverified, [{ id: 'unscanned' }]);
});

test('incomplete baseline cannot prove a finding is new', () => {
  const result = compareAudits(scan(['same', 'unknown']), scan(['same', 'gone'], false));
  assert.deepEqual(result.findings.map(f => f.status), ['existing', 'unverified']);
  assert.deepEqual(result.comparison.resolved, []);
});

test('different scopes or thresholds are rejected', () => {
  for (const change of [{ path: '/other' }, { maxExpressionLength: 100 }]) {
    assert.throws(() => compareAudits(scan([]), { ...scan([]), ...change }));
  }
});
