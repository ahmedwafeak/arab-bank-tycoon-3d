/**
 * InstaPayManager - Manages IPN network connection, server load, and instant transfer fees
 */
export class InstaPayManager {
  constructor(gameState) {
    this.state = gameState;

    this.serverTiers = [
      {
        id: 'shared',
        name: 'سيرفرات سحابية مشتركة',
        capacity: 8000,
        monthlyCost: 800,
        upgradeCost: 0,
        icon: '☁️',
        desc: 'سيرفرات أساسية للبداية، تتحمل ضغطاً بسيطاً حتى 8,000 عملية شهرياً.'
      },
      {
        id: 'dedicated',
        name: 'خوادم مخصصة فائقة السرعة',
        capacity: 40000,
        monthlyCost: 3500,
        upgradeCost: 15000,
        icon: '🖥️',
        desc: 'سيرفرات بنكية مخصصة تتحمل حتى 40,000 عملية دون سقوط السيستم.'
      },
      {
        id: 'datacenter',
        name: 'مركز بيانات سيادي محصن (Tier-4)',
        capacity: 250000,
        monthlyCost: 12000,
        upgradeCost: 65000,
        icon: '🏢',
        desc: 'أعلى معايير الأمن السيبراني والربط المباشر مع البنك المركزي المصري.'
      }
    ];

    this.currentServerTier = 'shared';
    this.isInstaPayActive = false;
    this.activationCost = 10000;
    this.lastMonthTransactions = 0;
    this.lastMonthFeeRevenue = 0;
    this.lastMonthDowntime = false;
    this.downtimeStreak = 0;
  }

  getCurrentTier() {
    return this.serverTiers.find(t => t.id === this.currentServerTier) || this.serverTiers[0];
  }

  activateInstaPay() {
    if (this.isInstaPayActive) {
      return { success: false, msg: 'خدمة إنستاباي مفعلة بالفعل في بنكك!' };
    }

    // If mobile app is already at Level 2+, activate without additional fee
    if (this.state.branchesManager && this.state.branchesManager.mobileAppLevel >= 2) {
      this.isInstaPayActive = true;
      this.state.reputation = Math.min(100, this.state.reputation + 4);
      this.state.saveGame();
      return {
        success: true,
        msg: 'تم تفعيل شبكة إنستاباي تلقائياً بفضل الربط المسبق في التطبيق المصرفي المتطور!'
      };
    }

    if (this.state.treasuryCash < this.activationCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لرسوم الربط مع شبكة المدفوعات اللحظية IPN (${this.activationCost.toLocaleString('ar-EG')} ج.م).`
      };
    }

    this.state.treasuryCash -= this.activationCost;
    this.isInstaPayActive = true;
    this.state.reputation = Math.min(100, this.state.reputation + 6);
    this.state.saveGame();

    return {
      success: true,
      msg: 'تم بنجاح الربط والاعتماد الرسمي مع شبكة إنستاباي (IPN)! بدأ العملاء في إجراء التحويلات اللحظية.'
    };
  }

  upgradeServer(tierId) {
    const target = this.serverTiers.find(t => t.id === tierId);
    if (!target) return { success: false, msg: 'نوع الخادم غير موجود.' };

    const currentIndex = this.serverTiers.findIndex(t => t.id === this.currentServerTier);
    const targetIndex = this.serverTiers.findIndex(t => t.id === tierId);

    if (targetIndex <= currentIndex) {
      return { success: false, msg: 'أنت تمتمل أو تستخدم بالفعل هذا الخادم أو خادماً أعلى منه.' };
    }

    if (this.state.treasuryCash < target.upgradeCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لترقية السيرفرات (${target.upgradeCost.toLocaleString('ar-EG')} ج.م).`
      };
    }

    this.state.treasuryCash -= target.upgradeCost;
    this.currentServerTier = target.id;
    this.lastMonthDowntime = false;
    this.state.reputation = Math.min(100, this.state.reputation + 4);
    this.state.saveGame();

    return {
      success: true,
      msg: `تمت ترقية البنية التحتية بنجاح إلى [${target.name}]! سعة المعالجة الآن تصل إلى ${target.capacity.toLocaleString('ar-EG')} عملية شهرياً.`
    };
  }

  processMonthly() {
    if (!this.isInstaPayActive) {
      return { revenue: 0, cost: 0, transactions: 0, downtime: false };
    }

    const currentTier = this.getCurrentTier();
    const cost = currentTier.monthlyCost;

    // Transaction volume based on deposits, card users, and branch network
    const cardsCount = this.state.cardsManager ? this.state.cardsManager.getTotalActiveCards() : 200;
    const baseDemand = Math.round(cardsCount * (2.5 + Math.random() * 2));
    this.lastMonthTransactions = baseDemand;

    // Check capacity and potential downtime
    if (baseDemand > currentTier.capacity) {
      this.lastMonthDowntime = true;
      this.downtimeStreak++;
      const repLoss = Math.min(12, 4 + this.downtimeStreak * 3);
      this.state.reputation = Math.max(10, this.state.reputation - repLoss);
      
      // Lost revenue due to outage
      const successfulTx = Math.round(currentTier.capacity * 0.7);
      this.lastMonthFeeRevenue = Math.round(successfulTx * 0.85); // 0.85 EGP avg fee/tx
      return {
        revenue: this.lastMonthFeeRevenue,
        cost,
        transactions: successfulTx,
        downtime: true,
        lostTx: baseDemand - successfulTx,
        repLoss
      };
    } else {
      this.lastMonthDowntime = false;
      this.downtimeStreak = 0;
      this.lastMonthFeeRevenue = Math.round(baseDemand * 0.85);
      return {
        revenue: this.lastMonthFeeRevenue,
        cost,
        transactions: baseDemand,
        downtime: false
      };
    }
  }

  getState() {
    return {
      currentServerTier: this.currentServerTier,
      isInstaPayActive: this.isInstaPayActive,
      lastMonthTransactions: this.lastMonthTransactions,
      lastMonthFeeRevenue: this.lastMonthFeeRevenue,
      lastMonthDowntime: this.lastMonthDowntime,
      downtimeStreak: this.downtimeStreak
    };
  }

  loadState(data) {
    if (!data) return;
    if (typeof data.currentServerTier === 'string') {
      this.currentServerTier = data.currentServerTier;
    }
    if (typeof data.isInstaPayActive === 'boolean') {
      this.isInstaPayActive = data.isInstaPayActive;
    }
    if (typeof data.lastMonthTransactions === 'number') {
      this.lastMonthTransactions = data.lastMonthTransactions;
    }
    if (typeof data.lastMonthFeeRevenue === 'number') {
      this.lastMonthFeeRevenue = data.lastMonthFeeRevenue;
    }
    if (typeof data.lastMonthDowntime === 'boolean') {
      this.lastMonthDowntime = data.lastMonthDowntime;
    }
    if (typeof data.downtimeStreak === 'number') {
      this.downtimeStreak = data.downtimeStreak;
    }
  }
}
