import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || images.length === 0) return null;

  const prevImage = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button
        className="lightbox-close"
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Cerrar visor"
      >
        <X size={24} />
      </button>

      <div className="lightbox-img-wrapper" onClick={e => e.stopPropagation()}>
        <img
          src={images[currentIndex]}
          alt={`Imagen ${currentIndex + 1}`}
          className="lightbox-img"
        />
      </div>

      {images.length > 1 && (
        <div className="lightbox-nav" onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={prevImage}
            aria-label="Foto anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
            {currentIndex + 1} / {images.length}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={nextImage}
            aria-label="Siguiente foto"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
