/**
 * BranchesManager - Starting from a small leased office, scalable physical branches & FinTech assets
 */
export class BranchesManager {
  constructor(gameState) {
    this.state = gameState;

    // Physical Branches
    this.branches = [
      {
        id: 'seed_office',
        name: 'المكتب التأسيسي المؤجر (حي شبرا / وسط البلد)',
        location: 'مكتب استقبال محلي',
        cost: 0,
        opEx: 1500, // 1,500 ج.م فقط إيجار شهري متواضع
        monthlyFeeIncome: 1800,
        unlocked: true,
        upgrades: [],
        depositBoost: 0,
        description: 'مقر إداري صغير لبدء استقبال أول المودعين وتسيير طلبات التمويل الأولية.'
      },
      {
        id: 'cairo_downtown',
        name: 'فرع شارع شريف (وسط البلد - القاهرة)',
        location: 'القاهرة التراثية',
        cost: 180000, // 180 ألف ج.م
        opEx: 15000,
        monthlyFeeIncome: 24000,
        unlocked: false,
        upgrades: [],
        depositBoost: 450000,
        description: 'أول فرع تجاري رسمي متكامل، كاونترات صرافة وخدمة مكثفة لتجار وأهالي العاصمة.'
      },
      {
        id: 'alexandria_raml',
        name: 'فرع محطة الرمل (الإسكندرية)',
        location: 'عروس البحر الأبيض',
        cost: 850000, // 850 ألف ج.م
        opEx: 35000,
        monthlyFeeIncome: 55000,
        unlocked: false,
        upgrades: [],
        depositBoost: 1800000,
        description: 'موقع بحري استراتيجي لخدمة شركات التخليص الجمركي والتوريدات والملاحة.'
      },
      {
        id: 'tagamoa_ninetieth',
        name: 'فرع شارع التسعين (التجمع الخامس)',
        location: 'القاهرة الجديدة',
        cost: 2800000, // 2.8 مليون ج.م
        opEx: 85000,
        monthlyFeeIncome: 120000,
        unlocked: false,
        upgrades: [],
        depositBoost: 6500000,
        description: 'استقطاب كبار المستثمرين والشركات الناشئة في قلب حي المال والأعمال.'
      },
      {
        id: 'new_capital_financial',
        name: 'برج الحي المالي (العاصمة الإدارية الجديدة)',
        location: 'العاصمة الإدارية',
        cost: 10000000, // 10 مليون ج.م
        opEx: 220000,
        monthlyFeeIncome: 350000,
        unlocked: false,
        upgrades: [],
        depositBoost: 25000000,
        description: 'المقر السيادي الحديث للبنك، مجاورة البنك المركزي والوزارات وعقد الصفقات المليونية.'
      }
    ];

    // Branch interior upgrades catalog
    this.branchUpgradesCatalog = [
      {
        id: 'smart_atm',
        name: 'ماكينة صراف ذكية تفاعلية (Smart ITM)',
        cost: 45000,
        feeBonus: 3500,
        ratingBonus: 1,
        desc: 'إيداع نقدي لحظي وتغيير عملات بدون إشغال الموظفين.'
      },
      {
        id: 'vip_lounge',
        name: 'استراحة كبار العملاء VIP & Private Banking',
        cost: 85000,
        feeBonus: 6000,
        ratingBonus: 2,
        patienceBonus: 0.35,
        desc: 'خدمة ضيافة راقية تجذب أصحاب الثروات والشركات العملاقة.'
      },
      {
        id: 'digital_fx_ticker',
        name: 'شاشة أسعار الصرف التفاعلية والتحليلات',
        cost: 25000,
        feeBonus: 2500,
        ratingBonus: 1,
        desc: 'متابعة لحظية لسعر الدولار والذهب، تجذب تجار العملة الرسميين.'
      },
      {
        id: 'smart_queue',
        name: 'نظام النداء الآلي وحجز المواعيد الذكي',
        cost: 30000,
        feeBonus: 2000,
        ratingBonus: 1,
        desc: 'تنظيم الحشود وتخفيف التكدس ورفع سرعة إنجاز الشبابيك.'
      }
    ];

    // Digital Assets
    this.atmCount = 0; // Starts with 0 ATMs!
    this.atmCost = 35000; // 35,000 ج.م لشراء وتثبيت ماكينة صراف
    this.atmFeePerUnit = 3200; // دخل شهري متوسط لكل ماكينة
    this.atmOpExPerUnit = 600; // صيانة وتغذية نقدية

    // Mobile App ('Nile Digital Mobile') - Starts at level 0 (Unlaunched)
    this.mobileAppLevel = 0;
    this.mobileAppLevelsData = [
      { lvl: 1, title: 'إطلاق تطبيق الاستعلام وكشف الحساب الرقمي', cost: 25000, boostPct: 15 },
      { lvl: 2, title: 'الربط بشبكة المدفوعات اللحظية (InstaPay)', cost: 90000, boostPct: 35 },
      { lvl: 3, title: 'شراء وكسر شهادات الادخار إلكترونياً', cost: 350000, boostPct: 60 },
      { lvl: 4, title: 'فتح حسابات بنكية بالرقم القومي (e-KYC)', cost: 1200000, boostPct: 90 },
      { lvl: 5, title: 'التمويل الرقمي والبطاقات الائتمانية اللحظية', cost: 4000000, boostPct: 140 }
    ];

    // Interactive Egypt Regional Banking Hubs
    this.regionalHubs = [
      {
        id: 'cairo_hub',
        name: 'إقليم القاهرة الكبرى والجيزة',
        governorates: 'القاهرة • الجيزة • القليوبية',
        specialty: 'المركز المالي الرئيسي، تمويل كبرى الشركات، والصفقات الاستثمارية',
        icon: '🏛️',
        level: 1,
        maxLevel: 3,
        levelTitles: ['مكتب تمثيلي محلي', 'فرع رئيسي تجاري متكامل', 'مجمع مراكز مالية وكبار عملاء VIP'],
        costs: [0, 180000, 1500000],
        depositBoosts: [50000, 1200000, 8500000],
        monthlyFees: [1800, 24000, 140000],
        opExs: [1500, 15000, 65000],
        svgCoords: { x: 58, y: 38 }
      },
      {
        id: 'alex_hub',
        name: 'إقليم الإسكندرية والساحل الشمالي',
        governorates: 'الإسكندرية • مطروح • العلمين الجديدة',
        specialty: 'تمويل الملاحة البحرية، التخليص الجمركي، وسياحة الساحل الشمالي',
        icon: '⚓',
        level: 0,
        maxLevel: 3,
        levelTitles: ['غير مفعل', 'فرع بحري تجاري (محطة الرمل)', 'مركز التمويل الملاحي الدولي والجمارك'],
        costs: [350000, 900000, 2200000],
        depositBoosts: [800000, 2500000, 7000000],
        monthlyFees: [16000, 48000, 110000],
        opExs: [12000, 30000, 55000],
        svgCoords: { x: 44, y: 22 }
      },
      {
        id: 'delta_canal_hub',
        name: 'إقليم الدلتا ومدن القناة',
        governorates: 'المنصورة • طنطا • بورسعيد • الإسماعيلية • السويس',
        specialty: 'لوجستيات قناة السويس، التجارة الحرة، والصناعات الغذائية والنسيج',
        icon: '🚢',
        level: 0,
        maxLevel: 3,
        levelTitles: ['غير مفعل', 'فرع لوجستي وتجاري إقليمي', 'مجمع تمويل الموانئ والصناعات التصديرية'],
        costs: [450000, 1100000, 2800000],
        depositBoosts: [1100000, 3200000, 8000000],
        monthlyFees: [22000, 60000, 130000],
        opExs: [16000, 38000, 70000],
        svgCoords: { x: 68, y: 28 }
      },
      {
        id: 'upper_egypt_hub',
        name: 'إقليم الصعيد وجنوب الوادي',
        governorates: 'أسيوط • سوهاج • قنا • الأقصر • أسوان • توشكى',
        specialty: 'استصلاح الأراضي الزراعية، الطاقة الشمسية (بنبان)، والشمول المالي للحرفيين',
        icon: '🌾',
        level: 0,
        maxLevel: 3,
        levelTitles: ['غير مفعل', 'فرع التنمية الزراعية والحرفية', 'مركز التمويل الريفي والاستصلاح الزراعي'],
        costs: [280000, 750000, 1800000],
        depositBoosts: [650000, 2000000, 5500000],
        monthlyFees: [14000, 38000, 90000],
        opExs: [9000, 22000, 45000],
        svgCoords: { x: 62, y: 72 }
      },
      {
        id: 'new_capital_hub',
        name: 'إقليم العاصمة الإدارية (الحي المالي والسيادي)',
        governorates: 'الحي المالي • مجمع البنوك • البرج الأيقوني والوزارات',
        specialty: 'السندات الخضراء، التمويل السيادي، والشراكات الحكومية والدولية الكبرى',
        icon: '👑',
        level: 0,
        maxLevel: 3,
        levelTitles: ['غير مفعل', 'برج التمويل الاستثماري (الحي المالي)', 'المقر السيادي العام والشراكات الدولية'],
        costs: [3500000, 8000000, 18000000],
        depositBoosts: [8000000, 22000000, 60000000],
        monthlyFees: [120000, 350000, 850000],
        opExs: [75000, 180000, 380000],
        svgCoords: { x: 74, y: 44 }
      }
    ];
  }

  calculateMonthlyOpEx() {
    let opex = 0;
    this.branches.forEach(b => {
      if (b.unlocked) opex += b.opEx;
    });
    this.regionalHubs.forEach(h => {
      if (h.level > 0 && h.opExs[h.level - 1]) {
        opex += h.opExs[h.level - 1];
      }
    });
    opex += this.atmCount * this.atmOpExPerUnit;
    if (this.mobileAppLevel > 0) {
      opex += this.mobileAppLevel * 1200;
    }
    return opex;
  }

  calculateMonthlyFees() {
    let income = 0;
    this.branches.forEach(b => {
      if (b.unlocked) {
        income += b.monthlyFeeIncome;
        if (b.upgrades && Array.isArray(b.upgrades)) {
          b.upgrades.forEach(uId => {
            const upg = this.branchUpgradesCatalog.find(u => u.id === uId);
            if (upg) income += upg.feeBonus;
          });
        }
      }
    });
    this.regionalHubs.forEach(h => {
      if (h.level > 0 && h.monthlyFees[h.level - 1]) {
        income += h.monthlyFees[h.level - 1];
      }
    });
    income += this.atmCount * this.atmFeePerUnit;
    if (this.mobileAppLevel > 0) {
      income += this.mobileAppLevel * 2500;
    }
    return income;
  }

  getDepositMultiplier() {
    let multiplier = 1.0;
    this.branches.forEach(b => {
      if (b.unlocked && b.id !== 'seed_office') multiplier += 0.25;
    });
    if (this.mobileAppLevel > 0) {
      const appData = this.mobileAppLevelsData.find(d => d.lvl === this.mobileAppLevel);
      if (appData) {
        multiplier += (appData.boostPct / 100);
      }
    }
    return multiplier;
  }

  unlockBranch(branchId) {
    const b = this.branches.find(item => item.id === branchId);
    if (!b) return { success: false, msg: 'الفرع غير موجود.' };
    if (b.unlocked) return { success: false, msg: 'هذا الفرع مفتوح وقيد التشغيل بالفعل.' };

    if (this.state.treasuryCash < b.cost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لافتتاح الفرع. التكلفة المطلوبة: ${b.cost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= b.cost;
    b.unlocked = true;
    this.state.totalDeposits += b.depositBoost;
    this.state.treasuryCash += Math.round(b.depositBoost * 0.15); // ودائع افتتاحية سيولة فورية
    this.state.reputation = Math.min(100, this.state.reputation + 8);
    this.state.saveGame();

    return {
      success: true,
      msg: `تهانينا! تم افتتاح [${b.name}] رسمياً. أضاف الفرع ${b.depositBoost.toLocaleString('ar-EG')} ج.م لمحفظة ودائع البنك.`
    };
  }

  buyATM() {
    if (this.state.treasuryCash < this.atmCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لشراء ماكينة الصراف الآلي. التكلفة: ${this.atmCost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= this.atmCost;
    this.atmCount += 1;
    this.state.reputation = Math.min(100, this.state.reputation + 1);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم شراء وتثبيت ماكينة صراف آلي (ATM) جديدة بنجاح! إجمالي الماكينات: ${this.atmCount}.`
    };
  }

  upgradeMobileApp() {
    const nextLvl = this.mobileAppLevel + 1;
    if (nextLvl > 5) return { success: false, msg: 'وصل التطبيق المصرفي للحد الأقصى من التطور التكنولوجي!' };

    const targetData = this.mobileAppLevelsData.find(d => d.lvl === nextLvl);
    if (this.state.treasuryCash < targetData.cost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لترقية المنظومة الرقمية. التكلفة: ${targetData.cost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= targetData.cost;
    this.mobileAppLevel = nextLvl;
    this.state.reputation = Math.min(100, this.state.reputation + 7);

    // Level 2: Automatic seamless integration with InstaPayManager
    if (nextLvl >= 2 && this.state.instaPayManager) {
      this.state.instaPayManager.isInstaPayActive = true;
    }

    this.state.saveGame();

    const extraNotice = (nextLvl === 2) ? ' وتم تفعيل شبكة التحويلات اللحظية (InstaPay) تلقائياً للمتعاملين!' : '';
    return {
      success: true,
      msg: `تم بنجاح: [${targetData.title}]! تضاعفت سرعة جذب المودعين والمعاملات الرقمية.${extraNotice}`
    };
  }

  upgradeRegionalHub(hubId) {
    const hub = this.regionalHubs.find(h => h.id === hubId);
    if (!hub) return { success: false, msg: 'الإقليم المصرفي غير موجود.' };
    if (hub.level >= hub.maxLevel) {
      return { success: false, msg: 'وصل هذا الإقليم المصرفي لأعلى مستوى ترقية وتطوير!' };
    }

    const nextLevel = hub.level + 1;
    const cost = hub.costs[nextLevel - 1];

    if (this.state.treasuryCash < cost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لترقية ${hub.name}. التكلفة المطلوبة: ${cost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= cost;
    hub.level = nextLevel;
    const depositBoost = hub.depositBoosts[nextLevel - 1];
    this.state.totalDeposits += depositBoost;
    this.state.treasuryCash += Math.round(depositBoost * 0.15); // 15% immediate cash liquidity
    this.state.reputation = Math.min(100, this.state.reputation + 6);
    this.state.saveGame();

    return {
      success: true,
      msg: `تهانينا! تمت ترقية [${hub.name}] بنجاح إلى [${hub.levelTitles[nextLevel - 1]}]. تدفقت ودائع إقليمية جديدة بـ ${depositBoost.toLocaleString('ar-EG')} ج.م.`
    };
  }

  upgradeBranch(branchId, upgradeId) {
    const b = this.branches.find(item => item.id === branchId);
    if (!b) return { success: false, msg: 'الفرع غير موجود.' };
    if (!b.unlocked) return { success: false, msg: 'يجب افتتاح الفرع أولاً قبل تجهيزه وتطويره.' };

    if (!b.upgrades) b.upgrades = [];
    if (b.upgrades.includes(upgradeId)) {
      return { success: false, msg: 'هذه التجهيزة مركبة ومفعلة بالفعل في هذا الفرع.' };
    }

    const item = this.branchUpgradesCatalog.find(u => u.id === upgradeId);
    if (!item) return { success: false, msg: 'التجهيزة غير موجودة في الدليل.' };

    if (this.state.treasuryCash < item.cost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لتجهيز الفرع. التكلفة المطلوبة: ${item.cost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= item.cost;
    b.upgrades.push(upgradeId);
    this.state.reputation = Math.min(100, this.state.reputation + item.ratingBonus);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم بنجاح تركيب وتجهيز [${item.name}] في [${b.name}]! زيادة العمولات الشهرية بـ ${item.feeBonus.toLocaleString('ar-EG')} ج.م.`
    };
  }

  getState() {
    return {
      branches: this.branches.map(b => ({
        id: b.id,
        unlocked: b.unlocked,
        upgrades: b.upgrades || []
      })),
      regionalHubs: this.regionalHubs.map(h => ({
        id: h.id,
        level: h.level
      })),
      atmCount: this.atmCount,
      mobileAppLevel: this.mobileAppLevel
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.branches && Array.isArray(data.branches)) {
      data.branches.forEach(savedBranch => {
        const target = this.branches.find(b => b.id === savedBranch.id);
        if (target) {
          target.unlocked = !!savedBranch.unlocked;
          if (Array.isArray(savedBranch.upgrades)) {
            target.upgrades = savedBranch.upgrades;
          }
        }
      });
    }
    if (data.regionalHubs && Array.isArray(data.regionalHubs)) {
      data.regionalHubs.forEach(savedHub => {
        const target = this.regionalHubs.find(h => h.id === savedHub.id);
        if (target && typeof savedHub.level === 'number') {
          target.level = savedHub.level;
        }
      });
    }
    if (typeof data.atmCount === 'number') {
      this.atmCount = data.atmCount;
    }
    if (typeof data.mobileAppLevel === 'number') {
      this.mobileAppLevel = data.mobileAppLevel;
    }
  }
}
