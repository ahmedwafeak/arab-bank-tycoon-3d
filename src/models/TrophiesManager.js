/**
 * TrophiesManager - Banker Career Achievements, Milestones & Honours
 */
export class TrophiesManager {
  constructor(gameState) {
    this.state = gameState;

    this.trophies = [
      {
        id: 'trophy_first_500k',
        title: 'صانع الثقة المصرفية',
        icon: '🏛️',
        desc: 'كسر حاجز أول 500,000 ج.م في إجمالي ودائع البنك.',
        rewardCash: 15000,
        repBonus: 3,
        unlocked: false,
        claimed: false,
        check: (state) => state.totalDeposits >= 500000
      },
      {
        id: 'trophy_sme_hero',
        title: 'صقر التنمية الحرفية',
        icon: '🦅',
        desc: 'تمويل نشاط ائتماني وتسهيلات تتجاوز 300,000 ج.م للمشروعات والأنشطة التجارية.',
        rewardCash: 25000,
        repBonus: 4,
        unlocked: false,
        claimed: false,
        check: (state) => state.totalLoans >= 300000
      },
      {
        id: 'trophy_egx_whale',
        title: 'حوت البورصة المصرية',
        icon: '📈',
        desc: 'بناء محفظة أسهم في الشركات المقيدة بالبورصة تتجاوز قيمتها 1,000,000 ج.م.',
        rewardCash: 50000,
        repBonus: 5,
        unlocked: false,
        claimed: false,
        check: (state) => state.investmentsManager && state.investmentsManager.getPortfolioValue() >= 1000000
      },
      {
        id: 'trophy_digital_tycoon',
        title: 'رائد التحول الرقمي',
        icon: '⚡',
        desc: 'إصدار أكثر من 1,000 بطاقة بنكية وتفعيل شبكة إنستاباي بنجاح.',
        rewardCash: 30000,
        repBonus: 4,
        unlocked: false,
        claimed: false,
        check: (state) => {
          const cards = state.cardsManager ? state.cardsManager.getTotalActiveCards() : 0;
          const instapay = state.instaPayManager ? state.instaPayManager.isInstaPayActive : false;
          return cards >= 1000 && instapay;
        }
      },
      {
        id: 'trophy_gold_reserves',
        title: 'خزينة الذهب السيادية',
        icon: '🪙',
        desc: 'حيازة أكثر من 300 جرام من سبائك الذهب عيار 24 في خزائن البنك.',
        rewardCash: 40000,
        repBonus: 3,
        unlocked: false,
        claimed: false,
        check: (state) => state.treasuryProductsManager && state.treasuryProductsManager.goldGrams >= 300
      },
      {
        id: 'trophy_camels_star',
        title: 'الدرع الماسي للبنك المركزي',
        icon: '⭐',
        desc: 'الحصول على تقييم رقابي كامل 5 نجوم (CAMELS 5 Stars) في لجان التفتيش.',
        rewardCash: 75000,
        repBonus: 6,
        unlocked: false,
        claimed: false,
        check: (state) => state.complianceManager && state.complianceManager.currentCamelsScore === 5
      },
      {
        id: 'trophy_market_leader',
        title: 'المصرفي الأول في جمهورية مصر العربية',
        icon: '👑',
        desc: 'انتزاع صدارة السوق المصرفي وتخطي كافة البنوك المنافسة بحصة تتجاوز 40%.',
        rewardCash: 200000,
        repBonus: 10,
        unlocked: false,
        claimed: false,
        check: (state) => state.competitorsManager && state.competitorsManager.playerMarketShare >= 40.0
      }
    ];
  }

  checkAchievements() {
    const newlyUnlocked = [];
    for (const trophy of this.trophies) {
      if (!trophy.unlocked && trophy.check(this.state)) {
        trophy.unlocked = true;
        newlyUnlocked.push(trophy);
      }
    }
    if (newlyUnlocked.length > 0) {
      this.state.saveGame();
    }
    return newlyUnlocked;
  }

  claimReward(trophyId) {
    const trophy = this.trophies.find(t => t.id === trophyId);
    if (!trophy || !trophy.unlocked || trophy.claimed) {
      return { success: false, msg: 'المكافأة غير متاحة أو تم استلامها بالفعل.' };
    }

    trophy.claimed = true;
    this.state.treasuryCash += trophy.rewardCash;
    this.state.reputation = Math.min(100, this.state.reputation + trophy.repBonus);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم صرف مكافأة التميز المصرفي لوسام [${trophy.title}]! تم إضافة ${trophy.rewardCash.toLocaleString('ar-EG')} ج.م للخزينة ورفع ثقة السوق +${trophy.repBonus}%.`
    };
  }

  getUnlockedCount() {
    return this.trophies.filter(t => t.unlocked).length;
  }

  getUnclaimedCount() {
    return this.trophies.filter(t => t.unlocked && !t.claimed).length;
  }

  getState() {
    return {
      trophies: this.trophies.map(t => ({
        id: t.id,
        unlocked: t.unlocked,
        claimed: t.claimed
      }))
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.trophies && Array.isArray(data.trophies)) {
      data.trophies.forEach(savedTrophy => {
        const target = this.trophies.find(t => t.id === savedTrophy.id);
        if (target) {
          target.unlocked = !!savedTrophy.unlocked;
          target.claimed = !!savedTrophy.claimed;
        }
      });
    }
  }
}
