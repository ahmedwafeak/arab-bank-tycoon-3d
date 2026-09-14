/**
 * VendorsManager - Facility Procurement & Operational Service Contracts
 * Manages contracts with external Egyptian companies for:
 * 1. Security & Cash-in-Transit (الأمن والحراسة ونقل الأموال)
 * 2. Facility Cleaning & Sanitization (النظافة والتعقيم وإدارة المقرات)
 * 3. Technical Maintenance & Network/ATM Support (الصيانة الفنية ودعم الشبكات والـ ATM)
 */
export class VendorsManager {
  constructor(gameState) {
    this.state = gameState;

    // Active contracts map: { security: vendorId|null, cleaning: vendorId|null, maintenance: vendorId|null }
    this.activeContracts = {
      security: null,
      cleaning: null,
      maintenance: null
    };

    // Available vendor catalog with competing tenders/proposals
    this.vendorCatalog = {
      security: [
        {
          id: 'sec_budget',
          name: 'شركة النسر للحراسات المدنية',
          tier: 'اقتصادي',
          badgeClass: 'badge-secondary',
          monthlyCost: 8000,
          robberyReduction: 0.35, // -35% robbery risk
          bankRunProtection: 0.15,
          reputationBonus: 1,
          description: 'توفير حراسة أمنية تقليدية على بوابات الفروع بالورديات الصباحية والمسائية مع معدات مراقبة أساسية.',
          perks: [
            'خفير حراسة مرخص على بوابة الفرع',
            'خفض احتمالية السطو والسرقة بنسبة 35%',
            'كاميرات مراقبة تسجيل تناظري (CCTV)'
          ]
        },
        {
          id: 'sec_standard',
          name: 'فالكون مصر للأمن ونقل الأموال',
          tier: 'احترافي قياسي',
          badgeClass: 'badge-primary',
          monthlyCost: 22000,
          robberyReduction: 0.75, // -75% robbery risk
          bankRunProtection: 0.50, // 50% protection from deposit panic leakage
          reputationBonus: 4,
          description: 'حراسة مسلحة ومدرعة 24/7 مع أسطول سيارات مصفحة لنقل الأموال وتأمين الخزينة الرئيسية والفروع.',
          perks: [
            'سيارات نقل أموال مصفحة ومؤمنة ضد الحوادث',
            'خفض حوادث السطو المسلح بنسبة 75%',
            'حماية الخزائن بنسبة 50% أثناء أزمة هجوم المودعين (Bank Run)',
            'رفع سمعة الأمان والاطمئنان للمودعين (+4 نقاط)'
          ]
        },
        {
          id: 'sec_vip',
          name: 'مجموعة أمان إنترناشيونال للحلول السيادية',
          tier: 'نخبة VIP',
          badgeClass: 'badge-gold',
          monthlyCost: 55000,
          robberyReduction: 0.95, // -95% robbery risk
          bankRunProtection: 0.85,
          reputationBonus: 9,
          description: 'حراسة خاصة فائقة التدريب مع غرف تحكم ذكية تعمل بالذكاء الاصطناعي وبوابات بيومترية مصفحة ضد الرصاص.',
          perks: [
            'فرق تدخل سريع وتأمين بيومتري ذكي بالبصمة',
            'إحباط محاولات السطو بنسبة شبه مطلقة 95%',
            'تأمين سيادي يحمي فروع البنك في أصعب الأزمات والذعر المصرفي',
            'تعزيز ثقة كبار المستثمرين والمؤسسات الدولية (+9 نقاط سمعة)'
          ]
        }
      ],

      cleaning: [
        {
          id: 'clean_budget',
          name: 'المقاول المصري للنظافة والخدمات العامة',
          tier: 'اقتصادي',
          badgeClass: 'badge-secondary',
          monthlyCost: 5000,
          satisfactionBonus: 0.04,
          depositGrowthBonus: 0.01,
          reputationBonus: 1,
          description: 'خدمات النظافة اليومية لجمع المخلفات وتنظيف صالات الانتظار وشبابيك الخدمة بأسعار اقتصادية.',
          perks: [
            'عمالة يومية لتنظيف الصالات والمكاتب',
            'تحسين مظهر الفرع وزيادة رضا المراجعين +4%',
            'مواد تنظيف محلية قياسية'
          ]
        },
        {
          id: 'clean_standard',
          name: 'طيبة سيرفيس للتعقيم وإدارة المرافق',
          tier: 'احترافي قياسي',
          badgeClass: 'badge-primary',
          monthlyCost: 14000,
          satisfactionBonus: 0.12,
          depositGrowthBonus: 0.05,
          reputationBonus: 3,
          description: 'إدارة متكاملة لنظافة وتعقيم الفروع بما يطابق المعايير المصرفية، واجهات زجاجية براقة، ومعطرات هواء فاخرة.',
          perks: [
            'تعقيم شامل دوري لأجهزة ومقاعد الفروع والمصاعد',
            'صالات انتظار فندقية مريحة تزيد رضا العملاء بنسبة +12%',
            'زيادة معدل استقرار وجذب الودائع اليومية بنسبة +5%',
            'زيادة سمعة البنك (+3 نقاط)'
          ]
        },
        {
          id: 'clean_vip',
          name: 'رويال فاسيلتي للمنشآت المصرفية الكبرى',
          tier: 'نخبة VIP',
          badgeClass: 'badge-gold',
          monthlyCost: 35000,
          satisfactionBonus: 0.25,
          depositGrowthBonus: 0.10,
          reputationBonus: 7,
          description: 'أعلى معايير الفندقة 5 نجوم مع طاقم ضيافة مخصص لصالات كبار العملاء والـ VIP وخدمات تعقيم متقدمة.',
          perks: [
            'طاقم ضيافة فندقية لكبار العملاء (مشروبات وضيافة راقية)',
            'رفع رضا العملاء بنسبة +25% واستبقاء كامل لكبار المودعين',
            'مظهر استثنائي يعكس قوة البنك ومكانته في السوق (+7 نقاط سمعة)'
          ]
        }
      ],

      maintenance: [
        {
          id: 'maint_budget',
          name: 'الورش الفنية السريعة للصيانة',
          tier: 'اقتصادي',
          badgeClass: 'badge-secondary',
          monthlyCost: 6000,
          atmBreakdownReduction: 0.25, // -25% ATM downtime
          instapayStabilityBonus: 0.05,
          reputationBonus: 1,
          description: 'صيانة عند الطلب للأعطال الطارئة في ماكينات الصراف الآلي وشبكة الكهرباء وأجهزة التكييف.',
          perks: [
            'إصلاح الأعطال عند الطلب خلال 24 ساعة',
            'تقليل فترات خروج ماكينات الـ ATM من الخدمة بنسبة 25%',
            'تكلفة اشتراك شهري مخفضة ومناسبة'
          ]
        },
        {
          id: 'maint_standard',
          name: 'الشركة المصرية للهندسة والتكييف والشبكات',
          tier: 'احترافي قياسي',
          badgeClass: 'badge-primary',
          monthlyCost: 18000,
          atmBreakdownReduction: 0.65,
          instapayStabilityBonus: 0.20,
          reputationBonus: 4,
          description: 'صيانة وقائية دورية شهرياً لكافة ماكينات الصراف الآلي، تبريد غرف السيرفرات، ومولدات الكهرباء الاحتياطية.',
          perks: [
            'صيانة دورية أسبوعية للـ ATM تقلل الأعطال بنسبة 65%',
            'تبريد غرف خوادم إنستاباي لتقليل احتمالية توقف المعاملات بنسبة 20%',
            'قطع غيار أصلية وسرعة استجابة في أقل من 3 ساعات',
            'استقرار تشغيلي يرفع السمعة (+4 نقاط)'
          ]
        },
        {
          id: 'maint_vip',
          name: 'شنايدر وسيمنز للحلول الهندسية الذكية',
          tier: 'نخبة VIP',
          badgeClass: 'badge-gold',
          monthlyCost: 45000,
          atmBreakdownReduction: 0.98, // Zero ATM breakdown
          instapayStabilityBonus: 0.40,
          reputationBonus: 8,
          description: 'مراقبة ومتابعة تشغيلية عبر الذكاء الاصطناعي على مدار الساعة مع صيانة تنبؤية تضمن صفر أعطال لماكينات الصراف وخوادم البنك.',
          perks: [
            'صيانة استباقية بالذكاء الاصطناعي تضمن 0 أعطال لماكينات الـ ATM بنسبة 98%',
            'أقصى استقرار لسيرفرات إنستاباي والربط اللحظي مع البنك المركزي',
            'استدامة الطاقة بمولدات UPS فائقة القوة تمنع انقطاع الفروع لحظة واحدة',
            'ثقة مؤسسية عالمية (+8 نقاط سمعة)'
          ]
        }
      ]
    };
  }

  getVendorsByCategory(category) {
    return this.vendorCatalog[category] || [];
  }

  getActiveContract(category) {
    const vendorId = this.activeContracts[category];
    if (!vendorId) return null;
    return this.getVendorsByCategory(category).find(v => v.id === vendorId) || null;
  }

  signContract(category, vendorId) {
    if (!this.vendorCatalog[category]) {
      return { success: false, msg: 'فئة التوريد غير صحيحة.' };
    }

    const vendor = this.vendorCatalog[category].find(v => v.id === vendorId);
    if (!vendor) {
      return { success: false, msg: 'عرض الشركة المطلوب غير متاح.' };
    }

    const prevVendor = this.getActiveContract(category);

    // If changing contract, remove previous reputation bonus if needed or apply diff
    if (prevVendor && prevVendor.id === vendor.id) {
      return { success: false, msg: `أنت متعاقد بالفعل مع ${vendor.name}.` };
    }

    // Set active contract
    this.activeContracts[category] = vendor.id;

    // Award immediate reputation bonus
    const repDelta = prevVendor ? Math.max(1, vendor.reputationBonus - prevVendor.reputationBonus) : vendor.reputationBonus;
    this.state.reputation = Math.min(100, this.state.reputation + repDelta);
    this.state.saveGame();

    return {
      success: true,
      msg: `تم توقيع عقد توريد ${category === 'security' ? 'الأمن والحراسة' : category === 'cleaning' ? 'النظافة والتعقيم' : 'الصيانة والدعم الفني'} بنجاح مع «${vendor.name}» بتكلفة شهريّة ${vendor.monthlyCost.toLocaleString('ar-EG')} ج.م.`
    };
  }

  cancelContract(category) {
    const current = this.getActiveContract(category);
    if (!current) {
      return { success: false, msg: 'لا يوجد عقد نشط في هذه الفئة لإلغائه.' };
    }

    this.activeContracts[category] = null;
    this.state.saveGame();

    return {
      success: true,
      msg: `تم إلغاء التعاقد مع «${current.name}» وإيقاف الرسوم الشهرية.`
    };
  }

  getTotalMonthlyExpenses() {
    let total = 0;
    for (const cat of ['security', 'cleaning', 'maintenance']) {
      const active = this.getActiveContract(cat);
      if (active) {
        total += active.monthlyCost;
      }
    }
    // 20% executive discount if vendor_negotiator perk is active
    if (this.state.executiveLifeManager && typeof this.state.executiveLifeManager.hasPerk === 'function' && this.state.executiveLifeManager.hasPerk('vendor_negotiator')) {
      total = Math.round(total * 0.80);
    }
    return total;
  }

  getSecurityProtectionFactor() {
    const sec = this.getActiveContract('security');
    return sec ? sec.robberyReduction : 0;
  }

  getBankRunProtectionFactor() {
    const sec = this.getActiveContract('security');
    return sec ? sec.bankRunProtection : 0;
  }

  getCleaningSatisfactionFactor() {
    const clean = this.getActiveContract('cleaning');
    return clean ? clean.satisfactionBonus : 0;
  }

  getMaintenanceAtmFactor() {
    const maint = this.getActiveContract('maintenance');
    return maint ? maint.atmBreakdownReduction : 0;
  }

  getMaintenanceInstaPayFactor() {
    const maint = this.getActiveContract('maintenance');
    return maint ? maint.instapayStabilityBonus : 0;
  }

  getState() {
    return {
      activeContracts: { ...this.activeContracts }
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.activeContracts) {
      this.activeContracts = { ...this.activeContracts, ...data.activeContracts };
    }
  }
}
