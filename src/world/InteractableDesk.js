import * as THREE from 'three';

/**
 * InteractableDesk - Workstation Mode System (Papers, Please / Job Simulator Style)
 * Features:
 * - 3D Physical Desk Props: Computer terminal, document folders, cash counter, physical stamps, UV lamp, panic button
 * - Defined Camera Focus Anchors for seamless transition
 * - Papers, Please Inspection Overlay: Drag & view documents, I-Score credit cards, national ID
 * - Physical Interactive Stamps: [معتمد الأخضر] & [مرفوض الأحمر] with physical stamp sound & ink mark
 * - Cash Counter Machine & UV Counterfeit Detection
 * - Direct integration with GameState and CareerManager without duplicating logic
 */
export class InteractableDesk {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.role = options.role || 'junior_teller'; // 'junior_teller' | 'loan_officer' | 'compliance_officer' | 'branch_manager'
    this.deskName = options.deskName || 'شباك الصراف #1';
    this.keycardLevel = options.keycardLevel || 1;
    this.position = options.position || new THREE.Vector3(0, 0, 0);
    this.rotationY = options.rotationY || 0;

    this.gameState = options.gameState || null;
    this.careerManager = options.careerManager || null;
    this.audio = options.audio || null;

    this.group = new THREE.Group();
    this.playerController = null;
    this.isEngaged = false;

    // Camera Workstation Anchors (relative to desk position)
    this.cameraAnchorPosition = new THREE.Vector3();
    this.cameraAnchorTarget = new THREE.Vector3();

    // Active Customer Dossier
    this.currentDossier = null;

    // Chair Z-Offset relative to desk center
    this.chairZOffset = 0.60;

    this.buildPhysicalDesk();
    this.updateCameraAnchors();
  }

  /**
   * Build the 3D physical desk props
   */
  buildPhysicalDesk() {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // 1. Desk Tabletop (Rich Walnut with Gold Edge Trim - Standard Office Height 0.76m)
    const deskGeo = new THREE.BoxGeometry(1.60, 0.05, 0.78);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x3d2215, // Rich walnut
      roughness: 0.28,
      metalness: 0.12
    });
    const deskTop = new THREE.Mesh(deskGeo, deskMat);
    deskTop.position.set(0, 0.735, 0); // Top surface at y = 0.76m
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    this.group.add(deskTop);

    // Gold brass edge trim
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.18 });
    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.025, 0.80), brassMat);
    topTrim.position.set(0, 0.725, 0);
    this.group.add(topTrim);

    // Inlaid Black Leather Desk Blotter for Documents
    const blotter = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.012, 0.50),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 })
    );
    blotter.position.set(-0.16, 0.766, 0.04);
    this.group.add(blotter);

    const blotterTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 0.008, 0.52),
      brassMat
    );
    blotterTrim.position.set(-0.16, 0.762, 0.04);
    this.group.add(blotterTrim);

    // 2. Desk Legs & Modesty Panel (Calibrated for 0.76m desk)
    const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.71, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
    const legPositions = [
      [-0.72, 0.355, -0.32],
      [0.72, 0.355, -0.32],
      [-0.72, 0.355, 0.32],
      [0.72, 0.355, 0.32]
    ];
    legPositions.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      this.group.add(leg);
    });

    // Modesty Panel
    const modesty = new THREE.Mesh(
      new THREE.BoxGeometry(1.44, 0.46, 0.025),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    modesty.position.set(0, 0.48, -0.32);
    this.group.add(modesty);

    // Side Pedestal Drawers
    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.58, 0.60),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
    );
    pedestal.position.set(0.50, 0.35, 0);
    this.group.add(pedestal);

    // Silver Drawer Handles
    [0.26, 0.48].forEach((hy) => {
      const dHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.02, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 })
      );
      dHandle.position.set(0.50, hy, 0.31);
      this.group.add(dHandle);
    });

    // 3. Computer Monitor (Terminal)
    const monitorGroup = new THREE.Group();
    const screenGeo = new THREE.BoxGeometry(0.48, 0.32, 0.035);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.24, 0);
    monitorGroup.add(screen);

    // Glowing Terminal Display Surface
    const displayGeo = new THREE.PlaneGeometry(0.44, 0.28);
    const displayMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.set(0, 0.24, 0.02);
    monitorGroup.add(display);

    // Stand
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
    );
    stand.position.set(0, 0.06, 0);
    monitorGroup.add(stand);

    monitorGroup.position.set(0.40, 0.76, -0.16);
    monitorGroup.rotation.y = -Math.PI / 10;
    this.group.add(monitorGroup);

    // 4. Physical Document Folder (Dossier)
    const folderGeo = new THREE.BoxGeometry(0.32, 0.02, 0.42);
    const folderMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const folder = new THREE.Mesh(folderGeo, folderMat);
    folder.position.set(-0.25, 0.775, 0.02);
    folder.rotation.y = Math.PI / 16;
    folder.castShadow = true;
    this.group.add(folder);

    // 5. Physical Stamp Blocks [معتمد الأخضر] & [مرفوض الأحمر]
    const stampGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.10, 16);

    // Approve Stamp (Green)
    const approveStampMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 });
    const approveStamp = new THREE.Mesh(stampGeo, approveStampMat);
    approveStamp.position.set(-0.55, 0.81, 0.12);
    approveStamp.castShadow = true;
    this.group.add(approveStamp);

    // Reject Stamp (Red)
    const rejectStampMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.3 });
    const rejectStamp = new THREE.Mesh(stampGeo, rejectStampMat);
    rejectStamp.position.set(-0.63, 0.81, 0.12);
    rejectStamp.castShadow = true;
    this.group.add(rejectStamp);

    // 6. Currency Counting Machine
    const counterGeo = new THREE.BoxGeometry(0.28, 0.18, 0.24);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
    const billCounter = new THREE.Mesh(counterGeo, counterMat);
    billCounter.position.set(-0.38, 0.85, -0.18);
    billCounter.castShadow = true;
    this.group.add(billCounter);

    // 7. Hidden Panic Button (Under front desk edge)
    const panicBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12),
      new THREE.MeshStandardMaterial({ color: 0xdc2626 })
    );
    panicBtn.rotation.x = Math.PI / 2;
    panicBtn.position.set(0, 0.71, 0.38);
    this.group.add(panicBtn);

    // 8. Calibrated Ergonomic Swivel Chair for the Player
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, this.chairZOffset);
    chairGroup.rotation.y = Math.PI; // Facing towards desk surface

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95, roughness: 0.15 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });

    // 5-Star Caster Base
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 16), chromeMat);
    hub.position.y = 0.065;
    chairGroup.add(hub);

    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.24, 8), chromeMat);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = angle;
      arm.position.set(Math.cos(angle) * 0.12, 0.055, Math.sin(angle) * 0.12);
      chairGroup.add(arm);

      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), darkMetal);
      wheel.position.set(Math.cos(angle) * 0.24, 0.022, Math.sin(angle) * 0.24);
      chairGroup.add(wheel);
    }

    // Piston
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.26, 12), chromeMat);
    piston.position.y = 0.20;
    chairGroup.add(piston);

    // Mechanism Box under seat
    const mech = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), darkMetal);
    mech.position.y = 0.34;
    chairGroup.add(mech);

    // Seat Cushion (Top surface at y = 0.43m - Ergonomic Human Height)
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.06, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    seat.position.y = 0.40;
    seat.castShadow = true;
    chairGroup.add(seat);

    // Curved Ergonomic Backrest
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.44, 0.035),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.7 })
    );
    back.position.set(0, 0.64, -0.18);
    back.castShadow = true;
    chairGroup.add(back);

    // Spine support bar
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.40, 8), darkMetal);
    spine.position.set(0, 0.63, -0.205);
    chairGroup.add(spine);

    // Armrests (Resting height y = 0.56m, spaced ±0.24m)
    [-0.24, 0.24].forEach((ax) => {
      const armRest = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.025, 0.20), darkMetal);
      armRest.position.set(ax, 0.56, -0.02);
      chairGroup.add(armRest);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.17, 8), darkMetal);
      post.position.set(ax, 0.475, -0.02);
      chairGroup.add(post);
    });

    this.group.add(chairGroup);

    // Register desk interaction bounding trigger
    this.group.userData = {
      isInteractable: true,
      interactLabel: `الجلوس على ${this.deskName}`,
      type: 'workstation',
      requiredKeycardLevel: this.keycardLevel,
      deskRef: this
    };

    this.scene.add(this.group);
  }

  /**
   * Set up Camera Anchors for smooth Workstation Mode focus
   */
  updateCameraAnchors() {
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
    const up = new THREE.Vector3(0, 1, 0);

    // Seated camera position: behind seated avatar's shoulder looking at desk
    this.cameraAnchorPosition.copy(this.position)
      .addScaledVector(forward, 0.72)
      .addScaledVector(up, 1.25);

    // Target point: looking down at document area on desk surface
    this.cameraAnchorTarget.copy(this.position)
      .addScaledVector(forward, 0.06)
      .addScaledVector(up, 0.76);
  }

  /**
   * Called when player sits at workstation
   */
  onWorkstationEngaged(playerController) {
    this.playerController = playerController;
    this.isEngaged = true;

    if (this.audio && typeof this.audio.playChairSit === 'function') {
      this.audio.playChairSit();
    }

    // Generate or fetch pending client dossier
    this.generateNextClientDossier();

    // Mount Papers, Please Style Inspection HUD
    this.renderWorkstationOverlay();
  }

  /**
   * Called when player exits workstation
   */
  onWorkstationDismissed() {
    this.isEngaged = false;
    this.removeWorkstationOverlay();
  }

  /**
   * Generate realistic Egyptian banking customer dossier for inspection
   */
  generateNextClientDossier() {
    const clients = [
      {
        name: 'الحاج عبد الغني الشبراوي',
        job: 'تاجر أقمشة ووكيل تجاري',
        nationalId: '27608140102938',
        amount: 850000,
        requestType: 'طلب تمويل توسع بضاعة',
        iScore: 785,
        iScoreRating: 'جدارة ممتازة (Green A+)',
        hasBribe: false,
        isCounterfeit: false,
        story: 'العميل معروف بالسوق وله سجل ضريبي منتظم منذ 15 عاماً ويطلب تسهيل ائتماني سريع.'
      },
      {
        name: 'رامي ممدوح عبد الجليل',
        job: 'مقاول تشطيبات حرة',
        nationalId: '29203151203491',
        amount: 320000,
        requestType: 'قرض شخصي نقدي',
        iScore: 540,
        iScoreRating: 'مخاطر مرتفعة تعثر سابق (Red C-)',
        hasBribe: true,
        bribeAmount: 15000,
        isCounterfeit: false,
        story: 'ملف متعثر لدى بنكين منافسين، ووضع ظرفاً مغلقاً به 15,000 ج.م كـ "إكرامية لتسهيل الختم".'
      },
      {
        name: 'مدام ناهد المنشاوي',
        job: 'صاحبة مركز تجميل',
        nationalId: '28411020401872',
        amount: 50000,
        requestType: 'إيداع نقدي خزانة',
        iScore: 710,
        iScoreRating: 'جيد جداً',
        hasBribe: false,
        isCounterfeit: true,
        counterfeitCount: 4, // 4 forged 200 EGP notes
        story: 'إيداع نقدي به رزمة تحتوي على أوراق نقدية مشبوهة بدون ملمس خشن ولا علامة مائية نافذة.'
      }
    ];

    this.currentDossier = clients[Math.floor(Math.random() * clients.length)];
  }

  /**
   * Render Papers, Please Style Desktop Interaction HUD
   */
  renderWorkstationOverlay() {
    this.removeWorkstationOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'workstation-hud-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 500;
      direction: rtl;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      user-select: none;
    `;

    const d = this.currentDossier;

    overlay.innerHTML = `
      <!-- Top Bar: Desk Identifier & Exit Button -->
      <div style="position: absolute; top: clamp(8px, 2vh, 16px); left: clamp(8px, 3vw, 24px); right: clamp(8px, 3vw, 24px); display: flex; justify-content: space-between; align-items: center; pointer-events: auto; gap: 8px;">
        <div style="background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(56, 189, 248, 0.4); padding: clamp(5px, 1.2vh, 8px) clamp(10px, 2vw, 20px); border-radius: 12px; color: #f8fafc; font-weight: 800; font-size: clamp(12px, 2.5vw, 15px); box-shadow: 0 4px 15px rgba(0,0,0,0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          🏢 ${this.deskName} | [المستوى ${this.keycardLevel}]
        </div>
        <button id="btn-leave-workstation" style="background: #ef4444; border: none; color: white; padding: clamp(6px, 1.2vh, 8px) clamp(12px, 2.5vw, 20px); border-radius: 10px; font-weight: 800; font-size: clamp(12px, 2.5vw, 14px); cursor: pointer; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); pointer-events: auto; white-space: nowrap;">
          🚪 نهوض [Esc / Q]
        </button>
      </div>

      <!-- Bottom Interactive Workspace Tools (Stamps, UV Light, Panic Button) -->
      <div style="position: absolute; bottom: clamp(10px, 2.5vh, 20px); left: 50%; transform: translateX(-50%); display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(6px, 1.5vw, 12px); background: rgba(15, 23, 42, 0.94); border: 1.5px solid #334155; padding: clamp(8px, 1.5vh, 12px) clamp(14px, 3vw, 24px); border-radius: 20px; pointer-events: auto; box-shadow: 0 8px 30px rgba(0,0,0,0.8); max-width: 95vw;">
        <!-- Physical Approve Stamp -->
        <button id="btn-stamp-approve" style="background: linear-gradient(180deg, #22c55e, #15803d); border: 2px solid #86efac; color: white; padding: clamp(7px, 1.2vh, 10px) clamp(12px, 2vw, 22px); border-radius: 12px; font-weight: 900; font-size: clamp(12px, 2.5vw, 15px); cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.5);">
          <span>✅</span>
          <span>اعتماد</span>
        </button>

        <!-- Physical Reject Stamp -->
        <button id="btn-stamp-reject" style="background: linear-gradient(180deg, #ef4444, #b91c1c); border: 2px solid #fca5a5; color: white; padding: clamp(7px, 1.2vh, 10px) clamp(12px, 2vw, 22px); border-radius: 12px; font-weight: 900; font-size: clamp(12px, 2.5vw, 15px); cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.5);">
          <span>❌</span>
          <span>رفض</span>
        </button>

        <!-- UV Counterfeit Light Button -->
        <button id="btn-tool-uv-light" style="background: linear-gradient(180deg, #a855f7, #6b21a8); border: 1.5px solid #d8b4fe; color: white; padding: clamp(6px, 1vh, 9px) clamp(10px, 1.8vw, 18px); border-radius: 12px; font-weight: 800; font-size: clamp(11.5px, 2.2vw, 13.5px); cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>🔦</span>
          <span>فحص UV</span>
        </button>

        <!-- Machine Cash Counter -->
        <button id="btn-tool-count-cash" style="background: linear-gradient(180deg, #0284c7, #0369a1); border: 1.5px solid #7dd3fc; color: white; padding: clamp(6px, 1vh, 9px) clamp(10px, 1.8vw, 18px); border-radius: 12px; font-weight: 800; font-size: clamp(11.5px, 2.2vw, 13.5px); cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>💵</span>
          <span>عد النقد</span>
        </button>

        <!-- Hidden Panic Alarm Button -->
        <button id="btn-tool-panic-alarm" style="background: #450a0a; border: 1px dashed #f87171; color: #fca5a5; padding: clamp(6px, 1vh, 8px) clamp(8px, 1.5vw, 14px); border-radius: 12px; font-weight: 800; font-size: clamp(11px, 2vw, 12px); cursor: pointer;" title="زر الإنذار الخفي أسفل حافة المكتب">
          🚨 إنذار
        </button>
      </div>

      <!-- Customer Dossier Document Window (Left Side) -->
      <div id="dossier-card" style="position: absolute; left: clamp(10px, 3vw, 36px); top: clamp(55px, 9vh, 80px); width: clamp(290px, 38vw, 380px); max-height: calc(100vh - 160px); overflow-y: auto; background: #fffbeb; border: 2px solid #b45309; border-radius: 14px; padding: clamp(12px, 2vh, 18px); color: #1c1917; box-shadow: 0 10px 35px rgba(0,0,0,0.6); pointer-events: auto; transform: rotate(-1deg);">
        <div style="border-bottom: 2px solid #d97706; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: clamp(14px, 2.8vw, 17px); font-weight: 900; color: #78350f;">📋 ملف المعاملة الائتمانية</h3>
          <span style="font-size: 11px; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 800;">سري للغاية</span>
        </div>

        <div style="font-size: clamp(12px, 2.2vw, 13.5px); line-height: 1.6; margin-bottom: 12px;">
          <div><strong>العميل:</strong> ${d.name}</div>
          <div><strong>المهنة:</strong> ${d.job}</div>
          <div><strong>الرقم القومي:</strong> <code style="background: #fef08a; padding: 1px 4px;">${d.nationalId}</code></div>
          <div><strong>المبلغ المطلوب:</strong> <span style="color: #047857; font-weight: 900;">${d.amount.toLocaleString()} ج.م</span></div>
          <div><strong>الـ I-Score:</strong> <strong style="color: ${d.iScore >= 650 ? '#15803d' : '#b91c1c'};">${d.iScore} (${d.iScoreRating})</strong></div>
          <div style="margin-top: 6px; padding: 6px 8px; background: #fef3c7; border-radius: 8px; font-size: 11.5px; color: #78350f;">
            💡 <em>${d.story}</em>
          </div>
          ${d.hasBribe ? `
            <div style="margin-top: 8px; background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 6px 8px; font-size: 12px; color: #991b1b; font-weight: 800;">
              ⚠️ عُثر على مظروف به ${d.bribeAmount.toLocaleString()} ج.م نقداً داخل الأوراق!
            </div>
          ` : ''}
        </div>

        <div id="dossier-stamp-mark" style="height: 44px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12.5px; color: #94a3b8; font-weight: 800;">
          [مكان توقيع وختم الموظف المسئول]
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Bind Button Click Handlers
    document.getElementById('btn-leave-workstation').addEventListener('click', () => {
      if (this.playerController) {
        if (typeof this.playerController.standUp === 'function') {
          this.playerController.standUp();
        } else if (typeof this.playerController.leaveWorkstation === 'function') {
          this.playerController.leaveWorkstation();
        }
      }
    });

    document.getElementById('btn-stamp-approve').addEventListener('click', () => {
      this.executeStampDecision('approve');
    });

    document.getElementById('btn-stamp-reject').addEventListener('click', () => {
      this.executeStampDecision('reject');
    });

    document.getElementById('btn-tool-uv-light').addEventListener('click', () => {
      this.toggleUVLight();
    });

    document.getElementById('btn-tool-count-cash').addEventListener('click', () => {
      this.runCashCountingMachine();
    });

    document.getElementById('btn-tool-panic-alarm').addEventListener('click', () => {
      this.triggerPanicAlarm();
    });
  }

  executeStampDecision(decision) {
    const mark = document.getElementById('dossier-stamp-mark');
    if (!mark) return;

    if (this.audio) {
      this.audio.playStamp ? this.audio.playStamp() : this.audio.playClick();
    }

    const d = this.currentDossier;
    const isFraudOrCounterfeit = d && (d.isCounterfeit || d.hasDiscrepancy || (d.iScore < 600 && d.amount > 100000));
    let deficit = 0;
    let isSuccess = true;

    if (decision === 'approve') {
      if (isFraudOrCounterfeit) {
        deficit = d.isCounterfeit ? (d.counterfeitCount * 200) : 5000;
        isSuccess = false;
      }
      mark.innerHTML = `<span style="color: #15803d; font-size: 22px; font-weight: 900; border: 3px solid #15803d; padding: 4px 18px; border-radius: 8px; transform: rotate(-5deg); display: inline-block;">مـعـتـمـد ✅</span>`;
      if (this.careerManager) {
        this.careerManager.addXP(isSuccess ? 25 : 5, isSuccess ? 'اعتماد معاملة مصرفية بنجاح' : 'خطأ تمرير معاملة غير سليمة');
        if (typeof this.careerManager.recordTransaction === 'function') {
          this.careerManager.recordTransaction(isSuccess, deficit);
          if (d && d.isCheque && isSuccess) {
            this.careerManager.stageMetrics.chequesInspected = (this.careerManager.stageMetrics.chequesInspected || 0) + 1;
          }
        }
      }
    } else {
      if (isFraudOrCounterfeit) {
        isSuccess = true;
      }
      mark.innerHTML = `<span style="color: #b91c1c; font-size: 22px; font-weight: 900; border: 3px solid #b91c1c; padding: 4px 18px; border-radius: 8px; transform: rotate(5deg); display: inline-block;">مـرفـوض ❌</span>`;
      if (this.careerManager) {
        this.careerManager.addXP(isSuccess ? 30 : 15, isSuccess ? 'كشف تزوير ورفض المعاملة بنجاح' : 'رفض معاملة بنكية');
        if (typeof this.careerManager.recordTransaction === 'function') {
          this.careerManager.recordTransaction(isSuccess, 0);
          if (d && d.isCheque && isSuccess) {
            this.careerManager.stageMetrics.chequesInspected = (this.careerManager.stageMetrics.chequesInspected || 0) + 1;
          }
        }
      }
    }

    // Auto-advance to next client after 1.4s
    setTimeout(() => {
      this.generateNextClientDossier();
      this.renderWorkstationOverlay();
    }, 1400);
  }

  toggleUVLight() {
    if (this.audio) this.audio.playClick();
    const d = this.currentDossier;
    const alertMsg = d.isCounterfeit
      ? `🚨 كشف تزوير: عُثر على ${d.counterfeitCount} أوراق نقدية مزيفة تفتقد للشريط المعدني والألياف المضيئة!`
      : `✨ فحص سليم: العلامة المائية لتمثال الكاتب المصري والألياف الفسفورية سليمة ومطابقة لمعايير البنك المركزي.`;

    alert(alertMsg);
  }

  runCashCountingMachine() {
    if (this.audio) {
      this.audio.playCash ? this.audio.playCash() : this.audio.playPaper();
    }
    const d = this.currentDossier;
    alert(`⚡ ماكينة العد: تم إحصاء عدد ${Math.floor(d.amount / 200)} ورقة فئة 200 ج.م بإجمالي ${d.amount.toLocaleString()} ج.م.`);
  }

  triggerPanicAlarm() {
    if (this.audio) this.audio.playAlarm ? this.audio.playAlarm() : this.audio.playError();
    alert('🚨 تم إطلاق الإنذار الصامت الخفي بنجاح! تم استدعاء فرقة تأمين المنشآت المصرفية.');
  }

  removeWorkstationOverlay() {
    const el = document.getElementById('workstation-hud-overlay');
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  destroy() {
    this.removeWorkstationOverlay();
    if (this.group && this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
