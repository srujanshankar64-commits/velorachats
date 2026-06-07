import fs from 'fs';
import path from 'path';

// Cloudflare Pages requires a _worker.js file in the root of the output directory (dist/client).
// TanStack Start builds the server entry to dist/server/server.js. Some SSR chunks also import
// ../server.js, so keep that sibling module available instead of only renaming it to _worker.js.
fs.copyFileSync('dist/server/server.js', 'dist/client/_worker.js');
fs.copyFileSync('dist/server/server.js', 'dist/client/server.js');

// The server bundle might lazy-load chunks from dist/server/assets/.
// We need to copy those over to dist/client/assets/ so the worker can find them.
const sa = 'dist/server/assets';
const ca = 'dist/client/assets';

if (fs.existsSync(sa)) {
  if (!fs.existsSync(ca)) fs.mkdirSync(ca, { recursive: true });
  fs.readdirSync(sa).forEach((f) => {
    fs.copyFileSync(path.join(sa, f), path.join(ca, f));
  });
}

const generatedWrangler = 'dist/client/wrangler.json';
if (fs.existsSync(generatedWrangler)) {
  fs.unlinkSync(generatedWrangler);
}

const routesJson = {
  version: 1,
  include: ['/*'],
  exclude: ['/assets/*'],
};
fs.writeFileSync('dist/client/_routes.json', JSON.stringify(routesJson, null, 2));

console.log('postbuild: copied server entry, merged assets, and created _routes.json');
