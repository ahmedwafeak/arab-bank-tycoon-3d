/**
 * BankRunManager - Manages bank run panic, sudden liquidity drainage,
 * Central Bank of Egypt emergency discount window, and market stabilization measures.
 */
export class BankRunManager {
  constructor(gameState) {
    this.state = gameState;

    this.isActive = false;
    this.panicLevel = 0; // 0% to 100%
    this.crisisMonth = 0;
    this.initialDepositRun = 0;
    this.totalDrainedDeposits = 0;

    // Crisis Resolution Countermeasures
    this.cbeEmergencyLoan = 0; // Balance owed to CBE
    this.cbeLoanInterestRate = 28.0; // Penal corridor rate (28% annual)
    this.dailyWithdrawalLimitActive = false; // Cap cash withdrawals
    this.emergencyCertActive = false; // 27% golden emergency certificate
    this.pressConferenceDone = false; // Chairman public speech

    // History & news reports during crisis
    this.crisisLog = [];
  }

  checkTriggerCondition() {
    if (this.isActive) return false;

    // Trigger conditions:
    // Deposits > 300,000 EGP AND (Liquidity Ratio < 4% OR Reputation < 22)
    if (this.state.totalDeposits >= 300000) {
      const liquidityRatio = this.state.treasuryCash / this.state.totalDeposits;
      if (liquidityRatio < 0.04 || this.state.reputation < 22) {
        this.triggerBankRun('أزمة سيولة حادة نتيجة شائعات بالسوق وتراجع الملاءة المالية');
        return true;
      }
    }
    return false;
  }

  triggerBankRun(reason = 'هجوم مفاجئ للمودعين بسبب شائعات مصرفية') {
    if (this.isActive) return;

    this.isActive = true;
    this.panicLevel = 75; // Starts at 75% panic
    this.crisisMonth = 1;
    this.totalDrainedDeposits = 0;
    this.dailyWithdrawalLimitActive = false;
    this.emergencyCertActive = false;
    this.pressConferenceDone = false;

    // Initial shock: 12% to 20% of deposits requested for immediate withdrawal
    const shockPct = 0.15;
    this.initialDepositRun = Math.round(this.state.totalDeposits * shockPct);

    this.crisisLog.push({
      date: this.state.getDateString(),
      event: `🚨 اندلاع أزمة هجوم المودعين: ${reason}`,
      severity: 'critical'
    });

    if (this.state.newsManager) {
      this.state.newsManager.addUrgentNews(
        `🚨 عاجل: طوابير مكثفة للمواطنين أمام فروع ${this.state.bankName} لسحب مدخراتهم وسط مخاوف السيولة!`,
        'critical'
      );
    }

    this.state.saveGame();
  }

  processMonth() {
    if (!this.isActive) {
      this.checkTriggerCondition();
      return null;
    }

    // Monthly Crisis Tick
    this.crisisMonth++;

    // Base deposit outflow based on panic level
    const panicFactor = this.panicLevel / 100;
    let outflow = Math.round(this.state.totalDeposits * (0.08 * panicFactor));

    // Countermeasure mitigations:
    if (this.dailyWithdrawalLimitActive) {
      outflow = Math.round(outflow * 0.40); // Cuts outflow by 60%
    }
    if (this.emergencyCertActive) {
      outflow = Math.round(outflow * 0.65); // Cuts outflow by 35%
      // Inflow from speculative depositors looking for 27%
      const newInflow = 85000;
      this.state.totalDeposits += newInflow;
      this.state.treasuryCash += Math.round(newInflow * 0.8);
    }

    // Deduct outflows
    const actualOutflow = Math.min(this.state.totalDeposits, outflow);
    this.state.totalDeposits -= actualOutflow;
    this.totalDrainedDeposits += actualOutflow;

    // Cash drain from treasury (cannot exceed available cash)
    const cashDrain = Math.min(this.state.treasuryCash, actualOutflow);
    this.state.treasuryCash -= cashDrain;

    // CBE Emergency Loan interest payment
    if (this.cbeEmergencyLoan > 0) {
      const monthlyCbeInterest = Math.round(this.cbeEmergencyLoan * ((this.cbeLoanInterestRate / 100) / 12));
      this.state.treasuryCash = Math.max(0, this.state.treasuryCash - monthlyCbeInterest);
    }

    // Naturally recover or worsen panic
    if (this.state.treasuryCash > actualOutflow * 2) {
      this.panicLevel = Math.max(0, this.panicLevel - 20);
    } else {
      this.panicLevel = Math.min(100, this.panicLevel + 10);
    }

    // Check if crisis resolved!
    if (this.panicLevel <= 15) {
      return this.resolveCrisis();
    }

    // Reset single-turn countermeasures
    this.pressConferenceDone = false;

    this.state.saveGame();
    return {
      status: 'ongoing',
      panicLevel: this.panicLevel,
      drainedThisMonth: actualOutflow,
      totalDrained: this.totalDrainedDeposits
    };
  }

  requestCbeEmergencyLoan(amount = 250000) {
    if (!this.isActive) {
      return { success: false, msg: 'لا توجد أزمة سيولة نشطة تستدعي تدخل نافذة البنك المركزي.' };
    }

    this.cbeEmergencyLoan += amount;
    this.state.treasuryCash += amount;
    this.panicLevel = Math.max(0, this.panicLevel - 25);
    this.state.reputation = Math.min(100, this.state.reputation + 4);

    this.crisisLog.push({
      date: this.state.getDateString(),
      event: `ضخ سيولة طارئة من البنك المركزي المصري بقيمة ${amount.toLocaleString('ar-EG')} ج.م بفائدة ${this.cbeLoanInterestRate}%`,
      severity: 'info'
    });

    this.state.saveGame();
    return {
      success: true,
      msg: `تم اعتماد ضخ سيولة طارئة من البنك المركزي بقيمة ${amount.toLocaleString('ar-EG')} ج.م إلى الخزينة! تراجع مؤشر الذعر بنسبة 25%.`
    };
  }

  repayCbeLoan(amount) {
    const repayAmount = amount || this.cbeEmergencyLoan;
    if (this.cbeEmergencyLoan <= 0) {
      return { success: false, msg: 'لا توجد قروض طارئة مستحقة للبنك المركزي.' };
    }
    if (this.state.treasuryCash < repayAmount) {
      return { success: false, msg: 'رصيد الخزينة لا يكفي لسداد مديونية البنك المركزي.' };
    }

    this.state.treasuryCash -= repayAmount;
    this.cbeEmergencyLoan -= repayAmount;
    this.state.reputation = Math.min(100, this.state.reputation + 6);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم سداد ${repayAmount.toLocaleString('ar-EG')} ج.م من تسهيلات البنك المركزي الطارئة بنجاح! ارتفعت سمعة وملاءة البنك +6.`
    };
  }

  toggleWithdrawalLimits() {
    this.dailyWithdrawalLimitActive = !this.dailyWithdrawalLimitActive;
    if (this.dailyWithdrawalLimitActive) {
      this.state.reputation = Math.max(15, this.state.reputation - 5);
      this.panicLevel = Math.min(100, this.panicLevel + 5);
      this.crisisLog.push({
        date: this.state.getDateString(),
        event: 'تفعيل سقف السحب النقدي اليومي (حد أقصى 20,000 ج.م/عميل)',
        severity: 'warning'
      });
      this.state.saveGame();
      return {
        success: true,
        active: true,
        msg: 'تم تفعيل سقف السحب اليومي! انخفض معدل تسريب السيولة بنسبة 60%، مع تذمر طفيف من كبار المودعين.'
      };
    } else {
      this.crisisLog.push({
        date: this.state.getDateString(),
        event: 'إلغاء سقف السحب النقدي واستئناف الصرف الحر',
        severity: 'info'
      });
      this.state.saveGame();
      return {
        success: true,
        active: false,
        msg: 'تم رفع قيود السحب واستئناف العمليات الطبيعية.'
      };
    }
  }

  launchEmergencyCertificate() {
    if (this.emergencyCertActive) {
      return { success: false, msg: 'شهادة الطوارئ الاستثنائية بعائد 27% مطروحة بالفعل في السوق.' };
    }

    this.emergencyCertActive = true;
    this.panicLevel = Math.max(0, this.panicLevel - 20);
    this.state.reputation = Math.min(100, this.state.reputation + 5);

    // Immediate liquidity capture
    const quickInflow = 120000;
    this.state.totalDeposits += quickInflow;
    this.state.treasuryCash += quickInflow;

    this.crisisLog.push({
      date: this.state.getDateString(),
      event: 'طرح شهادة الطوارئ الذهبية 27% بعائد يومي استثنائي لجذب السيولة',
      severity: 'success'
    });

    this.state.saveGame();
    return {
      success: true,
      msg: `تم طرح شهادة الطوارئ 27%! تم إيداع ${quickInflow.toLocaleString('ar-EG')} ج.م سيولة جديدة فوراً في الخزينة وهدأت وتيرة الذعر بنسبة 20%.`
    };
  }

  holdPressConference() {
    if (this.pressConferenceDone) {
      return { success: false, msg: 'لقد عقدت مؤتمراً صحفياً بالفعل هذا الشهر. ينبغي منح السوق وقتاً لاستيعاب الرسالة.' };
    }

    this.pressConferenceDone = true;
    const isHighRep = this.state.reputation >= 45;
    const panicReduction = isHighRep ? 30 : 15;

    this.panicLevel = Math.max(0, this.panicLevel - panicReduction);
    this.state.reputation = Math.min(100, this.state.reputation + (isHighRep ? 6 : 2));

    this.crisisLog.push({
      date: this.state.getDateString(),
      event: 'مؤتمر صحفي لرئيس مجلس الإدارة: تطمين المودعين وتأكيد متانة الأصول',
      severity: 'info'
    });

    this.state.saveGame();
    return {
      success: true,
      msg: `ألقى ${this.state.getManagerFormalTitle()} بياناً حازماً عبر القنوات الفضائية والمنصات الاقتصادية! تراجع مؤشر الذعر بنسبة ${panicReduction}%.`
    };
  }

  resolveCrisis() {
    this.isActive = false;
    this.panicLevel = 0;
    this.dailyWithdrawalLimitActive = false;
    this.state.reputation = Math.min(100, this.state.reputation + 15);

    this.crisisLog.push({
      date: this.state.getDateString(),
      event: '🎉 إعلان انتهاء الأزمة رسمياً: استقرار كامل للسيولة ونجاح البنك في عبور اختبار التحمل القاسي!',
      severity: 'success'
    });

    if (this.state.newsManager) {
      this.state.newsManager.addUrgentNews(
        `🏆 انتصار مصرفي: نجح ${this.state.bankName} في إدارة أزمة السيولة بامتياز ونال إشادة البنك المركزي وجمهور المودعين!`,
        'success'
      );
    }

    this.state.saveGame();
    return {
      status: 'resolved',
      msg: 'تهانينا الحارة! تم تجاوز أزمة هجوم المودعين بنجاح باهر. ارتفعت سمعة البنك وملاءته في عيون السوق بمقدار +15 نقطة!'
    };
  }

  getState() {
    return {
      isActive: this.isActive,
      panicLevel: this.panicLevel,
      crisisMonth: this.crisisMonth,
      initialDepositRun: this.initialDepositRun,
      totalDrainedDeposits: this.totalDrainedDeposits,
      cbeEmergencyLoan: this.cbeEmergencyLoan,
      dailyWithdrawalLimitActive: this.dailyWithdrawalLimitActive,
      emergencyCertActive: this.emergencyCertActive,
      pressConferenceDone: this.pressConferenceDone,
      crisisLog: this.crisisLog
    };
  }

  loadState(data) {
    if (!data) return;
    this.isActive = !!data.isActive;
    this.panicLevel = data.panicLevel ?? 0;
    this.crisisMonth = data.crisisMonth ?? 0;
    this.initialDepositRun = data.initialDepositRun ?? 0;
    this.totalDrainedDeposits = data.totalDrainedDeposits ?? 0;
    this.cbeEmergencyLoan = data.cbeEmergencyLoan ?? 0;
    this.dailyWithdrawalLimitActive = !!data.dailyWithdrawalLimitActive;
    this.emergencyCertActive = !!data.emergencyCertActive;
    this.pressConferenceDone = !!data.pressConferenceDone;
    this.crisisLog = Array.isArray(data.crisisLog) ? data.crisisLog : [];
  }
}
