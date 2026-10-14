import type { Category, Product, OptionGroup, BusinessSettings } from '../types';

export interface MobilePublishParams {
  token: string;
  repo: string;
  branch: string;
  business: BusinessSettings;
  categories: Category[];
  products: Product[];
  optionGroups: OptionGroup[];
}

export interface MobilePublishResult {
  success: boolean;
  message?: string;
  error?: string;
  commitSha?: string;
  filesCount?: number;
  publicUrl?: string;
}

/**
 * Prepares the clean, public-only menu data payload (ZERO private data).
 */
export function buildPublicMenuJson(
  business: BusinessSettings,
  categories: Category[],
  products: Product[],
  optionGroups: OptionGroup[]
) {
  const activeCategories = categories.filter(c => c.isActive);
  const activeCategoryIds = new Set(activeCategories.map(c => c.id));

  const activeProducts = products.filter(p => p.isAvailable && activeCategoryIds.has(p.categoryId));
  const activeOptionGroupIds = new Set(activeProducts.flatMap(p => p.optionGroupIds || []));
  const relevantOptionGroups = optionGroups.filter(og => og.isActive && activeOptionGroupIds.has(og.id));

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    business: {
      name: business?.businessName || 'El Kaku',
      menuTitle: business?.menuTitle || 'Carta Digital El Kaku',
      whatsappNumber: business?.whatsappNumber || '+54 9 3821 40-6662',
      currencySymbol: business?.currencySymbol || '$',
      deliveryEnabled: business?.deliveryEnabled ?? true,
      pickupEnabled: business?.pickupEnabled ?? true,
      deliveryFeeMode: business?.deliveryFeeMode || 'free',
      deliveryFee: business?.deliveryFeeMode === 'paid' ? (Number(business?.deliveryFee) || 0) : 0,
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
    categories: activeCategories,
    products: activeProducts,
    optionGroups: relevantOptionGroups
  };
}

/**
 * Publishes menu.json directly from the mobile browser to GitHub REST API.
 * Uses volatile in-memory authorization. The token is NEVER saved to IndexedDB or localStorage.
 */
export async function publishDirectFromMobile(params: MobilePublishParams): Promise<MobilePublishResult> {
  const { token, repo, branch, business, categories, products, optionGroups } = params;

  if (!token || !token.trim()) {
    return {
      success: false,
      error: 'Ingresá tu Token de GitHub para autorizar la publicación.'
    };
  }

  const cleanToken = token.trim();
  const cleanRepo = repo.trim() || 'curiok/el-kaku-carta';
  const cleanBranch = branch.trim() || 'gh-pages';

  try {
    // 1. Build public menu JSON
    const publicData = buildPublicMenuJson(business, categories, products, optionGroups);
    const jsonString = JSON.stringify(publicData, null, 2);

    // Convert string to UTF-8 Base64 safely in browser
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    const headers = {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    // 2. Check if data/menu.json already exists to obtain its current SHA
    let existingSha: string | undefined;
    const checkRes = await fetch(
      `https://api.github.com/repos/${cleanRepo}/contents/data/menu.json?ref=${cleanBranch}`,
      { headers }
    );

    if (checkRes.status === 401) {
      return {
        success: false,
        error: 'Token de GitHub no válido o expirado. Verificá que el token sea correcto.'
      };
    }

    if (checkRes.status === 403) {
      return {
        success: false,
        error: 'Permiso denegado en GitHub. Verificá que el token tenga permiso "Contents: Read and write" para el repositorio.'
      };
    }

    if (checkRes.status === 404) {
      // File doesn't exist yet, will create new
      existingSha = undefined;
    } else if (checkRes.ok) {
      const checkData = await checkRes.json();
      existingSha = checkData.sha;
    }

    // 3. Commit/update data/menu.json via GitHub Contents API
    const commitPayload: any = {
      message: `Actualización de Carta El Kaku desde Celular - ${new Date().toLocaleString('es-AR')}`,
      content: base64Content,
      branch: cleanBranch
    };

    if (existingSha) {
      commitPayload.sha = existingSha;
    }

    const putRes = await fetch(
      `https://api.github.com/repos/${cleanRepo}/contents/data/menu.json`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(commitPayload)
      }
    );

    if (!putRes.ok) {
      const errorData = await putRes.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Error en GitHub al guardar cambios (HTTP ${putRes.status}).`
      };
    }

    const putData = await putRes.json();
    const commitSha = putData.commit?.sha || putData.content?.sha;
    const publicUrl = `https://${cleanRepo.split('/')[0]}.github.io/${cleanRepo.split('/')[1]}/`;

    return {
      success: true,
      message: '¡Carta Digital actualizada y publicada directamente desde tu celular!',
      commitSha,
      filesCount: 1,
      publicUrl
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error de conexión con la API de GitHub. Verificá tu acceso a internet.'
    };
  }
}

/**
 * Returns the direct URL for editing data/menu.json in GitHub Mobile Web (100% Token-Free).
 */
export function getZeroTokenGitHubEditUrl(repo = 'curiok/el-kaku-carta', branch = 'gh-pages'): string {
  return `https://github.com/${repo}/edit/${branch}/data/menu.json`;
}
