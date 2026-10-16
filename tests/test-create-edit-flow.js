import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ryynkvtvodiaaelkdyab.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YGHVzWjmJmUWdxCvcBmA1w_p3StHy_T';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runCreateEditFlowTests() {
  console.log('========================================================');
  console.log('PRUEBAS COMPLETAS: FLUJO REAL DE CREACIÓN Y EDICIÓN');
  console.log('========================================================\n');

  // 1. Obtener una categoría válida de Supabase
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .limit(1);

  assert.ok(!catErr && categories && categories.length > 0, 'Debe haber categorías en Supabase');
  const validCategoryId = categories[0].id;
  console.log(`[Paso 1] Categoría asignada para la prueba: ${categories[0].name} (${validCategoryId})`);

  // 2. CREAR PRODUCTO NUEVO (Simulando lo que envía ProductsPage y saveProduct)
  const testProductId = 'prod_test_flow_' + Date.now();
  const newProductPayload = {
    id: testProductId,
    name: 'Hamburguesa de Prueba Automatizada',
    description: 'Carne jugosa, queso derretido y salsa especial',
    base_price: 8500,
    category_id: validCategoryId,
    images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600'],
    option_group_ids: [],
    is_available: true,
    sort_order: 99,
    updated_at: new Date().toISOString()
  };

  console.log(`[Paso 2] Insertando nuevo producto "${newProductPayload.name}" en Supabase...`);
  const { error: insertErr } = await supabase
    .from('products')
    .upsert([newProductPayload], { onConflict: 'id' });

  assert.ok(!insertErr, `Error al crear producto: ${insertErr?.message}`);
  console.log('✔ Producto creado con éxito en Supabase.');

  // 3. VERIFICAR QUE EXISTE EN SUPABASE (Simulando recarga del panel)
  console.log('[Paso 3] Consultando producto desde Supabase para verificar existencia...');
  const { data: fetchedCreated, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', testProductId)
    .single();

  assert.ok(!fetchErr, `Error al obtener producto creado: ${fetchErr?.message}`);
  assert.equal(fetchedCreated.name, newProductPayload.name);
  assert.equal(Number(fetchedCreated.base_price), 8500);
  assert.equal(fetchedCreated.category_id, validCategoryId);
  assert.equal(fetchedCreated.is_available, true);
  console.log(`✔ Verificado en Supabase: "${fetchedCreated.name}" - Precio: $${fetchedCreated.base_price}`);

  // 4. EDITAR PRODUCTO (Modificar descripción y precio)
  console.log('[Paso 4] Modificando precio a $9200 y descripción...');
  const editedPayload = {
    ...newProductPayload,
    name: 'Hamburguesa de Prueba EDITADA',
    description: 'Descripción modificada con doble cheddar y panceta crocante',
    base_price: 9200,
    updated_at: new Date().toISOString()
  };

  const { error: editErr } = await supabase
    .from('products')
    .upsert([editedPayload], { onConflict: 'id' });

  assert.ok(!editErr, `Error al editar producto: ${editErr?.message}`);
  console.log('✔ Cambios guardados correctamente en Supabase.');

  // 5. VERIFICAR QUE LOS CAMBIOS PERSISTEN (Simulando recarga y lectura desde otro dispositivo)
  console.log('[Paso 5] Verificando persistencia de los cambios...');
  const { data: fetchedEdited, error: fetchEditedErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', testProductId)
    .single();

  assert.ok(!fetchEditedErr, `Error al verificar cambios: ${fetchEditedErr?.message}`);
  assert.equal(fetchedEdited.name, 'Hamburguesa de Prueba EDITADA');
  assert.equal(Number(fetchedEdited.base_price), 9200);
  assert.equal(fetchedEdited.description, 'Descripción modificada con doble cheddar y panceta crocante');
  console.log(`✔ Persistencia confirmada: "${fetchedEdited.name}" - Precio: $${fetchedEdited.base_price}`);

  // 6. PROBAR PAUSA Y REACTIVACIÓN (Disponibilidad en la carta pública)
  console.log('[Paso 6] Pausando producto y verificando exclusión en la carta pública...');
  await supabase
    .from('products')
    .update({ is_available: false, updated_at: new Date().toISOString() })
    .eq('id', testProductId);

  const { data: publicAfterPause } = await supabase
    .from('products')
    .select('id')
    .eq('is_available', true)
    .eq('id', testProductId);

  assert.equal(publicAfterPause.length, 0, 'El producto pausado no debe aparecer en la carta pública');
  console.log('✔ Producto pausado correctamente (oculto en carta pública).');

  // 7. LIMPIAR PRODUCTO DE PRUEBA
  console.log('[Paso 7] Eliminando producto de prueba de Supabase...');
  const { error: delErr } = await supabase
    .from('products')
    .delete()
    .eq('id', testProductId);

  assert.ok(!delErr, `Error al eliminar producto de prueba: ${delErr?.message}`);
  console.log('✔ Base de datos limpia: producto de prueba eliminado.');

  console.log('\n========================================================');
  console.log('🎉 FLUJO DE CREACIÓN Y EDICIÓN VERIFICADO AL 100%');
  console.log('========================================================');
}

runCreateEditFlowTests().catch(err => {
  console.error('❌ Error en el flujo:', err);
  process.exit(1);
});
