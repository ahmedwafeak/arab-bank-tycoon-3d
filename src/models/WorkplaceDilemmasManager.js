/**
 * WorkplaceDilemmasManager.js
 * Dynamic workplace dilemmas, ethical cross-roads, colleague politics,
 * and corporate headhunting offers across the 7 career stages.
 */
export class WorkplaceDilemmasManager {
  constructor(careerManager) {
    this.careerManager = careerManager;

    // Dilemma Database categorized by stage index (0 to 6)
    this.dilemmasByStage = {
      // Stage 0: Probationary Teller (صراف تحت الاختبار)
      0: [
        {
          id: 'teller_signature_doubt',
          category: 'customer',
          title: 'شيك بمبلغ ضخم واختلاف بسيط في التوقيع',
          character: { name: 'عميل متوتر', role: 'تاجر تجزئة', avatar: '👨‍💼' },
          desc: 'يقف أمامك عميل متعجل يطلب صرف شيك بقيمة 120,000 ج.م نقداً، ويوضح بعصبية: "أنا مستعجل عشان عمال الورشة مستنيين اليومية!". عند مقارنة التوقيع بالشاشة، تلاحظ اختلافاً طفيفاً في التوقيع البنكي المعتمد.',
          options: [
            {
              text: 'رفض الصرف فوراً والإصرار على حضور صاحب الحساب الأصلي أو تأكيد الفرع',
              outcomeDesc: 'غضب العميل وصاح في الصالة، لكن مدير الفرع فاروق لاحظ الموقف وأثنى على يقظتك والتزامك بتعليمات الرقابة.',
              effects: { skill: +8, integrity: +10, stress: +10, performance: +12, colleagueAffinity: { farouk: +10 } }
            },
            {
              text: 'الاتصال بصاحب الحساب هاتفياً للتأكد والتحقق من رقم البطاقة',
              outcomeDesc: 'رد صاحب الحساب وأكد صحة الشيك، شكرك العميل على ذوقك وصبرك، وأنهيت المعاملة بنجاح دون أي خطأ.',
              effects: { skill: +6, integrity: +5, stress: +4, performance: +15, energy: -5 }
            },
            {
              text: 'صرف الشيك لتهدئة العميل وتفادي الشكوى في أول أيامك',
              outcomeDesc: 'صرفت الشيك، لكن عند مطابقة نهاية اليوم اكتشفت الشؤون القانونية وجود بلاغ سرقة دفتر شيكات! تم تحميلك تحقيقاً داخلياً.',
              effects: { skill: -10, integrity: -20, stress: +35, performance: -25, cashShortage: 15000 }
            }
          ]
        },
        {
          id: 'teller_aml_bribe',
          category: 'ethics',
          title: 'عرض رشوة كاش 10,000 ج.م لتجاوز إثبات الدخل',
          character: { name: 'المقاول حودة', role: 'مقاول عشوائيات', avatar: '💼' },
          desc: 'دخل عميل بحقيبة سوداء تحتوي على 650,000 ج.م كاش لإيداعها في حساب شخصي جديد، وعند طلب بطاقة ضريبية وإثبات مصدر الأموال (مكافحة غسيل الأموال AML)، ابتسم وغمز لك ووضع رزمتين 200 جنيه (10,000 ج.م) تحت الشباك قائلاً: "مشّيها يا باشا والشاي ده في جيبك!".',
          options: [
            {
              text: 'رفض الرشوة بحزم وإبلاغ مسؤول الالتزام (Compliance) فوراً',
              outcomeDesc: 'ارتبك العميل وسحب أمواله وهرب. رفعت تقريراً رسمياً نال إشادة مفتش البنك المركزي وسجل نزاهة ناصع.',
              effects: { integrity: +25, prestige: +10, marketReputation: +12, stress: +5, performance: +20 }
            },
            {
              text: 'إخباره بلباقة بالنظام والاعتذار عن قبول أي مبالغ شخصية',
              outcomeDesc: 'أحرجت العميل بأدبك، فقدم أوراق مقاولة قانونية واعتذر عما بدر منه. حافظت على نزاهتك وأنجزت المعاملة.',
              effects: { integrity: +15, skill: +6, performance: +10 }
            },
            {
              text: 'قبول المبلغ وتمرير الإيداع بدعوى أنه "بيع سيارة مستعملة"',
              outcomeDesc: 'وضعت الـ 10,000 ج.م في جيبك، لكن كاميرات المراقبة سجلت حركة يدك! استُدعيت للشؤون القانونية وبدأت التحقيقات.',
              effects: { personalWealth: +10000, integrity: -40, stress: +45, performance: -35 }
            }
          ]
        },
        {
          id: 'teller_elderly_lost_pin',
          category: 'customer',
          title: 'دموع عميلة مسنة أضاعت الرقم السري وصالة مزدحمة',
          character: { name: 'الحاجة فاطمة', role: 'أرملة على المعاش', avatar: '👵' },
          desc: 'في أول الشهر والفرع مزدحم بطوابير المعاشات، جلست سيدة مسنة أمام شباكك تبكي بحرقة لأن الماكينة سحبت كارت المعاش ونسيت الرقم السري، وتحتاج لشراء دواء عاجل. الطابور بالخلف يتذمر من التعطيل.',
          options: [
            {
              text: 'استئذان الطابور بلباقة، ومساعدتها في ملء استمارة بدل فاقد استثنائية وصرف المعاش يدوياً بالبطاقة',
              outcomeDesc: 'دعت لك من قلبها، وهدأ الطابور تقديراً لإنسانيتك. زادت سمعتك الطيبة ونلت ثقة عملاء الحي.',
              effects: { integrity: +15, stress: -5, marketReputation: +10, performance: +15, colleagueAffinity: { fatma: +25 } }
            },
            {
              text: 'توجيهها لمكتب خدمة العملاء للانتظار حسب السياسة المصرفية الصارمة',
              outcomeDesc: 'التزمت باللائحة الصارمة، لكن الموقف ترك أثراً حزيناً في نفسك ونقصت كاريزمتك الإنسانية.',
              effects: { skill: +2, integrity: -5, stress: +10 }
            }
          ]
        }
      ],

      // Stage 1: Senior Vault Teller (صراف أول ومسؤول خزينة)
      1: [
        {
          id: 'vault_shortage_audit',
          category: 'vault',
          title: 'عجز 5,000 ج.م في مطابقة عهدة زميل مبتدئ',
          character: { name: 'محمود فهمي', role: 'صراف مبتدئ', avatar: '👨‍💼' },
          desc: 'أثناء الجرد المسائي لخزينة الفرع تحت إشرافك، تبين وجود عجز 5,000 ج.م في درج زميلك الشاب الذي أجهش بالبكاء متوسلاً: "مرتبي كله 6,000 ج.م وعندي قسط جواز... وحياة والدتك داري عليا!".',
          options: [
            {
              text: 'مراجعة أشرطة الكاش وفيديوهات الصراف بدقة لاكتشاف سبب الخطأ المحاسبي معاً',
              outcomeDesc: 'بعد مراجعة ساعتين، اكتشفتما خطأ إيداع تم قيده مرتين لشباك 2! تم حل العجز رسمياً دون خسارة مليم.',
              effects: { skill: +15, performance: +20, colleagueAffinity: { mahmoud: +30 }, energy: -15 }
            },
            {
              text: 'إثبات العجز بالدفاتر الرسمية وإحالة الأمر لمدير الفرع طبقاً للائحة',
              outcomeDesc: 'حفظت نظام الخزينة دون مجاملة، رغم عتاب الزملاء. أشاد بك مدير العمليات واعتبرك حارساً أميناً للعهدة.',
              effects: { integrity: +15, skill: +10, colleagueAffinity: { farouk: +15, mahmoud: -25 } }
            },
            {
              text: 'دفع المبلغ من جيبك الشخصي لإغلاق الخزينة ومساعدته إنسانياً',
              outcomeDesc: 'أنقذت زميلك من الفصل، واعتبرك مخلصاً له مدى الحياة، لكنك خسرت 5,000 ج.م من مدخراتك الشخصية.',
              effects: { personalWealth: -5000, colleagueAffinity: { mahmoud: +40 }, integrity: +10, stress: -5 }
            }
          ]
        },
        {
          id: 'vault_counterfeit_bill',
          category: 'security',
          title: 'رزمة عملات مزورة متقنة ضمن إيداع صيدلية كبرى',
          character: { name: 'مندوب الصيدليات', role: 'محاسب توريدات', avatar: '🧑‍⚕️' },
          desc: 'أثناء جرد وتغذية الخزينة المركزية، مررت رزمة 200 جنيه تحت جهاز كشف التزييف بالأشعة فوق البنفسجية (UV)، فأعطى إنذاراً بوجود 15 ورقة مزورة بإتقان شديد يصعب تمييزها بالعين المجردة.',
          options: [
            {
              text: 'تحريز الأوراق فوراً وتحرير محضر ضبط تزييف رسمي وإبلاغ مباحث الأموال العامة',
              outcomeDesc: 'تم إيقاف شبكة تزييف نشطة في الحي، ونلت شهادة تقدير عليا من قطاع العمليات بالبنك المركزي.',
              effects: { skill: +20, integrity: +20, prestige: +15, performance: +25 }
            },
            {
              text: 'إرجاع الأوراق المزورة للمندوب وطلب استبدالها بأخرى سليمة دون شوشرة',
              outcomeDesc: 'استبدل المندوب الأوراق بهدوء وشكرك، لكنك تساهلت في جريمة مالية قد تكرر تداولها بالسوق.',
              effects: { integrity: -15, stress: +10, colleagueAffinity: { hazem: -10 } }
            }
          ]
        }
      ],

      // Stage 2: Customer Service Specialist (خدمة عملاء ومبيعات)
      2: [
        {
          id: 'cs_aggressive_target',
          category: 'sales',
          title: 'سباق التارجت: عميلة ترغب في كسر شهادة بخسارة فادحة',
          character: { name: 'مدام نيفين', role: 'طبيبة استشارية', avatar: '👩‍⚕️' },
          desc: 'لديك تارجت شهادات ادخار بقيمة 1.5 مليون ج.م متبقٍ عليه 3 أيام فقط للتقييم الفصلي. حضرت عميلة تملك 2 مليون ج.م وترغب في كسر شهادتها القديمة لشراء أخرى جديدة، لكن كسرها الآن سيكلفها خسارة 70% من العوائد السابقة دون أن تدري.',
          options: [
            {
              text: 'توضيح حسبة الخسارة للعميلة بكل أمانة ونصحها بالانتظار شهرين لتفادي الغرامة',
              outcomeDesc: 'احترمت العميلة أمانتك المطلقة ووثقت بك؛ بعد شهرين جلبت لك مدخرات عائلتها بالكامل (4 ملايين ج.م)!',
              effects: { integrity: +20, charisma: +15, marketReputation: +18, performance: +25 }
            },
            {
              text: 'كسر الشهادة وتحقيق التارجت والحصول على عمولة المبيعات الفورية (12,000 ج.م)',
              outcomeDesc: 'حققت التارجت وحصلت على العمولة، لكن العميلة اكتشفت الخسارة لاحقاً وقدمت شكوى لجهاز حماية المستهلك.',
              effects: { personalWealth: +12000, integrity: -25, stress: +25, performance: -10 }
            }
          ]
        },
        {
          id: 'cs_angry_vip_overdraft',
          category: 'conflict',
          title: 'عميل ثري يهدد بسحب ودائعه بسبب رفض بطاقة في الخارج',
          character: { name: 'عاصم بك الهواري', role: 'رجل أعمال ومستورد', avatar: '🤵' },
          desc: 'اقتحم رجل أعمال غاضب مكتبك مهدداً: "البطاقة البلاتينية اترفضت في مطار باريس قدام الوفد الأوروبي! لو المشكلة ماتحلتش في ربع ساعة هسحب 20 مليون جنيه من الفرع!".',
          options: [
            {
              text: 'استيعاب غضبه، وطلب قهوة له، والتنسيق الفوري مع إدارة العمليات لرفع حد الاستخدام الدولي',
              outcomeDesc: 'تم تفعيل البطاقة فوراً أثناء جلوسه، انبهر بسرعتك وهدوئك وشكرك أمام المدير وأودع مليوناً إضافياً.',
              effects: { skill: +18, charisma: +20, prestige: +15, performance: +20, stress: +5 }
            },
            {
              text: 'إلقاء اللوم على البنك المركزي وتعليمات تدبير العملة للدفاع عن نفسك',
              outcomeDesc: 'زاد غضب العميل وطلب مقابلة رئيس مجلس الإدارة شخصياً، وحصلت على لفت نظر لسوء إدارة الأزمة.',
              effects: { skill: -8, performance: -15, stress: +20 }
            }
          ]
        }
      ],

      // Stage 3: Corporate Credit Analyst (محلل ائتمان وتمويل شركات)
      3: [
        {
          id: 'credit_cooked_balance_sheet',
          category: 'credit',
          title: 'ميزانية مصنع حديد متلاعب بدفاترها ووساطة برلمانية',
          character: { name: 'النائب وفيق سراج', role: 'رجل أعمال وعضو مجلس نواب', avatar: '🏛️' },
          desc: 'تدرس ملف قرض بقيمة 45,000,000 ج.م لتوسعة مصنع صلب. أثناء التدقيق المالي، اكتشفت تضخيماً وهمياً للأرباح عبر فواتير بيع لشركات شقيقة مجهولة. تلقيت اتصالاً من مدير العلاقات الحكومية يهمس: "النائب ده مسنود وبلاش تدقيق زيادة!".',
          options: [
            {
              text: 'كتابة تقرير ائتماني محايد وصارم يوصي برفض القرض وتوضيح المخاطر للجنة العليا',
              outcomeDesc: 'حفظت البنك من تعثر كارثي مؤكد بملايين الجنيهات. أشاد رئيس قطاع المخاطر بصلابتك المهنية النادرة.',
              effects: { skill: +25, integrity: +25, prestige: +20, performance: +30, stress: +15 }
            },
            {
              text: 'طلب تقديم ضمانات عقارية وتغطية بنكية بنسبة 130% كشرط للموافقة',
              outcomeDesc: 'حل ذكي وأمين؛ ألزمت المقترض بتقديم أراضٍ ومخازن مضمونة لتقليل المخاطر إلى الصفر، فوافق الطرفان.',
              effects: { skill: +20, charisma: +15, performance: +25, prestige: +15 }
            },
            {
              text: 'الموافقة على الملف مجاملة للنفوذ وتفادي أي صدام شخصي',
              outcomeDesc: 'تم تمرير القرض، لكن بعد 8 أشهر تعثر المصنع ودخلت النيابة العامة في التحقيقات وطالبت بملف الفحص.',
              effects: { integrity: -35, stress: +45, performance: -30 }
            }
          ]
        }
      ],

      // Stage 4: Private Banking & VIP Wealth Manager (مدير علاقات كبار العملاء)
      4: [
        {
          id: 'vip_celebrity_investor',
          category: 'wealth',
          title: 'صفقة محفظة استثمارية 60 مليون ج.م مع نجم رياضي عالمي',
          character: { name: 'الكابتن طارق رياض', role: 'نجم كرة قدم محترف', avatar: '⚽' },
          desc: 'جلس معك نجم كرة قدم محترف في صالون كبار العملاء يطلب استثمار 60 مليون ج.م في أذون خزانة وعقارات. العميل يشترط مظهراً فخماً وثقة راقية قبل توقيع العقد، ويعرض عليك إدارة أعماله المالية الشخصية مقابل بونص 150,000 ج.م.',
          options: [
            {
              text: 'تصميم محفظة استثمارية متوازنة بالبنك مع توقيع العقد الرسمي داخل الصالون الفاخر',
              outcomeDesc: 'أبهرته بتحليلك المالي وبدلتك الإيطالية الفاخرة وساعتك الرولكس. وقع العقد وحصلت على بونص البنك القانوني.',
              effects: { personalWealth: +150000, prestige: +30, skill: +20, marketReputation: +25 }
            },
            {
              text: 'توجيه جزء من استثماراته لشركة وساطة خاصة بصديقك مقابل عمولة شخصية من تحت الطاولة',
              outcomeDesc: 'جنيت أموالاً سرية طائلة، لكنك خالفت قواعد تعارض المصالح الصارمة، وتسرب الخبر لقطاع التفتيش.',
              effects: { personalWealth: +300000, integrity: -45, stress: +40, marketReputation: -20 }
            }
          ]
        }
      ],

      // Stage 5: Branch Operations Manager (مدير فرع تجاري)
      5: [
        {
          id: 'branch_cbe_surprise_inspection',
          category: 'management',
          title: 'تفتيش مفاجئ من لجان الرقابة بالبنك المركزي CBE',
          character: { name: 'المفتش حازم السويفي', role: 'رئيس فريق التفتيش بالمركزي', avatar: '🕵️' },
          desc: 'دخل فريق تفتيش مفاجئ من البنك المركزي فرعك في التاسعة صباحاً وطالب بفحص ملفات الائتمان ومطابقة الخزينة واختبارات الضغط (Stress Testing). أي ثغرة ستكلف الفرع غرامة وتراجع تقييمك.',
          options: [
            {
              text: 'استقبال الفريق بكل شفافية وثقة وتقديم الدفاتر الرقمية المحدثة وفريق عملك المنضبط',
              outcomeDesc: 'اجتاز فرعك التفتيش بأعلى تقييم رقابي (CAMELS Grade 1)، ورُشح اسمك رسمياً لعضوية مجلس الإدارة!',
              effects: { skill: +30, prestige: +35, performance: +35, marketReputation: +30, colleagueAffinity: { hazem: +35 } }
            },
            {
              text: 'محاولة إخفاء بعض الملفات غير المستوفاة في غرفة الأرشيف الخلفية',
              outcomeDesc: 'اكتشف المفتشون الملفات وسجلوا مخالفة جسيمة لعرقلة التفتيش، مما هدد مستقبلك الوظيفي بالكامل.',
              effects: { integrity: -30, performance: -40, stress: +50, marketReputation: -25 }
            }
          ]
        }
      ],

      // Stage 6: Chairman & CEO (رئيس مجلس الإدارة والعضو المنتدب)
      6: [
        {
          id: 'ceo_sovereign_deal',
          category: 'executive',
          title: 'تمويل مشروع قومي للبنية التحتية برأس الحكمة بـ 2 مليار ج.م',
          character: { name: 'وزير الاستثمار', role: 'ممثل الحكومة', avatar: '🏛️' },
          desc: 'تقود اجتماع مجلس إدارة البنك لاتخاذ قرار تاريخي: قيادة تحالف مصرفي لتمويل ميناء ولوجستيات مشروع رأس الحكمة بـ 2 مليار ج.م بعائد متوقع 26%، في مواجهة مخاوف بعض الأعضاء من تقلبات السيولة.',
          options: [
            {
              text: 'اعتماد الصفقة وقيادة التحالف بضمانات سيادية لترسيخ مكانة البنك كعملاق استثماري إقليمي',
              outcomeDesc: 'صفقة القرن المصرفية! صعدت أرباح البنك وحصته السوقية للقمة، وحصلت على حصتك السنوية البالغة 3,500,000 ج.م!',
              effects: { personalWealth: +3500000, prestige: +50, marketReputation: +45, skill: +30 }
            },
            {
              text: 'المشاركة بحصة محافظة (500 مليون فقط) وتوزيع الباقي على البنوك المنافسة لتقليل المخاطر',
              outcomeDesc: 'قرار مصرفي حكيم ومتزن؛ حقق البنك عوائد قوية وحافظ على سيولة الخزينة دون أي مخاطر ائتمانية.',
              effects: { personalWealth: +1200000, prestige: +35, skill: +25, stress: -15 }
            }
          ]
        }
      ]
    };

    // Rival Headhunter Job Offers (عروض الاستقطاب من البنوك المنافسة)
    this.headhunterOffers = [
      {
        id: 'offer_gulf_investment',
        bankName: 'بنك المشرق والخليج للاستثمار (Gulf Capital Bank)',
        icon: '🇦🇪',
        roleTitle: 'نائب رئيس قطاع الشركات والاستثمار',
        minStage: 3,
        minReputation: 45,
        minPrestige: 30,
        salaryMultiplier: 1.65, // +65% pay
        signingBonus: 180000,
        carAllowance: 15000,
        desc: 'عرض استقطاب رسمي وسري من مجموعة بنكية خليجية كبرى: زيادة 65% في راتبك الأساسي، مكافأة توقيع عقد فورية، وسيارة فارهة.'
      },
      {
        id: 'offer_islamic_finance',
        bankName: 'مجموعة البركة المصرفية الإسلامية (Al Baraka Group)',
        icon: '🌙',
        roleTitle: 'مدير إقليمي للصيرفة الإسلامية وكبار الثروات',
        minStage: 4,
        minReputation: 60,
        minPrestige: 40,
        salaryMultiplier: 1.50, // +50% pay
        signingBonus: 300000,
        carAllowance: 20000,
        desc: 'عرض مغرٍ لقيادة الصيرفة الإسلامية للثروات: +50% راتب، تأمين صحي عائلي دولي، وحوافز صكوك ومرابحات كبرى.'
      },
      {
        id: 'offer_international_private',
        bankName: 'البنك الدولي السويسري للتجارة (HSBC & Swiss Trust)',
        icon: '🇨🇭',
        roleTitle: 'العضو المنتدب لإدارة الأصول وصناديق الاستثمار',
        minStage: 5,
        minReputation: 75,
        minPrestige: 60,
        salaryMultiplier: 1.80, // +80% pay
        signingBonus: 750000,
        carAllowance: 35000,
        desc: 'أعلى عروض الكفاءات بالشرق الأوسط: منصب دولي رفيع، بونص توقيع 750 ألف ج.م، وحصة أسهم في صندوق الاستثمار الإقليمي.'
      }
    ];
  }

  /**
   * Get an active dilemma for the player's current stage
   */
  getDilemmaForStage(stageIndex) {
    const list = this.dilemmasByStage[stageIndex] || this.dilemmasByStage[0];
    const rand = Math.floor(Math.random() * list.length);
    return list[rand];
  }

  /**
   * Check if player qualifies for a rival bank headhunting offer
   */
  checkHeadhunterOffer(currentStage, reputation, prestige) {
    const eligibleOffers = this.headhunterOffers.filter(o => {
      return currentStage >= o.minStage &&
             reputation >= o.minReputation &&
             prestige >= o.minPrestige;
    });

    if (eligibleOffers.length === 0) return null;

    // Pick an offer that hasn't been shown recently
    const pick = eligibleOffers[Math.floor(Math.random() * eligibleOffers.length)];
    return pick;
  }
}
