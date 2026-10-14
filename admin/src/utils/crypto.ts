/**
 * El Kaku - Utilidades Criptográficas y de Seguridad (Web Crypto API)
 *
 * Implementa derivación de claves mediante PBKDF2 con SHA-256 y salt criptográfico
 * de 16 bytes (128 bits), con 100.000 iteraciones. Compatible de forma nativa con
 * Safari iOS, Chrome Android y navegadores modernos, sin almacenar contraseñas en texto plano.
 */

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function generateSalt(lengthBytes = 16): string {
  const salt = new Uint8Array(lengthBytes);
  window.crypto.getRandomValues(salt);
  return bytesToHex(salt);
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const saltBytes = hexToBytes(saltHex);

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256 // 32 bytes = 256 bits
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

export async function verifyPassword(
  passwordAttempt: string,
  saltHex: string,
  storedHashHex: string
): Promise<boolean> {
  try {
    if (!passwordAttempt || !saltHex || !storedHashHex) return false;
    const computedHash = await hashPassword(passwordAttempt, saltHex);
    // Constant-time length and equality comparison
    if (computedHash.length !== storedHashHex.length) return false;
    let match = true;
    for (let i = 0; i < computedHash.length; i++) {
      if (computedHash[i] !== storedHashHex[i]) {
        match = false;
      }
    }
    return match;
  } catch (err) {
    console.error('Error al verificar credenciales:', err);
    return false;
  }
}
