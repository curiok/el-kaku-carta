import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  FolderTree,
  Sliders,
  ShoppingBag,
  UploadCloud,
  ExternalLink,
  PlusCircle,
  Database,
  Settings as SettingsIcon,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { getProducts, getCategories, getOrders, getSettings } from '../db';
import { checkPublisherStatus } from '../api/publisher';
import type { BusinessSettings } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  onNewProduct: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onNewProduct
}) => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalCategories: 0,
    activeCategories: 0,
    totalOrders: 0,
    pendingOrders: 0
  });
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [publisherStatus, setPublisherStatus] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [prods, cats, orders, setts] = await Promise.all([
          getProducts(),
          getCategories(),
          getOrders(),
          getSettings()
        ]);

        setSettings(setts);
        setStats({
          totalProducts: prods.length,
          activeProducts: prods.filter(p => p.isAvailable).length,
          totalCategories: cats.length,
          activeCategories: cats.filter(c => c.isActive).length,
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => o.status === 'preparado' || o.status === 'abierto_whatsapp').length
        });

        const pubRes = await checkPublisherStatus();
        if (pubRes.connected) {
          setPublisherStatus(pubRes.status);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    }
    loadData();
  }, []);

  const publicUrl = settings?.github?.publicUrl || 'https://curiok.github.io/el-kaku-carta/';

  return (
    <div>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(225, 29, 72, 0.15))',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
            {settings?.businessName || 'El Kaku'}
          </h2>
          <span className="badge badge-success">Local Móvil</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Panel de administración privado. Todos tus cambios se guardan localmente en este dispositivo y se aplican a la carta pública al publicar.
        </p>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <div
          className="card"
          style={{ padding: '12px 10px', textAlign: 'center', margin: 0, cursor: 'pointer' }}
          onClick={() => onNavigate('products')}
        >
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)' }}>
            {stats.activeProducts}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Productos Activos
          </div>
        </div>

        <div
          className="card"
          style={{ padding: '12px 10px', textAlign: 'center', margin: 0, cursor: 'pointer' }}
          onClick={() => onNavigate('categories')}
        >
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8' }}>
            {stats.activeCategories}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Categorías
          </div>
        </div>

        <div
          className="card"
          style={{ padding: '12px 10px', textAlign: 'center', margin: 0, cursor: 'pointer' }}
          onClick={() => onNavigate('orders')}
        >
          <div style={{ fontSize: '20px', fontWeight: 800, color: stats.pendingOrders > 0 ? 'var(--color-secondary)' : '#22c55e' }}>
            {stats.totalOrders}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Pedidos Locales
          </div>
        </div>
      </div>

      {/* Main Publishing Banner */}
      <div className="card" style={{ border: '1px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)'
            }}
          >
            <UploadCloud size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>Publicación en GitHub Pages</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {publisherStatus?.configured ? (
                <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={12} /> Servicio local listo con token
                </span>
              ) : (
                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> Configuración de publicación disponible
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => onNavigate('publish')}
          >
            <UploadCloud size={16} /> Publicar Carta Digital
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ padding: '0 12px' }}
            title="Abrir carta pública"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Quick Actions Title */}
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
        Accesos Directos
      </div>

      {/* Quick Action Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <button
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 12px',
            height: 'auto',
            alignItems: 'flex-start',
            textAlign: 'left'
          }}
          onClick={onNewProduct}
        >
          <PlusCircle size={22} color="var(--color-primary)" style={{ marginBottom: '8px' }} />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Nuevo Producto</span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
            Crear plato o bebida
          </span>
        </button>

        <button
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 12px',
            height: 'auto',
            alignItems: 'flex-start',
            textAlign: 'left'
          }}
          onClick={() => onNavigate('products')}
        >
          <UtensilsCrossed size={22} color="#f97316" style={{ marginBottom: '8px' }} />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Mis Productos</span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
            {stats.totalProducts} ítems registrados
          </span>
        </button>

        <button
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 12px',
            height: 'auto',
            alignItems: 'flex-start',
            textAlign: 'left'
          }}
          onClick={() => onNavigate('categories')}
        >
          <FolderTree size={22} color="#38bdf8" style={{ marginBottom: '8px' }} />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Categorías</span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
            {stats.totalCategories} categorías
          </span>
        </button>

        <button
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 12px',
            height: 'auto',
            alignItems: 'flex-start',
            textAlign: 'left'
          }}
          onClick={() => onNavigate('options')}
        >
          <Sliders size={22} color="#a855f7" style={{ marginBottom: '8px' }} />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Opciones y Extras</span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
            Panes, cocción, adicionales
          </span>
        </button>

        <button
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 12px',
            height: 'auto',
            alignItems: 'flex-start',
            textAlign: 'left'
          }}
          onClick={() => onNavigate('orders')}
        >
          <ShoppingBag size={22} color="#22c55e" style={{ marginBottom: '8px' }} />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Pedidos Locales</span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
            {stats.totalOrders} guardados en el celu
          </span>
        </button>

        <button
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 12px',
            height: 'auto',
            alignItems: 'flex-start',
            textAlign: 'left'
          }}
          onClick={() => onNavigate('settings')}
        >
          <SettingsIcon size={22} color="#94a3b8" style={{ marginBottom: '8px' }} />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Configuración</span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
            Precios, WhatsApp, respaldo
          </span>
        </button>
      </div>

      {/* Security & Privacy notice */}
      <div
        className="card"
        style={{
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px dashed var(--color-border)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}
      >
        <Database size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: '2px' }}>
            Base de datos 100% local e independiente
          </strong>
          Tus datos se guardan en el almacenamiento interno de este navegador (IndexedDB). No se sincronizan con otros dispositivos. Recordá hacer una <strong>Copia de Seguridad</strong> periódicamente desde Configuración.
        </div>
      </div>
    </div>
  );
};
