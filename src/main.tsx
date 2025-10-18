import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './hooks/useAuth.tsx'
import { WalletProvider } from './hooks/useWallet.tsx'
import { SubscriptionProvider } from './hooks/useSubscription.tsx'
import { HelmetProvider } from 'react-helmet-async'
import { CookiesProvider } from 'react-cookie'
import { I18nProvider } from './i18n/I18nProvider'

// Register service worker for PWA (disable in local dev to avoid caching issues)
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <CookiesProvider>
      <AuthProvider>
        <I18nProvider>
          <WalletProvider>
            <SubscriptionProvider>
              <App />
            </SubscriptionProvider>
          </WalletProvider>
        </I18nProvider>
      </AuthProvider>
    </CookiesProvider>
  </HelmetProvider>
);