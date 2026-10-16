import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  ShoppingBag,
  UtensilsCrossed,
  MapPin,
  Clock,
  Eye,
  Plus
} from 'lucide-react';
import { CartProvider, useCart } from './context/CartContext';
import { CartDrawer } from './components/CartDrawer';
import { Lightbox } from './components/Lightbox';
import { fetchLiveMenuData, subscribeToMenuUpdates } from './supabase';
import { formatCurrency } from './utils/formatters';
import type { PublicMenuData, Product, Category } from './types';
import './styles/menu.css';

function PublicMenuInner() {
  const [menuData, setMenuData] = useState<PublicMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { items, addItem, totalItemsCount, subtotal } = useCart();

  const loadMenu = async () => {
    try {
      // 1. Try real-time Supabase first for instantaneous multi-device sync
      const liveData = await fetchLiveMenuData();
      if (liveData && liveData.categories.length > 0) {
        setMenuData(liveData);
        setLoading(false);
        return;
      }

      // 2. Seamless fallback to static data/menu.json (offline resilient)
      const res = await fetch('./data/menu.json', { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error(`No se pudo cargar la carta digital (HTTP ${res.status})`);
      }
      const data: PublicMenuData = await res.json();
      setMenuData(data);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la carta digital.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
    // Real-time synchronization across devices (cellphones, tablets, PCs)
    const unsubscribe = subscribeToMenuUpdates(() => {
      loadMenu();
    });
    return () => {
      unsubscribe();
    };
  }, []);


  const handleQuickAdd = (product: Product) => {
    if (!product || !product.isAvailable) return;
    addItem(product, 1, []);
  };

  const handleOpenLightbox = (images: string[], index = 0) => {
    if (!images || images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  if (loading) {
    return (
      <div className="menu-app" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-badge" style={{ margin: '0 auto 16px', width: '64px', height: '64px', borderRadius: '50%' }}>
            <img src="logo-kaku.svg" alt="El Kaku" width="52" height="52" style={{ objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>El Kaku</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Cargando la carta digital...
          </p>
        </div>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="menu-app" style={{ alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <UtensilsCrossed size={48} color="var(--color-secondary)" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Carta no disponible</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          {error || 'No se pudieron recuperar los productos de la carta.'}
        </p>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const business = menuData.business;
  const products = menuData.products.filter(p => p.isAvailable);
  const activeCategoryIds = new Set(products.map(p => p.categoryId));
  const categories = menuData.categories.filter(c => c.isActive && activeCategoryIds.has(c.id));
  const currentCategoryId = selectedCategoryId === 'ALL' || activeCategoryIds.has(selectedCategoryId)
    ? selectedCategoryId
    : 'ALL';

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = currentCategoryId === 'ALL' || p.categoryId === currentCategoryId;
    return matchesSearch && matchesCat;
  });


  return (
    <div className="menu-app">
      {/* Top Header */}
      <header className="menu-header">
        <div className="menu-brand-row">
          <div className="menu-brand">
            <div className="brand-badge">
              <img src="logo-kaku.svg" alt="El Kaku" width="28" height="28" style={{ objectFit: 'contain' }} />
            </div>
            <div className="brand-info">
              <h1>{business.name || 'El Kaku'}</h1>
              <span>{business.menuTitle || 'Carta Digital'}</span>
            </div>
          </div>

          {/* Quick Cart Trigger */}
          <button
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-text)',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag size={16} color="var(--color-primary)" />
            {totalItemsCount > 0 ? (
              <span style={{ color: '#22c55e' }}>{totalItemsCount}</span>
            ) : (
              <span>0</span>
            )}
          </button>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Buscar hamburguesas, lomitos, pizzas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-text)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <Search
            size={16}
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
      </header>

      {/* Welcome / Info Banner */}
      {business.welcomeText && (
        <div
          style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(225, 29, 72, 0.08))',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '12px',
            color: '#cbd5e1'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '2px' }}>
            <span>¡Bienvenidos!</span>
          </div>
          <p>{business.welcomeText}</p>
          {business.contactText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              <MapPin size={12} /> {business.contactText}
            </div>
          )}
        </div>
      )}

      {/* Category Pills Bar */}
      <nav className="category-pills">
        <button
          className={`cat-pill ${currentCategoryId === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedCategoryId('ALL')}
        >
          Todas
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`cat-pill ${currentCategoryId === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </nav>


      {/* Product Catalog */}
      <main className="catalog-content">
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-muted)' }}>
            <UtensilsCrossed size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <h3 style={{ fontSize: '15px', color: 'var(--color-text)', marginBottom: '4px' }}>
              No se encontraron platos
            </h3>
            <p style={{ fontSize: '12px' }}>
              Probá seleccionando otra categoría o limpiá la búsqueda.
            </p>
          </div>
        ) : (
          <div>
            {filteredProducts.map(product => {
              const mainImg = product.images && product.images.length > 0
                ? product.images[product.mainImageIndex || 0] || product.images[0]
                : null;
              return (
                <div key={product.id} className="product-card">
                  {/* Image with Lightbox click */}
                  {mainImg && (
                    <div
                      className="product-img-wrapper"
                      onClick={() => handleOpenLightbox(product.images, product.mainImageIndex || 0)}
                    >
                      <img
                        src={mainImg}
                        alt={product.name}
                        className="product-img"
                        loading="lazy"
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.65)',
                          color: '#ffffff',
                          borderRadius: '16px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={12} /> Ampliar
                      </span>
                    </div>
                  )}

                  <div className="product-body">
                    <div className="product-header-row">
                      <h3 className="product-title">{product.name}</h3>
                      <div className="product-price">{formatCurrency(product.basePrice)}</div>
                    </div>

                    <p className="product-desc">
                      {product.description || 'Elaborado artesanalmente en El Kaku.'}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '4px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '8px 18px', borderRadius: 'var(--radius-full)' }}
                        onClick={() => handleQuickAdd(product)}
                        aria-label={`Agregar ${product.name} al carrito`}
                      >
                        <Plus size={14} /> Agregar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button (when items are in cart) */}
      {totalItemsCount > 0 && (
        <button
          className="floating-cart-bar"
          onClick={() => setIsCartOpen(true)}
          aria-label="Abrir Carrito"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} />
            <span>Ver Pedido</span>
            <span className="cart-counter-badge">{totalItemsCount}</span>
          </div>

          <span>{formatCurrency(subtotal)}</span>
        </button>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        menuData={menuData}
      />

      {/* Image Lightbox */}
      <Lightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}

export function PublicApp() {
  return (
    <CartProvider>
      <PublicMenuInner />
    </CartProvider>
  );
}

export default PublicApp;
