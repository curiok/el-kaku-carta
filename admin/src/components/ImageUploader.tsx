import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Star, ArrowLeft, ArrowRight, Eye, Loader2 } from 'lucide-react';
import { compressImageFile, getEstimatedSize } from '../utils/image';
import { Lightbox } from './Lightbox';
import { useToast } from './Toast';

interface ImageUploaderProps {
  images: string[];
  mainIndex: number;
  onChange: (images: string[], mainIndex: number) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  mainIndex,
  onChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { showError, showSuccess } = useToast();

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newImages = [...images];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          showError(`El archivo "${file.name}" no es una imagen válida.`);
          continue;
        }

        // Compress image using canvas
        const compressed = await compressImageFile(file, 1200, 0.82);
        newImages.push(compressed);
      }

      const newMain = newImages.length > 0 && mainIndex === -1 ? 0 : mainIndex;
      onChange(newImages, Math.min(newMain, newImages.length - 1));
      showSuccess(`${files.length} foto(s) agregada(s) y optimizada(s) con éxito.`);
    } catch (err: any) {
      showError(`Error al procesar las fotos: ${err.message}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetMain = (index: number) => {
    onChange(images, index);
  };

  const handleDelete = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    let updatedMain = mainIndex;
    if (index === mainIndex) {
      updatedMain = 0;
    } else if (index < mainIndex) {
      updatedMain = mainIndex - 1;
    }
    onChange(updated, updated.length > 0 ? Math.min(updatedMain, updated.length - 1) : 0);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;

    // Adjust main index
    let newMain = mainIndex;
    if (mainIndex === index) {
      newMain = target;
    } else if (mainIndex === target) {
      newMain = index;
    }

    onChange(copy, newMain);
  };

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Fotografías del Producto</span>
        <span>{images.length} imagen(es)</span>
      </label>

      {/* Hidden file input supporting camera & gallery */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesSelected}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />

      {/* Upload button area */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Optimizando...
            </>
          ) : (
            <>
              <Camera size={16} /> Subir desde Galería o Cámara
            </>
          )}
        </button>
      </div>

      {/* Images list / grid */}
      {images.length === 0 ? (
        <div
          style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: '13px'
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p>No hay fotos cargadas todavía.</p>
          <p style={{ fontSize: '11px', marginTop: '4px' }}>
            Tocá para seleccionar fotos de tu celular. Se optimizarán automáticamente.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px'
          }}
        >
          {images.map((imgUrl, idx) => {
            const isMain = idx === mainIndex;
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--color-surface)',
                  border: isMain ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {/* Image preview thumbnail */}
                <div
                  style={{
                    height: '110px',
                    position: 'relative',
                    cursor: 'pointer',
                    background: '#0a0d14'
                  }}
                  onClick={() => handleOpenLightbox(idx)}
                >
                  <img
                    src={imgUrl}
                    alt={`Foto ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  {isMain && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        background: 'var(--color-primary)',
                        color: '#111827',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '10px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Star size={10} fill="#111827" /> Principal
                    </span>
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#cbd5e1',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontSize: '10px'
                    }}
                  >
                    {getEstimatedSize(imgUrl)}
                  </span>
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenLightbox(idx);
                    }}
                  >
                    <Eye size={12} />
                  </button>
                </div>

                {/* Card controls */}
                <div
                  style={{
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4px',
                    background: 'var(--color-surface)'
                  }}
                >
                  {!isMain ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 6px', fontSize: '10px', flex: 1 }}
                      onClick={() => handleSetMain(idx)}
                    >
                      Hacer Principal
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 700, paddingLeft: '4px' }}>
                      Foto activa
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: '3px' }}>
                    {idx > 0 && (
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          padding: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleMove(idx, 'left')}
                      >
                        <ArrowLeft size={14} />
                      </button>
                    )}
                    {idx < images.length - 1 && (
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          padding: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleMove(idx, 'right')}
                      >
                        <ArrowRight size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-danger)',
                        padding: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleDelete(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox instance */}
      <Lightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};
