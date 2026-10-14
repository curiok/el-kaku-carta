import { buildStaticMenuBundle } from './builder.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Generando paquete estático unificado para GitHub Pages...');

  // Read default public data from public-menu/public/data/menu.json
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
      const raw = fs.readFileSync(defaultMenuPath, 'utf-8');
      payload = JSON.parse(raw);
    } catch (err) {
      console.warn('Error leyendo menu.json por defecto:', err);
    }
  }

  const result = await buildStaticMenuBundle(payload);
  console.log(`✓ Paquete estático generado con éxito en ${result.localExportPath}`);
  console.log(`✓ Total de archivos preparados: ${result.files.length}`);
}

main().catch(console.error);
