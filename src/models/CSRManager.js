/**
 * CSRManager - National Mega-Projects financing consortia and Corporate Social Responsibility (CSR)
 */
export class CSRManager {
  constructor(gameState) {
    this.state = gameState;

    this.initiatives = [
      {
        id: 'magdi_yacoub_heart',
        type: 'csr',
        title: 'رعاية صرح د. مجدي يعقوب لأبحاث القلب (أسوان)',
        description: 'التبرع برعاية وحدات قسطرة وعلاج قلوب الأطفال بالمجان، وبناء أثر إنساني عظيم.',
        cost: 25000,
        reputationBoost: 10,
        completed: false
      },
      {
        id: 'vocational_schools',
        type: 'csr',
        title: 'تطوير وتجهيز المدارس التكنولوجية والحرفية بالصعيد',
        description: 'رعاية معامل الحاسب والتدريب المهني للشباب للمساهمة في توطين الصناعة.',
        cost: 60000,
        reputationBoost: 14,
        completed: false
      },
      {
        id: 'benban_solar_energy',
        type: 'mega',
        title: 'المشاركة في تحالف تمويل محطة بنبان للطاقة الشمسية (أسوان)',
        description: 'تمويل أكبر مجمع طاقة شمسية في الشرق الأوسط، يدر عائداً سنوياً مستداماً 19%.',
        cost: 250000,
        reputationBoost: 18,
        depositInflux: 800000,
        monthlyReturn: 4200,
        completed: false
      },
      {
        id: 'damietta_grain_silos',
        type: 'mega',
        title: 'تمويل صوامع الغلال اللوجستية الحديثة (ميناء دمياط)',
        description: 'مشروع أمن غذائي قومي لتأمين احتياطي الحبوب، بعائد استثماري 22% وتدفق ودائع حكومية.',
        cost: 750000,
        reputationBoost: 25,
        depositInflux: 2500000,
        monthlyReturn: 14000,
        completed: false
      }
    ];
  }

  sponsorInitiative(id) {
    const item = this.initiatives.find(i => i.id === id);
    if (!item) return { success: false, msg: 'المبادرة غير موجودة.' };
    if (item.completed) return { success: false, msg: 'تمت المساهمة في هذا المشروع بالفعل.' };

    if (this.state.treasuryCash < item.cost) {
      return {
        success: false,
        msg: `السيولة بالخزينة لا تكفي للمساهمة. المطلوب: ${item.cost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.state.treasuryCash -= item.cost;
    item.completed = true;
    this.state.reputation = Math.min(100, this.state.reputation + item.reputationBoost);

    if (item.depositInflux) {
      this.state.totalDeposits += item.depositInflux;
      this.state.treasuryCash += Math.round(item.depositInflux * 0.2); // سيولة فورية من تدفق الصناديق
    }

    this.state.saveGame();

    return {
      success: true,
      msg: `تم اعتماد المساهمة في [${item.title}] بنجاح! حظي البنك بإشادة وطنية وارتفعت ثقة السوق بمقدار +${item.reputationBoost}%.`
    };
  }

  calculateMonthlyReturns() {
    let total = 0;
    this.initiatives.forEach(item => {
      if (item.completed && item.monthlyReturn) {
        total += item.monthlyReturn;
      }
    });
    return total;
  }

  getState() {
    return {
      initiatives: this.initiatives.map(i => ({
        id: i.id,
        completed: i.completed
      }))
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.initiatives && Array.isArray(data.initiatives)) {
      data.initiatives.forEach(savedItem => {
        const target = this.initiatives.find(i => i.id === savedItem.id);
        if (target) {
          target.completed = !!savedItem.completed;
        }
      });
    }
  }
}
