import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setErrorMessage('Por favor, completá tu usuario y contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(cleanUser, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Usuario o contraseña incorrectos.');
      }
    } catch (err: any) {
      setErrorMessage('Ocurrió un error al validar las credenciales. Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-container">
        {/* Logo Card */}
        <div className="login-brand-header">
          <div className="login-logo-circle">
            <img
              src="logo-kaku.svg"
              alt="Logo El Kaku"
              className="login-logo-img"
              width="104"
              height="104"
            />
          </div>
          <h1 className="login-title">EL KAKÚ</h1>
          <div className="login-badge">Rotisería & Parrilla • Panel Móvil</div>
          <p className="login-subtitle">
            Ingreso exclusivo para administración de la carta digital y pedidos
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="login-error-alert" role="alert">
            <AlertCircle size={18} className="login-error-icon" />
            <div className="login-error-text">{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* User Field */}
          <div className="login-field-group">
            <label className="login-label" htmlFor="kaku-username">
              Usuario
            </label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <User size={19} />
              </span>
              <input
                id="kaku-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="login-input"
                placeholder="Ingresá tu usuario"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="login-field-group">
            <label className="login-label" htmlFor="kaku-password">
              Contraseña
            </label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <Lock size={19} />
              </span>
              <input
                id="kaku-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="login-input with-toggle"
                placeholder="Ingresá tu contraseña"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="login-toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="login-spinner"></span>
                <span>Validando credenciales...</span>
              </>
            ) : (
              <>
                <LogIn size={20} />
                <span>INGRESAR</span>
              </>
            )}
          </button>
        </form>

        {/* Security and Initial Credential Notice */}
        <div className="login-security-notice">
          <div className="login-notice-badge">
            <ShieldCheck size={14} color="var(--color-gold)" />
            <span>Seguridad Local Criptográfica</span>
          </div>
          <p className="login-notice-text">
            Validación PBKDF2 con sal criptográfica en este dispositivo. Las credenciales no se transmiten ni sincronizan entre celulares.
          </p>
          <div className="login-credentials-hint">
            Credenciales iniciales configuradas: usuario <strong>curi</strong> / contraseña <strong>curiok</strong>. Podés cambiarlas en cualquier momento desde <em>Ajustes</em>.
          </div>
        </div>
      </div>
    </div>
  );
};
