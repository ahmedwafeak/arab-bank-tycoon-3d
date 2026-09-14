import * as THREE from 'three';
import { MobileTouchControls } from './MobileTouchControls.js';

/**
 * ThirdPersonPlayerController - Full 3D Avatar Control for Narrative Bank Simulator
 * Features:
 * - Direct control of player's 3D avatar (male/female rigged model)
 * - Smooth orbital third-person follow camera (over-the-shoulder angle)
 * - WASD movement with smooth heading orientation and collision detection
 * - Mobile Touch Controls (virtual joystick, swipe camera orbit, action buttons)
 * - Seamless animation blending (walk <-> idle <-> sit) via CharacterManager
 * - Center-screen interaction raycaster with dynamic Arabic HUD prompts
 * - Sitting down at workstations and participating in cinematic dialogue
 */
export class ThirdPersonPlayerController {
  constructor(camera, domElement, scene, options = {}) {
    this.camera = camera;
    this.domElement = domElement || document.body;
    this.scene = scene;
    this.options = options;

    this.charManager = options.charManager;
    this.playerChar = options.playerChar || null; // Reference from charManager.spawnCharacter()
    this.collisionBoxes = options.collisionBoxes || [];
    this.audio = options.audio || null;

    // Movement parameters
    this.walkSpeed = options.walkSpeed || 3.2;
    this.runSpeed = options.runSpeed || 5.2;
    this.rotationSpeed = 10.0;
    this.playerRadius = 0.38;

    // Camera follow parameters
    this.cameraDistance = options.cameraDistance || 2.7;
    this.cameraHeight = options.cameraHeight || 1.55;
    this.targetOffset = new THREE.Vector3(0, 1.35, 0); // Point on avatar to look at
    this.yaw = options.initialYaw || 0; // Horizontal orbit angle
    this.pitch = 0.18; // Vertical orbit angle (~10 deg down)
    this.minPitch = -0.15;
    this.maxPitch = 0.65;

    this.isPointerLocked = false;
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    // Input States
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      run: false
    };

    // Controller State: 'free_roam' | 'sitting' | 'dialogue'
    this.state = 'free_roam';
    this.activeDesk = null;

    // Raycast Interaction Probe
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.8;
    this.hoveredInteractable = null;

    // Mobile Touch Controls
    this.mobileControls = null;
    const isTouch = MobileTouchControls.isTouchDevice() || options.enableMobileControls;
    if (isTouch) {
      this.mobileControls = new MobileTouchControls(this.domElement.parentElement || document.body, {
        onInteract: () => this.handleInteraction(),
        onStandUp: () => this.standUp()
      });
    }

    this.initHUD();
    this.setupEventListeners();
  }

  initHUD() {
    this.interactionPrompt = document.createElement('div');
    this.interactionPrompt.id = 'tp-interaction-prompt';
    this.interactionPrompt.style.cssText = `
      position: fixed;
      left: 50%;
      top: calc(50% + 40px);
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.94);
      border: 1.5px solid #38bdf8;
      border-radius: 20px;
      padding: 7px 20px;
      color: #f8fafc;
      font-size: 14px;
      font-weight: 800;
      display: none;
      align-items: center;
      gap: 9px;
      pointer-events: none;
      box-shadow: 0 6px 25px rgba(0,0,0,0.7);
      z-index: 1000;
      direction: rtl;
    `;
    document.body.appendChild(this.interactionPrompt);
  }

  setPlayerCharacter(characterRef) {
    this.playerChar = characterRef;
    if (this.playerChar && this.playerChar.model) {
      this.updateCameraPosition(true);
    }
  }

  setupEventListeners() {
    // Pointer Lock on canvas click
    this.onCanvasClick = () => {
      if (this.state === 'free_roam') {
        this.domElement.requestPointerLock?.();
      }
    };
    this.domElement.addEventListener('click', this.onCanvasClick);

    this.onPointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    };
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    // Mouse Movement
    this.onMouseMove = (e) => {
      if (this.state !== 'free_roam') return;

      if (this.isPointerLocked) {
        const movementX = e.movementX || 0;
        const movementY = e.movementY || 0;
        this.yaw -= movementX * 0.0032;
        this.pitch -= movementY * 0.0025;
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
      } else if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;
        this.yaw -= deltaX * 0.006;
        this.pitch -= deltaY * 0.004;
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    this.onMouseDown = (e) => {
      if (e.button === 0 && !this.isPointerLocked) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    this.onMouseUp = () => {
      this.isDragging = false;
    };

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);

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
        case 'KeyQ':
        case 'Escape':
          if (this.state === 'sitting') {
            this.standUp();
          }
          break;
      }
    };

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
   * Main per-frame update loop
   */
  update(delta) {
    if (!this.playerChar || !this.playerChar.model) return;

    // Handle Mobile Camera Swipe Orbit
    if (this.mobileControls && this.state === 'free_roam') {
      const camDelta = this.mobileControls.consumeCameraDelta();
      if (camDelta.x !== 0 || camDelta.y !== 0) {
        this.yaw -= camDelta.x;
        this.pitch -= camDelta.y;
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
      }
    }

    // 1. Handle Free-Roam Avatar Movement
    if (this.state === 'free_roam') {
      this.updateMovement(delta);
      this.updateRaycast();
    }

    // 2. Update Follow Camera
    this.updateCameraPosition();
  }

  /**
   * WASD and Mobile Virtual Joystick Avatar Movement relative to camera yaw
   */
  updateMovement(delta) {
    const avatar = this.playerChar.model;
    let moveX = (Number(this.keys.right) - Number(this.keys.left));
    let moveZ = (Number(this.keys.forward) - Number(this.keys.backward));
    let isSprinting = this.keys.run;

    // Read Mobile Virtual Joystick Input
    if (this.mobileControls) {
      const mInput = this.mobileControls.getMovement();
      if (mInput.isMoving) {
        moveX = -mInput.rawX;
        moveZ = -mInput.rawY;
      }
      if (mInput.sprint) {
        isSprinting = true;
      }
    }

    const isMoving = Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01;

    if (isMoving) {
      const speed = isSprinting ? this.runSpeed : this.walkSpeed;

      // Calculate move direction vector relative to camera yaw
      const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
      const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();

      const moveDir = new THREE.Vector3()
        .addScaledVector(forward, -moveZ)
        .addScaledVector(right, -moveX)
        .normalize();

      // Translate avatar
      avatar.position.addScaledVector(moveDir, speed * delta);

      // Smoothly rotate avatar model towards move direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetAngle - avatar.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      avatar.rotation.y += diff * Math.min(1.0, delta * this.rotationSpeed);

      // Animation: Play Walk
      if (this.charManager) {
        this.charManager.playAnimation(this.playerChar, 'walk', 0.2);
      }

      // Collision Resolution
      this.resolveCollisions();
    } else {
      // Animation: Play Idle
      if (this.charManager && this.playerChar.currentActionName !== 'sit') {
        this.charManager.playAnimation(this.playerChar, 'idle', 0.28);
      }
    }
  }

  /**
   * Position the Third-Person Camera behind the avatar's shoulder
   */
  updateCameraPosition(instant = false) {
    if (!this.playerChar || !this.playerChar.model) return;

    const targetPos = this.playerChar.model.position.clone().add(this.targetOffset);

    if (this.state === 'sitting' && this.activeDesk) {
      // Focus camera onto desk surface
      this.camera.position.lerp(this.activeDesk.cameraAnchorPosition, instant ? 1.0 : 0.08);
      this.camera.lookAt(this.activeDesk.cameraAnchorTarget);
      return;
    }

    // Calculate spherical camera offset
    const cosPitch = Math.cos(this.pitch);
    const offsetX = Math.sin(this.yaw) * this.cameraDistance * cosPitch;
    const offsetZ = Math.cos(this.yaw) * this.cameraDistance * cosPitch;
    const offsetY = Math.sin(this.pitch) * this.cameraDistance + this.cameraHeight;

    const desiredCamPos = new THREE.Vector3(
      targetPos.x + offsetX,
      targetPos.y + offsetY,
      targetPos.z + offsetZ
    );

    if (instant) {
      this.camera.position.copy(desiredCamPos);
    } else {
      this.camera.position.lerp(desiredCamPos, 0.15); // Smooth trailing damp
    }

    this.camera.lookAt(targetPos);
  }

  /**
   * Raycast from avatar forward to detect NPCs and desks
   */
  updateRaycast() {
    if (!this.playerChar || !this.playerChar.model) return;

    const avatar = this.playerChar.model;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), avatar.rotation.y);
    const startPoint = avatar.position.clone().add(new THREE.Vector3(0, 1.2, 0));

    this.raycaster.set(startPoint, forward);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    let found = null;
    for (let i = 0; i < intersects.length; i++) {
      let obj = intersects[i].object;
      while (obj && !obj.userData?.isInteractable && obj.parent && obj !== this.scene) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.isInteractable) {
        // Exclude player avatar itself
        if (obj !== avatar && !avatar.getObjectById(obj.id)) {
          found = {
            object: obj,
            distance: intersects[i].distance,
            data: obj.userData
          };
          break;
        }
      }
    }

    // Proximity cone fallback if direct center-line ray missed
    if (!found) {
      let closestDist = 2.6;
      this.scene.traverse((obj) => {
        if (obj.userData?.isInteractable && obj !== avatar && !avatar.getObjectById(obj.id)) {
          const worldPos = new THREE.Vector3();
          obj.getWorldPosition(worldPos);
          const toTarget = new THREE.Vector3(worldPos.x - avatar.position.x, 0, worldPos.z - avatar.position.z);
          const dist = toTarget.length();
          if (dist < closestDist) {
            toTarget.normalize();
            const dot = forward.dot(toTarget);
            if (dot > 0.25) {
              closestDist = dist;
              found = {
                object: obj,
                distance: dist,
                data: obj.userData
              };
            }
          }
        }
      });
    }

    if (found && found.distance <= 2.8) {
      this.hoveredInteractable = found;
      this.showPrompt(found.data.interactLabel || 'تفاعل');
    } else {
      this.hoveredInteractable = null;
      this.hidePrompt();
    }
  }

  handleInteraction() {
    if (!this.hoveredInteractable) return;
    const data = this.hoveredInteractable.data;

    if (this.audio) this.audio.playClick();

    // 1. Desk Interaction
    if (data.type === 'workstation' && data.deskRef) {
      this.sitAtDesk(data.deskRef);
      return;
    }

    // 2. NPC Dialogue Interaction (e.g. Farouk, Sara, Mahmoud)
    if (data.type === 'npc_dialogue' && typeof data.onStartDialogue === 'function') {
      this.state = 'dialogue';
      if (this.playerChar?.model && this.hoveredInteractable.object) {
        const pPos = this.playerChar.model.position;
        const nPos = new THREE.Vector3();
        this.hoveredInteractable.object.getWorldPosition(nPos);
        const angle = Math.atan2(nPos.x - pPos.x, nPos.z - pPos.z);
        this.playerChar.model.rotation.y = angle;
        this.yaw = angle + Math.PI;
      }
      data.onStartDialogue(this);
      return;
    }

    // 3. Custom Callback
    if (typeof data.onInteract === 'function') {
      data.onInteract(this);
    }
  }

  sitAtDesk(desk) {
    this.activeDesk = desk;
    this.state = 'sitting';
    this.hidePrompt();

    // Position player model seated at desk
    const avatar = this.playerChar.model;
    const chairZ = (desk.chairZOffset !== undefined) ? desk.chairZOffset : 0.60;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), desk.rotationY);
    avatar.position.copy(desk.position).addScaledVector(forward, chairZ);
    avatar.position.y = 0; // Feet planted firmly on the floor tiles
    avatar.rotation.y = desk.rotationY + Math.PI;

    // Temporarily hide briefcase while seated to prevent clipping
    if (this.playerChar && this.playerChar.briefcase) {
      this.playerChar.briefcase.visible = false;
    }

    if (this.charManager) {
      this.charManager.playAnimation(this.playerChar, 'sit', 0.35);
    }

    // Update Mobile Controls (switches to stand up button)
    if (this.mobileControls) {
      this.mobileControls.setSeated(true);
    }

    // Release pointer lock for UI inspection
    document.exitPointerLock?.();

    desk.onWorkstationEngaged(this);
  }

  standUp() {
    if (this.activeDesk) {
      this.activeDesk.onWorkstationDismissed();
      this.activeDesk = null;
    }

    this.state = 'free_roam';

    // Step slightly back from the chair
    const avatar = this.playerChar.model;
    avatar.position.y = 0;
    avatar.position.z += 0.55;

    // Restore briefcase visibility when standing
    if (this.playerChar && this.playerChar.briefcase) {
      this.playerChar.briefcase.visible = true;
    }

    // Update Mobile Controls (switches back to joystick & sprint)
    if (this.mobileControls) {
      this.mobileControls.setSeated(false);
    }

    if (this.charManager) {
      this.charManager.playAnimation(this.playerChar, 'idle', 0.25);
    }
  }

  resolveCollisions() {
    const avatar = this.playerChar.model;
    const pos = avatar.position;

    for (let i = 0; i < this.collisionBoxes.length; i++) {
      const box = this.collisionBoxes[i];
      if (!box) continue;

      const clampedX = Math.max(box.min.x, Math.min(pos.x, box.max.x));
      const clampedZ = Math.max(box.min.z, Math.min(pos.z, box.max.z));

      const dx = pos.x - clampedX;
      const dz = pos.z - clampedZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < this.playerRadius * this.playerRadius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = this.playerRadius - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      }
    }
  }

  showPrompt(label) {
    if (this.interactionPrompt) {
      this.interactionPrompt.innerHTML = `
        <span style="background: #38bdf8; color: #0f172a; padding: 2px 8px; border-radius: 6px; font-weight: 900;">E</span>
        <span>${label}</span>
      `;
      this.interactionPrompt.style.display = 'flex';
    }
    if (this.mobileControls) {
      this.mobileControls.setInteractVisible(true, label);
    }
  }

  hidePrompt() {
    if (this.interactionPrompt) {
      this.interactionPrompt.style.display = 'none';
    }
    if (this.mobileControls) {
      this.mobileControls.setInteractVisible(false);
    }
  }

  destroy() {
    this.domElement.removeEventListener('click', this.onCanvasClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }

    if (this.interactionPrompt && this.interactionPrompt.parentNode) {
      this.interactionPrompt.parentNode.removeChild(this.interactionPrompt);
    }
  }
}
