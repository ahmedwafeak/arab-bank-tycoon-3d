/**
 * ExecutiveLifeManager - CEO Personal Life, Wellbeing & Executive Estate Engine
 * Models the executive's personal wellbeing, family life, integrity, personal wealth,
 * and luxury lifestyle assets, creating a deep dual-impact link with the Bank.
 */
export class ExecutiveLifeManager {
  constructor(gameState) {
    this.state = gameState;

    // Core Personal Vital Stats (0 - 100)
    this.energy = 85;       // الطاقة والنشاط الجسدي (0: انهيار تام، 100: ذروة النشاط)
    this.stress = 20;       // مؤشر التوتر والاحتراق النفسي (Burnout: >75% خطر)
    this.family = 80;       // التوازن الأسري والعائلي (0: قطيعة أسرية، 100: استقرار تام)
    this.integrity = 90;    // النزاهة والذمة المالية (0: فساد كامل، 100: نزاهة مطلقة)
    this.socialPrestige = 35; // الوجاهة الاجتماعية والنفوذ

    // Personal Finances (منفصلة تماماً عن خزينة البنك)
    this.personalWealth = 65000; // الرصيد الشخصي بالجنيه المصري
    this.monthlySalary = 35000;  // الراتب التنفيذي الشهري

    // Owned Luxury Assets & Estate
    this.ownedAssets = ['car_sedan_standard']; // Starts with standard family sedan

    // Executive Perks & High Finance Influence
    this.executivePerks = ['vendor_negotiator'];
    this.perksCatalog = [
      {
        id: 'vendor_negotiator',
        name: 'مفاوض العقود المخضرم (Vendor Negotiator)',
        icon: '🤝',
        desc: 'علاقات شخصية قوية مع الموردين تخفض تكاليف شركات الخدمات بنسبة 20% شهرياً.',
        cost: 35000,
        prestigeReq: 30
      },
      {
        id: 'pr_shield',
        name: 'درع العلاقات العامة (PR Shield)',
        icon: '🛡️',
        desc: 'شبكة قوية من الصحفيين والإعلاميين تمتص 40% من أثر الشائعات والصدمات.',
        cost: 60000,
        prestigeReq: 50
      },
      {
        id: 'cbe_lobbyist',
        name: 'نفوذ مجتمع المال والأعمال (High Finance Influence)',
        icon: '🏛️',
        desc: 'ثقل مصرفي رفيع يرفع تساهل لجان التفتيش والرقابة ويعزز السمعة العامة.',
        cost: 95000,
        prestigeReq: 65
      }
    ];

    // Lifestyle Catalog
    this.lifestyleCatalog = [
      {
        id: 'car_mercedes_s',
        category: 'cars',
        name: 'مرسيدس S-Class موديل العام',
        icon: '🚘',
        cost: 3200000,
        prestigeBonus: 25,
        stressReduction: 5,
        desc: 'سيارة رئاسية فاخرة تعكس نفوذك وتمنحك هيبة استثنائية عند حضور اجتماعات البنك المركزي وكبار المستثمرين.'
      },
      {
        id: 'car_bmw_7',
        category: 'cars',
        name: 'بي إم دبليو الفئة السابعة الرياضية',
        icon: '🏎️',
        cost: 2800000,
        prestigeBonus: 20,
        stressReduction: 5,
        desc: 'سيارة تنفيذية رياضية أنيقة تعبر عن الحيوية والنجاح المالي السريع.'
      },
      {
        id: 'villa_tagamoa',
        category: 'real_estate',
        name: 'فيلا فارهة بكمبوند خاص (التجمع الخامس)',
        icon: '🏡',
        cost: 14500000,
        prestigeBonus: 40,
        familyBonus: 25,
        stressReduction: 15,
        desc: 'مقر سكني هادئ مع حديقة ومسبح خاص يوفر راحة بال واستقراراً أسرياً تاماً بعيداً عن صخب العمل.'
      },
      {
        id: 'chalet_sahel',
        category: 'real_estate',
        name: 'شاليه شاطئي برأس الحكمة (الساحل الشمالي)',
        icon: '🏖️',
        cost: 8500000,
        prestigeBonus: 25,
        familyBonus: 20,
        stressReduction: 20,
        desc: 'ملاذ صيفي راقٍ لقضاء العطلات مع الأسرة والاستجمام واستعادة الطاقة الذهنية.'
      },
      {
        id: 'club_gezirah',
        category: 'memberships',
        name: 'عضوية نادي الجزيرة الرياضي العريق (الزمالك)',
        icon: '🏇',
        cost: 750000,
        prestigeBonus: 30,
        familyBonus: 10,
        desc: 'ملتقى النخبة السياسية والاقتصادية وكبار العائلات المصرفية، يوفر شبكة علاقات وتسهيلات لا تقدر بثمن.'
      },
      {
        id: 'club_shooting',
        category: 'memberships',
        name: 'عضوية نادي الصيد المصري (الدقي)',
        icon: '🎯',
        cost: 500000,
        prestigeBonus: 20,
        familyBonus: 15,
        desc: 'بيئة اجتماعية ورياضية راقية للعائلة والأنشطة الاجتماعية.'
      }
    ];

    // Wellness & Vacation Packages
    this.wellnessOptions = [
      {
        id: 'vacation_gouna',
        name: 'عطلة استجمام 4 أيام في الجونة',
        cost: 45000,
        stressDelta: -35,
        energyDelta: +40,
        familyDelta: +15,
        desc: 'رحلة بحرية هادئة على مياه البحر الأحمر تصفي الذهن وتفرغ ضغوط البنك والاجتماعات الشاقة.'
      },
      {
        id: 'vacation_siwa',
        name: 'رحلة استشفاء واسترخاء في واحة سيوة',
        cost: 25000,
        stressDelta: -45,
        energyDelta: +35,
        familyDelta: +10,
        desc: 'بحيرات الملح وعيون المياه الكبريتية والهدوء الصحراوي لعلاج الإرهاق الذهني والتوتر العصبي.'
      },
      {
        id: 'family_dinner',
        name: 'سهرة عائلية فاخرة بنيل الزمالك',
        cost: 6500,
        stressDelta: -15,
        energyDelta: +10,
        familyDelta: +25,
        desc: 'عشاء دافئ مع الأسرة لتعويض الغياب الطويل وإصلاح أي خلافات ناتجة عن انشغالك بالبنك.'
      }
    ];
  }

  processMonth(bankProfit) {
    // 1. Collect monthly executive salary
    let income = this.monthlySalary;

    // 2. Executive Performance Bonus (1% of net monthly profit if bank is in surplus)
    let profitBonus = 0;
    if (bankProfit > 0) {
      profitBonus = Math.round(bankProfit * 0.012);
      income += profitBonus;
    }
    this.personalWealth += income;

    // 3. Work strain on energy & stress
    // High bank activity increases stress unless offset by lifestyle
    let stressIncrease = 8;
    if (this.state.bankRunManager && this.state.bankRunManager.isBankRunActive) {
      stressIncrease += 20; // Extreme stress during bank run crisis
    }

    this.stress = Math.min(100, Math.max(0, this.stress + stressIncrease));
    this.energy = Math.min(100, Math.max(10, this.energy - 5));

    // Slight family decay if stress is very high
    if (this.stress > 65) {
      this.family = Math.max(15, this.family - 4);
    }

    return {
      income,
      profitBonus,
      stress: this.stress,
      energy: this.energy,
      family: this.family
    };
  }

  takeWellness(optionId) {
    const opt = this.wellnessOptions.find(o => o.id === optionId);
    if (!opt) return { success: false, msg: 'خيار الاستجمام غير موجود.' };

    if (this.personalWealth < opt.cost) {
      return {
        success: false,
        msg: `عفواً، رصيدك الشخصي لا يكفي. التكلفة: ${opt.cost.toLocaleString('ar-EG')} ج.م، ورصيدك الحالي: ${this.personalWealth.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.personalWealth -= opt.cost;
    this.stress = Math.max(0, this.stress + opt.stressDelta);
    this.energy = Math.min(100, this.energy + opt.energyDelta);
    this.family = Math.min(100, this.family + opt.familyDelta);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم قضاء «${opt.name}» بنجاح! انخفض التوتر بمقدار ${Math.abs(opt.stressDelta)}% وارتفعت طاقتك ونشاطك.`
    };
  }

  buyLifestyleAsset(assetId) {
    if (this.ownedAssets.includes(assetId)) {
      return { success: false, msg: 'أنت تمتلك هذا الأصل بالفعل في مقتنياتك الشخصية.' };
    }

    const item = this.lifestyleCatalog.find(i => i.id === assetId);
    if (!item) return { success: false, msg: 'العنصر غير موجود في قائمة المقتنيات.' };

    if (this.personalWealth < item.cost) {
      return {
        success: false,
        msg: `عفواً، ثروتك الشخصية لا تكفي لشراء هذا الأصل. المطلوب: ${item.cost.toLocaleString('ar-EG')} ج.م، ورصيدك: ${this.personalWealth.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.personalWealth -= item.cost;
    this.ownedAssets.push(item.id);

    if (item.prestigeBonus) this.socialPrestige = Math.min(100, this.socialPrestige + item.prestigeBonus);
    if (item.familyBonus) this.family = Math.min(100, this.family + item.familyBonus);
    if (item.stressReduction) this.stress = Math.max(0, this.stress - item.stressReduction);

    this.state.saveGame();

    return {
      success: true,
      msg: `مبارك! تم شراء «${item.name}» وضمها لأملاكك الخاصة. ارتفعت مكانتك الاجتماعية والوجاهة بنسبة ملحوظة.`
    };
  }

  hasAsset(assetId) {
    return this.ownedAssets.includes(assetId);
  }

  hasPerk(perkId) {
    return Array.isArray(this.executivePerks) && this.executivePerks.includes(perkId);
  }

  unlockPerk(perkId) {
    if (this.hasPerk(perkId)) {
      return { success: false, msg: 'هذه الميزة مفعلة بالفعل لديك.' };
    }
    const perk = this.perksCatalog.find(p => p.id === perkId);
    if (!perk) return { success: false, msg: 'الميزة غير موجودة في الدليل.' };

    if (this.socialPrestige < perk.prestigeReq) {
      return {
        success: false,
        msg: `تحتاج وجاهة ونفوذ اجتماعي (${perk.prestigeReq}) على الأقل لتفعيل هذه الميزة. نفوذك الحالي: (${this.socialPrestige}).`
      };
    }

    if (this.personalWealth < perk.cost) {
      return {
        success: false,
        msg: `الرصيد الشخصي لا يكفي لتفعيل الميزة. التكلفة: ${perk.cost.toLocaleString('ar-EG')} ج.م.`
      };
    }

    this.personalWealth -= perk.cost;
    this.executivePerks.push(perkId);
    this.socialPrestige = Math.min(100, this.socialPrestige + 5);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم بنجاح تفعيل ميزة الإدارة العليا: [${perk.name}]!`
    };
  }

  getBurnoutPenalty() {
    if (this.stress >= 80) {
      return {
        active: true,
        desc: 'إرهاق مصرفي حاد (Executive Burnout): بطء في اتخاذ القرار وتراجع معنويات الفريق -10%.'
      };
    }
    return { active: false, desc: '' };
  }

  getState() {
    return {
      energy: this.energy,
      stress: this.stress,
      family: this.family,
      integrity: this.integrity,
      socialPrestige: this.socialPrestige,
      personalWealth: this.personalWealth,
      monthlySalary: this.monthlySalary,
      ownedAssets: [...this.ownedAssets],
      executivePerks: [...this.executivePerks]
    };
  }

  loadState(data) {
    if (!data) return;
    if (typeof data.energy === 'number') this.energy = data.energy;
    if (typeof data.stress === 'number') this.stress = data.stress;
    if (typeof data.family === 'number') this.family = data.family;
    if (typeof data.integrity === 'number') this.integrity = data.integrity;
    if (typeof data.socialPrestige === 'number') this.socialPrestige = data.socialPrestige;
    if (typeof data.personalWealth === 'number') this.personalWealth = data.personalWealth;
    if (typeof data.monthlySalary === 'number') this.monthlySalary = data.monthlySalary;
    if (Array.isArray(data.ownedAssets)) this.ownedAssets = [...data.ownedAssets];
    if (Array.isArray(data.executivePerks)) this.executivePerks = [...data.executivePerks];
  }
}
