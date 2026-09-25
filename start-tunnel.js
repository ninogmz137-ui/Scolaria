/**
 * Scolaria — Expo + Cloudflare Tunnel with Manifest Proxy
 *
 * Problem: Expo Go fetches the manifest and Metro puts your local IP
 * in it. The firewall blocks the connection from your phone.
 *
 * Solution: Run a reverse proxy on the same port that:
 * 1. Forwards all requests to Metro
 * 2. Rewrites the manifest to replace local IP with tunnel URL
 * 3. Cloudflare tunnel points to the proxy, not Metro directly
 *
 * Usage: node start-tunnel.js
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const METRO_PORT = 8081;
const PROXY_PORT = 8082;
const CF_PATH = path.join(__dirname, 'cloudflared.exe');

let tunnelUrl = null;
let tunnelHost = null;

// ─── Step 1: Start Metro ────────────────────────────────

console.log('\n🚀 Step 1/3 — Starting Metro on port', METRO_PORT, '...\n');

const expo = spawn('npx', ['expo', 'start', '--port', String(METRO_PORT), '--localhost'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
});

expo.stdout.on('data', (d) => process.stdout.write(d.toString()));
expo.stderr.on('data', (d) => process.stderr.write(d.toString()));

// ─── Step 2: Start reverse proxy ────────────────────────

function startProxy() {
  return new Promise((resolve) => {
    const proxy = http.createServer((req, res) => {
      const options = {
        hostname: 'localhost',
        port: METRO_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `localhost:${METRO_PORT}` },
      };

      const proxyReq = http.request(options, (proxyRes) => {
        const contentType = proxyRes.headers['content-type'] || '';
        const isManifest =
          req.url === '/' ||
          req.url.includes('manifest') ||
          req.url.includes('index') ||
          contentType.includes('json');

        if (isManifest && tunnelUrl) {
          // Collect body and rewrite URLs
          let body = '';
          proxyRes.on('data', (chunk) => (body += chunk.toString()));
          proxyRes.on('end', () => {
            // Replace all local IP:port references with tunnel URL
            let rewritten = body
              .replace(/http:\/\/192\.168\.\d+\.\d+:\d+/g, tunnelUrl)
              .replace(/http:\/\/10\.\d+\.\d+\.\d+:\d+/g, tunnelUrl)
              .replace(/http:\/\/172\.\d+\.\d+\.\d+:\d+/g, tunnelUrl)
              .replace(/http:\/\/localhost:\d+/g, tunnelUrl)
              .replace(/http:\/\/127\.0\.0\.1:\d+/g, tunnelUrl)
              .replace(/exp:\/\/192\.168\.\d+\.\d+:\d+/g, `exp://${tunnelHost}:443`)
              .replace(/exp:\/\/10\.\d+\.\d+\.\d+:\d+/g, `exp://${tunnelHost}:443`)
              .replace(/exp:\/\/172\.\d+\.\d+\.\d+:\d+/g, `exp://${tunnelHost}:443`)
              .replace(/exp:\/\/localhost:\d+/g, `exp://${tunnelHost}:443`)
              .replace(/exp:\/\/127\.0\.0\.1:\d+/g, `exp://${tunnelHost}:443`);

            const headers = { ...proxyRes.headers };
            delete headers['content-length']; // Length may have changed
            headers['content-length'] = Buffer.byteLength(rewritten);

            res.writeHead(proxyRes.statusCode, headers);
            res.end(rewritten);
          });
        } else {
          // Stream non-manifest responses directly
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        }
      });

      proxyReq.on('error', (err) => {
        res.writeHead(502);
        res.end('Metro not ready: ' + err.message);
      });

      req.pipe(proxyReq, { end: true });
    });

    proxy.listen(PROXY_PORT, '0.0.0.0', () => {
      console.log(`✅ Step 2/3 — Proxy running on port ${PROXY_PORT}\n`);
      resolve();
    });
  });
}

// ─── Step 3: Start Cloudflare tunnel → proxy ────────────

function startTunnel() {
  return new Promise((resolve, reject) => {
    console.log('🌐 Step 3/3 — Starting Cloudflare Tunnel → proxy...\n');

    const cf = spawn(CF_PATH, [
      'tunnel', '--url', `http://localhost:${PROXY_PORT}`, '--no-tls-verify',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    function onData(data) {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !tunnelUrl) {
        tunnelUrl = match[0];
        tunnelHost = tunnelUrl.replace('https://', '');
        resolve(tunnelUrl);
      }
    }

    cf.stdout.on('data', onData);
    cf.stderr.on('data', onData);

    cf.on('close', (code) => {
      if (!tunnelUrl) reject(new Error('Tunnel failed (code ' + code + ')'));
    });

    // Store for cleanup
    startTunnel._process = cf;

    setTimeout(() => {
      if (!tunnelUrl) reject(new Error('Tunnel timeout (30s)'));
    }, 30000);
  });
}

// ─── Wait for Metro, then start proxy + tunnel ──────────

function waitForMetro(retries = 40) {
  return new Promise((resolve, reject) => {
    const check = (attempt) => {
      if (attempt >= retries) {
        reject(new Error('Metro did not start in time'));
        return;
      }
      const req = http.get(`http://localhost:${METRO_PORT}`, () => resolve());
      req.on('error', () => setTimeout(() => check(attempt + 1), 1500));
      req.end();
    };
    check(0);
  });
}

(async () => {
  try {
    await waitForMetro();
    console.log('✅ Step 1/3 — Metro is ready!\n');

    await startProxy();
    const url = await startTunnel();

    const host = url.replace('https://', '');

    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                   ║');
    console.log('║   📱  SCOLARIA — Prêt ! Connecte ton iPhone                       ║');
    console.log('║                                                                   ║');
    console.log('║   Dans Expo Go → "Enter URL manually" → colle :                   ║');
    console.log('║                                                                   ║');
    console.log(`║   ${url}`);
    console.log('║                                                                   ║');
    console.log('║   Ou dans Safari sur ton iPhone :                                 ║');
    console.log('║                                                                   ║');
    console.log(`║   ${url}`);
    console.log('║                                                                   ║');
    console.log('║   Version web (PC) : http://localhost:' + METRO_PORT + '                        ║');
    console.log('║                                                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log('\n');
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
})();

// Cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  expo.kill();
  if (startTunnel._process) startTunnel._process.kill();
  process.exit(0);
});
