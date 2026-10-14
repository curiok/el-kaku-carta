import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Store,
  ExternalLink,
  Trash2,
  X,
  MessageCircle,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getOrders, updateOrderStatus, deleteOrder } from '../db';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../components/Toast';
import type { LocalOrder, OrderStatus, DeliveryType } from '../types';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('ALL');

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<LocalOrder | null>(null);

  const { showSuccess, showError, showWarning } = useToast();

  const loadAll = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (err: any) {
      showError(`Error al cargar pedidos: ${err.message}`);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(id, newStatus);
      showSuccess('Estado del pedido actualizado.');
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
      loadAll();
    } catch (err: any) {
      showError(`Error al cambiar estado: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('¿Seguro que deseás eliminar este registro de pedido de tu dispositivo?');
    if (!confirm) return;

    try {
      await deleteOrder(id);
      showSuccess('Pedido eliminado del registro local.');
      setSelectedOrder(null);
      loadAll();
    } catch (err: any) {
      showError(`Error al eliminar: ${err.message}`);
    }
  };

  const handleCopyMessage = (order: LocalOrder) => {
    if (!order.rawWhatsappMessage) {
      showWarning('No hay texto de mensaje registrado para este pedido.');
      return;
    }

    navigator.clipboard.writeText(order.rawWhatsappMessage)
      .then(() => showSuccess('Mensaje para WhatsApp copiado al portapapeles.'))
      .catch(() => showError('No se pudo copiar automáticamente.'));
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'preparado':
        return <span className="badge badge-warning"><Clock size={10} /> Preparado</span>;
      case 'abierto_whatsapp':
        return <span className="badge badge-info"><MessageCircle size={10} /> Abierto en WA</span>;
      case 'revisado':
        return <span className="badge badge-success"><CheckCircle size={10} /> Revisado</span>;
      case 'cancelado':
        return <span className="badge badge-danger"><XCircle size={10} /> Cancelado</span>;
      default:
        return null;
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.address && o.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesDelivery = deliveryFilter === 'ALL' || o.deliveryType === deliveryFilter;

    return matchesSearch && matchesStatus && matchesDelivery;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Pedidos Locales</h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {filteredOrders.length} de {orders.length} pedidos en este dispositivo
          </span>
        </div>
      </div>

      {/* Info Notice */}
      <div
        className="card"
        style={{
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px dashed var(--color-border)',
          padding: '10px 12px',
          marginBottom: '12px'
        }}
      >
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Estos pedidos quedan registrados únicamente en este teléfono. <strong>Nunca se publican en GitHub</strong> ni son visibles por los clientes.
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Buscar por cliente o ID (#KAKU-...)"
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

      {/* Filter Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <select
          className="form-select"
          style={{ padding: '8px 10px', fontSize: '12px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Todos los Estados</option>
          <option value="preparado">Preparado</option>
          <option value="abierto_whatsapp">Abierto en WA</option>
          <option value="revisado">Revisado</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <select
          className="form-select"
          style={{ padding: '8px 10px', fontSize: '12px' }}
          value={deliveryFilter}
          onChange={e => setDeliveryFilter(e.target.value)}
        >
          <option value="ALL">Todas las Modalidades</option>
          <option value="delivery">Solo Delivery</option>
          <option value="pickup">Solo Retiro</option>
        </select>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-text-muted)' }}>
          <ShoppingBag size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '15px', color: 'var(--color-text)', marginBottom: '4px' }}>
            No hay pedidos registrados
          </h3>
          <p style={{ fontSize: '12px' }}>
            Cuando se realice un pedido desde la carta digital en este dispositivo, quedará registrado aquí automáticamente.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className="card"
              style={{
                margin: 0,
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderLeft: order.deliveryType === 'delivery' ? '3px solid #38bdf8' : '3px solid #f59e0b'
              }}
              onClick={() => setSelectedOrder(order)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                      #{order.id}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>
                    {order.customerName}
                  </h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--color-primary)' }}>
                    {formatCurrency(order.total)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <Calendar size={10} /> {formatDate(order.createdAt)}
                  </div>
                </div>
              </div>

              {/* Items summary */}
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {order.items.map(it => `${it.quantity}x ${it.productName}`).join(' • ')}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}>
                  {order.deliveryType === 'delivery' ? (
                    <>
                      <Truck size={12} color="#38bdf8" /> Delivery: {order.address ? `Casa de: ${order.address}` : 'Sin dato de casa'}
                    </>
                  ) : (
                    <>
                      <Store size={12} color="#f59e0b" /> Retiro
                    </>
                  )}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                  Ver detalle →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Pedido #{selectedOrder.id}</h2>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {formatDate(selectedOrder.createdAt)}
                </span>
              </div>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setSelectedOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Customer Info Card */}
              <div className="card" style={{ background: 'var(--color-surface)', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '4px' }}>
                  {selectedOrder.customerName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedOrder.deliveryType === 'delivery' ? (
                    <>
                      <Truck size={14} color="#38bdf8" /> Delivery — Casa de: <strong>{selectedOrder.address || 'Sin especificar'}</strong>
                    </>
                  ) : (
                    <>
                      <Store size={14} color="#f59e0b" /> Retiro
                    </>
                  )}
                </div>
                {selectedOrder.notes && (
                  <div style={{ fontSize: '12px', marginTop: '6px', fontStyle: 'italic', color: '#cbd5e1' }}>
                    Obs: "{selectedOrder.notes}"
                  </div>
                )}
              </div>

              {/* Status Selector */}
              <div className="form-group">
                <label className="form-label">Estado del Pedido</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {(['preparado', 'abierto_whatsapp', 'revisado', 'cancelado'] as OrderStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      className={`btn btn-sm ${selectedOrder.status === st ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '11px' }}
                      onClick={() => handleStatusChange(selectedOrder.id, st)}
                    >
                      {st === 'preparado' && 'Preparado'}
                      {st === 'abierto_whatsapp' && 'Abierto en WA'}
                      {st === 'revisado' && 'Revisado'}
                      {st === 'cancelado' && 'Cancelado'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Breakdown Snapshot */}
              <div className="form-group">
                <label className="form-label">Detalle de Productos</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '13px' }}>
                            {item.quantity} x {item.productName}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Base: {formatCurrency(item.unitBasePrice)}
                          </div>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)' }}>
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>

                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                          {item.selectedOptions.map((opt, oIdx) => (
                            <div key={oIdx} style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              • {opt.groupName}: {opt.optionName} {opt.additionalPrice > 0 ? `(+${formatCurrency(opt.additionalPrice)})` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginBottom: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.deliveryType === 'delivery' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    <span>Costo de Envío:</span>
                    <span>{selectedOrder.deliveryFee > 0 ? formatCurrency(selectedOrder.deliveryFee) : 'A convenir'}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: 'var(--color-primary)', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                  <span>TOTAL:</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Action buttons inside modal */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => handleCopyMessage(selectedOrder)}
                >
                  <Copy size={16} /> Copiar Mensaje para WhatsApp
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(selectedOrder.id)}
              >
                <Trash2 size={16} /> Eliminar Registro
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setSelectedOrder(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
