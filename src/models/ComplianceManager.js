/**
 * ComplianceManager - Central Bank of Egypt (CBE) audits, CAMELS rating,
 * and Anti-Money Laundering (AML) Suspicious Transaction Investigation Engine
 */
export class ComplianceManager {
  constructor(gameState) {
    this.state = gameState;
    this.lastAuditAbsoluteMonth = 0;
    this.lastAuditReport = null;
    this.currentCamelsScore = 4; // 1 to 5 stars

    // Anti-Money Laundering (AML) System
    this.amlRiskScore = 0; // 0 to 100 (High score = high risk of CBE inspection raid & sanction)
    this.pendingAMLTransactions = [];
    this.amlHistory = [];

    // Generate initial transaction pool
    this.initAMLPool();
  }

  initAMLPool() {
    this.amlPool = [
      {
        id: 'aml_car_merchant',
        clientName: 'معرض الأهرام لتجارة السيارات المستوردة',
        amount: 3500000,
        feeRate: 6.0, // 6% fee = 210,000 EGP
        riskWeight: 25,
        suspectReason: 'إيداع كاش ضخم في أكياس بلاستيكية دون تقديم فواتير ضريبية إلكترونية أو مستندات استيراد جمركية رسمية.',
        origin: 'تجارة حرة غير مقيدة بدون حساب بنكي رسمي',
        badge: '🚨 إيداع كاش مشبوه'
      },
      {
        id: 'aml_crypto_broker',
        clientName: 'مؤسسة النور للاستشارات البرمجية والشحن',
        amount: 5200000,
        feeRate: 7.5, // 7.5% fee = 390,000 EGP
        riskWeight: 35,
        suspectReason: 'طلب تحويل بنكي دولي عاجل إلى حساب مجهول بقبرص بدون سجل تجاري مطابق أو عقود توريد موثقة.',
        origin: 'تداول عملات وسوق موازي خارجي',
        badge: '🌐 تحويل خارجي مشبوه'
      },
      {
        id: 'aml_gold_scrap',
        clientName: 'ورشة الفردوس لتجارة الذهب والكسر بالصاغة',
        amount: 2800000,
        feeRate: 5.5, // 5.5% fee = 154,000 EGP
        riskWeight: 20,
        suspectReason: 'إيداعات نقدية متكررة تحت سقف الإبلاغ اليومي (Structuring) لتفادي تنبيهات منظومة البنك المركزي.',
        origin: 'تجزئة نقدية بدون إثبات هوية المشترين',
        badge: '🪙 معاملات تجنب إبلاغ'
      },
      {
        id: 'aml_realestate_cash',
        clientName: 'شركة الباشا للمقاولات والتطوير غير المقيد',
        amount: 7000000,
        feeRate: 8.0, // 8% fee = 560,000 EGP
        riskWeight: 40,
        suspectReason: 'إيداع نقدي غير مسبوق لشراء شهادات إيداع وكسرها بعد شهر واحد لتحويلها لحساب خارجي نظيف.',
        origin: 'تبييض أموال نقدية سريعة',
        badge: '🏢 شبهة غسل أموال عقاري'
      }
    ];

    if (this.pendingAMLTransactions.length === 0) {
      this.pendingAMLTransactions.push(this.amlPool[0]);
    }
  }

  processMonthlyAML() {
    // Generate new suspicious transaction if pending is low
    if (this.pendingAMLTransactions.length < 2 && Math.random() > 0.35) {
      const candidates = this.amlPool.filter(c => !this.pendingAMLTransactions.some(p => p.clientName === c.clientName));
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        this.pendingAMLTransactions.push({
          ...pick,
          id: pick.id + '_' + Date.now().toString().slice(-4)
        });
      }
    }

    return {
      pendingCount: this.pendingAMLTransactions.length,
      amlRiskScore: this.amlRiskScore
    };
  }

  passSuspiciousTransaction(txId) {
    const idx = this.pendingAMLTransactions.findIndex(t => t.id === txId);
    if (idx === -1) return { success: false, msg: 'المعاملة غير موجودة.' };

    const tx = this.pendingAMLTransactions[idx];
    const feeEGP = Math.round(tx.amount * (tx.feeRate / 100));

    // 1. Credit bank cash with fee and deposit inflow
    this.state.treasuryCash += (tx.amount + feeEGP);
    this.state.totalDeposits += tx.amount;

    // 2. Elevate AML Risk Score
    this.amlRiskScore = Math.min(100, this.amlRiskScore + tx.riskWeight);
    this.state.reputation = Math.max(15, this.state.reputation - 2);

    // 3. Impact Executive Integrity
    if (this.state.executiveLifeManager) {
      this.state.executiveLifeManager.integrity = Math.max(10, this.state.executiveLifeManager.integrity - 12);
      this.state.executiveLifeManager.stress = Math.min(100, this.state.executiveLifeManager.stress + 8);
    }

    this.amlHistory.unshift({
      date: this.state.getDateString(),
      action: 'pass',
      clientName: tx.clientName,
      amount: tx.amount,
      feeEGP: feeEGP,
      riskAdded: tx.riskWeight
    });

    this.pendingAMLTransactions.splice(idx, 1);
    this.state.saveGame();

    return {
      success: true,
      feeEarned: feeEGP,
      msg: `تم تمرير المعاملة لحساب البنك! حصدت الخزينة عمولة استثنائية بقيمة ${feeEGP.toLocaleString('ar-EG')} ج.م 💰، ولكن ارتفع مؤشر مخاطر غسل الأموال إلى ${this.amlRiskScore}% ⚠️.`
    };
  }

  freezeAndReportAML(txId) {
    const idx = this.pendingAMLTransactions.findIndex(t => t.id === txId);
    if (idx === -1) return { success: false, msg: 'المعاملة غير موجودة.' };

    const tx = this.pendingAMLTransactions[idx];

    // Mitigate AML Risk
    this.amlRiskScore = Math.max(0, this.amlRiskScore - 15);
    this.state.reputation = Math.min(100, this.state.reputation + 5);

    if (this.state.executiveLifeManager) {
      this.state.executiveLifeManager.integrity = Math.min(100, this.state.executiveLifeManager.integrity + 8);
      this.state.executiveLifeManager.stress = Math.max(0, this.state.executiveLifeManager.stress - 5);
    }

    this.amlHistory.unshift({
      date: this.state.getDateString(),
      action: 'freeze_reported',
      clientName: tx.clientName,
      amount: tx.amount,
      feeEGP: 0,
      riskAdded: -15
    });

    this.pendingAMLTransactions.splice(idx, 1);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم تجميد الحساب وإرسال إخطار فوري لوحدة مكافحة غسل الأموال وتمويل الإرهاب المصرية 🛡️! أشاد البنك المركزي بيقظة البنك الرقابية وارتفعت سمعتك المصرفية.`
    };
  }

  // Run audit every 6 months
  checkPeriodicAudit() {
    const currentAbsoluteMonth = (this.state.year * 12) + this.state.month;
    const monthsSinceAudit = currentAbsoluteMonth - this.lastAuditAbsoluteMonth;
    if (monthsSinceAudit >= 6 || this.lastAuditAbsoluteMonth === 0) {
      return this.runCBEAudit();
    }
    return null;
  }

  runCBEAudit() {
    this.lastAuditAbsoluteMonth = (this.state.year * 12) + this.state.month;
    const kpis = this.state.getKPIs();

    // 1. C - Capital Adequacy
    let cScore = 3;
    if (this.state.treasuryCash > 500000) cScore = 5;
    else if (this.state.treasuryCash > 100000) cScore = 4;
    else if (this.state.treasuryCash < 15000) cScore = 2;

    // 2. A - Asset Quality
    let aScore = 4;
    const defaults = this.state.loansManager.defaultedHistory.length;
    if (defaults === 0) aScore = 5;
    else if (defaults > 3) aScore = 2;

    // 3. M - Management
    let mScore = 3;
    if (this.state.hrManager) {
      if (this.state.hrManager.trainingLevel >= 3) mScore = 5;
      else if (this.state.hrManager.morale > 80) mScore = 4;
    }

    // 4. E - Earnings
    let eScore = 3;
    if (this.state.lastMonthReport && this.state.lastMonthReport.netProfit > 0) eScore = 5;
    else if (this.state.lastMonthReport && this.state.lastMonthReport.netProfit < 0) eScore = 2;

    // 5. L - Liquidity
    let lScore = 3;
    if (kpis.freeLiquidity > 0) lScore = 5;
    else lScore = 1;

    // 6. S - Sensitivity & AML Compliance
    let sScore = 3;
    if (this.amlRiskScore > 50) {
      sScore = 1; // Heavy sanction for dirty money
    } else if (this.amlRiskScore > 25) {
      sScore = 2;
    } else if (this.state.hrManager && this.state.hrManager.staffCategories.compliance.count >= 1) {
      sScore = 5;
    }

    const avgScore = (cScore + aScore + mScore + eScore + lScore + sScore) / 6;
    this.currentCamelsScore = Math.max(1, Math.min(5, Math.round(avgScore)));

    let evaluation = '';
    let penaltyOrBonus = 0;

    // AML Raid Penalty
    let amlSanctionNote = '';
    if (this.amlRiskScore >= 40) {
      const amlFine = Math.min(this.state.treasuryCash, 180000);
      this.state.treasuryCash = Math.max(0, this.state.treasuryCash - amlFine);
      this.state.reputation = Math.max(15, this.state.reputation - 12);
      this.amlRiskScore = Math.max(0, this.amlRiskScore - 30); // post-raid clearance
      amlSanctionNote = `🚨 تم رصد ثغرات غسل أموال! فرض البنك المركزي غرامة امتثال بقيمة ${amlFine.toLocaleString('ar-EG')} ج.م وتخفيض فوري للتصنيف.`;
    }

    if (this.currentCamelsScore >= 4 && !amlSanctionNote) {
      evaluation = 'امتياز في السلامة المالية والالتزام بمعايير البنك المركزي المصري.';
      this.state.reputation = Math.min(100, this.state.reputation + 6);
      penaltyOrBonus = 15000;
      this.state.treasuryCash += penaltyOrBonus;
    } else if (this.currentCamelsScore === 3 && !amlSanctionNote) {
      evaluation = 'أداء مرضي ومستقر، مع توصية بزيادة سيولة الخزينة وتعزيز الكوادر الرقابية.';
    } else {
      evaluation = amlSanctionNote || 'إنذار رقابي: انخفاض نسب السيولة وارتفاع مخاطر الامتثال. تم فرض غرامة.';
      if (!amlSanctionNote) {
        penaltyOrBonus = -12000;
        this.state.treasuryCash = Math.max(0, this.state.treasuryCash + penaltyOrBonus);
        this.state.reputation = Math.max(20, this.state.reputation - 8);
      }
    }

    this.lastAuditReport = {
      date: this.state.getDateString(),
      cScore, aScore, mScore, eScore, lScore, sScore,
      overallStars: this.currentCamelsScore,
      evaluation,
      penaltyOrBonus,
      amlRiskScore: this.amlRiskScore,
      amlSanctionNote
    };

    return this.lastAuditReport;
  }

  getState() {
    return {
      lastAuditAbsoluteMonth: this.lastAuditAbsoluteMonth,
      lastAuditReport: this.lastAuditReport,
      currentCamelsScore: this.currentCamelsScore,
      amlRiskScore: this.amlRiskScore,
      pendingAMLTransactions: this.pendingAMLTransactions,
      amlHistory: this.amlHistory
    };
  }

  loadState(data) {
    if (!data) return;
    if (typeof data.lastAuditAbsoluteMonth === 'number') {
      this.lastAuditAbsoluteMonth = data.lastAuditAbsoluteMonth;
    }
    if (data.lastAuditReport) {
      this.lastAuditReport = data.lastAuditReport;
    }
    if (typeof data.currentCamelsScore === 'number') {
      this.currentCamelsScore = data.currentCamelsScore;
    }
    if (typeof data.amlRiskScore === 'number') {
      this.amlRiskScore = data.amlRiskScore;
    }
    if (Array.isArray(data.pendingAMLTransactions)) {
      this.pendingAMLTransactions = data.pendingAMLTransactions;
    }
    if (Array.isArray(data.amlHistory)) {
      this.amlHistory = data.amlHistory;
    }
  }
}
