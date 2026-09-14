/**
 * NewsManager - Live Breaking News Ticker & Macroeconomic Drivers
 */
export class NewsManager {
  constructor(gameState) {
    this.state = gameState;

    this.newsPool = [
      {
        id: 'cbe_rate_hike',
        type: 'urgent',
        badge: '🔴 عاجل • البنك المركزي',
        title: 'لجنة السياسة النقدية بالبنك المركزي ترفع سعر الفائدة 100 نقطة أساس لكبح التضخم.',
        impactText: 'زيادة العائد على القروض (+1%) وارتفاع تكلفة الودائع للمقترضين الجدد.',
        apply: (state) => {
          state.lendingAnnualRate = Math.min(32, state.lendingAnnualRate + 0.5);
        }
      },
      {
        id: 'ras_hekma_flow',
        type: 'positive',
        badge: '🟢 استثمار دولي',
        title: 'تدفقات استثمارية كبرى في مشروع رأس الحكمة تدعم الاحتياطي النقدي وتنعش البورصة المصرية.',
        impactText: 'صعود أسهم التطوير العقاري بنسبة 8% وتحسن معنويات السوق والسيولة العامة.',
        apply: (state) => {
          if (state.investmentsManager) {
            const tmgh = state.investmentsManager.stocks.find(s => s.ticker === 'TMGH');
            if (tmgh) tmgh.price = Math.round(tmgh.price * 1.08);
          }
          state.reputation = Math.min(100, state.reputation + 2);
        }
      },
      {
        id: 'abuk_fertilizer_boom',
        type: 'positive',
        badge: '🟢 طفرة تصديرية',
        title: 'قفزة تاريخية في أرباح شركات الأسمدة والبتروكيماويات المصرية وفتح أسواق جديدة بأوروبا.',
        impactText: 'قفزة لسهم أبو قير للأسمدة (ABUK) بنسبة +12% وتوقعات توزيعات نقدية ممتازة.',
        apply: (state) => {
          if (state.investmentsManager) {
            const abuk = state.investmentsManager.stocks.find(s => s.ticker === 'ABUK');
            if (abuk) abuk.price = Math.round(abuk.price * 1.12);
          }
        }
      },
      {
        id: 'harvest_wheat_deposits',
        type: 'positive',
        badge: '🌾 موسم الحصاد',
        title: 'بدء موسم توريد القمح المحلي وتدفق مدخرات المزارعين والتجار إلى الفروع البنكية بالأقاليم.',
        impactText: 'زيادة إضافية في الودائع النقدية العضوية بنسبة +15% هذا الشهر.',
        apply: (state) => {
          const bonusInflow = Math.round(15000 + Math.random() * 25000);
          state.totalDeposits += bonusInflow;
          state.treasuryCash += bonusInflow;
        }
      },
      {
        id: 'fintech_instapay_surge',
        type: 'positive',
        badge: '⚡ تحول رقمي',
        title: 'تخطي معاملات شبكة المدفوعات اللحظية (إنستاباي) حاجز المليار جنيه ومطالبات بدعم السيرفرات.',
        impactText: 'زيادة الإقبال على المعاملات الرقمية والبطاقات بنسبة +20%.',
        apply: (state) => {
          state.reputation = Math.min(100, state.reputation + 3);
        }
      },
      {
        id: 'cbe_inspection_notice',
        type: 'neutral',
        badge: '📋 تعليمات رقابية',
        title: 'البنك المركزي المصري يشدد على الالتزام بنسب الاحتياطي الإلزامي وكفاية رأس المال لمواجهة المخاطر.',
        impactText: 'تأكيد على توخي الحذر في السيولة النقدية وتفادي نقص الاحتياطي.',
        apply: () => {}
      },
      {
        id: 'gold_market_rally',
        type: 'urgent',
        badge: '🪙 أسواق الذهب',
        title: 'إقبال قياسي على شراء سبائك الذهب عيار 24 كملاذ آمن وصعود سعر الجرام في الصاغة المصرية.',
        impactText: 'ارتفاع تقييم احتياطي الذهب بالبنوك الوطنية وزيادة رغبة العملاء في الصناديق الاستثمارية.',
        apply: (state) => {
          if (state.treasuryProductsManager) {
            state.treasuryProductsManager.goldPricePerGram = Math.round(state.treasuryProductsManager.goldPricePerGram * 1.05);
          }
        }
      },
      // --- Macroeconomic Shocks & Crisis Events ---
      {
        id: 'macro_currency_floatation',
        type: 'urgent',
        badge: '💥 صدمة نقدية • تحريك سعر الصرف',
        title: 'البنك المركزي يعلن تحريراً شاملاً لسعر صرف الجنيه أمام الدولار؛ قفزة سعرية بالبنوك واشتعال طلبات الاستيراد.',
        impactText: 'صعود سعر الصرف بنسبة +18%، قفزة في تقييم محفظة العملات، وطلب متزايد على اعتمادات استيراد السلع.',
        apply: (state) => {
          if (state.fxManager) {
            state.fxManager.applyDevaluationShock(0.18);
          }
          let repPenalty = 3;
          if (state.executiveLifeManager && state.executiveLifeManager.hasPerk('pr_shield')) {
            repPenalty = Math.round(repPenalty * 0.6); // 40% reduction
          }
          state.reputation = Math.max(15, state.reputation - repPenalty);
        }
      },
      {
        id: 'macro_cbe_super_hike',
        type: 'urgent',
        badge: '🔴 قرار استثنائي • رفع الفائدة +300 نقطة',
        title: 'البنك المركزي يرفع أسعار الفائدة 300 نقطة أساس دفعة واحدة لكبح التضخم وامتصاص السيولة.',
        impactText: 'ارتفاع عوائد التمويل (+2.5%)، مع زيادة تكلفة الفائدة المدفوعة على الودائع والشهادات.',
        apply: (state) => {
          state.lendingAnnualRate = Math.min(34, parseFloat((state.lendingAnnualRate + 2.5).toFixed(1)));
          state.depositAnnualRate = Math.min(22, parseFloat((state.depositAnnualRate + 2.0).toFixed(1)));
          if (state.treasuryProductsManager) {
            state.treasuryProductsManager.applyInterestRateHike(3.0);
          }
        }
      },
      {
        id: 'macro_mega_certificate_35',
        type: 'urgent',
        badge: '⚔️ حرب الفائدة • شهادات 35%',
        title: 'البنوك القومية تطرح شهادات استثنائية بعائد 35% لمدة سنة، وموجة نزوح للودائع بالقطاع المصرفي.',
        impactText: 'ضغط سيولة فوري؛ سحب مدخرات من البنوك الخاصة للاكتتاب في شهادات الـ 35%.',
        apply: (state) => {
          // If bank does not have high-yield cert, lose deposits
          let drainPct = 0.10; // 10%
          if (state.executiveLifeManager && state.executiveLifeManager.hasPerk('pr_shield')) {
            drainPct *= 0.6; // 40% reduction from strong PR
          }
          const drain = Math.round(state.totalDeposits * drainPct);
          state.totalDeposits = Math.max(0, state.totalDeposits - drain);
          const cashDrain = Math.min(state.treasuryCash, drain);
          state.treasuryCash = Math.max(0, state.treasuryCash - cashDrain);
        }
      },
      {
        id: 'rumor_liquidity_scare',
        type: 'urgent',
        badge: '⚠️ شائعات مصرفية • منصات التواصل',
        title: 'شائعات مضللة حول أزمة سيولة نقدية في بعض البنوك تؤدي لتزاحم العملاء على شبابيك السحب.',
        impactText: 'تراجع سمعة البنك وقلق المودعين ما لم تتدخل إدارة العلاقات العامة.',
        apply: (state) => {
          let repLoss = 6;
          if (state.executiveLifeManager && state.executiveLifeManager.hasPerk('pr_shield')) {
            repLoss = Math.round(repLoss * 0.6); // 40% reduction
          }
          state.reputation = Math.max(10, state.reputation - repLoss);
        }
      }
    ];

    this.currentNews = this.newsPool[1]; // default news
    this.newsHistory = [this.currentNews];
  }

  addUrgentNews(title, type = 'urgent', badge = '🚨 إشعار عاجل') {
    const customNews = {
      id: 'urgent_' + Date.now(),
      type: type,
      badge: badge,
      title: title,
      impactText: 'حدث استثنائي طارئ على الساحة المصرفية.',
      apply: () => {}
    };
    this.currentNews = customNews;
    this.newsHistory.unshift(customNews);
    if (this.newsHistory.length > 8) this.newsHistory.pop();
    return customNews;
  }

  generateMonthlyNews() {
    const available = this.newsPool.filter(n => n.id !== this.currentNews.id);
    const selected = available[Math.floor(Math.random() * available.length)];
    this.currentNews = selected;
    this.newsHistory.unshift(selected);
    if (this.newsHistory.length > 8) this.newsHistory.pop();

    if (typeof selected.apply === 'function') {
      selected.apply(this.state);
    }

    return selected;
  }

  getState() {
    return {
      currentNewsId: this.currentNews ? this.currentNews.id : null,
      newsHistory: this.newsHistory.map(n => n.id)
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.currentNewsId) {
      const found = this.newsPool.find(n => n.id === data.currentNewsId);
      if (found) this.currentNews = found;
    }
    if (data.newsHistory && Array.isArray(data.newsHistory)) {
      this.newsHistory = data.newsHistory
        .map(id => this.newsPool.find(n => n.id === id))
        .filter(Boolean);
      if (this.newsHistory.length === 0 && this.currentNews) {
        this.newsHistory = [this.currentNews];
      }
    }
  }
}
