/**
 * EventsManager - Smart Multi-Turn Narrative Dilemmas & Dual-Impact Engine
 * Features:
 * 1. Dual Impact: Simultaneously affects Bank Health (Treasury, Deposits, Reputation, Morale)
 *    and Personal Life (Stress, Energy, Family, Integrity, Personal Wealth).
 * 2. Multi-Turn Story Arcs (The Butterfly Effect): Key decisions trigger delayed consequences
 *    and follow-up crisis events 2 to 3 months later.
 * 3. Egyptian Banking Realism: CBE directives, interest wars, corruption temptations,
 *    and executive dilemmas reflecting the authentic Egyptian financial sector.
 */
export class EventsManager {
  constructor() {
    this.activeFlags = {};       // Story progression flags e.g. { ashour_bribed: true }
    this.queuedEvents = [];      // Scheduled follow-up dilemmas: [{ eventId, triggerMonth, triggerYear }]
    this.usedEventIds = [];      // Track non-repeatable events
    this.decisionHistory = [];   // Log of player's strategic choices

    // Story Arc Definitions & Standalone Dilemmas
    this.eventsPool = [
      // -------------------------------------------------------------
      // ARC 1: حوت العقارات ورجل الأعمال عاشور بيه (The Tycoon's Temptation)
      // -------------------------------------------------------------
      {
        id: 'ashour_part1_temptation',
        title: '💼 عرض رجل الأعمال النافذ «عاشور بيه» وشاليه الساحل',
        speaker: 'عاشور عبد التواب',
        role: 'مطور عقاري ورجل أعمال واسع النفوذ',
        avatar: './assets/characters/ashour.jpg',
        description: 'دخل مكتبك عاشور بيه طالباً تسهيلاً ائتمانياً عاجلاً بقيمة 12,000,000 ج.م لمشروع منتجع سياحي. الضمانات المقدمة غير مكتملة وأوراقه بها ثغرات قانونية، لكنه ابتسم ودفع نحوك مظروفاً به مفتاح «شاليه فاخر برأس الحكمة مسجل باسمك» + شيك 500,000 ج.م كأتعاب استشارية خاصة! ماذا تفعل؟',
        options: [
          {
            text: 'قبول العرض وتمرير التمويل (أرباح فورية للبنك وثروة خاصة)',
            previewBank: '🏛️ البنك: +1.5M أرباح فوائد سنوية | مخاطرة تعثر عالية',
            previewPersonal: '👤 شخصي: +500,000 ج.م كاش | شاليه بالساحل | -35 نزاهة | +15 توتر',
            impact: (state) => {
              if (state.loansManager) {
                state.loansManager.addDirectLoan({
                  id: 'LOAN-ASHOUR-12M',
                  title: 'تمويل منتجع عاشور بلازا السياحي',
                  category: 'تسهيلات تطوير عقاري استثنائية',
                  amount: 12000000,
                  tenureMonths: 36,
                  annualRate: 24.0,
                  riskRatio: 0.08,
                  collateral: 'أراضي قيد التخصيص وشيكات شخصية'
                });
              }
              state.totalLoans += 12000000;
              state.reputation = Math.min(100, state.reputation + 3);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.personalWealth += 500000;
                state.executiveLifeManager.integrity = Math.max(10, state.executiveLifeManager.integrity - 35);
                state.executiveLifeManager.stress = Math.min(100, state.executiveLifeManager.stress + 15);
                if (!state.executiveLifeManager.ownedAssets.includes('chalet_sahel')) {
                  state.executiveLifeManager.ownedAssets.push('chalet_sahel');
                }
              }

              // Queue Part 2: Anti-corruption probe in 2 months
              state.eventsManager.queueFollowUp('ashour_part2_investigation', 2);
              state.eventsManager.activeFlags['ashour_bribed'] = true;

              return 'تم توقيع التمويل سراً؛ استلمت مفتاح الشاليه والشيك، ودخل التمويل دفاتر البنك. لكن وخز الضمير والقلق بدأ يطاردك.';
            }
          },
          {
            text: 'رفض الرشوة واشتراط رهن أصول عقارية كبرى مسجلة في الشهر العقاري',
            previewBank: '🏛️ البنك: تمويل آمن بضمانات حديدية | +4 سمعة',
            previewPersonal: '👤 شخصي: 0 كاش | +15 نزاهة | راحة ضمير',
            impact: (state) => {
              if (state.treasuryCash >= 12000000) {
                state.treasuryCash -= 12000000;
                state.totalLoans += 12000000;
                if (state.loansManager) {
                  state.loansManager.addDirectLoan({
                    id: 'LOAN-ASHOUR-SAFE',
                    title: 'تمويل منتجع عاشور بضمانات رسمية مسجلة',
                    category: 'تطوير عقاري مشروط',
                    amount: 12000000,
                    tenureMonths: 24,
                    annualRate: 21.0,
                    riskRatio: 0.015,
                    collateral: 'رهن تجاري مسجل على أبراج المعادي بقيمة 20 مليون'
                  });
                }
              }
              state.reputation = Math.min(100, state.reputation + 4);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.integrity = Math.min(100, state.executiveLifeManager.integrity + 15);
                state.executiveLifeManager.stress = Math.max(0, state.executiveLifeManager.stress - 5);
              }

              state.eventsManager.activeFlags['ashour_safe'] = true;
              return 'رفضت المظروف بحزم واشترطت رهناً رسمياً. اضطر عاشور للرضوخ لحاجته للسيولة، وحميت البنك ونفسك من أي شبهة.';
            }
          },
          {
            text: 'طرد عاشور من المكتب فوراً وإبلاغ الرقابة الإدارية بمحاولة الرشوة',
            previewBank: '🏛️ البنك: إشادة رقابية عليا (+8 سمعة) | خسارة عميل مليوني',
            previewPersonal: '👤 شخصي: +30 نزاهة مطلقة | عداء مع حوت عقاري',
            impact: (state) => {
              state.reputation = Math.min(100, state.reputation + 8);

              if (state.complianceManager) {
                state.complianceManager.currentCamelsScore = Math.min(5, state.complianceManager.currentCamelsScore + 0.4);
              }

              if (state.executiveLifeManager) {
                state.executiveLifeManager.integrity = 100;
                state.executiveLifeManager.socialPrestige = Math.min(100, state.executiveLifeManager.socialPrestige + 15);
              }

              // Queue Part 2: Retaliation or praise in 2 months
              state.eventsManager.queueFollowUp('ashour_part2_whistleblower', 2);
              state.eventsManager.activeFlags['ashour_reported'] = true;

              return 'أمرت حرس البنك باصطحاب عاشور إلى الخارج ورفعت تقريراً للجهات الرقابية. انتشر الخبر وارتفعت سمعة نزاهتك إلى عنان السماء!';
            }
          }
        ]
      },

      // Follow-up Arc 1 - Consequence A
      {
        id: 'ashour_part2_investigation',
        title: '🚨 تفتيش الرقابة الإدارية وتجميد أصول «عاشور بيه»',
        speaker: 'المستشار حازم الشريف',
        role: 'رئيس لجنة التفتيش القضائي والرقابة المالية',
        avatar: './assets/characters/hazem.jpg',
        description: 'داهمت هيئة الرقابة الإدارية مكاتب عاشور بيه في قضية استيلاء وتزوير، ووصلت لجنة تفتيش مصرفية لمراجعة ملف التمويل الذي اعتمدته له قبل شهرين! الشاليه والشيك الذي أخذته مسجلان في دفاتر سرية صودرت في المداهمة. الموقف بالغ الحرج!',
        options: [
          {
            text: 'الاعتراف بالخطأ والتعاون مع جهات التحقيق ورد المبالغ فوراً',
            previewBank: '🏛️ البنك: حماية كيان البنك | غرامة إدارية 1.5M',
            previewPersonal: '👤 شخصي: رد الشاليه وخصم 700,000 ج.م | إنقاذ من السجن الجنائي',
            impact: (state) => {
              const fine = Math.min(state.treasuryCash, 1500000);
              state.treasuryCash -= fine;
              state.reputation = Math.max(25, state.reputation - 15);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.personalWealth = Math.max(10000, state.executiveLifeManager.personalWealth - 700000);
                state.executiveLifeManager.ownedAssets = state.executiveLifeManager.ownedAssets.filter(a => a !== 'chalet_sahel');
                state.executiveLifeManager.stress = Math.min(100, state.executiveLifeManager.stress + 30);
                state.executiveLifeManager.integrity = 40;
              }

              return 'تعاونت مع النيابة ورددت أصول الرشوة. نجا البنك من سحب الرخصة بفضل شجاعة الاعتراف، لكن الغرامة وتأنيب الضمير كانا قاسيَيْن.';
            }
          },
          {
            text: 'توجيه الشؤون القانونية للمطالبة بضمانات فورية والتبرؤ من أي صلة شخصية',
            previewBank: '🏛️ البنك: معركة قضائية طويلة | حجز على ما تبقى من أراضي عاشور',
            previewPersonal: '👤 شخصي: توتر عصبي غير مسبوق (85%) | مخاطرة استدعاء للنيابة',
            impact: (state) => {
              if (state.legalManager) {
                state.legalManager.addDefaultedLoan({
                  id: 'CASE-ASHOUR-CRISIS',
                  borrower: 'عاشور عبد التواب (قيد التحفظ الجنائي)',
                  category: 'قروض قيد التحقيق الرقابي',
                  amount: 10000000,
                  collateral: 'أصول وأراضي متحفظ عليها'
                });
              }
              state.reputation = Math.max(20, state.reputation - 10);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.stress = 90;
                state.executiveLifeManager.family = Math.max(20, state.executiveLifeManager.family - 20);
              }

              return 'دخل البنك في نزاع قضائي معقد؛ تم التحفظ على بعض أراضي المشروع، ولا تزال التحقيقات سارية وسط توتر أسري وشخصي خانق.';
            }
          }
        ]
      },

      // Follow-up Arc 1 - Consequence B
      {
        id: 'ashour_part2_whistleblower',
        title: '🎖️ تكريم محافظ البنك المركزي ومنح وسام النزاهة المصرفية',
        speaker: 'محافظ البنك المركزي المصري',
        role: 'السلطة النقدية والرقابية العليا',
        avatar: './assets/characters/farouk.jpg',
        description: 'بفضل بلاغك المبكر وتعاملك الحاسم مع عاشور، تمكنت الدولة من تفكيك شبكة غسيل أموال كبرى وتفادي خسائر فادحة بالقطاع المصرفي. دعاك محافظ البنك المركزي لتكريم رسمي أمام رؤساء مجالس إدارات البنوك المصرية!',
        options: [
          {
            text: 'تسلم وسام التميز الرقابي وإلقاء كلمة حول حوكمة الائتمان',
            previewBank: '🏛️ البنك: +12 سمعة وطنية | تصنيف CAMELS ممتاز (5/5)',
            previewPersonal: '👤 شخصي: +25 وجاهة اجتماعية | +50,000 ج.م مكافأة تميز',
            impact: (state) => {
              state.reputation = Math.min(100, state.reputation + 12);
              if (state.complianceManager) state.complianceManager.currentCamelsScore = 5.0;

              if (state.executiveLifeManager) {
                state.executiveLifeManager.personalWealth += 50000;
                state.executiveLifeManager.socialPrestige = Math.min(100, state.executiveLifeManager.socialPrestige + 25);
                state.executiveLifeManager.stress = Math.max(0, state.executiveLifeManager.stress - 20);
                state.executiveLifeManager.energy = 100;
              }

              return 'تلقيت درع النزاهة المصرفية وسط تصفيق حار من قيادات القطاع المصرفي! ارتفعت مكانة البنك كأكثر المؤسسات أماناً واستقراراً.';
            }
          }
        ]
      },

      // -------------------------------------------------------------
      // ARC 2: حفل زفاف العائلة مقابل اجتماع أزمة البنك المركزي (Family vs. CBE)
      // -------------------------------------------------------------
      {
        id: 'family_wedding_vs_cbe',
        title: '💍 حفل زفاف العائلة مقابل اجتماع أزمة البنك المركزي الطارئ',
        speaker: 'الأسرة والبنك المركزي',
        role: 'صراع الواجب الأسري والمسؤولية المصرفية',
        avatar: './assets/characters/player.jpg',
        description: 'دعا البنك المركزي المصري لاجتماع مغلق وطارئ في تمام السابعة مساءً بشارع الجمهورية لبحث تداعيات تقلبات أسعار الصرف وضوابط السيولة. وفي نفس اللحظة، يبدأ حفل زفاف ابنتك/ابنك الكبرى الذي انتظرته الأسرة لسنوات! هاتفك يرن من جهتين: محافظ المركزي وأسرتك بدار الحفل.. ماذا تختار؟',
        options: [
          {
            text: 'حضور اجتماع البنك المركزي شخصياً وتفويض العائلة بالاعتذار',
            previewBank: '🏛️ البنك: حماية مصالح البنك في حزمة القرارات الجديدة (+6 سمعة)',
            previewPersonal: '👤 شخصي: انهيار مؤشر الأسرة (-35%) | لوم عائلي شديد | +20 توتر',
            impact: (state) => {
              state.reputation = Math.min(100, state.reputation + 6);
              if (state.complianceManager) state.complianceManager.currentCamelsScore = Math.min(5, state.complianceManager.currentCamelsScore + 0.3);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.family = Math.max(10, state.executiveLifeManager.family - 35);
                state.executiveLifeManager.stress = Math.min(100, state.executiveLifeManager.stress + 20);
                state.executiveLifeManager.socialPrestige = Math.min(100, state.executiveLifeManager.socialPrestige + 10);
              }

              return 'شاركت في صياغة قرارات نقدية مصيرية حميت بها البنك من تقلبات السوق، لكنك دخلت منزلك ليلاً لتجد عتاباً وحزناً أسرياً كبيراً.';
            }
          },
          {
            text: 'الاعتذار للمركزي وحضور زفاف الابن/الابنة وتفويض نائبك الأول',
            previewBank: '🏛️ البنك: عتاب رسمي طفيف من المحافظ (-2 سمعة)',
            previewPersonal: '👤 شخصي: سعادة أسرية عارمة (+40% أسرة) | ذكريات لا تعوض | -25% توتر',
            impact: (state) => {
              state.reputation = Math.max(30, state.reputation - 2);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.family = 100;
                state.executiveLifeManager.stress = Math.max(0, state.executiveLifeManager.stress - 25);
                state.executiveLifeManager.energy = Math.min(100, state.executiveLifeManager.energy + 20);
              }

              return 'وقفت بجوار ابنك/ابنتك في أجمل ليالي العمر والتقطت الصور التذكارية الدافئة. كانت لحظة لا تقدر بثمن رممت أي صدع أسري.';
            }
          },
          {
            text: 'المحاولة المستحيلة: حضور ساعة من الاجتماع ثم السباق بالموتوسيكل للحفل!',
            previewBank: '🏛️ البنك: تثبيت حضور رمزي بالمركزي (+3 سمعة)',
            previewPersonal: '👤 شخصي: إرهاق جسدي عنيف (-40 طاقة) | لحاق متأخر بالزفاف (+15 أسرة)',
            impact: (state) => {
              state.reputation = Math.min(100, state.reputation + 3);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.energy = Math.max(15, state.executiveLifeManager.energy - 40);
                state.executiveLifeManager.stress = Math.min(100, state.executiveLifeManager.stress + 15);
                state.executiveLifeManager.family = Math.min(100, state.executiveLifeManager.family + 15);
              }

              return 'سباق جنوني في شوارع القاهرة! أثبتت وجودك بالمركزي ووصلت الزفاف مع تقطيع التورتة منهك القوى تماماً، لكنك نجحت في التوفيق المستحيل.';
            }
          }
        ]
      },

      // -------------------------------------------------------------
      // ARC 3: قضية تسريب البيانات والتعاطف الإنساني (Whistleblower & Sick Mother)
      // -------------------------------------------------------------
      {
        id: 'data_leak_compassion',
        title: '⚖️ قضية تسريب بيانات العملاء والموظف المتعثر إنسانياً',
        speaker: 'الأستاذة سارة نجاتي',
        role: 'رئيس قطاع الأمن السيبراني والرقابة الداخلية',
        avatar: './assets/characters/sara.jpg',
        description: 'كشفت تحقيقات الأمن السيبراني أن موظفاً شاباً بالفرع قام بنسخ أرقام هواتف عملاء كبار لسمسار عقارات مقابل 40,000 ج.م. عند التحقيق معه انهار باكياً وأظهر تقارير طبية تثبت أن المبلغ بالكامل ذهب لعملية جراحية عاجلة لوالدته في الرعاية المركزة! القانون يقتضي إحالته للنيابة فوراً وطرده جنائياً. ما هو قرارك الإداري والإنساني؟',
        options: [
          {
            text: 'تطبيق القانون بصرامة: إحالة للنيابة وفصل فوري لحماية معايير البنك',
            previewBank: '🏛️ البنك: رسالة ردع صارمة (+5 امتثال CAMELS)',
            previewPersonal: '👤 شخصي: ألم نفسي (-10 طاقة) | التزام بالواجب الإداري',
            impact: (state) => {
              if (state.complianceManager) state.complianceManager.currentCamelsScore = Math.min(5, state.complianceManager.currentCamelsScore + 0.3);
              state.reputation = Math.min(100, state.reputation + 2);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.stress = Math.min(100, state.executiveLifeManager.stress + 10);
                state.executiveLifeManager.energy = Math.max(15, state.executiveLifeManager.energy - 10);
              }

              return 'تم اتخاذ الإجراء القانوني الصارم؛ فُصل الموظف وأُحيل للتحقيق الجنائي لتثبيت معايير الردع بالبنك.';
            }
          },
          {
            text: 'التسوية الإنسانية: دفع تكلفة العلاج من مالك الخاص ونقله لقسم الأرشيف دون فضيحة',
            previewBank: '🏛️ البنك: سد الثغرة الأمنية بهدوء وكتمان الحادثة',
            previewPersonal: '👤 شخصي: دفع 45,000 ج.م من محفظتك | راحة ضمير عظيمة (+30 أسرة وطاقة)',
            impact: (state) => {
              if (state.executiveLifeManager) {
                state.executiveLifeManager.personalWealth = Math.max(0, state.executiveLifeManager.personalWealth - 45000);
                state.executiveLifeManager.energy = Math.min(100, state.executiveLifeManager.energy + 20);
                state.executiveLifeManager.family = Math.min(100, state.executiveLifeManager.family + 15);
                state.executiveLifeManager.integrity = Math.min(100, state.executiveLifeManager.integrity + 10);
              }
              if (state.hrManager) state.hrManager.morale = 100;

              return 'عالجت والدته من حسابك الشخصي ونقلته لوظيفة لا يتاح فيها الاطلاع على البيانات. بكت الأسرة امتناناً ودعا لك العاملون بالفرع.';
            }
          }
        ]
      },

      // -------------------------------------------------------------
      // ARC 4: حرب أسعار الفائدة والشهادات مع البنوك الكبرى (The 30% Certificate War)
      // -------------------------------------------------------------
      {
        id: 'interest_war_30_percent',
        title: '⚔️ حرب شهادات الـ 30%: البنوك المنافسة تشن هجوماً كاسحاً',
        speaker: 'السوق المصرفي',
        role: 'تحركات البنوك المنافسة والتضخم',
        avatar: './assets/characters/maged.jpg',
        description: 'فاجأ البنكان الحكومتان الأكبر السوق بطرح شهادة ادخار سنوية بعائد تاريخي 30% لامتصاص السيولة. بدأ عملاؤك بالاصطفاف على الكاونترات لسحب ودائعهم وكسر الشهادات القديمة للتحويل إلى البنوك المنافسة! نزيف السيولة يهدد الخزينة.. ما هي استراتيجيتك؟',
        options: [
          {
            text: 'مجاراة المنافسين وطرح شهادة «النيل الماسية 30%» فوراً',
            previewBank: '🏛️ البنك: حماية الودائع واستقطاب 15M جديدة | ضغط عنيف على هوامش الأرباح',
            previewPersonal: '👤 شخصي: ساعات عمل إضافية لحصر التكاليف (+15 توتر)',
            impact: (state) => {
              state.totalDeposits += 15000000;
              state.depositAnnualRate = 28.5;
              state.reputation = Math.min(100, state.reputation + 4);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.stress = Math.min(100, state.executiveLifeManager.stress + 15);
              }

              return 'توقف نزيف الودائع وتدفقت 15 مليون ج.م أموال جديدة، لكن تكلفة الفائدة الشهرية على البنك ارتفعت بدرجة تتطلب تشغيل التمويل بسرعة.';
            }
          },
          {
            text: 'الرد الذكي بالتحول الرقمي: كاش باك ومزايا إنستاباي ونقاط ولاء دون رفع الفائدة',
            previewBank: '🏛️ البنك: الحفاظ على تكلفة الفائدة المنخفضة | تسرب 8% من كبار السن للمنافسين',
            previewPersonal: '👤 شخصي: كفاءة استراتيجية عبقرية (+20 وجاهة وراحة)',
            impact: (state) => {
              const leak = Math.round(state.totalDeposits * 0.05);
              state.totalDeposits = Math.max(0, state.totalDeposits - leak);
              state.treasuryCash = Math.max(0, state.treasuryCash - Math.min(state.treasuryCash, leak));

              if (state.neoBankManager) {
                state.neoBankManager.digitalUsers += 3500;
              }

              if (state.executiveLifeManager) {
                state.executiveLifeManager.socialPrestige = Math.min(100, state.executiveLifeManager.socialPrestige + 20);
                state.executiveLifeManager.stress = Math.max(0, state.executiveLifeManager.stress - 10);
              }

              return 'حافظت على توازن تكاليف الفائدة؛ سحب بعض المودعين التقليديين أموالهم لكنك جذبت آلاف الشباب ورواد الأعمال بحسابات رقمية منخفضة التكلفة.';
            }
          }
        ]
      },

      // -------------------------------------------------------------
      // ARC 5: أزمة شح الدولار وأولويات الاعتمادات المستندية (FX Allocation Crisis)
      // -------------------------------------------------------------
      {
        id: 'fx_import_dilemma',
        title: '💵 أزمة شح الدولار: شحنات أدوية الأورام أم مصانع حديد التسليح؟',
        speaker: 'غرفة المعاملات الدولية FX',
        role: 'لجنة تخصيص النقد الأجنبي',
        avatar: './assets/characters/player.jpg',
        description: 'رصيد النقد الأجنبي المتوفر بالخزينة 400,000 دولار فقط. في نفس الوقت يتنافس على التغطية طلبان ملحان: شركة توريد أدوية أورام وأمصال حيوية للمستشفيات الجامعية، ومصنع حديد وصلب عملاق يملكه شريك استراتيجي للبنك يهدد بسحب ودائعه إن لم تُفتح اعتمادات استيراد البليت! ماذا تقرر؟',
        options: [
          {
            text: 'تخصيص الدولار بالكامل لأدوية الأورام والمستشفيات (أولوية وطنية وإنسانية)',
            previewBank: '🏛️ البنك: غضب مصنع الحديد (-5M ودائع) | سمعة وطنية عظيمة (+10 نقاط)',
            previewPersonal: '👤 شخصي: رضا نفسي استثنائي (+25 طاقة وأسرة)',
            impact: (state) => {
              state.reputation = Math.min(100, state.reputation + 10);
              const lostDep = Math.min(state.totalDeposits, 5000000);
              state.totalDeposits -= lostDep;

              if (state.executiveLifeManager) {
                state.executiveLifeManager.energy = Math.min(100, state.executiveLifeManager.energy + 25);
                state.executiveLifeManager.integrity = Math.min(100, state.executiveLifeManager.integrity + 20);
                state.executiveLifeManager.stress = Math.max(0, state.executiveLifeManager.stress - 15);
              }

              return 'وصلت الأدوية وأنقذت آلاف المرضى وأشادت وزارة الصحة بمسؤولية البنك الوطنية. غضب رجل أعمال الحديد لكنك كسبت احترام مصر كلها.';
            }
          },
          {
            text: 'تخصيص الدولار لمصنع الحديد للحفاظ على أكبر مودع ومصدر أرباح',
            previewBank: '🏛️ البنك: حماية الودائع الكبرى | أرباح عمولات ضخمة (+800,000 ج.م)',
            previewPersonal: '👤 شخصي: شيك مكافأة شخصية (+120,000 ج.م) | انتقادات إعلامية مستترة',
            impact: (state) => {
              state.treasuryCash += 800000;
              state.reputation = Math.max(25, state.reputation - 5);

              if (state.executiveLifeManager) {
                state.executiveLifeManager.personalWealth += 120000;
                state.executiveLifeManager.integrity = Math.max(20, state.executiveLifeManager.integrity - 15);
              }

              return 'حافظت على العميل الحوت وضمنت أرباح العمولات للبنك ومكافأة شخصية، لكن تقارير المستشفيات المؤلمة تركت غصة في قلبك.';
            }
          },
          {
            text: 'المعادلة الذهبية: تقسيم المبلغ مناصفة (200k أدوية + 200k حديد) وتدبير الباقي بالـ Swap',
            previewBank: '🏛️ البنك: إرضاء الطرفين بحنكة مصرفية (+5 سمعة)',
            previewPersonal: '👤 شخصي: إثبات براعة إدارية عليا (+15 وجاهة)',
            impact: (state) => {
              state.reputation = Math.min(100, state.reputation + 5);
              state.treasuryCash += 350000;

              if (state.executiveLifeManager) {
                state.executiveLifeManager.socialPrestige = Math.min(100, state.executiveLifeManager.socialPrestige + 15);
                state.executiveLifeManager.stress = Math.max(0, state.executiveLifeManager.stress - 5);
              }

              return 'أدرت الأزمة بدهاء مصرفي؛ ضمنت شحنة الأدوية المنقذة للحياة وأبقيت أفران مصنع الحديد مشتعلة!';
            }
          }
        ]
      }
    ];
  }

  queueFollowUp(eventId, delayMonths = 2) {
    this.queuedEvents.push({
      eventId: eventId,
      delayRemaining: delayMonths
    });
  }

  checkMonthlyEvents(gameState) {
    // 1. First check if any delayed follow-up events are ready to fire!
    for (let i = 0; i < this.queuedEvents.length; i++) {
      const q = this.queuedEvents[i];
      q.delayRemaining--;
      if (q.delayRemaining <= 0) {
        const followUpEvent = this.eventsPool.find(e => e.id === q.eventId);
        this.queuedEvents.splice(i, 1);
        if (followUpEvent) {
          return followUpEvent;
        }
      }
    }

    // 2. Chance of random dilemma based on difficulty mode
    let chance = 0.55;
    if (gameState.difficultyMode === 'casual') chance = 0.35;
    else if (gameState.difficultyMode === 'hardcore') chance = 0.75;

    if (Math.random() > chance) return null;

    // Filter available pool (exclude completed or follow-up events waiting in queue)
    const available = this.eventsPool.filter(e => {
      // Exclude follow-ups that only trigger via queues
      if (e.id.includes('_part2_')) return false;
      return !this.usedEventIds.includes(e.id);
    });

    if (available.length === 0) {
      this.usedEventIds = []; // recycle pool
      return null;
    }

    const selected = available[Math.floor(Math.random() * available.length)];
    this.usedEventIds.push(selected.id);
    return selected;
  }

  getState() {
    return {
      activeFlags: { ...this.activeFlags },
      queuedEvents: [...this.queuedEvents],
      usedEventIds: [...this.usedEventIds],
      decisionHistory: [...this.decisionHistory]
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.activeFlags) this.activeFlags = { ...data.activeFlags };
    if (Array.isArray(data.queuedEvents)) this.queuedEvents = [...data.queuedEvents];
    if (Array.isArray(data.usedEventIds)) this.usedEventIds = [...data.usedEventIds];
    if (Array.isArray(data.decisionHistory)) this.decisionHistory = [...data.decisionHistory];
  }
}
