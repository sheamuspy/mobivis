import * as path from 'path';
import { createServer } from './server.js';

const PORT = 4747;
const watchDir = path.resolve(process.argv[2] ?? process.cwd());

const { close } = createServer({ port: PORT, watchDir });

function shutdown() {
  console.log('\n  Shutting down…');
  close().then(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
