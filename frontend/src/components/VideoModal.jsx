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
      <div className="relative aspect-video w-[min(calc(100vw-24px),calc(70vh*16/9))] overflow-hidden rounded-[18px] border border-white/15 bg-black shadow-2xl sm:w-[min(85vw,1100px,calc(80vh*16/9))]">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close video" className="absolute right-3 top-3 z-[10] flex h-[38px] w-[38px] items-center justify-center rounded-full border border-violet-400/70 bg-black/75 text-white shadow-[0_0_16px_rgba(139,92,246,0.55)] backdrop-blur-md transition hover:border-violet-300 hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-400 sm:h-[42px] sm:w-[42px]">
          <X size={22} />
        </button>
        <SafeVideoEmbed videoType={detectMediaType(videoUrl)} videoUrl={videoUrl} title={title} posterUrl={posterUrl} className="w-full rounded-none" aspectRatio="aspect-video" autoPlay muted showPlayOverlay={false} loadWhenVisible={false} fit="contain" />
      </div>
    </div>,
    document.body
  );
};

export default VideoModal;
