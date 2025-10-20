import React from 'react'
import { createRoot } from 'react-dom/client'
import App from "./App.tsx"
import "./index.css"
import "./lib/i18n"
import { HelmetProvider } from "react-helmet-async"
import { CookiesProvider } from "react-cookie"

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
      {/* App composes the full provider stack (Auth, Subscription, Localization, etc.) */}
      <App />
    </CookiesProvider>
  </HelmetProvider>
);
