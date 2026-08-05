import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

test('production build includes module script under GitHub Pages base path', () => {
  execSync('npm.cmd run build', { cwd: projectRoot, stdio: 'pipe' });

  const html = readFileSync(join(projectRoot, 'dist', 'index.html'), 'utf-8');

  const pattern = /<script\s+type="module"\s+[^>]*src="\/arena-test\/prototypes\/tactical-ui-prototype\/assets\/[^"]+\.js"/;
  assert.match(html, pattern, 'Expected module script under base path in build output');
});
