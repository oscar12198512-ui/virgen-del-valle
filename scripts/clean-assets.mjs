import fs from 'node:fs';
import path from 'node:path';

const assetsDir = path.resolve('android/app/src/main/assets');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      try {
        const content = fs.readFileSync(fullPath);
        fs.writeFileSync(fullPath, content);
      } catch (err) {
        console.warn(`Could not rewrite ${entry.name}:`, err.message);
      }
    }
  }
}

console.log('Ensuring all Android assets are regular local files...');
walk(assetsDir);
console.log('Android assets normalized successfully.');
