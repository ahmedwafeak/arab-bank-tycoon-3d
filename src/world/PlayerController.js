import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

/**
 * PlayerController - Narrative First-Person / Third-Person Explorer
 * Inspired by Papers, Please and The Stanley Parable.
 * Features:
 * - Dual Perspective (First-Person default, Third-Person orbital toggle via [V])
 * - Smooth WASD movement with acceleration, deceleration, and obstacle collisions
 * - Natural head-bobbing rhythm with audio footstep synchronization
 * - Center-screen Raycaster Interaction Probe with dynamic Arabic HUD prompts: "[E] تفاعل"
 * - Cinema-grade camera interpolation (Lerp/Slerp) to Workstation Mode upon sitting
 */
export class PlayerController {
  constructor(camera, domElement, scene, options = {}) {
    this.camera = camera;
    this.domElement = domElement || document.body;
    this.scene = scene;
    this.options = options;

    // Movement Parameters
    this.walkSpeed = options.walkSpeed || 3.4;
    this.runSpeed = options.runSpeed || 5.6;
    this.eyeHeight = options.eyeHeight || 1.68; // Standard human eye height
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.collisionBoxes = options.collisionBoxes || [];
    this.playerRadius = 0.35;

    // Head-bobbing
    this.headBobTimer = 0;
    this.bobFrequency = 10.0;
    this.bobAmplitude = 0.045;
    this.stepAudioTimer = 0;

    // Input States
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      run: false,
      interact: false
    };

    // Camera Modes: 'first_person' | 'third_person' | 'workstation'
    this.cameraMode = 'first_person';
    this.activeWorkstation = null;

    // Workstation Tween Parameters
    this.tweenProgress = 1.0;
    this.tweenDuration = 0.85;
    this.tweenStartPos = new THREE.Vector3();
    this.tweenStartRot = new THREE.Quaternion();
    this.tweenTargetPos = new THREE.Vector3();
    this.tweenTargetRot = new THREE.Quaternion();

    // Raycast Interaction Probe
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.6; // Max 2.6m interaction distance
    this.centerScreen = new THREE.Vector2(0, 0);
    this.hoveredInteractable = null;

    // Audio & Systems
    this.audio = options.audio || null;
    this.keycardLevel = options.keycardLevel || 1; // Current employee badge clearance

    // Controls setup
    this.controls = new PointerLockControls(this.camera, this.domElement);
    this.isLocked = false;

    this.initHUD();
    this.setupEventListeners();
  }

  /**
   * Create central dot crosshair and interaction prompt overlay
   */
  initHUD() {
    // Crosshair Dot
    this.crosshair = document.createElement('div');
    this.crosshair.id = 'player-crosshair';
    this.crosshair.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      width: 8px;
      height: 8px;
      background: rgba(255, 255, 255, 0.75);
      border: 1.5px solid rgba(15, 23, 42, 0.9);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 999;
      transition: transform 0.15s ease, background 0.15s ease;
    `;
    document.body.appendChild(this.crosshair);

    // Dynamic Interaction Toast Prompt
    this.interactionPrompt = document.createElement('div');
    this.interactionPrompt.id = 'player-interaction-prompt';
    this.interactionPrompt.style.cssText = `
      position: fixed;
      left: 50%;
      top: calc(50% + 28px);
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(56, 189, 248, 0.6);
      border-radius: 20px;
      padding: 6px 18px;
      color: #f8fafc;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      display: none;
      align-items: center;
      gap: 8px;
      pointer-events: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      z-index: 1000;
      direction: rtl;
    `;
    document.body.appendChild(this.interactionPrompt);
  }

  setupEventListeners() {
    // PointerLock Status
    this.controls.addEventListener('lock', () => {
      this.isLocked = true;
      if (this.crosshair) this.crosshair.style.display = 'block';
    });
    this.controls.addEventListener('unlock', () => {
      this.isLocked = false;
      if (this.cameraMode !== 'workstation' && this.crosshair) {
        this.crosshair.style.display = 'none';
      }
    });

    // Keyboard Keydown
    this.onKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.run = true;
          break;
        case 'KeyE':
          this.handleInteraction();
          break;
        case 'KeyV':
          this.togglePerspective();
          break;
        case 'KeyQ':
        case 'Escape':
          if (this.cameraMode === 'workstation') {
            this.leaveWorkstation();
          }
          break;
      }
    };

    // Keyboard Keyup
    this.onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.run = false;
          break;
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /**
   * Request PointerLock activation (Starts first-person exploration)
   */
  lock() {
    if (this.cameraMode !== 'workstation') {
      this.controls.lock();
    }
  }

  unlock() {
    this.controls.unlock();
  }

  /**
   * Update method called each animation frame
   */
  update(delta) {
    // 1. Handle Smooth Workstation Camera Transition Tween
    if (this.tweenProgress < 1.0) {
      this.tweenProgress = Math.min(1.0, this.tweenProgress + delta / this.tweenDuration);
      // Cubic ease-out
      const t = 1 - Math.pow(1 - this.tweenProgress, 3);
      this.camera.position.lerpVectors(this.tweenStartPos, this.tweenTargetPos, t);
      this.camera.quaternion.slerpQuaternions(this.tweenStartRot, this.tweenTargetRot, t);
      return;
    }

    // 2. If seated at Workstation, don't update free-roam movement
    if (this.cameraMode === 'workstation') {
      return;
    }

    // 3. Free-Roam Movement Physics
    if (this.controls.isLocked) {
      const speed = this.keys.run ? this.runSpeed : this.walkSpeed;
      const actualDamping = Math.exp(-8.0 * delta); // Smooth friction

      this.velocity.x *= actualDamping;
      this.velocity.z *= actualDamping;

      this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
      this.direction.x = Number(this.keys.right) - Number(this.keys.left);
      this.direction.normalize();

      if (this.keys.forward || this.keys.backward) {
        this.velocity.z += this.direction.z * speed * delta * 28.0;
      }
      if (this.keys.left || this.keys.right) {
        this.velocity.x += this.direction.x * speed * delta * 28.0;
      }

      // Propose translation
      const moveDelta = new THREE.Vector3();
      moveDelta.x = this.velocity.x * delta;
      moveDelta.z = this.velocity.z * delta;

      // Apply forward / side relative to camera yaw
      this.controls.moveRight(moveDelta.x);
      this.controls.moveForward(moveDelta.z);

      // Collision Resolution against branch obstacles & walls
      this.resolveCollisions();

      // Head-bobbing & Footstep audio cadence
      const isMoving = this.direction.lengthSq() > 0.05;
      if (isMoving) {
        this.headBobTimer += delta * this.bobFrequency * (this.keys.run ? 1.4 : 1.0);
        const bobOffset = Math.sin(this.headBobTimer) * this.bobAmplitude;
        this.camera.position.y = this.eyeHeight + bobOffset;

        // Footstep cadence
        this.stepAudioTimer += delta * (this.keys.run ? 2.8 : 1.8);
        if (this.stepAudioTimer >= 1.0) {
          this.stepAudioTimer = 0;
          if (this.audio && typeof this.audio.playFootstep === 'function') {
            this.audio.playFootstep();
          }
        }
      } else {
        // Smoothly settle back to eye height
        this.camera.position.y += (this.eyeHeight - this.camera.position.y) * Math.min(1.0, delta * 10);
      }
    }

    // 4. Update Raycast Interaction Probe
    this.updateRaycast();
  }

  /**
   * Raycast from screen center to detect interactable furniture, doors, papers
   */
  updateRaycast() {
    if (!this.controls.isLocked && this.cameraMode !== 'first_person') {
      this.hideInteractionPrompt();
      return;
    }

    this.raycaster.setFromCamera(this.centerScreen, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    let foundInteractable = null;

    for (let i = 0; i < intersects.length; i++) {
      const hit = intersects[i];
      let obj = hit.object;

      // Climb up hierarchy to find interactable wrapper
      while (obj && !obj.userData?.isInteractable && obj.parent) {
        obj = obj.parent;
      }

      if (obj && obj.userData?.isInteractable) {
        foundInteractable = {
          object: obj,
          point: hit.point,
          distance: hit.distance,
          data: obj.userData
        };
        break;
      }
    }

    if (foundInteractable) {
      this.hoveredInteractable = foundInteractable;
      this.showInteractionPrompt(foundInteractable.data.interactLabel || 'تفاعل');
      if (this.crosshair) {
        this.crosshair.style.transform = 'translate(-50%, -50%) scale(1.6)';
        this.crosshair.style.background = '#38bdf8';
      }
    } else {
      this.hoveredInteractable = null;
      this.hideInteractionPrompt();
      if (this.crosshair) {
        this.crosshair.style.transform = 'translate(-50%, -50%) scale(1.0)';
        this.crosshair.style.background = 'rgba(255, 255, 255, 0.75)';
      }
    }
  }

  /**
   * Trigger interaction when pressing [E]
   */
  handleInteraction() {
    if (!this.hoveredInteractable) return;

    const data = this.hoveredInteractable.data;

    // 1. Keycard Clearance Check
    if (data.requiredKeycardLevel && data.requiredKeycardLevel > this.keycardLevel) {
      if (this.audio) this.audio.playError();
      this.showTemporaryWarning(`⛔ بطاقة الصلاحيات مرفوضة (مطلوب رتبة ${data.requiredKeycardLevel})`);
      return;
    }

    // 2. Desk / Workstation Interaction
    if (data.type === 'workstation' && data.deskRef) {
      this.enterWorkstation(data.deskRef);
      return;
    }

    // 3. Custom Action Callback
    if (typeof data.onInteract === 'function') {
      data.onInteract(this);
    }
  }

  /**
   * Smoothly transition to Desk Workstation Mode
   */
  enterWorkstation(desk) {
    this.activeWorkstation = desk;
    this.cameraMode = 'workstation';

    // Unlock mouse for document inspection & paper stamping
    this.controls.unlock();
    if (this.crosshair) this.crosshair.style.display = 'none';
    this.hideInteractionPrompt();

    // Prepare Camera Tween
    this.tweenStartPos.copy(this.camera.position);
    this.tweenStartRot.copy(this.camera.quaternion);

    // Target Camera Anchor defined by desk
    this.tweenTargetPos.copy(desk.cameraAnchorPosition);

    // Look at desk center
    const m = new THREE.Matrix4();
    m.lookAt(desk.cameraAnchorPosition, desk.cameraAnchorTarget, new THREE.Vector3(0, 1, 0));
    this.tweenTargetRot.setFromRotationMatrix(m);

    this.tweenProgress = 0.0;

    // Trigger desk workstation setup
    desk.onWorkstationEngaged(this);
  }

  /**
   * Smoothly return from Workstation back to Free Roam
   */
  leaveWorkstation() {
    if (!this.activeWorkstation) return;

    const desk = this.activeWorkstation;
    desk.onWorkstationDismissed();

    this.activeWorkstation = null;
    this.cameraMode = 'first_person';

    // Tween back to eye height above current position
    this.tweenStartPos.copy(this.camera.position);
    this.tweenStartRot.copy(this.camera.quaternion);

    this.tweenTargetPos.set(
      this.camera.position.x,
      this.eyeHeight,
      this.camera.position.z + 0.65 // Step slightly back from desk
    );

    const m = new THREE.Matrix4();
    m.lookAt(this.tweenTargetPos, new THREE.Vector3(this.tweenTargetPos.x, this.eyeHeight, this.tweenTargetPos.z - 5), new THREE.Vector3(0, 1, 0));
    this.tweenTargetRot.setFromRotationMatrix(m);

    this.tweenProgress = 0.0;

    // Restore crosshair & lock mouse
    setTimeout(() => {
      this.controls.lock();
    }, 450);
  }

  /**
   * Toggle between 1st Person and 3rd Person Orbital View
   */
  togglePerspective() {
    if (this.cameraMode === 'workstation') return;
    this.cameraMode = this.cameraMode === 'first_person' ? 'third_person' : 'first_person';
    console.log(`[PlayerController] Perspective switched to: ${this.cameraMode}`);
  }

  /**
   * Collision resolution against branch interior bounding boxes
   */
  resolveCollisions() {
    const playerPos = this.camera.position;

    for (let i = 0; i < this.collisionBoxes.length; i++) {
      const box = this.collisionBoxes[i];
      if (!box) continue;

      // Check if player position is within box + radius
      const clampedX = Math.max(box.min.x, Math.min(playerPos.x, box.max.x));
      const clampedZ = Math.max(box.min.z, Math.min(playerPos.z, box.max.z));

      const dx = playerPos.x - clampedX;
      const dz = playerPos.z - clampedZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < this.playerRadius * this.playerRadius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = this.playerRadius - dist;
        playerPos.x += (dx / dist) * overlap;
        playerPos.z += (dz / dist) * overlap;
      }
    }
  }

  showInteractionPrompt(label) {
    if (!this.interactionPrompt) return;
    this.interactionPrompt.innerHTML = `
      <span style="background: #38bdf8; color: #0f172a; padding: 2px 7px; border-radius: 6px; font-weight: 900;">E</span>
      <span>${label}</span>
    `;
    this.interactionPrompt.style.display = 'flex';
  }

  hideInteractionPrompt() {
    if (this.interactionPrompt) {
      this.interactionPrompt.style.display = 'none';
    }
  }

  showTemporaryWarning(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 25%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(239, 68, 68, 0.95);
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 15px;
      z-index: 10000;
      box-shadow: 0 8px 30px rgba(0,0,0,0.7);
      direction: rtl;
    `;
    el.innerText = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.controls) this.controls.dispose();
    if (this.crosshair && this.crosshair.parentNode) this.crosshair.parentNode.removeChild(this.crosshair);
    if (this.interactionPrompt && this.interactionPrompt.parentNode) this.interactionPrompt.parentNode.removeChild(this.interactionPrompt);
  }
}
