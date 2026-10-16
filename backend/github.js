/**
 * GitHub REST API Client para El Kaku — Publicación en GitHub Pages (Método El Patio)
 * Utiliza la Git Database API de GitHub para commits atómicos (Blobs, Trees, Commits, Refs).
 * Seguridad estricta: NUNCA expone tokens ni credenciales sensibles en logs ni respuestas.
 */

import crypto from 'crypto';

/**
 * Prueba la conexión con GitHub y verifica la existencia de la rama
 */
export async function testGitHubConnection(token, repo, branch) {
  if (!token || !token.trim()) {
    return {
      ok: false,
      status: 400,
      code: 'TOKEN_MISSING',
      message: 'Falta configurar la variable GITHUB_TOKEN en backend/.env.'
    };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/branches/${branch}`, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'El-Kaku-Publisher/1.0'
      }
    });

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        code: 'AUTH_FAILED',
        message: 'Token de GitHub rechazado por autenticación (Token inválido, expirado o revocado - HTTP 401).'
      };
    }

    if (res.status === 404) {
      return {
        ok: false,
        status: 404,
        code: 'REPO_OR_BRANCH_NOT_FOUND',
        message: `El repositorio "${repo}" o la rama "${branch}" no fue encontrado en GitHub (HTTP 404).`
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Permisos insuficientes en GitHub (HTTP 403). Verifique que el token tenga permiso "Contents: Read and write".'
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        code: 'GITHUB_ERROR',
        message: `GitHub devolvió HTTP ${res.status}.`
      };
    }

    const data = await res.json();
    return {
      ok: true,
      status: 200,
      commitSha: data.commit?.sha || null
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con GitHub. Verifique la conexión a internet.'
    };
  }
}

/**
 * Publica un paquete de archivos en la rama gh-pages de GitHub de forma atómica
 * files: Array of { path: string, content: string, encoding: 'utf-8' | 'base64' }
 */
export async function commitFilesToGitHub({ token, repo, branch, files, commitMessage }) {
  if (!token || !token.trim()) {
    throw new Error('TOKEN_MISSING: Falta configurar la variable GITHUB_TOKEN en backend/.env.');
  }

  const cleanToken = token.trim();
  const headers = {
    Authorization: `Bearer ${cleanToken}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'El-Kaku-Publisher/1.0',
    'Content-Type': 'application/json'
  };

  // 1. Obtener la referencia de la rama destino
  let parentCommitSha = null;
  let baseTreeSha = null;

  const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, {
    headers
  });

  if (refRes.ok) {
    const refData = await refRes.json();
    parentCommitSha = refData.object.sha;

    // Obtener árbol base del commit actual
    const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${parentCommitSha}`, {
      headers
    });
    if (commitRes.ok) {
      const commitData = await commitRes.json();
      baseTreeSha = commitData.tree.sha;
    }
  } else if (refRes.status === 404) {
    // Si la rama no existe, consultar la rama por defecto del repositorio
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    if (repoRes.ok) {
      const repoInfo = await repoRes.json();
      const defaultBranch = repoInfo.default_branch || 'main';
      const defRefRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${defaultBranch}`, { headers });
      if (defRefRes.ok) {
        const defRefData = await defRefRes.json();
        parentCommitSha = defRefData.object.sha;
        const defCommitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${parentCommitSha}`, { headers });
        if (defCommitRes.ok) {
          const defCommitData = await defCommitRes.json();
          baseTreeSha = defCommitData.tree.sha;
        }
      }
    }
  } else if (refRes.status === 401) {
    throw new Error('AUTH_FAILED: Token de GitHub no autorizado o expirado (HTTP 401).');
  } else if (refRes.status === 403) {
    throw new Error('FORBIDDEN: Permisos insuficientes en el token de GitHub (HTTP 403).');
  }

  // 2. Cargar árbol existente para optimizar subidas (evitar resubir archivos idénticos)
  const existingBlobMap = new Map(); // path -> sha
  if (baseTreeSha) {
    try {
      const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees/${baseTreeSha}?recursive=1`, {
        headers
      });
      if (treeRes.ok) {
        const treeJson = await treeRes.json();
        if (Array.isArray(treeJson?.tree)) {
          for (const entry of treeJson.tree) {
            if (entry.type === 'blob' && entry.path && entry.sha) {
              existingBlobMap.set(entry.path, entry.sha);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[El Kaku Publisher] No se pudo leer el árbol previo para caché de blobs:', err.message);
    }
  }

  // 3. Comparar SHA-1 nativo de Git y separar archivos nuevos vs ya existentes
  const treeItems = [];
  const filesToUpload = [];

  for (const file of files) {
    // Verificación de seguridad estricta: nunca subir archivos sensibles
    if (
      file.path.startsWith('/') ||
      file.path.includes('..') ||
      /(.env|\.db|\.sqlite|node_modules|package\.json|tsconfig|src\/)/i.test(file.path)
    ) {
      throw new Error(`INVALID_FILE_PATH: Ruta de archivo no permitida por seguridad: ${file.path}`);
    }

    const isBase64 = file.encoding === 'base64';
    const buffer = isBase64 ? Buffer.from(file.content, 'base64') : Buffer.from(file.content, 'utf-8');

    // SHA-1 nativo de Git: sha1("blob " + size + "\0" + content)
    const gitBlobSha = crypto
      .createHash('sha1')
      .update(`blob ${buffer.length}\0`)
      .update(buffer)
      .digest('hex');

    const existingSha = existingBlobMap.get(file.path);
    if (existingSha && existingSha === gitBlobSha) {
      // Archivo sin cambios: reutilizar SHA existente sin hacer petición HTTP a GitHub
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: existingSha
      });
    } else {
      // Archivo nuevo o modificado: encolar para subir
      filesToUpload.push({
        path: file.path,
        content: file.content,
        encoding: isBase64 ? 'base64' : 'utf-8'
      });
    }
  }

  // 4. Subir únicamente archivos nuevos/modificados en lotes secuenciales de 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
    const batch = filesToUpload.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async file => {
        const blobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: file.content,
            encoding: file.encoding
          })
        });

        if (!blobRes.ok) {
          throw new Error(`BLOB_CREATION_FAILED: Error al subir archivo ${file.path} a GitHub (HTTP ${blobRes.status}).`);
        }

        const blobData = await blobRes.json();
        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha
        });
      })
    );
  }

  // 5. Ordenar entradas del árbol por ruta (requerimiento estricto de Git)
  treeItems.sort((a, b) => a.path.localeCompare(b.path));

  // 6. Crear Árbol Git atómico (reutilizando base_tree para preservar archivos no modificados)
  const treePayload = baseTreeSha
    ? { base_tree: baseTreeSha, tree: treeItems }
    : { tree: treeItems };

  const newTreeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(treePayload)
  });

  if (!newTreeRes.ok) {
    throw new Error(`TREE_CREATION_FAILED: Error al generar árbol de Git en GitHub (HTTP ${newTreeRes.status}).`);
  }

  const newTreeData = await newTreeRes.json();
  const newTreeSha = newTreeData.sha;

  // 7. Crear Commit atómico
  const newCommitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: commitMessage || `Publicar Carta Digital completa — ${new Date().toLocaleString('es-AR')}`,
      tree: newTreeSha,
      parents: parentCommitSha ? [parentCommitSha] : []
    })
  });

  if (!newCommitRes.ok) {
    throw new Error(`COMMIT_FAILED: Error al crear commit en GitHub (HTTP ${newCommitRes.status}).`);
  }

  const newCommitData = await newCommitRes.json();
  const newCommitSha = newCommitData.sha;

  // 8. Actualizar la referencia de la rama gh-pages (atómico)
  let refUpdated = false;
  try {
    const updateRefRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sha: newCommitSha,
        force: true
      })
    });
    if (updateRefRes.ok) {
      refUpdated = true;
    }
  } catch (err) {
    // Si falla PATCH, intentar POST abajo
  }

  if (!refUpdated) {
    const createRefRes = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: newCommitSha
      })
    });
    if (!createRefRes.ok) {
      throw new Error(`REF_UPDATE_FAILED: Error al actualizar referencia de la rama ${branch} en GitHub (HTTP ${createRefRes.status}).`);
    }
  }

  return {
    success: true,
    commitSha: newCommitSha,
    filesCount: treeItems.length,
    uploadedCount: filesToUpload.length
  };
}
