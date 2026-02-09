const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

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

console.log(' Building Lambda packages...\n');

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
  
  // Add the handler file
  archive.file(`src/handlers/${handler}.js`, { name: `handlers/${handler}.js` });
  
  // Add utils directory (required by handlers)
  archive.directory('src/utils', 'utils');
  
  archive.finalize();
});

console.log('\n All Lambda packages built successfully!');

