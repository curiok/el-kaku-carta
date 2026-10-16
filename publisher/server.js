import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildStaticMenuBundle } from './builder.js';
import { testGitHubConnection, commitFilesToGitHub } from './github.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  const env = {
    GITHUB_TOKEN: '',
    GITHUB_REPO: 'curiok/el-kaku-carta',
    GITHUB_BRANCH: 'gh-pages',
    PUBLISHER_PORT: 3145
  };

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (key in env || key === 'GITHUB_TOKEN') {
          env[key] = value;
        }
      }
    }
  }

  // Also check process.env overrides
  if (process.env.GITHUB_TOKEN) env.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (process.env.GITHUB_REPO) env.GITHUB_REPO = process.env.GITHUB_REPO;
  if (process.env.GITHUB_BRANCH) env.GITHUB_BRANCH = process.env.GITHUB_BRANCH;
  if (process.env.PUBLISHER_PORT) env.PUBLISHER_PORT = Number(process.env.PUBLISHER_PORT);

  return env;
}

let lastPublishStatus = null;

const server = http.createServer(async (req, res) => {
  const env = loadEnv();
  const origin = req.headers['origin'] || '*';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin === '*' ? '*' : origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  // 1. Status endpoint (supports /api/status and El Patio /api/digital-menu/info)
  if (req.method === 'GET' && (url.pathname === '/api/status' || url.pathname === '/api/digital-menu/info')) {
    const isTokenSet = Boolean(env.GITHUB_TOKEN && env.GITHUB_TOKEN.trim().length > 10);
    res.writeHead(200, headers);
    res.end(JSON.stringify({
      ok: true,
      success: true,
      service: 'El Kaku Publisher Backend',
      configured: isTokenSet,
      repoConfigured: isTokenSet,
      repo: env.GITHUB_REPO,
      branch: env.GITHUB_BRANCH,
      publicUrl: `https://${env.GITHUB_REPO.split('/')[0]}.github.io/${env.GITHUB_REPO.split('/')[1]}/`,
      lastPublish: lastPublishStatus
    }));
    return;
  }

  // 2. Export local bundle without publishing to GitHub
  if (req.method === 'POST' && url.pathname === '/api/export-local') {
    try {
      const body = await parseJsonBody(req);
      const bundle = await buildStaticMenuBundle(body);
      res.writeHead(200, headers);
      res.end(JSON.stringify({
        ok: true,
        message: 'Copia estática generada localmente con éxito en publisher/dist-public/',
        filesCount: bundle.files.length,
        localPath: bundle.localExportPath
      }));
    } catch (err) {
      res.writeHead(500, headers);
      res.end(JSON.stringify({
        ok: false,
        error: 'EXPORT_FAILED',
        message: err.message
      }));
    }
    return;
  }

  // 3. Publish to GitHub endpoint (supports /api/publish and El Patio /api/digital-menu/publish)
  if (req.method === 'POST' && (url.pathname === '/api/publish' || url.pathname === '/api/digital-menu/publish')) {
    try {
      const body = await parseJsonBody(req);

      // Validate token presence
      if (!env.GITHUB_TOKEN || !env.GITHUB_TOKEN.trim()) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({
          ok: false,
          success: false,
          code: 'TOKEN_NOT_CONFIGURED',
          message: 'El token de GitHub no está configurado. Por favor, verificá que GITHUB_TOKEN esté definido en publisher/.env.'
        }));
        return;
      }

      // First test connection to repository
      const connTest = await testGitHubConnection(env.GITHUB_TOKEN, env.GITHUB_REPO, env.GITHUB_BRANCH);
      if (!connTest.ok) {
        lastPublishStatus = {
          success: false,
          timestamp: new Date().toISOString(),
          error: connTest.message,
          code: connTest.code
        };
        res.writeHead(connTest.status || 500, headers);
        res.end(JSON.stringify(lastPublishStatus));
        return;
      }

      // Build static files bundle
      const bundle = await buildStaticMenuBundle(body);

      // Commit to GitHub atomically
      const result = await commitFilesToGitHub({
        token: env.GITHUB_TOKEN,
        repo: env.GITHUB_REPO,
        branch: env.GITHUB_BRANCH,
        files: bundle.files,
        commitMessage: `Publicación Carta El Kaku - ${new Date().toLocaleString('es-AR')}`
      });

      lastPublishStatus = {
        success: true,
        timestamp: new Date().toISOString(),
        commitSha: result.commitSha,
        filesCount: result.filesCount,
        repo: env.GITHUB_REPO,
        branch: env.GITHUB_BRANCH,
        publicUrl: `https://${env.GITHUB_REPO.split('/')[0]}.github.io/${env.GITHUB_REPO.split('/')[1]}/`
      };

      res.writeHead(200, headers);
      res.end(JSON.stringify(lastPublishStatus));
    } catch (err) {
      lastPublishStatus = {
        success: false,
        timestamp: new Date().toISOString(),
        error: err.message || 'Error inesperado durante la publicación.'
      };
      res.writeHead(500, headers);
      res.end(JSON.stringify(lastPublishStatus));
    }
    return;
  }

  // 404 for unknown endpoints
  res.writeHead(404, headers);
  res.end(JSON.stringify({ ok: false, error: 'Endpoint no encontrado' }));
});

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB safety limit
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        reject(new Error('JSON inválido en el cuerpo de la solicitud'));
      }
    });
    req.on('error', reject);
  });
}

const env = loadEnv();
const PORT = env.PUBLISHER_PORT || 3145;
const HOST = process.env.PUBLISHER_HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`[El Kaku Publisher] Backend escuchando en http://${HOST}:${PORT}`);
});
