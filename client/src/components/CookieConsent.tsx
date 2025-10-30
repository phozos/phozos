import { useEffect } from 'react';
import CookieConsent from 'react-cookie-consent';
import { Link } from 'wouter';

const CONSENT_STORAGE_KEY = 'phozos_cookie_consent_v1';
const CONSENT_EXPIRY_DAYS = 365;

interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
  version: string;
}

export const CookieConsentManager = {
  getConsent(): ConsentPreferences | null {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!stored) return null;
      
      const consent = JSON.parse(stored) as ConsentPreferences;
      const expiryMs = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      if (Date.now() - consent.timestamp > expiryMs) {
        localStorage.removeItem(CONSENT_STORAGE_KEY);
        return null;
      }
      
      return consent;
    } catch (error) {
      console.error('Error reading cookie consent:', error);
      return null;
    }
  },

  setConsent(analytics: boolean, marketing: boolean): void {
    const consent: ConsentPreferences = {
      analytics,
      marketing,
      timestamp: Date.now(),
      version: '1.0',
    };
    
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
      this.applyConsent(consent);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  },

  hasAnalyticsConsent(): boolean {
    const consent = this.getConsent();
    return consent?.analytics ?? false;
  },

  hasMarketingConsent(): boolean {
    const consent = this.getConsent();
    return consent?.marketing ?? false;
  },

  applyConsent(consent: ConsentPreferences): void {
    if (consent.analytics) {
      this.enableAnalytics();
    } else {
      this.disableAnalytics();
    }

    if (consent.marketing) {
      this.enableMarketing();
    } else {
      this.disableMarketing();
    }
  },

  enableAnalytics(): void {
    if (typeof window === 'undefined') return;

    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    }
  },

  disableAnalytics(): void {
    if (typeof window === 'undefined') return;

    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }
  },

  enableMarketing(): void {
    if (typeof window === 'undefined') return;

    if (window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }

    if (window.fbq) {
      window.fbq('consent', 'grant');
    }
  },

  disableMarketing(): void {
    if (typeof window === 'undefined') return;

    if (window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }

    if (window.fbq) {
      window.fbq('consent', 'revoke');
    }
  },

  withdrawConsent(): void {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    this.disableAnalytics();
    this.disableMarketing();
  },
};

export function loadGoogleAnalytics(measurementId: string): void {
  if (!CookieConsentManager.hasAnalyticsConsent()) {
    return;
  }

  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure',
  });
}

export function loadFacebookPixel(pixelId: string): void {
  if (!CookieConsentManager.hasMarketingConsent()) {
    return;
  }

  if (window.fbq) {
    return;
  }

  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function (...args: any[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

export function CookieBanner() {
  useEffect(() => {
    const existingConsent = CookieConsentManager.getConsent();
    if (existingConsent) {
      CookieConsentManager.applyConsent(existingConsent);
    }
  }, []);

  const handleAccept = () => {
    CookieConsentManager.setConsent(true, true);
  };

  const handleDecline = () => {
    CookieConsentManager.setConsent(false, false);
  };

  return (
    <CookieConsent
      location="bottom"
      buttonText="Accept All Cookies"
      declineButtonText="Reject Non-Essential"
      enableDeclineButton
      cookieName="phozos_cookie_consent"
      style={{
        background: '#1f2937',
        padding: '20px',
        alignItems: 'center',
        zIndex: 9999,
      }}
      buttonStyle={{
        background: '#8B5CF6',
        color: '#ffffff',
        fontSize: '14px',
        padding: '10px 20px',
        borderRadius: '6px',
        fontWeight: 600,
      }}
      declineButtonStyle={{
        background: '#6b7280',
        color: '#ffffff',
        fontSize: '14px',
        padding: '10px 20px',
        borderRadius: '6px',
      }}
      expires={CONSENT_EXPIRY_DAYS}
      onAccept={handleAccept}
      onDecline={handleDecline}
    >
      <span style={{ fontSize: '14px' }}>
        We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
        By clicking "Accept All Cookies," you consent to our use of cookies.{' '}
        <Link href="/cookie-policy" style={{ color: '#8B5CF6', textDecoration: 'underline' }}>
          Learn more
        </Link>
      </span>
    </CookieConsent>
  );
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: any;
    _fbq: any;
  }
}
