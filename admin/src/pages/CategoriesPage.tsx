import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  PauseCircle,
  X,
  FolderTree,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { getCategories, saveCategory, deleteCategory, getProducts, saveProduct } from '../db';
import { generateId } from '../utils/formatters';
import { useToast } from '../components/Toast';
import type { Category, Product } from '../types';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete Conflict Modal State
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [conflictProducts, setConflictProducts] = useState<Product[]>([]);
  const [reassignTargetCatId, setReassignTargetCatId] = useState<string>('');

  const { showSuccess, showError, showWarning } = useToast();

  const loadAll = async () => {
    try {
      const [cats, prods] = await Promise.all([getCategories(), getProducts()]);
      setCategories(cats);
      setProducts(prods);
    } catch (err: any) {
      showError(`Error al cargar categorías: ${err.message}`);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormIsActive(true);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormIsActive(cat.isActive);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const trimmedName = formName.trim();
    if (!trimmedName) {
      showWarning('El nombre de la categoría no puede estar vacío.');
      return;
    }

    // Duplicate check
    const isDuplicate = categories.some(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingCategory?.id
    );
    if (isDuplicate) {
      showWarning(`Ya existe una categoría llamada "${trimmedName}".`);
      return;
    }

    setIsSaving(true);

    const catToSave: Category = {
      ...editingCategory,
      id: editingCategory ? editingCategory.id : generateId('cat'),
      name: trimmedName,
      description: formDescription.trim(),
      sortOrder: editingCategory ? editingCategory.sortOrder : categories.length + 1,
      isActive: formIsActive
    };

    try {
      await saveCategory(catToSave);
      showSuccess(editingCategory ? 'Cambios guardados correctamente.' : 'Categoría creada con éxito.');
      setIsModalOpen(false);
      await loadAll();
    } catch (err: any) {
      showError(`Error al guardar categoría: ${err.message || 'Error de conexión con Supabase'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    const updated: Category = { ...cat, isActive: !cat.isActive };
    try {
      await saveCategory(updated);
      showSuccess(updated.isActive ? `"${cat.name}" activada.` : `"${cat.name}" desactivada.`);
      loadAll();
    } catch (err: any) {
      showError(`Error al cambiar estado: ${err.message}`);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= categories.length) return;

    const copy = [...categories];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;

    // Reassign sortOrder
    for (let i = 0; i < copy.length; i++) {
      copy[i].sortOrder = i + 1;
      await saveCategory(copy[i]);
    }

    setCategories(copy);
    showSuccess('Orden actualizado.');
  };

  const handleDeleteClick = (cat: Category) => {
    // Check if products exist for this category
    const assigned = products.filter(p => p.categoryId === cat.id);
    if (assigned.length > 0) {
      setCategoryToDelete(cat);
      setConflictProducts(assigned);
      const otherCats = categories.filter(c => c.id !== cat.id);
      setReassignTargetCatId(otherCats[0]?.id || '');
      setConflictModalOpen(true);
      return;
    }

    // Direct deletion with confirmation
    const confirm = window.confirm(`¿Seguro que deseás eliminar la categoría "${cat.name}"?`);
    if (!confirm) return;

    deleteCategory(cat.id).then(res => {
      if (res.success) {
        showSuccess(`Categoría "${cat.name}" eliminada.`);
        loadAll();
      } else {
        showError(res.reason || 'No se pudo eliminar la categoría.');
      }
    });
  };

  const handleReassignAndDelete = async () => {
    if (!categoryToDelete || !reassignTargetCatId) return;

    try {
      // Reassign all assigned products
      for (const prod of conflictProducts) {
        await saveProduct({
          ...prod,
          categoryId: reassignTargetCatId,
          updatedAt: new Date().toISOString()
        });
      }

      await deleteCategory(categoryToDelete.id);
      showSuccess(`Productos reasignados y categoría "${categoryToDelete.name}" eliminada.`);
      setConflictModalOpen(false);
      setCategoryToDelete(null);
      loadAll();
    } catch (err: any) {
      showError(`Error al reasignar: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Categorías</h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {categories.length} categorías registradas
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={16} /> Nueva Categoría
        </button>
      </div>

      {/* Categories List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {categories.map((cat, idx) => {
          const count = products.filter(p => p.categoryId === cat.id).length;
          return (
            <div
              key={cat.id}
              className="card"
              style={{
                margin: 0,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: cat.isActive ? 1 : 0.65,
                borderLeft: cat.isActive ? '3px solid var(--color-primary)' : '3px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                {/* Reorder Arrows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    disabled={idx === 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: idx === 0 ? 'rgba(255,255,255,0.2)' : 'var(--color-text)',
                      cursor: idx === 0 ? 'default' : 'pointer',
                      padding: '2px'
                    }}
                    onClick={() => handleMove(idx, 'up')}
                    title="Mover arriba"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    disabled={idx === categories.length - 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: idx === categories.length - 1 ? 'rgba(255,255,255,0.2)' : 'var(--color-text)',
                      cursor: idx === categories.length - 1 ? 'default' : 'pointer',
                      padding: '2px'
                    }}
                    onClick={() => handleMove(idx, 'down')}
                    title="Mover abajo"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>
                      {cat.name}
                    </h3>
                    <span className="badge badge-info" style={{ fontSize: '9px', padding: '1px 6px' }}>
                      {count} {count === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                  {cat.description && (
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', minHeight: '30px' }}
                  onClick={() => handleToggleActive(cat)}
                  title={cat.isActive ? 'Desactivar' : 'Activar'}
                >
                  {cat.isActive ? <CheckCircle2 size={14} color="#22c55e" /> : <PauseCircle size={14} color="#f59e0b" />}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', minHeight: '30px' }}
                  onClick={() => openEditModal(cat)}
                  title="Editar"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ padding: '4px 8px', minHeight: '30px' }}
                  onClick={() => handleDeleteClick(cat)}
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create / Edit Category */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form noValidate onSubmit={handleSaveCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre de la Categoría *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Hamburguesas Gourmet"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción (opcional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Breve texto descriptivo para el cliente"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <div className="switch-wrapper">
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Categoría Activa</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Visible en la carta digital pública
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={e => setFormIsActive(e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={isSaving}
                  onClick={handleSaveCategory}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Guardando cambios...</span>
                    </>
                  ) : (
                    <span>{editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Conflict Resolution on Category Delete */}
      {conflictModalOpen && categoryToDelete && (
        <div className="modal-overlay" onClick={() => setConflictModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <AlertTriangle size={18} /> Reasignar Productos
              </h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setConflictModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '13px', marginBottom: '12px' }}>
                La categoría <strong>"{categoryToDelete.name}"</strong> tiene <strong>{conflictProducts.length}</strong> producto(s) asignado(s).
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Por seguridad y para no perder tus platos, debés reasignarlos a otra categoría antes de eliminarla:
              </p>

              <div className="form-group">
                <label className="form-label">Reasignar productos a:</label>
                <select
                  className="form-select"
                  value={reassignTargetCatId}
                  onChange={e => setReassignTargetCatId(e.target.value)}
                >
                  {categories
                    .filter(c => c.id !== categoryToDelete.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ background: 'var(--color-surface)', padding: '10px', borderRadius: 'var(--radius-sm)', maxHeight: '120px', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Productos afectados:
                </div>
                {conflictProducts.map(p => (
                  <div key={p.id} style={{ fontSize: '12px', padding: '2px 0' }}>
                    • {p.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setConflictModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleReassignAndDelete}
                disabled={!reassignTargetCatId}
              >
                Reasignar y Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
