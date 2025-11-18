// copy-build-to-docs.js
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'build');
const dest = path.join(__dirname, 'docs');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Remove old docs if present
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

// Copy build -> docs
copyDir(src, dest);

console.log('Deployment complete: build/ copied to docs/');
