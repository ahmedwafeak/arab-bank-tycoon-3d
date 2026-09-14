/**
 * InvestmentsManager - Egyptian Stock Exchange (EGX) portfolio and trading in EGP (ج.م)
 */
export class InvestmentsManager {
  constructor(gameState) {
    this.state = gameState;

    this.stocks = [
      {
        ticker: 'TMGH',
        name: 'مجموعة طلعت مصطفى القابضة',
        sector: 'تطوير عقاري ومدن ذكية',
        price: 54.5,
        prevPrice: 52.0,
        sharesOwned: 0,
        dividendYieldAnnual: 6.5, // 6.5% سنوي
        volatility: 0.06
      },
      {
        ticker: 'SWDY',
        name: 'السويدي إليكتريك',
        sector: 'طاقة، كابلات، وبنية تحتية',
        price: 48.0,
        prevPrice: 47.2,
        sharesOwned: 0,
        dividendYieldAnnual: 7.0,
        volatility: 0.05
      },
      {
        ticker: 'FWRY',
        name: 'فوري لتكنولوجيا البنوك والمدفوعات',
        sector: 'فنتك وتكنولوجيا مالية',
        price: 8.2,
        prevPrice: 8.5,
        sharesOwned: 0,
        dividendYieldAnnual: 4.0,
        volatility: 0.08
      },
      {
        ticker: 'ESRS',
        name: 'حديد عز',
        sector: 'معادن وصناعات ثقيلة',
        price: 92.0,
        prevPrice: 89.0,
        sharesOwned: 0,
        dividendYieldAnnual: 8.5,
        volatility: 0.07
      },
      {
        ticker: 'ABUK',
        name: 'أبو قير للأسمدة والصناعات الكيماوية',
        sector: 'بتروكيماويات وتصدير',
        price: 64.0,
        prevPrice: 65.5,
        sharesOwned: 0,
        dividendYieldAnnual: 9.0,
        volatility: 0.05
      }
    ];

    this.monthlyDividendsTotal = 0;
  }

  // Buy shares using treasury cash
  buyShares(ticker, quantity) {
    const stock = this.stocks.find(s => s.ticker === ticker);
    if (!stock || quantity <= 0) return { success: false, msg: 'السهم أو الكمية غير صالحة.' };

    const totalCost = Math.round(stock.price * quantity);
    if (this.state.treasuryCash < totalCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لشراء ${quantity} سهم. التكلفة: ${totalCost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= totalCost;
    stock.sharesOwned += quantity;
    this.state.saveGame();

    return {
      success: true,
      msg: `تم شراء ${quantity} سهم في [${stock.name}] بنجاح بقيمة ${totalCost.toLocaleString('ar-EG')} ج.م.`
    };
  }

  // Sell shares back to treasury cash
  sellShares(ticker, quantity) {
    const stock = this.stocks.find(s => s.ticker === ticker);
    if (!stock || stock.sharesOwned < quantity || quantity <= 0) {
      return { success: false, msg: 'الكمية المراد بيعها أكبر من رصيدك في هذا السهم.' };
    }

    const totalRevenue = Math.round(stock.price * quantity);
    this.state.treasuryCash += totalRevenue;
    stock.sharesOwned -= quantity;
    this.state.saveGame();

    return {
      success: true,
      msg: `تم بيع ${quantity} سهم من [${stock.name}] بنجاح وحصّلت الخزينة ${totalRevenue.toLocaleString('ar-EG')} ج.م.`
    };
  }

  // Total current portfolio valuation
  getPortfolioValue() {
    let total = 0;
    this.stocks.forEach(s => {
      total += s.sharesOwned * s.price;
    });
    return Math.round(total);
  }

  // Called every month tick to fluctuate prices and collect dividends
  updateMonthlyMarket() {
    this.monthlyDividendsTotal = 0;

    this.stocks.forEach(stock => {
      stock.prevPrice = stock.price;

      // Random market fluctuation (-7% to +9%)
      const changePct = (Math.random() * (stock.volatility * 2) - stock.volatility) + 0.01;
      stock.price = Math.max(1.0, parseFloat((stock.price * (1 + changePct)).toFixed(2)));

      // Calculate dividends if shares are owned
      if (stock.sharesOwned > 0) {
        const monthlyYield = (stock.dividendYieldAnnual / 100) / 12;
        const div = Math.round((stock.sharesOwned * stock.price) * monthlyYield);
        this.monthlyDividendsTotal += div;
      }
    });

    // Note: Dividends are added to treasuryCash in GameState.endMonth() via totalRevenues
    return this.monthlyDividendsTotal;
  }

  getState() {
    return {
      stocks: this.stocks.map(s => ({
        ticker: s.ticker,
        price: s.price,
        prevPrice: s.prevPrice,
        sharesOwned: s.sharesOwned
      }))
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.stocks && Array.isArray(data.stocks)) {
      data.stocks.forEach(savedStock => {
        const target = this.stocks.find(s => s.ticker === savedStock.ticker);
        if (target) {
          if (typeof savedStock.price === 'number') target.price = savedStock.price;
          if (typeof savedStock.prevPrice === 'number') target.prevPrice = savedStock.prevPrice;
          if (typeof savedStock.sharesOwned === 'number') target.sharesOwned = savedStock.sharesOwned;
        }
      });
    }
  }
}
