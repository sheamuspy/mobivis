const chokidar = require('chokidar');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const SYNC_DIR = process.env.SYNC_DIR || process.cwd();

const wss = new WebSocket.Server({ host: '0.0.0.0', port: PORT });

console.log(`Mobivis server running on ws://localhost:${PORT}`);
console.log(`Watching: ${SYNC_DIR}`);

const clients = new Set();

function sendTree(ws) {
  const tree = [];
  
  function walk(dir, parent) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(SYNC_DIR, fullPath);
      const node = {
        id: relativePath,
        name: entry.name,
        type: entry.isDirectory() ? 'tree' : 'blob',
        path: relativePath,
        parent: parent,
      };
      tree.push(node);
      
      if (entry.isDirectory()) {
        walk(fullPath, relativePath);
      }
    }
  }
  
  walk(SYNC_DIR, null);
  ws.send(JSON.stringify({ type: 'tree', files: tree }));
}

function sendFile(ws, filePath) {
  try {
    const absolutePath = path.join(SYNC_DIR, filePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const isDir = fs.statSync(absolutePath).isDirectory();
    ws.send(JSON.stringify({ 
      type: 'add', 
      path: filePath, 
      content: isDir ? undefined : content,
      isDirectory: isDir 
    }));
  } catch (e) {
    ws.send(JSON.stringify({ type: 'error', path: filePath, message: e.message }));
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');
  
  // Send current tree on connect (includes all files, no individual adds)
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'read') {
        sendFile(ws, msg.path);
      } else if (msg.type === 'write') {
        const absolutePath = path.join(SYNC_DIR, msg.path);
        fs.writeFileSync(absolutePath, msg.content);
        broadcast({ type: 'changed', path: msg.path }, ws);
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: e.message }));
    }
  });
});

const watcher = chokidar.watch(SYNC_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true,
});

watcher
  .on('add', (filePath) => {
    const relativePath = path.relative(SYNC_DIR, filePath);
    const isDir = fs.statSync(filePath).isDirectory();
    broadcast({ type: 'add', path: relativePath, isDirectory: isDir }, null, isDir ? undefined : fs.readFileSync(filePath, 'utf-8'));
  })
  .on('change', (filePath) => {
    const relativePath = path.relative(SYNC_DIR, filePath);
    broadcast({ type: 'change', path: relativePath }, null, fs.readFileSync(filePath, 'utf-8'));
  })
  .on('unlink', (filePath) => {
    const relativePath = path.relative(SYNC_DIR, filePath);
    broadcast({ type: 'delete', path: relativePath });
  })
  .on('addDir', (filePath) => {
    const relativePath = path.relative(SYNC_DIR, filePath);
    broadcast({ type: 'add', path: relativePath, isDirectory: true });
  })
  .on('unlinkDir', (filePath) => {
    const relativePath = path.relative(SYNC_DIR, filePath);
    broadcast({ type: 'delete', path: relativePath });
  });

function broadcast(event, excludeWs, content) {
  const message = JSON.stringify({ ...event, content });
  clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  console.log(event.type, event.path);
}
