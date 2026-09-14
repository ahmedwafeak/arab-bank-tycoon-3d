/**
 * NeoBankManager - Standalone Digital-Only Bank ("Nile Neo / نيل نيو")
 * Branchless banking targeting youth, freelancers, virtual cards, smart pots, and BNPL.
 */
export class NeoBankManager {
  constructor(gameState) {
    this.state = gameState;

    this.isLicensed = false;
    this.licenseCost = 120000;
    this.minReputationRequired = 45;

    // Digital Metrics
    this.digitalUsers = 0;
    this.digitalDeposits = 0;
    this.virtualCardsCount = 0;
    this.smartPotsUnlocked = false;
    this.smartPotsDeposits = 0;
    this.bnplUnlocked = false;
    this.bnplVolume = 0;
    this.bnplDefaultRate = 0.02; // 2% low default thanks to instant KYC

    // Cloud Infrastructure
    this.cloudTier = 1; // 1: Starter (up to 20k users), 2: Pro (up to 100k users), 3: Hyperscale (500k+)
    this.cloudCost = 2500; // EGP monthly

    // Financial Performance
    this.lastMonthDigitalRevenue = 0;
    this.lastMonthNewUsers = 0;
  }

  obtainLicense() {
    if (this.isLicensed) {
      return { success: false, msg: 'رخصة البنك الرقمي المستقل (Nile Neo) مفعلة ومعتمدة بالفعل!' };
    }

    if (this.state.treasuryCash < this.licenseCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لرسوم ترخيص البنك الرقمي (${this.licenseCost.toLocaleString('ar-EG')} ج.م).`
      };
    }

    if (this.state.reputation < this.minReputationRequired) {
      return {
        success: false,
        msg: `يتطلب ترخيص البنك الرقمي سمعة لا تقل عن ${this.minReputationRequired}% (سمعتك الحالية: ${this.state.reputation}%).`
      };
    }

    this.state.treasuryCash -= this.licenseCost;
    this.isLicensed = true;
    this.digitalUsers = 2500; // Early adopters launch waitlist
    this.digitalDeposits = 150000;
    this.virtualCardsCount = 1800;
    this.state.totalDeposits += this.digitalDeposits;
    this.state.treasuryCash += Math.round(this.digitalDeposits * 0.20);
    this.state.reputation = Math.min(100, this.state.reputation + 8);

    if (this.state.newsManager) {
      this.state.newsManager.addUrgentNews(
        `🚀 خطوة للمستقبل: ${this.state.bankName} يحصل على رخصة البنك الرقمي ويطلق تطبيق [Nile Neo] لجيل الشباب!`,
        'success'
      );
    }

    this.state.saveGame();
    return {
      success: true,
      msg: 'تهانينا! تم تدشين البنك الرقمي [Nile Neo] رسمياً! انضم 2,500 عميل رقمي فوراً مع 150,000 ج.م ودائع جديدة.'
    };
  }

  launchViralCampaign(cost = 25000) {
    if (!this.isLicensed) {
      return { success: false, msg: 'يجب الحصول على رخصة البنك الرقمي أولاً.' };
    }

    if (this.state.treasuryCash < cost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لتمويل الحملة الرقمية (${cost.toLocaleString('ar-EG')} ج.م).`
      };
    }

    this.state.treasuryCash -= cost;
    const newUsers = Math.floor(Math.random() * 2000) + 3500; // 3500 - 5500 users
    const depositPerUser = Math.floor(Math.random() * 200) + 120; // 120 - 320 EGP average youth balance
    const addedDeposits = newUsers * depositPerUser;

    this.digitalUsers += newUsers;
    this.virtualCardsCount += Math.round(newUsers * 0.85);
    this.digitalDeposits += addedDeposits;
    this.state.totalDeposits += addedDeposits;
    this.state.treasuryCash += Math.round(addedDeposits * 0.15);
    this.state.reputation = Math.min(100, this.state.reputation + 3);

    this.state.saveGame();
    return {
      success: true,
      msg: `حملة تريند ناجحة على TikTok وإنستجرام! انضم ${newUsers.toLocaleString('ar-EG')} مستخدم جديد وأودعوا ${addedDeposits.toLocaleString('ar-EG')} ج.م.`
    };
  }

  unlockSmartPots() {
    if (!this.isLicensed) return { success: false, msg: 'البنك الرقمي غير مرخص بعد.' };
    if (this.smartPotsUnlocked) return { success: false, msg: 'ميزة الحصالات الذكية مفعلة بالفعل.' };

    const devCost = 35000;
    if (this.state.treasuryCash < devCost) {
      return { success: false, msg: `تكلفة برمجة الحصالات الذكية تتطلب ${devCost.toLocaleString('ar-EG')} ج.م.` };
    }

    this.state.treasuryCash -= devCost;
    this.smartPotsUnlocked = true;
    const potsBoost = Math.round(this.digitalDeposits * 0.30);
    this.smartPotsDeposits += potsBoost;
    this.digitalDeposits += potsBoost;
    this.state.totalDeposits += potsBoost;
    this.state.treasuryCash += Math.round(potsBoost * 0.18);
    this.state.reputation = Math.min(100, this.state.reputation + 4);

    this.state.saveGame();
    return {
      success: true,
      msg: `تم إطلاق ميزة «الحصالات الذكية» بنجاح! بدأ المستخدمون ادخار أهدافهم، وتدفقت ودائع إضافية بـ ${potsBoost.toLocaleString('ar-EG')} ج.م.`
    };
  }

  unlockBNPL() {
    if (!this.isLicensed) return { success: false, msg: 'البنك الرقمي غير مرخص بعد.' };
    if (this.bnplUnlocked) return { success: false, msg: 'خدمة التمويل اللحظي (BNPL) مفعلة بالفعل.' };

    const capitalReserve = 60000;
    if (this.state.treasuryCash < capitalReserve) {
      return { success: false, msg: `مخصص السيولة لتمويل الـ BNPL يتطلب ${capitalReserve.toLocaleString('ar-EG')} ج.م.` };
    }

    this.state.treasuryCash -= capitalReserve;
    this.bnplUnlocked = true;
    this.bnplVolume = capitalReserve * 2.5; // Revolving micro-credit line
    this.state.reputation = Math.min(100, this.state.reputation + 5);

    this.state.saveGame();
    return {
      success: true,
      msg: 'تم إطلاق خدمة «قسط مشترياتك لحظياً» (BNPL)! إقبال واسع على الشراء الإلكتروني وتوليد دخل عمولات مستمر.'
    };
  }

  upgradeCloud() {
    if (this.cloudTier >= 3) return { success: false, msg: 'البنية السحابية في أعلى مستوى فائق (Tier-3 Hyperscale).' };

    const upgradeCosts = { 1: 30000, 2: 75000 };
    const cost = upgradeCosts[this.cloudTier] || 40000;

    if (this.state.treasuryCash < cost) {
      return { success: false, msg: `تكلفة ترقية السيرفرات السحابية: ${cost.toLocaleString('ar-EG')} ج.م.` };
    }

    this.state.treasuryCash -= cost;
    this.cloudTier++;
    this.cloudCost = this.cloudTier === 2 ? 6500 : 14000;
    this.state.reputation = Math.min(100, this.state.reputation + 4);

    this.state.saveGame();
    return {
      success: true,
      msg: `تمت ترقية البنية التحتية السحابية إلى المستوى ${this.cloudTier}! استقرار كامل لعمليات البطاقات وسرعة استجابة فائقة.`
    };
  }

  processMonth() {
    if (!this.isLicensed) return null;

    // Organic user growth
    const maxUsersForTier = this.cloudTier === 1 ? 25000 : (this.cloudTier === 2 ? 120000 : 600000);
    let growthBase = Math.round(this.digitalUsers * 0.08) + 300;
    if (this.digitalUsers >= maxUsersForTier) {
      growthBase = Math.round(growthBase * 0.15); // Cloud server bottleneck slows growth!
    }

    this.digitalUsers += growthBase;
    this.lastMonthNewUsers = growthBase;
    this.virtualCardsCount += Math.round(growthBase * 0.8);

    // Deposit growth
    const avgDepositPerUser = 180;
    const addedDeposits = Math.round(growthBase * avgDepositPerUser);
    this.digitalDeposits += addedDeposits;
    this.state.totalDeposits += addedDeposits;

    // Digital interchange and transaction fee revenue (0.8% per card turnover)
    const cardSpendVolume = this.virtualCardsCount * 450; // 450 EGP avg spend per card
    const interchangeFee = Math.round(cardSpendVolume * 0.008);

    // BNPL micro-interest revenue
    let bnplRevenue = 0;
    if (this.bnplUnlocked) {
      bnplRevenue = Math.round(this.bnplVolume * 0.035); // 3.5% monthly micro-margin
      // Expand volume dynamically
      this.bnplVolume = Math.min(1000000, this.bnplVolume + Math.round(growthBase * 50));
    }

    const totalRevenue = interchangeFee + bnplRevenue;
    const netProfit = totalRevenue - this.cloudCost;

    this.lastMonthDigitalRevenue = totalRevenue;

    // Inject net profit into treasury
    if (netProfit > 0) {
      this.state.treasuryCash += netProfit;
    } else {
      this.state.treasuryCash = Math.max(0, this.state.treasuryCash + netProfit);
    }

    this.state.saveGame();
    return {
      users: this.digitalUsers,
      revenue: totalRevenue,
      netProfit,
      newUsers: growthBase
    };
  }

  getState() {
    return {
      isLicensed: this.isLicensed,
      digitalUsers: this.digitalUsers,
      digitalDeposits: this.digitalDeposits,
      virtualCardsCount: this.virtualCardsCount,
      smartPotsUnlocked: this.smartPotsUnlocked,
      smartPotsDeposits: this.smartPotsDeposits,
      bnplUnlocked: this.bnplUnlocked,
      bnplVolume: this.bnplVolume,
      cloudTier: this.cloudTier,
      cloudCost: this.cloudCost,
      lastMonthDigitalRevenue: this.lastMonthDigitalRevenue,
      lastMonthNewUsers: this.lastMonthNewUsers
    };
  }

  loadState(data) {
    if (!data) return;
    this.isLicensed = !!data.isLicensed;
    this.digitalUsers = data.digitalUsers ?? 0;
    this.digitalDeposits = data.digitalDeposits ?? 0;
    this.virtualCardsCount = data.virtualCardsCount ?? 0;
    this.smartPotsUnlocked = !!data.smartPotsUnlocked;
    this.smartPotsDeposits = data.smartPotsDeposits ?? 0;
    this.bnplUnlocked = !!data.bnplUnlocked;
    this.bnplVolume = data.bnplVolume ?? 0;
    this.cloudTier = data.cloudTier ?? 1;
    this.cloudCost = data.cloudCost ?? 2500;
    this.lastMonthDigitalRevenue = data.lastMonthDigitalRevenue ?? 0;
    this.lastMonthNewUsers = data.lastMonthNewUsers ?? 0;
  }
}
