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
      <div style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 820px; background: rgba(15, 23, 42, 0.96); border: 2px solid #38bdf8; border-radius: 20px; padding: 24px 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); pointer-events: auto;">
        <!-- Header: Speaker Name & Role -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid rgba(56, 189, 248, 0.3); padding-bottom: 12px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 28px;">${npc.icon || '👔'}</div>
            <div>
              <h3 style="margin: 0; color: #f8fafc; font-size: 18px; font-weight: 900;">${npc.name}</h3>
              <span style="color: #38bdf8; font-size: 12.5px; font-weight: 700;">${npc.role}</span>
            </div>
          </div>
          <span style="background: rgba(56, 189, 248, 0.15); color: #7dd3fc; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 800;">حوار ميداني مباشر</span>
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
        this.selectChoice(idx, data);
      });
    });
  }

  selectChoice(choiceIndex, data) {
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
        <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: 10px; padding: 10px 16px; color: #86efac; font-size: 13px; font-weight: 800; margin-bottom: 12px;">
          ✨ ${choice.effectNote || '+25 XP وتحديث علاقات الفرع'}
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
      if (choice.xp) this.careerManager.addXP(choice.xp, choice.text);
      if (choice.managementStanding && this.careerManager.standing) {
        this.careerManager.standing.farouk = Math.min(100, Math.max(0, this.careerManager.standing.farouk + choice.managementStanding));
      }
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
          speech: 'أهلاً بك في أول أيامك بفرع البنك.. الانضباط هنا هو خط أحمر، كل قرش يدخل أو يخرج مسؤوليتك. شباك الصراف رقم #1 جاهز لاستقبالك، أريد أن أرى سرعة ودقة في آن واحد.',
          choices: [
            {
              text: 'تحت أمرك يا فندم، الانضباط والدقة هما أساس العمل المصرفي.',
              tag: 'مهني ومطيع (Professional)',
              tagColor: '#34d399',
              reaction: 'عظيم! هذه هي الروح التي نحتاجها.. استلم بطاقة الصلاحيات وتوجه لشباكك فوراً.',
              effectNote: 'نال استحسان المدير (+15 رضا إدارة)',
              managementStanding: 15,
              xp: 30,
              nextObjective: 'توجه لشباك الصراف رقم #1 واجلس للعمل [E]'
            },
            {
              text: 'هدفي ليس مجرد إنجاز المهام، بل تحقيق أعلى أرقام تارجت بالفرع.',
              tag: 'طموح وشديد التنافس (Ambitious)',
              tagColor: '#fbbf24',
              reaction: 'يعجبني طموحك.. لكن انتبه، الطموح بدون التزام بلوائح البنك المركزي قد ينهي مسيرتك مبكراً.',
              effectNote: 'لفت انتباه المدير لطموحك (+25 XP)',
              managementStanding: 5,
              xp: 45,
              nextObjective: 'توجه لشباك الصراف رقم #1 واجلس للعمل [E]'
            }
          ]
        };

      case 'sara':
        return {
          speech: 'شايفاك بتتحرك بثقة يا زميلي الجديد.. متفتكرش إن التارجت هنا بالساهل، أنا محققة 140% الشهر اللي فات وعيني على ترقية رئيس قسم الائتمان!',
          choices: [
            {
              text: 'المنافسة الشريفة ترفع من شأن الفرع كله، وبالتوفيق لكِ.',
              tag: 'دبلوماسي هادئ (Diplomatic)',
              tagColor: '#38bdf8',
              reaction: 'كلام لطيف.. خلينا نشوف شغلك العملي على الشباك النهاردة.',
              effectNote: 'علاقة مستقرة مع الزميلة سارة (+20 XP)',
              xp: 20
            },
            {
              text: 'مستعد للتحدي، والشهر ده الصدارة هتتغير بإذن الله.',
              tag: 'تحدي مباشر (Rivalry)',
              tagColor: '#f87171',
              reaction: 'ههه.. عجبتني الجرأة! نشوف مين هيقفل تارجته الأول.',
              effectNote: 'اشتعال المنافسة المهنية (+30 XP)',
              xp: 30
            }
          ]
        };

      case 'mahmoud':
        return {
          speech: 'تعال اشرب شاي جنب مبرد المياه وسيبك من الجد شوية! سمعت آخر إشاعة؟ المفتش حازم احتمال يطب علينا فجأة بكرة الصبح يفتش على دفاتر الخزينة!',
          choices: [
            {
              text: 'تسلم يا محمود على التنبيه.. لازم أراجع مطابقة الدرج بدقة النهاردة.',
              tag: 'استغلال ذكي للمعلومة (Shrewd)',
              tagColor: '#a78bfa',
              reaction: 'عفواً يا صاحبي.. اللي يعيش في البنك ده من غير ودان يروح في داهية!',
              effectNote: 'كسب معلومة استباقية هامة لليوم التالي (+25 XP)',
              xp: 25
            },
            {
              text: 'بلاش شائعات يا محمود وخلينا نركز في شغلنا قبل ما المدير يلمحنا.',
              tag: 'حذر ورسمي (Cautious)',
              tagColor: '#94a3b8',
              reaction: 'يا عم براحتك.. بس افتكر إني حذرتك لما تشوف كارنيه التفتيش!',
              effectNote: 'تجنب القيل والقال (+15 XP)',
              xp: 15
            }
          ]
        };

      default:
        return {
          speech: 'مرحباً بك في فرع البنك.',
          choices: [
            { text: 'شكراً جزيلاً.', tag: 'إنهاء', reaction: 'بالتوفيق.', xp: 10 }
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
