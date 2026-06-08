/**
 * src/utils/analytics.js
 * ======================
 * Thin wrapper around Umami (privacy-first, self-hosted analytics — Task 3H).
 * Safe to call anywhere: if Umami isn't loaded, every call is a silent no-op.
 *
 * To enable: self-host Umami (free on Railway/Render) and add its script tag
 * to index.html with your VITE_UMAMI_WEBSITE_ID.
 */
export function track(event, data = {}) {
  try {
    if (typeof window !== 'undefined' && window.umami?.track) {
      window.umami.track(event, data)
    }
  } catch {
    /* analytics must never break the app */
  }
}
