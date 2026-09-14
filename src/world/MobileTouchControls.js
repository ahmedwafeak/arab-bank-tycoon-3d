/**
 * MobileTouchControls - On-screen virtual joystick, camera swipe orbit, and action buttons
 * Built specifically for 3D Third-Person / First-Person mobile gameplay.
 */
export class MobileTouchControls {
  constructor(container, options = {}) {
    this.container = container || document.body;
    this.onInteract = options.onInteract || (() => {});
    this.onStandUp = options.onStandUp || (() => {});
    this.sensitivity = options.sensitivity || 0.0045;

    // Movement state
    this.moveVector = { x: 0, y: 0 };
    this.isSprinting = false;

    // Camera swipe state
    this.cameraDelta = { x: 0, y: 0 };
    this.lastTouchPos = { x: 0, y: 0 };
    this.cameraTouchId = null;

    // Joystick touch tracking
    this.joystickTouchId = null;
    this.joystickCenter = { x: 0, y: 0 };
    this.maxRadius = 48; // Maximum joystick thumb travel radius in px

    this.root = null;
    this.joystickBase = null;
    this.joystickThumb = null;
    this.interactBtn = null;
    this.sprintBtn = null;
    this.standBtn = null;

    this.init();
  }

  static isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  }

  init() {
    // 1. Build DOM Elements
    this.root = document.createElement('div');
    this.root.className = 'mobile-controls-overlay';
    this.root.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999;
      user-select: none;
      -webkit-user-select: none;
    `;

    // A. Virtual Joystick Base
    this.joystickBase = document.createElement('div');
    this.joystickBase.className = 'mobile-joystick-base';
    this.joystickBase.style.cssText = `
      position: absolute;
      bottom: clamp(24px, 6vw, 40px);
      left: clamp(24px, 6vw, 40px);
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(30, 41, 59, 0.55) 0%, rgba(15, 23, 42, 0.75) 100%);
      border: 2px solid rgba(212, 175, 55, 0.45);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), inset 0 0 15px rgba(212, 175, 55, 0.15);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      pointer-events: auto;
      touch-action: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Virtual Joystick Thumb Knob
    this.joystickThumb = document.createElement('div');
    this.joystickThumb.className = 'mobile-joystick-thumb';
    this.joystickThumb.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #fbbf24 0%, #d97706 70%, #78350f 100%);
      border: 2px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px rgba(245, 158, 11, 0.6);
      transform: translate3d(0, 0, 0);
      pointer-events: none;
      transition: transform 0.05s ease-out;
    `;
    this.joystickBase.appendChild(this.joystickThumb);
    this.root.appendChild(this.joystickBase);

    // B. Action Buttons Group (Bottom Right)
    const btnGroup = document.createElement('div');
    btnGroup.className = 'mobile-btn-group';
    btnGroup.style.cssText = `
      position: absolute;
      bottom: clamp(24px, 6vw, 40px);
      right: clamp(24px, 6vw, 40px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      pointer-events: none;
    `;

    // Sprint Toggle Button
    this.sprintBtn = document.createElement('button');
    this.sprintBtn.className = 'mobile-action-btn mobile-sprint-btn';
    this.sprintBtn.innerHTML = `
      <span style="font-size: 20px;">⚡</span>
      <span style="font-size: 11px; font-weight: 800; font-family: 'Cairo', sans-serif;">جري</span>
    `;
    this.sprintBtn.style.cssText = `
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.75);
      border: 2px solid rgba(255, 255, 255, 0.25);
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      pointer-events: auto;
      touch-action: manipulation;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    btnGroup.appendChild(this.sprintBtn);

    // Contextual Interact Button [E]
    this.interactBtn = document.createElement('button');
    this.interactBtn.className = 'mobile-action-btn mobile-interact-btn';
    this.interactBtn.innerHTML = `
      <span style="font-size: 24px;">🤝</span>
      <span class="interact-btn-label" style="font-size: 12px; font-weight: 800; font-family: 'Cairo', sans-serif;">تفاعل</span>
    `;
    this.interactBtn.style.cssText = `
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #f59e0b 0%, #b45309 100%);
      border: 2px solid #fef08a;
      color: #ffffff;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 25px rgba(245, 158, 11, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      pointer-events: auto;
      touch-action: manipulation;
      cursor: pointer;
      animation: mobilePulse 1.6s infinite ease-in-out;
      transition: transform 0.15s ease;
    `;
    btnGroup.appendChild(this.interactBtn);

    // Stand Up Button [Q] (Only visible when seated)
    this.standBtn = document.createElement('button');
    this.standBtn.className = 'mobile-action-btn mobile-stand-btn';
    this.standBtn.innerHTML = `
      <span style="font-size: 22px;">🚪</span>
      <span style="font-size: 11px; font-weight: 800; font-family: 'Cairo', sans-serif;">نهوض</span>
    `;
    this.standBtn.style.cssText = `
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ef4444 0%, #991b1b 100%);
      border: 2px solid #fecaca;
      color: #ffffff;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px rgba(239, 68, 68, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      pointer-events: auto;
      touch-action: manipulation;
      cursor: pointer;
    `;
    btnGroup.appendChild(this.standBtn);

    this.root.appendChild(btnGroup);

    // Inject CSS pulse animation keyframes
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = `
      @keyframes mobilePulse {
        0%, 100% { transform: scale(1); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 15px rgba(245, 158, 11, 0.3); }
        50% { transform: scale(1.08); box-shadow: 0 8px 26px rgba(245, 158, 11, 0.8), 0 0 25px rgba(245, 158, 11, 0.6); }
      }
      .mobile-action-btn:active {
        transform: scale(0.92) !important;
      }
    `;
    document.head.appendChild(styleSheet);

    this.container.appendChild(this.root);

    // 2. Setup Touch Event Listeners
    this.setupListeners();
  }

  setupListeners() {
    // --- Joystick Touch Handlers ---
    const onJoystickStart = (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;

      const rect = this.joystickBase.getBoundingClientRect();
      this.joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      this.updateJoystick(touch.clientX, touch.clientY);
    };

    const onJoystickMove = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          e.preventDefault();
          this.updateJoystick(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const onJoystickEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          e.preventDefault();
          this.joystickTouchId = null;
          this.moveVector.x = 0;
          this.moveVector.y = 0;
          this.joystickThumb.style.transform = 'translate3d(0, 0, 0)';
          break;
        }
      }
    };

    this.joystickBase.addEventListener('touchstart', onJoystickStart, { passive: false });
    window.addEventListener('touchmove', onJoystickMove, { passive: false });
    window.addEventListener('touchend', onJoystickEnd, { passive: false });
    window.addEventListener('touchcancel', onJoystickEnd, { passive: false });

    // --- Camera Swipe Orbit (Right Half of Screen) ---
    const onScreenTouchStart = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // Only track touches on the right half of the screen not on joystick
        if (touch.clientX > window.innerWidth * 0.35 && this.cameraTouchId === null) {
          // Verify touch is not on button group
          const target = document.elementFromPoint(touch.clientX, touch.clientY);
          if (target && target.closest('.mobile-btn-group')) continue;

          this.cameraTouchId = touch.identifier;
          this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const onScreenTouchMove = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.cameraTouchId) {
          const dx = touch.clientX - this.lastTouchPos.x;
          const dy = touch.clientY - this.lastTouchPos.y;

          this.cameraDelta.x += dx * this.sensitivity;
          this.cameraDelta.y += dy * this.sensitivity;

          this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    };

    const onScreenTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.cameraTouchId) {
          this.cameraTouchId = null;
          break;
        }
      }
    };

    window.addEventListener('touchstart', onScreenTouchStart, { passive: true });
    window.addEventListener('touchmove', onScreenTouchMove, { passive: true });
    window.addEventListener('touchend', onScreenTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onScreenTouchEnd, { passive: true });

    // --- Action Buttons ---
    this.sprintBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isSprinting = !this.isSprinting;
      if (this.isSprinting) {
        this.sprintBtn.style.background = 'radial-gradient(circle at 35% 35%, #0ea5e9 0%, #0369a1 100%)';
        this.sprintBtn.style.borderColor = '#7dd3fc';
        this.sprintBtn.style.boxShadow = '0 0 16px rgba(14, 165, 233, 0.7)';
      } else {
        this.sprintBtn.style.background = 'rgba(15, 23, 42, 0.75)';
        this.sprintBtn.style.borderColor = 'rgba(255, 255, 255, 0.25)';
        this.sprintBtn.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.4)';
      }
    });

    this.interactBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onInteract();
    });

    this.standBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onStandUp();
    });
  }

  updateJoystick(clientX, clientY) {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      this.moveVector.x = 0;
      this.moveVector.y = 0;
      this.joystickThumb.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    const clampedDist = Math.min(distance, this.maxRadius);
    const angle = Math.atan2(dy, dx);

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    this.joystickThumb.style.transform = `translate3d(${thumbX}px, ${thumbY}px, 0)`;

    // Normalized vector (-1 to 1)
    // In Three.js: -Y is forward (W), +Y is backward (S), +X is right (D), -X is left (A)
    const normalizedIntensity = clampedDist / this.maxRadius;
    this.moveVector.x = Math.cos(angle) * normalizedIntensity;
    this.moveVector.y = Math.sin(angle) * normalizedIntensity;
  }

  /**
   * Return current movement inputs
   */
  getMovement() {
    const deadzone = 0.15;
    const x = this.moveVector.x;
    const y = this.moveVector.y;

    return {
      forward: y < -deadzone,
      backward: y > deadzone,
      left: x < -deadzone,
      right: x > deadzone,
      rawX: x,
      rawY: y,
      intensity: Math.hypot(x, y),
      isMoving: Math.hypot(x, y) > deadzone,
      sprint: this.isSprinting
    };
  }

  /**
   * Consume and reset camera swipe delta
   */
  consumeCameraDelta() {
    const delta = { x: this.cameraDelta.x, y: this.cameraDelta.y };
    this.cameraDelta.x = 0;
    this.cameraDelta.y = 0;
    return delta;
  }

  /**
   * Update interact button visibility and label
   */
  setInteractVisible(visible, label = 'تفاعل') {
    if (!this.interactBtn) return;
    this.interactBtn.style.display = visible ? 'flex' : 'none';
    const labelEl = this.interactBtn.querySelector('.interact-btn-label');
    if (labelEl && label) {
      labelEl.textContent = label;
    }
  }

  /**
   * Update seated state (switches between joystick/sprint and stand up button)
   */
  setSeated(isSeated) {
    if (isSeated) {
      this.joystickBase.style.display = 'none';
      this.sprintBtn.style.display = 'none';
      this.interactBtn.style.display = 'none';
      this.standBtn.style.display = 'flex';
    } else {
      this.joystickBase.style.display = 'flex';
      this.sprintBtn.style.display = 'flex';
      this.standBtn.style.display = 'none';
    }
  }

  /**
   * Hide all controls (e.g. during dialog or cutscene)
   */
  setVisible(visible) {
    if (this.root) {
      this.root.style.display = visible ? 'block' : 'none';
    }
  }

  destroy() {
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
  }
}
