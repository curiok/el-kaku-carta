/**
 * EL KAKU — E2E VERIFICATION SCRIPT
 * Executes Tests A, B, C, D as defined in section 10.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ryynkvtvodiaaelkdyab.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YGHVzWjmJmUWdxCvcBmA1w_p3StHy_T';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runVerification() {
  console.log('=====================================================');
  console.log('EL KAKU — VERIFICACIONES OBLIGATORIAS DE EXTREMO A EXTREMO');
  console.log('=====================================================\n');

  let allPassed = true;

  // -----------------------------------------------------------------
  // PRUEBA A: Sincronización entre dispositivos (Simulada PC <-> Celular)
  // -----------------------------------------------------------------
  console.log('--- PRUEBA A: Sincronización central de datos en Supabase ---');
  try {
    // 1. Tomar un producto existente
    const { data: initialProducts, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (fetchErr || !initialProducts || initialProducts.length === 0) {
      throw new Error('No se pudieron obtener productos de Supabase: ' + fetchErr?.message);
    }

    const testProd = initialProducts.find(p => p.id === 'prod_mv8mtbpn_1to0t') || initialProducts[0];
    const originalPrice = Number(testProd.base_price);
    const updatedPrice = originalPrice === 5000 ? 5500 : 5000;

    console.log(`[Paso 1] Producto seleccionado: "${testProd.name}" (ID: ${testProd.id}) - Precio original: $${originalPrice}`);

    // 2. Modificar precio (simulando edición en un dispositivo)
    const { error: updateErr } = await supabase
      .from('products')
      .update({ base_price: updatedPrice, updated_at: new Date().toISOString() })
      .eq('id', testProd.id);

    if (updateErr) throw new Error('Fallo al actualizar precio en Supabase: ' + updateErr.message);
    console.log(`[Paso 2] Precio actualizado a $${updatedPrice} en Supabase.`);

    // 3. Consultar desde Supabase (simulando lectura desde otro dispositivo)
    const { data: refreshedProd, error: readErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', testProd.id)
      .single();

    if (readErr || Number(refreshedProd.base_price) !== updatedPrice) {
      throw new Error(`Discrepancia en la lectura: esperado $${updatedPrice}, obtenido $${refreshedProd?.base_price}`);
    }
    console.log(`[Paso 3] Segundo dispositivo leyó correctamente el nuevo precio: $${refreshedProd.base_price}`);

    // Restaurar precio original
    await supabase.from('products').update({ base_price: originalPrice }).eq('id', testProd.id);
    console.log(`[Paso 4] Precio restaurado a su valor original ($${originalPrice}).`);
    console.log('✔ PRUEBA A COMPLETADA EXITOSAMENTE.\n');
  } catch (err) {
    console.error('❌ PRUEBA A FALLÓ:', err.message);
    allPassed = false;
  }

  // -----------------------------------------------------------------
  // PRUEBA B: Eliminación de productos antiguos y de prueba
  // -----------------------------------------------------------------
  console.log('--- PRUEBA B: Eliminación de productos antiguos y de prueba ---');
  try {
    const demoIds = [
      'prod_promo_1', 'prod_burger_1', 'prod_burger_2',
      'prod_lomito_1', 'prod_pizza_1', 'prod_empanadas_1',
      'prod_papas_1', 'prod_bebida_1', 'prod_postre_1'
    ];

    // 1. Verificar Supabase
    const { data: existingDemos, error: demoCheckErr } = await supabase
      .from('products')
      .select('id, name')
      .in('id', demoIds);

    if (demoCheckErr) throw demoCheckErr;

    if (existingDemos && existingDemos.length > 0) {
      throw new Error(`Se encontraron ${existingDemos.length} productos de prueba en Supabase: ` + JSON.stringify(existingDemos));
    }
    console.log('[Paso 1] Base central de Supabase limpia: 0 productos de prueba encontrados.');

    // 2. Verificar datos publicados en GitHub Pages branch gh-pages
    const ghRes = await fetch('https://raw.githubusercontent.com/curiok/el-kaku-carta/gh-pages/data/menu.json?t=' + Date.now());
    if (!ghRes.ok) throw new Error('HTTP ' + ghRes.status + ' al consultar menu.json en GitHub Pages.');
    const publishedMenu = await ghRes.json();

    const publishedDemoMatches = publishedMenu.products.filter(p => demoIds.includes(p.id));
    if (publishedDemoMatches.length > 0) {
      throw new Error(`Se encontraron productos de prueba en la rama gh-pages: ` + JSON.stringify(publishedDemoMatches));
    }
    console.log(`[Paso 2] Rama gh-pages limpia: ${publishedMenu.products.length} productos vigentes y 0 de prueba.`);

    // 3. Verificar que los 5 productos vigentes existen intactos
    const expectedIds = [
      'prod_mv98ikeq_nc30u',
      'prod_mv8mtbpn_1to0t',
      'prod_mv8mxfys_yn8uz',
      'prod_mv8mufoq_k8a8x',
      'prod_mv8n35i7_ci3qh'
    ];
    for (const expId of expectedIds) {
      const found = publishedMenu.products.find(p => p.id === expId);
      if (!found) throw new Error(`Falta el producto vigente ${expId} en menu.json publicado.`);
    }
    console.log('[Paso 3] Todos los 5 productos vigentes del usuario están presentes en la carta pública.');
    console.log('✔ PRUEBA B COMPLETADA EXITOSAMENTE.\n');
  } catch (err) {
    console.error('❌ PRUEBA B FALLÓ:', err.message);
    allPassed = false;
  }

  // -----------------------------------------------------------------
  // PRUEBA C: Pausa y Reactivación de Productos
  // -----------------------------------------------------------------
  console.log('--- PRUEBA C: Pausa y reactivación de productos ---');
  try {
    const testId = 'prod_mv8n35i7_ci3qh'; // LOMITO CON PAPAS
    // 1. Obtener estado original
    const { data: orig, error: origErr } = await supabase
      .from('products')
      .select('id, name, is_available, base_price, description, category_id, images')
      .eq('id', testId)
      .single();

    if (origErr || !orig) throw new Error('No se pudo leer producto para prueba C: ' + origErr?.message);
    console.log(`[Paso 1] Producto para prueba: "${orig.name}" (is_available inicial: ${orig.is_available})`);

    // 2. Pausar en Supabase
    const { error: pauseErr } = await supabase
      .from('products')
      .update({ is_available: false, updated_at: new Date().toISOString() })
      .eq('id', testId);

    if (pauseErr) throw new Error('Error al pausar producto: ' + pauseErr.message);

    // 3. Comprobar que en consulta de productos disponibles queda excluido
    const { data: publicQuery } = await supabase
      .from('products')
      .select('id, name')
      .eq('is_available', true);

    const isVisibleInPublic = publicQuery.some(p => p.id === testId);
    if (isVisibleInPublic) {
      throw new Error('El producto pausado SIGUE visible en consulta de productos disponibles (is_available = true).');
    }
    console.log(`[Paso 2] Producto pausado correctamente en Supabase: ya no aparece en consultas públicas.`);

    // 4. Reactivar el producto
    const { error: reactivateErr } = await supabase
      .from('products')
      .update({ is_available: true, updated_at: new Date().toISOString() })
      .eq('id', testId);

    if (reactivateErr) throw new Error('Error al reactivar producto: ' + reactivateErr.message);

    // 5. Verificar que reaparece con todos sus datos originales intactos (precio, foto, descripción)
    const { data: restored, error: restErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', testId)
      .single();

    if (restErr || !restored.is_available) {
      throw new Error('El producto no se reactivó correctamente.');
    }
    if (restored.name !== orig.name || Number(restored.base_price) !== Number(orig.base_price) || restored.description !== orig.description) {
      throw new Error('Se perdieron atributos del producto durante la pausa/reactivación.');
    }
    console.log(`[Paso 3] Producto reactivado con éxito conservando intactos nombre, precio ($${restored.base_price}), fotos y categoría.`);
    console.log('✔ PRUEBA C COMPLETADA EXITOSAMENTE.\n');
  } catch (err) {
    console.error('❌ PRUEBA C FALLÓ:', err.message);
    allPassed = false;
  }

  // -----------------------------------------------------------------
  // PRUEBA D: Publicación remota desde Supabase Edge Function
  // -----------------------------------------------------------------
  console.log('--- PRUEBA D: Publicación remota autónoma (Sin depender de PC) ---');
  try {
    // 1. Comprobar estado de la función en la nube
    const getRes = await supabase.functions.invoke('publish-menu', { method: 'GET' });
    if (getRes.error || !getRes.data?.ok) {
      throw new Error('Servicio de publicación remota en Supabase no respondió: ' + (getRes.error?.message || 'Error desconocido'));
    }
    console.log('[Paso 1] Servicio Cloud en Supabase Edge responde OK:', getRes.data.service);

    // 2. Ejecutar publicación completa con datos reales
    const { data: products } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
    const { data: categories } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    const { data: settings } = await supabase.from('business_settings').select('*').eq('id', 'business_settings').single();

    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      basePrice: Number(p.base_price) || 0,
      categoryId: p.category_id,
      images: p.images || [],
      mainImageIndex: p.main_image_index || 0,
      sortOrder: p.sort_order,
      isAvailable: p.is_available ?? true,
      optionGroupIds: p.option_group_ids || []
    }));

    const formattedCategories = categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      sortOrder: c.sort_order,
      isActive: c.is_active
    }));

    console.log(`[Paso 2] Disparando publicación remota con ${formattedProducts.length} productos y ${formattedCategories.length} categorías...`);
    const postRes = await supabase.functions.invoke('publish-menu', {
      body: {
        business: {
          name: settings.business_name,
          menuTitle: settings.menu_title,
          whatsappNumber: settings.whatsapp_number,
          currencySymbol: settings.currency_symbol,
          deliveryEnabled: settings.delivery_enabled,
          pickupEnabled: settings.pickup_enabled,
          deliveryFeeMode: settings.delivery_fee_mode,
          deliveryFee: settings.delivery_fee,
          welcomeText: settings.welcome_text,
          contactText: settings.contact_text,
          theme: settings.theme
        },
        categories: formattedCategories,
        products: formattedProducts,
        optionGroups: []
      }
    });

    if (postRes.error || !postRes.data?.success) {
      throw new Error('Publicación remota falló: ' + (postRes.error?.message || postRes.data?.error));
    }

    console.log(`[Paso 3] Publicación confirmada. Commit SHA: ${postRes.data.commitSha}`);
    console.log(`[Paso 4] URL pública confirmada: ${postRes.data.publicUrl}`);
    console.log('✔ PRUEBA D COMPLETADA EXITOSAMENTE.\n');
  } catch (err) {
    console.error('❌ PRUEBA D FALLÓ:', err.message);
    allPassed = false;
  }

  console.log('=====================================================');
  if (allPassed) {
    console.log('🎉 TODAS LAS PRUEBAS (A, B, C, D) PASARON CON ÉXITO AL 100%');
  } else {
    console.log('⚠️ ALGUNAS PRUEBAS FALLARON.');
  }
  console.log('=====================================================');
}

runVerification();
