import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Eye } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import type { Product, OptionGroup, CartItemOption } from '../types';

interface ProductModalProps {
  product: Product | null;
  optionGroups: OptionGroup[];
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, options: CartItemOption[]) => void;
  onOpenLightbox: (images: string[], index: number) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  optionGroups,
  isOpen,
  onClose,
  onAddToCart,
  onOpenLightbox
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string[]>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setValidationError(null);

      // Pre-select first choice for required single-choice groups
      const initial: Record<string, string[]> = {};
      const linkedGroups = optionGroups.filter(og => product.optionGroupIds?.includes(og.id));

      for (const group of linkedGroups) {
        if (group.type === 'single' && group.isRequired && group.options.length > 0) {
          initial[group.id] = [group.options[0].id];
        } else {
          initial[group.id] = [];
        }
      }
      setSelectedChoices(initial);
    }
  }, [product, optionGroups, isOpen]);

  if (!isOpen || !product) return null;

  const linkedGroups = optionGroups.filter(og => product.optionGroupIds?.includes(og.id) && og.isActive);

  const handleSelectChoice = (groupId: string, optionId: string, groupType: 'single' | 'multiple', maxSelections: number) => {
    setSelectedChoices(prev => {
      const current = prev[groupId] || [];

      if (groupType === 'single') {
        return { ...prev, [groupId]: [optionId] };
      }

      // Multiple selection
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) };
      }

      if (current.length >= maxSelections) {
        return prev; // Reached maximum selections
      }

      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  // Calculate live price
  let additionalTotal = 0;
  const flatOptionsList: CartItemOption[] = [];

  for (const group of linkedGroups) {
    const chosenIds = selectedChoices[group.id] || [];
    for (const optId of chosenIds) {
      const opt = group.options.find(o => o.id === optId);
      if (opt) {
        additionalTotal += opt.price || 0;
        flatOptionsList.push({
          groupId: group.id,
          groupName: group.name,
          optionId: opt.id,
          optionName: opt.name,
          additionalPrice: opt.price || 0
        });
      }
    }
  }

  const unitFinalPrice = product.basePrice + additionalTotal;
  const totalPrice = unitFinalPrice * quantity;

  const handleAdd = () => {
    // Validate required groups
    for (const group of linkedGroups) {
      const chosen = selectedChoices[group.id] || [];
      if (group.isRequired && chosen.length === 0) {
        setValidationError(`Por favor seleccioná una opción en "${group.name}".`);
        return;
      }
    }

    onAddToCart(product, quantity, flatOptionsList);
    onClose();
  };

  const mainImg = product.images && product.images.length > 0
    ? product.images[product.mainImageIndex || 0] || product.images[0]
    : null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-card)',
          width: '100%',
          maxWidth: '480px',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
          borderBottom: 'none',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Image & Close */}
        <div style={{ position: 'relative' }}>
          {mainImg ? (
            <div
              style={{ height: '180px', width: '100%', background: '#090d16', cursor: 'pointer' }}
              onClick={() => onOpenLightbox(product.images, product.mainImageIndex || 0)}
            >
              <img
                src={mainImg}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  borderRadius: '20px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Eye size={12} /> Ver foto completa
              </span>
            </div>
          ) : (
            <div style={{ height: '24px' }}></div>
          )}

          <button
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0, 0, 0, 0.65)',
              border: 'none',
              color: 'white',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{product.name}</h2>
            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-primary)' }}>
              {formatCurrency(product.basePrice)}
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            {product.description || 'Delicioso plato preparado al momento con los mejores ingredientes de El Kaku.'}
          </p>

          {validationError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '14px'
              }}
            >
              {validationError}
            </div>
          )}

          {/* Option Groups */}
          {linkedGroups.map(group => {
            const chosen = selectedChoices[group.id] || [];
            return (
              <div
                key={group.id}
                style={{
                  marginBottom: '16px',
                  background: 'var(--color-surface)',
                  borderRadius: '12px',
                  padding: '12px',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {group.name}
                  </h4>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    {group.isRequired ? (
                      <span style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>Obligatorio</span>
                    ) : (
                      <span>Opcional (hasta {group.max})</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.options.map(opt => {
                    const isSelected = chosen.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectChoice(group.id, opt.id, group.type, group.max)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'var(--color-card)',
                          border: isSelected ? '1px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: group.type === 'single' ? '50%' : '4px',
                              border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--color-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? 'var(--color-primary)' : 'transparent'
                            }}
                          >
                            {isSelected && (
                              <Check size={12} color="#111827" strokeWidth={3} />
                            )}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500 }}>
                            {opt.name}
                          </span>
                        </div>

                        <span style={{ fontSize: '13px', fontWeight: 700, color: opt.price > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                          {opt.price > 0 ? `+${formatCurrency(opt.price)}` : '$ 0'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer: Quantity and Add CTA */}
        <div
          style={{
            padding: '14px 16px calc(14px + var(--safe-bottom)) 16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--color-card)'
          }}
        >
          {/* Quantity selector */}
          <div className="qty-widget">
            <button
              className="qty-btn"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Minus size={14} />
            </button>
            <span className="qty-val">{quantity}</span>
            <button
              className="qty-btn"
              onClick={() => setQuantity(q => q + 1)}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to Cart button */}
          <button
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px 14px', fontSize: '14px' }}
            onClick={handleAdd}
          >
            Agregar • {formatCurrency(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
};
