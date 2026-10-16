import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Copy,
  Edit2,
  Trash2,
  Eye,
  X,
  ArrowUpDown,
  UtensilsCrossed,
  CheckCircle2,
  PauseCircle,
  Loader2
} from 'lucide-react';
import { getProducts, saveProduct, deleteProduct, getCategories, toggleProductAvailability } from '../db';
import { formatCurrency, generateId } from '../utils/formatters';
import { ImageUploader } from '../components/ImageUploader';
import { Lightbox } from '../components/Lightbox';
import { useToast } from '../components/Toast';
import type { Product, Category } from '../types';

interface ProductsPageProps {
  initialOpenNewModal?: boolean;
  onResetNewModal?: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  initialOpenNewModal = false,
  onResetNewModal
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State (Nombre, Descripción, Precio, Categoría, Fotografías, Orden, Disponibilidad)
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formMainImageIndex, setFormMainImageIndex] = useState(0);
  const [formSortOrder, setFormSortOrder] = useState<number>(1);
  const [formIsAvailable, setFormIsAvailable] = useState<boolean>(true);

  // Preview Modal
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { showSuccess, showError, showWarning } = useToast();

  const loadAll = async () => {
    try {
      const [prods, cats] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      showError(`Error al cargar productos: ${err.message}`);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (initialOpenNewModal && categories.length > 0) {
      openCreateModal();
      onResetNewModal?.();
    }
  }, [initialOpenNewModal, categories]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDescription('');
    setFormPrice(0);
    setFormCategoryId(categories[0]?.id || '');
    setFormImages([]);
    setFormMainImageIndex(0);
    setFormSortOrder(products.length + 1);
    setFormIsAvailable(true);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name || '');
    setFormDescription(p.description || '');
    setFormPrice(p.basePrice || 0);
    setFormCategoryId(p.categoryId || categories[0]?.id || '');
    setFormImages(p.images || []);
    setFormMainImageIndex(p.mainImageIndex || 0);
    setFormSortOrder(p.sortOrder || 1);
    setFormIsAvailable(p.isAvailable !== false);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleToggleAvailability = async (p: Product) => {
    const currentStatus = p.isAvailable !== false;
    const newStatus = !currentStatus;
    try {
      await toggleProductAvailability(p.id, newStatus);
      setProducts(prev =>
        prev.map(item => item.id === p.id ? { ...item, isAvailable: newStatus } : item)
      );
      if (newStatus) {
        showSuccess(`«${p.name}» reactivado — Ya está disponible en la carta pública.`);
      } else {
        showWarning(`«${p.name}» pausado — Oculto en la carta pública.`);
      }
    } catch (err: any) {
      showError(`Error al actualizar disponibilidad: ${err.message}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const trimmedName = formName.trim();
    if (!trimmedName) {
      showWarning('El nombre del producto no puede estar vacío.');
      return;
    }
    const numPrice = Number(formPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      showWarning('El precio no puede ser negativo.');
      return;
    }
    const targetCategoryId = formCategoryId || categories[0]?.id || '';
    if (!targetCategoryId) {
      showWarning('Debés seleccionar una categoría.');
      return;
    }

    setIsSaving(true);

    // Ensure selected main photo is placed at index 0 of images
    let reorderedImages = [...formImages];
    if (formMainImageIndex > 0 && formMainImageIndex < reorderedImages.length) {
      const mainImg = reorderedImages[formMainImageIndex];
      reorderedImages = [mainImg, ...reorderedImages.filter((_, idx) => idx !== formMainImageIndex)];
    }

    const now = new Date().toISOString();
    const productToSave: Product = {
      ...editingProduct,
      id: editingProduct ? editingProduct.id : generateId('prod'),
      name: trimmedName,
      description: formDescription.trim(),
      basePrice: Math.round(numPrice),
      categoryId: targetCategoryId,
      images: reorderedImages,
      mainImageIndex: 0,
      sortOrder: Math.max(1, Number(formSortOrder) || (editingProduct?.sortOrder ?? products.length + 1)),
      isAvailable: formIsAvailable,
      optionGroupIds: editingProduct?.optionGroupIds || [],
      createdAt: editingProduct ? editingProduct.createdAt : now,
      updatedAt: now
    };

    try {
      await saveProduct(productToSave);
      showSuccess(editingProduct ? 'Cambios guardados correctamente.' : 'Producto creado con éxito.');
      setIsModalOpen(false);
      await loadAll();
    } catch (err: any) {
      showError(`Error al guardar: ${err.message || 'Error de conexión con Supabase'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (p: Product) => {
    const duplicated: Product = {
      ...p,
      id: generateId('prod'),
      name: `${p.name} (Copia)`,
      sortOrder: products.length + 1,
      isAvailable: p.isAvailable !== false,
      optionGroupIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await saveProduct(duplicated);
      showSuccess(`"${p.name}" duplicado con éxito.`);
      loadAll();
    } catch (err: any) {
      showError(`Error al duplicar: ${err.message}`);
    }
  };

  const handleDelete = async (p: Product) => {
    const confirm = window.confirm(`¿Seguro que deseás eliminar "${p.name}"? Esta acción no se puede deshacer. Los pedidos históricos conservarán sus datos intactos.`);
    if (!confirm) return;

    try {
      await deleteProduct(p.id);
      showSuccess(`"${p.name}" eliminado correctamente.`);
      loadAll();
    } catch (err: any) {
      showError(`Error al eliminar: ${err.message}`);
    }
  };

  const handleOpenLightbox = (images: string[], index = 0) => {
    if (images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'ALL' || p.categoryId === selectedCategoryFilter;
    const matchesAvailability =
      availabilityFilter === 'ALL' ||
      (availabilityFilter === 'ACTIVE' && p.isAvailable !== false) ||
      (availabilityFilter === 'PAUSED' && p.isAvailable === false);
    return matchesSearch && matchesCategory && matchesAvailability;
  });


  return (
    <div>
      {/* Top action header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Productos</h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {filteredProducts.length} de {products.length} productos
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Buscar plato, hamburguesa, bebida..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '38px', borderRadius: 'var(--radius-full)' }}
        />
        <Search
          size={18}
          color="var(--color-text-muted)"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Availability Status Filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button
          type="button"
          className={`btn btn-sm ${availabilityFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-full)', padding: '4px 12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}
          onClick={() => setAvailabilityFilter('ALL')}
        >
          Todos ({products.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${availabilityFilter === 'ACTIVE' ? 'btn-success' : 'btn-secondary'}`}
          style={{
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            color: availabilityFilter === 'ACTIVE' ? '#ffffff' : '#4ade80'
          }}
          onClick={() => setAvailabilityFilter('ACTIVE')}
        >
          <CheckCircle2 size={13} /> Disponibles ({products.filter(p => p.isAvailable !== false).length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${availabilityFilter === 'PAUSED' ? 'btn-warning' : 'btn-secondary'}`}
          style={{
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            color: availabilityFilter === 'PAUSED' ? '#000000' : '#fbbf24'
          }}
          onClick={() => setAvailabilityFilter('PAUSED')}
        >
          <PauseCircle size={13} /> Pausados ({products.filter(p => p.isAvailable === false).length})
        </button>
      </div>

      {/* Category Horizontal Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '14px',
          scrollbarWidth: 'none'
        }}
      >
        <button
          className={`btn btn-sm ${selectedCategoryFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', padding: '4px 12px' }}
          onClick={() => setSelectedCategoryFilter('ALL')}
        >
          Todas
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`btn btn-sm ${selectedCategoryFilter === cat.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', padding: '4px 12px' }}
            onClick={() => setSelectedCategoryFilter(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-text-muted)' }}
        >
          <UtensilsCrossed size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '15px', color: 'var(--color-text)', marginBottom: '4px' }}>
            No se encontraron productos
          </h3>
          <p style={{ fontSize: '12px' }}>
            {searchTerm ? 'Probá con otra búsqueda o limpiá el filtro.' : 'Crea tu primer producto para comenzar.'}
          </p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '14px' }} onClick={openCreateModal}>
            <Plus size={16} /> Crear Producto
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredProducts.map(p => {
            const category = categories.find(c => c.id === p.categoryId);
            const isAvail = p.isAvailable !== false;
            const mainImg = p.images && p.images.length > 0
              ? p.images[p.mainImageIndex || 0] || p.images[0]
              : null;
            return (
              <div
                key={p.id}
                className="card"
                style={{
                  margin: 0,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  borderLeft: isAvail ? '4px solid #22c55e' : '4px solid #f59e0b',
                  background: isAvail ? 'var(--color-card)' : 'rgba(32, 25, 17, 0.75)',
                  opacity: isAvail ? 1 : 0.88,
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Main Product Info Row */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#090d16',
                      overflow: 'hidden',
                      flexShrink: 0,
                      position: 'relative',
                      cursor: mainImg ? 'pointer' : 'default',
                      border: '1px solid var(--color-border)'
                    }}
                    onClick={() => mainImg && handleOpenLightbox(p.images, p.mainImageIndex || 0)}
                  >
                    {mainImg ? (
                      <img
                        src={mainImg}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-text-muted)'
                        }}
                      >
                        <UtensilsCrossed size={22} opacity={0.4} />
                      </div>
                    )}
                    {p.images && p.images.length > 1 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '2px',
                          background: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: '3px'
                        }}
                      >
                        +{p.images.length - 1}
                      </span>
                    )}
                  </div>

                  {/* Text details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                      <h3
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: isAvail ? 'var(--color-text)' : '#e2e8f0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {p.name}
                      </h3>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: isAvail ? 'var(--color-primary)' : '#cbd5e1',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatCurrency(p.basePrice)}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        marginTop: '2px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {p.description || 'Sin descripción'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span className="badge badge-info" style={{ fontSize: '9px', padding: '2px 6px' }}>
                        {category?.name || 'Sin categoría'}
                      </span>

                      {/* Quick Mobile Status Badge / Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(p)}
                        className={`btn btn-sm ${isAvail ? 'btn-success' : 'btn-warning'}`}
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          color: isAvail ? '#ffffff' : '#000000'
                        }}
                        title={isAvail ? 'Tocar para pausar producto' : 'Tocar para reactivar producto'}
                      >
                        {isAvail ? (
                          <>
                            <CheckCircle2 size={11} /> Disponible
                          </>
                        ) : (
                          <>
                            <PauseCircle size={11} /> Pausado
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '6px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    flexWrap: 'wrap'
                  }}
                >
                  {/* Dedicated Pause/Reactivate Action Button */}
                  <button
                    className={`btn btn-sm ${isAvail ? 'btn-secondary' : 'btn-success'}`}
                    style={{
                      padding: '4px 10px',
                      minHeight: '32px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isAvail ? '#fbbf24' : '#ffffff'
                    }}
                    title={isAvail ? 'Pausar producto (ocultar de la carta pública)' : 'Reactivar producto (mostrar en la carta pública)'}
                    onClick={() => handleToggleAvailability(p)}
                  >
                    {isAvail ? (
                      <>
                        <PauseCircle size={14} /> Pausar
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> Reactivar
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', minHeight: '32px', fontSize: '11px' }}
                    title="Previsualizar como cliente"
                    onClick={() => setPreviewProduct(p)}
                  >
                    <Eye size={14} /> Ver
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', minHeight: '32px', fontSize: '11px' }}
                    title="Duplicar producto"
                    onClick={() => handleDuplicate(p)}
                  >
                    <Copy size={14} /> Duplicar
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', minHeight: '32px', fontSize: '11px' }}
                    title="Editar producto"
                    onClick={() => openEditModal(p)}
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ padding: '4px 10px', minHeight: '32px', fontSize: '11px' }}
                    title="Eliminar producto"
                    onClick={() => handleDelete(p)}
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Product */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form noValidate onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body">
                {/* Product Name */}
                <div className="form-group">
                  <label className="form-label">Nombre del Producto *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Hamburguesa Doble Cheddar"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                  />
                </div>

                {/* Base Price & Category & Sort Order */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Precio Base ($ ARS) *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Ej. 14500"
                      min="0"
                      step="any"
                      value={formPrice === 0 && !editingProduct ? '' : formPrice}
                      onChange={e => setFormPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Categoría *</label>
                    <select
                      className="form-select"
                      value={formCategoryId || categories[0]?.id || ''}
                      onChange={e => setFormCategoryId(e.target.value)}
                      required
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Availability State (Disponible / Pausado) */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                    Estado en la Carta Pública
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${formIsAvailable ? 'btn-success' : 'btn-secondary'}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 12px',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: formIsAvailable ? '2px solid #22c55e' : '1px solid var(--color-border)',
                        background: formIsAvailable ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-surface)',
                        color: formIsAvailable ? '#4ade80' : 'var(--color-text-muted)'
                      }}
                      onClick={() => setFormIsAvailable(true)}
                    >
                      <CheckCircle2 size={16} /> Disponible
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${!formIsAvailable ? 'btn-warning' : 'btn-secondary'}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 12px',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: !formIsAvailable ? '2px solid #f59e0b' : '1px solid var(--color-border)',
                        background: !formIsAvailable ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-surface)',
                        color: !formIsAvailable ? '#fbbf24' : 'var(--color-text-muted)'
                      }}
                      onClick={() => setFormIsAvailable(false)}
                    >
                      <PauseCircle size={16} /> Pausado
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    {formIsAvailable
                      ? '✓ El producto aparece para los clientes en la carta pública.'
                      : '⏸ El producto queda oculto en la carta (no se borra ninguna información, precio ni foto).'}
                  </span>
                </div>

                {/* Sort Order */}
                <div className="form-group">
                  <label className="form-label">Orden de visualización</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Ej. 1"
                    min="1"
                    value={formSortOrder}
                    onChange={e => setFormSortOrder(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Define la posición relativa en la carta (números más bajos aparecen primero).
                  </span>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Detalle de ingredientes, acompañamientos, etc."
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                  />
                </div>

                {/* Images component */}
                <ImageUploader
                  images={formImages}
                  mainIndex={formMainImageIndex}
                  onChange={(imgs, mainIdx) => {
                    setFormImages(imgs);
                    setFormMainImageIndex(mainIdx);
                  }}
                />
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
                  onClick={handleSaveProduct}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Guardando cambios...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Guardar Cambios' : 'Crear Producto'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal: Customer View */}
      {previewProduct && (
        <div className="modal-overlay" onClick={() => setPreviewProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Vista del Cliente</h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setPreviewProduct(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Product Card Preview */}
              <div
                style={{
                  background: 'var(--color-card)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)'
                }}
              >
                {previewProduct.images && previewProduct.images.length > 0 && (
                  <div style={{ height: '200px', width: '100%', background: '#090d16' }}>
                    <img
                      src={previewProduct.images[previewProduct.mainImageIndex || 0] || previewProduct.images[0]}
                      alt={previewProduct.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{previewProduct.name}</h3>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-primary)' }}>
                      {formatCurrency(previewProduct.basePrice)}
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                    {previewProduct.description || 'Sin descripción'}
                  </p>

                  <button className="btn btn-primary btn-block">
                    Agregar al Carrito
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary btn-block"
                onClick={() => setPreviewProduct(null)}
              >
                Cerrar Previsualización
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
};
