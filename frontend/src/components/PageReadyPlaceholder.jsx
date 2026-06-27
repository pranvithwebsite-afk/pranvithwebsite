import React from 'react';

const PageReadyPlaceholder = () => (
  <div className="flex min-h-[calc(100vh-300px)] w-full items-center justify-center" aria-hidden="true">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-400 border-t-transparent" />
  </div>
);

export default PageReadyPlaceholder;
