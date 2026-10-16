const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function calculateGitBlobSha(buffer: Uint8Array): Promise<string> {
  const header = new TextEncoder().encode(`blob ${buffer.length}\0`);
  const full = new Uint8Array(header.length + buffer.length);
  full.set(header, 0);
  full.set(buffer, header.length);
  const hashBuffer = await crypto.subtle.digest('SHA-1', full);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const token = Deno.env.get('GITHUB_TOKEN');
  const repo = Deno.env.get('GITHUB_REPO') || 'curiok/el-kaku-carta';
  const branch = Deno.env.get('GITHUB_BRANCH') || 'gh-pages';
  const [owner, repoName] = repo.split('/');
  const publicUrl = `https://${(owner || 'curiok').toLowerCase()}.github.io/${repoName || 'el-kaku-carta'}/`;

  // Endpoint de estado
  if (req.method === 'GET') {
    const isConfigured = Boolean(token && token.trim().length > 10);
    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        service: 'El Kaku Cloud Publisher (Supabase Edge)',
        configured: isConfigured,
        repo,
        branch,
        publicUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!token || !token.trim()) {
    return new Response(
      JSON.stringify({
        ok: false,
        success: false,
        code: 'TOKEN_NOT_CONFIGURED',
        message: 'Falta configurar GITHUB_TOKEN en los secretos de Supabase.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      business,
      categories = [],
      products = [],
      optionGroups = []
    } = body;

    const filesToPublish: Array<{ path: string; buffer: Uint8Array; encoding: 'utf-8' | 'base64'; contentString: string }> = [];

    // 1. Filtrar únicamente categorías y productos activos
    const activeCategories = categories.filter((c: any) => c.isActive);
    const activeCategoryIds = new Set(activeCategories.map((c: any) => c.id));
    const activeProducts = products.filter((p: any) => p.isAvailable && activeCategoryIds.has(p.categoryId));
    const activeOptionGroupIds = new Set(activeProducts.flatMap((p: any) => p.optionGroupIds || []));
    const relevantOptionGroups = optionGroups.filter((og: any) => og.isActive && activeOptionGroupIds.has(og.id));

    // 2. Procesar imágenes base64 si las hubiera
    const processedProducts = [];
    for (const product of activeProducts) {
      const processedImages: string[] = [];
      const images = Array.isArray(product.images) ? product.images : [];

      for (let idx = 0; idx < images.length; idx++) {
        const img = images[idx];
        if (typeof img === 'string' && img.startsWith('data:image/')) {
          const matches = img.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (matches) {
            const ext = matches[1].includes('jpeg') ? 'jpg' : matches[1].includes('png') ? 'png' : 'webp';
            const fileName = `images/prod_${product.id}_${idx}.${ext}`;
            const binString = atob(matches[2]);
            const bytes = new Uint8Array(binString.length);
            for (let i = 0; i < binString.length; i++) {
              bytes[i] = binString.charCodeAt(i);
            }
            filesToPublish.push({
              path: fileName,
              buffer: bytes,
              encoding: 'base64',
              contentString: matches[2]
            });
            processedImages.push(`./${fileName}`);
            continue;
          }
        }
        processedImages.push(img);
      }

      processedProducts.push({
        ...product,
        images: processedImages
      });
    }

    // 3. Generar data/menu.json limpio
    const categoriesWithProducts = activeCategories.filter((c: any) => activeProducts.some((p: any) => p.categoryId === c.id));
    const publicCategories = categoriesWithProducts.length > 0 ? categoriesWithProducts : activeCategories;

    const isFreeDelivery = (business?.deliveryFeeMode ?? 'free') === 'free';
    const publicMenuData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      business: {
        name: business?.name || 'El Kaku',
        menuTitle: business?.menuTitle || 'Carta Digital El Kaku',
        whatsappNumber: business?.whatsappNumber || '+54 9 3821 40-6662',
        currencySymbol: business?.currencySymbol || '$',
        deliveryEnabled: business?.deliveryEnabled ?? true,
        pickupEnabled: business?.pickupEnabled ?? true,
        deliveryFeeMode: isFreeDelivery ? 'free' : 'paid',
        deliveryFee: isFreeDelivery ? 0 : (Number(business?.deliveryFee) || 0),
        welcomeText: business?.welcomeText || '',
        contactText: business?.contactText || '',
        theme: business?.theme || {
          primary: '#C99A16',
          secondary: '#F07819',
          background: '#17130D',
          surface: '#241D14',
          text: '#FFFDF8',
          accent: '#D93620'
        }
      },
      categories: publicCategories,
      products: processedProducts,
      optionGroups: relevantOptionGroups
    };


    const menuJsonString = JSON.stringify(publicMenuData, null, 2);
    const menuBytes = new TextEncoder().encode(menuJsonString);
    filesToPublish.push({
      path: 'data/menu.json',
      buffer: menuBytes,
      encoding: 'utf-8',
      contentString: menuJsonString
    });

    // 4. Conectar con GitHub API (Método Git Database API de El Patio)
    const ghHeaders = {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'El-Kaku-Cloud-Publisher/1.0',
      'Content-Type': 'application/json'
    };

    // 4a. Obtener commit actual de la rama gh-pages
    const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, {
      headers: ghHeaders
    });

    if (!refRes.ok) {
      throw new Error(`Error consultando rama ${branch} en GitHub (HTTP ${refRes.status}).`);
    }

    const refData = await refRes.json();
    const parentCommitSha = refData.object.sha;

    // 4b. Obtener árbol base
    const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${parentCommitSha}`, {
      headers: ghHeaders
    });
    if (!commitRes.ok) throw new Error('Error al consultar commit base.');
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 4c. Consultar árbol previo para caché de blobs existentes
    const existingBlobMap = new Map<string, string>();
    try {
      const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees/${baseTreeSha}?recursive=1`, {
        headers: ghHeaders
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
    } catch {
      // Ignorar si falla lectura previa
    }

    // 4d. Separar archivos sin cambios vs archivos a subir
    const treeItems = [];
    const filesToUpload = [];

    for (const file of filesToPublish) {
      const gitBlobSha = await calculateGitBlobSha(file.buffer);
      const existingSha = existingBlobMap.get(file.path);

      if (existingSha && existingSha === gitBlobSha) {
        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: existingSha
        });
      } else {
        filesToUpload.push(file);
      }
    }

    // 4e. Subir blobs de archivos modificados
    for (const file of filesToUpload) {
      const blobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({
          content: file.contentString,
          encoding: file.encoding
        })
      });

      if (!blobRes.ok) {
        throw new Error(`Error al subir ${file.path} a GitHub (HTTP ${blobRes.status}).`);
      }

      const blobData = await blobRes.json();
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      });
    }

    // 4f. Ordenar entradas del árbol por ruta
    treeItems.sort((a, b) => a.path.localeCompare(b.path));

    // 4g. Crear nuevo Árbol Git preservando base_tree (index.html, admin.html, assets, .nojekyll)
    const newTreeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems
      })
    });

    if (!newTreeRes.ok) throw new Error('Error al generar árbol Git.');
    const newTreeData = await newTreeRes.json();

    // 4h. Crear Commit atómico
    const newCommitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({
        message: `Publicar Carta Digital desde Móvil — ${new Date().toLocaleString('es-AR')}`,
        tree: newTreeData.sha,
        parents: [parentCommitSha]
      })
    });

    if (!newCommitRes.ok) throw new Error('Error al crear commit en GitHub.');
    const newCommitData = await newCommitRes.json();

    // 4i. Actualizar referencia de la rama gh-pages
    const updateRefRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: ghHeaders,
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: true
      })
    });

    if (!updateRefRes.ok) throw new Error('Error al actualizar rama gh-pages.');

    return new Response(
      JSON.stringify({
        success: true,
        commitSha: newCommitData.sha,
        filesCount: treeItems.length,
        uploadedCount: filesToUpload.length,
        repo,
        branch,
        publicUrl,
        message: `Carta Digital publicada con éxito en GitHub Pages (${publicUrl})`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Error durante la publicación remota.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
