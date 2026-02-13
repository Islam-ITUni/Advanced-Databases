const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = process.cwd();

function getJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJsFiles(full));
    } else if (entry.isFile() && full.endsWith('.js')) {
      files.push(full);
    }
  }

  return files;
}

const targetDir = path.join(root, 'src');
const files = getJsFiles(targetDir);

for (const file of files) {
  execSync(`node --check "${file}"`, { stdio: 'pipe' });
}

console.log(`Syntax check passed for ${files.length} files.`);
