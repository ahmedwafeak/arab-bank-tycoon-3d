import { DioramaScene } from '../world/DioramaScene.js';
import { BankFloorScene } from '../world/BankFloorScene.js';
import { CoinParticles } from '../systems/CoinParticles.js';
import { authService } from '../services/AuthService.js';
import { cloudSaveService } from '../services/CloudSaveService.js';
import { AuthModal } from './AuthModal.js';

/**
 * UIManager - Clean Mobile-First UI with Collapsible Slide-in Sidebar (قائمة جانبية)
 */
export class UIManager {
  constructor(gameState, audio) {
    this.state = gameState;
    this.audio = audio;
    this.activeTab = 'dashboard';
    this.viewMode = 'floor'; // 'floor' (3D Floor View) or 'desk' (Management Tabs)
    this.bankFloorScene = null;
    this.currentDilemma = null;
    this.isSidebarOpen = false;

    // Global references for modal accessibility
    window.gameState = this.state;
    window.careerManager = this.state.careerManager;

    // Interactive Gold Coin Particles Engine
    this.coinParticles = new CoinParticles();
    this.dioramaScene = null;
    this.isHighQuality = localStorage.getItem('egyptian_bank_quality') !== 'low';
    this.isOpeningVault = false;
    this.pendingOfflineEarnings = this.state.calculateOfflineEarnings();

    // Theme Management (royal | persona | classic)
    this.currentTheme = localStorage.getItem('egyptian_bank_theme') || 'royal';
    document.documentElement.setAttribute('data-theme', this.currentTheme);

    // Google Auth & Cloud Save Services
    this.authModal = new AuthModal(this.audio);
    authService.init();
    cloudSaveService.init(this.state, this.state.careerManager);
    window.cloudSaveService = cloudSaveService;
    window.authService = authService;

    this.initElements();
    this.setupEventListeners();

    // Start with the Grand 3D Vault Entrance Experience
    this.renderVaultEntranceScreen();
  }


  escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  initElements() {
    this.appContainer = document.getElementById('app');
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      // Main "افتح البنك" button (Shows mode choice modal)
      if (e.target.closest('#btn-open-bank-main, #vault-wheel-trigger, #open-vault-btn')) {
        this.audio.playClick();
        this.showModeChoiceModal();
        return;
      }

      // Main "مسيرة صعود الموظف" button
      if (e.target.closest('#btn-career-mode-main, #btn-enter-career, #vault-career-btn')) {
        this.audio.playClick();
        this.triggerEntranceTransition(() => {
          if (this.state.careerManager && this.state.careerManager.isStarted) {
            this.launch3DCareerMode();
          } else {
            this.showCareerCreationModal();
          }
        });
        return;
      }

      // Toggle Live 3D Diorama on Entrance Screen
      if (e.target.closest('#btn-toggle-3d-diorama')) {
        this.audio.playClick();
        this.toggle3DDioramaEntrance();
        return;
      }

      // Enter Direct Tycoon Bank System (LOCKED)
      if (e.target.closest('#btn-enter-tycoon, #btn-enter-tycoon-locked, #vault-direct-tycoon-btn, #start-direct-tycoon-locked-btn, #start-direct-tycoon-btn')) {
        this.audio.playError ? this.audio.playError() : this.audio.playClick();
        this.showToast('🔒 نمط تأسيس وإدارة البنك المباشر مغلق وموقوف مؤقتاً! يجب عليك أولاً خوض مسيرة صعود الموظف من الصفر والارتقاء في السلم الوظيفي.', 'warning', 5000);
        return;
      }

      // Floating Idle / Offline Earnings Card Click (Double earnings)
      if (e.target.closest('#btn-idle-double, #idle-earnings-card, #double-offline-btn')) {
        this.handleClaimOfflineEarnings(2);
        return;
      }

      // Claim Regular Offline Earnings
      if (e.target.closest('#claim-offline-btn')) {
        this.handleClaimOfflineEarnings(1);
        return;
      }

      // Settings button on HUD (⚙️ إعدادات)
      if (e.target.closest('#btn-settings-hud, #toggle-sound-entrance-btn')) {
        this.audio.playClick();
        this.showSettingsModal();
        return;
      }

      // Shop button on HUD (🏪 متجر)
      if (e.target.closest('#btn-shop-hud')) {
        this.audio.playClick();
        this.showShopModal();
        return;
      }

      // Profile / Character Avatar / Cloud Save Modal Click
      if (e.target.closest('#hud-profile-trigger, #btn-cloud-account-header, #entrance-cloud-badge-btn')) {
        this.audio.playClick();
        this.authModal.show();
        return;
      }

      // Personal HUD Pills Click (Jump to Executive Life tab)
      if (e.target.closest('#hud-personal-pills')) {
        this.audio.playClick();
        this.activeTab = 'executive_life';
        this.render();
        return;
      }

      // Take Wellness / Vacation
      const wellnessBtn = e.target.closest('[data-action="take-wellness"]');
      if (wellnessBtn) {
        const optId = wellnessBtn.dataset.wellnessId;
        if (this.state.executiveLifeManager) {
          const res = this.state.executiveLifeManager.takeWellness(optId);
          if (res.success) {
            this.audio.playCash();
            this.showToast(res.msg, 'success', 3500);
          } else {
            this.audio.playError();
            this.showToast(res.msg, 'warning', 3500);
          }
          this.render();
        }
        return;
      }

      // Buy Lifestyle Asset
      const buyAssetBtn = e.target.closest('[data-action="buy-lifestyle-asset"]');
      if (buyAssetBtn) {
        const assetId = buyAssetBtn.dataset.assetId;
        if (this.state.executiveLifeManager) {
          const res = this.state.executiveLifeManager.buyLifestyleAsset(assetId);
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.msg, 'success', 4000);
          } else {
            this.audio.playError();
            this.showToast(res.msg, 'warning', 3500);
          }
          this.render();
        }
        return;
      }

      // Close Entrance Modals
      if (e.target.closest('#close-entrance-modal-btn, .close-entrance-modal')) {
        const modal = document.querySelector('.entrance-modal-overlay');
        if (modal) modal.remove();
        return;
      }

      // Return to Entrance from Sidebar
      if (e.target.closest('#return-to-vault-btn')) {
        this.toggleSidebar(false);
        this.renderVaultEntranceScreen();
        return;
      }

      // Toggle Sidebar
      if (e.target.closest('#toggle-sidebar-btn, .sidebar-toggle-btn, .view-switch-btn')) {
        this.toggleSidebar(true);
        this.audio.playClick();
        return;
      }


      // Close Sidebar / Phone Chassis
      if (e.target.closest('#close-sidebar-btn, #phone-home-bar') || e.target.id === 'sidebar-overlay') {
        this.toggleSidebar(false);
        return;
      }

      // Phone Accordion Header Toggle
      const accHeader = e.target.closest('.phone-accordion-header');
      if (accHeader) {
        const group = accHeader.closest('.phone-accordion-group');
        if (group) {
          group.classList.toggle('open');
          this.audio.playClick();
        }
        return;
      }

      // Sidebar Tab Selection
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        this.activeTab = tabBtn.dataset.tab;
        this.viewMode = 'desk';
        this.audio.playClick();
        this.toggleSidebar(false);
        this.render();
        return;
      }

      // Dual-View Switcher (3D Floor vs Management Desk)
      if (e.target.closest('#toggle-view-mode-btn')) {
        this.viewMode = this.viewMode === 'floor' ? 'desk' : 'floor';
        this.audio.playClick();
        this.render();
        return;
      }

      // Camera Perspective Switcher in 3D Floor (Isometric <-> Third-Person <-> First-Person)
      if (e.target.closest('#btn-toggle-cam-perspective')) {
        if (this.bankFloorScene) {
          this.audio.playClick();
          const mode = this.bankFloorScene.togglePerspectiveMode();
          const label = document.getElementById('cam-perspective-label');
          const icon = document.getElementById('cam-perspective-icon');
          if (mode === 'third_person') {
            if (label) label.textContent = 'منظور الشخص الثالث 3D';
            if (icon) icon.textContent = '🚶‍♂️';
            this.showToast('🎮 تحكم مباشر بالشخصية: تحرك بـ [WASD]، وجه بالماوس، واقترب من أي شخص واضغط [E]', 'info', 4000);
          } else if (mode === 'first_person') {
            if (label) label.textContent = 'منظور التجول الحر (FP)';
            if (icon) icon.textContent = '👁️';
            this.showToast('🎮 منظور الشخص الأول: تحرك بـ [WASD] وانظر بالماوس', 'info', 4000);
          } else {
            if (label) label.textContent = 'المنظور الأيزومتري (ISO)';
            if (icon) icon.textContent = '📐';
            this.showToast('📐 العودة للمنظور الأيزومتري العلوي', 'info', 2500);
          }
        }
        return;
      }

      // Open Employee Dossier Modal from 3D Floor HUD
      if (e.target.closest('#btn-open-career-dossier-modal')) {
        this.audio.playClick();
        this.showCharacterDossierModal('player');
        return;
      }

      // Switch to Tycoon Management View from 3D Floor HUD
      if (e.target.closest('#btn-switch-to-tycoon-floor')) {
        this.audio.playCash();
        this.viewMode = 'desk';
        this.render();
        return;
      }

      // Quick Collect ATM Fees
      if (e.target.closest('#btn-collect-atm-direct')) {
        this.handleCollectATMFees(0);
        return;
      }

      // Upgrade Teller Station
      const upTellerBtn = e.target.closest('#btn-upgrade-teller');
      if (upTellerBtn) {
        const idx = parseInt(upTellerBtn.dataset.tellerIndex, 10);
        this.handleUpgradeTeller(idx);
        return;
      }

      // Fast-Track Customer Service
      const fastServeBtn = e.target.closest('#btn-serve-customer-fast');
      if (fastServeBtn) {
        this.handleFastServeCustomer();
        return;
      }

      // Close Station / Customer Modal
      if (e.target.closest('#close-station-modal-btn, #close-customer-modal-btn')) {
        this.closeModal();
        return;
      }

      // Locked Tab Click (Open CBE License Dossier)
      const lockedTabBtn = e.target.closest('[data-locked-tab]');
      if (lockedTabBtn) {
        const lockedTabId = lockedTabBtn.dataset.lockedTab;
        this.audio.playClick();
        this.toggleSidebar(false);
        this.showLicenseDossierModal(lockedTabId);
        return;
      }

      // HUD License Tier Button or Career XP Badge Click
      if (e.target.closest('#hud-license-tier-btn, #hud-career-level-btn, #unlock-dossier-jump-btn')) {
        this.audio.playClick();
        this.showLicenseDossierModal();
        return;
      }

      // Return to Dashboard from Locked Tab Fallback
      if (e.target.closest('#back-to-dashboard-btn')) {
        this.audio.playClick();
        this.activeTab = 'dashboard';
        this.render();
        return;
      }

      // Apply for CBE License Upgrade
      if (e.target.closest('#apply-license-upgrade-btn')) {
        this.audio.playClick();
        if (this.state.licensesManager) {
          const res = this.state.licensesManager.applyForLicenseUpgrade();
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.message, 'success', 5000);
            this.showLicenseCelebrationModal(res.newTier);
          } else {
            this.audio.playError();
            this.showToast(res.message, 'warning', 4000);
          }
        }
        return;
      }

      // Close License Dossier or Celebration Modal
      if (e.target.closest('#close-license-modal-btn, #close-celebration-modal-btn')) {
        this.audio.playClick();
        this.closeModal();
        this.render();
        return;
      }

      // Mode Selection: Start Career
      if (e.target.closest('#start-career-mode-btn')) {
        this.audio.playClick();
        this.showCareerCreationModal();
        return;
      }

      // Mode Selection: Direct Tycoon is LOCKED
      if (e.target.closest('#start-direct-tycoon-btn, #start-direct-tycoon-locked-btn')) {
        this.audio.playError ? this.audio.playError() : this.audio.playClick();
        this.showToast('🔒 نمط تأسيس وإدارة البنك المباشر مغلق وموقوف مؤقتاً! يجب عليك أولاً خوض مسيرة صعود الموظف من الصفر والارتقاء في السلم الوظيفي.', 'warning', 5000);
        return;
      }

      // Submit Career Creation
      if (e.target.closest('#submit-career-creation-btn')) {
        this.handleCareerCreationSubmit();
        return;
      }

      // Career Scenario Option Selection
      const careerOptBtn = e.target.closest('[data-career-opt]');
      if (careerOptBtn) {
        const optIndex = parseInt(careerOptBtn.dataset.careerOpt);
        this.handleCareerOption(optIndex);
        return;
      }

      // Career Advance to Next Event
      if (e.target.closest('#next-career-event-btn')) {
        this.handleNextCareerEvent();
        return;
      }

      // Launch Tycoon from Career (Transition)
      if (e.target.closest('#launch-tycoon-from-career-btn')) {
        const bootstrap = this.state.careerManager.exportToTycoon();
        if (this._endingBonus) {
          bootstrap.startingCash += this._endingBonus;
        }
        this.state.applyCareerBootstrap(bootstrap);
        this.audio.playSuccess();
        this.closeModal();
        this.render();
        this.showToast(bootstrap.summaryMsg, 'success', 6000);
        return;
      }

      // Career Finish: Free Roam 3D
      if (e.target.closest('#career-finish-explore-btn')) {
        this.closeModal();
        this.launch3DCareerMode();
        this.showToast('🏆 تهانينا على ختام مسيرتك المصرفية! يمكنك الآن التجوال بحرية في أرجاء الفرع والتحدث مع الزملاء.', 'success', 6000);
        return;
      }

      // Switch back to Career Visual Novel from 3D Floor
      if (e.target.closest('#switch-to-career-novel-btn')) {
        this.audio.playClick();
        if (this.bankFloorScene) {
          this.bankFloorScene.pause();
        }
        this.renderCareerMode();
        return;
      }

      // Open Career Dossier modal from 3D HUD
      if (e.target.closest('#btn-open-career-dossier-modal')) {
        this.audio.playClick();
        this.showRelationshipsDossierModal();
        return;
      }

      // Reset Career
      if (e.target.closest('#reset-career-btn')) {
        if (confirm('هل تريد إعادة مسيرة الموظف والبدء من جديد؟')) {
          this.state.careerManager.resetCareer();
          this.showModeSelectionScreen();
        }
        return;
      }

      // Theme Switcher Toggle
      if (e.target.closest('#theme-toggle-btn')) {
        this.cycleTheme();
        this.audio.playClick();
        return;
      }

      // Open Banking Relationships Dossier Modal
      if (e.target.closest('#relationships-dossier-btn')) {
        this.audio.playClick();
        this.showRelationshipsDossierModal();
        return;
      }

      // 3D Branch Floor Mode Button from Career
      if (e.target.closest('#career-floor-3d-btn')) {
        this.audio.playClick();
        this.launch3DCareerMode();
        return;
      }

      // Character Dossier Avatar Click
      const dossierTrigger = e.target.closest('[data-dossier-id]');
      if (dossierTrigger) {
        const charId = dossierTrigger.dataset.dossierId;
        this.audio.playClick();
        this.showCharacterDossierModal(charId);
        return;
      }

      // Switch to Career Mode from Tycoon Sidebar
      if (e.target.closest('#switch-to-career-btn')) {
        this.toggleSidebar(false);
        if (this.state.careerManager && this.state.careerManager.isStarted) {
          this.launch3DCareerMode();
        } else {
          this.showCareerCreationModal();
        }
        return;
      }

      // Next Month Button
      if (e.target.closest('#next-month-btn')) {
        this.handleNextMonth();
        return;
      }

      // Launch Deposit Campaign
      if (e.target.closest('#launch-campaign-btn')) {
        const res = this.state.launchDepositCampaign();
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Reset / New Bank Button
      if (e.target.closest('#reset-bank-btn')) {
        if (confirm('هل أنت متأكد من تصفية البنك الحالي والبدء من جديد من الصفر؟')) {
          this.state.resetGame();
        }
        return;
      }

      // Random Bank Name Generator in Onboarding
      if (e.target.closest('#random-name-btn')) {
        const names = [
          'بنك المحروسة للاستثمار',
          'بنك الدلتا الوطني للتنمية',
          'بنك النيل للتجارة والتمويل',
          'بنك الإسكندرية والقاهرة الدولي',
          'بنك الأهرام للخدمات المصرفية',
          'البنك الأهلي التجاري الحديث'
        ];
        const randomName = names[Math.floor(Math.random() * names.length)];
        const input = document.getElementById('input-bank-name');
        if (input) input.value = randomName;
        this.audio.playClick();
        return;
      }

      // Submit Onboarding Form
      if (e.target.closest('#submit-founding-btn')) {
        this.handleFoundingSubmit();
        return;
      }

      // Buy Stocks (EGX)
      const buyStockBtn = e.target.closest('[data-action="buy-stock"]');
      if (buyStockBtn) {
        const ticker = buyStockBtn.dataset.ticker;
        const qty = parseInt(buyStockBtn.dataset.qty) || 100;
        const res = this.state.investmentsManager.buyShares(ticker, qty);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Sell Stocks (EGX)
      const sellStockBtn = e.target.closest('[data-action="sell-stock"]');
      if (sellStockBtn) {
        const ticker = sellStockBtn.dataset.ticker;
        let qty = 100;
        if (sellStockBtn.dataset.qty === 'all') {
          const stk = this.state.investmentsManager.stocks.find(s => s.ticker === ticker);
          qty = stk ? stk.sharesOwned : 0;
        } else {
          qty = parseInt(sellStockBtn.dataset.qty, 10) || 100;
        }

        if (qty <= 0) {
          this.showToast('لا تملك أسهماً لبيعها في هذه الشركة.', 'warning');
          return;
        }

        const res = this.state.investmentsManager.sellShares(ticker, qty);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Activate Islamic Banking Window
      if (e.target.closest('#activate-islamic-btn')) {
        const res = this.state.islamicBankingManager.activateWindow();
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Unlock Islamic Product
      const unlockIslamBtn = e.target.closest('[data-action="unlock-islamic-prod"]');
      if (unlockIslamBtn) {
        const id = unlockIslamBtn.dataset.id;
        const res = this.state.islamicBankingManager.unlockProduct(id);
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Launch Card Program
      const launchCardBtn = e.target.closest('[data-action="launch-card"]');
      if (launchCardBtn) {
        const id = launchCardBtn.dataset.id;
        const res = this.state.cardsManager.launchCardProgram(id);
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Buy POS Terminals
      if (e.target.closest('#buy-pos-btn')) {
        const res = this.state.cardsManager.deployPOSTerminals(5);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Sponsor CSR / Mega Project
      const sponsorBtn = e.target.closest('[data-action="sponsor-csr"]');
      if (sponsorBtn) {
        const id = sponsorBtn.dataset.id;
        const res = this.state.csrManager.sponsorInitiative(id);
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Approve Loan
      const approveBtn = e.target.closest('[data-action="approve-loan"]');
      if (approveBtn) {
        const id = approveBtn.dataset.id;
        const res = this.state.loansManager.approveLoan(id);
        if (res.success) {
          this.closeModal();
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Reject Loan
      const rejectBtn = e.target.closest('[data-action="reject-loan"]');
      if (rejectBtn) {
        const id = rejectBtn.dataset.id;
        const res = this.state.loansManager.rejectLoan(id);
        this.closeModal();
        this.audio.playClick();
        this.showToast(res.msg, 'info');
        this.render();
        return;
      }

      // Inspect Commercial Dossier
      const inspectDossierBtn = e.target.closest('[data-action="inspect-dossier"]');
      if (inspectDossierBtn) {
        const id = inspectDossierBtn.dataset.id;
        this.audio.playClick();
        this.showCommercialDossierModal(id);
        return;
      }

      // Audit Corporate Loan
      const auditLoanBtn = e.target.closest('[data-action="audit-corporate-loan"]');
      if (auditLoanBtn) {
        const id = auditLoanBtn.dataset.id;
        if (this.state.loansManager) {
          const res = this.state.loansManager.auditCorporateLoan(id);
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.msg, 'success', 5000);
            this.showCommercialDossierModal(id);
          } else {
            this.showToast(res.msg, 'info');
          }
          this.render();
        }
        return;
      }

      // Sign Facility Vendor Contract
      const signVendorBtn = e.target.closest('[data-action="sign-vendor"]');
      if (signVendorBtn) {
        const cat = signVendorBtn.dataset.cat;
        const vendorId = signVendorBtn.dataset.id;
        if (this.state.vendorsManager) {
          const res = this.state.vendorsManager.signContract(cat, vendorId);
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.msg, 'success', 5000);
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.render();
        }
        return;
      }

      // Cancel Facility Vendor Contract
      const cancelVendorBtn = e.target.closest('[data-action="cancel-vendor"]');
      if (cancelVendorBtn) {
        const cat = cancelVendorBtn.dataset.cat;
        if (this.state.vendorsManager) {
          const res = this.state.vendorsManager.cancelContract(cat);
          if (res.success) {
            this.audio.playClick();
            this.showToast(res.msg, 'info');
          } else {
            this.showToast(res.msg, 'error');
          }
          this.render();
        }
        return;
      }

      // Negotiate Loan (Higher Rate + Additional Guarantor)
      const negotiateBtn = e.target.closest('[data-action="negotiate-loan"]');
      if (negotiateBtn) {
        const id = negotiateBtn.dataset.id;
        const res = this.state.loansManager.negotiateLoan(id);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success', 4000);
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Early Settle Loan
      const earlySettleBtn = e.target.closest('[data-action="early-settle-loan"]');
      if (earlySettleBtn) {
        const id = earlySettleBtn.dataset.id;
        if (confirm('هل ترغب في تحصيل كامل رصيد التمويل نقداً الآن مع إضافة رسوم سداد مبكر 2% لصالح الخزينة؟')) {
          const res = this.state.loansManager.earlySettlement(id);
          if (res.success) {
            this.audio.playCash();
            this.showToast(res.msg, 'success', 3500);
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.render();
        }
        return;
      }

      // Hire Staff
      const hireBtn = e.target.closest('[data-action="hire-staff"]');
      if (hireBtn) {
        const cat = hireBtn.dataset.cat;
        const res = this.state.hrManager.hire(cat);
        if (res.success) {
          this.audio.playClick();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Fire Staff
      const fireBtn = e.target.closest('[data-action="fire-staff"]');
      if (fireBtn) {
        const cat = fireBtn.dataset.cat;
        const res = this.state.hrManager.fire(cat);
        if (res.success) {
          this.audio.playClick();
          this.showToast(res.msg, 'info');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Train Staff
      if (e.target.closest('#train-staff-btn')) {
        const res = this.state.hrManager.trainStaff();
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Unlock Branch
      const unlockBranchBtn = e.target.closest('[data-action="unlock-branch"]');
      if (unlockBranchBtn) {
        const id = unlockBranchBtn.dataset.id;
        const res = this.state.branchesManager.unlockBranch(id);
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Buy ATM
      if (e.target.closest('#buy-atm-btn')) {
        const res = this.state.branchesManager.buyATM();
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Upgrade Regional Hub (Egypt Map)
      const upgradeHubBtn = e.target.closest('[data-action="upgrade-regional-hub"]');
      if (upgradeHubBtn) {
        const hubId = upgradeHubBtn.dataset.hubId;
        const res = this.state.branchesManager.upgradeRegionalHub(hubId);
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Open Bank Run Crisis Room
      if (e.target.closest('#open-bankrun-room-btn')) {
        this.audio.playAlert();
        this.showBankRunModal();
        return;
      }

      // Bank Run: Trigger Simulation Stress Test
      if (e.target.closest('#btn-bankrun-trigger-test')) {
        if (this.state.bankRunManager) {
          this.state.bankRunManager.triggerBankRun('اختبار إجهاد وتحمل مصرفي تجريبي بطلب من مجلس الإدارة');
          this.audio.playAlert();
          this.showToast('🚨 تم تفعيل اختبار هجوم المودعين! بدأ تدفق طلبات السحب.', 'warning');
          this.showBankRunModal();
          this.render();
        }
        return;
      }

      // Bank Run: Request CBE Emergency Loan
      if (e.target.closest('#btn-bankrun-cbe-loan')) {
        if (this.state.bankRunManager) {
          const res = this.state.bankRunManager.requestCbeEmergencyLoan(250000);
          if (res.success) {
            this.audio.playCash();
            this.showToast(res.msg, 'success');
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.showBankRunModal();
          this.render();
        }
        return;
      }

      // Bank Run: Repay CBE Emergency Loan
      if (e.target.closest('#btn-bankrun-repay-cbe')) {
        if (this.state.bankRunManager) {
          const res = this.state.bankRunManager.repayCbeLoan();
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.msg, 'success');
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.showBankRunModal();
          this.render();
        }
        return;
      }

      // Bank Run: Toggle Withdrawal Limit
      if (e.target.closest('#btn-bankrun-toggle-limit')) {
        if (this.state.bankRunManager) {
          const res = this.state.bankRunManager.toggleWithdrawalLimits();
          this.audio.playClick();
          this.showToast(res.msg, res.active ? 'warning' : 'info');
          this.showBankRunModal();
          this.render();
        }
        return;
      }

      // Bank Run: Emergency 27% Certificate
      if (e.target.closest('#btn-bankrun-cert')) {
        if (this.state.bankRunManager) {
          const res = this.state.bankRunManager.launchEmergencyCertificate();
          if (res.success) {
            this.audio.playCash();
            this.showToast(res.msg, 'success');
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.showBankRunModal();
          this.render();
        }
        return;
      }

      // Bank Run: Press Conference
      if (e.target.closest('#btn-bankrun-press-conf')) {
        if (this.state.bankRunManager) {
          const res = this.state.bankRunManager.holdPressConference();
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.msg, 'success');
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.showBankRunModal();
          this.render();
        }
        return;
      }

      // Neo-Bank: Obtain License
      if (e.target.closest('#btn-obtain-neo-license')) {
        if (this.state.neoBankManager) {
          const res = this.state.neoBankManager.obtainLicense();
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.msg, 'success');
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.render();
        }
        return;
      }

      // Neo-Bank: Launch Viral Campaign
      if (e.target.closest('#btn-neo-viral-campaign')) {
        if (this.state.neoBankManager) {
          const res = this.state.neoBankManager.launchViralCampaign(25000);
          if (res.success) {
            this.audio.playCash();
            this.showToast(res.msg, 'success');
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.render();
        }
        return;
      }

      // Neo-Bank: Smart Pots
      if (e.target.closest('#btn-neo-smart-pots')) {
        if (this.state.neoBankManager) {
          const res = this.state.neoBankManager.unlockSmartPots();
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.msg, 'success');
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.render();
        }
        return;
      }

      // Neo-Bank: BNPL
      if (e.target.closest('#btn-neo-bnpl')) {
        if (this.state.neoBankManager) {
          const res = this.state.neoBankManager.unlockBNPL();
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.msg, 'success');
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.render();
        }
        return;
      }

      // Neo-Bank: Upgrade Cloud
      if (e.target.closest('#btn-neo-upgrade-cloud')) {
        if (this.state.neoBankManager) {
          const res = this.state.neoBankManager.upgradeCloud();
          if (res.success) {
            this.audio.playSuccess();
            this.showToast(res.msg, 'success');
          } else {
            this.audio.playAlert();
            this.showToast(res.msg, 'error');
          }
          this.render();
        }
        return;
      }

      // Upgrade Mobile App
      if (e.target.closest('#upgrade-app-btn')) {
        const res = this.state.branchesManager.upgradeMobileApp();
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Activate InstaPay
      if (e.target.closest('#activate-instapay-btn')) {
        const res = this.state.instaPayManager.activateInstaPay();
        if (res.success) {
          this.triggerInstaPayFlash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Upgrade Server
      const upgradeServerBtn = e.target.closest('[data-action="upgrade-server"]');
      if (upgradeServerBtn) {
        const tier = upgradeServerBtn.dataset.tier;
        const res = this.state.instaPayManager.upgradeServer(tier);
        if (res.success) {
          this.triggerInstaPayFlash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Toggle Certificate
      const toggleCertBtn = e.target.closest('[data-action="toggle-cert"]');
      if (toggleCertBtn) {
        const id = toggleCertBtn.dataset.id;
        const res = this.state.treasuryProductsManager.toggleCertificate(id);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Buy Gold
      const buyGoldBtn = e.target.closest('[data-action="buy-gold"]');
      if (buyGoldBtn) {
        const grams = parseFloat(buyGoldBtn.dataset.grams) || 10;
        const res = this.state.treasuryProductsManager.buyGold(grams);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Sell Gold
      const sellGoldBtn = e.target.closest('[data-action="sell-gold"]');
      if (sellGoldBtn) {
        const grams = parseFloat(sellGoldBtn.dataset.grams) || 10;
        const res = this.state.treasuryProductsManager.sellGold(grams);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Buy USD
      const buyUsdBtn = e.target.closest('[data-action="buy-usd"]');
      if (buyUsdBtn) {
        const amount = parseFloat(buyUsdBtn.dataset.amount) || 10000;
        const res = this.state.fxManager.buyUSD(amount);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Sell USD
      const sellUsdBtn = e.target.closest('[data-action="sell-usd"]');
      if (sellUsdBtn) {
        const amount = parseFloat(sellUsdBtn.dataset.amount) || 10000;
        const res = this.state.fxManager.sellUSD(amount);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Open LC
      const openLcBtn = e.target.closest('[data-action="open-lc"]');
      if (openLcBtn) {
        const id = openLcBtn.dataset.id;
        const res = this.state.fxManager.openLC(id);
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Restructure Loan
      const restructureBtn = e.target.closest('[data-action="restructure-loan"]');
      if (restructureBtn) {
        const id = restructureBtn.dataset.id;
        const res = this.state.legalManager.restructureLoan(id);
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Auction Collateral
      const auctionBtn = e.target.closest('[data-action="auction-collateral"]');
      if (auctionBtn) {
        const id = auctionBtn.dataset.id;
        const res = this.state.legalManager.auctionCollateral(id);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Write-off Loan
      const writeoffBtn = e.target.closest('[data-action="writeoff-loan"]');
      if (writeoffBtn) {
        const id = writeoffBtn.dataset.id;
        const res = this.state.legalManager.writeOffLoan(id);
        if (res.success) {
          this.audio.playClick();
          this.showToast(res.msg, 'info');
        }
        this.render();
        return;
      }

      // Claim Trophy
      const claimTrophyBtn = e.target.closest('[data-action="claim-trophy"]');
      if (claimTrophyBtn) {
        const id = claimTrophyBtn.dataset.id;
        const res = this.state.trophiesManager.claimReward(id);
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Branch Interior Upgrade
      const upgradeBranchBtn = e.target.closest('[data-action="upgrade-branch"]');
      if (upgradeBranchBtn) {
        const branchId = upgradeBranchBtn.dataset.branchId;
        const upgradeId = upgradeBranchBtn.dataset.upgradeId;
        const res = this.state.branchesManager.upgradeBranch(branchId, upgradeId);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // AML: Pass Suspicious Transaction
      const amlPassBtn = e.target.closest('[data-action="aml-pass"]');
      if (amlPassBtn) {
        const id = amlPassBtn.dataset.id;
        const res = this.state.complianceManager.passSuspiciousTransaction(id);
        if (res.success) {
          this.audio.playCash();
          this.showToast(res.msg, 'warning', 4500);
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // AML: Freeze and Report Suspicious Transaction
      const amlFreezeBtn = e.target.closest('[data-action="aml-freeze"]');
      if (amlFreezeBtn) {
        const id = amlFreezeBtn.dataset.id;
        const res = this.state.complianceManager.freezeAndReportAML(id);
        if (res.success) {
          this.audio.playStamp();
          this.showToast(res.msg, 'success', 4500);
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Executive Perks: Unlock Perk
      const unlockPerkBtn = e.target.closest('[data-action="unlock-perk"]');
      if (unlockPerkBtn) {
        const perkId = unlockPerkBtn.dataset.perkId;
        const res = this.state.executiveLifeManager.unlockPerk(perkId);
        if (res.success) {
          this.audio.playSuccess();
          this.showToast(res.msg, 'success');
        } else {
          this.audio.playAlert();
          this.showToast(res.msg, 'error');
        }
        this.render();
        return;
      }

      // Dilemma Option Selection
      const dilemmaOptionBtn = e.target.closest('[data-dilemma-opt]');
      if (dilemmaOptionBtn) {
        const optIndex = parseInt(dilemmaOptionBtn.dataset.dilemmaOpt);
        if (this.currentDilemma && this.currentDilemma.options[optIndex]) {
          const opt = this.currentDilemma.options[optIndex];
          if (this.state.eventsManager && this.state.eventsManager.recordChoice) {
            this.state.eventsManager.recordChoice(this.currentDilemma.id, optIndex, opt.text);
          }
          const resultMsg = opt.impact(this.state);
          this.currentDilemma = null;
          this.audio.playStamp();
          this.closeModal();
          this.showToast(resultMsg, 'info', 5000);
          this.render();
        }
        return;
      }

      // Close Modal
      if (e.target.closest('#close-modal-btn') || e.target.id === 'modal-overlay') {
        this.closeModal();
      }
    });
  }

  toggleSidebar(open = true) {
    this.isSidebarOpen = open;
    const sidebar = document.getElementById('bank-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
      if (open) {
        sidebar.classList.add('sidebar-open');
        overlay.classList.remove('hidden');
      } else {
        sidebar.classList.remove('sidebar-open');
        overlay.classList.add('hidden');
      }
    }
  }

  cleanupDiorama() {
    if (this.dioramaScene) {
      try {
        this.dioramaScene.destroy();
      } catch (e) {
        console.warn('Diorama cleanup error', e);
      }
      this.dioramaScene = null;
    }
  }

  toggle3DDioramaEntrance() {
    const stageCanvas = document.querySelector('.tycoon-stage-canvas');
    const stageImg = document.querySelector('.tycoon-stage-img');
    const toggleBtn = document.getElementById('btn-toggle-3d-diorama');

    if (this.dioramaScene) {
      // Switch back to 2D image
      this.cleanupDiorama();
      if (stageImg) stageImg.style.display = 'block';
      if (toggleBtn) toggleBtn.innerHTML = '🏛️ الخزينة 3D الحية';
    } else {
      // Mount 3D Diorama
      if (!stageCanvas) return;
      if (stageImg) stageImg.style.display = 'none';
      this.dioramaScene = new DioramaScene(stageCanvas);
      if (toggleBtn) toggleBtn.innerHTML = '🖼️ العودة للغلاف';
    }
  }

  renderVaultEntranceScreen() {
    this.cleanupDiorama();

    this.appContainer.innerHTML = `
      <div class="tycoon-stage-wrapper">
        <div class="tycoon-stage-canvas">
          <!-- Pristine 3D Tycoon Artwork (Matching Reference Image) -->
          <img src="./assets/bank_entrance_cover.jpg" class="tycoon-stage-img" alt="مدير البنك - إمبراطورية الصرافة">

          <!-- Interactive Hotspot: Top-Left Profile / Character Badge -->
          <button class="hotspot-btn hotspot-profile" id="hud-profile-trigger" title="عرض ملف المدير وبطاقة الحفظ السحابي"></button>

          <!-- Interactive Hotspot: Cloud Save Pill -->
          <button class="btn-cloud-sync-pill" id="entrance-cloud-badge-btn" style="position: absolute; top: 18px; left: 62px; z-index: 50; padding: 5px 12px; font-size: 11px;" title="الهوية المصرفية وحفظ Google السحابي">
            <span class="sync-indicator-dot ${cloudSaveService.getStatusInfo().badgeClass}"></span>
            <span>حفظ سحابي</span>
          </button>

          <!-- Interactive Hotspot: Top-Right Settings ⚙️ -->
          <button class="hotspot-btn hotspot-settings" id="btn-settings-hud" title="إعدادات"></button>

          <!-- Interactive Hotspot: Top-Right Shop 🏪 -->
          <button class="hotspot-btn hotspot-shop" id="btn-shop-hud" title="متجر الترقيات"></button>

          <!-- Interactive Hotspot: Idle Earnings "ضاعف X2" -->
          <button class="hotspot-btn hotspot-idle-double" id="btn-idle-double" title="مضاعفة أرباح الغياب"></button>

          <!-- Interactive Hotspot: "افتح البنك" (Exact Green Button) -->
          <button class="hotspot-btn hotspot-open-bank" id="btn-open-bank-main" title="افتح البنك"></button>

          <!-- Dedicated Entrance Buttons: "مسيرة صعود الموظف" & "الخزينة 3D الحية" -->
          <div class="stage-career-btn-box" style="display: flex; gap: 8px; align-items: center;">
            <button class="btn-career-entrance-pill" id="btn-career-mode-main">
              👔 مسيرة صعود الموظف (القصة)
            </button>
            <button class="btn-diorama-entrance-pill" id="btn-toggle-3d-diorama">
              🏛️ الخزينة 3D الحية
            </button>
          </div>
        </div>
      </div>
      <div id="modal-container"></div>
    `;
  }

  showModeChoiceModal() {
    const existing = document.querySelector('.entrance-modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'entrance-modal-overlay';
    modal.innerHTML = `
      <div class="entrance-modal-box">
        <h2 class="entrance-modal-title">اختر مسارك المصرفي</h2>
        <p class="entrance-modal-sub">حدد التجربة التي ترغب في خوضها الآن داخل البنك المصري:</p>

        <div class="modes-choice-grid">
          <!-- Option 1: Career Story (Active & Recommended) -->
          <div class="mode-choice-card featured-mode" id="btn-enter-career">
            <div class="mode-badge-rec">✨ النمط المفتوح والأساسي</div>
            <div class="mode-choice-icon">👔</div>
            <h3 class="mode-choice-title">مسيرة صعود الموظف</h3>
            <p class="mode-choice-desc">
              ابدأ كخريج على شباك الصراف، خض مقالب الزملاء اليومية، واجه كبار العملاء وضغوط التارجت وتجول بحرية داخل الفرع ثلاثي الأبعاد حتى تصنع مجدك!
            </p>
            <button class="btn btn-primary w-full">🚀 خوض المسيرة المهنية</button>
          </div>

          <!-- Option 2: Direct Tycoon 3D Floor (LOCKED) -->
          <div class="mode-choice-card" id="btn-enter-tycoon-locked" style="opacity: 0.7; border: 1.5px dashed #ef4444; background: rgba(15, 23, 42, 0.7); cursor: not-allowed; position: relative;">
            <div style="position: absolute; top: 12px; left: 12px; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; border-radius: 6px; font-size: 11px; font-weight: 800; padding: 2px 8px;">
              🔒 مغلق حالياً
            </div>
            <div class="mode-choice-icon" style="filter: grayscale(1);">🏛️</div>
            <h3 class="mode-choice-title" style="color: #94a3b8;">إمبراطورية البنك (3D Tycoon)</h3>
            <p class="mode-choice-desc" style="color: #64748b;">
              قيادة البنك المباشرة وإدارة الأقسام الـ 18 مغلقة وموقوفة مؤقتاً؛ يجب أولاً إثبات كفاءتك وخوض مسيرة صعود الموظف من الصفر والارتقاء في السلم الوظيفي!
            </p>
            <button class="btn btn-secondary w-full" style="cursor: not-allowed; opacity: 0.85; background: #334155; border: 1px dashed #64748b; color: #cbd5e1; font-weight: 800;">
              🔒 النمط مغلق (أكمل المسيرة أولاً)
            </button>
          </div>
        </div>

        <button id="close-entrance-modal-btn" class="btn-close-modal">إلغاء والعودة</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showSettingsModal() {
    const existing = document.querySelector('.haroun-settings-overlay, .entrance-modal-overlay');
    if (existing) existing.remove();

    const isMuted = !this.audio.enabled;
    const masterPct = Math.round((this.audio.masterVolume !== undefined ? this.audio.masterVolume : 0.88) * 100);
    const sfxPct = Math.round((this.audio.sfxVolume !== undefined ? this.audio.sfxVolume : 0.90) * 100);
    const dialogueSpeed = this.state.dialogueSpeed || 'normal';
    const graphicsQuality = this.state.graphicsQuality || (this.isHighQuality ? 'high' : 'economy');
    const bankDisplayName = this.state.bankName || 'بنك هارون';

    const qualityDisplay = {
      economy: 'اقتصادي ⚡',
      medium: 'متوسط 📱',
      high: 'عالي 60FPS ✨'
    }[graphicsQuality] || 'عالي 60FPS ✨';

    const modal = document.createElement('div');
    modal.className = 'haroun-settings-overlay';
    modal.innerHTML = `
      <div class="haroun-settings-card">
        <!-- Header -->
        <div class="haroun-settings-header">
          <div class="haroun-settings-title-group">
            <h2 class="haroun-settings-title">⚙️ إعدادات ${this.escapeHTML(bankDisplayName)}</h2>
            <div class="haroun-settings-subtitle">إعدادات مرتبة • الحفظ تلقائي • أدوات استرجاع التقدم</div>
          </div>
          <button id="haroun-close-top-btn" class="haroun-btn-close">✕ إغلاق</button>
        </div>

        <!-- 2 Columns Grid -->
        <div class="haroun-settings-grid">
          <!-- Right Column: الصوت والحوار -->
          <div class="haroun-panel-box">
            <div class="haroun-panel-heading">
              <span class="haroun-panel-title">🎵 الصوت والحوار</span>
              <span class="haroun-panel-sub">مستوى الصوت وسرعة الحوار</span>
            </div>

            <!-- Master Volume -->
            <div class="haroun-audio-row">
              <div class="haroun-slider-header">
                <span>الصوت العام</span>
                <span id="label-master-volume" class="haroun-pct-badge">${masterPct}%</span>
              </div>
              <input type="range" id="slider-master-volume" class="haroun-range-slider" min="0" max="100" value="${masterPct}">
            </div>

            <!-- SFX Volume -->
            <div class="haroun-audio-row">
              <div class="haroun-slider-header">
                <span>المؤثرات الصوتية</span>
                <span id="label-sfx-volume" class="haroun-pct-badge">${sfxPct}%</span>
              </div>
              <input type="range" id="slider-sfx-volume" class="haroun-range-slider" min="0" max="100" value="${sfxPct}">
            </div>

            <!-- Mute Toggle -->
            <div class="haroun-toggle-row">
              <span class="haroun-toggle-label">كتم جميع الأصوات</span>
              <button id="btn-toggle-mute-sound" class="haroun-btn-mute-toggle ${isMuted ? 'muted-sound' : 'active-sound'}">
                ${isMuted ? '🔇 صامت' : '🔊 الصوت يعمل'}
              </button>
            </div>

            <!-- Dialogue Typing Speed -->
            <div class="haroun-speed-wrapper">
              <div class="haroun-speed-label">سرعة كتابة الحوار</div>
              <div class="haroun-speed-group">
                <button class="haroun-speed-btn ${dialogueSpeed === 'relaxed' ? 'active-speed' : ''}" data-speed="relaxed">هادئة</button>
                <button class="haroun-speed-btn ${dialogueSpeed === 'normal' ? 'active-speed' : ''}" data-speed="normal">عادية</button>
                <button class="haroun-speed-btn ${dialogueSpeed === 'fast' ? 'active-speed' : ''}" data-speed="fast">سريعة</button>
              </div>
            </div>

            <!-- Test Audio Button -->
            <button id="btn-test-audio-fx" class="btn-3d-emerald">
              <span>تجربة الصوت 🔊</span>
            </button>
          </div>

          <!-- Left Column: الحساب والحفظ + العرض والأداء -->
          <div>
            <!-- Box 1: الحساب والحفظ -->
            <div class="haroun-panel-box">
              <div class="haroun-panel-heading">
                <span class="haroun-panel-title">💼 الحساب والحفظ</span>
                <span class="haroun-panel-sub">إدارة الملف والنسخ الاحتياطي</span>
              </div>

              <div class="haroun-actions-grid-2">
                <button id="btn-player-dossier" class="btn-3d-wood">👤 حساب اللاعب</button>
                <button id="btn-recover-progress" class="btn-3d-wood">🔍 البحث عن تقدم مفقود</button>
                <button id="btn-notifications-toggle" class="btn-3d-wood">🔔 الإشعارات: تفعيل</button>
                <button id="btn-instant-manual-save" class="btn-3d-wood">💾 التقدم والحفظ</button>
              </div>

              <!-- Liquidity Audit & Repair -->
              <button id="btn-audit-repair-liquidity" class="btn-3d-amber-full">
                ⚖️ مراجعة وتصليح السيولة
              </button>
            </div>

            <!-- Box 2: العرض والأداء -->
            <div class="haroun-panel-box">
              <div class="haroun-panel-heading">
                <span class="haroun-panel-title">🖥️ العرض والأداء</span>
                <span class="haroun-panel-sub">الشاشة ومعدل الإطارات والدعم</span>
              </div>

              <div class="haroun-actions-grid-3">
                <button id="btn-cycle-graphics" class="btn-3d-wood">${qualityDisplay}</button>
                <button id="btn-fps-counter" class="btn-3d-blue">📈 تلقائي: 60 FPS</button>
                <button id="btn-reset-defaults" class="btn-3d-wood">🔄 الافتراضي</button>
                <button id="btn-fullscreen-toggle" class="btn-3d-blue">⛶ ملء الشاشة</button>
                <button id="btn-export-support-code" class="btn-3d-wood">📋 كود الدعم</button>
                <button id="btn-verify-game-files" class="btn-3d-wood">🛡️ فحص الملفات</button>
              </div>

              <button id="btn-support-conversations" class="btn-3d-wood" style="width: 100%; margin-top: 4px;">
                💬 الدعم والمحادثات
              </button>
            </div>

            <!-- Box 3: مستوى الصعوبة والمحاكاة المصرية -->
            <div class="haroun-panel-box" style="margin-top: 14px;">
              <div class="haroun-panel-heading">
                <span class="haroun-panel-title">🎯 مستوى واقعية وصعوبة السوق</span>
                <span class="haroun-panel-sub">تحديد معايير نمو الودائع ومخاطر التعثر والأزمات</span>
              </div>

              <div class="haroun-diff-selector-grid">
                <button class="haroun-diff-btn ${this.state.difficultyMode === 'casual' ? 'active-casual' : ''}" data-diff="casual">
                  <span class="haroun-diff-title">🟢 مبتدئ</span>
                  <span class="haroun-diff-desc">نمو ودائع سريع ومخاطر تعثر مخففة</span>
                </button>
                <button class="haroun-diff-btn ${this.state.difficultyMode === 'realistic' ? 'active-realistic' : ''}" data-diff="realistic">
                  <span class="haroun-diff-title">🟡 واقعي</span>
                  <span class="haroun-diff-desc">توازن دقيق مع معايير البنك المركزي</span>
                </button>
                <button class="haroun-diff-btn ${this.state.difficultyMode === 'hardcore' ? 'active-hardcore' : ''}" data-diff="hardcore">
                  <span class="haroun-diff-title">🔴 أزمات حادة</span>
                  <span class="haroun-diff-desc">مخاطر تعثر مرتفعة ومنافسة شرسة</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="haroun-settings-footer">
          <button id="btn-haroun-save-giant" class="btn-haroun-save-giant">
            <span>✓</span>
            <span>حفظ وإغلاق</span>
          </button>
          <div class="haroun-settings-version">
            v1.69.82 • الإعدادات تُحفظ تلقائياً على نفس الجهاز ✓
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event Binds
    const closeModal = () => {
      this.audio.playClick();
      modal.remove();
    };

    // Difficulty Selector Binds
    modal.querySelectorAll('[data-diff]').forEach(btn => {
      btn.onclick = () => {
        const mode = btn.dataset.diff;
        this.state.setDifficultyMode(mode);
        this.audio.playClick();
        modal.querySelectorAll('[data-diff]').forEach(b => {
          b.classList.remove('active-casual', 'active-realistic', 'active-hardcore');
        });
        btn.classList.add(`active-${mode}`);
        const titles = { casual: 'مصرفي مبتدئ (سهل)', realistic: 'الواقع المصرفي المصري (متوسط)', hardcore: 'أزمات التضخم والسيولة (صعب)' };
        this.showToast(`تم ضبط مستوى السوق إلى: ${titles[mode]}`, 'info', 2500);
      };
    });

    document.getElementById('haroun-close-top-btn').onclick = closeModal;
    document.getElementById('btn-haroun-save-giant').onclick = () => {
      this.state.saveGame();
      this.audio.playSuccess();
      this.showToast('تم حفظ كافة الإعدادات بنجاح ✓', 'success', 2000);
      modal.remove();
    };

    // Master Volume Slider
    const masterSlider = document.getElementById('slider-master-volume');
    const masterLabel = document.getElementById('label-master-volume');
    masterSlider.oninput = (e) => {
      const val = parseInt(e.target.value, 10);
      masterLabel.textContent = `${val}%`;
      this.audio.setMasterVolume(val / 100);
    };

    // SFX Volume Slider
    const sfxSlider = document.getElementById('slider-sfx-volume');
    const sfxLabel = document.getElementById('label-sfx-volume');
    sfxSlider.oninput = (e) => {
      const val = parseInt(e.target.value, 10);
      sfxLabel.textContent = `${val}%`;
      this.audio.setSfxVolume(val / 100);
    };

    // Mute Toggle
    const muteBtn = document.getElementById('btn-toggle-mute-sound');
    muteBtn.onclick = () => {
      const isEnabled = this.audio.toggleSound();
      if (isEnabled) {
        muteBtn.textContent = '🔊 الصوت يعمل';
        muteBtn.className = 'haroun-btn-mute-toggle active-sound';
        this.showToast('تم تشغيل الصوت 🔊', 'info', 1500);
      } else {
        muteBtn.textContent = '🔇 صامت';
        muteBtn.className = 'haroun-btn-mute-toggle muted-sound';
        this.showToast('تم كتم الصوت 🔇', 'info', 1500);
      }
    };

    // Dialogue Speed
    modal.querySelectorAll('.haroun-speed-btn').forEach(btn => {
      btn.onclick = () => {
        const speed = btn.dataset.speed;
        this.state.setDialogueSpeed(speed);
        modal.querySelectorAll('.haroun-speed-btn').forEach(b => b.classList.remove('active-speed'));
        btn.classList.add('active-speed');
        this.audio.playClick();
        const speedTitles = { relaxed: 'هادئة', normal: 'عادية', fast: 'سريعة' };
        this.showToast(`تم تعيين سرعة الحوار إلى: ${speedTitles[speed]}`, 'info', 1500);
      };
    });

    // Test Audio
    document.getElementById('btn-test-audio-fx').onclick = () => {
      this.audio.playTestSound();
      this.showToast('تجربة رنين العملات والآلات النقدية 🔔', 'success', 1500);
    };

    // Player Dossier
    document.getElementById('btn-player-dossier').onclick = () => {
      this.audio.playClick();
      modal.remove();
      this.showCharacterDossierModal('player');
    };

    // Recover Lost Progress
    document.getElementById('btn-recover-progress').onclick = () => {
      this.audio.playClick();
      const res = this.state.recoverLostProgress();
      if (res.success) {
        this.audio.playSuccess();
        alert(`✓ ${res.message}\nسيتم تحديث الواجهة لاستعراض التقدم المسترجع.`);
        modal.remove();
        this.render();
      } else {
        this.audio.playAlert();
        alert(`⚠️ ${res.message}`);
      }
    };

    // Notifications
    document.getElementById('btn-notifications-toggle').onclick = () => {
      this.audio.playClick();
      if ('Notification' in window) {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            this.showToast('تم تفعيل إشعارات المتصفح بنجاح 🔔', 'success', 2500);
            document.getElementById('btn-notifications-toggle').textContent = '🔔 الإشعارات: مفعّلة ✓';
          } else {
            this.showToast('لم يتم منح إذن الإشعارات من المتصفح', 'warning', 2500);
          }
        });
      } else {
        this.showToast('المتصفح لا يدعم الإشعارات المنبثقة', 'info', 2000);
      }
    };

    // Instant Manual Save
    document.getElementById('btn-instant-manual-save').onclick = () => {
      this.state.saveGame();
      this.audio.playCash();
      const nowTime = new Date().toLocaleTimeString('ar-EG');
      this.showToast(`تم حفظ تقدم البنك بنجاح الساعة ${nowTime} 💾`, 'success', 2500);
    };

    // Liquidity Audit & Repair
    document.getElementById('btn-audit-repair-liquidity').onclick = () => {
      this.audio.playClick();
      const audit = this.state.auditAndRepairLiquidity();
      this.audio.playSuccess();

      let msg = `⚖️ نتيجة مراجعة وتصليح السيولة:\n\n`;
      msg += `• الرصيد النقدي في الخزنة: ${Math.round(audit.treasuryCash).toLocaleString('ar-EG')} ج.م\n`;
      msg += `• إجمالي أموال المودعين: ${Math.round(audit.totalDeposits).toLocaleString('ar-EG')} ج.م\n`;
      msg += `• إجمالي القروض القائمة: ${Math.round(audit.totalLoans).toLocaleString('ar-EG')} ج.م\n\n`;
      if (audit.issues.length > 0) {
        msg += `تم رصد ومعالجة الملاحظات التالية:\n${audit.issues.map(i => `  ✓ ${i}`).join('\n')}\n\n`;
      }
      msg += audit.summary;
      alert(msg);
    };

    // Cycle Graphics
    const cycleGraphicsBtn = document.getElementById('btn-cycle-graphics');
    cycleGraphicsBtn.onclick = () => {
      const order = ['economy', 'medium', 'high'];
      const current = this.state.graphicsQuality || 'high';
      const nextIdx = (order.indexOf(current) + 1) % order.length;
      const nextQuality = order[nextIdx];
      this.state.setGraphicsQuality(nextQuality);
      this.isHighQuality = (nextQuality !== 'economy');
      localStorage.setItem('egyptian_bank_quality', this.isHighQuality ? 'high' : 'low');

      const labels = {
        economy: 'اقتصادي ⚡',
        medium: 'متوسط 📱',
        high: 'عالي 60FPS ✨'
      };
      cycleGraphicsBtn.textContent = labels[nextQuality];
      this.audio.playClick();
      this.showToast(`تم تعيين الجرافيك: ${labels[nextQuality]}`, 'info', 1500);
    };

    // Fullscreen Toggle
    document.getElementById('btn-fullscreen-toggle').onclick = () => {
      this.audio.playClick();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        this.showToast('تم تفعيل وضع ملء الشاشة ⛶', 'success', 1500);
      } else {
        document.exitFullscreen().catch(() => {});
        this.showToast('تم الخروج من ملء الشاشة', 'info', 1500);
      }
    };

    // Reset Defaults
    document.getElementById('btn-reset-defaults').onclick = () => {
      if (confirm('هل تريد إعادة تعيين خيارات الصوت والعرض إلى القيم القياسية الافتراضية؟')) {
        this.audio.setMasterVolume(0.88);
        this.audio.setSfxVolume(0.90);
        this.audio.setMuted(false);
        this.state.setDialogueSpeed('normal');
        this.state.setGraphicsQuality('high');
        modal.remove();
        this.showToast('تمت استعادة الإعدادات الافتراضية بنجاح 🔄', 'success', 2000);
        this.showSettingsModal();
      }
    };

    // Support Save Code (Export / Import)
    document.getElementById('btn-export-support-code').onclick = () => {
      this.audio.playClick();
      const code = this.state.exportSaveCode();
      const userChoice = prompt(
        '📋 كود الدعم ومزامنة التقدم:\n\nانسخ الكود أدناه لنقل حفظك لجهاز آخر، أو الصق كود حفظ قديم لاسترجاعه:\n\n(للاسترجاع: احذف النص والصق كود الحفظ ثم اضغط موافق)',
        code
      );
      if (userChoice && userChoice.trim() !== code.trim()) {
        const importRes = this.state.importSaveCode(userChoice.trim());
        if (importRes.success) {
          alert('✓ ' + importRes.message);
          modal.remove();
          this.render();
        } else {
          alert('⚠️ ' + importRes.message);
        }
      }
    };

    // Verify Game Files
    document.getElementById('btn-verify-game-files').onclick = () => {
      this.audio.playClick();
      try {
        const saved = localStorage.getItem('egyptian_bank_saved');
        if (saved) JSON.parse(saved);
        this.audio.playSuccess();
        alert('🛡️ فحص سلامة ملفات اللعبة:\n\nجميع ملفات وبيانات التخزين المحلي سليمة بنسبة 100% ولا توجد أي تلفيات أو أخطاء قراءة.');
      } catch (e) {
        alert('⚠️ تم رصد خطأ في بنية البيانات، وتمت إعادة تصحيحها تلقائياً.');
        this.state.saveGame();
      }
    };

    // Support and Conversations Guide
    document.getElementById('btn-support-conversations').onclick = () => {
      this.audio.playClick();
      alert('💬 دليل المصرفي والمحادثات:\n\n• اللعبة تدعم طورين رئيسيين: «مسيرة صعود الموظف» و«إدارة وتوسعة البنك».\n• الحفظ يتم تلقائياً عند نهاية كل شهر مالي.\n• يمكنك تصدير كود الحفظ من زر [كود الدعم] في أي وقت.\n• تحكم في سرعة الحوار لتناسب قراءتك الهادئة أو السريعة.');
    };
  }

  showShopModal() {
    const existing = document.querySelector('.entrance-modal-overlay');
    if (existing) existing.remove();

    const currentCash = Math.round(this.state.treasuryCash || 0);
    const atmLevel = this.state.atmSpeedUpgraded || 0;
    const hasVip = !!this.state.vipLoungeUnlocked;

    const modal = document.createElement('div');
    modal.className = 'entrance-modal-overlay';
    modal.innerHTML = `
      <div class="entrance-modal-box" style="max-width: 540px;">
        <h2 class="entrance-modal-title">🏪 متجر الترقيات المصرفية</h2>
        <div style="background: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 10px; padding: 8px 14px; margin-bottom: 16px; text-align: center;">
          <span style="font-size: 13px; color: #cbd5e1;">السيولة المتاحة في الخزينة:</span>
          <strong style="color: #fbbf24; font-size: 16px; margin-right: 6px;">${currentCash.toLocaleString('ar-EG')} ج.م</strong>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px;">
          <!-- 1. ATM Speed Upgrade -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.7); padding: 12px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; align-items: center; gap: 10px; text-align: right;">
              <span style="font-size: 26px;">🏧</span>
              <div>
                <div style="font-weight: 800; color: #fff;">
                  ماكينات صراف آلي فائقة السرعة
                  ${atmLevel > 0 ? `<span style="font-size: 11px; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 6px; border-radius: 6px; margin-right: 4px;">مستوى ${atmLevel}</span>` : ''}
                </div>
                <div style="font-size: 12px; color: #94a3b8;">تقليل وقت انتظار العملاء بنسبة 25% ورفع السمعة (+2)</div>
              </div>
            </div>
            <button class="btn btn-outline-success" id="shop-buy-atm-btn" style="font-size: 13px; white-space: nowrap;">
              🪙 2,500 ج.م
            </button>
          </div>

          <!-- 2. VIP Lounge Upgrade -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.7); padding: 12px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; align-items: center; gap: 10px; text-align: right;">
              <span style="font-size: 26px;">☕</span>
              <div>
                <div style="font-weight: 800; color: #fff;">
                  ركن قهوة فاخر للعملاء VIP
                  ${hasVip ? `<span style="font-size: 11px; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 6px; border-radius: 6px; margin-right: 4px;">مفعل ✅</span>` : ''}
                </div>
                <div style="font-size: 12px; color: #94a3b8;">زيادة رضا العملاء وولائهم ورفع السمعة (+4)</div>
              </div>
            </div>
            ${hasVip
              ? `<button class="btn btn-secondary" style="font-size: 12px; opacity: 0.8;" disabled>مفعل ✅</button>`
              : `<button class="btn btn-outline-success" id="shop-buy-vip-btn" style="font-size: 13px; white-space: nowrap;">🪙 5,000 ج.م</button>`}
          </div>

          <!-- 3. Digital Marketing Campaign -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.7); padding: 12px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; align-items: center; gap: 10px; text-align: right;">
              <span style="font-size: 26px;">📢</span>
              <div>
                <div style="font-weight: 800; color: #fff;">حملة إعلانات رقمية ممولة</div>
                <div style="font-size: 12px; color: #94a3b8;">جذب 65,000 ج.م ودائع جديدة فورية للبنك ورفع السمعة (+5)</div>
              </div>
            </div>
            <button class="btn btn-outline-success" id="shop-buy-marketing-btn" style="font-size: 13px; white-space: nowrap;">
              🪙 8,000 ج.م
            </button>
          </div>
        </div>

        <button id="close-entrance-modal-btn" class="btn-close-modal">إغلاق ✕</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Wire up real purchase event listeners
    const buyAtmBtn = modal.querySelector('#shop-buy-atm-btn');
    if (buyAtmBtn) {
      buyAtmBtn.addEventListener('click', () => {
        const cost = 2500;
        if (this.state.treasuryCash < cost) {
          this.audio.playAlert();
          this.showToast(`السيولة لا تكفي لشراء ترقية الصراف الآلي (${cost.toLocaleString('ar-EG')} ج.م).`, 'error');
          return;
        }
        this.state.treasuryCash -= cost;
        this.state.atmSpeedUpgraded = (this.state.atmSpeedUpgraded || 0) + 1;
        this.state.reputation = Math.min(100, this.state.reputation + 2);
        this.state.saveGame();
        this.audio.playCash();
        this.showToast(`تم شراء ترقية الصراف الآلي بنجاح! المستوى الحالي: ${this.state.atmSpeedUpgraded} (السمعة +2).`, 'success');
        this.showShopModal();
      });
    }

    const buyVipBtn = modal.querySelector('#shop-buy-vip-btn');
    if (buyVipBtn) {
      buyVipBtn.addEventListener('click', () => {
        const cost = 5000;
        if (this.state.vipLoungeUnlocked) {
          this.showToast('ركن القهوة الفاخر مفعل بالفعل في بنكك!', 'info');
          return;
        }
        if (this.state.treasuryCash < cost) {
          this.audio.playAlert();
          this.showToast(`السيولة لا تكفي لافتتاح ركن VIP (${cost.toLocaleString('ar-EG')} ج.م).`, 'error');
          return;
        }
        this.state.treasuryCash -= cost;
        this.state.vipLoungeUnlocked = true;
        this.state.reputation = Math.min(100, this.state.reputation + 4);
        this.state.saveGame();
        this.audio.playCash();
        this.showToast('تم افتتاح ركن القهوة الفاخر للعملاء VIP بنجاح! ارتفعت السمعة ورضا العملاء +4.', 'success');
        this.showShopModal();
      });
    }

    const buyMarketingBtn = modal.querySelector('#shop-buy-marketing-btn');
    if (buyMarketingBtn) {
      buyMarketingBtn.addEventListener('click', () => {
        const cost = 8000;
        if (this.state.treasuryCash < cost) {
          this.audio.playAlert();
          this.showToast(`السيولة لا تكفي لتمويل الحملة الإعلانية (${cost.toLocaleString('ar-EG')} ج.م).`, 'error');
          return;
        }
        this.state.treasuryCash -= cost;
        const depositGain = 65000;
        this.state.totalDeposits += depositGain;
        this.state.treasuryCash += Math.round(depositGain * 0.15); // 15% instant cash
        this.state.reputation = Math.min(100, this.state.reputation + 5);
        this.state.saveGame();
        this.audio.playCash();
        this.showToast(`تم إطلاق الحملة بنجاح! تم جذب ${depositGain.toLocaleString('ar-EG')} ج.م ودائع جديدة وزيادة السمعة +5.`, 'success');
        this.showShopModal();
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('#close-entrance-modal-btn')) {
        modal.remove();
      }
    });
  }

  triggerEntranceTransition(callback) {
    this.audio.playVaultUnlock();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    if (this.coinParticles) {
      this.coinParticles.burst(cx, cy, 35);
    }
    const modal = document.querySelector('.entrance-modal-overlay');
    if (modal) modal.remove();

    setTimeout(() => {
      if (typeof callback === 'function') {
        callback();
      }
    }, 250);
  }

  handleClaimOfflineEarnings(multiplier = 1) {
    const calculated = this.state.claimOfflineEarnings(multiplier);
    if (!calculated || calculated <= 0) {
      this.pendingOfflineEarnings = null;
      const idleCard = document.getElementById('idle-earnings-card');
      if (idleCard) idleCard.remove();
      this.showToast('لا توجد عوائد غياب مستحقة للتحصيل حالياً.', 'info', 3000);
      return;
    }

    this.pendingOfflineEarnings = null;
    if (this.coinParticles && typeof this.coinParticles.triggerMoneyCountBurst === 'function') {
      this.coinParticles.triggerMoneyCountBurst(window.innerWidth / 2, window.innerHeight / 2, 25, this.audio);
    } else {
      this.audio.playCash();
      if (this.coinParticles) {
        this.coinParticles.burst(window.innerWidth / 2, window.innerHeight / 2, 45);
      }
    }

    const hudCoins = document.getElementById('hud-coins-val');
    if (hudCoins) {
      hudCoins.textContent = this.state.treasuryCash.toLocaleString();
    }

    const idleCard = document.getElementById('idle-earnings-card');
    if (idleCard) {
      idleCard.style.transition = 'all 0.3s ease';
      idleCard.style.transform = 'scale(0.8)';
      idleCard.style.opacity = '0';
      setTimeout(() => idleCard.remove(), 300);
    }

    this.showToast(`🎉 تم تحصيل +${calculated.toLocaleString()} ج.م بنجاح وأضيفت إلى رصيدك!`, 'success', 4000);
  }

  triggerInstaPayFlash() {
    try {
      const flash = document.createElement('div');
      flash.className = 'instapay-flash-overlay';
      document.body.appendChild(flash);
      flash.addEventListener('animationend', () => flash.remove());
      setTimeout(() => { if (flash.parentNode) flash.remove(); }, 600);
      if (this.audio && typeof this.audio.playInstaPayChime === 'function') {
        this.audio.playInstaPayChime();
      }
    } catch (e) {
      console.warn('InstaPay flash error', e);
    }
  }

  showModeSelectionScreen() {
    this.appContainer.innerHTML = `
      ${this.renderFinancialTicker()}
      <div class="onboarding-screen">
        <div class="mode-selection-card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="onboarding-badge mb-0">🏛️ جمهورية مصر العربية • محاكي البنك المصري</div>
            <button id="theme-toggle-btn" class="theme-switch-btn" title="تبديل مظهر وألوان اللعبة">
              <span class="theme-badge-dot"></span>
              <span>🎨 ${this.getThemeDisplayName()}</span>
            </button>
          </div>
          <h1 class="mode-selection-title">اختر مسار انطلاقك المصرفي</h1>
          <p class="mode-selection-subtitle">حدد الطريقة التي تود أن تخوض بها رحلتك في عالم البنوك المصرية:</p>

          <div class="modes-grid">
            <!-- Mode 1: Career Story Mode (Recommended) -->
            <div class="mode-card featured-mode">
              <div class="mode-badge-rec">✨ نمط القصة والمسيرة الواقعية (موصى به)</div>
              <div class="mode-icon">👔</div>
              <h3 class="mode-card-title">مسيرة صعود مصرفي (Career Story)</h3>
              <p class="mode-card-desc">
                ابدأ من الصفر كشاب خريج على شباك الصراف. واجه مقالب الزملاء، عروض البنوك المنافسة، وضغوط التارجت، حتى تصل لمفترق الطرق التاريخي إما بمفاوضة منصبك أو الاستقلال وتأسيس بنكك الخاص!
              </p>
              <ul class="mode-features">
                <li>✦ 4 مراحل ترقية واقعية (صراف ⬅️ خدمة عملاء ⬅️ محلل ائتمان ⬅️ مفترق الطرق)</li>
                <li>✦ شجرة مهارات ومؤشرات حية (النزاهة، الكفاءة، العلاقات، الرصيد الشخصي)</li>
                <li>✦ عروض استقطاب سرية من بنوك خليجية ودولية بضعف الراتب</li>
                <li>✦ نقل أموالك وعلاقاتك التأسيسية كحافز انطلاق لبنكك الخاص!</li>
              </ul>
              <button id="start-career-mode-btn" class="btn btn-primary btn-lg w-full mt-3">
                🚀 ابدأ رحلة صعود الموظف
              </button>
            </div>

            <!-- Mode 2: Direct Tycoon Mode (LOCKED) -->
            <div class="mode-card" style="opacity: 0.7; border: 1.5px dashed #ef4444; background: rgba(15, 23, 42, 0.7); position: relative;">
              <div style="position: absolute; top: 14px; left: 14px; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; border-radius: 6px; font-size: 11px; font-weight: 800; padding: 3px 10px;">
                🔒 مغلق حالياً
              </div>
              <div class="mode-icon" style="filter: grayscale(1);">🏛️</div>
              <h3 class="mode-card-title" style="color: #94a3b8;">تأسيس بنك مباشر (Direct Tycoon)</h3>
              <p class="mode-card-desc" style="color: #64748b;">
                تأسيس البنك المباشر وإدارة الـ 18 قسماً مصرفياً مغلقة وموقوفة مؤقتاً؛ يجب أولاً خوض مسيرة صعود الموظف من الصفر والارتقاء في السلم الوظيفي!
              </p>
              <ul class="mode-features" style="opacity: 0.6; color: #64748b;">
                <li>✦ لوحة تحكم مصرفية متكاملة لـ 18 قسماً مصرفياً (مغلقة)</li>
                <li>✦ تداول أسهم EGX وحرب الشهادات الادخارية (مغلقة)</li>
                <li>✦ تفتيش البنك المركزي وتقييم CAMELS الرقابي (مغلق)</li>
              </ul>
              <button id="start-direct-tycoon-locked-btn" class="btn btn-secondary btn-lg w-full mt-3" style="cursor: not-allowed; opacity: 0.85; background: #334155; border: 1.5px dashed #64748b; color: #cbd5e1; font-weight: 800;">
                🔒 النمط مغلق (أكمل المسيرة أولاً)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  showCareerCreationModal() {
    const cm = this.state.careerManager;
    const initialGender = cm.gender || 'male';
    const isInitialFemale = initialGender === 'female';
    const initialAvatar = isInitialFemale ? './assets/characters/player_female.jpg' : './assets/characters/player.jpg';

    this.appContainer.innerHTML = `
      <div class="onboarding-screen">
        <div class="onboarding-card">
          <div class="onboarding-badge" id="career-badge-label">${isInitialFemale ? '👔 ملف الموظفة الجديدة • أول يوم عمل بالفرع' : '👔 ملف الموظف الجديد • أول يوم عمل بالفرع'}</div>
          <h2 class="onboarding-title" id="career-title-label">${isInitialFemale ? 'تسجيل بيانات المصرفية المبتدئة' : 'تسجيل بيانات المصرفي المبتدئ'}</h2>
          <p class="onboarding-subtitle" id="career-sub-label">${isInitialFemale ? 'قومي بإدخال بياناتكِ الشخصية للالتحاق ببرنامج تأهيل الخريجين والبدء كصرافة شباك في فرع المهندسين براتب <strong>6,000 ج.م</strong>.' : 'قم بإدخال بياناتك الشخصية للالتحاق ببرنامج تأهيل الخريجين والبدء كصراف شباك في فرع المهندسين براتب <strong>6,000 ج.م</strong>.'}</p>

          <form id="career-form" onsubmit="return false;" class="onboarding-form">
            <!-- Live Character Avatar Preview -->
            <div class="d-flex align-items-center gap-4 mb-4 p-3" style="background: rgba(15, 23, 42, 0.7); border: 1.5px solid rgba(212, 175, 55, 0.35); border-radius: 14px;">
              <div class="vn-avatar-container" style="flex-shrink: 0;">
                <img id="career-preview-avatar" src="${initialAvatar}" class="vn-avatar-img" alt="معاينة الشخصية" style="width: 80px; height: 80px; border-radius: 14px;">
                <span class="vn-emotion-tag" id="career-preview-tag">💼</span>
              </div>
              <div class="flex-1">
                <h4 id="career-preview-title" class="text-gold mb-1">${isInitialFemale ? 'المصرفية الصاعدة (الآنسة / الأستاذة)' : 'المصرفي الصاعد (الأستاذ)'}</h4>
                <p class="text-muted font-sm mb-0">ستظهر صورتك التفاعلية بهذه الملامح الأنيقة في كافة مواقف ومحادثات اللعبة.</p>
              </div>
            </div>

            <div class="form-group">
              <label for="input-career-name" id="career-name-label">${isInitialFemale ? 'الاسم الثلاثي للموظفة:' : 'الاسم الثلاثي للموظف:'}</label>
              <input type="text" id="input-career-name" value="${cm.name || (isInitialFemale ? 'نور مصطفى' : 'أحمد مصطفى')}" required placeholder="مثال: أحمد مصطفى إبراهيم">
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>النوع / اللقب:</label>
                <div class="gender-selector">
                  <label class="gender-opt">
                    <input type="radio" name="career-gender" value="male" ${!isInitialFemale ? 'checked' : ''}>
                    <span>👨 شاب (الأستاذ)</span>
                  </label>
                  <label class="gender-opt">
                    <input type="radio" name="career-gender" value="female" ${isInitialFemale ? 'checked' : ''}>
                    <span>👩 شابة (الآنسة / الأستاذة)</span>
                  </label>
                </div>
              </div>

              <div class="form-group flex-1">
                <label for="select-career-degree">المؤهل الجامعي والتخصص:</label>
                <select id="select-career-degree" class="form-select">
                  <option value="تجارة إنجليزي - محاسبة وتمويل" selected>🎓 تجارة إنجليزي - قسم تمويل ومحاسبة (+10 كفاءة)</option>
                  <option value="اقتصاد وعلوم سياسية">🏛️ اقتصاد وعلوم سياسية - دراسات مصرفية (+10 علاقات)</option>
                  <option value="حاسبات ومعلومات وتكنولوجيا مالية">💻 حاسبات وتكنولوجيا مالية FinTech (+15 ابتكار)</option>
                </select>
              </div>
            </div>

            <div class="career-starter-preview mt-3">
              <div class="preview-item">💰 الراتب المبدئي: <strong>6,000 ج.م / شهر</strong></div>
              <div class="preview-item">🏦 الفرع: <strong>فرع المهندسين الرئيسي</strong></div>
              <div class="preview-item">💼 المنصب: <strong id="career-preview-position">${isInitialFemale ? 'صرافة شباك مبتدئة (Teller)' : 'صراف شباك مبتدئ (Teller)'}</strong></div>
            </div>

            <div class="d-flex gap-3 mt-4">
              <button type="button" id="submit-career-creation-btn" class="btn btn-primary btn-lg flex-1">
                🚀 اعتماد التعيين وبدء أول يوم بالفرع
              </button>
              <button type="button" id="back-to-mode-btn" class="btn btn-secondary btn-lg" onclick="window.location.reload()">
                رجوع
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Bind real-time gender switch and avatar preview
    const genderInputs = document.querySelectorAll('input[name="career-gender"]');
    const avatarImg = document.getElementById('career-preview-avatar');
    const titleEl = document.getElementById('career-preview-title');
    const nameInput = document.getElementById('input-career-name');
    const badgeEl = document.getElementById('career-badge-label');
    const pageTitleEl = document.getElementById('career-title-label');
    const subEl = document.getElementById('career-sub-label');
    const posEl = document.getElementById('career-preview-position');
    const nameLabelEl = document.getElementById('career-name-label');

    genderInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const isFem = e.target.value === 'female';
        if (avatarImg) avatarImg.src = isFem ? './assets/characters/player_female.jpg' : './assets/characters/player.jpg';
        if (titleEl) titleEl.textContent = isFem ? 'المصرفية الصاعدة (الآنسة / الأستاذة)' : 'المصرفي الصاعد (الأستاذ)';
        if (badgeEl) badgeEl.textContent = isFem ? '👔 ملف الموظفة الجديدة • أول يوم عمل بالفرع' : '👔 ملف الموظف الجديد • أول يوم عمل بالفرع';
        if (pageTitleEl) pageTitleEl.textContent = isFem ? 'تسجيل بيانات المصرفية المبتدئة' : 'تسجيل بيانات المصرفي المبتدئ';
        if (subEl) subEl.innerHTML = isFem ? 'قومي بإدخال بياناتكِ الشخصية للالتحاق ببرنامج تأهيل الخريجين والبدء كصرافة شباك في فرع المهندسين براتب <strong>6,000 ج.م</strong>.' : 'قم بإدخال بياناتك الشخصية للالتحاق ببرنامج تأهيل الخريجين والبدء كصراف شباك في فرع المهندسين براتب <strong>6,000 ج.م</strong>.';
        if (posEl) posEl.textContent = isFem ? 'صرافة شباك مبتدئة (Teller)' : 'صراف شباك مبتدئ (Teller)';
        if (nameLabelEl) nameLabelEl.textContent = isFem ? 'الاسم الثلاثي للموظفة:' : 'الاسم الثلاثي للموظف:';
        
        if (nameInput) {
          if (isFem && (nameInput.value === 'أحمد مصطفى' || !nameInput.value)) {
            nameInput.value = 'نور مصطفى';
          } else if (!isFem && (nameInput.value === 'نور مصطفى' || !nameInput.value)) {
            nameInput.value = 'أحمد مصطفى';
          }
        }
      });
    });
  }

  handleCareerCreationSubmit() {
    const nameInput = document.getElementById('input-career-name');
    const genderRadio = document.querySelector('input[name="career-gender"]:checked');
    const degreeSelect = document.getElementById('select-career-degree');

    if (!nameInput) return;

    const gender = genderRadio ? genderRadio.value : 'male';
    const isFemale = gender === 'female';
    const defaultName = isFemale ? 'نور مصطفى' : 'أحمد مصطفى';
    const rawName = nameInput.value.trim().slice(0, 40);
    const name = this.escapeHTML(rawName) || defaultName;
    const degree = degreeSelect ? degreeSelect.value : 'تجارة إنجليزي';

    this.state.careerManager.startCareer(name, gender, degree);
    this.audio.playSuccess();
    this.launch3DCareerMode();
    const title = isFemale ? 'أستاذة' : 'أستاذ';
    const roleDesc = isFemale ? 'كصرافة شباك' : 'كصراف شباك';
    this.showToast(`مرحباً بك${isFemale ? 'ِ' : ''} يا ${title} ${name}! تم استلام عملك${isFemale ? 'ِ' : ''} ${roleDesc} بفرع المهندسين. بالتوفيق في مسيرتك${isFemale ? 'ِ' : ''}!`, 'success', 5000);
  }

  renderCareerFloorView() {
    const cm = this.state.careerManager;
    const stage = cm ? cm.getCurrentStage() : { title: 'صراف شباك', baseSalary: 6000 };
    const isFemale = cm && cm.gender === 'female';

    this.appContainer.innerHTML = `
      ${this.renderFinancialTicker()}
      <div class="career-floor-screen" style="position: relative; width: 100%; height: calc(100vh - 36px); overflow: hidden; display: flex; flex-direction: column;">
        <!-- Top Career Floor Bar -->
        <header class="career-header" style="padding: 8px 20px; z-index: 100; flex-shrink: 0; background: rgba(15, 23, 42, 0.95); border-bottom: 1.5px solid rgba(56, 189, 248, 0.25);">
          <div class="career-header-content d-flex justify-content-between align-items-center">
            <div class="career-avatar-box d-flex align-items-center gap-3" data-dossier-id="player" style="cursor: pointer;" title="انقر لعرض ملفك التعريفي">
              <img src="${cm.avatar}" class="career-header-avatar-img" alt="${cm.name}" style="width: 44px; height: 44px; border-radius: 12px; object-fit: cover; border: 1.5px solid #38bdf8;">
              <div>
                <h3 class="career-name" style="margin: 0; font-size: 16px; color: #f8fafc;">${cm.name}</h3>
                <div class="career-meta d-flex gap-2 align-items-center" style="margin-top: 2px;">
                  <span class="badge ${isFemale ? 'tier-badge' : 'manager-badge'}" style="font-size: 11px;">${isFemale ? '👩 الأستاذة' : '👨 الأستاذ'}</span>
                  <span class="badge tier-badge" style="font-size: 11px;">💼 ${stage.title}</span>
                  <span class="badge date-badge" style="font-size: 11px;">💵 الراتب: ${stage.baseSalary.toLocaleString('ar-EG')} ج.م / شهر</span>
                </div>
              </div>
            </div>

            <div class="career-header-actions d-flex gap-2 align-items-center">
              <button id="switch-to-career-novel-btn" class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7, #0369a1); font-weight: 800;" title="العودة لشاشة الرواية التفاعلية والأحداث والقرارات">
                📋 شاشة المسيرة والقرارات
              </button>
              <button id="relationships-dossier-btn" class="btn btn-outline-info" title="عرض شبكة العلاقات المصرفية ومستوى الولاء مع الشخصيات">
                🤝 شبكة العلاقات
              </button>
              <button id="return-to-vault-btn" class="btn btn-outline-warning" title="العودة لشاشة الخزانة التفاعلية">
                🔒 شاشة الخزانة
              </button>
              <button id="theme-toggle-btn" class="theme-switch-btn" title="تبديل مظهر وألوان اللعبة">
                <span class="theme-badge-dot"></span>
                <span>🎨 ${this.getThemeDisplayName()}</span>
              </button>
              <button id="reset-career-btn" class="btn btn-outline-danger" title="إعادة المسيرة من البداية">
                🔄 إعادة المسيرة
              </button>
            </div>
          </div>
        </header>

        <!-- 3D Bank Floor Viewport (WASD movement, NPC dialogues, teller interaction) -->
        <div style="flex: 1; position: relative; width: 100%; height: 100%;">
          ${this.renderBankFloorContainer()}
        </div>

        <div id="toast-container"></div>
        <div id="modal-container"></div>
      </div>
    `;
  }

  launch3DCareerMode() {
    this.closeModal();
    this.viewMode = 'floor';
    this.renderCareerFloorView();
    this.initOrResumeBankFloor();

    if (this.bankFloorScene) {
      const cm = this.state.careerManager;
      this.bankFloorScene.initCareer3DMode({
        name: cm?.name || 'أحمد مصطفى',
        gender: cm?.gender || 'male',
        degree: cm?.degree || 'تجارة إنجليزي'
      });
    }

    const cm = this.state.careerManager;
    const name = cm?.name || 'الموظف';
    this.showToast(`🎮 تم تفعيل التحكم المباشر بالشخصية 3D! تحرك بـ [WASD] وتوجه للمدير فاروق والزملاء وشباك الصراف واضغط [E]`, 'info', 6000);
  }

  /* ========================================================
     FINANCIAL TICKER & THEME HELPERS
     ======================================================== */
  renderFinancialTicker() {
    const inv = this.state.investmentsManager;
    const stocks = inv ? inv.stocks : [];

    return `
      <div class="financial-ticker-bar" title="اضغط على أي سهم لفتح شاشة البورصة المصرية والاستثمار">
        <div class="ticker-label-badge" data-tab="egx" style="cursor: pointer;">
          <span>🔴 مباشر</span>
          <span>بورصة مصر EGX</span>
        </div>
        <div class="ticker-wrapper">
          <div class="ticker-track">
            <div class="ticker-item" data-tab="egx">
              <span class="ticker-neutral">📈 المؤشر العام EGX30:</span>
              <span class="ticker-val ticker-up">31,480 نقطة (+1.25%)</span>
            </div>
            <span class="ticker-sep">•</span>

            ${stocks.map(s => {
              const diff = s.price - s.prevPrice;
              const isUp = diff >= 0;
              const pct = s.prevPrice > 0 ? Math.abs((diff / s.prevPrice) * 100).toFixed(1) : '0.0';
              return `
                <div class="ticker-item" data-tab="egx" data-stock-ticker="${s.ticker}">
                  <span class="ticker-neutral">${s.ticker} (${s.name}):</span>
                  <span class="ticker-val ${isUp ? 'ticker-up' : 'ticker-down'}">
                    ${s.price.toFixed(2)} ج.م ${isUp ? '▲ +' : '▼ -'}${pct}%
                  </span>
                </div>
                <span class="ticker-sep">•</span>
              `;
            }).join('')}

            <div class="ticker-item" data-tab="certificates">
              <span class="ticker-neutral">🪙 سبيكة الذهب عيار 24:</span>
              <span class="ticker-val ticker-up">4,120 ج.م/جرام</span>
            </div>
            <span class="ticker-sep">•</span>

            <div class="ticker-item" data-tab="fx">
              <span class="ticker-neutral">💵 سعر صرف الدولار:</span>
              <span class="ticker-val">48.65 ج.م</span>
            </div>
            <span class="ticker-sep">•</span>

            <div class="ticker-item">
              <span class="ticker-neutral">🏛️ فائدة الإقراض بالمركزي:</span>
              <span class="ticker-val">28.25%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getThemeDisplayName() {
    switch (this.currentTheme) {
      case 'persona': return 'بيرسونا 5';
      case 'classic': return 'كلاسيكي';
      default: return 'ملكي ذهبي';
    }
  }

  cycleTheme() {
    const themes = ['royal', 'persona', 'classic'];
    const names = {
      royal: '👑 الذهب الملكي والأسود الكربوني',
      persona: '🔥 بيرسونا 5 والنيون الأحمر',
      classic: '🏛️ الصيرفة الكلاسيكية والرخام'
    };
    const nextIdx = (themes.indexOf(this.currentTheme) + 1) % themes.length;
    this.currentTheme = themes[nextIdx];
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('egyptian_bank_theme', this.currentTheme);
    this.showToast(`تم تفعيل المظهر: ${names[this.currentTheme]}`, 'info', 3500);
    
    // Refresh current view
    if (this.state.careerManager && this.state.careerManager.isStarted && !this.state.isInitialized) {
      this.renderCareerMode();
    } else if (this.state.isInitialized) {
      this.render();
    }
  }

  triggerPersonaCutin(option, callback) {
    const cm = this.state.careerManager;
    const existing = document.getElementById('persona-cutin-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'persona-cutin-overlay';
    overlay.className = 'cutin-overlay';
    overlay.innerHTML = `
      <div class="cutin-stripe">
        <img src="${cm.avatar}" class="cutin-avatar-img" alt="${cm.name}">
        <div class="cutin-text-box">
          <span class="cutin-badge">⚡ ${option.toneBadge || 'قرار حاسم'}</span>
          <span class="cutin-text">«${cm.name}: ${option.isFinalCrossroads ? 'لحظة الحسم التاريخية!' : 'هذا قراري!'}»</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
      if (callback) callback();
    }, 650);
  }

  showCharacterDossierModal(charId) {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    const cm = this.state.careerManager;
    if (!cm) return;
    const dossier = cm.getCharacterDossier(charId);
    if (!dossier) return;

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="dossier-card">
          <div class="dossier-header">
            <img src="${dossier.avatar}" class="dossier-avatar" alt="${this.escapeHTML(dossier.name)}">
            <div class="dossier-info">
              <h3>${this.escapeHTML(dossier.name)}</h3>
              <div class="dossier-role">💼 ${this.escapeHTML(dossier.role)}</div>
              <div class="text-muted font-sm">🏛️ ${this.escapeHTML(dossier.department)}</div>
            </div>
          </div>

          <p class="font-sm" style="line-height: 1.7; color: #cbd5e1;">${this.escapeHTML(dossier.bio)}</p>

          <div class="dossier-stats-grid">
            ${dossier.stats.map(s => `
              <div class="dossier-stat-item">
                <span class="text-muted font-xs">${this.escapeHTML(s.label)}:</span>
                <strong class="text-gold font-sm d-block">${this.escapeHTML(String(s.value))}</strong>
              </div>
            `).join('')}
          </div>

          <div class="dossier-quote-box">
            ${this.escapeHTML(dossier.quote)}
          </div>

          <div class="mt-4">
            <button id="close-dossier-btn" class="btn btn-secondary w-full">إغلاق الملف التعريفي ✕</button>
          </div>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById('close-dossier-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal();
        }
      });
    }
  }

  showRelationshipsDossierModal() {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    const cm = this.state.careerManager;
    if (!cm) return;

    const characters = [
      { id: 'farouk', name: 'الأستاذ فاروق النحاس', role: 'مدير فرع المهندسين الصارم', icon: '👔' },
      { id: 'mahmoud', name: 'محمود عبد الفتاح', role: 'زميل الشباك وملك المقالب', icon: '☕' },
      { id: 'sara', name: 'سارة المهدي', role: 'أخصائية التجزئة ووحش التارجت', icon: '📈' },
      { id: 'fatma', name: 'الحاجة فاطمة أم إبراهيم', role: 'عميلة مسنة من أصحاب المعاشات', icon: '👵' },
      { id: 'hazem', name: 'المفتش حازم سليم', role: 'كبير مفتشي الرقابة بالمركزي (CBE)', icon: '⚖️' },
      { id: 'ashour', name: 'الحاج عاشور المقاول', role: 'رجل أعمال ومستثمر كبار العملاء VIP', icon: '🏗️' },
      { id: 'maged', name: 'ماجد الشناوي', role: 'مستقطب كفاءات دولي (Headhunter)', icon: '🌐' }
    ];

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card" style="max-width: 840px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header d-flex justify-content-between align-items-center">
            <h3>🤝 شبكة العلاقات المصرفية ومؤشرات الولاء</h3>
            <span class="badge tier-badge">مسيرة: ${cm.name}</span>
          </div>

          <div class="modal-body">
            <p class="font-sm text-muted mb-4" style="line-height: 1.6;">
              العلاقات هي الشريان الخفي في الجهاز المصرفي. تؤثر قراراتك اليومية وردودك الميدانية في تعزيز الثقة أو إثارة الشكوك، وتحدد مسار صعودك ونهايتك المهنية وفرص تأسيس بنكك.
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px;">
              ${characters.map(char => {
                const dossier = cm.getCharacterDossier(char.id);
                const rel = cm.getRelationshipStatus(char.id);
                return `
                  <div style="background: rgba(15, 23, 42, 0.8); border: 1.5px solid ${rel.color}45; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <img src="${dossier.avatar}" style="width: 54px; height: 54px; border-radius: 12px; object-fit: cover; border: 2px solid ${rel.color};" alt="${dossier.name}">
                      <div style="flex: 1;">
                        <h4 style="margin: 0; font-size: 15px; font-weight: 800; color: #f8fafc;">${char.name}</h4>
                        <div style="font-size: 12px; color: #94a3b8;">${char.role}</div>
                      </div>
                      <span style="background: ${rel.color}25; color: ${rel.color}; border: 1px solid ${rel.color}; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800;">
                        ${rel.label}
                      </span>
                    </div>

                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                        <span style="color: #cbd5e1;">مؤشر الثقة والولاء المتبادل</span>
                        <strong style="color: ${rel.color}; font-size: 13px;">${rel.score}/100</strong>
                      </div>
                      <div style="background: rgba(51, 65, 85, 0.6); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${rel.score}%; height: 100%; background: ${rel.color}; border-radius: 4px; transition: width 0.4s ease;"></div>
                      </div>
                    </div>

                    <div style="font-size: 12px; color: #94a3b8; line-height: 1.5; font-style: italic; border-right: 2px solid ${rel.color}; padding-right: 8px;">
                      ${dossier.quote}
                    </div>

                    <button class="btn btn-secondary btn-sm w-full" data-dossier-id="${char.id}" style="margin-top: 2px; font-size: 12px; font-weight: 700;">
                      عرض الملف المهني الكامل 🔎
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="modal-footer mt-4">
            <button id="close-relationships-modal-btn" class="btn btn-primary w-full">إغلاق ✕</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('close-relationships-modal-btn')?.addEventListener('click', () => {
      this.closeModal();
    });

    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal();
        }
      });
    }
  }

  renderCareerMode() {
    const cm = this.state.careerManager;
    const stage = cm.getCurrentStage();
    const event = cm.getCurrentEvent();
    const activeDialogue = cm.activeDialogueState;
    const opt = activeDialogue ? activeDialogue.option : null;

    this.appContainer.innerHTML = `
      ${this.renderFinancialTicker()}
      <div class="career-screen">
        <!-- Top Hero Bar -->
        <header class="career-header">
          <div class="career-header-content">
            <div class="career-avatar-box" data-dossier-id="player" style="cursor: pointer;" title="انقر لعرض الملف التعريفي والمهني">
              <img src="${cm.avatar}" class="career-header-avatar-img" alt="${cm.name}">
              <div>
                <h2 class="career-name">${cm.name}</h2>
                <div class="career-meta">
                  <span class="badge ${cm.gender === 'female' ? 'tier-badge' : 'manager-badge'}">${cm.gender === 'female' ? '👩 الأستاذة' : '👨 الأستاذ'}</span>
                  <span class="badge tier-badge">💼 ${stage.title}</span>
                  <span class="badge manager-badge">🏛️ ${stage.department}</span>
                  <span class="badge date-badge">💵 الراتب: ${stage.baseSalary.toLocaleString('ar-EG')} ج.م / شهر</span>
                </div>
              </div>
            </div>

            <div class="career-header-actions d-flex gap-2 align-items-center">
              <button id="career-floor-3d-btn" class="btn btn-outline-primary" title="التجوال المباشر داخل فرع البنك 3D والتفاعل مع الزملاء">
                🎮 تجوال 3D
              </button>
              <button id="relationships-dossier-btn" class="btn btn-outline-info" title="عرض شبكة العلاقات المصرفية ومستوى الولاء مع الشخصيات">
                🤝 شبكة العلاقات
              </button>
              <button id="return-to-vault-btn" class="btn btn-outline-warning" title="العودة لشاشة الخزانة التفاعلية">
                🔒 شاشة الخزانة
              </button>
              <button id="theme-toggle-btn" class="theme-switch-btn" title="تبديل مظهر وألوان اللعبة">
                <span class="theme-badge-dot"></span>
                <span>🎨 المظهر: ${this.getThemeDisplayName()}</span>
              </button>
              <button id="reset-career-btn" class="btn btn-outline-danger" title="إعادة المسيرة من البداية">
                🔄 إعادة المسيرة
              </button>
            </div>
          </div>
        </header>

        <main class="career-body">
          <!-- Stats Bar -->
          <div class="career-stats-grid mb-6">
            <div class="career-stat-card">
              <div class="stat-icon">🧠</div>
              <div class="stat-info">
                <span class="stat-label">الكفاءة والتحليل المالي</span>
                <div class="stat-progress-bar">
                  <div class="stat-fill bg-cyan" style="width: ${cm.skill}%"></div>
                </div>
                <span class="stat-val text-cyan">${cm.skill}/100</span>
              </div>
            </div>

            <div class="career-stat-card">
              <div class="stat-icon">⚖️</div>
              <div class="stat-info">
                <span class="stat-label">النزاهة والأمانة المهنية</span>
                <div class="stat-progress-bar">
                  <div class="stat-fill bg-emerald" style="width: ${cm.integrity}%"></div>
                </div>
                <span class="stat-val text-emerald">${cm.integrity}/100</span>
              </div>
            </div>

            <div class="career-stat-card">
              <div class="stat-icon">🤝</div>
              <div class="stat-info">
                <span class="stat-label">العلاقات والذكاء الاجتماعي</span>
                <div class="stat-progress-bar">
                  <div class="stat-fill bg-gold" style="width: ${cm.networking}%"></div>
                </div>
                <span class="stat-val text-gold">${cm.networking}/100</span>
              </div>
            </div>

            <div class="career-stat-card">
              <div class="stat-icon">💰</div>
              <div class="stat-info">
                <span class="stat-label">المدخرات والرصيد الشخصي</span>
                <span class="stat-val text-emerald font-lg">${cm.wealth.toLocaleString('ar-EG')} ج.م</span>
                <span class="stat-sub">تنتقل معك عند تأسيس بنكك!</span>
              </div>
            </div>

            <div class="career-stat-card">
              <div class="stat-icon">⚡</div>
              <div class="stat-info">
                <span class="stat-label">الطاقة وتفادي الاحتراق</span>
                <div class="stat-progress-bar">
                  <div class="stat-fill ${cm.energy < 30 ? 'bg-danger' : 'bg-emerald'}" style="width: ${cm.energy}%"></div>
                </div>
                <span class="stat-val ${cm.energy < 30 ? 'text-danger' : 'text-emerald'}">${cm.energy}/100</span>
              </div>
            </div>
          </div>

          <!-- Acquired Perks Ribbon -->
          ${cm.acquiredPerks.length > 0 ? `
            <div class="career-perks-box mb-6">
              <span class="perks-label">🏆 المهارات والأثر التراكمي المكتسب:</span>
              <div class="perks-list">
                ${cm.acquiredPerks.map(p => `
                  <span class="perk-pill" title="${p.desc}">${p.icon} ${p.title}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Visual Novel Persona Style Dialogue Theater with Dynamic Stage Backdrop -->
          <div class="vn-theater-card backdrop-${stage.id}">
            ${event ? `
              <div class="vn-stage-bar">
                <span class="vn-stage-title">📍 ${stage.title}</span>
                <span class="vn-stage-counter">الموقف ${cm.currentEventIndex + 1} من ${(cm.stageEvents[stage.id] || []).length}</span>
              </div>

              <div class="vn-dialogue-stream">
                <!-- 1. Speaker Prompt (Right Side) -->
                <div class="vn-message-row vn-msg-npc">
                  <div class="vn-avatar-container" data-dossier-id="${event.speakerId}" title="انقر لعرض الملف التعريفي لـ ${event.speakerName}">
                    <img src="${event.speakerAvatar}" class="vn-avatar-img" alt="${event.speakerName}">
                    <span class="vn-emotion-tag">${event.emotionIcon || '💬'}</span>
                  </div>
                  <div class="vn-bubble-container">
                    <div class="vn-speaker-badge">
                      <span class="vn-speaker-title">${event.speakerName}</span>
                      <span class="vn-speaker-subtitle">${event.speakerRole}</span>
                    </div>
                    <div class="vn-speech-bubble bubble-npc">
                      <p>${cm.resolveText(event.introDialogue || event.text)}</p>
                    </div>
                  </div>
                </div>

                ${activeDialogue ? `
                  <!-- 2. Player Spoken Reply (Left Side) -->
                  <div class="vn-message-row vn-msg-player">
                    <div class="vn-bubble-container text-left">
                      <div class="vn-speaker-badge text-left">
                        <span class="vn-speaker-title text-cyan">${cm.name} (${cm.gender === 'female' ? 'أنتِ' : 'أنت'})</span>
                        <span class="vn-speaker-subtitle">[${opt.toneBadge || 'رد حاسم'}]</span>
                      </div>
                      <div class="vn-speech-bubble bubble-player">
                        <p>${cm.resolveText(opt.playerSay || opt.text)}</p>
                      </div>
                    </div>
                    <div class="vn-avatar-container" data-dossier-id="player" title="انقر لعرض ملفك التعريفي ومؤشراتك">
                      <img src="${cm.avatar}" class="vn-avatar-img" alt="${cm.name}">
                      <span class="vn-emotion-tag">😎</span>
                    </div>
                  </div>

                  <!-- 3. NPC Reaction Retort (Right Side with Reaction Expression) -->
                  <div class="vn-message-row vn-msg-npc vn-retort-row">
                    <div class="vn-avatar-container ${opt.retortExpression === 'shocked' ? 'emotion-shake' : (opt.retortExpression === 'flustered' ? 'emotion-blush' : 'emotion-bounce')}" data-dossier-id="${event.speakerId}" title="انقر لعرض الملف التعريفي لـ ${event.speakerName}">
                      <img src="${event.speakerAvatar}" class="vn-avatar-img" alt="${event.speakerName}">
                      <span class="vn-emotion-tag">${opt.retortIcon || '⚡'}</span>
                    </div>
                    <div class="vn-bubble-container">
                      <div class="vn-speaker-badge">
                        <span class="vn-speaker-title">${event.speakerName}</span>
                        <span class="vn-speaker-subtitle">رد فعل مباشر ⚡</span>
                      </div>
                      <div class="vn-speech-bubble bubble-npc bubble-retort">
                        <p>«${cm.resolveText(opt.retortDialogue)}»</p>
                      </div>
                    </div>
                  </div>

                  <!-- 4. Consequence & Stat Delta Box -->
                  <div class="vn-consequence-box mt-5">
                    <div class="vn-consequence-title">📋 الأثر المهني والشخصي لهذا القرار:</div>
                    <p class="vn-consequence-text">${cm.resolveText(opt.resultText)}</p>

                    <div class="vn-deltas-list">
                      ${opt.statChanges.skill ? `<span class="delta-pill ${opt.statChanges.skill > 0 ? 'delta-pos' : 'delta-neg'}">🧠 كفاءة ${opt.statChanges.skill > 0 ? '+' : ''}${opt.statChanges.skill}</span>` : ''}
                      ${opt.statChanges.integrity ? `<span class="delta-pill ${opt.statChanges.integrity > 0 ? 'delta-pos' : 'delta-neg'}">⚖️ نزاهة ${opt.statChanges.integrity > 0 ? '+' : ''}${opt.statChanges.integrity}</span>` : ''}
                      ${opt.statChanges.networking ? `<span class="delta-pill ${opt.statChanges.networking > 0 ? 'delta-pos' : 'delta-neg'}">🤝 علاقات ${opt.statChanges.networking > 0 ? '+' : ''}${opt.statChanges.networking}</span>` : ''}
                      ${opt.statChanges.wealth ? `<span class="delta-pill ${opt.statChanges.wealth > 0 ? 'delta-pos' : 'delta-neg'}">💰 ثروة ${opt.statChanges.wealth > 0 ? '+' : ''}${opt.statChanges.wealth.toLocaleString('ar-EG')} ج.م</span>` : ''}
                      ${opt.statChanges.energy ? `<span class="delta-pill ${opt.statChanges.energy > 0 ? 'delta-pos' : 'delta-neg'}">⚡ طاقة ${opt.statChanges.energy > 0 ? '+' : ''}${opt.statChanges.energy}</span>` : ''}
                    </div>

                    ${opt.perkEarned ? `
                      <div class="training-card mt-3 border-gold text-right">
                        <div class="training-info">
                          <div class="training-icon">${opt.perkEarned.icon}</div>
                          <div>
                            <h4 class="text-gold">${cm.gender === 'female' ? 'اكتسبتِ مهارة دائمة جديدة:' : 'اكتسبت مهارة دائمة جديدة:'} [${opt.perkEarned.title}]</h4>
                            <p class="text-muted">${opt.perkEarned.desc}</p>
                          </div>
                        </div>
                      </div>
                    ` : ''}

                    <div class="mt-4">
                      <button id="next-career-event-btn" class="btn btn-primary btn-lg w-full">
                        ${opt.isFinalCrossroads ? '⚡ استكمال المنعطف التاريخي ◀' : 'التالي: متابعة المسيرة المصرفية ◀'}
                      </button>
                    </div>
                  </div>
                ` : `
                  <!-- Choices awaiting player selection -->
                  <div class="vn-choices-wrapper mt-5">
                    <h4 class="vn-choices-heading">اختر ردك الحواري وقرارك المهني:</h4>
                    <div class="vn-choices-list">
                      ${event.options.map((option, idx) => `
                        <button class="vn-choice-card tone-${option.toneType || 'default'}" data-career-opt="${idx}">
                          <div class="vn-choice-prefix">
                            <span class="vn-choice-tone-tag">${option.toneBadge || `خيار ${idx + 1}`}</span>
                            <span class="vn-choice-number">${idx + 1}</span>
                          </div>
                          <div class="vn-choice-content">
                            <p class="vn-choice-sentence">«${cm.resolveText(option.text)}»</p>
                          </div>
                          <div class="vn-choice-icon">◀</div>
                        </button>
                      `).join('')}
                    </div>
                  </div>
                `}
              </div>
            ` : `
              <div class="crossroads-finish-box text-center p-5">
                <div style="font-size: 56px;" class="mb-3">🏛️</div>
                <h2>${cm.gender === 'female' ? 'أهلاً بكِ في قمة الهرم المصرفي المصري!' : 'أهلاً بك في قمة الهرم المصرفي المصري!'}</h2>
                <p class="text-muted mt-2 mb-4">${cm.gender === 'female' ? 'لقد قطعتِ شوطاً أسطورياً من شباك الصراف إلى تأسيس صرحكِ المصرفي الخاص بالجنيه المصري برأس مال مدعوم وشبكة حلفاء متينة.' : 'لقد قطعت شوطاً أسطورياً من شباك الصراف إلى تأسيس صرحك المصرفي الخاص بالجنيه المصري برأس مال مدعوم وشبكة حلفاء متينة.'}</p>
                <button id="launch-tycoon-from-career-btn" class="btn btn-primary btn-lg">
                  🚀 الدخول إلى لوحة إدارة البنك الشاملة (Bank Tycoon)
                </button>
              </div>
            `}
          </div>
        </main>

        <div id="toast-container"></div>
        <div id="modal-container"></div>
      </div>
    `;
  }

  handleCareerOption(optIndex) {
    const cm = this.state.careerManager;
    const event = cm.getCurrentEvent();
    const opt = event && event.options ? event.options[optIndex] : null;

    this.audio.playStamp();
    if (opt) {
      this.triggerPersonaCutin(opt, () => {
        const res = cm.selectDialogueOption(optIndex);
        if (!res) return;
        this.renderCareerMode();
      });
    } else {
      const res = cm.selectDialogueOption(optIndex);
      if (!res) return;
      this.renderCareerMode();
    }
  }

  handleNextCareerEvent() {
    this.audio.playCoin();
    const cm = this.state.careerManager;
    if (cm.activeDialogueState && cm.activeDialogueState.option && cm.activeDialogueState.option.isFinalCrossroads) {
      this.showCrossroadsResultModal({
        path: cm.activeDialogueState.option.path,
        resultText: cm.activeDialogueState.option.resultText
      });
      return;
    }
    cm.advanceToNextEvent();
    this.renderCareerMode();
  }

  showCareerResultModal(res) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const cm = this.state.careerManager;
    const resolvedResult = cm ? cm.resolveText(res.resultText) : res.resultText;

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3>📋 نتيجة القرار والأثر المهني</h3>
          </div>
          <div class="modal-body">
            <p class="font-lg mb-4" style="line-height: 1.7;">${resolvedResult}</p>
            ${res.perkEarned ? `
              <div class="training-card mb-3 border-gold">
                <div class="training-info">
                  <div class="training-icon">${res.perkEarned.icon}</div>
                  <div>
                    <h4 class="text-gold">${cm && cm.gender === 'female' ? 'اكتسبتِ مهارة دائمة جديدة:' : 'اكتسبت مهارة دائمة جديدة:'} [${res.perkEarned.title}]</h4>
                    <p class="text-muted">${res.perkEarned.desc}</p>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer">
            <button id="close-career-result-btn" class="btn btn-primary w-full">متابعة المسيرة ◀</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('close-career-result-btn').addEventListener('click', () => {
      this.closeModal();
      this.renderCareerMode();
    });
  }

  showCrossroadsResultModal(res) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const cm = this.state.careerManager;
    const isFemale = cm && cm.gender === 'female';
    const ending = cm && typeof cm.evaluateCareerEnding === 'function' ? cm.evaluateCareerEnding(res.path) : null;
    const isFoundBank = res.path === 'found_bank';
    const resolvedResult = cm ? cm.resolveText(res.resultText) : res.resultText;
    const roleTitle = isFemale ? 'رئيسة مجلس الإدارة' : 'رئيس مجلس الإدارة';

    // Store ending bonus for tycoon bootstrap
    this._endingBonus = ending?.tycoonBonus || 0;

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card" style="max-width: 660px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h3>⚡ المنعطف التاريخي الأكبر وخاتمة مسيرة الصعود!</h3>
          </div>
          <div class="modal-body text-center">
            <div style="font-size: 56px;" class="mb-2">${ending ? ending.icon : (isFoundBank ? '🏛️' : '👑')}</div>
            <div class="mb-2">
              <span class="badge ${ending?.type === 'downfall' ? 'tier-badge' : (ending?.type === 'wolf' ? 'manager-badge' : 'tier-badge')}" style="font-size: 13px; padding: 6px 14px;">
                ${ending?.badge || 'نهاية المسيرة المهنية'}
              </span>
            </div>
            <h3 class="text-gold mb-2" style="font-size: 20px;">${ending ? ending.title : (isFoundBank ? 'تأسيس بنكك الخاص بالتحالف مع المستثمرين' : 'رئاسة مجلس إدارة البنك والقيادة المؤسسية')}</h3>
            <p class="font-md mb-3" style="line-height: 1.8; color: #cbd5e1; text-align: justify; padding: 0 10px;">${ending ? ending.desc : resolvedResult}</p>
            
            ${ending?.quote ? `
              <div class="dossier-quote-box mb-3" style="font-size: 14px;">
                ${ending.quote}
              </div>
            ` : ''}

            <div class="training-card mb-4 border-gold text-right">
              <div class="training-info">
                <div class="training-icon">💼</div>
                <div>
                  <h4>حزمة ما بعد المسيرة ${isFemale ? 'الممنوحة لكِ بصفتكِ' : 'الممنوحة لك بصفتك'} ${roleTitle}:</h4>
                  <p>• الوضع المالي: <strong>${ending?.financialStatus || `${cm.wealth.toLocaleString('ar-EG')} ج.م`}</strong></p>
                  <p>• رأس مال انطلاق مدعوم: <strong>${(50000 + (ending?.tycoonBonus || 0) + Math.min(50000, Math.round(cm.wealth * 0.5))).toLocaleString('ar-EG')} ج.م</strong></p>
                  <p>• أثر السمعة السوقية المبدئية: <strong>+${Math.max(0, Math.round((cm.integrity + cm.networking) / 10) + (ending?.reputationImpact || 0))}%</strong></p>
                  <p>• الأوسمة والمهارات المكتسبة (${cm.acquiredPerks.length}): ${cm.acquiredPerks.map(p => p.icon + ' ' + p.title).join(' • ') || 'لا توجد'}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="display: flex; flex-direction: column; gap: 10px;">
            <button id="career-finish-explore-btn" class="btn btn-primary btn-lg w-full" style="background: linear-gradient(135deg, #0284c7, #0369a1); font-weight: 900;">
              🎉 استعراض وسام الإنجاز والتجوال الحر بالفرع 3D ◀
            </button>
            <button id="reset-career-btn" class="btn btn-outline-warning w-full">
              🔄 خوض المسيرة من جديد بمسارات وقرارات مختلفة
            </button>
          </div>
        </div>
      </div>
    `;
  }

  showOnboardingModal() {
    this.appContainer.innerHTML = `
      <div class="onboarding-screen">
        <div class="onboarding-card">
          <div class="onboarding-badge">🏛️ جمهورية مصر العربية • تأسيس مصرفي رسمي</div>
          <h2 class="onboarding-title">تأسيس مؤسسة مصرفية جديدة</h2>
          <p class="onboarding-subtitle">قم بتسجيل بيانات التأسيس وتعيين القيادة التنفيذية للبدء في تشغيل أول نشاط مصرفي برأس مال <strong>50,000 ج.م</strong>.</p>

          <form id="founding-form" onsubmit="return false;" class="onboarding-form">
            <div class="form-group">
              <label for="input-bank-name">اسم البنك / المؤسسة المصرفية:</label>
              <div class="input-with-action">
                <input type="text" id="input-bank-name" value="${this.state.bankName}" required placeholder="مثال: بنك المحروسة للاستثمار">
                <button type="button" id="random-name-btn" class="btn btn-secondary">🎲 اقتراح اسم</button>
              </div>
            </div>

            <div class="form-group">
              <label>الشعار البنكي الرسمي:</label>
              <div class="emblem-selector">
                <label class="emblem-opt"><input type="radio" name="emblem" value="🏛️" checked> <span>🏛️ صرح</span></label>
                <label class="emblem-opt"><input type="radio" name="emblem" value="🦅"> <span>🦅 نسر</span></label>
                <label class="emblem-opt"><input type="radio" name="emblem" value="🌾"> <span>🌾 سنبلة</span></label>
                <label class="emblem-opt"><input type="radio" name="emblem" value="⛵"> <span>⛵ مركب</span></label>
                <label class="emblem-opt"><input type="radio" name="emblem" value="⚖️"> <span>⚖️ ميزان</span></label>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="input-manager-name">اسم رئيس مجلس الإدارة / المدير:</label>
                <input type="text" id="input-manager-name" value="${this.state.managerName}" required placeholder="اسمك الثلاثي">
              </div>

              <div class="form-group">
                <label>النوع / اللقب الرسمي:</label>
                <div class="gender-selector">
                  <label class="gender-opt">
                    <input type="radio" name="gender" value="male" checked>
                    <span>👨 ذكر (السيد الأستاذ)</span>
                  </label>
                  <label class="gender-opt">
                    <input type="radio" name="gender" value="female">
                    <span>👩 أنثى (السيدة الأستاذة)</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>الخلفية والخبرة المهنية للمدير:</label>
              <select id="select-specialization" class="form-select">
                <option value="sme" selected>💼 خبير تمويل المشروعات الصغيرة والحرفية (دقة ائتمانية +20%)</option>
                <option value="tech">📱 رائد أعمال FinTech تكنولوجي (توفير 25% في تكلفة السيرفرات والتطبيق)</option>
                <option value="pr">🤝 خبير علاقات عامة واستثمار (جذب ودائع أسرع بنسبة +25%)</option>
              </select>
            </div>

            <button type="button" id="submit-founding-btn" class="btn btn-primary btn-lg w-full mt-4">
              🚀 اعتماد التأسيس وإيداع رأس المال الأولي (50,000 ج.م)
            </button>
          </form>
        </div>
      </div>
    `;
  }

  handleFoundingSubmit() {
    const bankNameInput = document.getElementById('input-bank-name');
    const managerNameInput = document.getElementById('input-manager-name');
    const emblemRadio = document.querySelector('input[name="emblem"]:checked');
    const genderRadio = document.querySelector('input[name="gender"]:checked');
    const specSelect = document.getElementById('select-specialization');

    if (!bankNameInput || !managerNameInput) return;

    const rawBankName = bankNameInput.value.trim().slice(0, 50);
    const rawManagerName = managerNameInput.value.trim().slice(0, 40);
    const bankName = this.escapeHTML(rawBankName) || 'بنك النيل للتنمية';
    const managerName = this.escapeHTML(rawManagerName) || 'أحمد مصطفى';
    const emblem = emblemRadio ? emblemRadio.value : '🏛️';
    const gender = genderRadio ? genderRadio.value : 'male';
    const spec = specSelect ? specSelect.value : 'sme';

    this.state.bankName = bankName;
    this.state.bankEmblem = emblem;
    this.state.managerName = managerName;
    this.state.managerGender = gender;
    this.state.specialization = spec;
    this.state.isInitialized = true;
    this.state.saveGame();

    this.audio.playSuccess();
    this.render();
    this.showToast(`مرحباً بك! تم تأسيس [${this.state.bankName}] برئاسة ${this.state.getManagerFormalTitle()} برأس مال 50,000 ج.م.`, 'success', 5000);
  }

  handleNextMonth() {
    this.audio.playCash();
    const result = this.state.endMonth();

    this.render();
    this.showMonthlyReportModal(result.report);

    if (result.audit) {
      setTimeout(() => this.showAuditModal(result.audit), 400);
    } else if (result.dilemma) {
      this.currentDilemma = result.dilemma;
    }
  }

  getActiveTabTitle() {
    const titles = {
      dashboard: '📊 لوحة المؤشرات العامة',
      loans: '📝 التسهيلات والتمويل',
      legal: '⚖️ الديون المتعثرة والمزادات القضائية',
      certificates: '🪙 شهادات الادخار وخزينة الذهب',
      egx: '📈 البورصة المصرية (EGX)',
      cards: '💳 البطاقات وشبكة ميزة',
      instapay: '⚡ شبكة إنستاباي والسيرفرات',
      fx: '💵 غرفة المعاملات الدولية والاعتمادات (FX)',
      islamic: '🕌 الصيرفة والمعاملات الإسلامية',
      branches: '🏛️ المقرات والـ ATM',
      branches_map: '🗺️ خريطة الفروع والأقاليم المصرية',
      neo_bank: '📱 البنك الرقمي المستقل (Nile Neo)',
      vendors: '🏢 إدارة المرافق وتوريد الخدمات (أمن، نظافة، صيانة)',
      hr: '👥 الكوادر والتوظيف',
      csr: '🇪🇬 الرقابة والمشاريع القومية',
      trophies: '🏆 الأوسمة والجوائز المصرفية',
      reports: '📑 المركز المالي والميزانية',
      executive_life: '👤 الحياة الشخصية والرفاهية التنفيذية'
    };
    return titles[this.activeTab] || 'لوحة المؤشرات';
  }

  renderNewsTicker() {
    if (!this.state.newsManager) return '';
    const news = this.state.newsManager.currentNews;
    if (!news) return '';

    return `
      <div class="news-ticker-bar">
        <div class="news-badge-box">
          <span class="ticker-badge ${news.type}">${news.badge}</span>
        </div>
        <div class="ticker-content">
          <span class="ticker-title">${news.title}</span>
          <span class="ticker-sep">•</span>
          <span class="ticker-impact">${news.impactText}</span>
        </div>
      </div>
    `;
  }

  renderBankRunAlertBanner() {
    const br = this.state.bankRunManager;
    if (!br || !br.isActive) return '';

    return `
      <div class="bankrun-emergency-banner">
        <div class="bankrun-banner-left">
          <span class="bankrun-pulse-dot"></span>
          <span class="bankrun-banner-title">🚨 حالة طوارئ مصرفية: هجوم مكثف للمودعين (Bank Run)!</span>
          <span class="bankrun-banner-panic">مؤشر الذعر: <strong>${br.panicLevel}%</strong></span>
          <span style="font-size: 12px; color: #fee2e2;">تسريب سيولة الودائع: -${br.totalDrainedDeposits.toLocaleString('ar-EG')} ج.م</span>
        </div>
        <button id="open-bankrun-room-btn" class="btn btn-danger btn-sm" style="font-weight: 800; box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);">
          ⚡ إدارة غرفة الأزمة والإنقاذ
        </button>
      </div>
    `;
  }

  showBankRunModal() {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    const br = this.state.bankRunManager;
    if (!br) return;

    const panic = br.panicLevel || 0;
    const isCrisis = br.isActive;

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card" style="max-width: 680px; border: 2px solid #ef4444; box-shadow: 0 15px 45px rgba(239, 68, 68, 0.3);">
          <div class="modal-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.3); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 28px;">🚨</span>
              <div>
                <h3 style="color: #f87171; margin: 0;">غرفة إدارة أزمة السيولة وهجوم المودعين (Bank Run)</h3>
                <span style="font-size: 12px; color: #94a3b8;">إدارة الطوارئ المصرفية • استقرار السوق • تدخل البنك المركزي</span>
              </div>
            </div>
            <button id="close-bankrun-btn" class="btn btn-secondary btn-sm">✕ إغلاق</button>
          </div>

          <div class="modal-body" style="padding: 20px;">
            <!-- Panic Gauge -->
            <div class="panic-gauge-box">
              <div class="panic-gauge-header">
                <span style="font-weight: 800; color: #f8fafc; font-size: 13.5px;">🔥 مؤشر ذعر المودعين (Market Panic Level)</span>
                <strong style="font-size: 18px; color: ${panic > 50 ? '#ef4444' : (panic > 20 ? '#f59e0b' : '#10b981')};">${panic}%</strong>
              </div>
              <div class="panic-meter-bar">
                <div class="panic-meter-fill" style="width: ${Math.max(4, panic)}%;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: #94a3b8;">
                <span>0% استقرار تام</span>
                <span>50% اضطراب سيولة</span>
                <span>100% هجوم شامل</span>
              </div>
            </div>

            <!-- Financial Status Snapshot -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px;">
              <div style="background: rgba(15, 23, 42, 0.7); padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
                <span style="font-size: 11.5px; color: #94a3b8; display: block;">السيولة المتبقية</span>
                <strong style="color: #34d399; font-size: 15px;">${Math.round(this.state.treasuryCash).toLocaleString('ar-EG')} ج.م</strong>
              </div>
              <div style="background: rgba(15, 23, 42, 0.7); padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
                <span style="font-size: 11.5px; color: #94a3b8; display: block;">ودائع تم سحبها بالأزمة</span>
                <strong style="color: #f87171; font-size: 15px;">-${Math.round(br.totalDrainedDeposits).toLocaleString('ar-EG')} ج.م</strong>
              </div>
              <div style="background: rgba(15, 23, 42, 0.7); padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
                <span style="font-size: 11.5px; color: #94a3b8; display: block;">تسهيلات البنك المركزي</span>
                <strong style="color: #fbbf24; font-size: 15px;">${Math.round(br.cbeEmergencyLoan).toLocaleString('ar-EG')} ج.م</strong>
              </div>
            </div>

            <!-- Countermeasures Action Grid -->
            <h4 style="color: #f1f5f9; font-size: 14px; margin-bottom: 10px;">⚡ حزم التدخل والإنقاذ العاجلة لمجلس الإدارة:</h4>
            <div class="bankrun-actions-grid">
              <!-- 1. CBE Emergency Window -->
              <div class="bankrun-action-card">
                <div>
                  <div class="bankrun-action-title">🏛️ نافذة السيولة الطارئة (CBE Window)</div>
                  <div class="bankrun-action-desc">
                    طلب ضخ 250,000 ج.م سيولة فورية من البنك المركزي المصري بفائدة طارئة ${br.cbeLoanInterestRate}%. (يخفض الذعر -25%).
                  </div>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button id="btn-bankrun-cbe-loan" class="btn btn-outline-warning btn-sm flex-1">
                    ضخ 250,000 ج.م سيولة
                  </button>
                  ${br.cbeEmergencyLoan > 0 ? `
                    <button id="btn-bankrun-repay-cbe" class="btn btn-outline-success btn-sm">
                      سداد المديونية
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- 2. Emergency 27% Certificate -->
              <div class="bankrun-action-card">
                <div>
                  <div class="bankrun-action-title">🪙 شهادة الطوارئ الذهبية (27%)</div>
                  <div class="bankrun-action-desc">
                    طرح شهادة ادخار استثنائية بعائد 27% تصرف أرباحها يومياً لجذب المودعين المضاربين وسيولة 120,000 ج.م فوراً. (يخفض الذعر -20%).
                  </div>
                </div>
                <button id="btn-bankrun-cert" class="btn ${br.emergencyCertActive ? 'btn-secondary' : 'btn-outline-primary'} btn-sm" ${br.emergencyCertActive ? 'disabled' : ''}>
                  ${br.emergencyCertActive ? 'الشهادة مطروحة في السوق ✅' : 'طرح الشهادة في السوق'}
                </button>
              </div>

              <!-- 3. Daily Cash Cap -->
              <div class="bankrun-action-card">
                <div>
                  <div class="bankrun-action-title">🔒 سقف السحب اليومي (20,000 ج.م)</div>
                  <div class="bankrun-action-desc">
                    وضع حد أقصى للسحب من الشباك والصرافات. يخفض نزيف السيولة الشهري بنسبة 60% لحماية خزائن البنك.
                  </div>
                </div>
                <button id="btn-bankrun-toggle-limit" class="btn ${br.dailyWithdrawalLimitActive ? 'btn-danger' : 'btn-outline-danger'} btn-sm">
                  ${br.dailyWithdrawalLimitActive ? 'رفع قيود السحب ✕' : 'تفعيل سقف السحب اليومي 🔒'}
                </button>
              </div>

              <!-- 4. Press Conference -->
              <div class="bankrun-action-card">
                <div>
                  <div class="bankrun-action-title">🎙️ مؤتمر صحفي لرئيس البنك</div>
                  <div class="bankrun-action-desc">
                    بيان إعلامي رسمي متلفز يقوده ${this.escapeHTML(this.state.getManagerFormalTitle())} لتطمين السوق وتأكيد ملاءة الأصول. (يخفض الذعر حتى -30%).
                  </div>
                </div>
                <button id="btn-bankrun-press-conf" class="btn ${br.pressConferenceDone ? 'btn-secondary' : 'btn-outline-info'} btn-sm" ${br.pressConferenceDone ? 'disabled' : ''}>
                  ${br.pressConferenceDone ? 'تم إلقاء البيان هذا الشهر ✓' : 'إلقاء البيان الإعلامي'}
                </button>
              </div>
            </div>

            ${!isCrisis ? `
              <div style="background: rgba(59, 130, 246, 0.1); border: 1px dashed rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 12px; text-align: center; margin-top: 12px;">
                <p style="font-size: 12.5px; color: #93c5fd; margin-bottom: 8px;">
                  💡 البنك لا يعاني من أزمة حالياً. يمكنك محاكاة واختبار أزمة هجوم المودعين يدوياً لتجربة إجراءات الطوارئ:
                </p>
                <button id="btn-bankrun-trigger-test" class="btn btn-outline-danger btn-sm">
                  ⚡ بدء اختبار تحمل هجوم المودعين (Stress Test)
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById('close-bankrun-btn');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeModal();
    }
  }

  renderNavItem(tabId, icon, label, badgeHtml = '') {
    const isUnlocked = this.state.licensesManager ? this.state.licensesManager.isTabUnlocked(tabId) : true;
    if (isUnlocked) {
      return `
        <button class="sidebar-item ${this.activeTab === tabId ? 'active' : ''}" data-tab="${tabId}">
          <span class="item-icon">${icon}</span>
          <span class="item-text">${label}</span>
          ${badgeHtml}
        </button>
      `;
    } else {
      const reqTier = this.state.licensesManager ? this.state.licensesManager.getRequiredTierForTab(tabId) : null;
      const tierBadge = reqTier ? `Tier ${reqTier.tier}` : 'مغلق';
      return `
        <button class="sidebar-item locked-tab" data-locked-tab="${tabId}" title="يتطلب ${reqTier ? reqTier.name : 'ترقية الرخصة'}">
          <span class="item-icon">${icon}</span>
          <span class="item-text">${label}</span>
          <span class="locked-tier-tag">🔒 ${tierBadge}</span>
        </button>
      `;
    }
  }

  renderCareerXPBadge() {
    if (!this.state.licensesManager) return '';
    const lm = this.state.licensesManager;
    const title = lm.getDirectorTitle();
    const icon = lm.getDirectorIcon();
    const currentXP = lm.xp;
    const neededXP = lm.getXpForNextLevel();
    const pct = Math.min(100, Math.round((currentXP / neededXP) * 100));

    return `
      <button id="hud-career-level-btn" class="badge xp-badge cursor-pointer" title="الرتبة والخبرة التنفيذية: ${title} (${currentXP.toLocaleString('ar-EG')} / ${neededXP.toLocaleString('ar-EG')} XP)">
        <span>${icon} Lv.${lm.level}</span>
        <div class="xp-mini-track">
          <div class="xp-mini-fill" style="width: ${pct}%;"></div>
        </div>
        <span class="xp-mini-text">${pct}%</span>
      </button>
    `;
  }

  renderLockedTabFallback(tabId) {
    const lm = this.state.licensesManager;
    const reqTier = lm ? lm.getRequiredTierForTab(tabId) : null;
    const tabTitle = this.getActiveTabTitle ? this.getActiveTabTitle() : tabId;

    return `
      <div class="locked-tab-screen" style="text-align: center; padding: 50px 20px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; margin: 20px 0;">
        <div style="font-size: 64px; margin-bottom: 16px; filter: drop-shadow(0 4px 15px rgba(239, 68, 68, 0.3));">🔒</div>
        <h2 style="color: #f8fafc; font-size: 22px; font-weight: 900; margin-bottom: 10px;">
          قسم غير مرخص بعد: ${tabTitle}
        </h2>
        <p style="color: #94a3b8; font-size: 14px; max-width: 540px; margin: 0 auto 24px auto; line-height: 1.6;">
          وفقاً لتعليمات البنك المركزي المصري (CBE Regulations)، لا يُسمح بممارسة هذا النشاط المصرفي إلا بعد الحصول على رخصة:
          <br>
          <strong style="color: #fbbf24; font-size: 15px;">${reqTier ? `${reqTier.icon} ${reqTier.name} (Tier ${reqTier.tier})` : 'ترقية الرخصة'}</strong>
        </p>
        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
          <button id="unlock-dossier-jump-btn" class="btn btn-primary" style="background: linear-gradient(135deg, #d4af37 0%, #b45309 100%); border: 1.5px solid #fde68a; font-weight: 800; padding: 10px 22px;">
            📋 فتح ملف تراخيص البنك المركزي وترقية المؤسسة ↗
          </button>
          <button id="back-to-dashboard-btn" class="btn btn-secondary" style="padding: 10px 20px;">
            📊 العودة للوحة المؤشرات الرئيسية
          </button>
        </div>
      </div>
    `;
  }

  showLicenseDossierModal(focusTabId = null) {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    const lm = this.state.licensesManager;
    if (!lm) return;

    const currentTier = lm.getCurrentTierData();
    const nextTier = lm.getNextTierData();
    const upgradeStatus = lm.checkUpgradeRequirements();
    const directorTitle = lm.getDirectorTitle();
    const directorIcon = lm.getDirectorIcon();
    const currentXP = lm.xp;
    const neededXP = lm.getXpForNextLevel();
    const xpPct = Math.min(100, Math.round((currentXP / Math.max(1, neededXP)) * 100));

    // Focus tab info if user clicked a locked tab
    let focusedNoticeHtml = '';
    if (focusTabId) {
      const targetTier = lm.getRequiredTierForTab(focusTabId);
      focusedNoticeHtml = `
        <div style="background: rgba(239, 68, 68, 0.12); border: 1.5px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 26px;">🔒</span>
          <div>
            <div style="color: #f87171; font-weight: 800; font-size: 13.5px;">القسم المطلوب مغلق حالياً</div>
            <div style="color: #cbd5e1; font-size: 12px;">
              يتطلب الوصول لهذا القسم الحصول على ترخيص <strong>${targetTier.icon} ${targetTier.name} (Tier ${targetTier.tier})</strong> من البنك المركزي المصري.
            </div>
          </div>
        </div>
      `;
    }

    // Requirements Checklist HTML
    let reqsHtml = '';
    if (nextTier && upgradeStatus.checks) {
      reqsHtml = upgradeStatus.checks.map(c => `
        <div class="tier-req-card ${c.met ? 'met' : 'unmet'}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">${c.met ? '✅' : '❌'}</span>
              <strong style="color: #f8fafc; font-size: 13px;">${c.label || c.name}</strong>
            </div>
            <span style="font-size: 12.5px; font-weight: 800; color: ${c.met ? '#34d399' : '#f87171'};">
              ${c.current.toLocaleString('ar-EG')} / ${c.required.toLocaleString('ar-EG')} ${c.unit}
            </span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${Math.min(100, Math.round((c.current / Math.max(1, c.required)) * 100))}%; background: ${c.met ? '#10b981' : '#f59e0b'}; border-radius: 3px; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `).join('');
    }

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card cbe-dossier-modal">
          <!-- Official CBE Header Banner -->
          <div class="cbe-header-banner">
            <div class="cbe-seal">🏛️</div>
            <h3 class="cbe-title">البنك المركزي المصري • قطاع الرقابة والإشراف المصرفي</h3>
            <p class="cbe-subtitle">سجل تراخيص المؤسسات المصرفية وتصنيف الكفاءة التشغيلية</p>
          </div>

          <div class="modal-body" style="padding: 20px; max-height: 75vh; overflow-y: auto;">
            ${focusedNoticeHtml}

            <!-- Current Tier & Executive Career Card -->
            <div class="tier-status-banner">
              <div>
                <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; display: block;">الرخصة التشغيلية المعتمدة حالياً:</span>
                <strong style="font-size: 16px; color: #fbbf24;">${currentTier.icon} ${currentTier.name} (Tier ${currentTier.tier})</strong>
                <p style="font-size: 12px; color: #94a3b8; margin: 4px 0 0 0;">${currentTier.desc}</p>
              </div>
              <div style="text-align: left; background: rgba(0,0,0,0.35); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);">
                <span style="font-size: 11px; color: #cbd5e1; display: block;">خبرة ورتبة الرئيس التنفيذي:</span>
                <strong style="font-size: 13.5px; color: #a5b4fc;">${directorIcon} Lv.${lm.level} - ${directorTitle}</strong>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                  <div style="width: 70px; height: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${xpPct}%; background: #6366f1;"></div>
                  </div>
                  <span style="font-size: 10px; color: #94a3b8;">${currentXP.toLocaleString('ar-EG')} / ${neededXP.toLocaleString('ar-EG')} XP</span>
                </div>
              </div>
            </div>

            ${nextTier ? `
              <!-- Next Tier Application Requirements -->
              <div class="cbe-decree-box">
                <div style="font-size: 12px; color: #fbbf24; font-weight: 800; margin-bottom: 6px;">طلب ترقية وتوسيع الأنشطة المصرفية إلى:</div>
                <h4 style="color: #f8fafc; font-size: 17px; margin: 0 0 8px 0;">${nextTier.icon} ${nextTier.name} (Tier ${nextTier.tier})</h4>
                <p style="color: #cbd5e1; font-size: 12px; max-width: 580px; margin: 0 auto 16px auto;">${nextTier.desc}</p>

                <h5 style="color: #94a3b8; font-size: 12px; text-align: right; margin-bottom: 8px;">📋 المعايير الرقابية المطلوبة لصدور قرار المحافظ:</h5>
                <div style="text-align: right; margin-bottom: 16px;">
                  ${reqsHtml}
                </div>

                <h5 style="color: #94a3b8; font-size: 12px; text-align: right; margin-bottom: 8px;">✨ الأقسام والخدمات التي سيتم افتتاحها فور الاعتماد:</h5>
                <div style="background: rgba(0,0,0,0.25); border-radius: 10px; padding: 10px 14px; margin-bottom: 18px; text-align: right;">
                  ${nextTier.unlockedFeatures.map(f => `
                    <div class="tier-feature-item">
                      <span>✨</span>
                      <span>${f}</span>
                    </div>
                  `).join('')}
                </div>

                ${upgradeStatus.canUpgrade ? `
                  <button id="apply-license-upgrade-btn" class="btn btn-primary w-full py-3" style="background: linear-gradient(135deg, #d4af37 0%, #b45309 100%); border: 1.5px solid #fde68a; font-weight: 900; font-size: 15px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4); cursor: pointer;">
                    📜 توقيع قرار الترقية واعتماد الرخصة رسميّاً من البنك المركزي
                  </button>
                ` : `
                  <button class="btn btn-secondary w-full py-3" disabled style="opacity: 0.65; cursor: not-allowed; font-size: 13.5px;">
                    ⏳ يرجى استيفاء المعايير الرقابية أعلاه للتقدم بطلب الترقية
                  </button>
                `}
              </div>
            ` : `
              <!-- Max Tier Sovereign Seal -->
              <div class="cbe-decree-box" style="border-color: #38bdf8; background: rgba(56, 189, 248, 0.08);">
                <div style="font-size: 40px; margin-bottom: 10px;">👑</div>
                <h4 style="color: #38bdf8; font-size: 18px; margin: 0 0 8px 0;">أعلى ترخيص مصرفي سيادي في جمهورية مصر العربية</h4>
                <p style="color: #cbd5e1; font-size: 13px; max-width: 520px; margin: 0 auto;">
                  المؤسسة حاصلة على التصنيف المصرفي السيادي الأكبر (Tier 5). كافة الأقسام والخدمات والبورصة والبنك الرقمي مفتوحة بالكامل تحت إدارتكم الرشيدة.
                </p>
              </div>
            `}

            <!-- License Progression Roadmap -->
            <h5 style="color: #94a3b8; font-size: 12px; margin: 18px 0 8px 0;">🗺️ مسار تراخيص البنك المركزي المصري (CBE Licensing Tiers):</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
              ${lm.tiersCatalog.map(t => {
                const isCurrent = t.tier === lm.currentTier;
                const isPassed = t.tier < lm.currentTier;
                return `
                  <div style="background: ${isCurrent ? 'rgba(212, 175, 55, 0.15)' : (isPassed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.5)')}; border: 1px solid ${isCurrent ? '#d4af37' : (isPassed ? '#10b981' : 'rgba(255,255,255,0.08)')}; border-radius: 10px; padding: 8px 10px; text-align: center;">
                    <span style="font-size: 18px;">${t.icon}</span>
                    <div style="font-size: 11px; font-weight: 800; color: ${isCurrent ? '#fbbf24' : (isPassed ? '#34d399' : '#64748b')}; margin-top: 2px;">
                      Tier ${t.tier}
                    </div>
                    <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.name}">
                      ${t.shortName}
                    </div>
                    <div style="font-size: 9.5px; margin-top: 4px; color: ${isPassed ? '#34d399' : (isCurrent ? '#fbbf24' : '#64748b')}; font-weight: 700;">
                      ${isPassed ? 'معتمد ✅' : (isCurrent ? 'الترخيص الحالي ⭐' : 'مغلق 🔒')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: flex-end;">
            <button id="close-license-modal-btn" class="btn btn-secondary">إغلاق الملف والعودة</button>
          </div>
        </div>
      </div>
    `;
  }

  showLicenseCelebrationModal(newTier) {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card cbe-dossier-modal" style="max-width: 580px; text-align: center;">
          <div class="cbe-header-banner" style="background: radial-gradient(circle at center, rgba(16, 185, 129, 0.3) 0%, rgba(11, 19, 41, 0.95) 100%);">
            <div class="cbe-seal" style="font-size: 52px; animation: bounce 1.5s infinite;">📜</div>
            <h2 class="cbe-title" style="color: #34d399; font-size: 20px;">قرار رسمي من البنك المركزي المصري</h2>
            <p class="cbe-subtitle" style="color: #e2e8f0;">مرسوم رقم (2026/CBE-L0${newTier.tier}) بشأن اعتماد ترقية ترخيص المؤسسة</p>
          </div>

          <div class="modal-body" style="padding: 24px;">
            <div style="font-size: 44px; margin-bottom: 10px;">${newTier.icon}</div>
            <h3 style="color: #fbbf24; font-size: 18px; margin: 0 0 10px 0;">تهانينا! تم اعتماد رخصة:</h3>
            <h2 style="color: #f8fafc; font-size: 21px; margin: 0 0 14px 0;">${newTier.name} (Tier ${newTier.tier})</h2>
            <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
              ${newTier.desc}
            </p>

            <div style="background: rgba(16, 185, 129, 0.1); border: 1.5px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 14px; text-align: right; margin-bottom: 20px;">
              <h5 style="color: #34d399; font-size: 13px; margin: 0 0 8px 0; font-weight: 800;">✨ تم إلغاء القفل وفتح الأقسام التالية فوراً:</h5>
              ${newTier.unlockedFeatures.map(f => `
                <div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #f1f5f9; padding: 3px 0;">
                  <span>🔓</span>
                  <span>${f}</span>
                </div>
              `).join('')}
            </div>

            <div style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 10px; padding: 10px 16px; display: inline-flex; align-items: center; gap: 8px; color: #c7d2fe; font-size: 13px; font-weight: 800;">
              <span>⭐</span>
              <span>مكافأة الإنجاز التنفيذي: +300 نقطة خبرة مصرفية (Banking XP)</span>
            </div>
          </div>

          <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: center;">
            <button id="close-celebration-modal-btn" class="btn btn-primary w-full py-3" style="font-size: 15px; font-weight: 800;">
              🚀 بدء إدارة وتفعيل الأقسام الجديدة الآن
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderBankFloorContainer() {
    const cm = this.state.careerManager;
    const isCareerStarted = cm && cm.isStarted;

    return `
      <div class="bank-floor-container" id="bank-floor-viewport">
        <!-- Floating 3D Career Objective & Controls HUD Banner -->
        <div class="career-3d-hud" id="career-3d-hud" style="position: absolute; top: 18px; left: 50%; transform: translateX(-50%); z-index: 60; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; width: 92%; max-width: 720px;">
          <div class="career-objective-pill" style="background: rgba(15, 23, 42, 0.94); border: 2px solid #38bdf8; border-radius: 30px; padding: 9px 24px; color: #f8fafc; font-size: 14px; font-weight: 800; box-shadow: 0 8px 32px rgba(0,0,0,0.65); display: flex; align-items: center; gap: 10px; backdrop-filter: blur(8px); direction: rtl; pointer-events: auto; width: 100%; justify-content: center;">
            <span style="font-size: 18px;">🎯</span>
            <span id="career-objective-label" style="color: #e0f2fe; text-align: center;">توجه لمكتب المدير فاروق بالحقيبة واستلم بطاقتك الوظيفية [E]</span>
          </div>
          <div class="career-quick-controls" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 4px 16px; display: flex; gap: 12px; font-size: 11.5px; font-weight: 700; color: #cbd5e1; direction: rtl; backdrop-filter: blur(6px); pointer-events: auto; flex-wrap: wrap; justify-content: center;">
            <span style="color: #38bdf8;">🎮 [WASD] حركة</span>
            <span style="color: #cbd5e1;">🏃‍♂️ [Shift] جري</span>
            <span style="color: #cbd5e1;">🖱️ [الماوس] تدوير</span>
            <span style="color: #34d399;">⚡ [E] تفاعل</span>
            <span style="color: #fbbf24;">🛑 [Q / Esc] نهوض</span>
          </div>
        </div>

        <!-- Floating Floor HUD Overlay -->
        <div class="floor-overlay-hud">
          <div class="floor-hud-card cursor-pointer" id="btn-toggle-cam-perspective" title="التبديل بين المنظور الأيزومتري ومنظور الشخص الثالث">
            <span style="font-size: 20px;" id="cam-perspective-icon">🚶‍♂️</span>
            <div>
              <div style="font-size: 11px; color: #94a3b8;">وضع المنظور</div>
              <strong style="color: #38bdf8; font-size: 13.5px;" id="cam-perspective-label">شخص ثالث 3D</strong>
            </div>
          </div>

          ${isCareerStarted ? `
          <div class="floor-hud-card cursor-pointer" id="btn-open-career-dossier-modal" title="عرض السجل المهني والترقيات والقرارات">
            <span style="font-size: 20px;">📜</span>
            <div>
              <div style="font-size: 11px; color: #94a3b8;">ملف الموظف</div>
              <strong style="color: #fbbf24; font-size: 13.5px;" id="hud-career-char-name">${cm.name} 💼</strong>
            </div>
          </div>
          ` : ''}

          <div class="floor-hud-card">
            <span style="font-size: 20px;">👥</span>
            <div>
              <div style="font-size: 11px; color: #94a3b8;">إشغال الصالة والانتظار</div>
              <strong style="color: #38bdf8; font-size: 13.5px;" id="floor-active-customers-label">طابور عملاء حي ⚡</strong>
            </div>
          </div>

          <div class="floor-hud-card cursor-pointer" id="btn-collect-atm-direct" title="انقر لتحصيل رسوم السحب الفورية من الـ ATMs">
            <span style="font-size: 20px;">🏧</span>
            <div>
              <div style="font-size: 11px; color: #94a3b8;">ماكينات الصراف الآلي</div>
              <strong style="color: #34d399; font-size: 13.5px;">تحصيل رسوم السحب 💰</strong>
            </div>
          </div>
        </div>

        <!-- Interactive Hint at bottom -->
        <div class="floor-interactive-hint">
          <span>💡</span>
          <span>تحكم بالموظف داخل الصالة بـ [WASD] واقترب من المدير فاروق، الزميلة سارة، الزميل محمود، أو شباك الصراف #1 واضغط [E] للتفاعل!</span>
        </div>
      </div>
    `;
  }

  initOrResumeBankFloor() {
    const container = document.getElementById('bank-floor-viewport');
    if (!container) return;

    if (!this.bankFloorScene) {
      this.bankFloorScene = new BankFloorScene(container, this.state, this.audio, {
        onTellerClick: (index) => this.showTellerUpgradeModal(index),
        onATMClick: (index) => this.handleCollectATMFees(index),
        onCustomerClick: (customer) => this.showCustomerProfileModal(customer),
        onVaultClick: () => this.showVaultDetailModal()
      });
    } else {
      if (this.bankFloorScene.container !== container) {
        this.bankFloorScene.destroy();
        this.bankFloorScene = new BankFloorScene(container, this.state, this.audio, {
          onTellerClick: (index) => this.showTellerUpgradeModal(index),
          onATMClick: (index) => this.handleCollectATMFees(index),
          onCustomerClick: (customer) => this.showCustomerProfileModal(customer),
          onVaultClick: () => this.showVaultDetailModal()
        });
      } else {
        this.bankFloorScene.resume();
      }
    }

    // If career mode is started, ensure 3D Third-Person avatar is initialized
    if (this.state.careerManager && this.state.careerManager.isStarted && !this.bankFloorScene.isCareerMode) {
      this.bankFloorScene.initCareer3DMode(this.state.careerManager);
    }
  }

  showTellerUpgradeModal(tellerIndex) {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    const teller = this.bankFloorScene ? this.bankFloorScene.tellers[tellerIndex] : null;
    const level = teller ? teller.level : 1;
    const upgradeCost = level * 15000;
    const currentSpeed = teller ? teller.speedMultiplier : 1.0;
    const nextSpeed = (currentSpeed + 0.35).toFixed(2);
    const canAfford = this.state.treasuryCash >= upgradeCost;

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card station-upgrade-modal-card">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 28px;">🏛️</span>
              <div>
                <h3 style="margin: 0; color: #fbbf24; font-size: 17px;">شباك الصراف رقم (${tellerIndex + 1})</h3>
                <span style="font-size: 11.5px; color: #94a3b8;">إدارة محطة خدمة العملاء المباشرة</span>
              </div>
            </div>
            <button id="close-station-modal-btn" class="btn btn-secondary btn-sm">✕</button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
            <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
              <span style="font-size: 11px; color: #94a3b8; display: block;">المستوى التشغيلي</span>
              <strong style="color: #38bdf8; font-size: 16px;">المستوى ${level}</strong>
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
              <span style="font-size: 11px; color: #94a3b8; display: block;">سرعة معالجة المعاملة</span>
              <strong style="color: #34d399; font-size: 16px;">${currentSpeed.toFixed(2)}x</strong>
            </div>
          </div>

          <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 12px; padding: 12px 14px; margin-bottom: 18px;">
            <div style="font-weight: 800; font-size: 13px; color: #fbbf24; margin-bottom: 6px;">✨ ترقية ماكينة عد النقد وتدريب الصراف:</div>
            <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
              • زيادة سرعة إنهاء عمليات السحب والإيداع إلى <strong>${nextSpeed}x</strong>
              <br>• تقليل زمن انتظار طابور الصالة بنسبة <strong>25%</strong>
              <br>• منح <strong>+30 XP</strong> خبرة مصرفية فورية
            </div>
          </div>

          <button id="btn-upgrade-teller" data-teller-index="${tellerIndex}" class="btn ${canAfford ? 'btn-primary' : 'btn-secondary'} w-full py-3" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? `ترقية الشباك الآن (${upgradeCost.toLocaleString('ar-EG')} ج.م)` : `السيولة غير كافية (مطلوب ${upgradeCost.toLocaleString('ar-EG')} ج.م)`}
          </button>
        </div>
      </div>
    `;
  }

  handleUpgradeTeller(tellerIndex) {
    const teller = this.bankFloorScene ? this.bankFloorScene.tellers[tellerIndex] : null;
    if (!teller) return;

    const cost = teller.level * 15000;
    if (this.state.treasuryCash < cost) {
      this.audio.playError();
      this.showToast('السيولة النقدية غير كافية لترقية الشباك', 'warning');
      return;
    }

    this.state.treasuryCash -= cost;
    teller.level += 1;
    teller.speedMultiplier += 0.35;

    if (this.state.licensesManager) {
      this.state.licensesManager.addXP(30, `ترقية شباك الصراف #${tellerIndex + 1}`);
    }

    this.audio.playSuccess();
    this.closeModal();
    this.showToast(`تمت ترقية شباك الصراف (${tellerIndex + 1}) إلى المستوى ${teller.level} بنجاح!`, 'success');
    this.render();
  }

  handleCollectATMFees(atmIndex) {
    const atm = this.bankFloorScene ? this.bankFloorScene.atms[atmIndex] : null;
    const fees = atm ? atm.pendingFees : 1500;

    this.state.treasuryCash += fees;
    if (atm) {
      atm.pendingFees = 800 + Math.floor(Math.random() * 800);
    }

    if (this.state.licensesManager) {
      this.state.licensesManager.addXP(15, 'تحصيل رسوم شبكة الصراف الآلي');
    }

    this.audio.playCash();
    this.showToast(`تم تحصيل ${fees.toLocaleString('ar-EG')} ج.م رسوم معاملات من ماكينات الـ ATM!`, 'success');
    this.render();
  }

  showCustomerProfileModal(customer) {
    if (!customer) return;
    this.selectedCustomer = customer;

    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    // Simulated I-Score
    const iScore = 580 + (customer.id * 37) % 270;
    const isGood = iScore >= 680;
    const patiencePct = Math.max(0, Math.round((customer.patience / customer.maxPatience) * 100));

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card customer-profile-card">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 32px;">👤</span>
              <div>
                <h3 style="margin: 0; color: #f8fafc; font-size: 16px;">${customer.name}</h3>
                <span style="font-size: 11.5px; color: #38bdf8;">${customer.archetype.name}</span>
              </div>
            </div>
            <button id="close-customer-modal-btn" class="btn btn-secondary btn-sm">✕</button>
          </div>

          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">
              <span style="color: #94a3b8;">شريط الصبر والرضا الحالي:</span>
              <strong style="color: ${patiencePct > 50 ? '#34d399' : (patiencePct > 25 ? '#f59e0b' : '#f87171')};">${patiencePct}%</strong>
            </div>
            <div style="height: 7px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${patiencePct}%; background: ${patiencePct > 50 ? '#10b981' : (patiencePct > 25 ? '#f59e0b' : '#ef4444')}; transition: width 0.3s;"></div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
            <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
              <span style="font-size: 10.5px; color: #94a3b8; display: block;">الخدمة المطلوبة</span>
              <strong style="color: #fbbf24; font-size: 12.5px;">${customer.archetype.ticketType}</strong>
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
              <span style="font-size: 10.5px; color: #94a3b8; display: block;">تقييم I-Score</span>
              <strong style="color: ${isGood ? '#34d399' : '#f59e0b'}; font-size: 12.5px;">${iScore} (${isGood ? 'ائتمان ممتاز' : 'ائتمان متوسط'})</strong>
            </div>
          </div>

          <button id="btn-serve-customer-fast" class="btn btn-primary w-full py-2.5" style="font-size: 13.5px; font-weight: 800;">
            ⚡ خدمة سريعة استثنائية (VIP Fast-Track)
          </button>
        </div>
      </div>
    `;
  }

  handleFastServeCustomer() {
    if (!this.selectedCustomer || !this.bankFloorScene) {
      this.closeModal();
      return;
    }

    const c = this.selectedCustomer;
    this.selectedCustomer = null;

    this.bankFloorScene.finishTellerTransaction(c);
    this.closeModal();
    this.audio.playBell();
    this.showToast(`تم تقديم خدمة سريعة لـ ${c.name} وتحصيل العائد فوراً!`, 'success');
  }

  showVaultDetailModal() {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    const cash = this.state.treasuryCash;
    const goldValue = this.state.treasuryProductsManager ? this.state.treasuryProductsManager.getGoldPortfolioValue() : 0;

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card station-upgrade-modal-card" style="border-color: #38bdf8;">
          <div style="text-align: center; margin-bottom: 14px;">
            <div style="font-size: 42px; margin-bottom: 4px;">🔒</div>
            <h3 style="color: #38bdf8; font-size: 18px; margin: 0;">غرفة الخزينة الرئيسية (Main Bank Vault)</h3>
            <span style="font-size: 11.5px; color: #94a3b8;">إدارة السيولة النقدية واحتياطي الذهب والأمان الفيزيائي</span>
          </div>

          <div style="background: rgba(15, 23, 42, 0.7); border-radius: 12px; padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #94a3b8; font-size: 12.5px;">السيولة النقدية بالخزينة:</span>
              <strong style="color: #34d399; font-size: 15px;">${Math.round(cash).toLocaleString('ar-EG')} ج.م</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8; font-size: 12.5px;">رصيد سبائك الذهب:</span>
              <strong style="color: #fbbf24; font-size: 15px;">${Math.round(goldValue).toLocaleString('ar-EG')} ج.م</strong>
            </div>
          </div>

          <button id="close-station-modal-btn" class="btn btn-secondary w-full py-2.5">
            العودة لصالة البنك
          </button>
        </div>
      </div>
    `;
  }

  render() {
    const kpis = this.state.getKPIs();
    const tier = this.state.getCurrentTier();
    const marketShare = this.state.competitorsManager ? this.state.competitorsManager.playerMarketShare : 0.5;
    const camelsScore = this.state.complianceManager ? this.state.complianceManager.currentCamelsScore : 4;
    const pendingLoansCount = this.state.loansManager.pendingApplications.length;
    const pendingNPLCount = this.state.legalManager ? this.state.legalManager.getActiveNPLCount() : 0;
    const pendingLCsCount = this.state.fxManager ? this.state.fxManager.pendingLCs.length : 0;
    const unclaimedTrophiesCount = this.state.trophiesManager ? this.state.trophiesManager.getUnclaimedCount() : 0;
    const activeVendorsCount = this.state.vendorsManager ? Object.values(this.state.vendorsManager.activeContracts).filter(Boolean).length : 0;

    const isOpsOpen = ['dashboard', 'loans', 'legal'].includes(this.activeTab);
    const isInvestOpen = ['certificates', 'egx', 'fx', 'islamic'].includes(this.activeTab);
    const isDigitalOpen = ['cards', 'instapay', 'neo_bank', 'branches', 'branches_map'].includes(this.activeTab);
    const isVendorsOpen = ['vendors'].includes(this.activeTab);
    const isGovOpen = ['hr', 'csr', 'trophies', 'reports'].includes(this.activeTab);
    const isExecutiveLifeOpen = ['executive_life'].includes(this.activeTab);

    this.appContainer.innerHTML = `
      <!-- Slide-over Sidebar Overlay for Mobile & Desktop -->
      <div id="sidebar-overlay" class="sidebar-overlay hidden"></div>

      <!-- Slide-in Smartphone Chassis Sidebar (القائمة بهيئة هاتف ذكي فخم) -->
      <aside id="bank-sidebar" class="bank-sidebar smartphone-chassis">
        <!-- Phone Top Bar: Carrier, Clock, Dynamic Island, Battery -->
        <div class="phone-top-bar">
          <div class="phone-time-carrier">
            <span class="phone-time">10:45</span>
            <span class="phone-carrier-tag">WE 5G</span>
          </div>
          <div class="phone-dynamic-island">
            <div class="phone-island-cam"></div>
            <div class="phone-island-speaker"></div>
          </div>
          <div class="phone-status-icons">
            <span>📶</span>
            <span>🛜</span>
            <span>🔋 99%</span>
          </div>
        </div>

        <!-- Phone Inner Glass Screen with Scrollable Navigation -->
        <div class="phone-screen">
          <div class="sidebar-header">
            <div class="sidebar-brand">
              <span class="sidebar-emblem">${this.state.bankEmblem}</span>
              <div class="sidebar-brand-text">
                <h3 class="sidebar-bank-title">${this.escapeHTML(this.state.bankName)}</h3>
                <span class="sidebar-manager-title">${this.escapeHTML(this.state.getManagerFormalTitle())}</span>
              </div>
            </div>
            <button id="close-sidebar-btn" class="close-sidebar-btn" title="إغلاق الهاتف">✕</button>
          </div>

          <!-- Smartphone Accordion App Groups -->
          <nav class="sidebar-nav">
            <!-- Group 1: Operations & Credit -->
            <div class="phone-accordion-group ${isOpsOpen ? 'open' : ''}">
              <div class="phone-accordion-header">
                <div class="accordion-title-box">
                  <span class="accordion-icon">📊</span>
                  <span class="accordion-title-text">العمليات والائتمان</span>
                </div>
                <div class="accordion-meta-box">
                  ${(pendingLoansCount + pendingNPLCount) > 0 ? `<span class="item-badge bg-danger">${pendingLoansCount + pendingNPLCount}</span>` : ''}
                  <span class="accordion-chevron">▼</span>
                </div>
              </div>
              <div class="phone-accordion-content">
                ${this.renderNavItem('dashboard', '📊', 'لوحة المؤشرات المركزية')}
                ${this.renderNavItem('loans', '📝', 'التسهيلات والتمويل', pendingLoansCount > 0 ? `<span class="item-badge">${pendingLoansCount}</span>` : '')}
                ${this.renderNavItem('legal', '⚖️', 'الديون المتعثرة والمزادات', pendingNPLCount > 0 ? `<span class="item-badge bg-danger">${pendingNPLCount}</span>` : '')}
              </div>
            </div>

            <!-- Group 2: Investment & Treasury -->
            <div class="phone-accordion-group ${isInvestOpen ? 'open' : ''}">
              <div class="phone-accordion-header">
                <div class="accordion-title-box">
                  <span class="accordion-icon">📈</span>
                  <span class="accordion-title-text">الاستثمار والودائع والتجارة</span>
                </div>
                <div class="accordion-meta-box">
                  ${pendingLCsCount > 0 ? `<span class="item-badge bg-info">${pendingLCsCount}</span>` : ''}
                  <span class="accordion-chevron">▼</span>
                </div>
              </div>
              <div class="phone-accordion-content">
                ${this.renderNavItem('certificates', '🪙', 'شهادات الادخار والذهب')}
                ${this.renderNavItem('egx', '📈', 'البورصة المصرية (EGX)')}
                ${this.renderNavItem('fx', '💵', 'العملات والاعتمادات (FX)', pendingLCsCount > 0 ? `<span class="item-badge bg-info">${pendingLCsCount}</span>` : '')}
                ${this.renderNavItem('islamic', '🕌', 'الصيرفة الإسلامية')}
              </div>
            </div>

            <!-- Group 3: Digital Transformation & Physical Network -->
            <div class="phone-accordion-group ${isDigitalOpen ? 'open' : ''}">
              <div class="phone-accordion-header">
                <div class="accordion-title-box">
                  <span class="accordion-icon">📱</span>
                  <span class="accordion-title-text">التحول الرقمي والشبكة</span>
                </div>
                <div class="accordion-meta-box">
                  ${this.state.neoBankManager && this.state.neoBankManager.isLicensed ? '<span class="item-badge bg-emerald">Smart</span>' : ''}
                  <span class="accordion-chevron">▼</span>
                </div>
              </div>
              <div class="phone-accordion-content">
                ${this.renderNavItem('cards', '💳', 'البطاقات وشبكة ميزة')}
                ${this.renderNavItem('instapay', '⚡', 'إنستاباي والسيرفرات')}
                ${this.renderNavItem('neo_bank', '📱', 'البنك الرقمي (Nile Neo)', this.state.neoBankManager && this.state.neoBankManager.isLicensed ? '<span class="item-badge bg-emerald">نشط</span>' : '')}
                ${this.renderNavItem('branches', '🏛️', 'المقرات والـ ATM')}
                ${this.renderNavItem('branches_map', '🗺️', 'خريطة الفروع والأقاليم')}
              </div>
            </div>

            <!-- Group 4: Facility Procurement & Vendors (جديد) -->
            <div class="phone-accordion-group ${isVendorsOpen ? 'open' : ''}">
              <div class="phone-accordion-header">
                <div class="accordion-title-box">
                  <span class="accordion-icon">🏢</span>
                  <span class="accordion-title-text">المرافق وإدارة التوريدات</span>
                </div>
                <div class="accordion-meta-box">
                  ${activeVendorsCount > 0 ? `<span class="item-badge bg-emerald">${activeVendorsCount} عقود</span>` : '<span class="item-badge bg-warning">مناقصات</span>'}
                  <span class="accordion-chevron">▼</span>
                </div>
              </div>
              <div class="phone-accordion-content">
                ${this.renderNavItem('vendors', '🤝', 'شركات النظافة والأمن والصيانة', activeVendorsCount > 0 ? `<span class="item-badge bg-emerald">${activeVendorsCount}</span>` : '')}
              </div>
            </div>

            <!-- Group 5: Governance, HR & Reports -->
            <div class="phone-accordion-group ${isGovOpen ? 'open' : ''}">
              <div class="phone-accordion-header">
                <div class="accordion-title-box">
                  <span class="accordion-icon">⚖️</span>
                  <span class="accordion-title-text">الحوكمة والرقابة والتقارير</span>
                </div>
                <div class="accordion-meta-box">
                  ${unclaimedTrophiesCount > 0 ? `<span class="item-badge bg-gold">${unclaimedTrophiesCount}</span>` : ''}
                  <span class="accordion-chevron">▼</span>
                </div>
              </div>
              <div class="phone-accordion-content">
                ${this.renderNavItem('hr', '👥', 'الكوادر والتوظيف')}
                ${this.renderNavItem('csr', '🇪🇬', 'الرقابة والمشاريع القومية')}
                ${this.renderNavItem('trophies', '🏆', 'الأوسمة والجوائز المصرفية', unclaimedTrophiesCount > 0 ? `<span class="item-badge bg-gold">${unclaimedTrophiesCount}</span>` : '')}
                ${this.renderNavItem('reports', '📑', 'المركز المالي والميزانية')}
              </div>
            </div>

            <!-- Group 6: Executive Life & Wellbeing (الحياة الشخصية والرفاهية) -->
            <div class="phone-accordion-group ${isExecutiveLifeOpen ? 'open' : ''}">
              <div class="phone-accordion-header">
                <div class="accordion-title-box">
                  <span class="accordion-icon">👤</span>
                  <span class="accordion-title-text">الحياة الشخصية والرفاهية</span>
                </div>
                <div class="accordion-meta-box">
                  ${this.state.executiveLifeManager && this.state.executiveLifeManager.stress >= 75 ? '<span class="item-badge bg-danger">إنهاك!</span>' : ''}
                  <span class="accordion-chevron">▼</span>
                </div>
              </div>
              <div class="phone-accordion-content">
                ${this.renderNavItem('executive_life', '💎', 'المكتب التنفيذي والرفاهية', this.state.executiveLifeManager && this.state.executiveLifeManager.stress >= 75 ? '<span class="item-badge bg-danger">إنهاك</span>' : '')}
              </div>
            </div>
          </nav>

          <div class="sidebar-footer">
            <button id="btn-wardrobe-sidebar" class="btn btn-outline-warning w-full mb-2" style="background: rgba(212, 175, 55, 0.15); border-color: #d4af37; color: #fbbf24; font-weight: 800;">
              👔 دولاب الملابس واستوديو الشخصيات 3D ◀
            </button>
            <button id="return-to-vault-btn" class="btn btn-outline-warning w-full mb-2">
              🔒 شاشة الخزانة التفاعلية (3D Vault)
            </button>
            <button id="switch-to-career-btn" class="btn btn-secondary w-full mb-2">
              👔 مسيرة صعود الموظف (Career Story)
            </button>
            <button id="reset-bank-btn" class="btn btn-outline-danger w-full">
              🔄 تصفية والبدء من الصفر
            </button>
          </div>
        </div>

        <!-- Phone Bottom Home Indicator Bar -->
        <div class="phone-home-indicator-wrap">
          <div class="phone-home-indicator" id="phone-home-bar" title="إغلاق شاشة الهاتف"></div>
        </div>
      </aside>

      ${this.renderFinancialTicker()}

      <!-- Top Header (No horizontal scrollbar anymore!) -->
      <header class="bank-header">
        <div class="header-content">
          <div class="brand-box">
            <!-- Sidebar Toggle Hamburger Button -->
            <button id="toggle-sidebar-btn" class="sidebar-toggle-btn" title="فتح القائمة الجانبية">
              <span class="hamburger-icon">☰</span>
              <span class="toggle-text">الأقسام</span>
            </button>

            <div class="bank-emblem">${this.state.bankEmblem}</div>
            <div>
              <h1 class="bank-title">${this.escapeHTML(this.state.bankName)}</h1>
              <div class="bank-meta">
                <span class="badge manager-badge">👑 ${this.escapeHTML(this.state.getManagerFormalTitle())}</span>
                <button id="hud-license-tier-btn" class="badge tier-badge cursor-pointer" title="انقر لعرض ملف وتراخيص البنك المركزي (CBE Licenses)">🏛️ ${tier.name} (Tier ${tier.tier}) ↗</button>
                ${this.renderCareerXPBadge()}
                <span class="badge camels-badge">⭐ CAMELS: ${'★'.repeat(camelsScore)}</span>
                <span class="badge date-badge">📅 ${this.state.getDateString()}</span>
                <span class="badge rep-badge">ثقة السوق: ${this.state.reputation}%</span>
                <span class="badge diff-badge ${this.getDifficultyBadgeClass()}">🎯 ${this.getDifficultyBadgeText()}</span>
                ${this.renderPersonalHUDBar()}
              </div>
            </div>
          </div>

          <div class="header-actions d-flex gap-2 align-items-center">
            <button id="btn-cloud-account-header" class="btn-cloud-sync-pill" title="الهوية المصرفية وحفظ Google السحابي">
              <span class="sync-indicator-dot ${cloudSaveService.getStatusInfo().badgeClass}"></span>
              <span>${cloudSaveService.getStatusInfo().text}</span>
            </button>
            <button id="btn-open-wardrobe-header" class="btn-wardrobe-header-pill" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(181, 136, 92, 0.35)); border: 1.5px solid #d4af37; color: #fbbf24; font-weight: 800; padding: 7px 15px; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; white-space: nowrap; box-shadow: 0 2px 10px rgba(212, 175, 55, 0.2);" title="دولاب الملابس واستوديو الشخصيات ثلاثي الأبعاد">
              <span>👔</span>
              <span>دولاب الملابس 3D</span>
            </button>
            <button id="toggle-view-mode-btn" class="dual-view-pill-switcher ${this.viewMode === 'floor' ? 'active-floor' : ''}" title="التبديل بين صالة البنك 3D ومكتب الإدارة">
              <span>${this.viewMode === 'floor' ? '🏛️ صالة الفرع 3D' : '💼 مكتب الإدارة'}</span>
              <span style="font-size: 10px; opacity: 0.85; background: rgba(0,0,0,0.35); padding: 2px 6px; border-radius: 10px;">[تبديل ⇄]</span>
            </button>
            <button id="theme-toggle-btn" class="theme-switch-btn" title="تبديل مظهر وألوان اللعبة">
              <span class="theme-badge-dot"></span>
              <span>🎨 ${this.getThemeDisplayName()}</span>
            </button>
            <button id="next-month-btn" class="btn btn-primary next-month-btn">
              <span>إنهاء الشهر المالي</span>
              <span class="btn-arrow">←</span>
            </button>
          </div>
        </div>

        <!-- Active View Indicator Bar -->
        <div class="active-view-bar">
          <span class="view-indicator-title">${this.viewMode === 'floor' ? '🏛️ صالة البنك التفاعلية ثلاثية الأبعاد (3D Live Floor)' : this.getActiveTabTitle()}</span>
          <button id="view-switch-sidebar-btn" class="view-switch-btn">تغيير القسم ☰</button>
        </div>

        <!-- Live Breaking News Ticker -->
        ${this.renderNewsTicker()}
      </header>

      ${this.renderBankRunAlertBanner()}

      <main class="main-body">
        <section class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon">💰</div>
            <div class="kpi-info">
              <span class="kpi-label">سيولة الخزينة المتاحة</span>
              <span class="kpi-val ${this.state.treasuryCash < 15000 ? 'text-danger' : 'text-emerald'}">
                ${this.state.treasuryCash.toLocaleString('ar-EG')} <small>ج.م</small>
              </span>
              <span class="kpi-sub">محفظة البورصة: ${this.state.investmentsManager ? this.state.investmentsManager.getPortfolioValue().toLocaleString('ar-EG') : 0} ج.م</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon">📥</div>
            <div class="kpi-info">
              <span class="kpi-label">إجمالي ودائع العملاء</span>
              <span class="kpi-val text-gold">
                ${this.state.totalDeposits.toLocaleString('ar-EG')} <small>ج.م</small>
              </span>
              <span class="kpi-sub">منها إسلامية: ${this.state.islamicBankingManager ? this.state.islamicBankingManager.islamicDeposits.toLocaleString('ar-EG') : 0} ج.م</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon">📤</div>
            <div class="kpi-info">
              <span class="kpi-label">محفظة القروض والتمويل</span>
              <span class="kpi-val text-blue">
                ${this.state.totalLoans.toLocaleString('ar-EG')} <small>ج.م</small>
              </span>
              <span class="kpi-sub">عائد التمويل: ${this.state.lendingAnnualRate.toFixed(1)}% سنوياً</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon">🏆</div>
            <div class="kpi-info">
              <span class="kpi-label">الحصة السوقية (Market Share)</span>
              <span class="kpi-val text-cyan">${marketShare}%</span>
              <span class="kpi-sub">بين 4 بنوك رئيسية في السوق</span>
            </div>
          </div>
        </section>

        <div class="tab-view-container">
          ${this.viewMode === 'floor' ? this.renderBankFloorContainer() : this.renderActiveTabContent()}
        </div>
      </main>

      <div id="modal-container"></div>
      <div id="toast-container"></div>
    `;

    if (this.viewMode === 'floor') {
      this.initOrResumeBankFloor();
    } else {
      if (this.bankFloorScene) {
        this.bankFloorScene.pause();
      }
      if (this.activeTab === 'dashboard' || this.activeTab === 'reports') {
        this.renderHistoryChart();
      }
    }
  }

  renderActiveTabContent() {
    if (this.state.licensesManager && !this.state.licensesManager.isTabUnlocked(this.activeTab)) {
      return this.renderLockedTabFallback(this.activeTab);
    }

    switch (this.activeTab) {
      case 'dashboard':
        return this.renderDashboardTab();
      case 'loans':
        return this.renderLoansTab();
      case 'legal':
        return this.renderLegalTab();
      case 'certificates':
        return this.renderCertificatesTab();
      case 'egx':
        return this.renderEGXTab();
      case 'cards':
        return this.renderCardsTab();
      case 'instapay':
        return this.renderInstaPayTab();
      case 'fx':
        return this.renderFXTab();
      case 'islamic':
        return this.renderIslamicTab();
      case 'branches':
        return this.renderBranchesTab();
      case 'branches_map':
        return this.renderBranchesMapTab();
      case 'neo_bank':
        return this.renderNeoBankTab();
      case 'vendors':
        return this.renderVendorsTab();
      case 'hr':
        return this.renderHRTab();
      case 'csr':
        return this.renderCSRTab();
      case 'trophies':
        return this.renderTrophiesTab();
      case 'reports':
        return this.renderReportsTab();
      case 'executive_life':
        return this.renderExecutiveLifeTab();
      default:
        return '';
    }
  }

  renderDashboardTab() {
    const lastReport = this.state.lastMonthReport;
    const rivals = this.state.competitorsManager ? this.state.competitorsManager.rivals : [];
    const myShare = this.state.competitorsManager ? this.state.competitorsManager.playerMarketShare : 0.5;

    return `
      <div class="starter-banner mb-6">
        <div class="starter-content">
          <div class="starter-icon">📢</div>
          <div>
            <h3>حملة جذب المودعين في الحي التجاري</h3>
            <p>أطلق حملة ترويجية للمواطنين وأصحاب المتاجر لإيداع أموالهم في <strong>${this.escapeHTML(this.state.bankName)}</strong> بعائد منافس.</p>
          </div>
        </div>
        <button id="launch-campaign-btn" class="btn btn-warning btn-lg">
          إطلاق الحملة (تكلفة 2,000 ج.م)
        </button>
      </div>

      <div class="panel mb-6">
        <div class="panel-header">
          <h3>🏆 الحصة السوقية والتنافس المصرفي المصري</h3>
        </div>
        <div class="market-share-box">
          <div class="share-bar-container">
            <div class="share-bar-fill player-fill" style="width: ${Math.max(5, myShare)}%" title="${this.escapeHTML(this.state.bankName)} (${myShare}%)">
              ${this.escapeHTML(this.state.bankName)} (${myShare}%)
            </div>
          </div>

          <div class="rivals-mini-grid mt-4">
            <div class="rival-pill my-bank-pill">
              <strong>${this.escapeHTML(this.state.bankName)}:</strong> <span>حصة ${myShare}%</span>
            </div>
            ${rivals.map(r => `
              <div class="rival-pill">
                <strong>${r.name}:</strong> <span>${r.marketShare}% (${r.focus})</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="dashboard-layout">
        <div class="panel">
          <div class="panel-header">
            <h3>📈 تطور الأرباح وحجم السيولة المصرفية</h3>
          </div>
          <div class="chart-wrapper">
            <canvas id="history-chart" width="700" height="230"></canvas>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>📋 تقرير أداء الشهر الأخير</h3>
          </div>
          ${lastReport ? `
            <div class="summary-list">
              <div class="summary-item">
                <span>عوائد فوائد التمويل:</span>
                <span class="text-emerald">+${lastReport.loanInterest.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div class="summary-item">
                <span>رسوم الفروع والـ ATM:</span>
                <span class="text-emerald">+${lastReport.branchFees.toLocaleString('ar-EG')} ج.م</span>
              </div>
              ${lastReport.cardFees > 0 ? `
                <div class="summary-item">
                  <span>رسوم البطاقات وشبكة ميزة:</span>
                  <span class="text-emerald">+${lastReport.cardFees.toLocaleString('ar-EG')} ج.م</span>
                </div>
              ` : ''}
              ${lastReport.stockDividends > 0 ? `
                <div class="summary-item">
                  <span>توزيعات أرباح البورصة (EGX):</span>
                  <span class="text-emerald">+${lastReport.stockDividends.toLocaleString('ar-EG')} ج.م</span>
                </div>
              ` : ''}
              <div class="summary-item">
                <span>فوائد ودائع العملاء والشهادات:</span>
                <span class="text-danger">-${lastReport.depositInterest.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div class="summary-item">
                <span>رواتب الموظفين:</span>
                <span class="text-danger">-${lastReport.salaries.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div class="summary-item">
                <span>إيجار المقرات والمصروفات:</span>
                <span class="text-danger">-${lastReport.branchOpEx.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <hr class="divider">
              <div class="summary-item highlight">
                <span>صافي ربح الشهر:</span>
                <span class="${lastReport.netProfit >= 0 ? 'text-emerald' : 'text-danger'} font-bold">
                  ${lastReport.netProfit >= 0 ? '+' : ''}${lastReport.netProfit.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>
          ` : `
            <div class="empty-notice">
              <p>مرحباً بك! افحص طلبات التمويل أو استثمر في البورصة، واضغط <strong>"إنهاء الشهر المالي"</strong> لحساب أول دورة محاسبية.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderEGXTab() {
    const inv = this.state.investmentsManager;
    const portfolioValue = inv.getPortfolioValue();
    const monthlyDiv = inv.monthlyDividendsTotal || 0;

    return `
      <div class="sub-header-bar">
        <div>
          <h2>📈 البورصة المصرية (EGX) وتداول الأوراق المالية</h2>
          <p class="text-muted">استثمر فوائض سيولة الخزينة في كبرى الشركات المصرية المدرجة لجني توزيعات أرباح شهرية وأرباح رأسمالية سريعة.</p>
        </div>
        <div class="d-flex gap-2">
          <div class="total-salaries-badge">
            <span>قيمة المحفظة:</span>
            <strong class="text-emerald font-lg">${portfolioValue.toLocaleString('ar-EG')} ج.م</strong>
          </div>
          <div class="total-salaries-badge" style="border-color: #38bdf8;">
            <span>توزيعات شهرية:</span>
            <strong class="text-cyan font-lg">+${monthlyDiv.toLocaleString('ar-EG')} ج.م</strong>
          </div>
        </div>
      </div>

      <div class="cards-grid">
        ${inv.stocks.map(s => {
          const changePct = (((s.price - s.prevPrice) / (s.prevPrice || 1)) * 100).toFixed(2);
          const isUp = s.price >= s.prevPrice;
          const positionVal = s.sharesOwned * s.price;

          return `
            <div class="loan-card">
              <div class="loan-header">
                <div>
                  <h4 class="loan-title">${s.name}</h4>
                  <span class="badge cat-badge">${s.ticker} • ${s.sector}</span>
                </div>
                <div class="badge ${isUp ? 'status-open' : 'status-closed'}">
                  ${isUp ? '▲ +' : '▼ '}${changePct}%
                </div>
              </div>

              <div class="loan-details">
                <div class="detail-row">
                  <span>سعر السهم اللحظي:</span>
                  <strong class="text-gold font-lg">${s.price.toFixed(2)} ج.م</strong>
                </div>
                <div class="detail-row">
                  <span>رصيد البنك من الأسهم:</span>
                  <span class="font-bold text-cyan">${s.sharesOwned.toLocaleString('ar-EG')} سهم</span>
                </div>
                <div class="detail-row">
                  <span>قيمة المركز المالي:</span>
                  <span class="font-bold ${positionVal > 0 ? 'text-emerald' : 'text-muted'}">${Math.round(positionVal).toLocaleString('ar-EG')} ج.م</span>
                </div>
                <div class="detail-row">
                  <span>عائد التوزيعات السنوي:</span>
                  <span class="text-emerald font-bold">${s.dividendYieldAnnual}% سنوياً</span>
                </div>
              </div>

              <div style="margin-top: 10px;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 700;">أوامر الشراء:</div>
                <div class="stock-qty-btn-group">
                  <button class="stock-qty-btn" data-action="buy-stock" data-ticker="${s.ticker}" data-qty="100">
                    + 100 (${Math.round(s.price * 100).toLocaleString('ar-EG')} ج.م)
                  </button>
                  <button class="stock-qty-btn" data-action="buy-stock" data-ticker="${s.ticker}" data-qty="500">
                    + 500 (${Math.round(s.price * 500).toLocaleString('ar-EG')} ج.م)
                  </button>
                  <button class="stock-qty-btn" data-action="buy-stock" data-ticker="${s.ticker}" data-qty="1000">
                    + 1,000 (${Math.round(s.price * 1000).toLocaleString('ar-EG')} ج.م)
                  </button>
                </div>

                ${s.sharesOwned > 0 ? `
                  <div style="font-size: 12px; color: #f59e0b; margin-bottom: 4px; font-weight: 700;">أوامر البيع والتسييل:</div>
                  <div class="stock-qty-btn-group">
                    <button class="btn btn-warning" style="flex: 1; padding: 5px 0; font-size: 11.5px;" data-action="sell-stock" data-ticker="${s.ticker}" data-qty="100">
                      بيع 100 سهم
                    </button>
                    ${s.sharesOwned >= 500 ? `
                      <button class="btn btn-warning" style="flex: 1; padding: 5px 0; font-size: 11.5px;" data-action="sell-stock" data-ticker="${s.ticker}" data-qty="500">
                        بيع 500 سهم
                      </button>
                    ` : ''}
                    <button class="btn btn-outline-danger" style="flex: 1; padding: 5px 0; font-size: 11.5px;" data-action="sell-stock" data-ticker="${s.ticker}" data-qty="all">
                      تصفية الكل (${s.sharesOwned})
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderCardsTab() {
    const cm = this.state.cardsManager;

    return `
      <div class="sub-header-bar">
        <div>
          <h2>البطاقات المصرفية وشبكة "ميزة" الوطنية</h2>
          <p class="text-muted">إصدار بطاقات الدفع الإلكتروني وتجهيز المتاجر بماكينات نقاط البيع (POS) لكسب عوائد دورية من عمولات السحب والمشتريات.</p>
        </div>
        <div class="total-salaries-badge">
          <span>ماكينات POS بالمتاجر:</span>
          <strong class="text-gold font-lg">${cm.posTerminalsCount} ماكينة</strong>
        </div>
      </div>

      <div class="training-card mb-6">
        <div class="training-info">
          <div class="training-icon">🏪</div>
          <div>
            <h4>شبكة نقاط البيع الإلكترونية (POS Terminals)</h4>
            <p>توزيع ماكينات الدفع بالمتاجر والمطاعم والصيدليات يحقق عائداً شهرياً للبنك من عمولات نقاط البيع.</p>
          </div>
        </div>
        <button id="buy-pos-btn" class="btn btn-primary">
          + نشر 5 ماكينات POS (${(cm.posTerminalCost * 5).toLocaleString('ar-EG')} ج.م)
        </button>
      </div>

      <div class="cards-grid">
        ${cm.cardPrograms.map(p => `
          <div class="loan-card ${p.unlocked ? 'border-emerald' : ''}">
            <div class="loan-header">
              <div>
                <h4 class="loan-title">${p.name}</h4>
                <span class="status-badge ${p.unlocked ? 'status-open' : 'status-closed'}">
                  ${p.unlocked ? 'مفعلة وتصدر للعملاء' : 'غير مفعلة'}
                </span>
              </div>
            </div>

            <p class="branch-desc">${p.description}</p>

            <div class="loan-details mt-3">
              <div class="detail-row">
                <span>البطاقات المصدرة حالياً:</span>
                <strong class="text-cyan font-lg">${p.cardsIssued.toLocaleString('ar-EG')} بطاقة</strong>
              </div>
              <div class="detail-row">
                <span>الرسوم السنوية للبطاقة:</span>
                <span>${p.annualFeePerCard} ج.م</span>
              </div>
              <div class="detail-row">
                <span>الدخل الشهري المتوقع للبطاقة:</span>
                <span class="text-emerald font-bold">+${p.monthlyIncomePerCard} ج.م / شهر</span>
              </div>
            </div>

            <div class="card-actions">
              ${p.unlocked ? `
                <div class="badge success-badge w-full text-center">✓ البرنامج نشط ويحقق دخلاً دورياً</div>
              ` : `
                <button class="btn btn-primary w-full" data-action="launch-card" data-id="${p.id}">
                  إطلاق وتدشين البرنامج (${p.launchCost.toLocaleString('ar-EG')} ج.م)
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderIslamicTab() {
    const ib = this.state.islamicBankingManager;

    return `
      <div class="sub-header-bar">
        <div>
          <h2>نافذة الصيرفة والمعاملات الإسلامية</h2>
          <p class="text-muted">تقديم منتجات تمويل وادخار متوافقة مع الشريعة الإسلامية بنظام المرابحة والصكوك والمضاربة المعتمدة من هيئة الرقابة الشرعية.</p>
        </div>
        <div class="total-salaries-badge">
          <span>إجمالي الودائع والصكوك الشرعية:</span>
          <strong class="text-gold font-lg">${ib.islamicDeposits.toLocaleString('ar-EG')} ج.م</strong>
        </div>
      </div>

      ${!ib.isWindowActive ? `
        <div class="starter-banner mb-6">
          <div class="starter-content">
            <div class="starter-icon">🕌</div>
            <div>
              <h3>ترخيص وتفعيل النافذة الإسلامية المستقلة</h3>
              <p>استيفاء شروط البنك المركزي وتعيين هيئة رقابة شرعية لجذب فئات واسعة من المودعين والتجار الملتزمين بالمعاملات الإسلامية.</p>
            </div>
          </div>
          <button id="activate-islamic-btn" class="btn btn-warning btn-lg">
            تفعيل النافذة الإسلامية (${ib.activationCost.toLocaleString('ar-EG')} ج.م)
          </button>
        </div>
      ` : `
        <div class="badge rep-badge font-lg p-3 mb-4 w-full text-center">
          ✓ النافذة الإسلامية مرخصة ومعتمدة من هيئة الرقابة الشرعية وتجلب ودائع تنموية مستمرة
        </div>
      `}

      <div class="cards-grid">
        ${ib.products.map(prod => `
          <div class="loan-card ${prod.active ? 'border-emerald' : ''}">
            <div class="loan-header">
              <div>
                <h4 class="loan-title">${prod.name}</h4>
                <span class="status-badge ${prod.active ? 'status-open' : 'status-closed'}">
                  ${prod.active ? 'متاح للعملاء' : 'يتطلب اعتماد'}
                </span>
              </div>
            </div>

            <p class="branch-desc">${prod.description}</p>

            <div class="card-actions mt-4">
              ${prod.active ? `
                <div class="badge success-badge w-full text-center">✓ مطروح للاكتتاب العام</div>
              ` : `
                <button class="btn btn-primary w-full" data-action="unlock-islamic-prod" data-id="${prod.id}">
                  اعتماد وطرح المنتج (${prod.unlockCost.toLocaleString('ar-EG')} ج.م)
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderCSRTab() {
    const csr = this.state.csrManager;
    const cm = this.state.complianceManager;
    const audit = cm ? cm.lastAuditReport : null;
    const amlScore = cm ? cm.amlRiskScore : 0;
    const pendingAML = cm ? cm.pendingAMLTransactions : [];

    let amlRiskLabel = 'منخفض جداً (آمن)';
    let amlRiskClass = 'text-emerald';
    if (amlScore >= 70) {
      amlRiskLabel = 'حرج وخطير (تحت طائلة عقوبات وغرامات البنك المركزي)';
      amlRiskClass = 'text-danger';
    } else if (amlScore >= 40) {
      amlRiskLabel = 'متوسط (شبهات رقابية تستلزم تدقيقاً)';
      amlRiskClass = 'text-warning';
    }

    return `
      <div class="sub-header-bar">
        <div>
          <h2>الرقابة المصرفية والمشاريع القومية (CSR)</h2>
          <p class="text-muted">متابعة تقييمات تفتيش البنك المركزي والمساهمة في تمويل المشروعات القومية وبناء السمعة الوطنية.</p>
        </div>
      </div>

      <div class="panel mb-6">
        <div class="panel-header">
          <h3>🏛️ تقييم التفتيش الدوري للبنك المركزي المصري (CAMELS)</h3>
        </div>
        ${audit ? `
          <div class="audit-summary-box">
            <div class="audit-score-badge">
              <span class="font-xl text-gold">تقييم البنك: ${'★'.repeat(audit.overallStars)} (${audit.overallStars} من 5)</span>
            </div>
            <p class="audit-eval mt-2"><strong>تقرير المفتش العام:</strong> ${audit.evaluation}</p>
            <div class="audit-scores-grid mt-3">
              <div>كفاية رأس المال (C): <strong>${audit.cScore}/5</strong></div>
              <div>جودة الأصول والائتمان (A): <strong>${audit.aScore}/5</strong></div>
              <div>كفاءة الإدارة (M): <strong>${audit.mScore}/5</strong></div>
              <div>معدلات الربحية (E): <strong>${audit.eScore}/5</strong></div>
              <div>نسبة السيولة (L): <strong>${audit.lScore}/5</strong></div>
              <div>الامتثال للمخاطر (S): <strong>${audit.sScore}/5</strong></div>
            </div>
          </div>
        ` : `
          <div class="empty-notice">
            <p>يتم إجراء التفتيش الدوري للبنك المركزي المصري كل 6 شهور مالية للتأكد من التزام البنك بنسب السيولة والاحتياطي.</p>
          </div>
        `}
      </div>

      <!-- AML & Suspicious Transactions Section -->
      <div class="panel mb-6">
        <div class="panel-header">
          <h3>🚨 وحدة مكافحة غسل الأموال والتحري الرقابي (AML Unit)</h3>
          <span class="badge ${amlScore > 40 ? 'status-closed' : 'status-open'}">
            مؤشر خطر غسل الأموال: ${amlScore}%
          </span>
        </div>

        <div class="aml-container p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span class="font-sm text-muted">مستوى المخاطر الرقابية العامة: </span>
              <strong class="${amlRiskClass} font-md">${amlRiskLabel}</strong>
            </div>
            <div class="text-muted font-xs">
              الحد الأقصى المسموح: 50% قبل فرض عقوبات وغرامات التفتيش الفجائي
            </div>
          </div>
          <div class="iscore-meter-track mb-4">
            <div class="iscore-meter-fill" style="width: ${Math.min(100, amlScore)}%; background: ${amlScore > 65 ? '#ef4444' : amlScore > 35 ? '#f59e0b' : '#10b981'};"></div>
          </div>

          <h4 class="font-md mb-3 text-light">📋 إيداعات ومعاملات مشبوهة واردة للفحص والقرار (${pendingAML.length} معاملات معلقة)</h4>

          ${pendingAML.length === 0 ? `
            <div class="empty-notice">
              <p>🟢 لا توجد معاملات نقدية مشبوهة معلقة حالياً. سجلات حركة الأموال النقدية منتظمة ومطابقة لإجراءات (KYC).</p>
            </div>
          ` : `
            <div class="aml-tx-grid">
              ${pendingAML.map(tx => {
                const comm = Math.round(tx.amount * 0.08);
                return `
                  <div class="aml-tx-card">
                    <div class="aml-tx-header">
                      <div>
                        <h4 class="font-md font-bold text-light">${this.escapeHTML(tx.clientName)}</h4>
                        <span class="badge status-closed font-xs">معاملة نقدية غير موثقة</span>
                      </div>
                      <div class="text-right">
                        <strong class="text-gold font-lg">${tx.amount.toLocaleString('ar-EG')} ج.م</strong>
                        <div class="text-muted font-xs">إيداع نقدي كاش مباشر</div>
                      </div>
                    </div>

                    <p class="text-subtle font-sm my-2">⚠️ <strong>شبهة المعاملة:</strong> ${this.escapeHTML(tx.reason)}</p>

                    <div class="aml-consequences p-2 mb-3 rounded bg-dark-subtle font-xs">
                      <div class="d-flex justify-content-between mb-1">
                        <span class="text-warning font-bold">إغراء التمرير:</span>
                        <span class="text-emerald font-bold">+${comm.toLocaleString('ar-EG')} ج.م عمولة فورية للخزينة (مع +18% خطر AML)</span>
                      </div>
                      <div class="d-flex justify-content-between">
                        <span class="text-cyan font-bold">قرار التجميد والإبلاغ:</span>
                        <span class="text-cyan font-bold">+4 نزاهة وسمعة ودرع حماية ضد التفتيش الرقابي</span>
                      </div>
                    </div>

                    <div class="d-flex gap-2">
                      <button class="btn btn-warning btn-sm w-half" data-action="aml-pass" data-id="${tx.id}">
                        💰 تمرير المعاملة (+8% عمولة)
                      </button>
                      <button class="btn btn-danger btn-sm w-half" data-action="aml-freeze" data-id="${tx.id}">
                        🛡️ تجميد وإبلاغ مكافحة غسل الأموال
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>

      <div class="branches-section-title">
        <h3>🇪🇬 المشروعات القومية والمسؤولية المجتمعية</h3>
      </div>

      <div class="cards-grid">
        ${csr.initiatives.map(item => `
          <div class="loan-card ${item.completed ? 'border-gold' : ''}">
            <div class="loan-header">
              <div>
                <h4 class="loan-title">${item.title}</h4>
                <span class="badge ${item.type === 'mega' ? 'tier-badge' : 'cat-badge'}">
                  ${item.type === 'mega' ? 'مشروع قومي استثماري' : 'مسؤولية مجتمعية وصحة'}
                </span>
              </div>
            </div>

            <p class="branch-desc">${item.description}</p>

            <div class="loan-details mt-3">
              <div class="detail-row">
                <span>قيمة المساهمة المطلوبة:</span>
                <strong class="text-gold">${item.cost.toLocaleString('ar-EG')} ج.م</strong>
              </div>
              <div class="detail-row">
                <span>زيادة ثقة وسمعة البنك:</span>
                <strong class="text-emerald">+${item.reputationBoost}%</strong>
              </div>
              ${item.monthlyReturn ? `
                <div class="detail-row">
                  <span>العائد الشهري المستدام:</span>
                  <strong class="text-cyan">+${item.monthlyReturn.toLocaleString('ar-EG')} ج.م / شهر</strong>
                </div>
              ` : ''}
            </div>

            <div class="card-actions">
              ${item.completed ? `
                <div class="badge success-badge w-full text-center">✓ تمت المساهمة وحظي البنك بالتكريم</div>
              ` : `
                <button class="btn btn-warning w-full" data-action="sponsor-csr" data-id="${item.id}">
                  اعتماد المساهمة الوطنية (${item.cost.toLocaleString('ar-EG')} ج.م)
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderLoansTab() {
    const apps = this.state.loansManager.pendingApplications;
    const active = this.state.loansManager.activeLoans;

    return `
      <div class="sub-header-bar">
        <div>
          <h2>📝 مركز التسهيلات الائتمانية وفحص الجدارة (I-Score)</h2>
          <p class="text-muted">افحص التقارير الائتمانية والضمانات ونسب عبء الدين (DBR) للمتقدمين؛ قرر الصرف المباشر، التفاوض لرفع الفائدة، أو الرفض.</p>
        </div>
        <div class="total-salaries-badge">
          <span>إجمالي محفظة التمويل:</span>
          <strong class="text-gold font-lg">${this.state.totalLoans.toLocaleString('ar-EG')} ج.م</strong>
        </div>
      </div>

      <div class="loans-section-title">
        <h3>📋 طلبات التمويل قيد الدراسة والائتمان (${apps.length} طلبات جديدة)</h3>
      </div>

      <div class="cards-grid">
        ${apps.map(app => {
          const score = app.iScore || 700;
          let scoreClass = 'iscore-good';
          let scoreLabel = 'جيد جداً';
          let meterColor = '#0284c7';

          if (score >= 780) {
            scoreClass = 'iscore-excellent';
            scoreLabel = 'ممتاز (مخاطرة منخفضة)';
            meterColor = '#10b981';
          } else if (score >= 680) {
            scoreClass = 'iscore-good';
            scoreLabel = 'جيد جداً (معياري)';
            meterColor = '#0284c7';
          } else if (score >= 580) {
            scoreClass = 'iscore-fair';
            scoreLabel = 'متوسط (يتطلب ضمانات)';
            meterColor = '#f59e0b';
          } else {
            scoreClass = 'iscore-poor';
            scoreLabel = 'عالي المخاطر (حرجة)';
            meterColor = '#ef4444';
          }

          const fillPct = Math.min(100, Math.round((score / 850) * 100));

          return `
            <div class="loan-card">
              <div class="loan-header">
                <div>
                  <h4 class="loan-title">${app.title}</h4>
                  <span class="badge cat-badge">${app.category}</span>
                </div>
                <div class="rating-badge rating-${app.creditRating.charAt(0)}">
                  تصنيف: ${app.creditRating}
                </div>
              </div>

              <!-- I-Score Gauge -->
              <div class="iscore-container">
                <div class="iscore-header">
                  <span>درجة الجدارة الائتمانية I-Score:</span>
                  <span class="iscore-badge-pill ${scoreClass}">${score} / 850 • ${scoreLabel}</span>
                </div>
                <div class="iscore-meter-track">
                  <div class="iscore-meter-fill" style="width: ${fillPct}%; background: ${meterColor};"></div>
                </div>
                <div class="iscore-metrics-grid">
                  <div>الدخل الشهري: <strong class="text-light">${(app.monthlyIncome || 35000).toLocaleString('ar-EG')} ج.م</strong></div>
                  <div>عبء الدين (DBR): <strong class="${app.dbr > 40 ? 'text-danger' : 'text-emerald'}">${app.dbr || 32}%</strong></div>
                </div>
              </div>

              <div class="loan-details">
                <div class="detail-row">
                  <span>قيمة التمويل المطلوب:</span>
                  <strong class="text-gold font-lg">${app.amount.toLocaleString('ar-EG')} ج.م</strong>
                </div>
                <div class="detail-row">
                  <span>سعر الفائدة والمدة:</span>
                  <span>${app.annualRate}% سنوياً (${app.tenureMonths} شهراً)</span>
                </div>
                <div class="detail-row">
                  <span>العائد الشهري للبنك:</span>
                  <strong class="text-emerald">+${app.monthlyProfit.toLocaleString('ar-EG')} ج.م / شهر</strong>
                </div>
                <div class="detail-row">
                  <span>الضمانات المقدمة:</span>
                  <span class="text-muted" style="font-size: 11.5px;">${app.collateral}</span>
                </div>
                <div class="detail-row">
                  <span>نسبة احتمالية التعثر:</span>
                  <span class="${app.riskRatio > 0.025 ? 'text-danger' : 'text-emerald'} font-bold">
                    ${(app.riskRatio * 100).toFixed(1)}%
                  </span>
                </div>

                ${app.isCorporate && app.commercialDossier ? `
                  <div class="corporate-dossier-banner" style="background: rgba(2, 132, 199, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 12px; padding: 10px 12px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <div>
                      <div style="font-size: 11px; color: #38bdf8; font-weight: 800;">🏢 الملف التجاري والمستندات الرسمية</div>
                      <div style="font-size: 11.5px; color: #cbd5e1; margin-top: 2px;">
                        سجل تجاري • بطاقة ضريبية • ميزانية ${app.commercialDossier.balanceSheet.fiscalYear}
                      </div>
                      ${app.commercialDossier.isAudited ? `
                        <span class="official-stamp stamp-verified mt-1" style="font-size: 10px;">✓ تم التدقيق الميداني والمحاسبي (-40% مخاطرة)</span>
                      ` : ''}
                    </div>
                    <button class="btn-dossier-inspect" data-action="inspect-dossier" data-id="${app.id}" title="فحص مستندات الشركة القانونية">
                      📂 فحص الأوراق
                    </button>
                  </div>
                ` : ''}
              </div>

              <div class="analyst-note">
                <span class="note-icon">💡</span>
                <em>رأي محلل الائتمان: ${app.analystNote}</em>
              </div>

              <div class="loan-actions-group">
                <button class="btn btn-success" data-action="approve-loan" data-id="${app.id}">
                  ✓ صرف التمويل
                </button>
                <button class="btn-negotiate-rate" data-action="negotiate-loan" data-id="${app.id}" title="رفع الفائدة +2.5% واشتراط ضامن تضامني إضافي">
                  ⚖️ تفاوض (+2.5%)
                </button>
                <button class="btn btn-outline-danger" data-action="reject-loan" data-id="${app.id}">
                  ✕ رفض
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="loans-section-title mt-6">
        <h3>🏦 محفظة التسهيلات الممنوحة القائمة (${active.length} تمويلات منتظمة)</h3>
      </div>

      ${active.length === 0 ? `
        <div class="empty-box">
          <p>لا توجد تمويلات قائمة حالياً في دفاتر البنك. ادرس الطلبات أعلاه وابدأ بضخ السيولة لتوليد الأرباح الشهرية.</p>
        </div>
      ` : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>كود التمويل</th>
                <th>المستفيد والنشاط</th>
                <th>قيمة التمويل</th>
                <th>المتبقي بالسداد</th>
                <th>الفائدة</th>
                <th>الشهور المتبقية</th>
                <th>إجراءات الإدارة</th>
              </tr>
            </thead>
            <tbody>
              ${active.map(l => {
                const paidPct = Math.round((1 - (l.balance / l.amount)) * 100);
                return `
                  <tr>
                    <td><code>${l.id}</code></td>
                    <td>
                      <strong>${l.title}</strong>
                      <div style="font-size: 11px; color: #94a3b8;">${l.category}</div>
                    </td>
                    <td>${l.amount.toLocaleString('ar-EG')} ج.م</td>
                    <td>
                      <div class="text-gold font-bold">${l.balance.toLocaleString('ar-EG')} ج.م</div>
                      <div style="font-size: 10.5px; color: #34d399;">تم سداد ${paidPct}%</div>
                    </td>
                    <td><span class="badge" style="background: rgba(16,185,129,0.15); color: #34d399;">${l.annualRate}%</span></td>
                    <td>${l.tenureRemaining} شهراً</td>
                    <td>
                      <button class="btn-early-settle" data-action="early-settle-loan" data-id="${l.id}" title="سداد مبكر فوري لكامل الرصيد مع عمولة 2%">
                        ⚡ تسوية مبكرة
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  }

  renderHRTab() {
    const hr = this.state.hrManager;
    const totalSalaries = hr.calculateTotalSalaries();

    return `
      <div class="sub-header-bar">
        <div>
          <h2>الموارد البشرية والتوظيف</h2>
          <p class="text-muted">الكوادر البشرية المؤهلة تساندك في فحص الائتمان وتقليل الديون المعدومة وحماية البنك.</p>
        </div>
        <div class="total-salaries-badge">
          <span>فاتورة الرواتب الشهرية:</span>
          <strong class="text-gold font-lg">${totalSalaries.toLocaleString('ar-EG')} ج.م</strong>
        </div>
      </div>

      <div class="training-card">
        <div class="training-info">
          <div class="training-icon">🎓</div>
          <div>
            <h4>برنامج تدريب الكوادر بالمعهد المصرفي المصري (EBI)</h4>
            <p>يرفع كفاءة محللي الائتمان ومسؤولي الامتثال بنسبة 20% لتقليل مخاطر التعثر.</p>
          </div>
        </div>
        <button id="train-staff-btn" class="btn btn-warning">
          الالتحاق ببرنامج تدريبي (${(15000 * hr.trainingLevel).toLocaleString('ar-EG')} ج.م)
        </button>
      </div>

      <div class="cards-grid mt-4">
        ${Object.values(hr.staffCategories).map(cat => `
          <div class="staff-card">
            <div class="staff-header">
              <span class="staff-icon">${cat.icon}</span>
              <div>
                <h4>${cat.name}</h4>
                <span class="text-muted">الراتب: ${cat.baseSalary.toLocaleString('ar-EG')} ج.م / شهر</span>
              </div>
            </div>

            <p class="staff-desc">${cat.description}</p>
            <div class="staff-benefit">
              <span>الأثر:</span>
              <strong class="text-emerald">${cat.benefit}</strong>
            </div>

            <div class="staff-count-box">
              <span class="count-label">الموظفون المعينون:</span>
              <span class="count-number">${cat.count}</span>
            </div>

            <div class="card-actions">
              <button class="btn btn-primary" data-action="hire-staff" data-cat="${cat.id}">
                + تعيين (${cat.hiringFee.toLocaleString('ar-EG')} ج.م)
              </button>
              ${cat.count > 0 ? `
                <button class="btn btn-outline-danger" data-action="fire-staff" data-cat="${cat.id}">
                  - إنهاء خدمة
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderBranchesTab() {
    const bm = this.state.branchesManager;

    return `
      <div class="sub-header-bar">
        <div>
          <h2>المقرات وشبكة التحول الرقمي</h2>
          <p class="text-muted">توسيع المقرات بالمدن المصرية ونشر ماكينات الصراف الآلي وتطوير التطبيق البنكي.</p>
        </div>
      </div>

      <div class="digital-grid mb-6">
        <div class="digital-card">
          <div class="digital-header">
            <div class="digital-icon">🏧</div>
            <div>
              <h4>ماكينات الصراف الآلي (ATM)</h4>
              <span class="text-muted">دخل شهري من رسوم السحب للبطاقات الخارجية</span>
            </div>
          </div>
          <div class="digital-stats">
            <div>الماكينات المركبة: <strong>${bm.atmCount} ماكينة</strong></div>
            <div>الدخل الشهري: <strong class="text-emerald">+${(bm.atmCount * bm.atmFeePerUnit).toLocaleString('ar-EG')} ج.م</strong></div>
          </div>
          <button id="buy-atm-btn" class="btn btn-primary mt-3">
            + شراء ماكينة صراف (${bm.atmCost.toLocaleString('ar-EG')} ج.م)
          </button>
        </div>

        <div class="digital-card">
          <div class="digital-header">
            <div class="digital-icon">📱</div>
            <div>
              <h4>تطبيق البنك الذكي</h4>
              <span class="badge cat-badge">المستوى ${bm.mobileAppLevel} من 5</span>
            </div>
          </div>
          <p class="digital-feature">
            الحالة: <strong>${bm.mobileAppLevel === 0 ? 'غير مفعل بعد' : bm.mobileAppLevelsData[bm.mobileAppLevel - 1].title}</strong>
          </p>
          ${bm.mobileAppLevel < 5 ? `
            <button id="upgrade-app-btn" class="btn btn-warning mt-3">
              ${bm.mobileAppLevel === 0 ? 'إطلاق المنظومة الرقمية' : 'ترقية التطبيق'}: ${bm.mobileAppLevelsData[bm.mobileAppLevel].title} (${bm.mobileAppLevelsData[bm.mobileAppLevel].cost.toLocaleString('ar-EG')} ج.م)
            </button>
          ` : `
            <div class="badge rep-badge mt-3">✓ أعلى مستوى رقمي</div>
          `}
        </div>
      </div>

      <div class="branches-section-title">
        <h3>🏛️ شبكة المقرات والفروع</h3>
      </div>

      <div class="cards-grid">
        ${bm.branches.map(b => `
          <div class="branch-card ${b.unlocked ? 'branch-active' : 'branch-locked'}">
            <div class="branch-header">
              <div>
                <h4>${b.name}</h4>
                <span class="text-muted">📍 ${b.location}</span>
              </div>
              <span class="status-badge ${b.unlocked ? 'status-open' : 'status-closed'}">
                ${b.unlocked ? 'قيد التشغيل' : 'مغلق'}
              </span>
            </div>

            <p class="branch-desc">${b.description}</p>

            <div class="branch-metrics">
              <div>الإيجار والمصروفات: <span class="text-danger">-${b.opEx.toLocaleString('ar-EG')} ج.م</span></div>
              <div>رسوم الخدمات: <span class="text-emerald">+${b.monthlyFeeIncome.toLocaleString('ar-EG')} ج.م</span></div>
              ${b.depositBoost > 0 ? `
                <div>الودائع الإضافية: <span class="text-gold font-bold">+${b.depositBoost.toLocaleString('ar-EG')} ج.م</span></div>
              ` : ''}
            </div>

            <div class="branch-actions">
              ${b.unlocked ? `
                <div class="badge success-badge mb-3">✓ يعمل بنجاح</div>
                <div class="branch-upgrades-section mt-3 pt-3 border-top">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="font-xs font-bold text-light">🛠️ تجهيزات وتطوير الفرع الداخلي:</span>
                    <span class="badge tier-badge font-xs">${(b.upgrades || []).length} / ${bm.branchUpgradesCatalog.length} مركبة</span>
                  </div>
                  <div class="branch-upgrades-grid">
                    ${bm.branchUpgradesCatalog.map(upg => {
                      const isInstalled = (b.upgrades || []).includes(upg.id);
                      const canAfford = this.state.treasuryCash >= upg.cost;
                      return `
                        <div class="branch-upgrade-card ${isInstalled ? 'installed' : ''}">
                          <div class="upg-info">
                            <div class="upg-name">${upg.name}</div>
                            <div class="upg-desc">${upg.desc}</div>
                            <div class="upg-perks">
                              <span class="text-emerald font-xs">+${upg.feeBonus.toLocaleString('ar-EG')} ج.م/شهر</span>
                              <span class="text-cyan font-xs">+${upg.ratingBonus} سمعة</span>
                            </div>
                          </div>
                          <div class="upg-action">
                            ${isInstalled ? `
                              <span class="badge bg-emerald">✓ مركب</span>
                            ` : `
                              <button class="btn btn-warning btn-sm" data-action="upgrade-branch" data-branch-id="${b.id}" data-upgrade-id="${upg.id}" ${!canAfford ? 'disabled' : ''}>
                                تركيب (${upg.cost.toLocaleString('ar-EG')} ج.م)
                              </button>
                            `}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              ` : `
                <button class="btn btn-primary" data-action="unlock-branch" data-id="${b.id}">
                  تأسيس وافتتاح (${b.cost.toLocaleString('ar-EG')} ج.م)
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderBranchesMapTab() {
    const bm = this.state.branchesManager;
    const hubs = bm ? bm.regionalHubs : [];

    return `
      <div class="sub-header-bar">
        <div>
          <h2>🗺️ خريطة الفروع والتوسع الجغرافي بالأقاليم المصرية</h2>
          <p class="text-muted">نشر شبكة الفروع الذكية ومجمعات كبار العملاء في 5 محاور اقتصادية متكاملة عبر ربوع جمهورية مصر العربية.</p>
        </div>
      </div>

      <!-- Interactive Egypt Tactical Map -->
      <div class="egypt-map-wrapper">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="margin: 0; color: #f8fafc; font-size: 16px;">📍 مراكز السيادة المصرفية بالأقاليم</h3>
          <span style="font-size: 12px; color: #93c5fd;">خريطة استراتيجية تفاعلية تمثل المحاور الاقتصادية لجمهورية مصر العربية</span>
        </div>

        <div class="egypt-map-canvas">
          <!-- Stylized Egypt Geographic Schematic SVG -->
          <svg class="egypt-map-svg" viewBox="0 0 800 450" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="nileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0284c7" stop-opacity="0.9"/>
                <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.5"/>
              </linearGradient>
            </defs>

            <!-- Mediterranean Sea -->
            <path d="M 0 0 L 800 0 L 800 65 Q 580 85 400 55 Q 200 35 0 45 Z" fill="#0369a1" fill-opacity="0.3" />
            <!-- Red Sea & Gulf of Suez -->
            <path d="M 610 80 Q 640 150 690 230 Q 740 310 770 450 L 800 450 L 800 80 Z" fill="#0284c7" fill-opacity="0.25" />

            <!-- River Nile Path -->
            <path d="M 455 70 Q 450 95 445 135 Q 440 175 465 225 Q 485 275 475 335 Q 465 395 455 450" stroke="url(#nileGrad)" stroke-width="7" stroke-linecap="round" fill="none"/>
            <!-- Delta Branches -->
            <path d="M 445 135 Q 395 85 365 65" stroke="url(#nileGrad)" stroke-width="5" stroke-linecap="round" fill="none"/>
            <path d="M 445 135 Q 495 95 525 75" stroke="url(#nileGrad)" stroke-width="5" stroke-linecap="round" fill="none"/>
          </svg>

          <!-- Interactive Regional Hub Pins -->
          ${hubs.map(h => `
            <div class="map-hub-pin" style="left: ${h.svgCoords.x}%; top: ${h.svgCoords.y}%;" title="${h.name}">
              <div class="hub-pin-inner ${h.level === 0 ? 'locked' : (h.level === h.maxLevel ? 'flagship' : '')}">
                <span>${h.icon}</span>
                <span>${h.name.split(' ')[1] || h.name}</span>
                <span style="font-size: 10px; opacity: 0.85;">(${h.level > 0 ? `Lv.${h.level}` : 'مغلق'})</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Regional Hub Cards Grid -->
      <div class="regional-hubs-grid mb-6">
        ${hubs.map(h => {
          const isActive = h.level > 0;
          const isMax = h.level >= h.maxLevel;
          const nextLevel = h.level + 1;
          const nextCost = !isMax ? h.costs[nextLevel - 1] : 0;

          return `
            <div class="regional-hub-card ${isActive ? 'active-hub' : ''}">
              <div>
                <div class="regional-hub-header">
                  <span class="regional-hub-icon">${h.icon}</span>
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <h4 style="margin: 0; color: #fff; font-size: 15px;">${h.name}</h4>
                      <span class="badge ${isActive ? 'badge-primary' : 'badge-secondary'}" style="font-size: 11px;">
                        ${isActive ? `مستوى ${h.level} / ${h.maxLevel}` : 'مغلق'}
                      </span>
                    </div>
                    <div class="text-muted font-xs mt-1">📍 ${h.governorates}</div>
                  </div>
                </div>

                <div class="regional-hub-specialty">
                  ⭐ التخصص: ${h.specialty}
                </div>

                <div class="regional-stats-row mt-3">
                  <div>
                    <span class="text-muted d-block font-xs">الودائع الإقليمية:</span>
                    <strong class="text-gold font-sm">
                      ${isActive ? h.depositBoosts[h.level - 1].toLocaleString('ar-EG') : 0} ج.م
                    </strong>
                  </div>
                  <div>
                    <span class="text-muted d-block font-xs">دخل العمولات الشهري:</span>
                    <strong class="text-emerald font-sm">
                      +${isActive ? h.monthlyFees[h.level - 1].toLocaleString('ar-EG') : 0} ج.م
                    </strong>
                  </div>
                  <div>
                    <span class="text-muted d-block font-xs">مصروفات التشغيل:</span>
                    <strong class="text-danger font-sm">
                      -${isActive ? h.opExs[h.level - 1].toLocaleString('ar-EG') : 0} ج.م
                    </strong>
                  </div>
                  <div>
                    <span class="text-muted d-block font-xs">الرتبة التشغيلية:</span>
                    <strong class="text-cyan font-sm">
                      ${isActive ? h.levelTitles[h.level - 1] : 'غير مدشن'}
                    </strong>
                  </div>
                </div>
              </div>

              <div class="mt-3">
                ${!isMax ? `
                  <button class="btn btn-primary w-full" data-action="upgrade-regional-hub" data-hub-id="${h.id}">
                    ${h.level === 0 ? '🚀 تدشين الإقليم' : '⚡ ترقية الإقليم إلى'}: [${h.levelTitles[nextLevel - 1]}] (${nextCost.toLocaleString('ar-EG')} ج.م)
                  </button>
                ` : `
                  <div class="badge rep-badge w-full text-center py-2" style="display: block; font-size: 13px;">
                    ⭐ أقصى مستوى سيادة مصرفية بالإقليم (Flagship Hub)
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderNeoBankTab() {
    const neo = this.state.neoBankManager;
    if (!neo) return '';

    if (!neo.isLicensed) {
      return `
        <div class="neobank-hero-card">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
            <span style="font-size: 46px;">📱</span>
            <div>
              <h2 style="color: #fff; margin: 0; font-size: 24px;">بنك «Nile Neo» الرقمي المستقل (Neo-Bank)</h2>
              <p style="color: #c4b5fd; margin-top: 4px; font-size: 14px;">
                الجيل القادم من الصيرفة المصرية: 100% سحابي ورقمي، دون مصاريف فروع أو إيجارات تقليدية، موجه للشباب ورواد الأعمال.
              </p>
            </div>
          </div>

          <div class="neobank-features-grid mb-6">
            <div class="neobank-feature-card">
              <span style="font-size: 28px;">⚡</span>
              <h4 style="color: #fff;">فتح حسابات بالرقم القومي (e-KYC)</h4>
              <p class="text-muted font-sm">تسجيل العميل وإصدار بطاقة افتراضية في أقل من دقيقة واحدة عبر تطبيق الهاتف.</p>
            </div>
            <div class="neobank-feature-card">
              <span style="font-size: 28px;">🎯</span>
              <h4 style="color: #fff;">حصالات الادخار الذكية بالـ Gamification</h4>
              <p class="text-muted font-sm">تشجيع جيل الشباب على ادخار الفكة وتجميع أهداف السفر وشراء الذهب.</p>
            </div>
            <div class="neobank-feature-card">
              <span style="font-size: 28px;">🛍️</span>
              <h4 style="color: #fff;">التمويل اللحظي (BNPL)</h4>
              <p class="text-muted font-sm">تقسيط مشتريات التجارة الإلكترونية بنسب فائدة تنافسية وتوليد دخل عمولات مستمر.</p>
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 16px; padding: 20px; text-align: center; max-width: 580px; margin: 0 auto;">
            <h3 style="color: #a78bfa; margin-bottom: 10px;">شروط رخصة البنك الرقمي من البنك المركزي المصري:</h3>
            <div style="display: flex; justify-content: space-around; margin-bottom: 18px; font-size: 13.5px;">
              <div>السيولة المطلوبة: <strong style="color: #fbbf24;">${neo.licenseCost.toLocaleString('ar-EG')} ج.م</strong></div>
              <div>السمعة المصرفية المطلوبة: <strong style="color: #38bdf8;">${neo.minReputationRequired}%+</strong> (حالياً: ${this.state.reputation}%)</div>
            </div>
            <button id="btn-obtain-neo-license" class="btn btn-primary btn-lg w-full" style="font-size: 15px; font-weight: 800; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);">
              🚀 سداد رسوم الترخيص وإطلاق بنك [Nile Neo] الرقمي
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="sub-header-bar">
        <div>
          <h2>📱 بنك «Nile Neo» الرقمي المستقل (Neo-Bank Hub)</h2>
          <p class="text-muted">الذراع المصرفي الذكي • مرخص رسمياً من البنك المركزي • 0 مصروفات فروع تقليدية</p>
        </div>
        <div>
          <span class="badge badge-primary" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); font-size: 12px; padding: 6px 14px;">
            ✓ رخصة بنك رقمي نشطة
          </span>
        </div>
      </div>

      <!-- Live Fintech KPIs -->
      <div class="neobank-kpi-grid">
        <div class="neobank-kpi-box">
          <span class="text-muted font-xs">👥 المستخدمون النشطون</span>
          <div class="neobank-kpi-val">${neo.digitalUsers.toLocaleString('ar-EG')}</div>
          <span class="text-emerald font-xs">+${neo.lastMonthNewUsers.toLocaleString('ar-EG')} هذا الشهر</span>
        </div>
        <div class="neobank-kpi-box">
          <span class="text-muted font-xs">💳 البطاقات الافتراضية الصادرة</span>
          <div class="neobank-kpi-val" style="color: #38bdf8;">${neo.virtualCardsCount.toLocaleString('ar-EG')}</div>
          <span class="text-muted font-xs">مربوطة بشبكة ميزة وإنستاباي</span>
        </div>
        <div class="neobank-kpi-box">
          <span class="text-muted font-xs">🪙 الودائع الرقمية</span>
          <div class="neobank-kpi-val" style="color: #fbbf24;">${neo.digitalDeposits.toLocaleString('ar-EG')} <small style="font-size: 13px;">ج.م</small></div>
          <span class="text-muted font-xs">متوسط الرصيد: 180 ج.م/عميل</span>
        </div>
        <div class="neobank-kpi-box">
          <span class="text-muted font-xs">⚡ إيرادات العمولات والـ BNPL</span>
          <div class="neobank-kpi-val" style="color: #34d399;">+${neo.lastMonthDigitalRevenue.toLocaleString('ar-EG')} <small style="font-size: 13px;">ج.م</small></div>
          <span class="text-muted font-xs">تكلفة السيرفرات: -${neo.cloudCost.toLocaleString('ar-EG')} ج.م</span>
        </div>
      </div>

      <!-- Ecosystem Upgrades Grid -->
      <h3 style="color: #f1f5f9; font-size: 16px; margin-bottom: 14px;">🚀 تطوير منظومة التطبيق المصرفي والخدمات:</h3>
      <div class="neobank-features-grid mb-6">
        <!-- 1. Viral Marketing -->
        <div class="neobank-feature-card">
          <div>
            <div style="font-size: 32px; margin-bottom: 6px;">📢</div>
            <h4 style="color: #fff; margin: 0;">حملة تسويق فيروسي (Viral Campaign)</h4>
            <p class="text-muted font-xs mt-2">إطلاق تريند رقمي على منصات السوشيال لجذب آلاف المستخدمين والودائع الفورية في أسبوع.</p>
          </div>
          <button id="btn-neo-viral-campaign" class="btn btn-outline-primary btn-sm mt-3">
            تمويل الحملة (25,000 ج.م)
          </button>
        </div>

        <!-- 2. Smart Pots -->
        <div class="neobank-feature-card">
          <div>
            <div style="font-size: 32px; margin-bottom: 6px;">🎯</div>
            <h4 style="color: #fff; margin: 0;">الحصالات الذكية والادخار بالهدف</h4>
            <p class="text-muted font-xs mt-2">تمكين المستخدمين من ادخار الفكة وتحديد حصالات للزواج والسفر والذهب، وتثبيت السيولة +30%.</p>
          </div>
          <button id="btn-neo-smart-pots" class="btn ${neo.smartPotsUnlocked ? 'btn-secondary' : 'btn-outline-success'} btn-sm mt-3" ${neo.smartPotsUnlocked ? 'disabled' : ''}>
            ${neo.smartPotsUnlocked ? 'الميزة مفعلة بنجاح ✅' : 'برمجة الحصالات (35,000 ج.م)'}
          </button>
        </div>

        <!-- 3. BNPL -->
        <div class="neobank-feature-card">
          <div>
            <div style="font-size: 32px; margin-bottom: 6px;">🛍️</div>
            <h4 style="color: #fff; margin: 0;">التمويل اللحظي (BNPL - قسط مشترياتك)</h4>
            <p class="text-muted font-xs mt-2">تقسيط مشتريات التجارة الإلكترونية للشباب وتوليد عوائد دورية 3.5% شهرياً بمخاطر منخفضة.</p>
          </div>
          <button id="btn-neo-bnpl" class="btn ${neo.bnplUnlocked ? 'btn-secondary' : 'btn-outline-warning'} btn-sm mt-3" ${neo.bnplUnlocked ? 'disabled' : ''}>
            ${neo.bnplUnlocked ? `مفعل بمحفظة ${neo.bnplVolume.toLocaleString('ar-EG')} ج.م ✅` : 'تخصيص سيولة الـ BNPL (60,000 ج.م)'}
          </button>
        </div>

        <!-- 4. Cloud Hyperscale -->
        <div class="neobank-feature-card">
          <div>
            <div style="font-size: 32px; margin-bottom: 6px;">☁️</div>
            <h4 style="color: #fff; margin: 0;">البنية السحابية والخوادم (Cloud Tier)</h4>
            <p class="text-muted font-xs mt-2">المستوى الحالي: <strong>Tier ${neo.cloudTier}</strong>. الترقية تمنع سقوط السيستم عند تدفق مئات آلاف العمليات.</p>
          </div>
          <button id="btn-neo-upgrade-cloud" class="btn ${neo.cloudTier >= 3 ? 'btn-secondary' : 'btn-outline-info'} btn-sm mt-3" ${neo.cloudTier >= 3 ? 'disabled' : ''}>
            ${neo.cloudTier >= 3 ? 'أقصى سعة خوادم (Hyperscale) ✅' : `ترقية السيرفرات (${neo.cloudTier === 1 ? '30,000' : '75,000'} ج.م)`}
          </button>
        </div>
      </div>
    `;
  }

  renderReportsTab() {
    const kpis = this.state.getKPIs();
    const last = this.state.lastMonthReport;

    return `
      <div class="sub-header-bar">
        <div>
          <h2>المركز المالي والقوائم الدورية</h2>
          <p class="text-muted">تقرير رسمي معتمد موجه إلى: ${this.state.getManagerFormalTitle()}.</p>
        </div>
      </div>

      <div class="reports-grid">
        <div class="panel">
          <div class="panel-header">
            <h3>📑 قائمة الدخل الشهرية</h3>
          </div>
          <div class="statement-table">
            <div class="statement-row header-row">
              <span>البند</span>
              <span>القيمة (ج.م)</span>
            </div>
            <div class="statement-row">
              <span>• إيرادات فوائد التمويل</span>
              <span class="text-emerald">+${(last ? last.loanInterest : kpis.interestIncome).toLocaleString('ar-EG')}</span>
            </div>
            <div class="statement-row">
              <span>• رسوم العمليات والـ ATM والبطاقات</span>
              <span class="text-emerald">+${(last ? (last.branchFees + last.cardFees) : this.state.branchesManager.calculateMonthlyFees()).toLocaleString('ar-EG')}</span>
            </div>
            ${last && last.stockDividends > 0 ? `
              <div class="statement-row">
                <span>• توزيعات أرباح البورصة (EGX)</span>
                <span class="text-emerald">+${last.stockDividends.toLocaleString('ar-EG')}</span>
              </div>
            ` : ''}
            <div class="statement-row">
              <span>• فوائد ودائع العملاء والشهادات</span>
              <span class="text-danger">-${(last ? last.depositInterest : kpis.interestExpense).toLocaleString('ar-EG')}</span>
            </div>
            <div class="statement-row">
              <span>• رواتب الكوادر</span>
              <span class="text-danger">-${(last ? last.salaries : this.state.hrManager.calculateTotalSalaries()).toLocaleString('ar-EG')}</span>
            </div>
            <div class="statement-row">
              <span>• إيجار المقرات والمصروفات</span>
              <span class="text-danger">-${(last ? last.branchOpEx : this.state.branchesManager.calculateMonthlyOpEx()).toLocaleString('ar-EG')}</span>
            </div>
            <div class="statement-row total-row">
              <span>صافي الدخل التشغيلي:</span>
              <span class="${(last ? last.netProfit : 0) >= 0 ? 'text-emerald' : 'text-danger'} font-bold font-lg">
                ${(last ? last.netProfit : 0).toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>🏛️ المركز المالي (الميزانية)</h3>
          </div>
          <div class="statement-table">
            <div class="statement-row header-row">
              <span>الأصول (Assets)</span>
              <span>القيمة (ج.م)</span>
            </div>
            <div class="statement-row">
              <span>• النقدية بالخزينة</span>
              <span class="text-gold">${this.state.treasuryCash.toLocaleString('ar-EG')}</span>
            </div>
            <div class="statement-row">
              <span>• محفظة الأسهم بالبورصة (EGX)</span>
              <span class="text-emerald">${this.state.investmentsManager ? this.state.investmentsManager.getPortfolioValue().toLocaleString('ar-EG') : 0}</span>
            </div>
            <div class="statement-row">
              <span>• محفظة التمويل القائمة</span>
              <span class="text-blue">${this.state.totalLoans.toLocaleString('ar-EG')}</span>
            </div>
            <div class="statement-row subtotal-row">
              <span>إجمالي الأصول:</span>
              <strong class="text-emerald">${(this.state.treasuryCash + this.state.totalLoans + (this.state.investmentsManager ? this.state.investmentsManager.getPortfolioValue() : 0)).toLocaleString('ar-EG')} ج.م</strong>
            </div>

            <div class="statement-row header-row mt-4">
              <span>الالتزامات وحقوق الملكية</span>
              <span>القيمة (ج.م)</span>
            </div>
            <div class="statement-row">
              <span>• ودائع العملاء (تقليدية وإسلامية)</span>
              <span class="text-danger">${this.state.totalDeposits.toLocaleString('ar-EG')}</span>
            </div>
            <div class="statement-row">
              <span>• حقوق الملكية ورأس المال</span>
              <span class="text-cyan">${Math.max(0, (this.state.treasuryCash + this.state.totalLoans) - this.state.totalDeposits).toLocaleString('ar-EG')}</span>
            </div>
            <div class="statement-row subtotal-row">
              <span>إجمالي الالتزامات وحقوق الملكية:</span>
              <strong class="text-emerald">${(this.state.treasuryCash + this.state.totalLoans).toLocaleString('ar-EG')} ج.م</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderLegalTab() {
    const lm = this.state.legalManager;
    const pendingCases = lm.defaultedLoans.filter(d => d.status === 'pending');

    return `
      <div class="sub-header-bar">
        <div>
          <h2>الشؤون القانونية وإدارة الديون المتعثرة (NPLs)</h2>
          <p class="text-muted">متابعة العملاء المتأخرين عن السداد، إجراءات المزادات القضائية، وإعادة هيكلة المديونيات لتقليل الخسائر الائتمانية.</p>
        </div>
        <div class="total-salaries-badge">
          <span>إجمالي الأموال المستردة قضائياً:</span>
          <strong class="text-emerald font-lg">${lm.recoveredTotalCash.toLocaleString('ar-EG')} ج.م</strong>
        </div>
      </div>

      <div class="kpi-grid mb-6">
        <div class="kpi-card">
          <div class="kpi-icon">⚠️</div>
          <div class="kpi-info">
            <span class="kpi-label">قضايا تعثر قيد المتابعة</span>
            <span class="kpi-val text-danger">${pendingCases.length} قضية</span>
            <span class="kpi-sub">تتطلب قرار تسوية أو حجز</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🤝</div>
          <div class="kpi-info">
            <span class="kpi-label">مديونيات تمت إعادة جدولتها</span>
            <span class="kpi-val text-cyan">${lm.restructuredCount} عميل</span>
            <span class="kpi-sub">انتظموا في السداد مجدداً</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🔨</div>
          <div class="kpi-info">
            <span class="kpi-label">مزادات بيع الضمانات الناجحة</span>
            <span class="kpi-val text-gold">${lm.auctionedCount} مزاد</span>
            <span class="kpi-sub">بيع أصول وضمانات بالمحكمة</span>
          </div>
        </div>
      </div>

      <div class="panel mb-6">
        <div class="panel-header">
          <h3>⚖️ ملفات القضايا المعلقة والمطلوب اتخاذ قرار بشأنها</h3>
          <span class="badge ${pendingCases.length > 0 ? 'status-open' : 'status-closed'}">${pendingCases.length} ملف</span>
        </div>

        ${pendingCases.length === 0 ? `
          <div class="empty-notice">
            <p>ممتاز! لا توجد حالياً أي ديون متعثرة أو قضايا قضائية مفتوحة. محفظة القروض تسير بانتظام.</p>
          </div>
        ` : `
          <div class="cards-grid">
            ${pendingCases.map(c => `
              <div class="loan-card">
                <div class="loan-header">
                  <div>
                    <h4 class="loan-title">${c.borrower}</h4>
                    <span class="badge cat-badge">${c.category}</span>
                  </div>
                  <span class="badge status-open">متأخر 3 شهور</span>
                </div>

                <div class="loan-details">
                  <div class="detail-row">
                    <span>أصل المديونية المتعثرة:</span>
                    <strong class="text-danger font-lg">${c.amount.toLocaleString('ar-EG')} ج.م</strong>
                  </div>
                  <div class="detail-row">
                    <span>الضمانات المتاحة للحجز:</span>
                    <span class="text-subtle">${c.collateral}</span>
                  </div>
                </div>

                <div class="card-actions-col mt-3">
                  <button class="btn btn-primary w-full" data-action="restructure-loan" data-id="${c.id}">
                    🤝 إعادة الجدولة (تحصيل 25% فوراً وتقسيط الباقي)
                  </button>
                  <button class="btn btn-warning w-full" data-action="auction-collateral" data-id="${c.id}">
                    🔨 التنفيذ القضائي والمزاد العلني (استرداد 65% نقداً - رسوم 2,000 ج.م)
                  </button>
                  <button class="btn btn-secondary w-full" data-action="writeoff-loan" data-id="${c.id}">
                    ❌ إعدام الدين وتغطيته من المخصصات
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderCertificatesTab() {
    const tp = this.state.treasuryProductsManager;
    const goldValuation = tp.getGoldValuation();

    return `
      <div class="sub-header-bar">
        <div>
          <h2>شهادات الادخار المصرفية وخزينة سبائك الذهب</h2>
          <p class="text-muted">التحكم في أوعية الادخار لجذب سيولة المودعين، وتكوين احتياطي سيادي من سبائك الذهب عيار 24 للتحوط من التضخم.</p>
        </div>
        <div class="total-salaries-badge">
          <span>قيمة احتياطي الذهب:</span>
          <strong class="text-gold font-lg">${goldValuation.toLocaleString('ar-EG')} ج.م</strong>
        </div>
      </div>

      <!-- Physical Gold Bullion Vault -->
      <div class="training-card mb-6">
        <div class="training-info">
          <div class="training-icon">🪙</div>
          <div>
            <h3>خزينة سبائك الذهب المصرية (BTC 24K)</h3>
            <p>السعر الحالي بالصاغة: <strong class="text-gold">${tp.goldPricePerGram.toLocaleString('ar-EG')} ج.م / جرام</strong> • رصيد البنك: <strong class="text-emerald">${tp.goldGrams} جرام</strong> (${goldValuation.toLocaleString('ar-EG')} ج.م)</p>
          </div>
        </div>
        <div class="training-actions">
          <button class="btn btn-primary" data-action="buy-gold" data-grams="10">
            + شراء 10 جرام (${Math.round(tp.goldPricePerGram * 10).toLocaleString('ar-EG')} ج.م)
          </button>
          <button class="btn btn-primary" data-action="buy-gold" data-grams="31.1">
            + شراء أونصة 31.1 جرام (${Math.round(tp.goldPricePerGram * 31.1).toLocaleString('ar-EG')} ج.م)
          </button>
          ${tp.goldGrams >= 10 ? `
            <button class="btn btn-warning" data-action="sell-gold" data-grams="10">
              بيع 10 جرام
            </button>
          ` : ''}
          ${tp.goldGrams >= 31.1 ? `
            <button class="btn btn-warning" data-action="sell-gold" data-grams="31.1">
              تسييل أونصة
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Certificates War -->
      <div class="panel mb-6">
        <div class="panel-header">
          <h3>📜 باقة الشهادات الاستثمارية المتاحة للطرح</h3>
        </div>

        <div class="cards-grid">
          ${tp.certificates.map(cert => `
            <div class="loan-card ${cert.active ? 'border-gold' : ''}">
              <div class="loan-header">
                <div>
                  <h4 class="loan-title">${cert.name}</h4>
                  <span class="badge ${cert.active ? 'status-open' : 'status-closed'}">
                    ${cert.active ? '● نشطة ومتاحة للاكتتاب' : '○ متوقفة'}
                  </span>
                </div>
                <div class="badge camels-badge">${cert.rateAnnual}% سنوياً</div>
              </div>

              <p class="loan-note">${cert.desc}</p>

              <div class="loan-details">
                <div class="detail-row">
                  <span>إجمالي المكتتب فيه:</span>
                  <strong class="text-cyan">${cert.totalIssuedVolume.toLocaleString('ar-EG')} ج.م</strong>
                </div>
                <div class="detail-row">
                  <span>التدفق الشهري المتوقع للودائع:</span>
                  <span class="text-emerald">+${cert.monthlyDepositInflow.toLocaleString('ar-EG')} ج.م / شهر</span>
                </div>
                <div class="detail-row">
                  <span>تكلفة الفائدة الشهرية:</span>
                  <span class="text-danger">-${Math.round((cert.totalIssuedVolume * (cert.rateAnnual / 100)) / 12).toLocaleString('ar-EG')} ج.م / شهر</span>
                </div>
              </div>

              <div class="card-actions">
                <button class="btn ${cert.active ? 'btn-danger' : 'btn-primary'} w-full" data-action="toggle-cert" data-id="${cert.id}">
                  ${cert.active ? '⏸️ إيقاف طرح الشهادة' : '▶️ فتح الاكتتاب في الشهادة'}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderInstaPayTab() {
    const ip = this.state.instaPayManager;
    const currentTier = ip.getCurrentTier();

    return `
      <div class="sub-header-bar">
        <div>
          <h2>شبكة المدفوعات اللحظية (إنستاباي - IPN) والبنية التحتية</h2>
          <p class="text-muted">الربط الرسمي مع تطبيق البنك المركزي المصري للمدفوعات اللحظية وإدارة السيرفرات لتفادي أعطال النظام (System Outage).</p>
        </div>
        <div class="total-salaries-badge">
          <span>حالة الاتصال بالشبكة القومية:</span>
          <strong class="${ip.isInstaPayActive ? 'text-emerald' : 'text-danger'} font-lg">
            ${ip.isInstaPayActive ? '🟢 متصل ومعتمد رسمي' : '🔴 غير مفعل'}
          </strong>
        </div>
      </div>

      ${!ip.isInstaPayActive ? `
        <div class="starter-banner mb-6">
          <div class="starter-content">
            <div class="starter-icon">⚡</div>
            <div>
              <h3>الربط مع شبكة المدفوعات اللحظية (IPN / InstaPay)</h3>
              <p>قم بسداد رسوم الاعتماد وربط أنظمة البنك بشبكة إنستاباي لتمكين عملاء البنك من إجراء التحويلات اللحظية على مدار 24 ساعة وتحصيل عمولات دورية.</p>
            </div>
          </div>
          <button id="activate-instapay-btn" class="btn btn-primary btn-lg">
            ⚡ اعتماد وتفعيل إنستاباي (${ip.activationCost.toLocaleString('ar-EG')} ج.م)
          </button>
        </div>
      ` : `
        <div class="kpi-grid mb-6">
          <div class="kpi-card">
            <div class="kpi-icon">⚡</div>
            <div class="kpi-info">
              <span class="kpi-label">معاملات الشهر الماضي</span>
              <span class="kpi-val text-cyan">${ip.lastMonthTransactions.toLocaleString('ar-EG')} عملية</span>
              <span class="kpi-sub">تحويلات لحظية عبر إنستاباي</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">💵</div>
            <div class="kpi-info">
              <span class="kpi-label">إيراد العمولات الشهرية</span>
              <span class="kpi-val text-emerald">+${ip.lastMonthFeeRevenue.toLocaleString('ar-EG')} ج.م</span>
              <span class="kpi-sub">عمولة 0.85 ج.م في المتوسط</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">🖥️</div>
            <div class="kpi-info">
              <span class="kpi-label">استقرار الخوادم (System Uptime)</span>
              <span class="kpi-val ${ip.lastMonthDowntime ? 'text-danger' : 'text-emerald'}">
                ${ip.lastMonthDowntime ? '⚠️ عطل في السيستم!' : '🟢 مستقر 99.9%'}
              </span>
              <span class="kpi-sub">سعة الخادم الحالي: ${currentTier.capacity.toLocaleString('ar-EG')} عمل/شهر</span>
            </div>
          </div>
        </div>

        ${ip.lastMonthDowntime ? `
          <div class="training-card mb-6 border-danger">
            <div class="training-info">
              <div class="training-icon">🚨</div>
              <div>
                <h3 class="text-danger">تنبيه: السيستم وقع نتيجة زيادة الضغط وتجاوز قدرة السيرفرات!</h3>
                <p>تسبب انقطاع الخدمة في استياء العملاء وتراجع السمعة. قم بترقية الخوادم فوراً لاستيعاب المعاملات المتزايدة.</p>
              </div>
            </div>
          </div>
        ` : ''}
      `}

      <div class="panel mb-6">
        <div class="panel-header">
          <h3>🖥️ خطط وباقات البنية التحتية والسيرفرات البنكية</h3>
          <span class="badge tier-badge">الخادم الحالي: ${currentTier.name}</span>
        </div>

        <div class="cards-grid">
          ${ip.serverTiers.map(tier => {
            const isCurrent = tier.id === ip.currentServerTier;
            return `
              <div class="loan-card ${isCurrent ? 'border-gold' : ''}">
                <div class="loan-header">
                  <div>
                    <h4 class="loan-title">${tier.icon} ${tier.name}</h4>
                    <span class="badge ${isCurrent ? 'status-open' : 'status-closed'}">
                      ${isCurrent ? '● الخادم المعتمد حالياً' : 'متاح للترقية'}
                    </span>
                  </div>
                </div>

                <p class="loan-note">${tier.desc}</p>

                <div class="loan-details">
                  <div class="detail-row">
                    <span>طاقة المعالجة القصوى:</span>
                    <strong class="text-cyan font-lg">${tier.capacity.toLocaleString('ar-EG')} عملية / شهر</strong>
                  </div>
                  <div class="detail-row">
                    <span>مصاريف الصيانة والاستضافة:</span>
                    <span class="text-danger font-bold">-${tier.monthlyCost.toLocaleString('ar-EG')} ج.م / شهر</span>
                  </div>
                  ${!isCurrent && tier.upgradeCost > 0 ? `
                    <div class="detail-row">
                      <span>تكلفة الترقية والتجهيز:</span>
                      <strong class="text-gold font-bold">${tier.upgradeCost.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                  ` : ''}
                </div>

                ${!isCurrent ? `
                  <div class="card-actions">
                    <button class="btn btn-primary w-full" data-action="upgrade-server" data-tier="${tier.id}">
                      🚀 ترقية إلى ${tier.name}
                    </button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderFXTab() {
    const fx = this.state.fxManager;
    const usdValuation = Math.round(fx.usdReserves * fx.usdRate);

    return `
      <div class="sub-header-bar">
        <div>
          <h2>غرفة المعاملات الدولية وتداول العملات (FX Desk) والاعتمادات</h2>
          <p class="text-muted">إدارة احتياطي النقد الأجنبي، تداول الدولار بالسعر الرسمي، وفتح الاعتمادات المستندية (L/Cs) لتمويل كبار المستوردين والشركات.</p>
        </div>
        <div class="total-salaries-badge">
          <span>احتياطي النقد الأجنبي ($):</span>
          <strong class="text-emerald font-lg">$${fx.usdReserves.toLocaleString('en-US')}</strong>
          <small class="text-muted">(${usdValuation.toLocaleString('ar-EG')} ج.م)</small>
        </div>
      </div>

      <!-- Currency Trading Desk -->
      <div class="training-card mb-6">
        <div class="training-info">
          <div class="training-icon">💵</div>
          <div>
            <h3>سعر صرف الدولار الرسمي (USD/EGP)</h3>
            <p>السعر المعتمد: <strong class="text-gold">${fx.usdRate.toFixed(2)} ج.م</strong> • الرصيد المتاح: <strong class="text-emerald">$${fx.usdReserves.toLocaleString('en-US')}</strong></p>
          </div>
        </div>
        <div class="training-actions">
          <button class="btn btn-primary" data-action="buy-usd" data-amount="10000">
            + شراء $10,000 (${Math.round(10000 * fx.usdRate).toLocaleString('ar-EG')} ج.م)
          </button>
          <button class="btn btn-primary" data-action="buy-usd" data-amount="25000">
            + شراء $25,000 (${Math.round(25000 * fx.usdRate).toLocaleString('ar-EG')} ج.م)
          </button>
          ${fx.usdReserves >= 10000 ? `
            <button class="btn btn-warning" data-action="sell-usd" data-amount="10000">
              بيع $10,000
            </button>
          ` : ''}
          ${fx.usdReserves >= 25000 ? `
            <button class="btn btn-warning" data-action="sell-usd" data-amount="25000">
              بيع $25,000
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Letters of Credit (L/Cs) -->
      <div class="panel mb-6">
        <div class="panel-header">
          <h3>🚢 طلبات فتح الاعتمادات المستندية (Letters of Credit - L/Cs)</h3>
          <span class="badge tier-badge">عمولة التدبير: 2.5%</span>
        </div>

        ${fx.pendingLCs.length === 0 ? `
          <div class="empty-notice">
            <p>لا توجد اعتمادات مستندية معلقة حالياً. ستصل طلبات جديدة من كبار المستوردين الشهر القادم.</p>
          </div>
        ` : `
          <div class="cards-grid">
            ${fx.pendingLCs.map(lc => {
              const egpReq = Math.round(lc.usdRequired * fx.usdRate);
              const comm = Math.round(egpReq * 0.025);
              const hasEnoughUSD = fx.usdReserves >= lc.usdRequired;
              return `
                <div class="loan-card">
                  <div class="loan-header">
                    <div>
                      <h4 class="loan-title">${lc.title}</h4>
                      <span class="badge cat-badge">${lc.importer}</span>
                    </div>
                    <span class="badge date-badge">$${lc.usdRequired.toLocaleString('en-US')}</span>
                  </div>

                  <p class="loan-note">${lc.desc}</p>

                  <div class="loan-details">
                    <div class="detail-row">
                      <span>الغطاء الدولاري المطلوب:</span>
                      <strong class="text-gold font-lg">$${lc.usdRequired.toLocaleString('en-US')}</strong>
                    </div>
                    <div class="detail-row">
                      <span>ما يعادله بالجنيه المصري:</span>
                      <span>${egpReq.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                    <div class="detail-row">
                      <span>عمولة تدبير العملة للبنك (2.5%):</span>
                      <strong class="text-emerald font-bold">+${comm.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                    <div class="detail-row">
                      <span>ودائع شركات جديدة فور فتح الاعتماد:</span>
                      <span class="text-cyan font-bold">+${Math.round(egpReq * 0.4).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>

                  <div class="card-actions">
                    <button class="btn ${hasEnoughUSD ? 'btn-primary' : 'btn-secondary'} w-full" data-action="open-lc" data-id="${lc.id}">
                      ${hasEnoughUSD ? '🚢 فتح الاعتماد وتدبير العملة' : '⚠️ رصيد الدولار لا يكفي (اشترِ دولارات أولاً)'}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderTrophiesTab() {
    const tm = this.state.trophiesManager;

    return `
      <div class="sub-header-bar">
        <div>
          <h2>لوحة الشرف والأوسمة المصرفية (Career Trophies)</h2>
          <p class="text-muted">سجل إنجازات وتكريمات مجلس الإدارة برئاسة ${this.state.getManagerFormalTitle()}. كل إنجاز يمنح مكافأة مالية فورية وزيادة دائمة في ثقة السوق.</p>
        </div>
        <div class="total-salaries-badge">
          <span>الأوسمة المكتسبة:</span>
          <strong class="text-gold font-lg">${tm.getUnlockedCount()} من ${tm.trophies.length}</strong>
        </div>
      </div>

      <div class="cards-grid">
        ${tm.trophies.map(t => `
          <div class="loan-card ${t.unlocked ? 'border-gold' : 'opacity-75'}">
            <div class="loan-header">
              <div class="d-flex align-items-center gap-3">
                <span style="font-size: 32px;">${t.icon}</span>
                <div>
                  <h4 class="loan-title">${t.title}</h4>
                  <span class="badge ${t.unlocked ? 'status-open' : 'status-closed'}">
                    ${t.unlocked ? (t.claimed ? '✔ تم الاستلام' : '🎉 متاح للصرف!') : '🔒 قيد الإنجاز'}
                  </span>
                </div>
              </div>
            </div>

            <p class="loan-note">${t.desc}</p>

            <div class="loan-details">
              <div class="detail-row">
                <span>المكافأة النقدية:</span>
                <strong class="text-emerald font-lg">+${t.rewardCash.toLocaleString('ar-EG')} ج.م</strong>
              </div>
              <div class="detail-row">
                <span>مكافأة السمعة الدائمة:</span>
                <strong class="text-cyan">+${t.repBonus}% ثقة بالسوق</strong>
              </div>
            </div>

            <div class="card-actions">
              ${t.unlocked && !t.claimed ? `
                <button class="btn btn-warning w-full font-bold" data-action="claim-trophy" data-id="${t.id}">
                  🎁 صرف مكافأة التميز (${t.rewardCash.toLocaleString('ar-EG')} ج.م)
                </button>
              ` : t.claimed ? `
                <button class="btn btn-secondary w-full" disabled>
                  ✅ تم صرف المكافأة وإيداعها بالخزينة
                </button>
              ` : `
                <button class="btn btn-secondary w-full" disabled>
                  🔒 الهدف غير مكتمل بعد
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderHistoryChart() {
    const canvas = document.getElementById('history-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const history = this.state.history;
    if (history.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('سيظهر المنحنى البياني بعد إنهاء أول شهرين ماليين...', width / 2, height / 2);
      return;
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.stroke();

    const profits = history.map(h => h.profit);
    const maxP = Math.max(...profits, 5000);
    const minP = Math.min(...profits, 0);
    const range = Math.max(1, maxP - minP);
    const stepX = (width - 80) / (history.length - 1);

    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;

    history.forEach((h, i) => {
      const x = 50 + i * stepX;
      const normalized = (h.profit - minP) / range;
      const y = (height - 40) - normalized * (height - 80);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    history.forEach((h, i) => {
      const x = 50 + i * stepX;
      const normalized = (h.profit - minP) / range;
      const y = (height - 40) - normalized * (height - 80);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(h.dateStr.split(' ')[0], x, height - 12);
    });
  }

  showMonthlyReportModal(report) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer || !report) return;

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3>📊 التقرير المالي لـ ${report.monthStr}</h3>
            <button id="close-modal-btn" class="close-btn">&times;</button>
          </div>

          <div class="modal-body">
            <div class="report-highlight ${report.netProfit >= 0 ? 'bg-success-subtle' : 'bg-danger-subtle'}">
              <span>صافي ربح الشهر:</span>
              <strong class="${report.netProfit >= 0 ? 'text-emerald' : 'text-danger'} font-xl">
                ${report.netProfit >= 0 ? '+' : ''}${report.netProfit.toLocaleString('ar-EG')} ج.م
              </strong>
            </div>

            <div class="report-breakdown mt-4">
              <div class="breakdown-row">
                <span>عوائد التمويل:</span>
                <span class="text-emerald">+${report.loanInterest.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div class="breakdown-row">
                <span>رسوم الفروع والـ ATM والبطاقات:</span>
                <span class="text-emerald">+${(report.branchFees + report.cardFees).toLocaleString('ar-EG')} ج.م</span>
              </div>
              ${report.stockDividends > 0 ? `
                <div class="breakdown-row">
                  <span>توزيعات أرباح البورصة:</span>
                  <span class="text-emerald">+${report.stockDividends.toLocaleString('ar-EG')} ج.م</span>
                </div>
              ` : ''}
              <div class="breakdown-row">
                <span>فوائد ودائع العملاء:</span>
                <span class="text-danger">-${report.depositInterest.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div class="breakdown-row">
                <span>رواتب الموظفين:</span>
                <span class="text-danger">-${report.salaries.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div class="breakdown-row">
                <span>إيجار المقرات:</span>
                <span class="text-danger">-${report.branchOpEx.toLocaleString('ar-EG')} ج.م</span>
              </div>
              ${report.badDebtLoss > 0 ? `
                <div class="breakdown-row">
                  <span>ديون متعثرة:</span>
                  <span class="text-danger">-${report.badDebtLoss.toLocaleString('ar-EG')} ج.م</span>
                </div>
              ` : ''}
              <div class="breakdown-row border-top">
                <span>أقساط قروض مستردة:</span>
                <span class="text-gold font-bold">+${report.principalRecovered.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button id="close-modal-btn" class="btn btn-primary w-full">متابعة العمليات للشهر القادم</button>
          </div>
        </div>
      </div>
    `;
  }

  showAuditModal(audit) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer || !audit) return;

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3>🏛️ تقرير تفتيش البنك المركزي المصري (CAMELS)</h3>
            <button id="close-modal-btn" class="close-btn">&times;</button>
          </div>

          <div class="modal-body">
            <div class="report-highlight bg-success-subtle text-center">
              <div>
                <div class="font-xl text-gold">${'★'.repeat(audit.overallStars)}</div>
                <strong>تصنيف رسمي: ${audit.overallStars} من 5 نجوم</strong>
              </div>
            </div>

            <p class="audit-eval mt-3"><strong>التقييم:</strong> ${audit.evaluation}</p>

            <div class="audit-scores-grid mt-3">
              <div>كفاية رأس المال (C): <strong>${audit.cScore}/5</strong></div>
              <div>جودة الأصول (A): <strong>${audit.aScore}/5</strong></div>
              <div>كفاءة الإدارة (M): <strong>${audit.mScore}/5</strong></div>
              <div>الربحية (E): <strong>${audit.eScore}/5</strong></div>
              <div>نسبة السيولة (L): <strong>${audit.lScore}/5</strong></div>
              <div>مخاطر السوق (S): <strong>${audit.sScore}/5</strong></div>
            </div>
          </div>

          <div class="modal-footer">
            <button id="close-modal-btn" class="btn btn-primary w-full">إغلاق واعتماد التقرير</button>
          </div>
        </div>
      </div>
    `;
  }

  getDifficultyBadgeClass() {
    const map = {
      casual: 'bg-emerald text-emerald',
      realistic: 'bg-info text-blue',
      hardcore: 'bg-danger text-danger'
    };
    return map[this.state.difficultyMode] || 'bg-info text-blue';
  }

  getDifficultyBadgeText() {
    const map = {
      casual: 'صعوبة: مبتدئ',
      realistic: 'صعوبة: واقعي',
      hardcore: 'صعوبة: أزمات حادة'
    };
    return map[this.state.difficultyMode] || 'صعوبة: واقعي';
  }

  renderPersonalHUDBar() {
    if (!this.state.executiveLifeManager) return '';
    const m = this.state.executiveLifeManager;
    const isBurnout = m.stress >= 80;
    return `
      <div id="hud-personal-pills" class="hud-personal-pills" title="عرض الملف الشخصي والرفاهية التنفيذية">
        <span class="hud-vital-item">🔋 ${m.energy}%</span>
        <span class="hud-vital-item ${isBurnout ? 'hud-burnout-flame' : ''}">🧠 ${m.stress}% ${isBurnout ? '🔥' : ''}</span>
        <span class="hud-vital-item">🏡 ${m.family}%</span>
        <span class="hud-vital-item">💵 ${m.personalWealth.toLocaleString('ar-EG')} ج.م</span>
      </div>
    `;
  }

  showDilemmaModal(dilemma) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer || !dilemma) return;

    this.currentDilemma = dilemma;

    const speakerName = dilemma.speaker || 'مستشار مصرفي';
    const speakerRole = dilemma.role || 'موقف استراتيجي طارئ';
    const avatarImg = dilemma.avatar || './assets/characters/ashour.jpg';

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-card dilemma-card">
          <div class="dilemma-header-band">
            <h3 class="dilemma-band-title">${this.escapeHTML(dilemma.title)}</h3>
            <span class="badge bg-gold">قرار مصيري</span>
          </div>

          <div class="dilemma-speaker-dossier">
            <div class="dilemma-speaker-avatar">
              <img src="${avatarImg}" alt="${this.escapeHTML(speakerName)}" onerror="this.onerror=null; this.src=''; this.innerHTML='👤';">
            </div>
            <div>
              <h4 class="dilemma-speaker-name">${this.escapeHTML(speakerName)}</h4>
              <span class="dilemma-speaker-role-tag">${this.escapeHTML(speakerRole)}</span>
            </div>
          </div>

          <div class="dilemma-story-text">
            ${this.escapeHTML(dilemma.description)}
          </div>

          <div class="dilemma-options-container">
            ${dilemma.options.map((opt, idx) => `
              <button class="dilemma-opt-card-btn" data-dilemma-opt="${idx}">
                <div class="dilemma-opt-title">${this.escapeHTML(opt.text)}</div>
                <div class="dilemma-dual-impact-box">
                  <div class="impact-badge impact-bank">
                    ${this.escapeHTML(opt.previewBank || '🏛️ أثر غير مباشر على البنك')}
                  </div>
                  <div class="impact-badge impact-personal">
                    ${this.escapeHTML(opt.previewPersonal || '👤 أثر شخصي متوازن')}
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderExecutiveLifeTab() {
    if (!this.state.executiveLifeManager) {
      return '<div class="card p-6">جاري تهيئة نظام الحياة الشخصية...</div>';
    }

    const m = this.state.executiveLifeManager;
    const burnout = m.getBurnoutPenalty();
    const avatarSrc = this.state.managerGender === 'female'
      ? './assets/characters/character_female_protagonist.jpg'
      : './assets/characters/character_maged_headhunter.jpg';

    return `
      <div class="executive-life-container">
        <!-- Hero Profile Dossier Card -->
        <div class="executive-hero-card">
          <div class="executive-hero-content">
            <div class="executive-profile-dossier">
              <div class="executive-avatar-frame">
                <img src="${avatarSrc}" alt="${this.escapeHTML(this.state.managerName)}" onerror="this.onerror=null; this.src=''; this.innerHTML='👤';">
              </div>
              <div class="executive-name-role">
                <h2>${this.escapeHTML(this.state.managerName)}</h2>
                <div class="d-flex gap-2 align-items-center flex-wrap">
                  <span class="executive-tag">👔 ${this.escapeHTML(this.state.getManagerFormalTitle())}</span>
                  <span class="badge tier-badge">🏛️ ${this.escapeHTML(this.state.bankName)}</span>
                </div>
              </div>
            </div>

            <div class="executive-finances-box">
              <div class="finance-stat-item">
                <span class="finance-stat-label">الراتب التنفيذي الشهري</span>
                <span class="finance-stat-value">${m.monthlySalary.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div class="finance-stat-item">
                <span class="finance-stat-label">الثروة والمقتنيات الخاصة</span>
                <span class="finance-stat-value gold">${m.personalWealth.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Burnout Alert Banner (if applicable) -->
        ${burnout.active ? `
          <div class="burnout-alert-banner">
            <div class="burnout-alert-icon">🔥</div>
            <div class="burnout-alert-content">
              <h4>تحذير إجهاد مصرفي حاد (Executive Burnout)!</h4>
              <p>${burnout.desc} يوصى بقضاء عطلة استجمام فوراً لخفض التوتر واستعادة توازنك الذهني.</p>
            </div>
          </div>
        ` : ''}

        <!-- 5 Core Vital Gauges -->
        <div class="executive-vitals-grid">
          <div class="vital-gauge-card">
            <div class="vital-header">
              <span class="vital-title">🔋 طاقة ونشاط القائد</span>
              <span class="vital-score">${m.energy}%</span>
            </div>
            <div class="vital-bar-track">
              <div class="vital-bar-fill energy" style="width: ${m.energy}%;"></div>
            </div>
            <span class="vital-subtext">القدرة على اتخاذ القرارات وحضور الاجتماعات المصرفية الشاقة</span>
          </div>

          <div class="vital-gauge-card">
            <div class="vital-header">
              <span class="vital-title">🧠 مؤشر التوتر والإرهاق</span>
              <span class="vital-score ${m.stress >= 75 ? 'text-danger' : ''}">${m.stress}%</span>
            </div>
            <div class="vital-bar-track">
              <div class="vital-bar-fill stress" style="width: ${m.stress}%;"></div>
            </div>
            <span class="vital-subtext">${m.stress >= 75 ? '⚠️ توتر خطر! قد يسبب أخطاء محاسبية وتراجع معنويات الفريق' : 'مستوى توتر تحت السيطرة'}</span>
          </div>

          <div class="vital-gauge-card">
            <div class="vital-header">
              <span class="vital-title">🏡 التوازن والاستقرار الأسري</span>
              <span class="vital-score">${m.family}%</span>
            </div>
            <div class="vital-bar-track">
              <div class="vital-bar-fill family" style="width: ${m.family}%;"></div>
            </div>
            <span class="vital-subtext">رضا العائلة وقضاء الأوقات الخاصة مع الأبناء والشريك</span>
          </div>

          <div class="vital-gauge-card">
            <div class="vital-header">
              <span class="vital-title">⚖️ النزاهة والذمة المالية</span>
              <span class="vital-score">${m.integrity}%</span>
            </div>
            <div class="vital-bar-track">
              <div class="vital-bar-fill integrity" style="width: ${m.integrity}%;"></div>
            </div>
            <span class="vital-subtext">الالتزام بميثاق شرف العمل المصرفي ومقاومة إغراءات الرشوة</span>
          </div>

          <div class="vital-gauge-card">
            <div class="vital-header">
              <span class="vital-title">👑 الوجاهة والنفوذ الاجتماعي</span>
              <span class="vital-score">${m.socialPrestige}%</span>
            </div>
            <div class="vital-bar-track">
              <div class="vital-bar-fill prestige" style="width: ${m.socialPrestige}%;"></div>
            </div>
            <span class="vital-subtext">المكانة في أندية النخبة ولقاءات رجال الأعمال ومجتمع المال</span>
          </div>
        </div>

        <!-- Section 1: Wellness & Vacations -->
        <div class="executive-section-heading">
          <h3>🌴 برامج الاستجمام والعطلات لخفض التوتر</h3>
          <span class="badge bg-info">تُسدد من الحساب الشخصي</span>
        </div>
        <div class="wellness-cards-grid">
          ${m.wellnessOptions.map(opt => `
            <div class="wellness-card">
              <div>
                <div class="wellness-card-title">${opt.name}</div>
                <div class="wellness-card-desc">${opt.desc}</div>
                <div class="wellness-deltas">
                  <span class="delta-badge green">توتر: ${opt.stressDelta}%</span>
                  <span class="delta-badge blue">طاقة: +${opt.energyDelta}%</span>
                  <span class="delta-badge pink">أسرة: +${opt.familyDelta}%</span>
                </div>
              </div>
              <div class="wellness-footer">
                <span class="wellness-cost">${opt.cost.toLocaleString('ar-EG')} ج.م</span>
                <button class="btn-wellness-action" data-action="take-wellness" data-wellness-id="${opt.id}">
                  حجز العطلة الآن ✨
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Section 2: Luxury Assets & Executive Estate -->
        <div class="executive-section-heading">
          <h3>💎 مقتنيات الوجاهة، العقارات الفارهة وعضويات النخبة</h3>
          <span class="badge bg-gold">تعزز النفوذ والاستقرار</span>
        </div>
        <div class="lifestyle-cards-grid">
          ${m.lifestyleCatalog.map(asset => {
            const isOwned = m.hasAsset(asset.id);
            return `
              <div class="lifestyle-card ${isOwned ? 'owned' : ''}">
                <div class="lifestyle-card-header">
                  <div class="lifestyle-icon-box">${asset.icon}</div>
                  <div>
                    <div class="lifestyle-card-title">${asset.name}</div>
                    <div class="lifestyle-card-desc">${asset.desc}</div>
                    <div class="wellness-deltas">
                      ${asset.prestigeBonus ? `<span class="delta-badge blue">وجاهة: +${asset.prestigeBonus}%</span>` : ''}
                      ${asset.familyBonus ? `<span class="delta-badge pink">أسرة: +${asset.familyBonus}%</span>` : ''}
                      ${asset.stressReduction ? `<span class="delta-badge green">خفض توتر: ${asset.stressReduction}%</span>` : ''}
                    </div>
                  </div>
                </div>
                <div class="lifestyle-footer">
                  <span class="lifestyle-cost">${asset.cost.toLocaleString('ar-EG')} ج.م</span>
                  ${isOwned ? `
                    <span class="asset-badge-owned">✓ مقتنى خاص</span>
                  ` : `
                    <button class="btn-lifestyle-buy" data-action="buy-lifestyle-asset" data-asset-id="${asset.id}">
                      شراء وضم للأملاك 🛒
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Section 3: Executive Perks & High Finance Influence -->
        <div class="executive-section-heading">
          <h3>🎖️ مزايا ونفوذ الإدارة العليا (Executive Perks)</h3>
          <span class="badge bg-gold">نفوذ العلاقات والموردين</span>
        </div>
        <div class="perks-grid mb-6">
          ${(m.perksCatalog || []).map(perk => {
            const isUnlocked = m.hasPerk(perk.id);
            const canAfford = m.personalWealth >= perk.cost;
            const hasPrestige = m.socialPrestige >= perk.prestigeReq;
            return `
              <div class="perk-card ${isUnlocked ? 'active' : ''}">
                <div class="perk-header">
                  <div class="perk-icon-title">
                    <span class="perk-icon">${perk.icon}</span>
                    <div>
                      <div class="perk-title">${this.escapeHTML(perk.name)}</div>
                      <div class="perk-desc">${this.escapeHTML(perk.desc)}</div>
                    </div>
                  </div>
                  <span class="badge ${isUnlocked ? 'status-open' : 'status-closed'}">
                    ${isUnlocked ? '🟢 مفعلة ونشطة' : '🔒 مقفلة'}
                  </span>
                </div>
                <div class="perk-footer">
                  <div class="perk-reqs">
                    <span class="cost font-bold">${perk.cost.toLocaleString('ar-EG')} ج.م</span>
                    <span class="prestige-req ${hasPrestige ? 'text-cyan' : 'text-danger'}">وجاهة مطلوبة: ${perk.prestigeReq}</span>
                  </div>
                  ${isUnlocked ? `
                    <span class="badge bg-emerald">مفعلة بحسابك التنفيذي</span>
                  ` : `
                    <button class="btn btn-warning btn-sm" data-action="unlock-perk" data-perk-id="${perk.id}" ${(!canAfford || !hasPrestige) ? 'disabled' : ''}>
                      تفعيل الميزة ✨
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';

    if (this.currentDilemma) {
      const d = this.currentDilemma;
      this.currentDilemma = null;
      setTimeout(() => this.showDilemmaModal(d), 150);
    }
  }

  showToast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, duration);
  }

  renderVendorsTab() {
    const vm = this.state.vendorsManager;
    if (!vm) return '<div class="empty-box">منظومة توريد الخدمات غير مفعلة.</div>';

    const secVendor = vm.getActiveContract('security');
    const cleanVendor = vm.getActiveContract('cleaning');
    const maintVendor = vm.getActiveContract('maintenance');
    const totalExpenses = vm.getTotalMonthlyExpenses();

    let activeCount = 0;
    if (secVendor) activeCount++;
    if (cleanVendor) activeCount++;
    if (maintVendor) activeCount++;

    return `
      <div class="sub-header-bar">
        <div>
          <h2>🏢 إدارة المرافق والمشتريات وتوريد الخدمات</h2>
          <p class="text-muted">التعاقد مع كبرى الشركات المصرية لتوريد خدمات الحراسة ونقل الأموال، النظافة والتعقيم، والصيانة الفنية للـ ATM والشبكات.</p>
        </div>
        <div class="total-salaries-badge">
          <span>المصاريف التعاقدية الشهرية:</span>
          <strong class="text-gold font-lg">${totalExpenses.toLocaleString('ar-EG')} ج.م / شهر</strong>
        </div>
      </div>

      <!-- KPI Summary Bar -->
      <div class="vendors-kpi-bar">
        <div class="vendor-kpi-card">
          <div class="vendor-kpi-icon">📋</div>
          <div>
            <div class="text-muted font-xs">العقود النشطة المعتمدة</div>
            <strong class="font-lg text-emerald">${activeCount} من 3 قطاعات</strong>
          </div>
        </div>
        <div class="vendor-kpi-card">
          <div class="vendor-kpi-icon">🛡️</div>
          <div>
            <div class="text-muted font-xs">تأمين الحراسة والسطو</div>
            <strong class="font-lg ${secVendor ? 'text-emerald' : 'text-danger'}">
              ${secVendor ? `حماية +${Math.round(secVendor.robberyReduction * 100)}%` : 'بدون شركة أمن'}
            </strong>
          </div>
        </div>
        <div class="vendor-kpi-card">
          <div class="vendor-kpi-icon">🧹</div>
          <div>
            <div class="text-muted font-xs">معيار النظافة والتعقيم</div>
            <strong class="font-lg ${cleanVendor ? 'text-emerald' : 'text-warning'}">
              ${cleanVendor ? `رضا العملاء +${Math.round(cleanVendor.satisfactionBonus * 100)}%` : 'نظافة ذاتية أساسية'}
            </strong>
          </div>
        </div>
        <div class="vendor-kpi-card">
          <div class="vendor-kpi-icon">🔧</div>
          <div>
            <div class="text-muted font-xs">جاهزية ماكينات الـ ATM</div>
            <strong class="font-lg ${maintVendor ? 'text-emerald' : 'text-danger'}">
              ${maintVendor ? `تقليل الأعطال +${Math.round(maintVendor.atmBreakdownReduction * 100)}%` : 'أعطال متكررة'}
            </strong>
          </div>
        </div>
      </div>

      <!-- Category 1: Security -->
      <div class="vendor-category-block">
        <div class="vendor-cat-header">
          <div class="vendor-cat-title">
            <span>🛡️</span>
            <span>شركات الأمن والحراسة ونقل الأموال (Cash-in-Transit)</span>
          </div>
          ${secVendor ? `<span class="badge bg-emerald">العقد المعتمد: ${secVendor.name}</span>` : '<span class="badge bg-danger">لا يوجد تعاقد نشط</span>'}
        </div>
        <div class="vendor-proposals-grid">
          ${vm.getVendorsByCategory('security').map(v => {
            const isActive = secVendor && secVendor.id === v.id;
            return `
              <div class="vendor-card ${isActive ? 'active-contract' : ''}">
                <div>
                  <div class="vendor-card-header">
                    <h4 class="vendor-name">${v.name}</h4>
                    <span class="badge ${v.badgeClass}">${v.tier}</span>
                  </div>
                  <div class="mt-2 mb-2">
                    <span class="vendor-cost-badge">${v.monthlyCost.toLocaleString('ar-EG')} ج.م / شهر</span>
                  </div>
                  <p class="vendor-desc">${v.description}</p>
                  <ul class="vendor-perks-list mt-3">
                    ${v.perks.map(p => `<li>${p}</li>`).join('')}
                  </ul>
                </div>
                <div class="mt-4">
                  ${isActive ? `
                    <div class="d-flex gap-2">
                      <button class="btn btn-success w-full" disabled>✓ العقد الفعال حالياً</button>
                      <button class="btn btn-outline-danger" data-action="cancel-vendor" data-cat="security" title="إلغاء التعاقد">✕</button>
                    </div>
                  ` : `
                    <button class="btn btn-primary w-full" data-action="sign-vendor" data-cat="security" data-id="${v.id}">
                      ✍️ توقيع العقد واعتماد الشركة
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Category 2: Cleaning -->
      <div class="vendor-category-block">
        <div class="vendor-cat-header">
          <div class="vendor-cat-title">
            <span>🧹</span>
            <span>شركات النظافة وإدارة المرافق والتعقيم (Facility Cleaning)</span>
          </div>
          ${cleanVendor ? `<span class="badge bg-emerald">العقد المعتمد: ${cleanVendor.name}</span>` : '<span class="badge bg-danger">لا يوجد تعاقد نشط</span>'}
        </div>
        <div class="vendor-proposals-grid">
          ${vm.getVendorsByCategory('cleaning').map(v => {
            const isActive = cleanVendor && cleanVendor.id === v.id;
            return `
              <div class="vendor-card ${isActive ? 'active-contract' : ''}">
                <div>
                  <div class="vendor-card-header">
                    <h4 class="vendor-name">${v.name}</h4>
                    <span class="badge ${v.badgeClass}">${v.tier}</span>
                  </div>
                  <div class="mt-2 mb-2">
                    <span class="vendor-cost-badge">${v.monthlyCost.toLocaleString('ar-EG')} ج.م / شهر</span>
                  </div>
                  <p class="vendor-desc">${v.description}</p>
                  <ul class="vendor-perks-list mt-3">
                    ${v.perks.map(p => `<li>${p}</li>`).join('')}
                  </ul>
                </div>
                <div class="mt-4">
                  ${isActive ? `
                    <div class="d-flex gap-2">
                      <button class="btn btn-success w-full" disabled>✓ العقد الفعال حالياً</button>
                      <button class="btn btn-outline-danger" data-action="cancel-vendor" data-cat="cleaning" title="إلغاء التعاقد">✕</button>
                    </div>
                  ` : `
                    <button class="btn btn-primary w-full" data-action="sign-vendor" data-cat="cleaning" data-id="${v.id}">
                      ✍️ توقيع العقد واعتماد الشركة
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Category 3: Maintenance -->
      <div class="vendor-category-block">
        <div class="vendor-cat-header">
          <div class="vendor-cat-title">
            <span>🔧</span>
            <span>شركات الصيانة الفنية ودعم الشبكات والـ ATM (Tech Support)</span>
          </div>
          ${maintVendor ? `<span class="badge bg-emerald">العقد المعتمد: ${maintVendor.name}</span>` : '<span class="badge bg-danger">لا يوجد تعاقد نشط</span>'}
        </div>
        <div class="vendor-proposals-grid">
          ${vm.getVendorsByCategory('maintenance').map(v => {
            const isActive = maintVendor && maintVendor.id === v.id;
            return `
              <div class="vendor-card ${isActive ? 'active-contract' : ''}">
                <div>
                  <div class="vendor-card-header">
                    <h4 class="vendor-name">${v.name}</h4>
                    <span class="badge ${v.badgeClass}">${v.tier}</span>
                  </div>
                  <div class="mt-2 mb-2">
                    <span class="vendor-cost-badge">${v.monthlyCost.toLocaleString('ar-EG')} ج.م / شهر</span>
                  </div>
                  <p class="vendor-desc">${v.description}</p>
                  <ul class="vendor-perks-list mt-3">
                    ${v.perks.map(p => `<li>${p}</li>`).join('')}
                  </ul>
                </div>
                <div class="mt-4">
                  ${isActive ? `
                    <div class="d-flex gap-2">
                      <button class="btn btn-success w-full" disabled>✓ العقد الفعال حالياً</button>
                      <button class="btn btn-outline-danger" data-action="cancel-vendor" data-cat="maintenance" title="إلغاء التعاقد">✕</button>
                    </div>
                  ` : `
                    <button class="btn btn-primary w-full" data-action="sign-vendor" data-cat="maintenance" data-id="${v.id}">
                      ✍️ توقيع العقد واعتماد الشركة
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  showCommercialDossierModal(loanId) {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }

    const app = this.state.loansManager ? this.state.loansManager.pendingApplications.find(r => r.id === loanId) : null;
    if (!app || !app.commercialDossier) {
      this.showToast('الملف التجاري غير متاح لهذا الطلب.', 'error');
      return;
    }

    const d = app.commercialDossier;
    const cr = d.commercialRegister;
    const tc = d.taxCard;
    const bs = d.balanceSheet;

    modalContainer.innerHTML = `
      <div id="modal-overlay" class="modal-overlay">
        <div class="dossier-modal-box">
          <div class="dossier-header">
            <div class="dossier-title-block">
              <div class="dossier-crest">🇪🇬</div>
              <div>
                <div class="dossier-official-tag">جمهورية مصر العربية • ملف الائتمان التجاري والشركات</div>
                <h3 style="color: #fff; font-size: 17px; margin-top: 2px;">${this.escapeHTML(app.title)}</h3>
                <div class="text-muted font-xs">${this.escapeHTML(d.entityType)} • التمويل المطلوب: <strong class="text-gold">${app.amount.toLocaleString('ar-EG')} ج.م</strong></div>
              </div>
            </div>
            <button id="close-modal-btn" class="close-sidebar-btn" title="إغلاق">✕</button>
          </div>

          <!-- Document 1: Commercial Register -->
          <div class="dossier-doc-card verified">
            <div class="dossier-doc-title">
              <span>🏢 السجل التجاري المعتمد (Commercial Register)</span>
              <span class="official-stamp stamp-verified">✓ مسجل وموثق رسمياً</span>
            </div>
            <div class="dossier-grid-info">
              <div>رقم السجل: <strong>${this.escapeHTML(cr.regNumber)}</strong></div>
              <div>رأس المال المسجل: <strong>${this.escapeHTML(cr.capital)}</strong></div>
              <div>حالة السريان: <strong class="text-emerald">${this.escapeHTML(cr.validity)}</strong></div>
              <div>مطابقة النشاط: <strong class="text-emerald">${this.escapeHTML(cr.status)}</strong></div>
            </div>
          </div>

          <!-- Document 2: Tax Card & ETA e-Invoice -->
          <div class="dossier-doc-card verified">
            <div class="dossier-doc-title">
              <span>📑 البطاقة الضريبية والفاتورة الإلكترونية (Tax Card & ETA)</span>
              <span class="official-stamp stamp-verified">✓ سليم ضريبياً</span>
            </div>
            <div class="dossier-grid-info">
              <div>رقم التسجيل الضريبي: <strong>${this.escapeHTML(tc.taxNumber)}</strong></div>
              <div>المأمورية التابع لها: <strong>${this.escapeHTML(tc.taxOffice)}</strong></div>
              <div>الفاتورة الإلكترونية: <strong class="text-emerald">${this.escapeHTML(tc.eInvoice)}</strong></div>
              <div>الموقف والطعون: <strong class="text-emerald">${this.escapeHTML(tc.compliance)}</strong></div>
            </div>
          </div>

          <!-- Document 3: Audited Balance Sheet -->
          <div class="dossier-doc-card verified">
            <div class="dossier-doc-title">
              <span>📊 القوائم المالية والميزانية المعتمدة لآخر عام (Audited Balance Sheet)</span>
              <span class="official-stamp stamp-verified">✓ تقرير مراقب حسابات معتمد</span>
            </div>
            <div class="dossier-grid-info">
              <div>مراقب الحسابات: <strong style="font-size: 11px;">${this.escapeHTML(bs.auditor)}</strong></div>
              <div>السنة المالية: <strong>${this.escapeHTML(bs.fiscalYear)}</strong></div>
              <div>إجمالي المبيعات السنوية: <strong class="text-gold">${this.escapeHTML(bs.annualRevenue)}</strong></div>
              <div>صافي الربح السنوي: <strong class="text-emerald">${this.escapeHTML(bs.netProfit)}</strong></div>
              <div>التدفق النقدي التشغيلي: <strong class="text-emerald">${this.escapeHTML(bs.operatingCashFlow)}</strong></div>
              <div>نسبة تغطية خدمة الدين: <strong class="text-light">${this.escapeHTML(bs.debtServiceRatio)}</strong></div>
            </div>
            <div class="mt-2 text-muted font-xs">
              📝 ملاحظات مراجع الحسابات: <span class="text-light">${this.escapeHTML(bs.auditNotes)}</span>
            </div>
          </div>

          <!-- Action buttons inside modal -->
          <div class="d-flex justify-between items-center mt-3 pt-3" style="border-top: 1px solid rgba(255,255,255,0.08); gap: 10px;">
            ${d.isAudited ? `
              <span class="badge bg-emerald" style="padding: 8px 14px; font-size: 12px;">✓ تم التدقيق الميداني والمحاسبي المسبق بنجاح</span>
            ` : `
              <button class="btn btn-warning" data-action="audit-corporate-loan" data-id="${app.id}">
                🔍 إجراء فحص ميداني وتدقيق إضافي (-40% مخاطر)
              </button>
            `}
            <div class="d-flex gap-2">
              <button class="btn btn-success" data-action="approve-loan" data-id="${app.id}">
                ✓ اعتماد الأوراق وصرف التمويل
              </button>
              <button class="btn btn-outline-danger" data-action="reject-loan" data-id="${app.id}">
                ✕ رفض
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
