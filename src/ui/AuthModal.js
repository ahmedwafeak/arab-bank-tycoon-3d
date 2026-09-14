/**
 * AuthModal.js
 * Official Bank Employee ID & Google Cloud Save Modal
 * Allows players to:
 * 1. Sign in with Google (Gmail)
 * 2. View official Employee ID Badge
 * 3. Monitor real-time Cloud Save status
 * 4. Manually trigger Cloud Sync
 * 5. Configure or view Firebase connection
 */

import { authService } from '../services/AuthService.js';
import { cloudSaveService } from '../services/CloudSaveService.js';
import { isFirebaseConfigured, getFirebaseConfig, saveFirebaseConfig } from '../services/FirebaseConfig.js';

export class AuthModal {
  constructor(audio) {
    this.audio = audio;
    this.modalEl = null;
    this.statusUnsub = null;
    this.authUnsub = null;
  }

  show() {
    this.close();

    const user = authService.getCurrentUser();
    const isGoogle = authService.isLoggedInWithGoogle();
    const syncInfo = cloudSaveService.getStatusInfo();
    const cm = window.careerManager || (window.gameState ? window.gameState.careerManager : null);

    const displayName = user?.displayName || cm?.name || 'مصرفي الفرع';
    const avatarUrl = user?.photoURL || cm?.avatar || './assets/characters/player.jpg';
    const userEmail = user?.email || (isGoogle ? 'حساب Google معتمد' : 'غير مسجل (حساب جهاز محلي)');
    const jobTitle = cm?.stages?.[cm.currentStageIndex]?.title?.m || 'صراف الفرع المعتمد';
    const empId = user?.uid ? `EGY-${user.uid.substring(0, 7).toUpperCase()}` : 'EGY-GUEST-01';

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'bank-cloud-modal-overlay';
    this.modalEl.id = 'bank-cloud-auth-modal';

    this.modalEl.innerHTML = `
      <div class="bank-cloud-modal-box">
        <!-- Close Button -->
        <button class="modal-close-icon" id="btn-close-cloud-modal" title="إغلاق النافذة">✕</button>

        <!-- Header -->
        <div class="cloud-modal-header">
          <div class="cloud-header-badge">🏛️ الهوية المصرفية والربط السحابي</div>
          <h2 class="cloud-modal-title">بطاقة الموظف والحفظ السحابي</h2>
          <p class="cloud-modal-subtitle">بياناتك ومسيرتك المهنية محفوظة بأمان عبر سحابة Google</p>
        </div>

        <!-- Official Bank ID Card (كارنيه الموظف الفخم) -->
        <div class="employee-id-card-wrap">
          <div class="employee-id-card">
            <div class="id-card-top-strip">
              <span class="id-bank-logo">🏛️ بنك النيل للتنمية</span>
              <span class="id-badge-tag">${isGoogle ? '✓ معتمد سحابياً' : 'بطاقة مؤقتة'}</span>
            </div>

            <div class="id-card-body">
              <div class="id-photo-frame">
                <img src="${avatarUrl}" class="id-avatar-img" alt="${displayName}">
                <div class="id-photo-watermark">CBE</div>
              </div>

              <div class="id-details">
                <h3 class="id-name">${displayName}</h3>
                <div class="id-role">💼 ${jobTitle}</div>
                <div class="id-code">رقم القيد: <strong>${empId}</strong></div>
                <div class="id-email">📧 ${userEmail}</div>
              </div>
            </div>

            <div class="id-card-footer">
              <div class="id-barcode">||| | |||| | | ||||| ||| | |||</div>
              <div class="id-verified-seal">خاتم الإدارة المركزية</div>
            </div>
          </div>
        </div>

        <!-- Real-time Cloud Sync Status Pill -->
        <div class="cloud-sync-status-box">
          <div class="sync-status-left">
            <span class="sync-indicator-dot ${syncInfo.badgeClass}"></span>
            <div class="sync-status-texts">
              <strong class="sync-status-title" id="sync-status-label">${syncInfo.text}</strong>
              <span class="sync-status-time" id="sync-status-time">آخر مزامنة: ${syncInfo.formattedTime}</span>
            </div>
          </div>
          <button class="btn-sync-action-pill" id="btn-manual-sync-now" title="مزامنة فورية مع السحابة">
            <span>🔄</span>
            <span>مزامنة الآن</span>
          </button>
        </div>

        <!-- Action Buttons Grid -->
        <div class="cloud-actions-section">
          ${!isGoogle ? `
            <button class="btn-google-auth-login" id="btn-google-signin">
              <svg class="google-svg-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>تسجيل الدخول باستخدام Google</span>
            </button>
            <p class="google-auth-hint">احفظ رتبتك وأموالك وترقيات البنك حتى لا تفقدها عند مسح اللعبة أو تغيير هاتفك.</p>
          ` : `
            <div class="google-connected-box">
              <span class="connected-icon">✅</span>
              <div class="connected-info">
                <strong>حساب Google نشط ومتصل</strong>
                <span class="font-xs text-muted">${user.email}</span>
              </div>
              <button class="btn-signout-link" id="btn-google-signout">تسجيل الخروج</button>
            </div>
          `}
        </div>

        <!-- Developer Firebase Config Drawer (Collapsible) -->
        <div class="firebase-cfg-drawer">
          <button class="btn-toggle-cfg-drawer" id="btn-toggle-firebase-cfg">
            <span>⚙️ إعدادات مفاتيح Google Firebase (للمطور)</span>
            <span id="cfg-chevron">▼</span>
          </button>
          <div class="firebase-cfg-content hidden" id="firebase-cfg-content">
            <p class="font-xs text-muted mb-2">
              حالة اتصال Firebase: <strong>${isFirebaseConfigured() ? '🟢 مربوط بمشروع معتمد' : '🟡 يعمل محلياً ومستعد للربط السحابي'}</strong>
            </p>
            <div class="cfg-inputs-grid">
              <div>
                <label class="font-xs text-muted d-block mb-1">API Key</label>
                <input type="text" id="cfg-api-key" class="cfg-input" placeholder="AIzaSy..." value="${getFirebaseConfig().apiKey || ''}">
              </div>
              <div>
                <label class="font-xs text-muted d-block mb-1">Project ID</label>
                <input type="text" id="cfg-project-id" class="cfg-input" placeholder="bank-game-..." value="${getFirebaseConfig().projectId || ''}">
              </div>
            </div>
            <button class="btn-save-cfg-pill mt-2" id="btn-save-firebase-cfg">💾 حفظ إعدادات السحابة</button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(this.modalEl);
    this.bindEvents();

    // Subscribe to live sync updates while modal is open
    this.statusUnsub = cloudSaveService.onStatusChange((info) => {
      this.updateStatusDisplay(info);
    });
  }

  updateStatusDisplay(info) {
    const label = document.getElementById('sync-status-label');
    const time = document.getElementById('sync-status-time');
    const dot = this.modalEl?.querySelector('.sync-indicator-dot');

    if (label) label.textContent = info.text;
    if (time) time.textContent = `آخر مزامنة: ${info.formattedTime}`;
    if (dot) {
      dot.className = `sync-indicator-dot ${info.badgeClass}`;
    }
  }

  bindEvents() {
    if (!this.modalEl) return;

    // Close
    this.modalEl.querySelector('#btn-close-cloud-modal')?.addEventListener('click', () => {
      if (this.audio) this.audio.playClick();
      this.close();
    });

    // Close on backdrop
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        if (this.audio) this.audio.playClick();
        this.close();
      }
    });

    // Manual Sync Now
    this.modalEl.querySelector('#btn-manual-sync-now')?.addEventListener('click', async () => {
      if (this.audio) this.audio.playCash();
      const btn = document.getElementById('btn-manual-sync-now');
      if (btn) btn.disabled = true;
      await cloudSaveService.syncToCloud();
      if (btn) btn.disabled = false;
    });

    // Sign in with Google
    this.modalEl.querySelector('#btn-google-signin')?.addEventListener('click', async () => {
      if (this.audio) this.audio.playClick();
      const res = await authService.signInWithGoogle();
      if (res.success) {
        if (this.audio) this.audio.playSuccess();
        this.show(); // re-render with new profile
      } else if (res.error) {
        alert('حدث خطأ في تسجيل الدخول: ' + res.error);
      }
    });

    // Sign out
    this.modalEl.querySelector('#btn-google-signout')?.addEventListener('click', async () => {
      if (this.audio) this.audio.playClick();
      if (confirm('هل تريد تسجيل الخروج؟ ستتمكن من المتابعة كضيف أو تسجيل الدخول بحساب آخر.')) {
        await authService.signOut();
        this.show();
      }
    });

    // Toggle Firebase settings
    this.modalEl.querySelector('#btn-toggle-firebase-cfg')?.addEventListener('click', () => {
      const content = document.getElementById('firebase-cfg-content');
      const chev = document.getElementById('cfg-chevron');
      if (content) {
        const isHidden = content.classList.contains('hidden');
        if (isHidden) {
          content.classList.remove('hidden');
          if (chev) chev.textContent = '▲';
        } else {
          content.classList.add('hidden');
          if (chev) chev.textContent = '▼';
        }
      }
    });

    // Save Firebase keys
    this.modalEl.querySelector('#btn-save-firebase-cfg')?.addEventListener('click', () => {
      const apiKey = document.getElementById('cfg-api-key')?.value.trim();
      const projectId = document.getElementById('cfg-project-id')?.value.trim();
      if (!apiKey || !projectId) {
        alert('يرجى إدخال API Key و Project ID');
        return;
      }
      try {
        saveFirebaseConfig({ apiKey, projectId });
      } catch (e) {
        alert(e.message);
      }
    });
  }

  close() {
    if (this.statusUnsub) {
      this.statusUnsub();
      this.statusUnsub = null;
    }
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
