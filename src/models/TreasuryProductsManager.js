/**
 * TreasuryProductsManager - Manages Saving Certificates War & Physical Gold Vault
 */
export class TreasuryProductsManager {
  constructor(gameState) {
    this.state = gameState;

    // 1. Certificates with defined maturity tenures (أجل زمني محدد للاستحقاق)
    this.certificates = [
      {
        id: 'cert_19',
        name: 'شهادة الأمان الثلاثية (19%)',
        rateAnnual: 19.0,
        maturityMonths: 36, // 3 سنوات
        monthlyDepositInflow: 60000,
        minTier: 1,
        active: false,
        totalIssuedVolume: 0,
        desc: 'عائد شهري ثابت 19% سنوياً بأجل استحقاق 3 سنوات (36 شهراً). تجذب مدخرات الأسر وأصحاب المعاشات بتكلفة فائدة متزنة.'
      },
      {
        id: 'cert_23',
        name: 'شهادة القمة البلاتينية (23.5%)',
        rateAnnual: 23.5,
        maturityMonths: 24, // سنتان
        monthlyDepositInflow: 250000,
        minTier: 2,
        active: false,
        totalIssuedVolume: 0,
        desc: 'عائد شهري مرتفع 23.5% سنوياً بأجل استحقاق سنتين (24 شهراً). تجذب كبار المودعين والتجار وتوفر سيولة جارفة.'
      },
      {
        id: 'cert_27',
        name: 'شهادة الملياردير الاستثنائية (27%)',
        rateAnnual: 27.0,
        maturityMonths: 12, // سنة واحدة
        monthlyDepositInflow: 1200000,
        minTier: 3,
        active: false,
        totalIssuedVolume: 0,
        desc: 'أعلى عائد تاريخي في السوق بأجل استحقاق سنة واحدة (12 شهراً)! تجلب سيولة بملايين الجنيهات فوراً، وتنتهي مدتها تلقائياً بعد عام.'
      }
    ];

    // Batches tracking for realistic certificate lifecycle
    this.batches = [];

    // 2. Physical Gold Vault (BTC 24k Bullion)
    this.goldGrams = 0;
    this.goldPricePerGram = 4200; // EGP / gram
    this.goldPriceHistory = [4200];
  }

  toggleCertificate(certId) {
    const cert = this.certificates.find(c => c.id === certId);
    if (!cert) return { success: false, msg: 'الشهادة غير موجودة.' };

    const currentTier = this.state.getCurrentTier();
    if (currentTier.id < cert.minTier) {
      return {
        success: false,
        msg: `طرح هذه الشهادة يتطلب رخصة [${this.state.licenseTiers[cert.minTier - 1].name}] أو أعلى.`
      };
    }

    cert.active = !cert.active;
    this.state.saveGame();

    if (cert.active) {
      return {
        success: true,
        msg: `تم فتح الاكتتاب في [${cert.name}]! سيبدأ تدفق ودائع المدخرين فوراً.`
      };
    } else {
      return {
        success: true,
        msg: `تم وقف إصدار [${cert.name}] للمكتتبين الجدد.`
      };
    }
  }

  getGoldValuation() {
    return Math.round(this.goldGrams * this.goldPricePerGram);
  }

  buyGold(grams) {
    const cost = Math.round(grams * this.goldPricePerGram);
    if (this.state.treasuryCash < cost) {
      return {
        success: false,
        msg: `السيولة المتاحة بالخزينة لا تكفي لشراء ${grams} جرام ذهب (${cost.toLocaleString('ar-EG')} ج.م).`
      };
    }

    this.state.treasuryCash -= cost;
    this.goldGrams = parseFloat((this.goldGrams + grams).toFixed(2));
    this.state.saveGame();

    return {
      success: true,
      msg: `تم شراء وإيداع ${grams} جرام سبائك ذهب BTC عيار 24 في خزينة البنك بتكلفة ${cost.toLocaleString('ar-EG')} ج.م.`
    };
  }

  sellGold(grams) {
    if (this.goldGrams < grams - 0.01) {
      return {
        success: false,
        msg: `رصيد الخزينة من الذهب لا يكفي لبيع ${grams} جرام.`
      };
    }

    const proceeds = Math.round(grams * this.goldPricePerGram);
    this.goldGrams = Math.max(0, parseFloat((this.goldGrams - grams).toFixed(2)));
    this.state.treasuryCash += proceeds;
    this.state.saveGame();

    return {
      success: true,
      msg: `تم تسييل وبيع ${grams} جرام ذهب بنجاح وضخ ${proceeds.toLocaleString('ar-EG')} ج.م في سيولة الخزينة.`
    };
  }

  getTotalCertificatesVolume() {
    return this.certificates.reduce((sum, c) => sum + (c.totalIssuedVolume || 0), 0);
  }

  processMonthly() {
    let totalCertInterestPaid = 0;
    let newCertInflow = 0;
    let totalMaturedVolume = 0;

    // 1. Attract new deposit batches for active certificates
    for (const cert of this.certificates) {
      if (cert.active) {
        const inflow = Math.round(cert.monthlyDepositInflow * (0.8 + Math.random() * 0.4));
        newCertInflow += inflow;
        this.batches.push({
          certId: cert.id,
          amount: inflow,
          rateAnnual: cert.rateAnnual,
          monthsRemaining: cert.maturityMonths || 24
        });
      }
    }

    if (newCertInflow > 0) {
      this.state.totalDeposits += newCertInflow;
      this.state.treasuryCash += newCertInflow;
    }

    // 2. Process existing batches: pay interest and check maturity countdown
    for (let i = this.batches.length - 1; i >= 0; i--) {
      const batch = this.batches[i];
      const monthlyRate = (batch.rateAnnual / 100) / 12;
      const interest = Math.round(batch.amount * monthlyRate);
      totalCertInterestPaid += interest;

      batch.monthsRemaining--;

      // Check Maturity (انتهاء أجل الشهادة واسترداد رأس المال)
      if (batch.monthsRemaining <= 0) {
        totalMaturedVolume += batch.amount;
        this.state.totalDeposits = Math.max(0, this.state.totalDeposits - batch.amount);
        const cashDeduction = Math.min(this.state.treasuryCash, batch.amount);
        this.state.treasuryCash = Math.max(0, this.state.treasuryCash - cashDeduction);
        this.batches.splice(i, 1);
      }
    }

    // 3. Update totalIssuedVolume on certificate definition objects
    for (const cert of this.certificates) {
      cert.totalIssuedVolume = this.batches
        .filter(b => b.certId === cert.id)
        .reduce((sum, b) => sum + b.amount, 0);
    }

    // 4. Fluctuate Gold Price (+- 1% to 4% with slight upward inflation bias)
    const deltaPercent = (Math.random() * 0.07) - 0.025;
    this.goldPricePerGram = Math.max(3500, Math.round(this.goldPricePerGram * (1 + deltaPercent)));
    this.goldPriceHistory.push(this.goldPricePerGram);
    if (this.goldPriceHistory.length > 12) this.goldPriceHistory.shift();

    return {
      newCertInflow,
      totalCertInterestPaid,
      totalMaturedVolume,
      goldPrice: this.goldPricePerGram,
      goldValuation: this.getGoldValuation()
    };
  }

  applyInterestRateHike(hike = 3.0) {
    this.certificates.forEach(c => {
      c.rateAnnual = +(c.rateAnnual + (hike * 0.4)).toFixed(1);
    });
  }

  getState() {
    return {
      certificates: this.certificates.map(c => ({
        id: c.id,
        active: c.active,
        totalIssuedVolume: c.totalIssuedVolume
      })),
      batches: this.batches,
      goldGrams: this.goldGrams,
      goldPricePerGram: this.goldPricePerGram,
      goldPriceHistory: this.goldPriceHistory
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.certificates && Array.isArray(data.certificates)) {
      data.certificates.forEach(savedCert => {
        const target = this.certificates.find(c => c.id === savedCert.id);
        if (target) {
          target.active = !!savedCert.active;
          target.totalIssuedVolume = savedCert.totalIssuedVolume || 0;
        }
      });
    }
    if (data.batches && Array.isArray(data.batches)) {
      this.batches = data.batches;
    }
    if (typeof data.goldGrams === 'number') {
      this.goldGrams = data.goldGrams;
    }
    if (typeof data.goldPricePerGram === 'number') {
      this.goldPricePerGram = data.goldPricePerGram;
    }
    if (data.goldPriceHistory && Array.isArray(data.goldPriceHistory)) {
      this.goldPriceHistory = data.goldPriceHistory;
    }
  }
}
