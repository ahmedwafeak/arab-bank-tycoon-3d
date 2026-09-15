/**
 * CareerProgressionManager.js
 * Comprehensive 7-Stage Banking Career Progression Engine
 * Manages promotions, salaries, stage metrics, personal vital stats, and dual-gender phrasing.
 */
import { CareerManager } from './CareerManager.js';
import { LifestyleStoreManager } from './LifestyleStoreManager.js';
import { WorkplaceDilemmasManager } from './WorkplaceDilemmasManager.js';

export class CareerProgressionManager extends CareerManager {
  constructor(gameState) {
    super(gameState);

    this.isStarted = false;
    this.isFinished = false;

    // Character Profile
    this.name = 'أحمد مصطفى';
    this.gender = 'male'; // 'male' | 'female'
    this.degree = 'تجارة إنجليزي - قسم تمويل ومحاسبة';
    this.avatar = './assets/characters/player.jpg';

    // Personal Vital Stats (0 - 100)
    this.energy = 85;           // الطاقة والنشاط الجسدي (0: إجهاد تام، 100: ذروة النشاط)
    this.stress = 20;           // مؤشر التوتر والضغط العصبي (>=100: إجازة مرضية إجبارية)
    this.socialPrestige = 10;   // البرستيج والمكانة الاجتماعية (يحدد ثقة كبار العملاء)
    this.integrity = 90;        // النزاهة والضمير المهني (حصانة الرقابة ومكافحة الفساد)
    this.personalWealth = 15000; // الرصيد البنكي الشخصي بالجنيه المصري (منفصل عن البنك)
    this.marketReputation = 35; // السمعة السوقية (تجلب عروض الاستقطاب والرعاية)
    this.charisma = 15;         // الكاريزما والإقناع (تؤثر على مبيعات الشهادات والتفاوض)

    // Current Career Stage (0 to 6)
    this.currentStageIndex = 0;

    // Sub-managers
    this.lifestyle = new LifestyleStoreManager(this);
    this.dilemmas = new WorkplaceDilemmasManager(this);

    // Trackers for promotion requirements
    this.stageMetrics = {
      transactionsCount: 0,     // عدد المعاملات المنجزة
      cashDeficitTotal: 0,      // إجمالي عجز الخزينة المتراكم
      chequesInspected: 0,      // عدد الشيكات المفحوصة
      trainedTellers: 0,        // عدد الصرافين المدربين
      certificatesSoldValue: 0, // قيمة الشهادات المباعة بالجنيه
      creditFilesAnalyzed: 0,   // عدد ملفات الائتمان المدروسة
      creditDefaultRate: 0,     // نسبة التعثر الائتماني
      vipDepositsAttracted: 0,  // ودائع كبار العملاء المستقطبة
      branchAnnualProfits: 0,   // أرباح الفرع المحققة
      performanceRating: 80     // تقييم الأداء السنوي العام %
    };

    // 7 Distinct Career Stages with Dual-Gender Phrasing & Strict Requirements
    this.stages = [
      // Stage 0: Probationary Teller (صراف تحت الاختبار)
      {
        id: 'probationary_teller',
        level: 1,
        title: {
          m: 'صراف تحت الاختبار (Probationary Teller)',
          f: 'صرافة تحت الاختبار (Probationary Teller)'
        },
        department: 'قطاع الخزينة وشبابيك الفرع',
        baseSalary: 6000,
        deskName: 'شباك الصراف #1 (مكتبك الميداني)',
        desc: 'بداية المشوار المصرفي: التعامل مع طوابير العملاء، عد النقدية بدقة، وتفادي عجز الخزينة والفلوس المزورة.',
        requirements: {
          minTransactions: 30,
          maxDeficit: 0,
          minPerformance: 75,
          minIntegrity: 50
        }
      },

      // Stage 1: Senior Vault Teller (صراف أول ومسؤول الخزينة)
      {
        id: 'senior_vault_teller',
        level: 2,
        title: {
          m: 'صراف أول ومسؤول الخزينة (Senior Vault Teller)',
          f: 'صرافة أولى ومسؤولة الخزينة (Senior Vault Teller)'
        },
        department: 'إدارة الخزينة ومطابقة العهدة النقدية',
        baseSalary: 11000,
        deskName: 'شباك الخزينة الرئيسية #2',
        desc: 'مسؤولية أثقل: مطابقة خزائن الفرع، فحص الشيكات الورقية الورقية وكشف التزوير، وتدريب الصرافين الجدد.',
        requirements: {
          minTransactions: 60,
          minCheques: 10,
          minPerformance: 80,
          minPrestige: 15
        }
      },

      // Stage 2: Customer Service Specialist (أخصائي خدمة عملاء ومبيعات)
      {
        id: 'customer_service_specialist',
        level: 3,
        title: {
          m: 'أخصائي خدمة عملاء ومبيعات (Customer Service Specialist)',
          f: 'أخصائية خدمة عملاء ومبيعات (Customer Service Specialist)'
        },
        department: 'قطاع التجزئة المصرفية ومبيعات الشهادات',
        baseSalary: 16000,
        deskName: 'مكتب خدمة العملاء بصالة الفرع',
        desc: 'واجهة البنك الأمامية: فتح الحسابات، سباق تارجت الشهادات الادخارية، والتعامل مع غضب واعتراضات العملاء.',
        requirements: {
          minCertificatesValue: 1500000, // 1.5 مليون تارجت
          minPerformance: 82,
          minPrestige: 25,
          minCharisma: 20
        }
      },

      // Stage 3: Corporate Credit Analyst (محلل ائتمان وتمويل شركات)
      {
        id: 'credit_loan_analyst',
        level: 4,
        title: {
          m: 'محلل ائتمان وتمويل شركات (Corporate Credit Analyst)',
          f: 'محللة ائتمان وتمويل شركات (Corporate Credit Analyst)'
        },
        department: 'قطاع الائتمان ومخاطر تمويل الشركات',
        baseSalary: 28000,
        deskName: 'مكتب التدقيق والتحليل الائتماني',
        desc: 'مطبخ صناعة الملايين: فحص السجلات التجارية، كشف تلاعب الميزانيات، وقرار منح قروض المصانع الكبرى.',
        requirements: {
          minCreditFiles: 8,
          maxDefaultRate: 4, // أقل من 4% تعثر
          minIntegrity: 70,
          minPrestige: 35
        }
      },

      // Stage 4: Private Banking & VIP Wealth Manager (مدير علاقات كبار العملاء)
      {
        id: 'vip_wealth_manager',
        level: 5,
        title: {
          m: 'مدير علاقات كبار العملاء (Private Banking & VIP Manager)',
          f: 'مديرة علاقات كبار العملاء (Private Banking & VIP Manager)'
        },
        department: 'قطاع الثروات الخاصة وإدارة الأصول (VIP)',
        baseSalary: 50000,
        deskName: 'صالون كبار العملاء والأثرياء (VIP Lounge)',
        desc: 'التعامل مع المشاهير ورجال الأعمال وأصحاب الملايين؛ يتطلب مظهراً فاخراً وسيارات أنيقة وساعات راقية.',
        requirements: {
          minVIPDeposits: 20000000, // 20 مليون ودائع VIP
          minPrestige: 60,
          minCharisma: 40
        }
      },

      // Stage 5: Branch Operations Manager (مدير فرع تجاري)
      {
        id: 'branch_operations_manager',
        level: 6,
        title: {
          m: 'مدير فرع تجاري (Branch Operations Manager)',
          f: 'مديرة فرع تجاري (Branch Operations Manager)'
        },
        department: 'الإدارة العامة وتشغيل الفرع الإقليمي',
        baseSalary: 95000,
        deskName: 'مكتب مدير عام الفرع الزجاجي',
        desc: 'قيادة الفرع بالكامل: إدارة الموظفين، تقييم رواتبهم، حل نزاعات العمل، واجتياز تفتيش البنك المركزي.',
        requirements: {
          minBranchProfit: 5000000, // 5 ملايين أرباح للفرع
          minPerformance: 88,
          minPrestige: 75,
          minIntegrity: 75
        }
      },

      // Stage 6: Chairman & CEO (رئيس مجلس الإدارة والعضو المنتدب)
      {
        id: 'chairman_ceo',
        level: 7,
        title: {
          m: 'رئيس مجلس الإدارة والعضو المنتدب (Chairman & CEO)',
          f: 'رئيسة مجلس الإدارة والعضوة المنتدبة (Chairman & CEO)'
        },
        department: 'المقر الرئيسي والمجلس التنفيذي الأعلى',
        baseSalary: 250000,
        deskName: 'الجناح الرئاسي وقاعة مجلس الإدارة الكبرى',
        desc: 'قمة الهرم المصرفي: قيادة الاستراتيجية العامة، التفاوض مع البنك المركزي، وإطلاق إمبراطورية الفروع (Tycoon Mode).',
        requirements: {
          isUltimateStage: true
        }
      }
    ];
    // Load persisted career if available
    this.loadCareer();
  }

  get wealth() {
    return this.personalWealth;
  }

  set wealth(val) {
    this.personalWealth = val;
  }

  addXP(amount, reason = '') {
    this.skill = Math.min(100, this.skill + Math.round(amount / 20));
    this.stageMetrics.performanceRating = Math.min(100, this.stageMetrics.performanceRating + (amount / 40));
    this.personalWealth += Math.round(amount * 1.5);
    if (this.gameState && this.gameState.licensesManager) {
      this.gameState.licensesManager.addXP(amount, reason);
    }
    this.saveCareer();
  }

  /**
   * Start career with chosen profile
   */
  startCareer(name, gender, degree) {
    this.isStarted = true;
    this.isFinished = false;
    this.name = name || 'أحمد مصطفى';
    this.gender = gender || 'male';
    this.degree = degree || 'تجارة إنجليزي - قسم تمويل ومحاسبة';
    this.avatar = (this.gender === 'female') ? './assets/characters/player_female.jpg' : './assets/characters/player.jpg';
    this.currentStageIndex = 0;
    this.currentEventIndex = 0;
    this.energy = 85;
    this.stress = 15;
    this.integrity = 90;
    this.socialPrestige = 12;
    this.personalWealth = 15000;
    this.marketReputation = 35;
    this.charisma = 20;
    this.skill = 25;
    this.networking = 20;

    // Reset metrics
    this.stageMetrics = {
      transactionsCount: 0,
      cashDeficitTotal: 0,
      chequesInspected: 0,
      trainedTellers: 0,
      certificatesSoldValue: 0,
      creditFilesAnalyzed: 0,
      creditDefaultRate: 0,
      vipDepositsAttracted: 0,
      branchAnnualProfits: 0,
      performanceRating: 80
    };

    if (this.lifestyle) {
      this.lifestyle.ownedAssets = ['transit_public', 'apt_rental_popular', 'suit_graduate'];
      this.lifestyle.activeVehicle = 'transit_public';
      this.lifestyle.activeResidence = 'apt_rental_popular';
      this.lifestyle.activeWardrobe = 'suit_graduate';
      this.lifestyle.activeWatch = null;
    }

    this.saveCareer();
  }

  getCurrentStage() {
    return this.stages[this.currentStageIndex] || this.stages[0];
  }

  getStageTitle() {
    const s = this.getCurrentStage();
    return this.gender === 'female' ? s.title.f : s.title.m;
  }

  /**
   * Update vital stats with lifestyle bonuses
   */
  recalculateStats() {
    const bonuses = this.lifestyle.calculateTotalBonuses();
    this.socialPrestige = Math.min(100, Math.max(5, (this.currentStageIndex * 12) + bonuses.prestige));
    this.charisma = Math.min(100, Math.max(10, 15 + bonuses.charisma));
    return bonuses;
  }

  /**
   * Complete a transaction at the teller desk
   */
  recordTransaction(isSuccessful = true, deficit = 0) {
    this.stageMetrics.transactionsCount += 1;
    if (deficit > 0) {
      this.stageMetrics.cashDeficitTotal += deficit;
      this.stress = Math.min(100, this.stress + 15);
      this.stageMetrics.performanceRating = Math.max(40, this.stageMetrics.performanceRating - 8);
    } else if (isSuccessful) {
      this.stageMetrics.performanceRating = Math.min(100, this.stageMetrics.performanceRating + 1.2);
      this.personalWealth += 40; // Small daily teller transaction incentive
      this.energy = Math.max(0, this.energy - 1.5);
    }
    return this.checkPromotionEligibility();
  }

  /**
   * Check if player meets all promotion criteria for the next rank
   */
  checkPromotionEligibility() {
    if (this.currentStageIndex >= this.stages.length - 1) {
      return { eligible: false, isMax: true, reasons: ['لقد وصلت إلى قمة الهرم الوظيفي (رئيس مجلس الإدارة)!'] };
    }

    const current = this.getCurrentStage();
    const req = current.requirements;
    const m = this.stageMetrics;
    const reasons = [];

    if (req.minTransactions && m.transactionsCount < req.minTransactions) {
      reasons.push(`إنجاز ${m.transactionsCount}/${req.minTransactions} معاملة بالشباك`);
    }
    if (req.maxDeficit !== undefined && m.cashDeficitTotal > req.maxDeficit) {
      reasons.push(`عجز الخزينة الحالي (${m.cashDeficitTotal.toLocaleString('ar-EG')} ج.م) يجب أن يكون صفر`);
    }
    if (req.minCheques && m.chequesInspected < req.minCheques) {
      reasons.push(`فحص ${m.chequesInspected}/${req.minCheques} شيكاً ورزماً`);
    }
    if (req.minCertificatesValue && m.certificatesSoldValue < req.minCertificatesValue) {
      const currentVal = (m.certificatesSoldValue / 1000000).toFixed(1);
      const reqVal = (req.minCertificatesValue / 1000000).toFixed(1);
      reasons.push(`تارجت الشهادات: ${currentVal}M / ${reqVal}M ج.م`);
    }
    if (req.minCreditFiles && m.creditFilesAnalyzed < req.minCreditFiles) {
      reasons.push(`دراسة ${m.creditFilesAnalyzed}/${req.minCreditFiles} ملف ائتمان شركات`);
    }
    if (req.minVIPDeposits && m.vipDepositsAttracted < req.minVIPDeposits) {
      const cur = (m.vipDepositsAttracted / 1000000).toFixed(1);
      const target = (req.minVIPDeposits / 1000000).toFixed(1);
      reasons.push(`ودائع كبار العملاء VIP: ${cur}M / ${target}M ج.م`);
    }
    if (req.minBranchProfit && m.branchAnnualProfits < req.minBranchProfit) {
      reasons.push(`أرباح الفرع: ${(m.branchAnnualProfits / 1000000).toFixed(1)}M / ${(req.minBranchProfit / 1000000).toFixed(1)}M ج.م`);
    }
    if (req.minPrestige && this.socialPrestige < req.minPrestige) {
      reasons.push(`البرستيج والمكانة الاجتماعية: ${this.socialPrestige}/${req.minPrestige} (يتطلب سيارة ومظهراً أرقى)`);
    }
    if (req.minIntegrity && this.integrity < req.minIntegrity) {
      reasons.push(`النزاهة والأمانة المهنية: ${this.integrity}/${req.minIntegrity}`);
    }
    if (req.minPerformance && m.performanceRating < req.minPerformance) {
      reasons.push(`تقييم الأداء العام: ${Math.round(m.performanceRating)}%/${req.minPerformance}%`);
    }

    const eligible = reasons.length === 0;
    return { eligible, isMax: false, reasons, nextStage: this.stages[this.currentStageIndex + 1] };
  }

  /**
   * Promote player to the next career stage
   */
  promoteToNextStage() {
    const check = this.checkPromotionEligibility();
    if (!check.eligible) {
      return { success: false, msg: 'لم تستوفِ بعد كافة متطلبات الترقية الرسمية!' };
    }

    this.currentStageIndex += 1;
    const newStage = this.getCurrentStage();
    const title = this.getStageTitle();

    // Reward promotion bonus to personal wealth
    const bonus = newStage.baseSalary * 1.5;
    this.personalWealth += bonus;
    this.stress = Math.max(10, this.stress - 20); // Relief & celebration
    this.socialPrestige += 10;
    this.marketReputation += 12;

    const isCEO = this.currentStageIndex === this.stages.length - 1;
    if (isCEO) {
      this.isFinished = true;
    }

    return {
      success: true,
      stageIndex: this.currentStageIndex,
      newStage,
      title,
      bonus,
      isCEO,
      msg: `🎉 ألف مبروك! صدر قرار ترقيتك رسمياً إلى "${title}" براتب ${newStage.baseSalary.toLocaleString('ar-EG')} ج.م ومكافأة ترقية ${bonus.toLocaleString('ar-EG')} ج.م!`
    };
  }

  /**
   * Process monthly salary payment & deduct lifestyle maintenance expenses
   */
  processMonthlyCycle() {
    const stage = this.getCurrentStage();
    const bonuses = this.lifestyle.calculateTotalBonuses();

    // Gross Income
    const salary = stage.baseSalary;
    const incentives = Math.round(salary * (this.stageMetrics.performanceRating / 500));
    const grossIncome = salary + incentives;

    // Expenses (lifestyle rent/maintenance, car fuel/driver)
    const expenses = bonuses.monthlyExpenses;
    const netSavings = grossIncome - expenses;

    this.personalWealth += netSavings;

    // Vital Stats monthly natural shift
    this.stress = Math.max(0, Math.min(100, this.stress - bonuses.stressReduction + (this.energy < 30 ? 15 : 0)));
    this.energy = Math.min(100, Math.max(20, 75 + bonuses.energyBonus));

    // Health / Breakdown Check
    let healthAlert = null;
    if (this.stress >= 100) {
      this.stress = 60;
      this.personalWealth -= 8000; // Medical care
      this.energy = 40;
      healthAlert = '⚠️ تعرضت لانهيار عصبي حاد نتيجة ضغط العمل المفرط! أُجبرت على إجازة مرضية كلفتك 8,000 ج.م رعاية طبية.';
    }

    return {
      grossIncome,
      salary,
      incentives,
      expenses,
      netSavings,
      currentWealth: this.personalWealth,
      healthAlert
    };
  }

  /**
   * Export Save State
   */
  exportState() {
    return {
      isStarted: this.isStarted,
      isFinished: this.isFinished,
      name: this.name,
      gender: this.gender,
      degree: this.degree,
      avatar: this.avatar,
      currentStageIndex: this.currentStageIndex,
      energy: this.energy,
      stress: this.stress,
      socialPrestige: this.socialPrestige,
      integrity: this.integrity,
      personalWealth: this.personalWealth,
      marketReputation: this.marketReputation,
      charisma: this.charisma,
      stageMetrics: this.stageMetrics,
      lifestyle: this.lifestyle.exportState()
    };
  }

  /**
   * Import Save State
   */
  importState(data = {}) {
    if (!data) return;
    this.isStarted = !!data.isStarted;
    this.isFinished = !!data.isFinished;
    if (data.name) this.name = data.name;
    if (data.gender) this.gender = data.gender;
    if (data.degree) this.degree = data.degree;
    if (data.avatar) this.avatar = data.avatar;
    if (typeof data.currentStageIndex === 'number') this.currentStageIndex = data.currentStageIndex;
    if (typeof data.energy === 'number') this.energy = data.energy;
    if (typeof data.stress === 'number') this.stress = data.stress;
    if (typeof data.socialPrestige === 'number') this.socialPrestige = data.socialPrestige;
    if (typeof data.integrity === 'number') this.integrity = data.integrity;
    if (typeof data.personalWealth === 'number') this.personalWealth = data.personalWealth;
    if (typeof data.marketReputation === 'number') this.marketReputation = data.marketReputation;
    if (typeof data.charisma === 'number') this.charisma = data.charisma;
    if (data.stageMetrics) this.stageMetrics = { ...this.stageMetrics, ...data.stageMetrics };
    if (data.lifestyle && this.lifestyle) this.lifestyle.importState(data.lifestyle);

    this.recalculateStats();
  }

  saveCareer() {
    try {
      if (typeof localStorage === 'undefined') return;
      const data = {
        isStarted: this.isStarted,
        isFinished: this.isFinished,
        name: this.name,
        gender: this.gender,
        degree: this.degree,
        avatar: this.avatar,
        skill: this.skill,
        integrity: this.integrity,
        networking: this.networking,
        wealth: this.personalWealth,
        personalWealth: this.personalWealth,
        energy: this.energy,
        stress: this.stress,
        socialPrestige: this.socialPrestige,
        marketReputation: this.marketReputation,
        charisma: this.charisma,
        currentStageIndex: this.currentStageIndex,
        currentEventIndex: this.currentEventIndex,
        acquiredPerks: this.acquiredPerks || [],
        decisionHistory: this.decisionHistory || [],
        activeDialogueState: this.activeDialogueState || null,
        relationships: this.relationships || {},
        stageMetrics: this.stageMetrics,
        lifestyle: this.lifestyle ? this.lifestyle.exportState() : null
      };
      localStorage.setItem('egyptian_bank_career', JSON.stringify(data));
      if (typeof window !== 'undefined' && window.cloudSaveService) {
        window.cloudSaveService.requestAutoSave();
      }
    } catch (e) {
      console.warn('LocalStorage saveCareer failed', e);
    }
  }

  loadCareer() {
    try {
      if (typeof localStorage === 'undefined') return;
      const saved = localStorage.getItem('egyptian_bank_career');
      if (saved) {
        const data = JSON.parse(saved);
        this.isStarted = data.isStarted || false;
        this.isFinished = data.isFinished || false;
        this.name = data.name || this.name;
        this.gender = data.gender || this.gender;
        this.degree = data.degree || this.degree;
        this.avatar = (this.gender === 'female') ? './assets/characters/player_female.jpg' : './assets/characters/player.jpg';
        this.skill = data.skill ?? this.skill;
        this.integrity = data.integrity ?? this.integrity;
        this.networking = data.networking ?? this.networking;
        this.personalWealth = data.personalWealth ?? data.wealth ?? this.personalWealth;
        this.energy = data.energy ?? this.energy;
        this.stress = data.stress ?? this.stress;
        this.socialPrestige = data.socialPrestige ?? this.socialPrestige;
        this.marketReputation = data.marketReputation ?? this.marketReputation;
        this.charisma = data.charisma ?? this.charisma;
        this.currentStageIndex = data.currentStageIndex || 0;
        this.currentEventIndex = data.currentEventIndex || 0;
        this.acquiredPerks = data.acquiredPerks || [];
        this.decisionHistory = data.decisionHistory || [];
        this.activeDialogueState = data.activeDialogueState || null;
        this.relationships = data.relationships || this.relationships;
        if (data.stageMetrics) this.stageMetrics = { ...this.stageMetrics, ...data.stageMetrics };
        if (data.lifestyle && this.lifestyle) this.lifestyle.importState(data.lifestyle);
        this.recalculateStats();
      }
    } catch (e) {
      console.warn('LocalStorage loadCareer failed', e);
    }
  }

  resetCareer() {
    super.resetCareer();
    this.personalWealth = 15000;
    this.stress = 20;
    this.socialPrestige = 10;
    this.charisma = 15;
    this.marketReputation = 35;
    this.stageMetrics = {
      transactionsCount: 0,
      cashDeficitTotal: 0,
      chequesInspected: 0,
      trainedTellers: 0,
      certificatesSoldValue: 0,
      creditFilesAnalyzed: 0,
      creditDefaultRate: 0,
      vipDepositsAttracted: 0,
      branchAnnualProfits: 0,
      performanceRating: 80
    };
    if (this.lifestyle) {
      this.lifestyle.ownedAssets = ['transit_public', 'apt_rental_popular', 'suit_graduate'];
      this.lifestyle.activeVehicle = 'transit_public';
      this.lifestyle.activeResidence = 'apt_rental_popular';
      this.lifestyle.activeWardrobe = 'suit_graduate';
      this.lifestyle.activeWatch = null;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('egyptian_bank_career');
    }
  }

  exportToTycoon() {
    const isFemale = this.gender === 'female';
    const startingCash = Math.max(100000, this.personalWealth + 50000);
    const title = this.getStageTitle();

    return {
      managerName: this.name,
      managerGender: this.gender,
      startingCash,
      specialization: 'sme',
      careerPerks: this.acquiredPerks || [],
      reputationBonus: Math.min(30, Math.round((this.integrity + this.socialPrestige + this.marketReputation) / 8)),
      summaryMsg: `تم تصعيد ${isFemale ? 'رئيسة' : 'رئيس'} مجلس الإدارة [${this.name}] لإطلاق إمبراطورية البنوك التجارية (Tycoon Mode) برأس مال ${startingCash.toLocaleString('ar-EG')} ج.م وسمعة مصرفية رائدة!`
    };
  }
}
