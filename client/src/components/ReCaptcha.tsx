import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      render: (container: string | HTMLElement, options: any) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
      ready: (callback: () => void) => void;
    };
  }
}

export interface ReCaptchaRef {
  reset: () => void;
  getValue: () => string | null;
}

interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
  size?: 'normal' | 'compact';
  theme?: 'light' | 'dark';
}

const ReCaptcha = forwardRef<ReCaptchaRef, ReCaptchaProps>(({ onVerify, size = 'normal', theme = 'light' }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    if (window.grecaptcha && widgetIdRef.current !== null) {
      window.grecaptcha.reset(widgetIdRef.current);
      onVerify(null);
    }
  }, [onVerify]);

  const getValue = useCallback(() => {
    if (window.grecaptcha && widgetIdRef.current !== null) {
      return window.grecaptcha.getResponse(widgetIdRef.current) || null;
    }
    return null;
  }, []);

  useImperativeHandle(ref, () => ({
    reset,
    getValue,
  }));

  const renderCaptcha = useCallback(() => {
    if (!window.grecaptcha || !containerRef.current || widgetIdRef.current !== null) {
      return;
    }

    try {
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // Test key - replace with real key
        callback: (token: string) => {
          onVerify(token);
        },
        'expired-callback': () => {
          onVerify(null);
        },
        'error-callback': () => {
          onVerify(null);
        },
        size,
        theme,
      });
    } catch (error) {
      console.error('Error rendering reCAPTCHA:', error);
    }
  }, [onVerify, size, theme]);

  // Load reCAPTCHA script if not already loaded
  const loadCaptcha = useCallback(() => {
    if (typeof window.grecaptcha !== 'undefined') {
      window.grecaptcha.ready(() => {
        renderCaptcha();
      });
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="recaptcha"]')) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (typeof window.grecaptcha !== 'undefined') {
          clearInterval(checkInterval);
          window.grecaptcha.ready(() => {
            renderCaptcha();
          });
        }
      }, 100);
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          renderCaptcha();
        });
      }
    };
    document.head.appendChild(script);
  }, [renderCaptcha]);

  // Initialize on mount
  React.useEffect(() => {
    loadCaptcha();
    
    return () => {
      // Cleanup
      if (widgetIdRef.current !== null) {
        widgetIdRef.current = null;
      }
    };
  }, [loadCaptcha]);

  return (
    <div className="flex justify-center">
      <div ref={containerRef} className="recaptcha-container" />
    </div>
  );
});

ReCaptcha.displayName = 'ReCaptcha';

export default ReCaptcha;