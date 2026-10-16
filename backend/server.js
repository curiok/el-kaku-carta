import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildStaticMenuBundle } from './builder.js';
import { testGitHubConnection, commitFilesToGitHub } from './github.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde backend/.env
function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  const env = {
    GITHUB_TOKEN: '',
    GITHUB_REPO: 'curiok/el-kaku-carta',
    GITHUB_BRANCH: 'gh-pages',
    PORT: 3145
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
        if (key in env || key === 'GITHUB_TOKEN' || key === 'PUBLISHER_PORT') {
          if (key === 'PUBLISHER_PORT' || key === 'PORT') {
            env.PORT = Number(value) || 3145;
          } else {
            env[key] = value;
          }
        }
      }
    }
  }

  // Sobrescribir con process.env si existen
  if (process.env.GITHUB_TOKEN) env.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (process.env.GITHUB_REPO) env.GITHUB_REPO = process.env.GITHUB_REPO;
  if (process.env.GITHUB_BRANCH) env.GITHUB_BRANCH = process.env.GITHUB_BRANCH;
  if (process.env.PORT) env.PORT = Number(process.env.PORT);

  return env;
}

let isPublishing = false; // Mutex anti-concurrencia (igual que El Patio)
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

  // 1. Endpoint de estado (compatible con /api/status y El Patio /api/digital-menu/info)
  if (req.method === 'GET' && (url.pathname === '/api/status' || url.pathname === '/api/digital-menu/info')) {
    const isTokenSet = Boolean(env.GITHUB_TOKEN && env.GITHUB_TOKEN.trim().length > 10);
    const [owner, repoName] = (env.GITHUB_REPO || 'curiok/el-kaku-carta').split('/');
    const publicUrl = `https://${(owner || 'curiok').toLowerCase()}.github.io/${repoName || 'el-kaku-carta'}/`;

    res.writeHead(200, headers);
    res.end(JSON.stringify({
      ok: true,
      success: true,
      service: 'El Kaku Backend de Publicación (Método El Patio)',
      configured: isTokenSet,
      repoConfigured: isTokenSet,
      repo: env.GITHUB_REPO,
      branch: env.GITHUB_BRANCH,
      publicUrl,
      isPublishing,
      lastPublish: lastPublishStatus
    }));
    return;
  }

  // 2. Exportación local sin subir a GitHub (para pruebas y respaldo)
  if (req.method === 'POST' && url.pathname === '/api/export-local') {
    try {
      const body = await parseJsonBody(req);
      const bundle = await buildStaticMenuBundle(body);
      res.writeHead(200, headers);
      res.end(JSON.stringify({
        ok: true,
        success: true,
        message: 'Copia estática generada con éxito en backend/dist-public/',
        filesCount: bundle.files.length,
        localPath: bundle.localExportPath
      }));
    } catch (err) {
      res.writeHead(500, headers);
      res.end(JSON.stringify({
        ok: false,
        success: false,
        error: 'EXPORT_FAILED',
        message: err.message
      }));
    }
    return;
  }

  // 3. Endpoint de Publicación en GitHub Pages (compatible con /api/publish y El Patio /api/digital-menu/publish)
  if (req.method === 'POST' && (url.pathname === '/api/publish' || url.pathname === '/api/digital-menu/publish')) {
    // Control de concurrencia: evitar peticiones simultáneas que generen error 409 en GitHub
    if (isPublishing) {
      res.writeHead(409, headers);
      res.end(JSON.stringify({
        ok: false,
        success: false,
        code: 'PUBLISH_IN_PROGRESS',
        message: 'Ya hay una publicación de la Carta Digital en curso. Por favor espere unos segundos.'
      }));
      return;
    }

    isPublishing = true;

    try {
      const body = await parseJsonBody(req);

      // Validar presencia del token en backend/.env
      if (!env.GITHUB_TOKEN || !env.GITHUB_TOKEN.trim()) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({
          ok: false,
          success: false,
          code: 'TOKEN_NOT_CONFIGURED',
          message: 'Error al publicar la Carta Digital: Falta configurar la variable GITHUB_TOKEN en backend/.env.'
        }));
        return;
      }

      // Validar formato del repositorio
      if (!env.GITHUB_REPO || !env.GITHUB_REPO.includes('/')) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({
          ok: false,
          success: false,
          code: 'REPO_INVALID',
          message: 'Error al publicar la Carta Digital: Falta configurar la variable GITHUB_REPO (usuario/repositorio) en backend/.env.'
        }));
        return;
      }

      // 1. Probar conexión y permisos con GitHub
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

      // 2. Compilar y empaquetar el sitio completo (index.html, assets/, data/menu.json, imágenes, .nojekyll)
      const bundle = await buildStaticMenuBundle(body);

      // 3. Publicar los archivos en gh-pages de forma atómica mediante la Git Data API
      const result = await commitFilesToGitHub({
        token: env.GITHUB_TOKEN,
        repo: env.GITHUB_REPO,
        branch: env.GITHUB_BRANCH,
        files: bundle.files,
        commitMessage: `Publicar Carta Digital completa — ${new Date().toLocaleString('es-AR')}`
      });

      const [owner, repoName] = env.GITHUB_REPO.split('/');
      const publicUrl = `https://${owner.toLowerCase()}.github.io/${repoName}/`;

      lastPublishStatus = {
        success: true,
        timestamp: new Date().toISOString(),
        commitSha: result.commitSha,
        filesCount: result.filesCount,
        uploadedCount: result.uploadedCount,
        repo: env.GITHUB_REPO,
        branch: env.GITHUB_BRANCH,
        publicUrl,
        message: `Carta Digital publicada con éxito en GitHub Pages (${publicUrl}) con ${result.filesCount} archivos (${result.uploadedCount} modificados/subidos).`
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
    } finally {
      isPublishing = false;
    }
    return;
  }

  // 404 para cualquier otra ruta
  res.writeHead(404, headers);
  res.end(JSON.stringify({ ok: false, error: 'Endpoint no encontrado' }));
});

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // Límite de seguridad 50MB
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
const PORT = env.PORT || 3145;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`====================================================================`);
  console.log(`  EL KAKU — BACKEND DE PUBLICACIÓN (MÉTODO EL PATIO)`);
  console.log(`  Servidor activo en: http://${HOST}:${PORT}`);
  console.log(`  Repositorio: ${env.GITHUB_REPO} | Rama: ${env.GITHUB_BRANCH}`);
  console.log(`====================================================================`);
});
