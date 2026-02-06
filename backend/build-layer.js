const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building Lambda Layer...\n');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const outputPath = path.join(distDir, 'dependencies-layer.zip');
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✓ dependencies-layer.zip created: ${archive.pointer()} bytes (~${sizeInMB} MB)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add node_modules to nodejs/node_modules (Lambda Layer structure)
console.log('Adding node_modules...');
archive.directory('node_modules', 'nodejs/node_modules');

// Add utils to nodejs/utils (shared utilities)
console.log('Adding utils...');
archive.directory('src/utils', 'nodejs/utils');

archive.finalize();
