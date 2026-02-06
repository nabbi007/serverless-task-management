const fs = require('fs');
const archiver = require('archiver');

const handlers = [
  'createTask',
  'getTasks',
  'getTask',
  'updateTask',
  'deleteTask',
  'assignTask'
];

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

console.log(' Building Lambda packages (optimized with layers)...\n');

handlers.forEach(handler => {
  const zipName = handler.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  const output = fs.createWriteStream(`dist/${zipName}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    const sizeInKB = (archive.pointer() / 1024).toFixed(2);
    console.log(`✓ ${zipName}.zip created: ${archive.pointer()} bytes (~${sizeInKB} KB)`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  
  // Add ONLY the handler file (utils and node_modules are in the layer)
  archive.file(`src/handlers/${handler}.js`, { name: `handlers/${handler}.js` });
  
  archive.finalize();
});

console.log('\n All Lambda packages built successfully (optimized)!');
console.log(' Remember to build the layer: node build-layer.js');
