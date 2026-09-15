/**
 * LifestyleStoreManager.js
 * Manages the banker's personal wealth economy, luxury estate, vehicle fleet,
 * designer wardrobe, luxury watches, and elite memberships.
 * Directly impacts vital stats: Prestige, Stress Reduction, Energy Recovery, and Charisma.
 */
export class LifestyleStoreManager {
  constructor(careerManager) {
    this.careerManager = careerManager;

    // Owned Asset IDs
    this.ownedAssets = ['transit_public', 'apt_rental_popular', 'suit_graduate'];

    // Currently Active / Equipped Assets
    this.activeVehicle = 'transit_public';
    this.activeResidence = 'apt_rental_popular';
    this.activeWardrobe = 'suit_graduate';
    this.activeWatch = null;

    // Full Lifestyle & Luxury Catalog
    this.catalog = {
      // 1. Vehicles (معرض السيارات)
      vehicles: [
        {
          id: 'transit_public',
          name: 'المواصلات العامة ومترو الأنفاق',
          category: 'vehicles',
          icon: '🚇',
          price: 0,
          monthlyExpense: 600,
          prestigeBonus: 0,
          stressPenalty: 12,
          energyImpact: -10,
          charismaBonus: 0,
          desc: 'زحام المترو وتدافع الأتوبيسات في أوقات الذروة. تستهلك طاقتك وتزيد التوتر وخطر التأخير عن العمل.',
          isDefault: true
        },
        {
          id: 'car_used_economy',
          name: 'سيارة اقتصادية مستعملة (فيات بونتو / هيونداي فيرنا)',
          category: 'vehicles',
          icon: '🚗',
          price: 160000,
          monthlyExpense: 2200,
          prestigeBonus: 8,
          stressPenalty: 0,
          energyImpact: 0,
          charismaBonus: 2,
          desc: 'وسيلة انتقال عملية تحميك من بهدلة المواصلات وتضمن وصولك للفرع في مواعيدك بانتظام.'
        },
        {
          id: 'car_german_sedan',
          name: 'سيدان ألماني حديث (مرسيدس C-Class / بي إم دبليو 3 Series)',
          category: 'vehicles',
          icon: '🚘',
          price: 1350000,
          monthlyExpense: 8500,
          prestigeBonus: 24,
          stressPenalty: 0,
          energyImpact: 5,
          charismaBonus: 15,
          desc: 'سيارة تنفيذية راقية تعكس نجاحك المهني السريع؛ ترفع ثقة عملاء الائتمان ومبيعات الشهادات الكبرى.'
        },
        {
          id: 'car_luxury_suv_chauffeur',
          name: 'سيارة فارهة دفع رباعي بسائق خاص (رينج روفر فوج / مرسيدس GLS)',
          category: 'vehicles',
          icon: '🚙',
          price: 4800000,
          monthlyExpense: 24000,
          prestigeBonus: 45,
          stressPenalty: 0,
          energyImpact: 15,
          charismaBonus: 30,
          desc: 'قمة الرفاهية والهيبة؛ المقعد الخلفي مجهز لمراجعة ملفات الشركات وتوقيع الصفقات أثناء الطريق.'
        },
        {
          id: 'car_supercar_exotic',
          name: 'سيارة رياضية خارقة (بورشه 911 توربو S)',
          category: 'vehicles',
          icon: '🏎️',
          price: 12500000,
          monthlyExpense: 45000,
          prestigeBonus: 70,
          stressPenalty: 0,
          energyImpact: 10,
          charismaBonus: 45,
          desc: 'تذكرة دخول مباشرة إلى مجتمع المليارديرات وكبار المستثمرين؛ هيبة مطلقة أمام الجميع.'
        }
      ],

      // 2. Real Estate (المكاتب العقارية والمقار السكنية)
      realEstate: [
        {
          id: 'apt_rental_popular',
          name: 'شقة إيجار في حي شعبي متواضع (فيصل / شبرا)',
          category: 'realEstate',
          icon: '🏢',
          price: 0,
          monthlyExpense: 2800,
          prestigeBonus: 0,
          stressPenalty: 15,
          energyRecovery: 40,
          desc: 'سكن اقتصادي في البدايات، ضوضاء مستمرة تؤخر استعادة طاقتك وتزيد من توترك النفسي.',
          isDefault: true
        },
        {
          id: 'apt_upscale_heliopolis',
          name: 'شقة تمليك راقية بهيليوبوليس أو المعادي',
          category: 'realEstate',
          icon: '🌆',
          price: 3400000,
          monthlyExpense: 6000,
          prestigeBonus: 25,
          stressReduction: 20,
          energyRecovery: 70,
          desc: 'حي تاريخي هادئ وشوارع مشجرة توفر راحة بال حقيقية بعد يوم عمل مصرفي شاق.'
        },
        {
          id: 'villa_duplex_tagamoa',
          name: 'دوبلكس راقٍ بكمبوند خاص (التجمع الخامس)',
          category: 'realEstate',
          icon: '🏡',
          price: 15500000,
          monthlyExpense: 18000,
          prestigeBonus: 50,
          stressReduction: 40,
          energyRecovery: 90,
          desc: 'خصوصية كاملة مع حديقة ومسبح خاص؛ عنوان سكني مرموق يثير إعجاب لجان الترقيات.'
        },
        {
          id: 'chalet_sahel_resort',
          name: 'شاليه شاطئي خاص بخليج رأس الحكمة (الساحل الشمالي)',
          category: 'realEstate',
          icon: '🏖️',
          price: 9200000,
          monthlyExpense: 12000,
          prestigeBonus: 35,
          stressReduction: 50,
          energyRecovery: 100,
          desc: 'ملاذ العطلات الصيفية؛ يتيح لك الاستجمام السنوي لتصفير مؤشر الاحتراق النفسي (Burnout) تماماً.'
        }
      ],

      // 3. Wardrobe & Luxury Accessories (الأزياء والساعات الفاخرة)
      wardrobe: [
        {
          id: 'suit_graduate',
          name: 'بدلة الخريجين الجدد الجاهزة',
          category: 'wardrobe',
          subCategory: 'suit',
          icon: '👔',
          price: 0,
          prestigeBonus: 0,
          charismaBonus: 0,
          desc: 'بدلة قطنية عادية لبداية المشوار من شباك الصراف.',
          isDefault: true
        },
        {
          id: 'suit_italian_wool',
          name: 'بدلة صوف إيطالية مفصلة يدوياً (Scabal / Zegna)',
          category: 'wardrobe',
          subCategory: 'suit',
          icon: '🧥',
          price: 48000,
          prestigeBonus: 15,
          charismaBonus: 18,
          desc: 'أناقة لا تخطئها العين؛ تمنحك كاريزما وثقة استثنائية في اجتماعات لجان الائتمان ومبيعات كبار العملاء.'
        },
        {
          id: 'watch_omega_seamaster',
          name: 'ساعة يد سويسرية كلاسيكية (Omega Seamaster)',
          category: 'wardrobe',
          subCategory: 'watch',
          icon: '⌚',
          price: 185000,
          prestigeBonus: 22,
          charismaBonus: 12,
          desc: 'لمسة رفاهية رصينة على معصمك تبرهن على ذوقك المصرفي الرفيع ودقتك في إدارة الوقت.'
        },
        {
          id: 'watch_rolex_submariner',
          name: 'ساعة رولكس ديت جست ذهب أبيض (Rolex Submariner Gold)',
          category: 'wardrobe',
          subCategory: 'watch',
          icon: '👑',
          price: 520000,
          prestigeBonus: 40,
          charismaBonus: 25,
          desc: 'الأيقونة العالمية للثراء والمكانة المالية؛ شرط نفسي غير معلن لكسب ثقة حيتان رجال الأعمال VIP.'
        },
        {
          id: 'pen_cufflinks_gold',
          name: 'قلم حبر مون بلان مطلي بالذهب مع أزرار أكمام مرصعة',
          category: 'wardrobe',
          subCategory: 'accessories',
          icon: '✒️',
          price: 75000,
          prestigeBonus: 12,
          charismaBonus: 10,
          desc: 'هيبة خاصة عند توقيع العقود الائتمانية والقرارات الإدارية الكبرى أمام أعين الجميع.'
        }
      ],

      // 4. Memberships & Wellness (النوادي والاستجمام الاجتماعي)
      memberships: [
        {
          id: 'club_gezirah_zamalek',
          name: 'عضوية عاملة بنادي الجزيرة الرياضي (الزمالك)',
          category: 'memberships',
          icon: '🎾',
          price: 650000,
          monthlyExpense: 3500,
          prestigeBonus: 30,
          stressReduction: 15,
          desc: 'ملتقى العائلات الأرستقراطية وكبار رجالات الدولة؛ نافذة سحرية لبناء شبكة علاقات وتسهيل الصفقات.'
        },
        {
          id: 'club_shooting_dokki',
          name: 'عضوية نادي الصيد المصري (الدقي)',
          category: 'memberships',
          icon: '🎯',
          price: 450000,
          monthlyExpense: 2500,
          prestigeBonus: 20,
          stressReduction: 10,
          desc: 'بيئة هادئة وراقية لممارسة الرياضة وتوسيع المعارف مع كبار المهنيين وأطباء المجتمع.'
        }
      ]
    };
  }

  /**
   * Returns all items across categories flat or grouped
   */
  getAllItems() {
    return [
      ...this.catalog.vehicles,
      ...this.catalog.realEstate,
      ...this.catalog.wardrobe,
      ...this.catalog.memberships
    ];
  }

  getItemById(id) {
    return this.getAllItems().find(item => item.id === id);
  }

  isOwned(id) {
    return this.ownedAssets.includes(id);
  }

  /**
   * Purchase an asset using personal wealth
   */
  buyAsset(assetId, playerCash) {
    const item = this.getItemById(assetId);
    if (!item) {
      return { success: false, msg: 'العنصر المطلوب غير متوفر في الكتالوج.' };
    }

    if (this.isOwned(assetId)) {
      return { success: false, msg: 'أنت تمتلك هذا الأصل بالفعل في مقتنياتك.' };
    }

    if (playerCash < item.price) {
      const shortage = item.price - playerCash;
      return {
        success: false,
        msg: 'رصيدك الشخصي غير كافٍ! ينقصك ' + shortage.toLocaleString('ar-EG') + ' ج.م لإتمام الشراء.'
      };
    }

    // Add to owned
    this.ownedAssets.push(assetId);

    // Auto-equip if better
    if (item.category === 'vehicles') this.activeVehicle = assetId;
    if (item.category === 'realEstate') this.activeResidence = assetId;
    if (item.category === 'wardrobe') {
      if (item.subCategory === 'suit') this.activeWardrobe = assetId;
      if (item.subCategory === 'watch') this.activeWatch = assetId;
    }

    return {
      success: true,
      price: item.price,
      item,
      msg: '🎉 مبروك! قمت باقتناء "' + item.name + '" بنجاح! ارتفعت مكانتك الاجتماعية وبرستيجك.'
    };
  }

  /**
   * Equip / activate an owned asset
   */
  equipAsset(assetId) {
    if (!this.isOwned(assetId)) {
      return { success: false, msg: 'أنت لا تمتلك هذا الأصل لتفعيله.' };
    }

    const item = this.getItemById(assetId);
    if (!item) return { success: false, msg: 'عنصر غير موجود.' };

    if (item.category === 'vehicles') this.activeVehicle = assetId;
    if (item.category === 'realEstate') this.activeResidence = assetId;
    if (item.category === 'wardrobe') {
      if (item.subCategory === 'suit') this.activeWardrobe = assetId;
      if (item.subCategory === 'watch') this.activeWatch = assetId;
    }

    return { success: true, msg: 'تم تفعيل "' + item.name + '" للاستخدام اليومي.' };
  }

  /**
   * Calculate cumulative lifestyle bonuses
   */
  calculateTotalBonuses() {
    let prestige = 0;
    let charisma = 0;
    let stressReduction = 0;
    let energyBonus = 0;
    let totalMonthlyExpenses = 0;

    this.ownedAssets.forEach(id => {
      const item = this.getItemById(id);
      if (!item) return;

      if (item.prestigeBonus) prestige += item.prestigeBonus;
      if (item.charismaBonus) charisma += item.charismaBonus;
      if (item.stressReduction) stressReduction += item.stressReduction;
      if (item.energyRecovery) energyBonus += (item.energyRecovery - 40) * 0.2;
      if (item.energyImpact) energyBonus += item.energyImpact;
      if (item.monthlyExpense) totalMonthlyExpenses += item.monthlyExpense;
    });

    return {
      prestige: Math.min(100, prestige),
      charisma: Math.min(100, charisma),
      stressReduction: Math.min(60, stressReduction),
      energyBonus: Math.round(energyBonus),
      monthlyExpenses: totalMonthlyExpenses
    };
  }

  /**
   * Export / Save State
   */
  exportState() {
    return {
      ownedAssets: this.ownedAssets,
      activeVehicle: this.activeVehicle,
      activeResidence: this.activeResidence,
      activeWardrobe: this.activeWardrobe,
      activeWatch: this.activeWatch
    };
  }

  /**
   * Import / Load State
   */
  importState(data = {}) {
    if (!data) return;
    if (Array.isArray(data.ownedAssets)) this.ownedAssets = data.ownedAssets;
    if (data.activeVehicle) this.activeVehicle = data.activeVehicle;
    if (data.activeResidence) this.activeResidence = data.activeResidence;
    if (data.activeWardrobe) this.activeWardrobe = data.activeWardrobe;
    if (data.activeWatch) this.activeWatch = data.activeWatch;
  }
}
