import type { Category, Product, OptionGroup, BusinessSettings } from '../types';

const PUBLISHER_URL = 'http://127.0.0.1:3145';

export interface PublisherStatus {
  ok: boolean;
  service?: string;
  configured: boolean;
  repo: string;
  branch: string;
  publicUrl: string;
  lastPublish?: {
    success: boolean;
    timestamp: string;
    commitSha?: string;
    filesCount?: number;
    error?: string;
  } | null;
}

export async function checkPublisherStatus(): Promise<{ connected: boolean; status?: PublisherStatus; error?: string }> {
  try {
    const res = await fetch(`${PUBLISHER_URL}/api/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      return { connected: false, error: `El servicio respondió con error HTTP ${res.status}` };
    }
    const data: PublisherStatus = await res.json();
    return { connected: true, status: data };
  } catch (err) {
    return {
      connected: false,
      error: 'El servicio local de publicación no está activo en el puerto 3145.'
    };
  }
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
  publicUrl?: string;
}> {
  try {
    const res = await fetch(`${PUBLISHER_URL}/api/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

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
      publicUrl: data.publicUrl
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'No se pudo conectar con el servicio local de publicación.'
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
    const res = await fetch(`${PUBLISHER_URL}/api/export-local`, {
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
