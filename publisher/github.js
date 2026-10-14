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

  // 3. Create Blobs for each file
  const treeItems = [];

  for (const file of files) {
    // Security check: ensure path is safe
    if (file.path.startsWith('/') || file.path.includes('..') || file.path.includes('.env')) {
      throw new Error(`INVALID_FILE_PATH: Ruta de archivo no permitida: ${file.path}`);
    }

    const isBase64 = file.encoding === 'base64';
    const blobPayload = {
      content: file.content,
      encoding: isBase64 ? 'base64' : 'utf-8'
    };

    const blobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(blobPayload)
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
  }

  // 4. Create new Tree
  const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems
    })
  });

  if (!treeRes.ok) {
    throw new Error(`TREE_CREATION_FAILED: Error al generar árbol de Git (HTTP ${treeRes.status}).`);
  }

  const treeData = await treeRes.json();
  const newTreeSha = treeData.sha;

  // 5. Create Commit
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

  // 6. Update Branch Reference
  const updateRefRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: newCommitSha,
      force: false
    })
  });

  if (!updateRefRes.ok) {
    throw new Error(`REF_UPDATE_FAILED: Error al actualizar rama ${branch} (HTTP ${updateRefRes.status}).`);
  }

  return {
    success: true,
    commitSha: newCommitSha,
    filesCount: treeItems.length
  };
}
