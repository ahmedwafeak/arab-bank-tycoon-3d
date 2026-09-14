/**
 * LicensesManager - Central Bank of Egypt (CBE) Licensing Tiers & Director Career XP Engine
 * Controls progressive unlocking of banking departments (Tier 1 -> Tier 5)
 * and tracks Director Career Experience (XP) & Levels.
 */
export class LicensesManager {
  constructor(gameState) {
    this.state = gameState;

    // Current License Tier (1 to 5)
    this.currentTier = 1;

    // Director Career Level & Experience
    this.xp = 0;
    this.level = 1;

    // License Tiers Catalog
    this.tiersCatalog = [
      {
        tier: 1,
        name: 'مؤسسة تمويل أهلي وتأسيسي (Microfinance)',
        shortName: 'مكتب تأسيسي',
        badgeClass: 'tier-bronze',
        icon: '🥉',
        desc: 'رخصة مؤقتة لإطلاق أعمال الصرافة المحلية وتوفير التمويل متناهي الصغر لأصحاب الحرف وتجار الحي.',
        tabs: ['dashboard', 'loans', 'reports', 'executive_life'],
        requirements: {
          deposits: 0,
          treasuryCash: 0,
          camelsStars: 0,
          reputation: 0,
          completedLoans: 0
        },
        unlockedFeatures: [
          'لوحة المؤشرات المركزية ومراقبة الخزينة',
          'التمويل الشخصي ومتناهي الصغر للأنشطة المحلية',
          'المركز المالي وكشوف الميزانية العامة',
          'المكتب التنفيذي والرفاهية الخاصة لرئيس مجلس الإدارة'
        ]
      },
      {
        tier: 2,
        name: 'رخصة بنك تجاري وتجزئة (Retail Commercial Bank)',
        shortName: 'بنك تجاري تجزئة',
        badgeClass: 'tier-silver',
        icon: '🥈',
        desc: 'رخصة مصرفية معتمدة لافتتاح فروع تجارية متكاملة، إصدار بطاقات الدفع الإلكتروني، والتعاقد مع شركات الخدمات.',
        tabs: ['cards', 'branches', 'vendors', 'legal', 'hr'],
        requirements: {
          deposits: 1000000,
          treasuryCash: 150000,
          camelsStars: 2.5,
          reputation: 30,
          completedLoans: 3
        },
        unlockedFeatures: [
          'إصدار بطاقات ميزة والخصم المباشر (Debit Cards)',
          'شراء وتثبيت ماكينات الصراف الآلي (ATMs) وافتتاح الفروع الرسمية',
          'عقود توريد شركات الأمن ونقل الأموال والنظافة والصيانة',
          'الشؤون القانونية والمزادات والديون المتعثرة (NPLs)',
          'شؤون العاملين والتوظيف والتدريب المصرفي (HR)'
        ]
      },
      {
        tier: 3,
        name: 'رخصة الصيرفة الإسلامية والتكنولوجيا (Islamic & FinTech)',
        shortName: 'صيرفة إسلامية وإنستاباي',
        badgeClass: 'tier-gold',
        icon: '🥇',
        desc: 'رخصة استثنائية لتقديم منتجات الشريعة الإسلامية، والربط بالشبكة القومية للمدفوعات اللحظية (InstaPay).',
        tabs: ['islamic', 'instapay', 'certificates', 'csr'],
        requirements: {
          deposits: 6000000,
          treasuryCash: 600000,
          camelsStars: 3.0,
          reputation: 50,
          completedLoans: 8
        },
        unlockedFeatures: [
          'نافذة المعاملات الإسلامية (مرابحة، مضاربة، هيئة الرقابة الشرعية)',
          'الربط بشبكة المدفوعات اللحظية (InstaPay) وتطوير السيرفرات',
          'طرح شهادات الادخار عالية العائد والملاذ الآمن للذهب عيار 24',
          'وحدة مكافحة غسل الأموال (AML) وتفتيش لجان البنك المركزي (CAMELS)'
        ]
      },
      {
        tier: 4,
        name: 'رخصة النقد الأجنبي والتجارة الدولية (FX & Trade License)',
        shortName: 'بنك تجارة دولية وفوركس',
        badgeClass: 'tier-platinum',
        icon: '💎',
        desc: 'رخصة بنك معتمد للتعامل بالنقد الأجنبي، فتح الاعتمادات المستندية، والتوسع الإقليمي بمحافظات مصر.',
        tabs: ['fx', 'branches_map', 'trophies'],
        requirements: {
          deposits: 25000000,
          treasuryCash: 2500000,
          camelsStars: 3.5,
          reputation: 65,
          completedLoans: 15
        },
        unlockedFeatures: [
          'مكتب تداول النقد الأجنبي (USD/EGP) واحتياطي العملة الصعبة',
          'فتح الاعتمادات المستندية (Letters of Credit - L/Cs) لكبار المستوردين',
          'خريطة الفروع الاستراتيجية والتوسع في أقاليم مصر الخمسة',
          'لوحة الشرف والأوسمة المصرفية وجوائز التميز المؤسسي'
        ]
      },
      {
        tier: 5,
        name: 'المجموعة المالية السيادية والبنك الرقمي (Sovereign Mega Bank)',
        shortName: 'مجموعة مصرفية سيادية',
        badgeClass: 'tier-diamond',
        icon: '👑',
        desc: 'أعلى رتبة مصرفية سيادية في جمهورية مصر العربية، تداول أسهم البورصة المصرية وإطلاق بنك رقمي مستقل.',
        tabs: ['egx', 'neo_bank'],
        requirements: {
          deposits: 80000000,
          treasuryCash: 10000000,
          camelsStars: 4.0,
          reputation: 80,
          completedLoans: 25
        },
        unlockedFeatures: [
          'مقصورة تداول أسهم كبرى الشركات بالبورصة المصرية (EGX Trading)',
          'رخصة البنك الرقمي المستقل (Nile Neo Bank) وخدمات الشراء الآن والدفع لاحقاً (BNPL)',
          'برج الحي المالي السيادي بالعاصمة الإدارية الجديدة ومزاحمة كبار البنوك'
        ]
      }
    ];

    // Director Career Titles
    this.directorTitles = [
      { maxLvl: 2, title: 'متدرب مصرفي واعد (Banking Trainee)', icon: '🌱' },
      { maxLvl: 5, title: 'صراف ومحلل ائتمان معتمد (Credit Analyst)', icon: '💼' },
      { maxLvl: 9, title: 'مدير فرع تجاري متميز (Branch Manager)', icon: '🏛️' },
      { maxLvl: 14, title: 'رئيس قطاع الائتمان والخزينة (Head of Treasury)', icon: '📈' },
      { maxLvl: 19, title: 'العضو المنتدب ونائب الرئيس (Managing Director)', icon: '👔' },
      { maxLvl: 999, title: 'القائد المصرفي الأسطوري (Legendary Central Banker)', icon: '👑' }
    ];
  }

  getCurrentTierData() {
    return this.tiersCatalog.find(t => t.tier === this.currentTier) || this.tiersCatalog[0];
  }

  getNextTierData() {
    if (this.currentTier >= this.tiersCatalog.length) return null;
    return this.tiersCatalog.find(t => t.tier === this.currentTier + 1) || null;
  }

  getTierByNumber(tierNumber) {
    return this.tiersCatalog.find(t => t.tier === tierNumber) || null;
  }

  isTabUnlocked(tabId) {
    // Basic essential tabs are always unlocked
    if (['dashboard', 'reports', 'executive_life'].includes(tabId)) {
      return true;
    }

    // Find which tier owns this tab
    const ownerTier = this.tiersCatalog.find(t => t.tabs.includes(tabId));
    if (!ownerTier) return true; // Fallback open for unlisted tabs

    return this.currentTier >= ownerTier.tier;
  }

  getRequiredTierForTab(tabId) {
    return this.tiersCatalog.find(t => t.tabs.includes(tabId)) || this.tiersCatalog[0];
  }

  getCompletedLoansCount() {
    if (!this.state.loansManager) return 0;
    const active = this.state.loansManager.activeLoans || [];
    // Approximate total processed loans
    return (this.state.loansManager.totalLoansDisbursedCount || 0) + (active.length > 0 ? active.length : 0);
  }

  getDirectorTitle() {
    const found = this.directorTitles.find(t => this.level <= t.maxLvl);
    return found ? found.title : this.directorTitles[this.directorTitles.length - 1].title;
  }

  getDirectorIcon() {
    const found = this.directorTitles.find(t => this.level <= t.maxLvl);
    return found ? found.icon : '👑';
  }

  getXpForNextLevel() {
    return this.level * 600;
  }

  addXP(amount, reason = '') {
    if (amount <= 0) return { leveledUp: false };

    this.xp += Math.round(amount);
    let leveledUp = false;
    let newLevel = this.level;

    while (this.xp >= this.getXpForNextLevel()) {
      this.xp -= this.getXpForNextLevel();
      this.level += 1;
      leveledUp = true;
      newLevel = this.level;

      // Executive bonus reward on level up
      if (this.state.executiveLifeManager) {
        const bonus = this.level * 5000;
        this.state.executiveLifeManager.personalWealth += bonus;
        this.state.executiveLifeManager.monthlySalary = Math.round(this.state.executiveLifeManager.monthlySalary * 1.05);
        this.state.executiveLifeManager.socialPrestige = Math.min(100, this.state.executiveLifeManager.socialPrestige + 3);
      }
    }

    this.state.saveGame();
    return {
      leveledUp,
      newLevel,
      currentXP: this.xp,
      xpNeeded: this.getXpForNextLevel(),
      reason
    };
  }

  checkUpgradeRequirements() {
    const nextTier = this.getNextTierData();
    if (!nextTier) {
      return {
        canUpgrade: false,
        isMaxTier: true,
        nextTier: null,
        checks: []
      };
    }

    const reqs = nextTier.requirements;
    const currentDeposits = this.state.totalDeposits || 0;
    const currentCash = this.state.treasuryCash || 0;
    const currentCamels = this.state.complianceManager ? this.state.complianceManager.currentCamelsScore : 4.0;
    const currentRep = this.state.reputation || 0;
    const currentLoans = this.getCompletedLoansCount();

    const checks = [
      {
        id: 'deposits',
        label: 'حجم ودائع العملاء',
        required: reqs.deposits,
        current: currentDeposits,
        unit: 'ج.م',
        met: currentDeposits >= reqs.deposits,
        progressPct: reqs.deposits > 0 ? Math.min(100, Math.round((currentDeposits / reqs.deposits) * 100)) : 100
      },
      {
        id: 'treasuryCash',
        label: 'سيولة الخزينة النقدية',
        required: reqs.treasuryCash,
        current: currentCash,
        unit: 'ج.م',
        met: currentCash >= reqs.treasuryCash,
        progressPct: reqs.treasuryCash > 0 ? Math.min(100, Math.round((currentCash / reqs.treasuryCash) * 100)) : 100
      },
      {
        id: 'camelsStars',
        label: 'تقييم تفتيش البنك المركزي (CAMELS)',
        required: reqs.camelsStars,
        current: currentCamels,
        unit: '★ نجوم',
        met: currentCamels >= reqs.camelsStars,
        progressPct: Math.min(100, Math.round((currentCamels / reqs.camelsStars) * 100))
      },
      {
        id: 'reputation',
        label: 'ثقة السوق وسمعة البنك',
        required: reqs.reputation,
        current: currentRep,
        unit: '%',
        met: currentRep >= reqs.reputation,
        progressPct: reqs.reputation > 0 ? Math.min(100, Math.round((currentRep / reqs.reputation) * 100)) : 100
      },
      {
        id: 'completedLoans',
        label: 'إجمالي ملفات التمويل المعتمدة',
        required: reqs.completedLoans,
        current: currentLoans,
        unit: 'تمويل',
        met: currentLoans >= reqs.completedLoans,
        progressPct: reqs.completedLoans > 0 ? Math.min(100, Math.round((currentLoans / reqs.completedLoans) * 100)) : 100
      }
    ];

    const canUpgrade = checks.every(c => c.met);

    return {
      canUpgrade,
      isMaxTier: false,
      nextTier,
      checks
    };
  }

  applyForLicenseUpgrade() {
    const evalResult = this.checkUpgradeRequirements();
    if (!evalResult.canUpgrade) {
      const unmet = evalResult.checks.filter(c => !c.met).map(c => c.label).join('، ');
      const msg = `عفواً، لم يستوفِ البنك كافة المعايير الرقابية المطلوبة للترقية. النواقص: (${unmet}).`;
      return {
        success: false,
        msg,
        message: msg
      };
    }

    const nextTier = evalResult.nextTier;
    this.currentTier = nextTier.tier;

    // Grant 1,200 XP for tier progression!
    this.addXP(1200, `اعتماد مرسوم ${nextTier.name}`);

    // Boost reputation and prestige
    this.state.reputation = Math.min(100, this.state.reputation + 10);
    if (this.state.executiveLifeManager) {
      this.state.executiveLifeManager.socialPrestige = Math.min(100, this.state.executiveLifeManager.socialPrestige + 15);
    }

    // Broadcast breaking news
    if (this.state.newsManager && typeof this.state.newsManager.addUrgentNews === 'function') {
      this.state.newsManager.addUrgentNews({
        type: 'positive',
        badge: `🏛️ قرار رسمي • ترقية البنك لفئة ${nextTier.shortName}`,
        title: `البنك المركزي المصري يعتمد رسمياً ترقية ${this.state.bankName} إلى «${nextTier.name}» بعد استيفاء شروط الملاءة والسيولة.`,
        impactText: 'فتح أقسام مصرفية وتكنولوجية جديدة وثقة كاسحة في القطاع المالي.'
      });
    }

    this.state.saveGame();

    const successMsg = `تهانينا! صدر قرار البنك المركزي المصري باعتماد ترقية ${this.state.bankName} إلى [${nextTier.name}] رسمياً!`;
    return {
      success: true,
      newTier: nextTier,
      msg: successMsg,
      message: successMsg
    };
  }

  getState() {
    return {
      currentTier: this.currentTier,
      xp: this.xp,
      level: this.level
    };
  }

  loadState(data) {
    if (!data) return;
    if (typeof data.currentTier === 'number') this.currentTier = data.currentTier;
    if (typeof data.xp === 'number') this.xp = data.xp;
    if (typeof data.level === 'number') this.level = data.level;
  }
}
