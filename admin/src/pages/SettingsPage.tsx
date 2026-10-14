import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Phone,
  DollarSign,
  Palette,
  Truck,
  Store,
  Download,
  Upload,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  Github,
  Save,
  Lock,
  KeyRound,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { getSettings, saveSettings, exportBackupData, importBackupData } from '../db';
import { normalizeWhatsAppNumber } from '../utils/whatsapp';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import type { BusinessSettings, BackupData } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showSuccess, showError, showWarning } = useToast();
  const { currentUser, changeCredentials, logout } = useAuth();

  // Admin Credentials form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(currentUser || 'curi');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  const loadSettings = async () => {
    try {
      const s = await getSettings();
      setSettings(s);
    } catch (err: any) {
      showError(`Error al cargar configuración: ${err.message}`);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (!settings) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando configuración...</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Validate phone number
      const cleanPhone = normalizeWhatsAppNumber(settings.whatsappNumber);
      if (cleanPhone.length < 8) {
        showWarning('El número de WhatsApp no parece ser válido. Verificá el código de área.');
        setIsSaving(false);
        return;
      }

      await saveSettings(settings);
      showSuccess('Configuración guardada correctamente.');
    } catch (err: any) {
      showError(`Error al guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = await exportBackupData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `el-kaku-respaldo-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showSuccess('Copia de seguridad descargada exitosamente.');
    } catch (err: any) {
      showError(`Error al exportar: ${err.message}`);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirm = window.confirm(
      '¿Estás seguro de que deseás restaurar esta copia de seguridad? Se reemplazarán los datos locales actuales de este dispositivo.'
    );
    if (!confirm) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      const res = await importBackupData(backupData);
      showSuccess(res.message);
      await loadSettings();
    } catch (err: any) {
      showError(`Error al importar respaldo: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showWarning('Por favor, ingresá tu contraseña actual para confirmar el cambio.');
      return;
    }
    if (!newUsername.trim()) {
      showWarning('El nombre de usuario no puede estar vacío.');
      return;
    }
    if (newPassword.length < 5) {
      showWarning('La nueva contraseña debe tener al menos 5 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Las contraseñas no coinciden. Verificalas.');
      return;
    }

    setIsUpdatingCreds(true);
    try {
      const res = await changeCredentials(currentPassword, newUsername.trim(), newPassword);
      if (res.success) {
        showSuccess('¡Credenciales actualizadas correctamente!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(res.error || 'No se pudieron actualizar las credenciales.');
      }
    } catch (err: any) {
      showError(`Error: ${err.message}`);
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Configuración</h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Personalización del negocio, seguridad y respaldos
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="btn btn-secondary btn-sm"
          style={{ borderColor: 'var(--color-flame-red)', color: 'var(--color-flame-red)' }}
          title="Cerrar sesión en este dispositivo"
        >
          <LogOut size={14} /> Salir
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* General Business Data */}
        <div className="card">
          <h4 className="card-title">
            <Store size={16} color="var(--color-primary)" /> Datos del Negocio
          </h4>

          <div className="form-group">
            <label className="form-label">Nombre del Negocio</label>
            <input
              type="text"
              className="form-input"
              value={settings.businessName}
              onChange={e => setSettings({ ...settings, businessName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Título Visible de la Carta</label>
            <input
              type="text"
              className="form-input"
              value={settings.menuTitle}
              onChange={e => setSettings({ ...settings, menuTitle: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Número de WhatsApp (con código de país)</label>
            <input
              type="text"
              className="form-input"
              placeholder="+54 9 3821 40-6662"
              value={settings.whatsappNumber}
              onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value })}
              required
            />
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Número normalizado para wa.me: <code>{normalizeWhatsAppNumber(settings.whatsappNumber)}</code>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Texto de Bienvenida</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '60px' }}
              value={settings.welcomeText}
              onChange={e => setSettings({ ...settings, welcomeText: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Texto de Contacto / Dirección</label>
            <input
              type="text"
              className="form-input"
              value={settings.contactText}
              onChange={e => setSettings({ ...settings, contactText: e.target.value })}
            />
          </div>
        </div>

        {/* Delivery & Modalities */}
        <div className="card">
          <h4 className="card-title">
            <Truck size={16} color="#38bdf8" /> Modalidades de Pedido
          </h4>

          <div className="form-group">
            <div className="switch-wrapper">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Habilitar Delivery</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Solicita nombre y dirección de entrega al cliente
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.deliveryEnabled}
                  onChange={e => setSettings({ ...settings, deliveryEnabled: e.target.checked })}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          {settings.deliveryEnabled && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
              <label className="form-label">Tipo de Cobro de Envío</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  className={`btn ${settings.deliveryFeeMode !== 'paid' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '13px', padding: '10px' }}
                  onClick={() => setSettings({ ...settings, deliveryFeeMode: 'free', deliveryFee: 0 })}
                >
                  Envío gratis
                </button>
                <button
                  type="button"
                  className={`btn ${settings.deliveryFeeMode === 'paid' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '13px', padding: '10px' }}
                  onClick={() => setSettings({
                    ...settings,
                    deliveryFeeMode: 'paid',
                    deliveryFee: settings.deliveryFee > 0 ? settings.deliveryFee : 1500
                  })}
                >
                  Cobrar envío
                </button>
              </div>

              {settings.deliveryFeeMode === 'paid' ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Precio del Envío ($ ARS)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    step="100"
                    placeholder="Ej. 1500"
                    value={settings.deliveryFee}
                    onChange={e => setSettings({ ...settings, deliveryFee: Math.max(0, Number(e.target.value)) })}
                    required
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Se sumará al total en la carta digital cuando el cliente elija Delivery. El mensaje de WhatsApp seguirá sin mostrar precios.
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  fontSize: '11px',
                  color: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>✓ El envío está configurado como <strong>Gratis</strong> ($0) para los clientes.</span>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <div className="switch-wrapper">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Habilitar Retiro en Local</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Solicita nombre del cliente para retirar en mostrador
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.pickupEnabled}
                  onChange={e => setSettings({ ...settings, pickupEnabled: e.target.checked })}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Visual Theme */}
        <div className="card">
          <h4 className="card-title">
            <Palette size={16} color="#ec4899" /> Identidad Visual y Colores
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Color Principal</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.theme?.primary || '#f59e0b'}
                  onChange={e => setSettings({
                    ...settings,
                    theme: { ...settings.theme, primary: e.target.value }
                  })}
                  style={{ width: '40px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px' }}>{settings.theme?.primary || '#f59e0b'}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Color Secundario</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.theme?.secondary || '#e11d48'}
                  onChange={e => setSettings({
                    ...settings,
                    theme: { ...settings.theme, secondary: e.target.value }
                  })}
                  style={{ width: '40px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px' }}>{settings.theme?.secondary || '#e11d48'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          style={{ marginBottom: '20px' }}
          disabled={isSaving}
        >
          <Save size={16} /> Guardar Configuración
        </button>
      </form>

      {/* Security and Admin Credentials Section */}
      <div className="card">
        <h4 className="card-title">
          <Lock size={16} color="var(--color-gold)" /> Credenciales y Seguridad del Panel
        </h4>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
          Cambiá el usuario y la contraseña de ingreso en este celular. La contraseña se almacena de forma segura usando derivación criptográfica PBKDF2 (SHA-256) con sal aleatoria.
        </p>

        <form onSubmit={handleUpdateCredentials}>
          <div className="form-group">
            <label className="form-label">Contraseña Actual</label>
            <input
              type="password"
              className="form-input"
              placeholder="Ingresá tu contraseña actual (ej. curiok)"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nuevo Usuario</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre de usuario"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Nueva Contraseña</label>
              <input
                type="password"
                className="form-input"
                placeholder="Mínimo 5 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Contraseña</label>
              <input
                type="password"
                className="form-input"
                placeholder="Repetir contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-secondary btn-block"
            disabled={isUpdatingCreds}
            style={{ marginTop: '4px', borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}
          >
            <KeyRound size={16} /> {isUpdatingCreds ? 'Actualizando...' : 'Actualizar Credenciales'}
          </button>
        </form>

        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          background: 'rgba(201, 154, 22, 0.08)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(201, 154, 22, 0.25)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          lineHeight: '1.45'
        }}>
          <strong style={{ color: 'var(--color-gold)' }}>⚠️ Nota sobre almacenamiento local:</strong> Las credenciales se guardan exclusivamente en el almacenamiento seguro de este celular. Si abrís el panel desde otro celular, ese dispositivo tendrá su propio acceso local y no se sincronizará automáticamente.
        </div>
      </div>

      {/* Backup & Recovery Section */}
      <div className="card">
        <h4 className="card-title">
          <Download size={16} color="#22c55e" /> Copia de Seguridad y Recuperación
        </h4>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
          Exportá todos tus productos, fotos, categorías, opciones y pedidos locales a un archivo JSON seguro para respaldar o mover a otro celular.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleExportBackup}
          >
            <Download size={16} /> Descargar Copia de Seguridad (JSON)
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json,application/json"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} /> Restaurar desde Archivo JSON
          </button>
        </div>
      </div>
    </div>
  );
};
