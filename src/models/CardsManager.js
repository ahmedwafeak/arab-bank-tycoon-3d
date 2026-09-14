/**
 * CardsManager - Retail payment cards (Meeza, Debit, Credit) and POS merchant terminals
 */
export class CardsManager {
  constructor(gameState) {
    this.state = gameState;

    this.cardPrograms = [
      {
        id: 'meeza_national',
        name: 'بطاقة "ميزة" الوطنية مسبقة الدفع',
        description: 'البطاقة القومية للمدفوعات الحكومية والمرتبات وسهولة الشراء الإلكتروني.',
        unlocked: false,
        launchCost: 20000,
        cardsIssued: 0,
        annualFeePerCard: 60,
        monthlyIncomePerCard: 8 // رسوم وعمولات مشتريات شهرية
      },
      {
        id: 'classic_debit',
        name: 'بطاقة الخصم المباشر (Classic Debit)',
        description: 'بطاقة مربوطة بالحساب الجاري للسحب من أي ماكينة صراف والتسوق.',
        unlocked: false,
        launchCost: 40000,
        cardsIssued: 0,
        annualFeePerCard: 120,
        monthlyIncomePerCard: 16
      },
      {
        id: 'gold_credit',
        name: 'بطاقة الائتمان الذهبية والبلاتينية (Credit Card)',
        description: 'تمويل استهلاكي بفترة سماح 55 يوماً، عائد فوائد تأخير وعمولات مشتريات مجزية.',
        unlocked: false,
        launchCost: 90000,
        cardsIssued: 0,
        annualFeePerCard: 450,
        monthlyIncomePerCard: 65
      }
    ];

    this.posTerminalsCount = 0; // ماكينات نقاط البيع بالمتاجر
    this.posTerminalCost = 6500;
    this.posMonthlyIncomePerUnit = 1400; // عمولات تجار شهرية
  }

  launchCardProgram(programId) {
    const prog = this.cardPrograms.find(p => p.id === programId);
    if (!prog) return { success: false, msg: 'البرنامج غير موجود.' };
    if (prog.unlocked) return { success: false, msg: 'البرنامج مفعل بالفعل.' };

    if (this.state.treasuryCash < prog.launchCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لإطلاق برنامج البطاقات. التكلفة: ${prog.launchCost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= prog.launchCost;
    prog.unlocked = true;
    prog.cardsIssued = 500; // أول دفعة بطاقات للعملاء
    this.state.reputation = Math.min(100, this.state.reputation + 4);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم إطلاق [${prog.name}] رسمياً وتم إصدار أول 500 بطاقة للعملاء!`
    };
  }

  deployPOSTerminals(count = 5) {
    const totalCost = this.posTerminalCost * count;
    if (this.state.treasuryCash < totalCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لشراء ${count} نقاط بيع. التكلفة: ${totalCost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= totalCost;
    this.posTerminalsCount += count;
    this.state.reputation = Math.min(100, this.state.reputation + 2);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم نشر ${count} ماكينات نقاط بيع (POS) في المتاجر والمحلات. إجمالي الماكينات: ${this.posTerminalsCount}.`
    };
  }

  calculateMonthlyRevenue() {
    let total = 0;

    this.cardPrograms.forEach(prog => {
      if (prog.unlocked) {
        // Natural monthly increase in card holders
        prog.cardsIssued += Math.round(15 + Math.random() * 25);
        total += prog.cardsIssued * prog.monthlyIncomePerCard;
      }
    });

    // POS commissions
    total += this.posTerminalsCount * this.posMonthlyIncomePerUnit;

    return Math.round(total);
  }

  getTotalActiveCards() {
    return this.cardPrograms.reduce((sum, prog) => sum + (prog.unlocked ? (prog.cardsIssued || 0) : 0), 0);
  }

  getState() {
    return {
      cardPrograms: this.cardPrograms.map(p => ({
        id: p.id,
        unlocked: p.unlocked,
        cardsIssued: p.cardsIssued
      })),
      posTerminalsCount: this.posTerminalsCount
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.cardPrograms && Array.isArray(data.cardPrograms)) {
      data.cardPrograms.forEach(savedProg => {
        const target = this.cardPrograms.find(p => p.id === savedProg.id);
        if (target) {
          target.unlocked = !!savedProg.unlocked;
          target.cardsIssued = savedProg.cardsIssued || 0;
        }
      });
    }
    if (typeof data.posTerminalsCount === 'number') {
      this.posTerminalsCount = data.posTerminalsCount;
    }
  }
}
