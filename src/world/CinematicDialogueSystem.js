/**
 * CinematicDialogueSystem - Over-the-Shoulder 3D Dialogue Engine
 * Inspired by Persona and Mass Effect.
 * Connects directly to CareerManager.js colleagues and dilemmas.
 */
export class CinematicDialogueSystem {
  constructor(scene, camera, audio, careerManager) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;
    this.careerManager = careerManager;

    this.activeDialogue = null;
    this.playerController = null;
    this.originalCamPos = null;
    this.originalCamTarget = null;

    this.overlayElement = null;
  }

  /**
   * Start a 3D dialogue with an NPC
   * @param {Object} npc - NPC metadata { id, name, role, model, dialogues }
   * @param {ThirdPersonPlayerController} playerController
   */
  startDialogue(npc, playerController) {
    this.playerController = playerController;
    this.activeDialogue = npc;

    // Play dialogue chime
    if (this.audio) this.audio.playBell ? this.audio.playBell() : this.audio.playClick();

    // Orient NPC model to face player
    if (npc.model && playerController.playerChar?.model) {
      const pPos = playerController.playerChar.model.position;
      const nPos = npc.model.position;
      npc.model.rotation.y = Math.atan2(pPos.x - nPos.x, pPos.z - nPos.z);
    }

    // Render dialogue UI
    this.renderDialogueUI(npc);
  }

  renderDialogueUI(npc) {
    this.closeDialogueUI();

    const data = this.getNPCDialogueData(npc.id);
    const relStatus = (this.careerManager && typeof this.careerManager.getRelationshipStatus === 'function')
      ? this.careerManager.getRelationshipStatus(npc.id)
      : null;

    const overlay = document.createElement('div');
    overlay.id = 'cinematic-dialogue-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1000;
      direction: rtl;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      user-select: none;
      background: linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(10, 15, 29, 0.95) 100%);
    `;

    overlay.innerHTML = `
      <div style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 840px; background: rgba(15, 23, 42, 0.96); border: 2px solid #38bdf8; border-radius: 20px; padding: 24px 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); pointer-events: auto;">
        <!-- Header: Speaker Name & Role -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid rgba(56, 189, 248, 0.3); padding-bottom: 12px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 28px;">${npc.icon || '👔'}</div>
            <div>
              <h3 style="margin: 0; color: #f8fafc; font-size: 18px; font-weight: 900;">${npc.name}</h3>
              <span style="color: #38bdf8; font-size: 12.5px; font-weight: 700;">${npc.role}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            ${relStatus ? `
              <span style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid ${relStatus.color}; color: ${relStatus.color}; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 800;">
                🤝 ${relStatus.label} (${relStatus.score}/100)
              </span>
            ` : ''}
            <span style="background: rgba(56, 189, 248, 0.15); color: #7dd3fc; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 800;">حوار ميداني مباشر</span>
          </div>
        </div>

        <!-- Dialogue Bubble -->
        <div id="dialogue-speech-text" style="color: #e2e8f0; font-size: 16px; line-height: 1.8; margin-bottom: 20px; min-height: 54px; font-weight: 600;">
          "${data.speech}"
        </div>

        <!-- Choices Grid -->
        <div id="dialogue-choices-container" style="display: flex; flex-direction: column; gap: 10px;">
          ${data.choices.map((choice, i) => `
            <button class="dialogue-choice-btn" data-choice-index="${i}" style="background: rgba(30, 41, 59, 0.9); border: 1.5px solid #475569; color: #f8fafc; padding: 12px 20px; border-radius: 12px; font-size: 14.5px; font-weight: 700; text-align: right; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: space-between;">
              <span>${choice.text}</span>
              <span style="font-size: 12px; color: ${choice.tagColor || '#94a3b8'};">${choice.tag}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayElement = overlay;

    // Bind choice events
    const buttons = overlay.querySelectorAll('.dialogue-choice-btn');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = '#38bdf8';
        btn.style.background = 'rgba(56, 189, 248, 0.15)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = '#475569';
        btn.style.background = 'rgba(30, 41, 59, 0.9)';
      });
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.choiceIndex, 10);
        this.selectChoice(idx, data, npc);
      });
    });
  }

  selectChoice(choiceIndex, data, npc) {
    const choice = data.choices[choiceIndex];
    if (!choice) return;

    if (this.audio) this.audio.playClick();

    // Show reaction
    const speechEl = document.getElementById('dialogue-speech-text');
    const choicesEl = document.getElementById('dialogue-choices-container');

    if (speechEl) {
      speechEl.innerHTML = `
        <div style="color: #38bdf8; font-size: 14px; margin-bottom: 6px;">[ردك: ${choice.text}]</div>
        <div>"${choice.reaction}"</div>
      `;
    }

    if (choicesEl) {
      choicesEl.innerHTML = `
        <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: 10px; padding: 10px 16px; color: #86efac; font-size: 13px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span>✨ ${choice.effectNote || 'تحديث مؤشرات المسيرة'}</span>
          ${choice.relationshipDelta ? `
            <span style="color: ${choice.relationshipDelta > 0 ? '#4ade80' : '#f87171'}; font-weight: 900;">
              ${choice.relationshipDelta > 0 ? '💚 +' : '💔 '}${choice.relationshipDelta} رصيد العلاقة
            </span>
          ` : ''}
        </div>
        <button id="btn-dialogue-continue" style="background: #38bdf8; border: none; color: #0f172a; padding: 10px 24px; border-radius: 10px; font-weight: 900; font-size: 14.5px; cursor: pointer; align-self: flex-start;">
          متابعة المهام ⏩
        </button>
      `;

      document.getElementById('btn-dialogue-continue')?.addEventListener('click', () => {
        this.finishDialogue(choice);
      });
    }

    // Apply career manager consequences
    if (this.careerManager) {
      if (choice.relationshipDelta && npc) {
        this.careerManager.updateRelationship(npc.id, choice.relationshipDelta);
      }
      if (choice.statChanges) {
        if (choice.statChanges.skill) this.careerManager.skill = Math.min(100, Math.max(0, this.careerManager.skill + choice.statChanges.skill));
        if (choice.statChanges.integrity) this.careerManager.integrity = Math.min(100, Math.max(0, this.careerManager.integrity + choice.statChanges.integrity));
        if (choice.statChanges.networking) this.careerManager.networking = Math.min(100, Math.max(0, this.careerManager.networking + choice.statChanges.networking));
        if (choice.statChanges.wealth) this.careerManager.wealth = Math.max(0, this.careerManager.wealth + choice.statChanges.wealth);
        if (choice.statChanges.energy) this.careerManager.energy = Math.min(100, Math.max(0, this.careerManager.energy + choice.statChanges.energy));
      }
      this.careerManager.saveCareer();
    }
  }

  finishDialogue(choice) {
    this.closeDialogueUI();

    if (this.playerController) {
      this.playerController.state = 'free_roam';
      this.playerController.activeDesk = null;
    }

    this.activeDialogue = null;

    // Optional next objective update
    if (choice.nextObjective) {
      this.updateHUDObjective(choice.nextObjective);
    }
  }

  updateHUDObjective(text) {
    const el = document.getElementById('career-objective-label');
    if (el) el.textContent = text;
  }

  getNPCDialogueData(npcId) {
    switch (npcId) {
      case 'farouk':
        return {
          speech: 'أهلاً بك في فرع البنك.. الانضباط هنا هو خط أحمر، كل قرش يدخل أو يخرج مسؤوليتك الشخصية. أريد أن أرى سرعة ودقة متناهية وإغلاقاً متطابقاً دون مليم عجز.',
          choices: [
            {
              text: 'تحت أمرك يا فندم، الانضباط والدقة هما أساس العمل المصرفي وسمعة الفرع.',
              tag: 'مهني ومطيع (Professional)',
              tagColor: '#34d399',
              reaction: 'عظيم! هذه هي الروح التي نحتاجها.. استلم بطاقة الصلاحيات وتوجه لشباكك فوراً.',
              effectNote: 'نال استحسان المدير فاروق (+15 علاقة، +5 نزاهة)',
              relationshipDelta: 15,
              statChanges: { integrity: 5, skill: 5 },
              nextObjective: 'توجه لشباك الصراف واجلس للعمل [E]'
            },
            {
              text: 'هدفي ليس مجرد إنجاز المهام الروتينية، بل قيادة الفرع لتحقيق أعلى أرقام تارجت وإيداعات.',
              tag: 'طموح وشديد التنافس (Ambitious)',
              tagColor: '#fbbf24',
              reaction: 'يعجبني طموحك.. لكن انتبه، الطموح بدون التزام بلوائح البنك المركزي قد ينهي مسيرتك مبكراً.',
              effectNote: 'لفت انتباه المدير لطموحك (+5 علاقة، +10 كفاءة)',
              relationshipDelta: 5,
              statChanges: { skill: 10, networking: 5 },
              nextObjective: 'توجه لشباك الصراف واجلس للعمل [E]'
            }
          ]
        };

      case 'sara':
        return {
          speech: 'شايفاك بتتحرك بثقة يا زميلي.. متفتكرش إن التارجت هنا بالساهل! أنا محققة 140% الشهر اللي فات وعيني على إدارة التجزئة الإقليمية، فهل ناوي تنافس ولا نتحالف؟',
          choices: [
            {
              text: 'إيه رأيك نتحالف؟ عملاء الشهادات الكبيرة لكِ، وأنا أركز في فتح الاعتمادات والتسهيلات لتقفيل تارجت الفرع.',
              tag: 'تحالف مبيعات استراتيجي (Alliance)',
              tagColor: '#38bdf8',
              reaction: 'ذكاء استراتيجي يعجبني! كده هنقفل تارجت الفرع سوا وناخد بونص الربع سنوي كامل!',
              effectNote: 'تحالف تجزئة متين مع سارة (+15 علاقة، +10 علاقات عامة)',
              relationshipDelta: 15,
              statChanges: { networking: 10, skill: 5 }
            },
            {
              text: 'المنافسة الشريفة هي اللي بتظهر الكفاءة الحقيقية، والسباق مفتوح لنهاية الشهر!',
              tag: 'تحدي وسباق أرقام (Rivalry)',
              tagColor: '#f87171',
              reaction: 'ههه.. أحب المنافسين الشجعان! خلينا نشوف أرقامك آخر الشهر على لوحة الإعلانات.',
              effectNote: 'إشعال روح المنافسة المهنية (+5 علاقة، +10 كفاءة)',
              relationshipDelta: 5,
              statChanges: { skill: 10 }
            }
          ]
        };

      case 'mahmoud':
        return {
          speech: 'تعال اشرب كباية شاي بنعناع وسيبك من التنشنة شوية! سمعت آخر حوار في الكافتيريا؟ بيقولوا فيه تفتيش مفاجئ من الرقابة، والمدير قالق من مطابقة الخزينة!',
          choices: [
            {
              text: 'تسلم يا حودة على المعلومة.. هراجع مطابقة الخزينة دلوقتي وأساعدك في رزم الألفيات كمان.',
              tag: 'جدعنة زملاء الشباك (Loyalty)',
              tagColor: '#a78bfa',
              reaction: 'هو ده الجدعنة وأولاد الأصول! كده نخلص 3 عصراً ونروح نتغدى عند التابعي على حسابي.',
              effectNote: 'صداقة وطيدة مع محمود (+20 علاقة، +10 طاقة)',
              relationshipDelta: 20,
              statChanges: { energy: 10, networking: 5 }
            },
            {
              text: 'بلاش كلام كتير في الصالة يا محمود عشان المدير فاروق باصص علينا وممكن يخصم لنا!',
              tag: 'حذر ورسمي متشدد (Strict)',
              tagColor: '#94a3b8',
              reaction: 'يا ساتر عليك وعلى وسواسك! بس معاك حق، عينه زي الصقر اليومين دول.',
              effectNote: 'انضباط حذر (-5 علاقة مع محمود، +5 نزاهة)',
              relationshipDelta: -5,
              statChanges: { integrity: 5 }
            }
          ]
        };

      case 'fatma':
        return {
          speech: 'يا بني ربنا يسترك ويجبر بخاطرك دنيا وآخرة.. ابني محول لي حوالة ومحتارة بين تجديد شهادة المعاش أو شراء سبيكة دهب صغيرة.. تنصحني بإيه بأمانة الله؟',
          choices: [
            {
              text: 'يا حاجة فاطمة شهادتك البنكية مدياكي عائد شهري مضمون يضمن مصاريفك، بلاش تجري ورا المضاربات غير المضمونة.',
              tag: 'نصيحة مخلصة للمودعين (Fiduciary Duty)',
              tagColor: '#10b981',
              reaction: 'ربنا يبارك في شبابك وصحتك ويرزقك من أوسع الأبواب.. دعوة من القلب في كل ركعة صلاة!',
              effectNote: 'بركة دعاء الوالدين ورضا العملاء (+25 علاقة، +15 نزاهة)',
              relationshipDelta: 25,
              statChanges: { integrity: 15, energy: 10 }
            },
            {
              text: 'نقدر نجدد نص المبلغ في شهادة ادخار عالية الفائدة، والنص الثاني في صندوق استثمار دهبي آمن متوافق مع الشريعة.',
              tag: 'تنويع استثماري حكيم (Financial Planning)',
              tagColor: '#f59e0b',
              reaction: 'ما شاء الله على علمك وفهمك! كده مسكنا العصاية من النص وحفظنا القرش من الغلاء.',
              effectNote: 'تخطيط استثماري عبقري (+15 علاقة، +10 كفاءة)',
              relationshipDelta: 15,
              statChanges: { skill: 10, networking: 5 }
            }
          ]
        };

      case 'hazem':
        return {
          speech: 'معاك المفتش حازم سليم من الإدارة المركزية للرقابة الميدانية بالبنك المركزي (CBE).. الفرع ده تحت الفحص اليوم لمراجعة معايير بازل 3 ومكافحة غسيل الأموال.',
          choices: [
            {
              text: 'أهلاً بحضرتك يا فندم.. كافة سجلات الـ KYC ومطابقات الخزينة اليومية وحسابات كبار المودعين جاهزة ومطابقة بالمليم.',
              tag: 'امتثال رقابي حديدي (Strict Compliance)',
              tagColor: '#3b82f6',
              reaction: 'ممتاز جداً.. ندرة أن أجد مصرفياً بهذا الانضباط والوعي الرقابي الصارم. تقريري للبنك المركزي سيشيد بأدائك الاستثنائي.',
              effectNote: 'إشادة رسمية في تقرير CBE (+25 علاقة، +15 نزاهة، +10 كفاءة)',
              relationshipDelta: 25,
              statChanges: { integrity: 15, skill: 10 }
            },
            {
              text: 'الرقابة هي خط الدفاع الأول عن اقتصاد الوطن.. تفضل بمراجعة الدفاتر وسأكون تحت تصرفك لأي استفسار.',
              tag: 'تعاون مهني وثقة (Professional Cooperation)',
              tagColor: '#6366f1',
              reaction: 'هذا هو الفكر المؤسسي المحترم الذي يحتاجه الجهاز المصرفي المصري للمستقبل.',
              effectNote: 'بناء جسر ثقة رفيع مع كبير المفتشين (+15 علاقة، +10 علاقات)',
              relationshipDelta: 15,
              statChanges: { networking: 10, integrity: 5 }
            }
          ]
        };

      case 'ashour':
        return {
          speech: 'يا باشمهندس.. أنا الحاج عاشور، داخل في مناقصة مصانع جديدة في أكتوبر ومحتاج تسهيلات وخطابات ضمان بـ 150 مليون جنيه قبل الخميس.. وأتعابك الشخصية محفوظة ومجزية!',
          choices: [
            {
              text: 'يا حاج عاشور، تمويل المشروعات الكبرى يحتاج تدفقات نقدية مدروسة وضمانات عينية تحفظ حقك وحق البنك، وبدون أي مقابل شخصي لأننا نعمل وفق الأصول.',
              tag: 'نزاهة مصرفية صارمة (Uncompromising Integrity)',
              tagColor: '#10b981',
              reaction: 'يا سلام عليك! أنا كنت بختبرك وعرفت إنك راجل نضيف متتباعش.. والأصول والميزانيات كلها جاهزة ومسجلة رسمي!',
              effectNote: 'احترام هائل وثقة عمياء من حوت المقاولات (+20 علاقة، +15 نزاهة، +10 كفاءة)',
              relationshipDelta: 20,
              statChanges: { integrity: 15, skill: 10 }
            },
            {
              text: 'مجموعة عاشور اسم عملاق بالسوق.. سأدرس الملف بنفسي ليل نهار وأرفع توصية للجنة الائتمان العليا لتسريع الموافقة.',
              tag: 'سرعة وديناميكية صفقات (Deal Acceleration)',
              tagColor: '#eab308',
              reaction: 'عفارم عليك يا ابن الأصول! الشغل السريع مع الكبار هو اللي يدور عجلة الإنتاج ويفتح بيوت!',
              effectNote: 'صفقة ائتمانية تاريخية (+15 علاقة، +15 علاقات عامة، +5,000 ج.م)',
              relationshipDelta: 15,
              statChanges: { networking: 15, wealth: 5000 }
            }
          ]
        };

      case 'maged':
        return {
          speech: 'مساء الخير يا زميلي.. أنا ماجد الشناوي (Headhunter). مراقب مسيرتك وقدرتك على إدارة الأزمات والائتمان.. لدي تفويض من بنك استثماري خليجي براتب 12,000 دولار وبونص ضخم!',
          choices: [
            {
              text: 'العرض مغرٍ واستثنائي، لكن طموحي التاريخي هو تأسيس وبناء صرح مصرفي وطني مستقل يخدم الاقتصاد المصري ويحمل اسمي.',
              tag: 'رؤية قيادية وتأسيس وطني (Visionary Founder)',
              tagColor: '#ec4899',
              reaction: 'رؤية قائد حقيقي! المستثمرون الذين أمثلهم مستعدون أيضاً لضخ ملايين كحصة تأسيسية معك إن قررت إطلاق بنكك الخاص.',
              effectNote: 'تأمين حليف استثماري دولي استراتيجي (+25 علاقة، +15 علاقات، +10 نزاهة)',
              relationshipDelta: 25,
              statChanges: { networking: 15, integrity: 10 }
            },
            {
              text: 'أنا منفتح لدراسة العرض والتعرف على صلاحيات قيادة الصناديق الاستثمارية في دبي وأبوظبي.',
              tag: 'انفتاح على الأسواق العالمية (Global Banking)',
              tagColor: '#06b6d4',
              reaction: 'اختيار ذكي.. العقول المصرفية التي تفهم لغة الأسواق الدولية هي الأقدر على صنع الفارق المالي.',
              effectNote: 'فتح قنوات مالية دولية (+15 علاقة، +10 علاقات، +10,000 ج.م)',
              relationshipDelta: 15,
              statChanges: { networking: 10, wealth: 10000 }
            }
          ]
        };

      default:
        return {
          speech: 'مرحباً بك في فرع البنك.. نتمنى لك دوام التوفيق والنجاح في مسيرتك المهنية.',
          choices: [
            { text: 'شكراً جزيلاً، وبالتوفيق للجميع.', tag: 'إنهاء', reaction: 'بالتوفيق دائماً.', xp: 10 }
          ]
        };
    }
  }

  closeDialogueUI() {
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
      this.overlayElement = null;
    }
  }

  destroy() {
    this.closeDialogueUI();
  }
}
