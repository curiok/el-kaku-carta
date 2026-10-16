import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Truck,
  Store,
  ShoppingBag,
  MessageCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency, generateOrderId } from '../utils/formatters';
import { buildWhatsAppOrderMessage, createWhatsAppLink, normalizeWhatsAppNumber } from '../utils/whatsapp';
import { checkProductsAvailability, supabase } from '../supabase';
import type { DeliveryType, PublicMenuData } from '../types';



interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  menuData: PublicMenuData | null;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  menuData
}) => {
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();

  const business = menuData?.business;
  const isDeliveryAllowed = business?.deliveryEnabled ?? true;
  const isPickupAllowed = business?.pickupEnabled ?? true;

  // Selected modality
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    isDeliveryAllowed ? 'delivery' : 'pickup'
  );

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Success / WhatsApp Modal State
  const [preparedOrder, setPreparedOrder] = useState<{
    orderId: string;
    whatsappUrl: string;
    messageText: string;
  } | null>(null);

  if (!isOpen) return null;

  const isFreeDelivery = (business?.deliveryFeeMode ?? 'free') === 'free' || (Number(business?.deliveryFee) || 0) === 0;
  const deliveryFee = deliveryType === 'delivery' && !isFreeDelivery ? (Number(business?.deliveryFee) || 0) : 0;
  const total = subtotal + deliveryFee;

  const handleCheckout = async () => {
    setValidationError(null);

    if (items.length === 0) {
      setValidationError('Tu carrito está vacío. Agregá algún producto antes de continuar.');
      return;
    }

    // 1. Live availability check from Supabase & active menu catalog
    try {
      const productIds = items.map(it => it.productId);
      const availMap = await checkProductsAvailability(productIds);

      // Check if any product was marked paused in Supabase
      const pausedInSupabase = items.find(it => availMap[it.productId] === false);
      if (pausedInSupabase) {
        setValidationError(`El producto «${pausedInSupabase.productName}» se encuentra pausado y no está disponible para ordenar. Por favor eliminalo de tu carrito para continuar.`);
        return;
      }

      // Check if product was deleted or is missing from active catalog
      if (menuData && menuData.products) {
        const activeProductIds = new Set(menuData.products.filter(p => p.isAvailable).map(p => p.id));
        const unavailable = items.find(it => !activeProductIds.has(it.productId) || availMap[it.productId] === false);
        if (unavailable) {
          setValidationError(`El producto «${unavailable.productName}» ya no está disponible para la venta. Eliminalo del carrito para continuar.`);
          return;
        }
      }
    } catch {
      // Fallback to local menuData check
      if (menuData && menuData.products) {
        const activeProductIds = new Set(menuData.products.filter(p => p.isAvailable).map(p => p.id));
        const unavailable = items.find(it => !activeProductIds.has(it.productId));
        if (unavailable) {
          setValidationError(`El producto «${unavailable.productName}» ya no está disponible para la venta. Eliminalo del carrito para continuar.`);
          return;
        }
      }
    }


    if (!customerName.trim()) {
      setValidationError('Por favor ingresá tu nombre para que podamos identificar tu pedido.');
      return;
    }

    if (deliveryType === 'delivery' && !address.trim()) {
      setValidationError('Por favor indicá «Casa de» para coordinar la entrega a domicilio.');
      return;
    }

    const orderId = generateOrderId();
    const phone = business?.whatsappNumber || '+54 9 3821 40-6662';

    const messageText = buildWhatsAppOrderMessage({
      businessName: business?.name || 'El Kaku',
      orderId,
      customerName: customerName.trim(),
      deliveryType,
      address: deliveryType === 'delivery' ? address.trim() : undefined,
      items,
      subtotal,
      deliveryFee,
      total,
      notes: notes.trim() || undefined
    });

    const whatsappUrl = createWhatsAppLink(phone, messageText);

    // Save order to central Supabase orders table
    try {
      const orderPayload = {
        id: orderId,
        customer_name: customerName.trim(),
        delivery_type: deliveryType,
        address: deliveryType === 'delivery' ? address.trim() : null,
        items: items.map(it => ({
          productId: it.productId,
          productName: it.productName,
          unitBasePrice: it.unitBasePrice,
          quantity: it.quantity,
          selectedOptions: it.selectedOptions || [],
          subtotal: it.subtotal
        })),
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total: total,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      supabase.from('orders').insert([orderPayload]).then(({ error }) => {
        if (error) console.warn('Could not persist order to Supabase:', error.message);
      });
    } catch (sbErr) {
      console.warn('Supabase order insert error:', sbErr);
    }

    // Save locally to IndexedDB if possible (e.g. testing on same device)
    try {
      const req = indexedDB.open('kaku_admin_db', 1);
      req.onsuccess = (e: any) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains('local_orders')) {
          const tx = db.transaction('local_orders', 'readwrite');
          tx.objectStore('local_orders').put({
            id: orderId,
            createdAt: new Date().toISOString(),
            customerName: customerName.trim(),
            deliveryType,
            address: deliveryType === 'delivery' ? address.trim() : undefined,
            items: items.map(it => ({
              productId: it.productId,
              productName: it.productName,
              unitBasePrice: it.unitBasePrice,
              quantity: it.quantity,
              selectedOptions: it.selectedOptions,
              subtotal: it.subtotal
            })),
            subtotal,
            deliveryFee,
            total,
            notes: notes.trim() || undefined,
            status: 'abierto_whatsapp',
            rawWhatsappMessage: messageText
          });
        }
      };
    } catch (err) {
      // Ignore if IndexedDB is not used in standalone public menu
    }


    // Try opening WhatsApp
    window.open(whatsappUrl, '_blank');

    setPreparedOrder({
      orderId,
      whatsappUrl,
      messageText
    });
  };

  const handleCopyMessage = () => {
    if (!preparedOrder) return;
    navigator.clipboard.writeText(preparedOrder.messageText)
      .then(() => alert('¡Mensaje copiado al portapapeles! Pegalo en la conversación de WhatsApp.'))
      .catch(() => alert('No se pudo copiar automáticamente.'));
  };

  const handleFinishOrder = () => {
    clearCart();
    setNotes('');
    setPreparedOrder(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 110,
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
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
          borderBottom: 'none',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '17px', fontWeight: 800 }}>Tu Pedido</h2>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              ({items.length} {items.length === 1 ? 'ítem' : 'ítems'})
            </span>
          </div>

          <button
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-muted)' }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <h3 style={{ fontSize: '16px', color: 'var(--color-text)', marginBottom: '4px' }}>
                Tu carrito está vacío
              </h3>
              <p style={{ fontSize: '13px' }}>
                Explorá la carta y agregá tus platos favoritos de El Kaku.
              </p>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {items.map(item => {
                  const isAvailable = menuData?.products
                    ? menuData.products.some(p => p.id === item.productId && p.isAvailable)
                    : true;
                  return (
                    <div
                      key={item.cartItemId}
                      style={{
                        background: 'var(--color-surface)',
                        borderRadius: '12px',
                        padding: '12px',
                        border: isAvailable ? '1px solid var(--color-border)' : '1px solid #ef4444',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {!isAvailable && (
                        <div
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#fca5a5',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <AlertCircle size={14} /> Producto pausado o no disponible
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, paddingRight: '8px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 800 }}>{item.productName}</h4>
                          <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700 }}>
                            {formatCurrency(item.unitFinalPrice)} c/u
                          </div>
                        </div>

                        <button
                          style={{ background: 'none', border: 'none', color: isAvailable ? 'var(--color-text-muted)' : '#ef4444', cursor: 'pointer', padding: '4px' }}
                          onClick={() => removeItem(item.cartItemId)}
                          title="Eliminar del carrito"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>


                    {/* Options Breakdown */}
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '11px',
                          color: 'var(--color-text-muted)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        {item.selectedOptions.map((opt, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>• {opt.groupName}: <strong>{opt.optionName}</strong></span>
                            {opt.additionalPrice > 0 && (
                              <span style={{ color: 'var(--color-primary)' }}>+{formatCurrency(opt.additionalPrice)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Subtotal and Qty Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="qty-widget" style={{ transform: 'scale(0.9)', transformOrigin: 'left center' }}>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.cartItemId, -1)}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="qty-val">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.cartItemId, 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--color-primary)' }}>
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Modality Selector (Delivery vs Retiro) */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Modalidad de Pedido</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {isDeliveryAllowed && (
                    <button
                      type="button"
                      onClick={() => setDeliveryType('delivery')}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '10px',
                        border: deliveryType === 'delivery' ? '2px solid #38bdf8' : '1px solid var(--color-border)',
                        background: deliveryType === 'delivery' ? 'rgba(56, 189, 248, 0.12)' : 'var(--color-surface)',
                        color: 'var(--color-text)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}
                    >
                      <Truck size={18} color="#38bdf8" />
                      <span>Delivery</span>
                    </button>
                  )}

                  {isPickupAllowed && (
                    <button
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '10px',
                        border: deliveryType === 'pickup' ? '2px solid #f59e0b' : '1px solid var(--color-border)',
                        background: deliveryType === 'pickup' ? 'rgba(245, 158, 11, 0.12)' : 'var(--color-surface)',
                        color: 'var(--color-text)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}
                    >
                      <Store size={18} color="#f59e0b" />
                      <span>Retiro</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Inputs Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">Tu Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Rodrigo Guzman"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                {deliveryType === 'delivery' && (
                  <div>
                    <label className="form-label">Casa de *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej.  Casa de curi"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      required
                    />
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                      Indicá la persona o dato de referencia de la casa
                    </div>
                  </div>
                )}

                <div>
                  <label className="form-label">¿Querés modificar algo de tu pedido?</label>
                  <textarea
                    className="form-input"
                    placeholder="Ej.: sin tomate, sin mayonesa, sin cebolla..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    style={{
                      minHeight: '62px',
                      resize: 'none',
                      lineHeight: '1.4'
                    }}
                  />
                </div>
              </div>

              {/* Validation alert */}
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
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Price Breakdown */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {deliveryType === 'delivery' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    <span>Costo de Envío:</span>
                    <span style={{ color: deliveryFee === 0 ? '#22c55e' : 'inherit', fontWeight: deliveryFee === 0 ? 700 : 'normal' }}>
                      {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Gratis'}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '17px',
                    fontWeight: 900,
                    color: 'var(--color-primary)',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '8px',
                    marginTop: '2px'
                  }}
                >
                  <span>TOTAL:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Checkout CTA */}
        {items.length > 0 && (
          <div
            style={{
              padding: '14px 16px calc(14px + var(--safe-bottom)) 16px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-card)'
            }}
          >
            <button
              className="btn btn-block"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#ffffff',
                fontSize: '15px',
                padding: '14px',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)'
              }}
              onClick={handleCheckout}
            >
              <MessageCircle size={20} /> HACER PEDIDO POR WHATSAPP
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal when WhatsApp opens */}
      {preparedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 130,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            style={{
              background: 'var(--color-card)',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px',
              padding: '24px 20px',
              textAlign: 'center',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: '#22c55e'
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              ¡Tu pedido fue preparado!
            </h3>
            <span className="badge badge-success" style={{ marginBottom: '14px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              Listo para enviar por WhatsApp
            </span>

            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Tu mensaje está listo en WhatsApp. <strong>Pulsá el botón "Enviar"</strong> dentro de WhatsApp para que el negocio lo reciba y confirme.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href={preparedOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-block"
                style={{ textDecoration: 'none' }}
              >
                <ExternalLink size={16} /> Abrir WhatsApp de nuevo
              </a>

              <button
                className="btn btn-secondary btn-block"
                onClick={handleCopyMessage}
              >
                <Copy size={16} /> Copiar Mensaje al Portapapeles
              </button>

              <button
                className="btn btn-secondary btn-block"
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '12px' }}
                onClick={handleFinishOrder}
              >
                Listo, vaciar carrito y volver a la carta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
