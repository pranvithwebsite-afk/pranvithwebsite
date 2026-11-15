import React, { useEffect, useRef } from 'react';

const CinematicModal = ({ videoData, onClose }) => {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (videoData) {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) {
          dialog.showModal();
        }
      }
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close();
      }
    }
  }, [videoData]);

  // Handle ESC key or backdrop click
  const handleDialogClick = (e) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (onClose) onClose();
  };

  if (!videoData) return null;

  return (
    <dialog
      ref={dialogRef}
      id="player"
      className="cine-player"
      aria-labelledby="player-title"
      onClick={handleDialogClick}
      onClose={handleClose}
    >
      <div className="dialog-top">
        <h2 id="player-title">{videoData.title}</h2>
        <button
          type="button"
          id="close-player"
          aria-label="Close video"
          onClick={handleClose}
        >
          ✕
        </button>
      </div>

      <video
        ref={videoRef}
        id="full-video"
        src={videoData.src}
        controls
        autoPlay
        playsInline
        preload="metadata"
      />
    </dialog>
  );
};

export default CinematicModal;

