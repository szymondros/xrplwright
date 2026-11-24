// Serves the demo dapp on http://localhost:4173 (PORT to change it).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const port = Number(process.env.PORT ?? 4173);
const files = {
  '/': [new URL('./app/index.html', import.meta.url), 'text/html'],
  '/app.js': [new URL('./app/app.js', import.meta.url), 'text/javascript'],
  '/crossmark-sdk.js': [require.resolve('@crossmarkio/sdk/umd'), 'text/javascript'],
};

createServer(async (req, res) => {
  const file = files[new URL(req.url ?? '/', 'http://x').pathname];
  if (!file) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': file[1] }).end(await readFile(file[0]));
}).listen(port, () => console.log(`demo dapp on http://localhost:${port}`));
