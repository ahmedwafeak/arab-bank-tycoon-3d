/**
 * HRManager - Staff recruitment starting from 0 employees, bootstrap salaries, and training
 */
export class HRManager {
  constructor(gameState) {
    this.state = gameState;
    this.trainingLevel = 1;
    this.morale = 75;

    // All categories start at 0 employees!
    this.staffCategories = {
      tellers: {
        id: 'tellers',
        name: 'الصرافون وخدمة العملاء',
        icon: '👔',
        count: 0,
        baseSalary: 4500, // 4,500 ج.م شهرياً لموظف خدمة عملاء مبتدئ
        hiringFee: 1200,
        description: 'استيعاب إيداعات وسحوبات العملاء، ورفع رسوم المعاملات ومنع التكدس.',
        benefit: '+6% نمو ودائع لكل موظف'
      },
      analysts: {
        id: 'analysts',
        name: 'محللو الائتمان والمخاطر',
        icon: '📊',
        count: 0,
        baseSalary: 7500, // 7,500 ج.م شهرياً
        hiringFee: 2000,
        description: 'فحص دراسات الجدوى والضمانات، وتفادي القروض المتعثرة والديون المعدومة.',
        benefit: 'تقليل الديون المتعثرة بنسبة 20% لكل محلل'
      },
      advisors: {
        id: 'advisors',
        name: 'مستشارو الاستثمار وتطوير الأعمال',
        icon: '💼',
        count: 0,
        baseSalary: 11000, // 11,000 ج.م شهرياً
        hiringFee: 3000,
        description: 'جذب كبار أصحاب الأعمال والمودعين لشهادات الادخار المرتفعة.',
        benefit: '+15% جذب ودائع كبار العملاء'
      },
      compliance: {
        id: 'compliance',
        name: 'مسؤولو الامتثال والأمن السيبراني',
        icon: '🛡️',
        count: 0,
        baseSalary: 9500, // 9,500 ج.م شهرياً
        hiringFee: 2500,
        description: 'مكافحة غسيل الأموال، وتطبيق تعليمات البنك المركزي وتأمين المعاملات.',
        benefit: 'حماية السمعة ومنع الغرامات والاختراقات'
      }
    };
  }

  calculateTotalSalaries() {
    let total = 0;
    for (const key in this.staffCategories) {
      const cat = this.staffCategories[key];
      total += cat.count * cat.baseSalary;
    }
    return total;
  }

  hire(catKey) {
    const cat = this.staffCategories[catKey];
    if (!cat) return { success: false, msg: 'القسم غير موجود.' };

    if (this.state.treasuryCash < cat.hiringFee) {
      return {
        success: false,
        msg: `السيولة بالخزينة لا تكفي لرسوم التعيين والتأمينات (${cat.hiringFee.toLocaleString('ar-EG')} ج.م).`
      };
    }

    this.state.treasuryCash -= cat.hiringFee;
    cat.count++;
    this.morale = Math.min(100, this.morale + 2);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم توظيف فرد جديد في قسم [${cat.name}] براتب ${cat.baseSalary.toLocaleString('ar-EG')} ج.م شهرياً.`
    };
  }

  fire(catKey) {
    const cat = this.staffCategories[catKey];
    if (!cat || cat.count <= 0) {
      return { success: false, msg: 'لا يوجد موظفون في هذا القسم لإنهاء خدمتهم.' };
    }

    const severance = cat.baseSalary;
    if (this.state.treasuryCash < severance) {
      return { success: false, msg: 'لا توجد سيولة كافية لدفع مستحقات شهر الإنهاء.' };
    }

    this.state.treasuryCash -= severance;
    cat.count--;
    this.morale = Math.max(30, this.morale - 8);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم إنهاء خدمة موظف في قسم [${cat.name}].`
    };
  }

  trainStaff() {
    const cost = 15000 * this.trainingLevel; // تكلفة برنامج التدريب المصرفي
    if (this.state.treasuryCash < cost) {
      return { success: false, msg: `السيولة لا تكفي. تكلفة التدريب: ${cost.toLocaleString('ar-EG')} ج.م.` };
    }

    this.state.treasuryCash -= cost;
    this.trainingLevel++;
    this.morale = Math.min(100, this.morale + 15);
    this.state.reputation = Math.min(100, this.state.reputation + 4);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم إتمام الدورة التدريبية بالمعهد المصرفي المصري بنجاح! ارتفعت كفاءة الفريق للمستوى ${this.trainingLevel}.`
    };
  }

  getRiskMitigationRatio() {
    const analystCount = this.staffCategories.analysts.count;
    if (analystCount === 0) return 0.05; // Base mitigation
    const factor = Math.min(0.85, (analystCount * 0.18) * (1 + (this.trainingLevel - 1) * 0.2));
    return factor;
  }

  getState() {
    const counts = {};
    for (const key in this.staffCategories) {
      counts[key] = this.staffCategories[key].count;
    }
    return {
      staffCounts: counts,
      trainingLevel: this.trainingLevel,
      morale: this.morale
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.staffCounts && typeof data.staffCounts === 'object') {
      for (const key in data.staffCounts) {
        if (this.staffCategories[key]) {
          this.staffCategories[key].count = data.staffCounts[key] || 0;
        }
      }
    }
    if (typeof data.trainingLevel === 'number') {
      this.trainingLevel = data.trainingLevel;
    }
    if (typeof data.morale === 'number') {
      this.morale = data.morale;
    }
  }
}
