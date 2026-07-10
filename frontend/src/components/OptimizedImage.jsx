import React from 'react';
import { FALLBACK_IMAGE, handleImageError, safeImageSrc } from '../lib/utils';

const OptimizedImage = ({
  src,
  alt = '',
  className = '',
  fallback = FALLBACK_IMAGE,
  priority = false,
  loading,
  decoding = 'async',
  width,
  height,
  fit = 'cover',
  fetchPriority,
  onError,
  ...props
}) => {
  const imageLoading = loading || (priority ? 'eager' : 'lazy');
  const style = {
    objectFit: fit,
    ...(props.style || {}),
  };

  return (
    <img
      src={safeImageSrc(src, fallback)}
      alt={alt}
      width={width}
      height={height}
      loading={imageLoading}
      decoding={decoding}
      fetchPriority={fetchPriority || (priority ? 'high' : undefined)}
      className={className}
      style={style}
      onError={onError || ((event) => handleImageError(event, fallback))}
      {...props}
    />
  );
};

export default OptimizedImage;
