/**
 * CompetitorsManager - Egyptian banking landscape, rival banks, and market share tracking
 */
export class CompetitorsManager {
  constructor(gameState) {
    this.state = gameState;

    this.rivals = [
      {
        name: 'البنك التجاري الحديث',
        focus: 'تمويل الشركات الكبرى والملاحة',
        assets: 180000000,
        rate: 21.0,
        marketShare: 42
      },
      {
        name: 'بنك النيل الإسلامي',
        focus: 'المرابحة والصيرفة الشرعية',
        assets: 120000000,
        rate: 13.5,
        marketShare: 30
      },
      {
        name: 'بنك المحروسة للتجزئة والأفراد',
        focus: 'القروض الاستهلاكية وشبكة الصرافات',
        assets: 95000000,
        rate: 23.0,
        marketShare: 24
      }
    ];

    this.playerMarketShare = 0.5; // Starts small (0.5%)
  }

  calculatePlayerAssets() {
    const portfolioVal = this.state.investmentsManager ? this.state.investmentsManager.getPortfolioValue() : 0;
    const goldVal = this.state.treasuryProductsManager ? this.state.treasuryProductsManager.getGoldValuation() : 0;
    const fxVal = this.state.fxManager ? Math.round(this.state.fxManager.usdReserves * this.state.fxManager.usdRate) : 0;
    return this.state.treasuryCash + this.state.totalLoans + portfolioVal + goldVal + fxVal;
  }

  updateMonthlyMarketShare() {
    const playerAssets = this.calculatePlayerAssets();
    let totalMarketAssets = playerAssets;

    this.rivals.forEach(r => {
      // Small random growth for rivals (1-2%)
      r.assets = Math.round(r.assets * (1 + (Math.random() * 0.015 - 0.005)));
      totalMarketAssets += r.assets;
    });

    this.playerMarketShare = parseFloat(((playerAssets / totalMarketAssets) * 100).toFixed(2));

    this.rivals.forEach(r => {
      r.marketShare = parseFloat(((r.assets / totalMarketAssets) * 100).toFixed(1));
    });

    return this.playerMarketShare;
  }

  getState() {
    return {
      rivals: this.rivals.map(r => ({
        name: r.name,
        assets: r.assets,
        marketShare: r.marketShare
      })),
      playerMarketShare: this.playerMarketShare
    };
  }

  loadState(data) {
    if (!data) return;
    if (typeof data.playerMarketShare === 'number') {
      this.playerMarketShare = data.playerMarketShare;
    }
    if (data.rivals && Array.isArray(data.rivals)) {
      data.rivals.forEach(savedRival => {
        const target = this.rivals.find(r => r.name === savedRival.name);
        if (target) {
          if (typeof savedRival.assets === 'number') target.assets = savedRival.assets;
          if (typeof savedRival.marketShare === 'number') target.marketShare = savedRival.marketShare;
        }
      });
    }
  }
}
