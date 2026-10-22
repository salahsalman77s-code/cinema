'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const UPSTREAMS = ['https://api.framextv.cc', 'https://api.framextv.xyz', 'https://api.framextv.tech'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.woff2': 'font/woff2' };

function createApp({ fetchImpl = fetch, root = __dirname } = {}) {
  const publicRoot = fs.realpathSync(root);
  function json(res, status, data) {
    if (res.destroyed || res.headersSent) return;
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  }
  async function relay(req, res, url) {
    const route = url.pathname.slice('/backend'.length);
    if (!(route.startsWith('/api/') || route.startsWith('/anime/')) || /[\\\x00-\x1f]/.test(route) || /%2f|%5c|%2e/i.test(route)) {
      return json(res, 404, { success: false, error: 'Unsupported API route' });
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return json(res, 405, { success: false, error: 'Method not allowed' });
    }
    const abort = new AbortController();
    const disconnected = () => { if (!res.writableFinished) abort.abort(); };
    res.on('close', disconnected);
    try {
      for (let i = 0; i < UPSTREAMS.length; i++) {
        const timer = setTimeout(() => abort.abort(), 20000);
        let upstream;
        try {
          const headers = { Accept: req.headers.accept || '*/*' };
          if (req.headers.range) headers.Range = req.headers.range;
          upstream = await fetchImpl(UPSTREAMS[i] + route + url.search, {
            method: req.method, headers, redirect: 'error', signal: abort.signal
          });
        } catch (error) {
          if (abort.signal.aborted || i === UPSTREAMS.length - 1) throw error;
          continue;
        } finally { clearTimeout(timer); }
        if (upstream.status >= 500 && i < UPSTREAMS.length - 1) {
          await upstream.body?.cancel();
          continue;
        }
        res.statusCode = upstream.status;
        for (const name of ['content-type', 'content-range', 'accept-ranges', 'cache-control']) {
          const value = upstream.headers.get(name);
          if (value) res.setHeader(name, value);
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (req.method === 'HEAD' || !upstream.body) return res.end();
        await pipeline(Readable.fromWeb(upstream.body), res);
        return;
      }
    } catch (_) {
      json(res, 502, { success: false, error: 'تعذّر الاتصال بخوادم FrameXTV. حاول لاحقًا.' });
      if (res.headersSent && !res.writableEnded) res.destroy();
    } finally { res.removeListener('close', disconnected); }
  }
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/healthz') return json(res, 200, { status: 'ok' });
      if (url.pathname.startsWith('/backend/')) return await relay(req, res, url);
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });
      if (url.pathname === '/web-config.js') {
        res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' });
        return res.end(req.method === 'HEAD' ? '' : "window.SAFAFI_API_BASE=location.origin+'/backend';window.SAFAFI_ANIME_BASE=location.origin+'/backend/anime';\n");
      }
      let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      if (/[\\\x00-\x1f]/.test(relative) || relative.split('/').some(x => x.startsWith('.'))) return json(res, 404, { error: 'Not found' });
      const directory = relative.includes('/') ? relative.split('/')[0] : '';
      if (directory && !['assets', 'src', 'ui', 'branding', 'icons'].includes(directory)) return json(res, 404, { error: 'Not found' });
      const type = TYPES[path.extname(relative)];
      if (!type) return json(res, 404, { error: 'Not found' });
      const file = path.resolve(publicRoot, relative);
      if (!file.startsWith(publicRoot + path.sep)) return json(res, 404, { error: 'Not found' });
      let actual, stat;
      try { actual = await fs.promises.realpath(file); stat = await fs.promises.stat(actual); }
      catch (_) { return json(res, 404, { error: 'Not found' }); }
      if (!actual.startsWith(publicRoot + path.sep) || !stat.isFile()) return json(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') return res.end();
      await pipeline(fs.createReadStream(actual), res);
    } catch (_) {
      json(res, 500, { error: 'Server error' });
      if (res.headersSent && !res.writableEnded) res.destroy();
    }
  });
}
module.exports = { createApp };
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '0.0.0.0', () => console.log('Safafi Cinema listening on port ' + port));
}
