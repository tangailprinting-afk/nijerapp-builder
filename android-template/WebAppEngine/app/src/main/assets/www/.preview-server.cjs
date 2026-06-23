const http = require('http');
const fs = require('fs');
const path = require('path');

const root = 'C:/Users/ADMIN/Desktop/Coding/01/Project';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  let u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u === '/') u = '/pos.html';
  const fp = path.join(root, u);
  if (!fp.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(fp).toLowerCase()] || 'text/plain; charset=utf-8' });
    res.end(data);
  });
}).listen(8000, '127.0.0.1', () => console.log('preview-server-ready'));
