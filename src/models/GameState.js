/**
 * GameState - Core Banking Financial Engine with 6 Major Expansion Systems
 */
export class GameState {
  constructor() {
    this.isInitialized = false;

    // Founding Profile
    this.bankName = "بنك النيل للتنمية والتمويل";
    this.bankEmblem = "🏛️";
    this.managerName = "أحمد مصطفى";
    this.managerGender = "male";
    this.specialization = "sme";

    this.month = 1;
    this.year = 2026;

    // Starting Currency: 50,000 EGP Hardcore Bootstrap!
    this.treasuryCash = 50000;
    this.totalDeposits = 0;
    this.totalLoans = 0;

    // Rates
    this.depositAnnualRate = 12.0;
    this.lendingAnnualRate = 24.0;
    this.cbeReserveRatio = 14.0;
    this.reputation = 50;
    this.atmSpeedUpgraded = 0;
    this.vipLoungeUnlocked = false;

    // License Tiers
    this.licenseTiers = [
      { id: 1, name: 'مؤسسة تمويل متناهي الصغر', minDeposits: 0, desc: 'تمويل الحرفيين والأنشطة الصغيرة في الحي' },
      { id: 2, name: 'بنك ادخار وتنمية محلي', minDeposits: 250000, desc: 'تمويل المشروعات المتوسطة وشراء الصرافات الآلية' },
      { id: 3, name: 'بنك تجاري مرخص رسمياً', minDeposits: 2500000, desc: 'استيفاء رخصة البنك المركزي وافتتاح الفروع الإقليمية' },
      { id: 4, name: 'مجموعة مصرفية استثمارية كبرى', minDeposits: 20000000, desc: 'تمويل المشروعات القومية وبرج العاصمة الإدارية' }
    ];

    // History & Accounting
    this.history = [];
    this.lastMonthReport = null;

    // Subsystem instances
    this.loansManager = null;
    this.hrManager = null;
    this.branchesManager = null;
    this.eventsManager = null;
    this.investmentsManager = null;
    this.islamicBankingManager = null;
    this.cardsManager = null;
    this.complianceManager = null;
    this.csrManager = null;
    this.competitorsManager = null;
    this.instaPayManager = null;
    this.treasuryProductsManager = null;
    this.newsManager = null;
    this.fxManager = null;
    this.legalManager = null;
    this.trophiesManager = null;
    this.careerManager = null;
    this.bankRunManager = null;
    this.neoBankManager = null;
    this.executiveLifeManager = null;
    this.licensesManager = null;

    this.difficultyMode = 'realistic'; // 'casual' | 'realistic' | 'hardcore'
    this.gameMode = 'selection'; // 'selection' | 'career' | 'tycoon'
    this.careerPerks = [];
    this.dialogueSpeed = localStorage.getItem('bank_dialogue_speed') || 'normal';
    this.graphicsQuality = localStorage.getItem('bank_graphics_quality') || 'high';

    this.loadGame();
  }

  getManagerFormalTitle() {
    if (this.managerGender === 'female') {
      return `السيدة الأستاذة / ${this.managerName} - رئيسة مجلس الإدارة`;
    }
    return `السيد الأستاذ / ${this.managerName} - رئيس مجلس الإدارة`;
  }

  getCurrentTier() {
    if (this.licensesManager) {
      return this.licensesManager.getCurrentTierData();
    }
    for (let i = this.licenseTiers.length - 1; i >= 0; i--) {
      if (this.totalDeposits >= this.licenseTiers[i].minDeposits) {
        return this.licenseTiers[i];
      }
    }
    return this.licenseTiers[0];
  }

  getMonthName(monthNum) {
    const months = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    return months[(monthNum - 1) % 12];
  }

  getDateString() {
    return `${this.getMonthName(this.month)} ${this.year}`;
  }

  getKPIs() {
    const monthlyLendingRate = (this.lendingAnnualRate / 100) / 12;
    const monthlyDepositRate = (this.depositAnnualRate / 100) / 12;

    const interestIncome = this.totalLoans * monthlyLendingRate;

    // Deduct certificates and islamic deposits from base deposits so 12% is not charged twice
    const islamicDeposits = this.islamicBankingManager ? this.islamicBankingManager.islamicDeposits : 0;
    const certVolume = this.treasuryProductsManager ? this.treasuryProductsManager.getTotalCertificatesVolume() : 0;
    const baseDeposits = Math.max(0, this.totalDeposits - islamicDeposits - certVolume);

    const interestExpense = baseDeposits * monthlyDepositRate;
    const netInterestIncome = interestIncome - interestExpense;

    const ldr = this.totalDeposits > 0 ? (this.totalLoans / this.totalDeposits) * 100 : 0;
    const requiredReserve = (this.totalDeposits * (this.cbeReserveRatio / 100));
    const freeLiquidity = this.treasuryCash - requiredReserve;

    return {
      interestIncome: Math.round(interestIncome),
      interestExpense: Math.round(interestExpense),
      netInterestIncome: Math.round(netInterestIncome),
      ldr: ldr.toFixed(1),
      requiredReserve: Math.round(requiredReserve),
      freeLiquidity: Math.round(freeLiquidity)
    };
  }

  launchDepositCampaign() {
    const cost = 2000;
    if (this.treasuryCash < cost) {
      return { success: false, msg: 'السيولة بالخزينة لا تكفي لتكلفة الحملة (2,000 ج.م).' };
    }

    this.treasuryCash -= cost;
    const currentTier = this.getCurrentTier();
    let baseInflow = 20000 + Math.floor(Math.random() * 30000);
    if (currentTier.id >= 2) baseInflow *= 3;
    if (this.specialization === 'pr') baseInflow = Math.round(baseInflow * 1.3);

    this.totalDeposits += baseInflow;
    this.treasuryCash += baseInflow;
    this.reputation = Math.min(100, this.reputation + 3);
    this.saveGame();

    return {
      success: true,
      msg: `نجحت الحملة الترويجية في الحي! تم جذب ${baseInflow.toLocaleString('ar-EG')} ج.م ودائع جديدة من أهالي وتجار المنطقة.`
    };
  }

  endMonth() {
    const kpis = this.getKPIs();

    // 0. Macroeconomic News
    const monthlyNews = this.newsManager ? this.newsManager.generateMonthlyNews() : null;

    // 1. Incomes
    const loanInterest = kpis.interestIncome;
    const branchFees = this.branchesManager ? this.branchesManager.calculateMonthlyFees() : 0;
    const cardFees = this.cardsManager ? this.cardsManager.calculateMonthlyRevenue() : 0;
    const stockDividends = this.investmentsManager ? this.investmentsManager.updateMonthlyMarket() : 0;
    const csrReturns = this.csrManager ? this.csrManager.calculateMonthlyReturns() : 0;
    const instaPayProcess = this.instaPayManager ? this.instaPayManager.processMonthly() : { revenue: 0, cost: 0, downtime: false };
    const fxProcess = this.fxManager ? this.fxManager.processMonthly() : { usdReserves: 0, valuationEGP: 0 };
    
    const totalRevenues = loanInterest + branchFees + cardFees + stockDividends + csrReturns + instaPayProcess.revenue;

    // 2. Expenses
    const depositInterest = kpis.interestExpense;
    const salaries = this.hrManager ? this.hrManager.calculateTotalSalaries() : 0;
    const branchOpEx = this.branchesManager ? this.branchesManager.calculateMonthlyOpEx() : 1500;
    const vendorOpEx = this.vendorsManager ? this.vendorsManager.getTotalMonthlyExpenses() : 0;
    const islamicProcess = this.islamicBankingManager ? this.islamicBankingManager.processMonthly() : { profitPaid: 0 };
    const treasuryProcess = this.treasuryProductsManager ? this.treasuryProductsManager.processMonthly() : { totalCertInterestPaid: 0, newCertInflow: 0 };
    const badDebtLoss = this.loansManager ? this.loansManager.calculateMonthlyDefaults() : 0;
    
    // Operational cash expenses (bad debt is written off from totalLoans, not deducted from cash vault)
    const totalExpenses = depositInterest + salaries + branchOpEx + vendorOpEx + islamicProcess.profitPaid + instaPayProcess.cost + treasuryProcess.totalCertInterestPaid;

    // 3. Net Monthly Profit
    const netProfit = totalRevenues - totalExpenses;
    this.treasuryCash += netProfit;

    // 4. Natural Deposit Growth / Decay (influenced by difficulty mode)
    const diffMultipliers = {
      casual: 1.25,
      realistic: 1.0,
      hardcore: 0.75
    };
    const difficultyDepositFactor = diffMultipliers[this.difficultyMode] || 1.0;

    let netDepositChange = 0;
    if (this.totalDeposits > 0) {
      const reputationFactor = (this.reputation - 50) / 100;
      const branchAttraction = this.branchesManager ? this.branchesManager.getDepositMultiplier() : 1.0;
      const cleaningBonus = this.vendorsManager ? (1 + this.vendorsManager.getCleaningSatisfactionFactor()) : 1.0;
      const rawDepositChange = Math.round((this.totalDeposits * 0.03 * reputationFactor) * branchAttraction * cleaningBonus * difficultyDepositFactor);
      
      const previousDeposits = this.totalDeposits;
      this.totalDeposits = Math.max(0, this.totalDeposits + rawDepositChange);
      // Ensure netDepositChange reflects the exact actual change in deposits
      netDepositChange = this.totalDeposits - previousDeposits;
      
      if (netDepositChange < 0) {
        // Withdrawals cannot drain more cash than actual deposits lost
        const actualWithdrawal = Math.min(this.treasuryCash, Math.abs(netDepositChange));
        this.treasuryCash = Math.max(0, this.treasuryCash - actualWithdrawal);
      } else {
        this.treasuryCash += netDepositChange;
      }
    }

    // 5. Principal Recovered
    const principalRecovered = this.loansManager ? this.loansManager.collectMonthlyPrincipals() : 0;
    this.treasuryCash += principalRecovered;
    this.totalLoans = Math.max(0, this.totalLoans - principalRecovered);

    // 6. Update Competitors & Market Share
    if (this.competitorsManager) {
      this.competitorsManager.updateMonthlyMarketShare();
    }

    // 7. Check Periodic CBE Audit
    let cbeAuditReport = null;
    if (this.complianceManager) {
      cbeAuditReport = this.complianceManager.checkPeriodicAudit();
    }

    // 8. Check Achievements / Trophies
    const unlockedTrophies = this.trophiesManager ? this.trophiesManager.checkAchievements() : [];

    // 9. Bank Run & Liquidity Crisis Process
    let bankRunReport = null;
    let liquidityCrunchAlert = null;
    if (this.totalDeposits >= 100000) {
      const liquidityRatio = this.treasuryCash / this.totalDeposits;
      if (liquidityRatio < 0.02) {
        if (this.bankRunManager && !this.bankRunManager.isActive) {
          this.bankRunManager.triggerBankRun('عجز سيولة حاد: هبوط رصيد الخزينة دون 2% من إجمالي ودائع العملاء!');
          liquidityCrunchAlert = '🚨 أزمة سيولة حرجة (Critical Crunch): انهيار السيولة فجّر هجوم المودعين!';
        }
      } else if (liquidityRatio < 0.05) {
        this.reputation = Math.max(10, this.reputation - 4);
        liquidityCrunchAlert = '⚠️ إنذار ضغط سيولة (Liquidity Crunch): نسبة السيولة بالخزينة أقل من 5%! بادر بتدبير كاش سريع.';
      }
    }

    if (this.bankRunManager) {
      bankRunReport = this.bankRunManager.processMonth();
    }

    // 10. Neo-Bank Digital Growth Process
    let neoBankReport = null;
    if (this.neoBankManager) {
      neoBankReport = this.neoBankManager.processMonth();
    }

    // 11. Compliance & AML Suspicious Transactions Check
    let amlReport = null;
    if (this.complianceManager) {
      amlReport = this.complianceManager.processMonthlyAML();
    }

    // 12. Executive Life & Personal Wellbeing Process
    let executiveLifeReport = null;
    if (this.executiveLifeManager) {
      executiveLifeReport = this.executiveLifeManager.processMonth(netProfit);
      const burnout = this.executiveLifeManager.getBurnoutPenalty();
      if (burnout.active && this.hrManager && Array.isArray(this.hrManager.staff)) {
        this.hrManager.staff.forEach(s => {
          s.morale = Math.max(10, (s.morale || 70) - 2);
        });
      }
    }

    // Save report
    this.lastMonthReport = {
      monthStr: this.getDateString(),
      loanInterest,
      branchFees,
      cardFees,
      stockDividends,
      instaPayRevenue: instaPayProcess.revenue,
      totalRevenues,
      depositInterest,
      salaries,
      branchOpEx,
      vendorOpEx,
      badDebtLoss,
      instaPayCost: instaPayProcess.cost,
      certInterestPaid: treasuryProcess.totalCertInterestPaid,
      totalExpenses,
      netProfit,
      netDepositChange,
      principalRecovered,
      treasuryCashAfter: this.treasuryCash,
      cbeAuditReport,
      monthlyNews,
      instaPayDowntime: instaPayProcess.downtime,
      unlockedTrophies,
      bankRunReport,
      neoBankReport,
      executiveLifeReport,
      liquidityCrunchAlert,
      amlReport,
      difficultyMode: this.difficultyMode
    };

    this.history.push({
      dateStr: this.getDateString(),
      profit: netProfit,
      deposits: this.totalDeposits,
      loans: this.totalLoans,
      cash: this.treasuryCash
    });

    this.month++;
    if (this.month > 12) {
      this.month = 1;
      this.year++;
    }

    let dilemma = null;
    if (this.eventsManager && this.month > 2) {
      dilemma = this.eventsManager.checkMonthlyEvents(this);
    }

    if (this.loansManager) {
      this.loansManager.generateMonthlyApplications();
    }

    // Award Career XP for monthly management
    if (this.licensesManager && typeof this.licensesManager.addXP === 'function') {
      let xpAward = 75; // baseline monthly operational XP
      if (netProfit > 0) {
        xpAward += 150;
        if (netProfit > 100000) xpAward += 75;
      }
      this.licensesManager.addXP(xpAward, 'إدارة عمليات الشهر المالي');
    }

    this.saveGame();

    return {
      report: this.lastMonthReport,
      dilemma: dilemma,
      audit: cbeAuditReport
    };
  }

  applyCareerBootstrap(data) {
    if (!data) return;
    this.managerName = data.managerName || this.managerName;
    this.managerGender = data.managerGender || this.managerGender;
    this.treasuryCash = data.startingCash || 50000;
    this.specialization = data.specialization || this.specialization;
    this.careerPerks = data.careerPerks || [];
    this.reputation = Math.min(100, this.reputation + (data.reputationBonus || 0));
    this.gameMode = 'tycoon';
    this.isInitialized = true;
    this.saveGame();
  }

  calculateOfflineEarnings() {
    if (!this.isInitialized) return null;
    const lastTime = this.lastSaveTimestamp || Date.now();
    const now = Date.now();
    const diffMs = now - lastTime;
    const elapsedMinutes = Math.floor(diffMs / 60000);

    // Trigger only if away for at least 2 minutes
    if (elapsedMinutes < 2) return null;

    const cappedMinutes = Math.min(1440, elapsedMinutes); // Max 24 hours
    // Revenue rate based on bank deposits and baseline operations
    const ratePerMinute = Math.max(35, Math.floor((this.totalDeposits * 0.00008) + 35));
    const baseEarnings = Math.min(50000, cappedMinutes * ratePerMinute);

    return {
      elapsedMinutes,
      cappedMinutes,
      baseEarnings,
      formattedEarnings: baseEarnings.toLocaleString(),
      formattedTime: elapsedMinutes >= 60
        ? `${Math.floor(elapsedMinutes / 60)} ساعة و ${elapsedMinutes % 60} دقيقة`
        : `${elapsedMinutes} دقيقة`
    };
  }

  claimOfflineEarnings(multiplier = 1) {
    const offline = this.calculateOfflineEarnings();
    if (!offline) return 0;

    const earned = offline.baseEarnings * multiplier;
    this.treasuryCash += earned;
    this.lastSaveTimestamp = Date.now();

    this.history.unshift({
      month: this.month,
      year: this.year,
      type: 'أرباح غياب',
      desc: `تحصيل عوائد استثمار وتدفقات غياب (${offline.formattedTime}): +${earned.toLocaleString()} ج.م`,
      amount: earned
    });

    this.saveGame();
    return earned;
  }

  saveGame() {
    try {
      this.lastSaveTimestamp = Date.now();
      const data = {
        isInitialized: this.isInitialized,
        gameMode: this.gameMode,
        difficultyMode: this.difficultyMode,
        careerPerks: this.careerPerks,
        bankName: this.bankName,
        bankEmblem: this.bankEmblem,
        managerName: this.managerName,
        managerGender: this.managerGender,
        specialization: this.specialization,
        month: this.month,
        year: this.year,
        treasuryCash: this.treasuryCash,
        totalDeposits: this.totalDeposits,
        totalLoans: this.totalLoans,
        reputation: this.reputation,
        atmSpeedUpgraded: this.atmSpeedUpgraded,
        vipLoungeUnlocked: this.vipLoungeUnlocked,
        history: this.history,
        lastSaveTimestamp: this.lastSaveTimestamp,
        subsystems: {
          loans: this.loansManager ? this.loansManager.getState() : null,
          branches: this.branchesManager ? this.branchesManager.getState() : null,
          hr: this.hrManager ? this.hrManager.getState() : null,
          events: this.eventsManager ? this.eventsManager.getState() : null,
          executiveLife: this.executiveLifeManager ? this.executiveLifeManager.getState() : null,
          investments: this.investmentsManager ? this.investmentsManager.getState() : null,
          islamic: this.islamicBankingManager ? this.islamicBankingManager.getState() : null,
          cards: this.cardsManager ? this.cardsManager.getState() : null,
          compliance: this.complianceManager ? this.complianceManager.getState() : null,
          csr: this.csrManager ? this.csrManager.getState() : null,
          competitors: this.competitorsManager ? this.competitorsManager.getState() : null,
          instaPay: this.instaPayManager ? this.instaPayManager.getState() : null,
          treasury: this.treasuryProductsManager ? this.treasuryProductsManager.getState() : null,
          news: this.newsManager ? this.newsManager.getState() : null,
          fx: this.fxManager ? this.fxManager.getState() : null,
          legal: this.legalManager ? this.legalManager.getState() : null,
          trophies: this.trophiesManager ? this.trophiesManager.getState() : null,
          bankRun: this.bankRunManager ? this.bankRunManager.getState() : null,
          neoBank: this.neoBankManager ? this.neoBankManager.getState() : null,
          vendors: this.vendorsManager ? this.vendorsManager.getState() : null,
          licenses: this.licensesManager ? this.licensesManager.getState() : null
        }
      };
      localStorage.setItem('egyptian_bank_saved', JSON.stringify(data));
      this.saveBackup(data);
      if (typeof window !== 'undefined' && window.cloudSaveService) {
        window.cloudSaveService.requestAutoSave();
      }
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  saveBackup(data) {
    try {
      const existingStr = localStorage.getItem('egyptian_bank_backups');
      const backups = existingStr ? JSON.parse(existingStr) : [];
      backups.unshift({
        timestamp: Date.now(),
        dateStr: this.getDateString(),
        data: data
      });
      if (backups.length > 5) backups.length = 5;
      localStorage.setItem('egyptian_bank_backups', JSON.stringify(backups));
    } catch (e) {
      console.warn('Backup save failed', e);
    }
  }

  recoverLostProgress() {
    try {
      const existingStr = localStorage.getItem('egyptian_bank_backups');
      if (!existingStr) return { success: false, message: 'لم يتم العثور على نسخ احتياطية مسجلة في هذا المتصفح.' };
      const backups = JSON.parse(existingStr);
      if (!Array.isArray(backups) || backups.length === 0) {
        return { success: false, message: 'لا توجد نسخ احتياطية متوفرة للاسترجاع.' };
      }

      const latest = backups[0];
      if (!latest || !latest.data) {
        return { success: false, message: 'النسخة الاحتياطية فارغة أو تالفة.' };
      }

      localStorage.setItem('egyptian_bank_saved', JSON.stringify(latest.data));
      this.loadGame();
      this.loadSubsystemsState();
      return {
        success: true,
        message: `تم استرجاع النسخة الاحتياطية بنجاح! تاريخ الحفظ: ${latest.dateStr || new Date(latest.timestamp).toLocaleDateString('ar-EG')}`,
        timestamp: latest.timestamp
      };
    } catch (e) {
      return { success: false, message: 'حدث خطأ أثناء استرجاع النسخة الاحتياطية: ' + e.message };
    }
  }

  auditAndRepairLiquidity() {
    const issuesFound = [];
    let fixed = false;

    // 1. Check Treasury Cash
    if (isNaN(this.treasuryCash) || this.treasuryCash === null || this.treasuryCash === undefined) {
      issuesFound.push('تم العثور على قيمة غير معرفة (NaN) في رصيد الخزنة وتم تصحيحها إلى 50,000 ج.م.');
      this.treasuryCash = 50000;
      fixed = true;
    } else if (this.treasuryCash < 0) {
      issuesFound.push(`رصيد الخزنة كان بالسالب (${Math.round(this.treasuryCash).toLocaleString('ar-EG')} ج.م)، تمت إعادة موازنته لمنع الخلل المحاسبي.`);
      this.treasuryCash = 0;
      fixed = true;
    }

    // 2. Check Total Deposits
    if (isNaN(this.totalDeposits) || this.totalDeposits < 0) {
      issuesFound.push('خلل في إجمالي حسابات المودعين، تمت إعادة تعيينها بصورة سليمة.');
      this.totalDeposits = 0;
      fixed = true;
    }

    // 3. Check Total Loans vs Active Loans
    if (this.loansManager && Array.isArray(this.loansManager.activeLoans)) {
      const calculatedActiveLoans = this.loansManager.activeLoans.reduce((sum, l) => sum + (l.remainingBalance || l.amount || 0), 0);
      if (Math.abs(calculatedActiveLoans - this.totalLoans) > 10) {
        issuesFound.push(`عدم تطابق في دفتر القروض: الدفتر يسجل ${Math.round(this.totalLoans).toLocaleString('ar-EG')} ج.م بينما القروض الفعلية ${Math.round(calculatedActiveLoans).toLocaleString('ar-EG')} ج.م. تمت المطابقة والتصليح.`);
        this.totalLoans = calculatedActiveLoans;
        fixed = true;
      }
    } else if (isNaN(this.totalLoans) || this.totalLoans < 0) {
      this.totalLoans = 0;
      issuesFound.push('تمت إعادة موازنة رصيد دفتر القروض.');
      fixed = true;
    }

    // 4. Check Reputation
    if (isNaN(this.reputation) || this.reputation < 0 || this.reputation > 100) {
      this.reputation = Math.max(0, Math.min(100, isNaN(this.reputation) ? 50 : this.reputation));
      issuesFound.push('تمت إعادة ضبط مؤشر سمعة البنك ضمن النطاق النظامي.');
      fixed = true;
    }

    // 5. Check Investments Manager sanity
    if (this.investmentsManager && Array.isArray(this.investmentsManager.stocks)) {
      this.investmentsManager.stocks.forEach(stk => {
        if (isNaN(stk.sharesOwned) || stk.sharesOwned < 0) {
          stk.sharesOwned = 0;
          issuesFound.push(`تم تصحيح توازن محفظة أسهم ${stk.name}.`);
          fixed = true;
        }
      });
    }

    // Save state after repair
    this.saveGame();

    return {
      status: fixed ? 'repaired' : 'healthy',
      issues: issuesFound,
      treasuryCash: this.treasuryCash,
      totalDeposits: this.totalDeposits,
      totalLoans: this.totalLoans,
      summary: fixed
        ? `تم تدقيق وتصليح دفاتر السيولة بنجاح! تم رصد ومعالجة ${issuesFound.length} ملاحظة محاسبية.`
        : 'دفاتر البنك متطابقة تماماً والسيولة النقدية سليمة 100% ولا توجد أي فروقات محاسبية.'
    };
  }

  exportSaveCode() {
    this.saveGame();
    const savedStr = localStorage.getItem('egyptian_bank_saved') || '{}';
    const utf8Bytes = new TextEncoder().encode(savedStr);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const b64 = btoa(binary);
    return `HAROUN_BANK_v1_${b64}`;
  }

  importSaveCode(code) {
    if (!code || typeof code !== 'string') {
      return { success: false, message: 'كود الحفظ غير صالح أو فارغ.' };
    }
    try {
      const clean = code.trim().replace(/^HAROUN_BANK_v1_/, '');
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const jsonStr = new TextDecoder().decode(bytes);
      const data = JSON.parse(jsonStr);

      if (!data || typeof data !== 'object') {
        return { success: false, message: 'صيغة ملف الحفظ غير متوافقة.' };
      }

      localStorage.setItem('egyptian_bank_saved', JSON.stringify(data));
      this.loadGame();
      this.loadSubsystemsState();
      return { success: true, message: 'تم استيراد واسترجاع بيانات البنك بنجاح!' };
    } catch (e) {
      return { success: false, message: 'فشل فك تشفير كود الحفظ: ' + e.message };
    }
  }

  setDialogueSpeed(speed) {
    const valid = ['relaxed', 'normal', 'fast'].includes(speed) ? speed : 'normal';
    this.dialogueSpeed = valid;
    localStorage.setItem('bank_dialogue_speed', valid);
  }

  setGraphicsQuality(quality) {
    const valid = ['economy', 'medium', 'high'].includes(quality) ? quality : 'high';
    this.graphicsQuality = valid;
    localStorage.setItem('bank_graphics_quality', valid);
  }

  loadGame() {
    try {
      const saved = localStorage.getItem('egyptian_bank_saved');
      if (saved) {
        const data = JSON.parse(saved);
        this.isInitialized = data.isInitialized || false;
        this.gameMode = data.gameMode || (this.isInitialized ? 'tycoon' : 'selection');
        this.difficultyMode = data.difficultyMode || 'realistic';
        this.careerPerks = data.careerPerks || [];
        this.bankName = data.bankName || this.bankName;
        this.bankEmblem = data.bankEmblem || this.bankEmblem;
        this.managerName = data.managerName || this.managerName;
        this.managerGender = data.managerGender || this.managerGender;
        this.specialization = data.specialization || this.specialization;
        this.month = data.month || 1;
        this.year = data.year || 2026;
        this.treasuryCash = typeof data.treasuryCash === 'number' ? data.treasuryCash : 50000;
        this.totalDeposits = typeof data.totalDeposits === 'number' ? data.totalDeposits : 0;
        this.totalLoans = typeof data.totalLoans === 'number' ? data.totalLoans : 0;
        this.reputation = data.reputation || 50;
        this.atmSpeedUpgraded = typeof data.atmSpeedUpgraded === 'number' ? data.atmSpeedUpgraded : 0;
        this.vipLoungeUnlocked = !!data.vipLoungeUnlocked;
        this.history = data.history || [];
        this.lastSaveTimestamp = data.lastSaveTimestamp || Date.now();
      } else {
        this.lastSaveTimestamp = Date.now();
      }
    } catch (e) {
      console.warn('LocalStorage load failed', e);
    }
  }

  setDifficultyMode(mode) {
    if (['casual', 'realistic', 'hardcore'].includes(mode)) {
      this.difficultyMode = mode;
      this.saveGame();
    }
  }

  loadSubsystemsState() {
    try {
      const saved = localStorage.getItem('egyptian_bank_saved');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (!data || !data.subsystems) return;
      const sub = data.subsystems;

      if (this.loansManager && sub.loans) this.loansManager.loadState(sub.loans);
      if (this.branchesManager && sub.branches) this.branchesManager.loadState(sub.branches);
      if (this.hrManager && sub.hr) this.hrManager.loadState(sub.hr);
      if (this.eventsManager && sub.events) this.eventsManager.loadState(sub.events);
      if (this.executiveLifeManager && sub.executiveLife) this.executiveLifeManager.loadState(sub.executiveLife);
      if (this.investmentsManager && sub.investments) this.investmentsManager.loadState(sub.investments);
      if (this.islamicBankingManager && sub.islamic) this.islamicBankingManager.loadState(sub.islamic);
      if (this.cardsManager && sub.cards) this.cardsManager.loadState(sub.cards);
      if (this.complianceManager && sub.compliance) this.complianceManager.loadState(sub.compliance);
      if (this.csrManager && sub.csr) this.csrManager.loadState(sub.csr);
      if (this.competitorsManager && sub.competitors) this.competitorsManager.loadState(sub.competitors);
      if (this.instaPayManager && sub.instaPay) this.instaPayManager.loadState(sub.instaPay);
      if (this.treasuryProductsManager && sub.treasury) this.treasuryProductsManager.loadState(sub.treasury);
      if (this.newsManager && sub.news) this.newsManager.loadState(sub.news);
      if (this.fxManager && sub.fx) this.fxManager.loadState(sub.fx);
      if (this.legalManager && sub.legal) this.legalManager.loadState(sub.legal);
      if (this.trophiesManager && sub.trophies) this.trophiesManager.loadState(sub.trophies);
      if (this.bankRunManager && sub.bankRun) this.bankRunManager.loadState(sub.bankRun);
      if (this.neoBankManager && sub.neoBank) this.neoBankManager.loadState(sub.neoBank);
      if (this.vendorsManager && sub.vendors) this.vendorsManager.loadState(sub.vendors);
      if (this.licensesManager && sub.licenses) this.licensesManager.loadState(sub.licenses);
    } catch (e) {
      console.warn('loadSubsystemsState failed', e);
    }
  }

  resetGame() {
    localStorage.removeItem('egyptian_bank_saved');
    localStorage.removeItem('egyptian_bank_career');
    localStorage.removeItem('egyptian_bank_backups');
    localStorage.removeItem('egyptian_bank_offline_last');
    window.location.reload();
  }
}

