import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('dev prepara os serviços em ordem e não inicia a aplicação se uma etapa falhar', () => {
  const directory = mkdtempSync(join(tmpdir(), 'clinicapp-dev-'));
  const { scripts } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const steps = ['infra:up', 'db:generate', 'db:migrate'];
  try {
    // Exercita o lifecycle real do npm; os comandos substitutos não iniciam serviços.
    writeFileSync(join(directory, 'step.cjs'), `
      require('node:fs').appendFileSync('steps.log', process.argv[2] + '\\n');
      if (process.env.FAIL_STEP === process.argv[2]) process.exit(7);
    `);
    writeFileSync(join(directory, 'package.json'), JSON.stringify({
      private: true,
      scripts: {
        predev: scripts.predev,
        'db:seed': 'node step.cjs UNEXPECTED_SEED',
        ...Object.fromEntries([...steps, 'dev'].map(step => [step, `node step.cjs ${step}`])),
      },
    }));
    for (const failure of ['', ...steps]) {
      writeFileSync(join(directory, 'steps.log'), '');
      const result = spawnSync('npm', ['run', 'dev'], {
        cwd: directory,
        env: { ...process.env, FAIL_STEP: failure },
        encoding: 'utf8',
      });
      assert.ifError(result.error);
      assert.equal(result.status, failure ? 7 : 0, result.stderr);
      assert.deepEqual(readFileSync(join(directory, 'steps.log'), 'utf8').trim().split('\n'),
        failure ? steps.slice(0, steps.indexOf(failure) + 1) : [...steps, 'dev']);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
