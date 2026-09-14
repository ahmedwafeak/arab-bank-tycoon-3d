/**
 * IslamicBankingManager - Sharia-compliant banking window, Murabaha, Sukuk, and Ijarah
 */
export class IslamicBankingManager {
  constructor(gameState) {
    this.state = gameState;
    this.isWindowActive = false;
    this.activationCost = 35000; // 35,000 ج.م ترخيص النافذة وتعيين هيئة الرقابة الشرعية

    this.islamicDeposits = 0; // ودائع المرابحة والصكوك
    this.islamicExpectedRate = 13.0; // معدل العائد المتوقع السنوي

    this.products = [
      {
        id: 'murabaha_cert',
        name: 'شهادة المرابحة التنموية (عائد دوري)',
        description: 'شهادة ادخار متوافقة 100% مع أحكام الشريعة الإسلامية بعائد ربح شهري.',
        active: true
      },
      {
        id: 'sukuk_investment',
        name: 'صكوك الاستثمار والتنمية الصناعية',
        description: 'صكوك تمويل مشاريع حقيقية بنظام المشاركة في الأرباح والخسائر.',
        active: false,
        unlockCost: 65000
      },
      {
        id: 'ijarah_auto',
        name: 'تمويل الإجارة المنتهية بالتمليك',
        description: 'تمويل السيارات والمعدات والآلات للشركات بنظام التأجير التمويلي الإسلامي.',
        active: false,
        unlockCost: 120000
      }
    ];
  }

  activateWindow() {
    if (this.isWindowActive) return { success: false, msg: 'النافذة الإسلامية مفعلة بالفعل.' };

    if (this.state.treasuryCash < this.activationCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لرسوم ترخيص النافذة الشرعية. المطلوب: ${this.activationCost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= this.activationCost;
    this.isWindowActive = true;
    this.state.reputation = Math.min(100, this.state.reputation + 7);

    // Initial influx of pious depositors
    const initialInflow = 45000;
    this.islamicDeposits += initialInflow;
    this.state.totalDeposits += initialInflow;
    this.state.treasuryCash += initialInflow;
    this.state.saveGame();

    return {
      success: true,
      msg: `تم اعتماد ترخيص النافذة الإسلامية وتشكيل هيئة الرقابة الشرعية بنجاح! تم استقطاب ${initialInflow.toLocaleString('ar-EG')} ج.م ودائع إسلامية فورية.`
    };
  }

  unlockProduct(productId) {
    if (!this.isWindowActive) return { success: false, msg: 'يجب تفعيل النافذة الإسلامية أولاً.' };

    const prod = this.products.find(p => p.id === productId);
    if (!prod) return { success: false, msg: 'المنتج غير موجود.' };
    if (prod.active) return { success: false, msg: 'المنتج مفعل بالفعل.' };

    if (this.state.treasuryCash < prod.unlockCost) {
      return {
        success: false,
        msg: `السيولة لا تكفي لإطلاق المنتج. التكلفة: ${prod.unlockCost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= prod.unlockCost;
    prod.active = true;

    const inflow = Math.round(prod.unlockCost * 2.2);
    this.islamicDeposits += inflow;
    this.state.totalDeposits += inflow;
    this.state.treasuryCash += inflow;
    this.state.reputation = Math.min(100, this.state.reputation + 5);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم إطلاق [${prod.name}] بنجاح! جذب المنتج ${inflow.toLocaleString('ar-EG')} ج.م ودائع وصكوك جديدة.`
    };
  }

  processMonthly() {
    if (!this.isWindowActive) return { profitPaid: 0, newInflow: 0 };

    // Sharia profit distribution
    const monthlyRate = (this.islamicExpectedRate / 100) / 12;
    const profitPaid = Math.round(this.islamicDeposits * monthlyRate);

    // Monthly Sharia deposit organic growth
    let newInflow = 0;
    if (this.state.reputation > 45) {
      const activeProdsCount = this.products.filter(p => p.active).length;
      newInflow = Math.round((this.islamicDeposits * 0.04 + 15000) * (activeProdsCount * 0.6));
      this.islamicDeposits += newInflow;
      this.state.totalDeposits += newInflow;
      this.state.treasuryCash += newInflow;
    }

    return { profitPaid, newInflow };
  }

  getState() {
    return {
      isWindowActive: this.isWindowActive,
      islamicDeposits: this.islamicDeposits,
      products: this.products.map(p => ({
        id: p.id,
        active: p.active
      }))
    };
  }

  loadState(data) {
    if (!data) return;
    if (typeof data.isWindowActive === 'boolean') {
      this.isWindowActive = data.isWindowActive;
    }
    if (typeof data.islamicDeposits === 'number') {
      this.islamicDeposits = data.islamicDeposits;
    }
    if (data.products && Array.isArray(data.products)) {
      data.products.forEach(savedProd => {
        const target = this.products.find(p => p.id === savedProd.id);
        if (target) {
          target.active = !!savedProd.active;
        }
      });
    }
  }
}
