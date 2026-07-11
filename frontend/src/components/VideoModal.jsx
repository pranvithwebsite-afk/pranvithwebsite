import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import SafeVideoEmbed, { detectMediaType } from './SafeVideoEmbed';

const VideoModal = ({ open, onClose, videoUrl, title, posterUrl }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !videoUrl) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Video player'}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close video" className="fixed right-3 top-3 z-[10001] flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/80 text-white shadow-xl transition hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-400 sm:right-6 sm:top-6">
        <X size={24} />
      </button>
      <div className="relative aspect-video w-[min(calc(100vw-24px),calc(70vh*16/9))] overflow-hidden rounded-[18px] border border-white/15 bg-black shadow-2xl sm:w-[min(85vw,1100px,calc(80vh*16/9))]">
        <SafeVideoEmbed videoType={detectMediaType(videoUrl)} videoUrl={videoUrl} title={title} posterUrl={posterUrl} className="w-full rounded-none" aspectRatio="aspect-video" autoPlay muted showPlayOverlay={false} loadWhenVisible={false} fit="contain" />
      </div>
    </div>,
    document.body
  );
};

export default VideoModal;
