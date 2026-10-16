import type { Category, Product, OptionGroup, BusinessSettings } from '../types';
import { supabase } from '../supabase';

export function getPublisherUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('kaku_publisher_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '');
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://${window.location.hostname}:3145`;
    }
  }
  return import.meta.env.VITE_PUBLISHER_URL || 'http://127.0.0.1:3145';
}

export function setCustomPublisherUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('kaku_publisher_url');
    } else {
      localStorage.setItem('kaku_publisher_url', url.trim());
    }
  }
}

export interface PublisherStatus {
  ok: boolean;
  service?: string;
  configured: boolean;
  repo: string;
  branch: string;
  publicUrl: string;
  isPublishing?: boolean;
  lastPublish?: {
    success: boolean;
    timestamp: string;
    commitSha?: string;
    filesCount?: number;
    error?: string;
  } | null;
}

export async function checkPublisherStatus(): Promise<{
  connected: boolean;
  type?: 'local' | 'cloud';
  status?: PublisherStatus;
  error?: string;
}> {
  // 1. Priorizar servicio Cloud en Supabase Edge Functions (100% autónomo para celular)
  try {
    const { data, error } = await supabase.functions.invoke('publish-menu', {
      method: 'GET'
    });

    if (!error && data && data.ok) {
      return {
        connected: true,
        type: 'cloud',
        status: {
          ok: true,
          configured: data.configured,
          repo: data.repo,
          branch: data.branch,
          publicUrl: data.publicUrl,
          service: 'Servicio Cloud Activo (Supabase Edge)'
        }
      };
    }
  } catch {
    // Si falla la consulta al servicio cloud, intentar backend local abajo
  }

  // 2. Probar backend local / URL personalizada
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${getPublisherUrl()}/api/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: PublisherStatus = await res.json();
      return { connected: true, type: 'local', status: data };
    }
  } catch {
    // Backend local no disponible
  }

  return {
    connected: false,
    error: 'Servicio de publicación temporalmente no disponible.'
  };
}

export interface PublishPayload {
  business: BusinessSettings;
  categories: Category[];
  products: Product[];
  optionGroups: OptionGroup[];
}

export async function publishMenu(payload: PublishPayload): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  commitSha?: string;
  filesCount?: number;
  uploadedCount?: number;
  publicUrl?: string;
}> {
  // 1. Publicación oficial remota mediante Supabase Edge Function (Desde el Celular)
  try {
    const { data, error } = await supabase.functions.invoke('publish-menu', {
      body: payload
    });

    if (!error && data && data.success) {
      return {
        success: true,
        commitSha: data.commitSha,
        filesCount: data.filesCount || 1,
        uploadedCount: data.uploadedCount || 1,
        publicUrl: data.publicUrl || 'https://curiok.github.io/el-kaku-carta/',
        message: data.message || 'Carta Digital publicada con éxito en GitHub Pages.'
      };
    }

    if (error || (data && !data.success)) {
      const edgeMsg = error?.message || data?.error || data?.message;
      if (edgeMsg && !edgeMsg.includes('Failed to send a request') && !edgeMsg.includes('Function not found')) {
        return {
          success: false,
          error: edgeMsg
        };
      }
    }
  } catch {
    // Si falla el servicio cloud, intentar fallback a backend local
  }

  // 2. Fallback a backend local / URL personalizada si estuviese configurado
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const res = await fetch(`${getPublisherUrl()}/api/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.message || data.error || `Error HTTP ${res.status} al publicar`
      };
    }

    return {
      success: true,
      commitSha: data.commitSha,
      filesCount: data.filesCount,
      uploadedCount: data.uploadedCount,
      publicUrl: data.publicUrl,
      message: data.message
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'No se pudo completar la publicación. Verificá la conexión a internet de tu celular.'
    };
  }
}

export async function exportLocalBundle(payload: PublishPayload): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  localPath?: string;
}> {
  try {
    const res = await fetch(`${getPublisherUrl()}/api/export-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.message || 'Error al exportar estáticos' };
    }
    return { success: true, message: data.message, localPath: data.localPath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
