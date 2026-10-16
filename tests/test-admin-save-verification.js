import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ryynkvtvodiaaelkdyab.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YGHVzWjmJmUWdxCvcBmA1w_p3StHy_T';

// Client 1 (Simulates Device 1: e.g. Phone Admin)
const supabaseDevice1 = createClient(SUPABASE_URL, SUPABASE_KEY);

// Client 2 (Simulates Device 2: e.g. PC Admin or Public Menu)
const supabaseDevice2 = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTests() {
  console.log('====================================================');
  console.log('PRUEBAS OBLIGATORIAS: GUARDADO EN ADMIN Y SUPABASE');
  console.log('====================================================\n');

  // 1. Fetch products from Supabase
  const { data: initialProducts, error: initErr } = await supabaseDevice1
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });

  assert.ok(!initErr, `Error al obtener productos iniciales: ${initErr?.message}`);
  assert.ok(initialProducts && initialProducts.length > 0, 'Debe haber productos en Supabase');

  const testProduct = initialProducts[0];
  const originalPrice = Number(testProduct.base_price);
  const originalDescription = testProduct.description || '';
  const newPrice = originalPrice + 500;
  const newDescription = (originalDescription ? originalDescription + ' ' : '') + '[TEST DESCRIPCIÓN PERSISTIDA]';

  console.log(`Producto de prueba: "${testProduct.name}" (ID: ${testProduct.id})`);
  console.log(`Precio original: $${originalPrice}`);
  console.log(`Descripción original: "${originalDescription}"\n`);

  // ----------------------------------------------------
  // PRUEBA 1: Editar precio y guardar
  // ----------------------------------------------------
  console.log('--- PRUEBA 1: Editar el precio de un producto y guardar en Supabase ---');
  const payloadPrice = {
    id: testProduct.id,
    name: testProduct.name,
    description: testProduct.description,
    base_price: newPrice,
    category_id: testProduct.category_id,
    images: testProduct.images || [],
    option_group_ids: testProduct.option_group_ids || [],
    is_available: testProduct.is_available,
    sort_order: testProduct.sort_order,
    updated_at: new Date().toISOString()
  };

  const { error: savePriceErr } = await supabaseDevice1
    .from('products')
    .upsert([payloadPrice], { onConflict: 'id' });

  assert.ok(!savePriceErr, `Fallo al guardar nuevo precio: ${savePriceErr?.message}`);
  console.log(`✔ Precio actualizado a $${newPrice} en Supabase correctamente.\n`);

  // ----------------------------------------------------
  // PRUEBA 2: Recargar panel y verificar persistencia
  // ----------------------------------------------------
  console.log('--- PRUEBA 2: Recargar y verificar que el precio siga actualizado ---');
  const { data: reloadedProducts, error: reloadErr } = await supabaseDevice1
    .from('products')
    .select('*')
    .eq('id', testProduct.id)
    .single();

  assert.ok(!reloadErr, `Error al recargar producto: ${reloadErr?.message}`);
  assert.equal(Number(reloadedProducts.base_price), newPrice, 'El precio debe mantenerse actualizado');
  console.log(`✔ Panel recargado: precio verificado = $${reloadedProducts.base_price}\n`);

  // ----------------------------------------------------
  // PRUEBA 3: Sincronización entre dispositivos (Dispositivo 2)
  // ----------------------------------------------------
  console.log('--- PRUEBA 3: Consultar los datos desde otro dispositivo o sesión ---');
  const { data: device2Product, error: dev2Err } = await supabaseDevice2
    .from('products')
    .select('*')
    .eq('id', testProduct.id)
    .single();

  assert.ok(!dev2Err, `Error al consultar desde segundo dispositivo: ${dev2Err?.message}`);
  assert.equal(Number(device2Product.base_price), newPrice, 'El segundo dispositivo debe recibir el nuevo precio');
  console.log(`✔ Segundo dispositivo (sesión independiente) leyó el nuevo precio: $${device2Product.base_price}\n`);

  // ----------------------------------------------------
  // PRUEBA 4: Editar descripción y verificar persistencia
  // ----------------------------------------------------
  console.log('--- PRUEBA 4: Editar una descripción y verificar persistencia ---');
  const payloadDesc = {
    ...payloadPrice,
    description: newDescription,
    updated_at: new Date().toISOString()
  };

  const { error: saveDescErr } = await supabaseDevice1
    .from('products')
    .upsert([payloadDesc], { onConflict: 'id' });

  assert.ok(!saveDescErr, `Fallo al guardar nueva descripción: ${saveDescErr?.message}`);

  // Verificar desde el segundo dispositivo
  const { data: dev2ProductWithDesc } = await supabaseDevice2
    .from('products')
    .select('*')
    .eq('id', testProduct.id)
    .single();

  assert.equal(dev2ProductWithDesc.description, newDescription, 'La descripción debe persistir');
  console.log(`✔ Descripción persistida correctamente: "${dev2ProductWithDesc.description}"\n`);

  // ----------------------------------------------------
  // PRUEBA 5: Probar fallo de guardado y confirmar error real
  // ----------------------------------------------------
  console.log('--- PRUEBA 5: Probar un fallo de guardado y confirmar que se muestre el error sin falso éxito ---');
  // Intentamos guardar con categoría inexistente o columna inválida
  const invalidPayload = {
    id: 'prod_invalid_test',
    name: 'Producto Invalido',
    category_id: 'categoria_totalmente_inexistente_12345',
    base_price: 1000,
    main_image_index: 999 // columna no permitida
  };

  const { error: expectedFailure } = await supabaseDevice1
    .from('products')
    .upsert([invalidPayload], { onConflict: 'id' });

  assert.ok(expectedFailure !== null, 'Supabase DEBE devolver un error ante datos inválidos');
  console.log(`✔ Fallo capturado correctamente: [${expectedFailure.code}] ${expectedFailure.message}`);
  console.log('✔ El sistema detecta el error y no emite falsos éxitos.\n');

  // ----------------------------------------------------
  // PRUEBA 6: Restaurar valores originales y verificar demás funciones
  // ----------------------------------------------------
  console.log('--- PRUEBA 6: Restaurar datos originales y verificar funciones de la carta ---');
  const restorePayload = {
    ...payloadPrice,
    base_price: originalPrice,
    description: originalDescription,
    updated_at: new Date().toISOString()
  };

  const { error: restoreErr } = await supabaseDevice1
    .from('products')
    .upsert([restorePayload], { onConflict: 'id' });

  assert.ok(!restoreErr, `Fallo al restaurar valores: ${restoreErr?.message}`);

  const { data: finalCheck } = await supabaseDevice2
    .from('products')
    .select('*')
    .eq('id', testProduct.id)
    .single();

  assert.equal(Number(finalCheck.base_price), originalPrice);
  assert.equal(finalCheck.description, originalDescription);
  console.log(`✔ Producto restaurado a precio $${finalCheck.base_price} y descripción original.`);

  // Verificar disponibilidad activa en productos
  const { data: availableProds } = await supabaseDevice2
    .from('products')
    .select('*')
    .eq('is_available', true);
  assert.ok(availableProds.length > 0, 'La carta debe tener productos disponibles');
  console.log(`✔ Carta pública activa: ${availableProds.length} productos disponibles.`);

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS 6 PRUEBAS OBLIGATORIAS PASARON CON ÉXITO');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
