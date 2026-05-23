// Build Arena Pages Catalog
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE_DIR = path.join(__dirname, '..', '_site');
const PROTOS_DIR = path.join(__dirname, '..', 'prototypes');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  ensureDir(SITE_DIR);

  const indexRaw = fs.readFileSync(path.join(PROTOS_DIR, 'index.json'), 'utf-8');
  const index = JSON.parse(indexRaw);
  const prototypes = index.prototypes || [];

  for (const proto of prototypes) {
    const sourceDir = path.join(PROTOS_DIR, proto.slug, 'source');
    const protoSiteDir = path.join(SITE_DIR, 'prototypes', proto.slug);

    if (!fs.existsSync(sourceDir)) {
      console.warn('[catalog] Source not found for ' + proto.slug + ', skipping');
      continue;
    }

    ensureDir(protoSiteDir);

    let installCmd = 'npm install';
    let buildCmd = 'npm run build';
    let outputDir = 'dist';

    const arenaJsonPath = path.join(sourceDir, '.arena-publish.json');
    if (fs.existsSync(arenaJsonPath)) {
      const arenaJson = JSON.parse(fs.readFileSync(arenaJsonPath, 'utf-8'));
      installCmd = arenaJson.installCommand || installCmd;
      buildCmd = arenaJson.buildCommand || buildCmd;
      outputDir = arenaJson.outputDir || outputDir;
    }

    console.log('[catalog] Building ' + proto.slug + '...');
    execSync(installCmd, { cwd: sourceDir, stdio: 'inherit' });
    execSync(buildCmd, { cwd: sourceDir, stdio: 'inherit' });

    const buildOutput = path.join(sourceDir, outputDir);
    if (fs.existsSync(buildOutput)) {
      copyDir(buildOutput, protoSiteDir);
      console.log('[catalog] ' + proto.slug + ' built -> ' + protoSiteDir);
    } else {
      console.warn('[catalog] Build output not found for ' + proto.slug + ': ' + buildOutput);
    }
  }

  const links = prototypes.map(function(p) {
    return '<li><a href="/prototypes/' + p.slug + '/">' + p.displayName + ' (' + p.slug + ')</a></li>';
  }).join('\n');

  const catalogHtml = '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Arena Prototypes</title>\n  <style>\n    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }\n    h1 { border-bottom: 2px solid #333; padding-bottom: 0.5rem; }\n    li { margin: 0.5rem 0; }\n  </style>\n</head>\n<body>\n  <h1>Arena Prototypes</h1>\n  <ul>\n' + links + '\n  </ul>\n</body>\n</html>';

  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), catalogHtml, 'utf-8');
  console.log('[catalog] Root catalog index.html generated');
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

main();
