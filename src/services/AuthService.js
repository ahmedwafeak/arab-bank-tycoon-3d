/**
 * AuthService.js
 * Authentication Service supporting:
 * - Google Sign-In (Firebase Auth)
 * - Guest / Anonymous Play
 * - Cloud Profile & Avatar Sync
 */

import { getFirebaseConfig, isFirebaseConfigured } from './FirebaseConfig.js';

class AuthService {
  constructor() {
    this.auth = null;
    this.currentUser = null;
    this.listeners = [];
    this.isInitialized = false;
    this.initPromise = null;
  }

  /**
   * Initializes the Auth subsystem
   */
  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // 1. Check if Firebase is configured
      if (isFirebaseConfigured()) {
        try {
          const { initializeApp, getApps, getApp } = await import('firebase/app');
          const { getAuth, onAuthStateChanged } = await import('firebase/auth');

          const config = getFirebaseConfig();
          const app = getApps().length > 0 ? getApp() : initializeApp(config);
          this.auth = getAuth(app);

          onAuthStateChanged(this.auth, (user) => {
            if (user) {
              this.currentUser = {
                uid: user.uid,
                displayName: user.displayName || 'موظف البنك',
                email: user.email || '',
                photoURL: user.photoURL || './assets/characters/player.jpg',
                isAnonymous: user.isAnonymous,
                providerId: user.providerData?.[0]?.providerId || 'firebase'
              };
              this.saveLocalUserSession(this.currentUser);
            } else {
              this.loadSavedGuestSession();
            }
            this.notifyListeners();
          });

          this.isInitialized = true;
          return;
        } catch (err) {
          console.warn('Firebase Auth initialization error, falling back to local session:', err);
        }
      }

      // 2. Fallback to Local / Guest session if Firebase not configured
      this.loadSavedGuestSession();
      this.isInitialized = true;
      this.notifyListeners();
    })();

    return this.initPromise;
  }

  loadSavedGuestSession() {
    const saved = localStorage.getItem('bank_user_session');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        return;
      } catch (e) {
        console.warn('Failed to parse saved user session:', e);
      }
    }

    // Default Guest user
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
    this.currentUser = {
      uid: guestId,
      displayName: 'مصرفي ضيف (Guest)',
      email: '',
      photoURL: './assets/characters/player.jpg',
      isAnonymous: true,
      providerId: 'guest'
    };
    this.saveLocalUserSession(this.currentUser);
  }

  saveLocalUserSession(user) {
    if (!user) {
      localStorage.removeItem('bank_user_session');
    } else {
      localStorage.setItem('bank_user_session', JSON.stringify(user));
    }
  }

  /**
   * Listen for user login/logout changes
   */
  onAuthStateChange(callback) {
    this.listeners.push(callback);
    if (this.currentUser) {
      callback(this.currentUser);
    }
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    for (const cb of this.listeners) {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    }
  }

  /**
   * Signs in using Google Account
   */
  async signInWithGoogle() {
    await this.init();

    if (isFirebaseConfigured() && this.auth) {
      try {
        const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(this.auth, provider);
        const user = result.user;

        this.currentUser = {
          uid: user.uid,
          displayName: user.displayName || 'موظف البنك',
          email: user.email || '',
          photoURL: user.photoURL || './assets/characters/player.jpg',
          isAnonymous: false,
          providerId: 'google.com'
        };

        this.saveLocalUserSession(this.currentUser);
        this.notifyListeners();
        return { success: true, user: this.currentUser };
      } catch (err) {
        console.error('Google Sign-In Error:', err);
        return { success: false, error: err.message };
      }
    }

    // Interactive Demo / Standalone Mode when Firebase API keys not yet injected
    const mockEmail = prompt('أدخل بريد Gmail للتجربة أو المتابعة بحساب محلي (يمكنك ربط مفاتيح Firebase لاحقاً):', 'player@gmail.com');
    if (!mockEmail) return { success: false, cancelled: true };

    const name = mockEmail.split('@')[0] || 'مصرفي محترف';
    this.currentUser = {
      uid: 'google_mock_' + btoa(mockEmail).substring(0, 12),
      displayName: name,
      email: mockEmail,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      isAnonymous: false,
      providerId: 'google.com'
    };

    this.saveLocalUserSession(this.currentUser);
    this.notifyListeners();
    return { success: true, user: this.currentUser, simulated: true };
  }

  /**
   * Play as Guest with a custom or random name
   */
  signInAsGuest(customName = null) {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
    this.currentUser = {
      uid: guestId,
      displayName: customName || 'صراف الفرع (ضيف)',
      email: '',
      photoURL: './assets/characters/player.jpg',
      isAnonymous: true,
      providerId: 'guest'
    };

    this.saveLocalUserSession(this.currentUser);
    this.notifyListeners();
    return { success: true, user: this.currentUser };
  }

  /**
   * Sign out current user
   */
  async signOut() {
    if (this.auth && isFirebaseConfigured()) {
      try {
        const { signOut } = await import('firebase/auth');
        await signOut(this.auth);
      } catch (e) {
        console.warn('Firebase signout error:', e);
      }
    }

    this.loadSavedGuestSession();
    this.notifyListeners();
    return { success: true };
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedInWithGoogle() {
    return Boolean(this.currentUser && !this.currentUser.isAnonymous && this.currentUser.providerId === 'google.com');
  }
}

export const authService = new AuthService();
