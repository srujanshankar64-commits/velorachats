const fs = require('fs');
const path = require('path');
fs.copyFileSync('dist/server/server.js', 'dist/client/_worker.js');
const sa = 'dist/server/assets', ca = 'dist/client/assets';
fs.readdirSync(sa).forEach(f => fs.copyFileSync(path.join(sa,f), path.join(ca,f)));
console.log('postbuild: copied server -> dist/client/_worker.js');