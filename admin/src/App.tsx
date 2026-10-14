import React, { useState, useEffect } from 'react';
import {
  Home,
  UtensilsCrossed,
  FolderTree,
  ShoppingBag,
  UploadCloud,
  Settings as SettingsIcon,
  ExternalLink,
  Download,
  LogOut
} from 'lucide-react';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { OrdersPage } from './pages/OrdersPage';
import { PublishPage } from './pages/PublishPage';
import { SettingsPage } from './pages/SettingsPage';
import { getSettings } from './db';
import type { BusinessSettings } from './types';
import './styles/admin.css';

function AdminMainContent() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'orders' | 'publish' | 'settings'>('dashboard');
  const [openNewProductModal, setOpenNewProductModal] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated) {
      getSettings().then(setSettings).catch(console.error);
    }

    // PWA Install prompt listener
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isAuthenticated]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Para instalar en tu celular: abrí las opciones del navegador (los 3 puntos) y tocá "Agregar a la pantalla principal" o "Instalar aplicación".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleNewProductFromDashboard = () => {
    setActiveTab('products');
    setOpenNewProductModal(true);
  };

  // If auth is verifying session in sessionStorage
  if (isLoading) {
    return (
      <div className="login-splash-screen">
        <img src="logo-kaku.svg" width="96" height="96" alt="El Kaku" className="splash-logo" />
        <div className="login-spinner" style={{ marginTop: '20px' }}></div>
        <p style={{ marginTop: '14px', fontSize: '13px', fontWeight: 600, color: 'var(--color-gold)' }}>
          Iniciando El Kaku...
        </p>
      </div>
    );
  }

  // Not authenticated: strictly render login screen
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const publicUrl = settings?.github?.publicUrl || 'https://curiok.github.io/el-kaku-carta/';

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <header className="app-header">
        <div className="brand-wrapper" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo-badge">
            <img
              src="logo-kaku.svg"
              alt="Logo El Kaku"
              width="28"
              height="28"
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div className="brand-text">
            <h1>{settings?.businessName || 'El Kaku'}</h1>
            <span>Panel Local Móvil</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-icon-header"
            onClick={handleInstallClick}
            title="Instalar PWA en el celular"
          >
            <Download size={18} color="var(--color-primary)" />
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-icon-header"
            title="Ver Carta Pública en GitHub Pages"
          >
            <ExternalLink size={18} />
          </a>
          <button
            className="btn-icon-header"
            onClick={logout}
            title="Cerrar sesión"
          >
            <LogOut size={17} color="var(--color-flame-red)" />
          </button>
        </div>
      </header>

      {/* Dynamic Page Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardPage
            onNavigate={tab => setActiveTab(tab as any)}
            onNewProduct={handleNewProductFromDashboard}
          />
        )}
        {activeTab === 'products' && (
          <ProductsPage
            initialOpenNewModal={openNewProductModal}
            onResetNewModal={() => setOpenNewProductModal(false)}
          />
        )}
        {activeTab === 'categories' && <CategoriesPage />}
        {activeTab === 'orders' && <OrdersPage />}
        {activeTab === 'publish' && <PublishPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="nav-icon-wrapper">
            <Home size={18} />
          </div>
          <span>Inicio</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <div className="nav-icon-wrapper">
            <UtensilsCrossed size={18} />
          </div>
          <span>Carta</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <div className="nav-icon-wrapper">
            <FolderTree size={18} />
          </div>
          <span>Categorías</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <div className="nav-icon-wrapper">
            <ShoppingBag size={18} />
          </div>
          <span>Pedidos</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'publish' ? 'active' : ''}`}
          onClick={() => setActiveTab('publish')}
        >
          <div className="nav-icon-wrapper">
            <UploadCloud size={18} />
          </div>
          <span>Publicar</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <div className="nav-icon-wrapper">
            <SettingsIcon size={18} />
          </div>
          <span>Ajustes</span>
        </button>
      </nav>
    </div>
  );
}

export function AdminApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AdminMainContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default AdminApp;
