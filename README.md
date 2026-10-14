# El Kaku — Carta Digital PWA (100% Celular / Mobile-First)

Sistema completo de Carta Digital PWA mobile-first para **El Kaku**.
Permite administrar, cargar productos, fotos con la cámara del celular, gestionar categorías, recibir pedidos y **publicar la carta digital en GitHub Pages directamente desde el celular, sin depender de una PC, terminal, CMD ni scripts locales**.

---

## 📱 Arquitectura 100% Móvil (Sin Dependencia de PC)

```
GitHub Pages (curiok.github.io/el-kaku-carta/)
├── index.html       -> Carta Digital Pública para clientes (100% estática, sin secretos)
├── admin.html       -> Panel Local de Administración Móvil (PWA instalable en el celular)
├── data/menu.json   -> Catálogo público activo
└── assets/          -> Estilos y scripts compilados
```

1. **Panel en el Celular (`admin.html`)**:
   - Abrís `https://curiok.github.io/el-kaku-carta/admin.html` en el navegador de tu celular.
   - Lo instalás como PWA en tu pantalla de inicio ("El Kaku Admin").
   - Funciona de forma 100% independiente en el almacenamiento interno de tu teléfono (**IndexedDB** / **Supabase**).
   - Tus productos, cambios de precios, fotos de la cámara y pedidos registrados se guardan en el celular y en Supabase.
   - Aunque un cliente abra `admin.html`, su base de datos local estará vacía; nunca ve tus datos privados.

2. **Carta Digital para Clientes (`index.html`)**:
   - Enlace oficial: `https://curiok.github.io/el-kaku-carta/`
   - Carga `./data/menu.json` o directamente desde Supabase en tiempo real.
   - Navegación rápida, fotos en Lightbox, armado de carrito, modalidades Delivery/Retiro y botón para enviar el pedido preparado a WhatsApp.
   - Funciona sin que tu celular esté encendido.

---

## 🚀 Publicación Directa desde el Celular (Sin PC)

Desde la pestaña **"Publicar"** de la PWA en tu celular tenés dos modalidades directas:

### Modalidad 1: Publicación Móvil Directa (1 Toque)
- **Cómo funciona**: La PWA se conecta directamente a la API de GitHub (`api.github.com/repos/curiok/el-kaku-carta/contents/data/menu.json`) usando `fetch()` con CORS desde el navegador del celular.
- **Seguridad**: Pegás tu Personal Access Token (Fine-grained PAT). El token permanece **únicamente en memoria RAM** durante la solicitud y **NUNCA se guarda en el celular** (ni en IndexedDB, localStorage, cookies ni variables del código).
- Al pulsar **PUBLICAR CARTA DIGITAL**, se actualiza inmediatamente el catálogo en GitHub Pages.

### Modalidad 2: Publicación 100% Sin Token (Vía Web Móvil de GitHub)
- Para quienes no deseen crear ni ingresar tokens en el celular:
- Tocás **COPIAR Y ABRIR GITHUB EN EL CELULAR**.
- El sistema copia al portapapeles el `menu.json` validado y abre directamente el editor web de GitHub en tu navegador móvil:
  `https://github.com/curiok/el-kaku-carta/edit/gh-pages/data/menu.json`
- Como ya tenés tu cuenta de GitHub abierta en el navegador del celular, pegás y tocás **"Commit changes"**.
- 100% gratuito, sin tokens, sin PC.

---

## 🔑 Cómo Crear tu Token de GitHub desde el Celular (Solo para Modalidad 1)

Podés crearlo en 1 minuto desde el propio navegador de tu teléfono:
1. Entrá a `github.com` con tu cuenta `curiok`.
2. Tocá tu foto de perfil → **Settings** → **Developer Settings** → **Personal Access Tokens** → **Fine-grained tokens**.
3. Tocá **Generate new token**.
4. En **Repository access**, seleccioná **Only select repositories** y elegí `curiok/el-kaku-carta`.
5. En **Permissions → Repository permissions**, buscá **Contents** y asignale **Access: Read and write**.
6. Tocá **Generate token** y copialo. Podés tenerlo en tu gestor de notas o contraseñas del celular y pegarlo al momento de publicar.

---

## 📲 Cómo Instalar la App en la Pantalla del Celular

### En Android (Chrome / Brave / Edge):
1. Abrí `https://curiok.github.io/el-kaku-carta/admin.html` (para el administrador) o `https://curiok.github.io/el-kaku-carta/` (para la carta).
2. Tocá los tres puntos (`⋮`) arriba a la derecha.
3. Seleccioná **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.

### En iPhone (Safari):
1. Abrí el enlace en Safari.
2. Tocá el botón de compartir (`↑`).
3. Elegí **"Agregar al inicio"**.

---

## 💬 WhatsApp Oficial y Pedidos

- **Número Configurado**: `+54 9 3821 40-6662` (normalizado como `5493821406662`).
- Al presionar **"Hacer Pedido por WhatsApp"**, el sistema genera el mensaje formateado con ID único, cantidades, adicionales con sus subtotales, costo de envío y total, abriendo la conversación oficial de WhatsApp y ofreciendo botón de respaldo para copiar el texto.

---

## 🧪 Pruebas Automatizadas

El proyecto incluye 11 pruebas unitarias y de integración ejecutables con Node:
```bash
npm run test
```
Verifica:
- Formato monetario argentino (`$ 14.500`)
- Generación de IDs únicos (`KAKU-XXXXXX`)
- Normalización internacional de WhatsApp y codificación URL
- Distinción de combinaciones personalizadas de productos en el carrito
- Generación del paquete público sin filtraciones de datos privados ni tokens
- Generación de enlaces y cargas móviles directas
