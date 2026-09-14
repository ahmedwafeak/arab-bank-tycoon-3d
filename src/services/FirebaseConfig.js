/**
 * FirebaseConfig.js
 * Configuration provider for Google Firebase services (Auth & Firestore)
 * Supports environment variables, custom runtime config, or graceful fallback.
 */

// Default configuration keys (can be populated via .env or settings modal)
export const defaultFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

/**
 * Retrieves the active Firebase configuration
 */
export function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem('bank_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved Firebase config from localStorage:', e);
  }

  return defaultFirebaseConfig;
}

/**
 * Checks if a valid Firebase configuration is active
 */
export function isFirebaseConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.apiKey.length > 5);
}

/**
 * Saves custom Firebase credentials at runtime (e.g. from developer settings modal)
 */
export function saveFirebaseConfig(config) {
  if (!config || !config.apiKey || !config.projectId) {
    throw new Error('يرجى التأكد من إدخال API Key و Project ID بشكل صحيح.');
  }
  localStorage.setItem('bank_firebase_config', JSON.stringify(config));
  window.location.reload();
}
