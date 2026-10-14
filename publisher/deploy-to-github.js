import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildStaticMenuBundle } from './builder.js';
import { commitFilesToGitHub } from './github.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploy() {
  console.log('Iniciando despliegue de corrección PWA a GitHub Pages...');

  const envPath = path.resolve(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)[1].trim();
  const repo = 'curiok/el-kaku-carta';
  const branch = 'gh-pages';

  const defaultMenuPath = path.resolve(__dirname, '../public-menu/public/data/menu.json');
  let payload = {
    business: {
      name: 'El Kaku',
      menuTitle: 'Carta Digital El Kaku',
      whatsappNumber: '+54 9 3821 40-6662',
      currencySymbol: '$',
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFeeMode: 'free',
      deliveryFee: 0,
      welcomeText: '¡Bienvenidos a El Kaku! Sabores únicos, hamburguesas gourmet, lomitos y pizzas a la piedra.',
      contactText: 'San Martín 450 • Envíos a domicilio y retiro en mostrador'
    },
    categories: [],
    products: [],
    optionGroups: []
  };

  if (fs.existsSync(defaultMenuPath)) {
    try {
      payload = JSON.parse(fs.readFileSync(defaultMenuPath, 'utf-8'));
    } catch (err) {
      console.warn('Error leyendo menu.json:', err);
    }
  }

  const bundle = await buildStaticMenuBundle(payload);
  console.log(`Bundle generado con ${bundle.files.length} archivos.`);

  const result = await commitFilesToGitHub({
    token,
    repo,
    branch,
    files: bundle.files,
    commitMessage: 'Fix PWA iOS Admin Isolation: manifests, apple-touch-icons, sw-v4'
  });

  console.log('✓ Despliegue completado con éxito!');
  console.log('✓ Commit SHA:', result.commitSha);
  console.log('✓ Archivos subidos:', result.filesCount);
}

deploy().catch(err => {
  console.error('Error durante el despliegue:', err);
  process.exit(1);
});
