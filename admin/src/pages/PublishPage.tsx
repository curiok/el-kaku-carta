import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Database,
  ArrowUpCircle,
  ArrowDownCircle,
  Server,
  Settings as SettingsIcon
} from 'lucide-react';
import { getCategories, getProducts, getOptionGroups, getSettings } from '../db';
import {
  checkPublisherStatus,
  publishMenu,
  getPublisherUrl,
  setCustomPublisherUrl,
  type PublisherStatus
} from '../api/publisher';
import { checkSupabaseConnection, syncAllToSupabase, pullFromSupabase } from '../supabase';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import type { BusinessSettings } from '../types';

export const PublishPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Backend status
  const [publisherState, setPublisherState] = useState<{
    connected: boolean;
    type?: 'local' | 'cloud';
    status?: PublisherStatus;
    error?: string;
  }>({ connected: false });
  const [isCheckingPublisher, setIsCheckingPublisher] = useState(false);

  // Custom backend URL configuration
  const [showConfig, setShowConfig] = useState(false);
  const [backendUrlInput, setBackendUrlInput] = useState(getPublisherUrl());

  // Supabase Sync status
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: 'Comprobando estado de Supabase...'
  });
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  // Publishing operation
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    commitSha?: string;
    filesCount?: number;
    error?: string;
    publicUrl?: string;
  } | null>(null);

  const { showSuccess, showError, showWarning } = useToast();

  const refreshPublisherStatus = async () => {
    setIsCheckingPublisher(true);
    try {
      const res = await checkPublisherStatus();
      setPublisherState(res);
    } catch {
      setPublisherState({ connected: false, error: 'No se pudo conectar con el backend.' });
    } finally {
      setIsCheckingPublisher(false);
    }
  };

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
    checkSupabaseConnection().then(setSupabaseStatus);
    refreshPublisherStatus();
  }, []);

  const handleSaveCustomUrl = () => {
    setCustomPublisherUrl(backendUrlInput);
    showSuccess('URL del backend actualizada.');
    refreshPublisherStatus();
  };

  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await syncAllToSupabase();
      if (res.success) {
        showSuccess(`¡Sincronización completada! ${res.count} elementos sincronizados con Supabase.`);
        checkSupabaseConnection().then(setSupabaseStatus);
      } else {
        showError(res.error || 'Error al sincronizar con Supabase.');
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await pullFromSupabase();
      if (res.success) {
        showSuccess(`¡Datos descargados de Supabase con éxito! (${res.count} registros).`);
      } else {
        showError(res.error || 'Error al descargar de Supabase.');
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handlePublish = async () => {
    if (!isAuthenticated) {
      showError('Debés estar autenticado como administrador para publicar la carta digital.');
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const [cats, prods, opts, setts] = await Promise.all([
        getCategories(),
        getProducts(),
        getOptionGroups(),
        getSettings()
      ]);

      const res = await publishMenu({
        business: setts,
        categories: cats,
        products: prods,
        optionGroups: opts
      });

      setPublishResult(res);

      if (res.success) {
        showSuccess('¡Carta Digital publicada exitosamente en GitHub Pages!');
        refreshPublisherStatus();
      } else {
        showError(res.error || 'Error al publicar la carta digital.');
      }
    } catch (err: any) {
      setPublishResult({
        success: false,
        error: err.message
      });
      showError(`Error inesperado: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const publicUrl = settings?.github?.publicUrl || 'https://curiok.github.io/el-kaku-carta/';
  const repo = settings?.github?.repo || 'curiok/el-kaku-carta';
  const branch = settings?.github?.branch || 'gh-pages';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Publicar Carta Digital</h2>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Publicá el sitio completo compilado (HTML, assets, datos y fotos) en GitHub Pages ({repo})
        </span>
      </div>

      {/* MAIN PUBLICATION CARD (EL PATIO METHOD) */}
      <div
        className="card"
        style={{
          border: '1px solid var(--color-primary)',
          background: 'linear-gradient(180deg, rgba(201, 154, 22, 0.08) 0%, rgba(23, 19, 13, 0.95) 100%)',
          padding: '16px',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 10px rgba(201, 154, 22, 0.3)'
              }}
            >
              <UploadCloud size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Publicación en GitHub Pages</h3>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Destino oficial: <code style={{ color: 'var(--color-primary)' }}>{repo}</code> ({branch})
              </p>
            </div>
          </div>

          {/* Backend Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: publisherState.connected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: publisherState.connected ? '#22c55e' : '#f59e0b',
                border: `1px solid ${publisherState.connected ? '#22c55e' : '#f59e0b'}`
              }}
            >
              <Server size={10} />
              {publisherState.connected
                ? (publisherState.type === 'cloud' ? 'Servicio Cloud Activo' : 'Servicio Listo')
                : 'Servicio Cloud Listo'}
            </span>
            <button
              onClick={refreshPublisherStatus}
              title="Comprobar estado del backend"
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <RefreshCw size={14} className={isCheckingPublisher ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            marginBottom: '14px',
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--color-primary)'
          }}
        >
          <strong>Publicación 100% Móvil:</strong> Al tocar el botón, se publica automáticamente la versión completa de la carta (HTML, assets, datos y fotos) en GitHub Pages sin requerir ninguna computadora. Las credenciales de GitHub se procesan de forma segura en el servidor remoto.
        </div>

        {/* Action Button: Publicar Carta Digital */}
        <button
          className="btn btn-primary btn-block"
          style={{ fontSize: '14px', padding: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}
          disabled={isPublishing}
          onClick={handlePublish}
        >
          {isPublishing ? (
            <>
              <RefreshCw size={18} className="animate-spin" /> Publicando en GitHub Pages...
            </>
          ) : (
            <>
              <UploadCloud size={18} /> PUBLICAR CARTA DIGITAL
            </>
          )}
        </button>

        {/* Publication Success Details */}
        {publishResult?.success && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid #22c55e',
              marginTop: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>
              <CheckCircle size={16} /> ¡Publicación confirmada por GitHub!
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '10px' }}>
              • <strong>Commit SHA:</strong> <code style={{ color: '#fff' }}>{publishResult.commitSha?.slice(0, 7)}</code><br />
              • <strong>Total de archivos:</strong> {publishResult.filesCount || 22} archivos estáticos actualizados<br />
              • <strong>Rama:</strong> {branch}
            </div>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-sm btn-block"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <ExternalLink size={14} /> VISITAR CARTA PUBLICADA
            </a>
          </div>
        )}

        {/* Publication Error Details */}
        {publishResult?.success === false && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              marginTop: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 800, fontSize: '13px', marginBottom: '4px' }}>
              <AlertCircle size={16} /> No se pudo completar la publicación
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {publishResult.error || 'Ocurrió un inconveniente al conectar con el servicio de publicación. Verificá tu conexión a internet.'}
            </div>
          </div>
        )}

        {/* Advanced Backend URL Configuration Toggle */}
        <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <SettingsIcon size={12} /> Configuración avanzada de URL de backend
          </button>

          {showConfig && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '12px', padding: '6px 8px' }}
                placeholder="http://127.0.0.1:3145 o http://192.168.1.X:3145"
                value={backendUrlInput}
                onChange={e => setBackendUrlInput(e.target.value)}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSaveCustomUrl}
                style={{ whiteSpace: 'nowrap', fontSize: '11px' }}
              >
                Guardar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUPABASE CLOUD DATABASE SYNC */}
      <div
        className="card"
        style={{
          background: 'rgba(23, 19, 13, 0.95)',
          border: '1px solid rgba(201, 154, 22, 0.4)',
          marginBottom: '16px',
          padding: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text)' }}>
              Base de Datos Central Supabase (Enlace en Vivo)
            </h3>
          </div>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 700,
              background: supabaseStatus.connected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: supabaseStatus.connected ? '#22c55e' : '#ef4444',
              border: `1px solid ${supabaseStatus.connected ? '#22c55e' : '#ef4444'}`
            }}
          >
            {supabaseStatus.connected ? 'En Línea' : 'Pendiente Tablas'}
          </span>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '12px', lineHeight: 1.4 }}>
          {supabaseStatus.message}
          <br />
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Nota importante:</span> La carta pública de los clientes consulta directamente esta base de datos en tiempo real. Cualquier cambio de precios o platos se refleja al instante para los clientes sin necesidad de recompilar el sitio.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontSize: '11px', gap: '6px', justifyContent: 'center' }}
            onClick={handleSyncToSupabase}
            disabled={isSyncingSupabase}
          >
            {isSyncingSupabase ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <ArrowUpCircle size={14} />
            )}
            <span>Subir a Supabase</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', gap: '6px', justifyContent: 'center' }}
            onClick={handlePullFromSupabase}
            disabled={isSyncingSupabase}
          >
            {isSyncingSupabase ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <ArrowDownCircle size={14} />
            )}
            <span>Bajar de Supabase</span>
          </button>
        </div>
      </div>
    </div>
  );
};
