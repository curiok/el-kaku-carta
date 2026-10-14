/**
 * Image processing utilities for El Kaku
 * Resizes and compresses images locally using HTML Canvas to keep IndexedDB fast and lean.
 */

export async function compressImageFile(file: File, maxDimension = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al cargar la imagen en memoria'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result as string);
        }

        // Draw image onto canvas maintaining aspect ratio
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to efficient JPEG Data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function getEstimatedSize(dataUrl: string): string {
  if (!dataUrl) return '0 KB';
  const stringLength = dataUrl.length - 'data:image/jpeg;base64,'.length;
  const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633438347;
  const sizeInKb = sizeInBytes / 1000;
  if (sizeInKb > 1024) {
    return `${(sizeInKb / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(sizeInKb)} KB`;
}
