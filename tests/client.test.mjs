import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const client = fileURLToPath(new URL('../skills/touchdesigner/scripts/client.mjs', import.meta.url));

test('retired KB commands do not initialize or touch user data', () => {
  const dir = mkdtempSync(join(tmpdir(), 'td-retired-kb-'));
  try {
    for (const command of ['path', 'init']) {
      const result = spawnSync(process.execPath, [client, 'kb', command], {
        encoding: 'utf8', env: { ...process.env, TD_SKILL_KB_DIR: dir },
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Unknown command: kb/);
      assert.deepEqual(readdirSync(dir), []);
    }
  } finally {
    rmSync(dir, { recursive: true });
  }
});
