/**
 * LegalManager - Non-Performing Loans (NPLs), Restructuring & Judicial Debt Auctions
 */
export class LegalManager {
  constructor(gameState) {
    this.state = gameState;

    this.defaultedLoans = [];
    this.recoveredTotalCash = 0;
    this.restructuredCount = 0;
    this.auctionedCount = 0;
  }

  addDefaultedLoan(loan) {
    const defaultCase = {
      id: loan.id || ('def_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      borrower: loan.borrower || 'عميل متعثر',
      category: loan.category || 'مشروع تجاري',
      amount: loan.amount,
      collateral: loan.collateral || 'عقار وسيارات بضمان تجاري',
      monthsOverdue: 3,
      status: 'pending' // 'pending', 'restructured', 'auctioned', 'written_off'
    };
    this.defaultedLoans.unshift(defaultCase);
  }

  restructureLoan(caseId) {
    const item = this.defaultedLoans.find(d => d.id === caseId && d.status === 'pending');
    if (!item) return { success: false, msg: 'ملف القضية غير متاح أو تمت تسويته.' };

    item.status = 'restructured';
    this.restructuredCount++;

    // Borrower pays an immediate 20% down payment, and remainder is returned to active loans
    const immediateRecovery = Math.round(item.amount * 0.25);
    const activeRestructuredPrincipal = Math.round(item.amount * 0.65);

    this.state.treasuryCash += immediateRecovery;
    this.state.totalLoans += activeRestructuredPrincipal;
    if (this.state.loansManager) {
      this.state.loansManager.addDirectLoan({
        id: `LOAN-RES-${item.id}`,
        title: `تمويل مجدول: ${item.borrower}`,
        category: 'ديون مجدولة',
        amount: activeRestructuredPrincipal,
        tenureMonths: 18,
        annualRate: 20.0,
        riskRatio: 0.015,
        collateral: item.collateral
      });
    }
    this.recoveredTotalCash += immediateRecovery;
    this.state.reputation = Math.min(100, this.state.reputation + 2);
    this.state.saveGame();

    return {
      success: true,
      msg: `تمت إعادة جدولة مديونية [${item.borrower}] بنجاح! سدد العميل دفعة فورية بقيمة ${immediateRecovery.toLocaleString('ar-EG')} ج.م وتمت جدولة باقي الأصل.`
    };
  }

  auctionCollateral(caseId) {
    const item = this.defaultedLoans.find(d => d.id === caseId && d.status === 'pending');
    if (!item) return { success: false, msg: 'ملف القضية غير متاح أو تمت تسويته.' };

    const legalCourtCost = 2000;
    if (this.state.treasuryCash < legalCourtCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لرسوم المحكمة وتكاليف إجراءات المزاد العلني (${legalCourtCost.toLocaleString('ar-EG')} ج.م).`
      };
    }

    this.state.treasuryCash -= legalCourtCost;
    item.status = 'auctioned';
    this.auctionedCount++;

    // Auction recovers 65% of collateral value
    const recoveredCash = Math.round(item.amount * 0.65);
    this.state.treasuryCash += recoveredCash;
    this.recoveredTotalCash += recoveredCash;
    this.state.saveGame();

    return {
      success: true,
      msg: `تم بيع ضمانات [${item.borrower}] في المزاد العلني بحكم قضائي! تم تحصيل ${recoveredCash.toLocaleString('ar-EG')} ج.م نقداً وضخها في الخزينة.`
    };
  }

  writeOffLoan(caseId) {
    const item = this.defaultedLoans.find(d => d.id === caseId && d.status === 'pending');
    if (!item) return { success: false, msg: 'ملف القضية غير متاح.' };

    item.status = 'written_off';
    this.state.saveGame();

    return {
      success: true,
      msg: `تم إعدام مديونية [${item.borrower}] وتغطيتها من المخصصات لحماية تصنيف البنك وجودة الأصول.`
    };
  }

  getActiveNPLCount() {
    return this.defaultedLoans.filter(d => d.status === 'pending').length;
  }

  getState() {
    return {
      defaultedLoans: this.defaultedLoans,
      recoveredTotalCash: this.recoveredTotalCash,
      restructuredCount: this.restructuredCount,
      auctionedCount: this.auctionedCount
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.defaultedLoans && Array.isArray(data.defaultedLoans)) {
      this.defaultedLoans = data.defaultedLoans;
    }
    if (typeof data.recoveredTotalCash === 'number') {
      this.recoveredTotalCash = data.recoveredTotalCash;
    }
    if (typeof data.restructuredCount === 'number') {
      this.restructuredCount = data.restructuredCount;
    }
    if (typeof data.auctionedCount === 'number') {
      this.auctionedCount = data.auctionedCount;
    }
  }
}
