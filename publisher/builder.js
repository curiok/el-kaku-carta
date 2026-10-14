import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Builds the static public distribution bundle for GitHub Pages
 */
export async function buildStaticMenuBundle(publicPayload) {
  const {
    business,
    categories = [],
    products = [],
    optionGroups = []
  } = publicPayload;

  const filesMap = new Map(); // path -> { path, content, encoding }

  // 1. Filter only active categories and active products
  const activeCategories = categories.filter(c => c.isActive);
  const activeCategoryIds = new Set(activeCategories.map(c => c.id));

  const activeProducts = products.filter(p => p.isAvailable && activeCategoryIds.has(p.categoryId));
  const activeOptionGroupIds = new Set(activeProducts.flatMap(p => p.optionGroupIds || []));
  const relevantOptionGroups = optionGroups.filter(og => og.isActive && activeOptionGroupIds.has(og.id));

  // 2. Process product images and extract base64 data URLs into separate files
  const processedProducts = [];

  for (const product of activeProducts) {
    const processedImages = [];
    const images = Array.isArray(product.images) ? product.images : [];

    for (let idx = 0; idx < images.length; idx++) {
      const img = images[idx];
      if (typeof img === 'string' && img.startsWith('data:image/')) {
        const matches = img.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1].includes('jpeg') ? 'jpg' : matches[1].includes('png') ? 'png' : 'webp';
          const fileName = `images/prod_${product.id}_${idx}.${ext}`;
          filesMap.set(fileName, {
            path: fileName,
            content: matches[2],
            encoding: 'base64'
          });
          processedImages.push(`./${fileName}`);
          continue;
        }
      }
      // If SVG or existing URL, keep as is
      processedImages.push(img);
    }

    processedProducts.push({
      ...product,
      images: processedImages
    });
  }

  // 3. Construct clean public menu.json (ZERO private data)
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
    categories: activeCategories,
    products: processedProducts,
    optionGroups: relevantOptionGroups
  };

  const menuJsonContent = JSON.stringify(publicMenuData, null, 2);
  filesMap.set('data/menu.json', {
    path: 'data/menu.json',
    content: menuJsonContent,
    encoding: 'utf-8'
  });

  // 4. Ensure .nojekyll is present for GitHub Pages
  filesMap.set('.nojekyll', {
    path: '.nojekyll',
    content: '',
    encoding: 'utf-8'
  });

  // 5. Read the compiled public-menu build from public-menu/dist if available
  const publicMenuDistDir = path.resolve(__dirname, '../public-menu/dist');
  try {
    const distFiles = await readDirRecursive(publicMenuDistDir);
    for (const file of distFiles) {
      if (file.relPath === 'data/menu.json') continue;

      const fileBuffer = await fs.readFile(file.fullPath);
      const isBinary = isBinaryFile(file.relPath);

      filesMap.set(file.relPath, {
        path: file.relPath,
        content: isBinary ? fileBuffer.toString('base64') : fileBuffer.toString('utf-8'),
        encoding: isBinary ? 'base64' : 'utf-8'
      });
    }
  } catch (err) {
    console.warn('public-menu/dist not built yet.');
  }

  // 5b. Read the compiled admin build from admin/dist and include as admin.html
  const adminDistDir = path.resolve(__dirname, '../admin/dist');
  try {
    const adminFiles = await readDirRecursive(adminDistDir);
    for (const file of adminFiles) {
      if (file.relPath === 'manifest.webmanifest') continue;

      const fileBuffer = await fs.readFile(file.fullPath);
      const isBinary = isBinaryFile(file.relPath);
      // Map index.html to admin.html so it doesn't overwrite public index.html
      const targetPath = file.relPath === 'index.html' ? 'admin.html' : file.relPath;

      filesMap.set(targetPath, {
        path: targetPath,
        content: isBinary ? fileBuffer.toString('base64') : fileBuffer.toString('utf-8'),
        encoding: isBinary ? 'base64' : 'utf-8'
      });
    }
  } catch (err) {
    console.warn('admin/dist not built yet.');
  }

  // 6. Write to local export folder publisher/dist-public for local testing & backup
  const exportDir = path.resolve(__dirname, 'dist-public');
  await fs.rm(exportDir, { recursive: true, force: true });
  await fs.mkdir(exportDir, { recursive: true });

  const filesToUpload = Array.from(filesMap.values());
  for (const file of filesToUpload) {
    const dest = path.join(exportDir, file.path);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    if (file.encoding === 'base64') {
      await fs.writeFile(dest, Buffer.from(file.content, 'base64'));
    } else {
      await fs.writeFile(dest, file.content, 'utf-8');
    }
  }

  return {
    files: filesToUpload,
    publicMenuData,
    localExportPath: exportDir
  };
}

async function readDirRecursive(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results.push(...await readDirRecursive(fullPath, base));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'].includes(ext);
}
