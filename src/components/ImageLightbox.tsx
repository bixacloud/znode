import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setRotation(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.25, 3)); }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.25, 0.5)); }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setRotation(r => r + 90); }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Rotate"
        >
          <RotateCw className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt || 'Image'}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[90vh] object-contain transition-transform duration-200"
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
        }}
      />
    </div>
  );
}

// Hook to process HTML content and make images clickable thumbnails
export function useImageLightbox() {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const openLightbox = (src: string) => setLightboxImage(src);
  const closeLightbox = () => setLightboxImage(null);

  return { lightboxImage, openLightbox, closeLightbox };
}

// Component to render HTML content with clickable thumbnail images
interface HtmlContentWithImagesProps {
  html: string;
  className?: string;
}

export function HtmlContentWithImages({ html, className }: HtmlContentWithImagesProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // After render, find all images and make them clickable thumbnails
  useEffect(() => {
    if (!containerRef.current) return;

    const images = containerRef.current.querySelectorAll('img');
    images.forEach((img) => {
      // Style as thumbnail
      img.style.maxWidth = '200px';
      img.style.maxHeight = '150px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '0.375rem';
      img.style.border = '1px solid hsl(var(--border))';
      img.style.cursor = 'pointer';
      img.style.transition = 'opacity 0.2s';
      
      // Store original src
      const originalSrc = img.src;
      
      // Add click handler
      const handleImgClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        setLightboxSrc(originalSrc);
      };
      
      img.addEventListener('click', handleImgClick);
      
      // Hover effect
      img.addEventListener('mouseenter', () => {
        img.style.opacity = '0.8';
      });
      img.addEventListener('mouseleave', () => {
        img.style.opacity = '1';
      });
    });

    // Cleanup
    return () => {
      images.forEach((img) => {
        img.replaceWith(img.cloneNode(true));
      });
    };
  }, [html]);

  return (
    <>
      <div 
        ref={containerRef}
        className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ImageLightbox 
        src={lightboxSrc || ''} 
        isOpen={!!lightboxSrc} 
        onClose={() => setLightboxSrc(null)} 
      />
    </>
  );
}

export default ImageLightbox;
