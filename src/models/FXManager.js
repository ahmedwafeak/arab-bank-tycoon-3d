/**
 * FXManager - Foreign Exchange Treasury Desk & Import Letters of Credit (L/Cs)
 */
export class FXManager {
  constructor(gameState) {
    this.state = gameState;

    this.usdRate = 48.60; // EGP / 1 USD
    this.usdReserves = 0; // Dollar balance in bank foreign vault

    this.pendingLCs = [
      {
        id: 'lc_med',
        title: 'استيراد شحنة أجهزة طبية ومستلزمات عناية مركزة ألمانية',
        importer: 'شركة النيل للتجهيزات الطبية',
        usdRequired: 25000,
        commissionRate: 2.5,
        desc: 'توريد معدات طبية للمستشفيات الجامعية. يحتاج المستورد تغطية دولارية للاعتماد.'
      },
      {
        id: 'lc_wheat',
        title: 'استيراد شحنة قمح صلب للمطاحن وصوامع الغلال',
        importer: 'الشركة العامة للحبوب والمطاحن',
        usdRequired: 60000,
        commissionRate: 2.5,
        desc: 'تأمين المخزون الاستراتيجي للسلع التموينية وتوفير النقد الأجنبي للمورد الدولي.'
      }
    ];

    this.completedLCsCount = 0;
    this.totalCommissionEarned = 0;
  }

  buyUSD(amountUSD) {
    const costEGP = Math.round(amountUSD * this.usdRate);
    if (this.state.treasuryCash < costEGP) {
      return {
        success: false,
        msg: `السيولة بالجنيه المصري لا تكفي لشراء $${amountUSD.toLocaleString('en-US')} (${costEGP.toLocaleString('ar-EG')} ج.م).`
      };
    }

    this.state.treasuryCash -= costEGP;
    this.usdReserves += amountUSD;
    this.state.saveGame();

    return {
      success: true,
      msg: `تم شراء $${amountUSD.toLocaleString('en-US')} وإيداعها في خزينة النقد الأجنبي بتكلفة ${costEGP.toLocaleString('ar-EG')} ج.م.`
    };
  }

  sellUSD(amountUSD) {
    if (this.usdReserves < amountUSD) {
      return {
        success: false,
        msg: `رصيد الدولار بالخزينة ($${this.usdReserves.toLocaleString('en-US')}) لا يكفي لبيع هذا المبلغ.`
      };
    }

    const proceedsEGP = Math.round(amountUSD * this.usdRate);
    this.usdReserves -= amountUSD;
    this.state.treasuryCash += proceedsEGP;
    this.state.saveGame();

    return {
      success: true,
      msg: `تم بيع $${amountUSD.toLocaleString('en-US')} للشركات بالسعر الرسمي وتحصيل ${proceedsEGP.toLocaleString('ar-EG')} ج.م لخزينة البنك.`
    };
  }

  openLC(lcId) {
    const index = this.pendingLCs.findIndex(lc => lc.id === lcId);
    if (index === -1) return { success: false, msg: 'طلب الاعتماد المستندي غير موجود.' };

    const lc = this.pendingLCs[index];
    if (this.usdReserves < lc.usdRequired) {
      return {
        success: false,
        msg: `رصيد البنك من الدولار ($${this.usdReserves.toLocaleString('en-US')}) لا يكفي لتغطية الاعتماد ($${lc.usdRequired.toLocaleString('en-US')}). يجب شراء دولارات أولاً.`
      };
    }

    // Process L/C:
    // 1. Bank provides USD to foreign supplier (deducted from bank USD reserve)
    this.usdReserves -= lc.usdRequired;

    // 2. Importer reimburses bank in EGP at official rate
    const egpReimbursed = Math.round(lc.usdRequired * this.usdRate);

    // 3. Bank earns 2.5% FX arrangement commission in EGP
    const commissionEGP = Math.round(egpReimbursed * (lc.commissionRate / 100));

    this.state.treasuryCash += (egpReimbursed + commissionEGP);
    this.completedLCsCount++;
    this.totalCommissionEarned += commissionEGP;

    // Importer opens an account and deposits working capital
    const corporateDepositInflow = Math.round(egpReimbursed * 0.4);
    this.state.totalDeposits += corporateDepositInflow;
    this.state.treasuryCash += corporateDepositInflow;

    this.state.reputation = Math.min(100, this.state.reputation + 4);

    // Remove from pending
    this.pendingLCs.splice(index, 1);
    this.state.saveGame();

    return {
      success: true,
      commissionEGP,
      corporateDepositInflow,
      msg: `تم فتح الاعتماد المستندي لـ [${lc.importer}] بنجاح! حصد البنك عمولة تدبير عملة بقيمة ${commissionEGP.toLocaleString('ar-EG')} ج.م وجذب ${corporateDepositInflow.toLocaleString('ar-EG')} ج.م ودائع شركات جديدة.`
    };
  }

  generateMonthlyLCs() {
    const candidates = [
      {
        id: 'lc_ind_' + Date.now(),
        title: 'استيراد خطوط إنتاج ومكابس هيدروليكية لمصنع كابلات',
        importer: 'مجموعة النصر للصناعات الهندسية',
        usdRequired: 35000,
        commissionRate: 2.5,
        desc: 'تحديث خطوط الإنتاج بمصانع مدينة العاشر من رمضان وتوريد الآلات من إيطاليا.'
      },
      {
        id: 'lc_solar_' + Date.now(),
        title: 'استيراد ألواح ومحولات محطات طاقة شمسية',
        importer: 'شركة النور للطاقة النظيفة',
        usdRequired: 45000,
        commissionRate: 2.5,
        desc: 'توريد معدات لمحطات توليد الكهرباء النظيفة بالصعيد بتسهيلات سداد بنكية.'
      },
      {
        id: 'lc_auto_' + Date.now(),
        title: 'استيراد مكونات تجميع السيارات وأجهزة الفحص',
        importer: 'الشركة الحديثة للسيارات والصناعة',
        usdRequired: 50000,
        commissionRate: 2.5,
        desc: 'توريد أجزاء تصنيع محلية لمصانع المنطقة الاقتصادية بقناة السويس.'
      }
    ];

    if (this.pendingLCs.length < 3) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.pendingLCs.push(pick);
    }
  }

  processMonthly() {
    // Exchange rate slight natural peg adjustment +- 0.10 EGP
    const delta = (Math.random() * 0.16) - 0.08;
    this.usdRate = +(Math.max(45.0, this.usdRate + delta).toFixed(2));

    this.generateMonthlyLCs();

    return {
      usdRate: this.usdRate,
      usdReserves: this.usdReserves,
      valuationEGP: Math.round(this.usdReserves * this.usdRate)
    };
  }

  applyDevaluationShock(increasePct = 0.18) {
    const oldRate = this.usdRate;
    this.usdRate = +(this.usdRate * (1 + increasePct)).toFixed(2);
    this.generateMonthlyLCs();
    return {
      oldRate,
      newRate: this.usdRate,
      valuationGain: Math.round(this.usdReserves * (this.usdRate - oldRate))
    };
  }

  getState() {
    return {
      usdRate: this.usdRate,
      usdReserves: this.usdReserves,
      completedLCsCount: this.completedLCsCount,
      totalCommissionEarned: this.totalCommissionEarned,
      pendingLCs: this.pendingLCs
    };
  }

  loadState(data) {
    if (!data) return;
    if (typeof data.usdRate === 'number') this.usdRate = data.usdRate;
    if (typeof data.usdReserves === 'number') this.usdReserves = data.usdReserves;
    if (typeof data.completedLCsCount === 'number') this.completedLCsCount = data.completedLCsCount;
    if (typeof data.totalCommissionEarned === 'number') this.totalCommissionEarned = data.totalCommissionEarned;
    if (data.pendingLCs && Array.isArray(data.pendingLCs)) this.pendingLCs = data.pendingLCs;
  }
}
