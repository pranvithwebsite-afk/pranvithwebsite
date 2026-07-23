import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';

export default function GoogleSignIn({ onSuccess, onError, buttonText = 'Continue with Google' }) {
  const buttonRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || initializedRef.current) return;

    // Load Google Identity Services SDK if not already loaded
    if (!window.google?.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGSI;
      document.head.appendChild(script);
    } else {
      initializeGSI();
    }

    function initializeGSI() {
      if (initializedRef.current) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    }

    function handleCredentialResponse(response) {
      if (response?.credential) {
        onSuccess?.(response.credential);
      } else {
        onError?.(new Error('No credential returned from Google'));
      }
    }

    return () => {
      // Cleanup not strictly needed
    };
  }, [onSuccess, onError]);

  const handleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      onError?.(new Error('Google OAuth is not configured'));
      return;
    }
    if (window.google?.accounts) {
      window.google.accounts.id.prompt();
    }
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
        Google sign-in is not configured. Set REACT_APP_GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID.
      </div>
    );
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      type="button"
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
    >
      <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.97-5.97z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      {buttonText}
    </button>
  );
}
