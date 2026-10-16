/**
 * GitHub REST API Client for publishing El Kaku Public Menu
 * Uses GitHub Git Database API for atomic commits.
 * Strictly avoids exposing tokens or sensitive information.
 */

export async function testGitHubConnection(token, repo, branch) {
  if (!token || !token.trim()) {
    return {
      ok: false,
      status: 400,
      code: 'TOKEN_MISSING',
      message: 'El token de GitHub no está configurado en el archivo publisher/.env.'
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
        message: 'Token de GitHub inválido o expirado. Verificá tu Personal Access Token.'
      };
    }

    if (res.status === 404) {
      return {
        ok: false,
        status: 404,
        code: 'REPO_OR_BRANCH_NOT_FOUND',
        message: `No se encontró el repositorio "${repo}" o la rama "${branch}" en GitHub.`
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Acceso denegado: el token no tiene permisos suficientes para este repositorio.'
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        code: 'GITHUB_ERROR',
        message: `Error al conectar con GitHub (código HTTP ${res.status}).`
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
      message: 'No se pudo conectar con GitHub. Verificá tu conexión a internet.'
    };
  }
}

/**
 * Publishes a set of files atomically to GitHub branch using the Git Database API
 * files: Array of { path: string, content: string | Buffer, encoding: 'utf-8' | 'base64' }
 */
export async function commitFilesToGitHub({ token, repo, branch, files, commitMessage }) {
  if (!token || !token.trim()) {
    throw new Error('TOKEN_MISSING: El token de GitHub no está configurado.');
  }

  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'El-Kaku-Publisher/1.0',
    'Content-Type': 'application/json'
  };

  // 1. Get current branch reference
  const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, {
    headers
  });

  if (!refRes.ok) {
    if (refRes.status === 401) throw new Error('AUTH_FAILED: Token de GitHub no autorizado o expirado.');
    if (refRes.status === 404) throw new Error(`BRANCH_NOT_FOUND: La rama "${branch}" no existe en el repositorio.`);
    if (refRes.status === 403) throw new Error('FORBIDDEN: Permisos insuficientes en el token de GitHub.');
    throw new Error(`GITHUB_ERROR: Error al consultar referencia de rama (HTTP ${refRes.status}).`);
  }

  const refData = await refRes.json();
  const currentCommitSha = refData.object.sha;

  // 2. Get commit object to obtain base_tree SHA
  const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${currentCommitSha}`, {
    headers
  });

  if (!commitRes.ok) {
    throw new Error(`GITHUB_ERROR: No se pudo obtener el commit base (HTTP ${commitRes.status}).`);
  }

  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Fetch existing tree recursively to reuse unchanged file blobs (like El Patio)
  const existingBlobMap = new Map(); // path -> sha
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

  // 4. Calculate local Git SHA-1 and separate files into unchanged vs files to upload
  const crypto = await import('crypto');
  const treeItems = [];
  const filesToUpload = [];

  for (const file of files) {
    // Security check: ensure path is safe
    if (file.path.startsWith('/') || file.path.includes('..') || file.path.includes('.env')) {
      throw new Error(`INVALID_FILE_PATH: Ruta de archivo no permitida: ${file.path}`);
    }

    const isBase64 = file.encoding === 'base64';
    const buffer = isBase64 ? Buffer.from(file.content, 'base64') : Buffer.from(file.content, 'utf-8');

    // Native Git blob SHA: sha1("blob " + size + "\0" + content)
    const gitBlobSha = crypto.default
      .createHash('sha1')
      .update(`blob ${buffer.length}\0`)
      .update(buffer)
      .digest('hex');

    const existingSha = existingBlobMap.get(file.path);
    if (existingSha && existingSha === gitBlobSha) {
      // Unchanged file: reuse existing blob SHA without HTTP overhead
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: existingSha
      });
    } else {
      // New or modified file: enqueue for upload
      filesToUpload.push({
        path: file.path,
        content: file.content,
        encoding: isBase64 ? 'base64' : 'utf-8'
      });
    }
  }

  // 5. Upload new/modified blobs in controlled batches
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
          throw new Error(`BLOB_CREATION_FAILED: Error al subir archivo ${file.path} (HTTP ${blobRes.status}).`);
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

  // 6. Sort tree entries by path (mandatory for Git tree structure)
  treeItems.sort((a, b) => a.path.localeCompare(b.path));

  // 7. Create new Tree
  const newTreeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems
    })
  });

  if (!newTreeRes.ok) {
    throw new Error(`TREE_CREATION_FAILED: Error al generar árbol de Git (HTTP ${newTreeRes.status}).`);
  }

  const newTreeData = await newTreeRes.json();
  const newTreeSha = newTreeData.sha;

  // 8. Create Commit
  const newCommitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: commitMessage || `Publicación Carta Digital El Kaku - ${new Date().toLocaleString('es-AR')}`,
      tree: newTreeSha,
      parents: [currentCommitSha]
    })
  });

  if (!newCommitRes.ok) {
    throw new Error(`COMMIT_FAILED: Error al crear commit en GitHub (HTTP ${newCommitRes.status}).`);
  }

  const newCommitData = await newCommitRes.json();
  const newCommitSha = newCommitData.sha;

  // 9. Update Branch Reference atomically
  const updateRefRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: newCommitSha,
      force: true
    })
  });

  if (!updateRefRes.ok) {
    // If branch ref doesn't exist yet, create it with POST
    const createRefRes = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: newCommitSha
      })
    });
    if (!createRefRes.ok) {
      throw new Error(`REF_UPDATE_FAILED: Error al actualizar rama ${branch} (HTTP ${updateRefRes.status}).`);
    }
  }

  return {
    success: true,
    commitSha: newCommitSha,
    filesCount: treeItems.length,
    uploadedCount: filesToUpload.length
  };
}
