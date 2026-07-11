import React, { useEffect, useRef } from 'react';
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

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Video player'}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close video" className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white transition hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-400 sm:right-6 sm:top-6">
        <X size={24} />
      </button>
      <div className="relative w-full max-w-6xl overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl">
        <SafeVideoEmbed videoType={detectMediaType(videoUrl)} videoUrl={videoUrl} title={title} posterUrl={posterUrl} className="w-full rounded-none" aspectRatio="aspect-video" autoPlay muted showPlayOverlay={false} loadWhenVisible={false} fit="contain" />
      </div>
    </div>
  );
};

export default VideoModal;
