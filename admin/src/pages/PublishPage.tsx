import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Copy,
  RefreshCw,
  Key,
  Smartphone,
  Globe,
  FileCode,
  HelpCircle,
  Database,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { getCategories, getProducts, getOptionGroups, getSettings } from '../db';
import {
  publishDirectFromMobile,
  getZeroTokenGitHubEditUrl,
  buildPublicMenuJson,
  type MobilePublishResult
} from '../api/mobile-publisher';
import { checkPublisherStatus, publishMenu } from '../api/publisher';
import { checkSupabaseConnection, syncAllToSupabase, pullFromSupabase } from '../supabase';
import { useToast } from '../components/Toast';
import type { BusinessSettings } from '../types';

export const PublishPage: React.FC = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [activeMode, setActiveMode] = useState<'mobile-token' | 'mobile-zero-token' | 'local-pc'>('mobile-token');

  // Supabase Sync status
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: 'Comprobando estado de Supabase...'
  });
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  // In-Memory Volatile Token (Never saved in IndexedDB or localStorage)
  const [sessionToken, setSessionToken] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishResult, setPublishResult] = useState<MobilePublishResult | null>(null);

  // Local PC publisher status
  const [pcConnected, setPcConnected] = useState<boolean>(false);

  const { showSuccess, showError, showWarning } = useToast();

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);

    // Check Supabase connection
    checkSupabaseConnection().then(setSupabaseStatus);

    // Check if PC publisher happens to be running
    checkPublisherStatus().then(res => {
      setPcConnected(res.connected);
    });
  }, []);

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

  const publicUrl = settings?.github?.publicUrl || 'https://curiok.github.io/el-kaku-carta/';
  const repo = settings?.github?.repo || 'curiok/el-kaku-carta';
  const branch = settings?.github?.branch || 'gh-pages';

  /* --- MODE 1: Direct Mobile Publish with in-memory token --- */
  const handleMobilePublish = async () => {
    if (!sessionToken.trim()) {
      showWarning('Por favor ingresá tu Token de GitHub para publicar.');
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

      const res = await publishDirectFromMobile({
        token: sessionToken,
        repo,
        branch,
        business: setts,
        categories: cats,
        products: prods,
        optionGroups: opts
      });

      setPublishResult(res);
      if (res.success) {
        showSuccess('¡Carta Digital publicada exitosamente desde tu celular!');
      } else {
        showError(res.error || 'Error al publicar.');
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

  /* --- MODE 2: Zero-Token Mobile Commit via GitHub Mobile Web --- */
  const handleZeroTokenPublish = async () => {
    try {
      const [cats, prods, opts, setts] = await Promise.all([
        getCategories(),
        getProducts(),
        getOptionGroups(),
        getSettings()
      ]);

      const publicData = buildPublicMenuJson(setts, cats, prods, opts);
      const jsonString = JSON.stringify(publicData, null, 2);

      await navigator.clipboard.writeText(jsonString);
      showSuccess('¡Datos de la carta copiados al portapapeles!');

      // Open GitHub Mobile Web Editor
      const editUrl = getZeroTokenGitHubEditUrl(repo, branch);
      window.open(editUrl, '_blank');
    } catch (err: any) {
      showError(`Error al preparar datos: ${err.message}`);
    }
  };

  /* --- MODE 3: Optional PC Publisher --- */
  const handlePcPublish = async () => {
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
        showSuccess('¡Carta Digital publicada mediante servicio local!');
      } else {
        showError(res.error || 'Error al publicar.');
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Publicar Carta Digital</h2>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Publicá los cambios directamente desde tu celular sin depender de una PC
        </span>
      </div>

      {/* SUPABASE REAL-TIME CLOUD DATABASE CARD */}
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
              Base de Datos Supabase (Nube Compartida)
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
            {supabaseStatus.connected ? 'Conectado' : 'Pendiente Tablas'}
          </span>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '12px', lineHeight: 1.4 }}>
          {supabaseStatus.message}
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

      {/* Mode Selector Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn btn-sm ${activeMode === 'mobile-token' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '11px', padding: '10px 6px', flexDirection: 'column', gap: '3px', height: 'auto' }}
          onClick={() => setActiveMode('mobile-token')}
        >
          <Smartphone size={16} />
          <span>Directo Móvil (1 Toque)</span>
        </button>

        <button
          className={`btn btn-sm ${activeMode === 'mobile-zero-token' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '11px', padding: '10px 6px', flexDirection: 'column', gap: '3px', height: 'auto' }}
          onClick={() => setActiveMode('mobile-zero-token')}
        >
          <Globe size={16} />
          <span>Vía GitHub Web Móvil</span>
        </button>
      </div>

      {/* MODE 1: Direct Mobile Publishing with Ephemeral Memory Token */}
      {activeMode === 'mobile-token' && (
        <div
          className="card"
          style={{
            border: '1px solid var(--color-primary)',
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(19, 27, 46, 1) 100%)',
            padding: '16px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
              }}
            >
              <UploadCloud size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Publicación Directa Móvil</h3>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Envía tus platos activos directamente a GitHub Pages por REST API
              </p>
            </div>
          </div>

          {/* In-Memory Token Input */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Key size={12} color="var(--color-primary)" /> Token de GitHub (PAT)
              </span>
              <span style={{ fontSize: '10px', color: '#22c55e', textTransform: 'none' }}>
                🔒 Solo en memoria RAM
              </span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="github_pat_... o ghp_..."
              value={sessionToken}
              onChange={e => setSessionToken(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '13px' }}
            />
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '5px', lineHeight: 1.4 }}>
              <strong>Seguridad garantizada:</strong> El token nunca se almacena en el celular (ni en cookies ni en base de datos). Permanece únicamente en memoria volátil durante la solicitud.
            </div>
          </div>

          {/* Action Button */}
          <button
            className="btn btn-primary btn-block"
            style={{ fontSize: '14px', padding: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
            disabled={isPublishing}
            onClick={handleMobilePublish}
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
        </div>
      )}

      {/* MODE 2: Zero-Token Mobile Commit via GitHub Mobile Web */}
      {activeMode === 'mobile-zero-token' && (
        <div
          className="card"
          style={{
            border: '1px solid #38bdf8',
            background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, rgba(19, 27, 46, 1) 100%)',
            padding: '16px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Globe size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Publicación 100% Sin Token</h3>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Utiliza tu propia sesión de GitHub en el navegador del celular
              </p>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
            Esta modalidad <strong>no requiere tokens</strong>. Al tocar el botón:
            <br />1. Se copia el archivo <code>menu.json</code> actualizado de tus platos.
            <br />2. Se abre el editor oficial de GitHub en tu celular.
            <br />3. Pegás y tocás <strong>"Commit changes"</strong> para actualizar la carta.
          </p>

          <button
            className="btn btn-block"
            style={{
              background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
              color: '#ffffff',
              fontSize: '14px',
              padding: '12px'
            }}
            onClick={handleZeroTokenPublish}
          >
            <Copy size={16} /> COPIAR Y ABRIR GITHUB EN EL CELULAR
          </button>
        </div>
      )}

      {/* Optional PC Local Service Notice */}
      {pcConnected && (
        <div
          className="card"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #22c55e',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: '#22c55e', fontWeight: 700, display: 'block' }}>
              Servidor local en PC detectado (puerto 3145)
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              También podés publicar a través de la PC si lo deseás.
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', padding: '6px 10px' }}
            disabled={isPublishing}
            onClick={handlePcPublish}
          >
            Publicar por PC
          </button>
        </div>
      )}

      {/* Result Card */}
      {publishResult && (
        <div
          className="card"
          style={{
            background: publishResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: publishResult.success ? '1px solid #22c55e' : '1px solid #ef4444',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {publishResult.success ? (
              <CheckCircle size={20} color="#22c55e" />
            ) : (
              <AlertCircle size={20} color="#ef4444" />
            )}
            <h4 style={{ fontSize: '14px', fontWeight: 800 }}>
              {publishResult.success ? 'Publicación Exitosa' : 'Error en la Publicación'}
            </h4>
          </div>

          {publishResult.success ? (
            <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>
              <p>{publishResult.message}</p>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                • Commit SHA: <code>{publishResult.commitSha?.substring(0, 7)}</code><br />
                • Carta en vivo: <a href={publicUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>{publicUrl}</a>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#fca5a5' }}>
              <p><strong>Detalle:</strong> {publishResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Live Public URL Card */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h4 className="card-title">
          <Globe size={16} color="var(--color-primary)" /> Enlace de tu Carta Digital
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
          Este es el enlace público que verán tus clientes:
        </p>
        <div
          style={{
            background: 'var(--color-surface)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            wordBreak: 'break-all',
            marginBottom: '12px'
          }}
        >
          <a href={publicUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            {publicUrl}
          </a>
        </div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-block btn-sm"
          style={{ textDecoration: 'none' }}
        >
          <ExternalLink size={14} /> Abrir Carta en GitHub Pages
        </a>
      </div>

      {/* Guide: How to create token from phone */}
      <div
        className="card"
        style={{
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px dashed var(--color-border)',
          fontSize: '12px',
          color: 'var(--color-text-muted)'
        }}
      >
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HelpCircle size={15} color="var(--color-primary)" /> ¿Cómo crear tu token desde el propio celular?
        </h4>
        <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
          <li>Abrí <code>github.com</code> en el navegador de tu celular con tu cuenta.</li>
          <li>Andá a tu perfil → <strong>Settings</strong> → <strong>Developer Settings</strong> → <strong>Personal Access Tokens</strong> → <strong>Fine-grained tokens</strong>.</li>
          <li>Tocá <strong>Generate new token</strong>.</li>
          <li>En <strong>Repository access</strong>, seleccioná <strong>Only select repositories</strong> y elegí <code>{repo}</code>.</li>
          <li>En <strong>Permissions → Repository permissions</strong>, poné <strong>Contents</strong> en <strong>Access: Read and write</strong>.</li>
          <li>Tocá <strong>Generate token</strong>, copialo y pegalo en la casilla de arriba cuando publiques.</li>
        </ol>
      </div>
    </div>
  );
};
