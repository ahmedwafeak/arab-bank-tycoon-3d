import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * CharacterManager - Realistic 3D Character & Animation System for Three.js
 * Features:
 * - Direct FBX and GLTF loading from /assets/characters/ and /assets/animations/
 * - Instant placeholder spawning with automatic background upgrade to realistic rigged mesh
 * - Mixamo bone normalization (mixamorig <-> mixamorig9)
 * - Skeletal animation cloning & smooth cross-fading
 * - Pathfinding movement with heading orientation
 */
export class CharacterManager {
  constructor(scene) {
    this.scene = scene;
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();

    // Cache
    this.baseModels = new Map(); // key -> THREE.Object3D (template)
    this.animationClips = new Map(); // name -> THREE.AnimationClip
    this.characters = []; // Active spawned characters

    this.defaultModelKey = 'character';
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * Universal Asset Loader - checks availability, filters out HTML 404 responses
   */
  async loadFile(urlCandidates) {
    if (!Array.isArray(urlCandidates)) {
      urlCandidates = [urlCandidates];
    }

    for (const url of urlCandidates) {
      try {
        // First check if asset exists and isn't an SPA HTML fallback
        const head = await fetch(url, { method: 'HEAD' });
        if (!head.ok) continue;
        const ct = head.headers.get('content-type') || '';
        if (ct.includes('text/html')) continue; // Vite SPA fallback for missing files

        const isGLTF = url.endsWith('.glb') || url.endsWith('.gltf');
        const isFBX = url.endsWith('.fbx');

        if (isGLTF) {
          const gltf = await new Promise((resolve, reject) => {
            this.gltfLoader.load(url, resolve, undefined, reject);
          });
          return { object: gltf.scene || gltf.scenes[0], animations: gltf.animations || [], type: 'gltf' };
        } else if (isFBX) {
          const fbx = await new Promise((resolve, reject) => {
            this.fbxLoader.load(url, resolve, undefined, reject);
          });
          return { object: fbx, animations: fbx.animations || [], type: 'fbx' };
        }
      } catch (err) {
        // Try next candidate
        console.warn(`[CharacterManager] Candidate "${url}" not available:`, err.message);
      }
    }
    throw new Error(`[CharacterManager] Could not load any of: ${urlCandidates.join(', ')}`);
  }

  /**
   * Load base character model and store as template
   */
  async loadCharacterModel(key, urlCandidates) {
    if (this.baseModels.has(key)) {
      return this.baseModels.get(key);
    }

    const { object } = await this.loadFile(urlCandidates);

    // Normalize bone names: ensure mixamorig has '9' prefix to match animations
    object.traverse((child) => {
      if (child.isBone && child.name.startsWith('mixamorig') && !child.name.startsWith('mixamorig9')) {
        child.name = child.name.replace(/^mixamorig/, 'mixamorig9');
      }

      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            m.roughness = 0.55;
            m.metalness = 0.1;
            m.needsUpdate = true;
          });
        }
      }
    });

    this.baseModels.set(key, object);
    console.log(`[CharacterManager] Loaded character model [${key}]`);
    return object;
  }

  /**
   * Load animation clip and store in animationClips cache
   */
  async loadAnimation(animName, urlCandidates) {
    if (this.animationClips.has(animName)) {
      return this.animationClips.get(animName);
    }

    try {
      const { animations, object } = await this.loadFile(urlCandidates);
      let clip = null;

      if (animations && animations.length > 0) {
        clip = animations[0];
      } else if (object && object.animations && object.animations.length > 0) {
        clip = object.animations[0];
      }

      if (clip) {
        clip.name = animName;
        // Normalize track names if needed
        clip.tracks.forEach((track) => {
          if (track.name.startsWith('mixamorig.') || track.name.startsWith('mixamorig:')) {
            track.name = track.name.replace(/^mixamorig/, 'mixamorig9');
          }
        });
        this.animationClips.set(animName, clip);
        console.log(`[CharacterManager] Loaded animation "${animName}" (${clip.duration.toFixed(2)}s)`);
        return clip;
      }
    } catch (err) {
      console.warn(`[CharacterManager] Could not load animation "${animName}":`, err.message);
    }

    return null;
  }

  /**
   * Preload default character assets (Realistic 3D GLB Models & Skeletal Animations)
   */
  async initDefaultAssets() {
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        console.log('[CharacterManager] Starting background load of realistic 3D character assets (.glb)...');

        // 1. Load Main Male Character Model (.glb prioritized)
        await this.loadCharacterModel('character', [
          '/assets/characters/character.glb',
          './assets/characters/character.glb',
          '/assets/characters/character.fbx'
        ]);

        // 2. Load Female Character Model (.glb prioritized)
        try {
          await this.loadCharacterModel('character_female', [
            '/assets/characters/character_female.glb',
            './assets/characters/character_female.glb',
            '/assets/characters/character_female.fbx'
          ]);
        } catch (e) {
          console.warn('[CharacterManager] Female character model skipped:', e.message);
        }

        // 3. Load Skeletal Animations
        await Promise.allSettled([
          this.loadAnimation('idle', [
            '/assets/animations/Breathing Idle.fbx',
            './assets/animations/Breathing Idle.fbx'
          ]),
          this.loadAnimation('walk', [
            '/assets/animations/Standard Walk.fbx',
            './assets/animations/Standard Walk.fbx'
          ]),
          this.loadAnimation('sit', [
            '/assets/animations/Sitting Idle.fbx',
            './assets/animations/Sitting Idle.fbx'
          ]),
          this.loadAnimation('type', [
            '/assets/animations/Typing.fbx',
            './assets/animations/Typing.fbx'
          ])
        ]);

        this.isLoaded = true;
        this.isLoading = false;
        console.log('🎉 [CharacterManager] Realistic 3D character assets loaded successfully! Upgrading active scene characters...');

        // Progressive Enhancement: Upgrade all active placeholders in the scene
        this.upgradeAllPlaceholders();

        return true;
      } catch (err) {
        this.isLoading = false;
        console.error('[CharacterManager] Error loading realistic assets:', err);
        return false;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Calculate human-proportional scale for instance (approx 1.7m tall)
   */
  getOptimalScale(object, targetHeight = 1.72) {
    const bbox = new THREE.Box3().setFromObject(object);
    const size = bbox.getSize(new THREE.Vector3());
    if (size.y > 50) {
      return (targetHeight / size.y); // Mixamo cm scale (~0.0096)
    } else if (size.y > 6) {
      return (targetHeight / size.y);
    } else if (size.y > 0.1) {
      return (targetHeight / size.y);
    }
    return 0.0096;
  }

  /**
   * Spawn a character instance in the scene immediately
   */
  spawnCharacter(options = {}) {
    const modelKey = options.modelKey || (options.role === 'female' || options.role === 'vip_female' ? 'character_female' : this.defaultModelKey);
    const baseModel = this.baseModels.get(modelKey) || this.baseModels.get(this.defaultModelKey);

    let instance;
    let isPlaceholder = false;

    if (baseModel) {
      // Clone rigged skeleton with SkeletonUtils
      instance = SkeletonUtils.clone(baseModel);
      const s = options.scale || this.getOptimalScale(instance);
      instance.scale.set(s, s, s);

      // Role-specific corporate banking attire
      const role = options.role || 'customer';
      instance.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          const n = child.name.toLowerCase();
          if (n.includes('sweater') || n.includes('shirt')) {
            if (role === 'vip' || options.isExecutive) {
              child.material.color.setHex(0x18181b); // Executive Charcoal
            } else if (role === 'guard') {
              child.material.color.setHex(0x1e3a8a); // Security Navy
            } else if (role === 'female') {
              child.material.color.setHex(0x78350f); // Burgundy
            } else if (role === 'player') {
              child.material.color.setHex(0x0369a1); // Corporate Blue
            }
          }
        }
      });
    } else {
      // Clean immediate procedural humanoid while model loads in background
      instance = this.createFallbackPlaceholder(options);
      isPlaceholder = true;
    }

    // Position & Rotation
    const pos = options.position || [0, 0, 0];
    if (Array.isArray(pos)) {
      instance.position.set(pos[0], pos[1], pos[2]);
    } else if (pos.isVector3) {
      instance.position.copy(pos);
    }
    instance.rotation.y = options.rotationY || 0;

    // Animation Mixer Setup
    let mixer = null;
    const actions = {};
    let currentAction = null;
    const defaultAnim = options.defaultAnimation || 'idle';

    if (!isPlaceholder) {
      mixer = new THREE.AnimationMixer(instance);
      for (const [animName, clip] of this.animationClips.entries()) {
        actions[animName] = mixer.clipAction(clip);
      }
      if (actions[defaultAnim]) {
        currentAction = actions[defaultAnim];
        currentAction.play();
      } else if (actions['idle']) {
        currentAction = actions['idle'];
        currentAction.play();
      }
    }

    // Character State Object
    const character = {
      id: Math.random().toString(36).substring(2, 9),
      model: instance,
      modelKey,
      isPlaceholder,
      options,
      mixer,
      actions,
      currentAction,
      currentActionName: defaultAnim,
      role: options.role || 'customer',
      speed: options.speed || 1.8,
      isMoving: false,
      targetPosition: null,
      onMoveComplete: null,
      walkAnimTime: Math.random() * 10,
      userData: options.userData || {}
    };

    instance.userData.characterRef = character;
    this.scene.add(instance);
    this.characters.push(character);

    return character;
  }

  /**
   * Upgrade any placeholder characters to the realistic rigged 3D models
   */
  upgradeAllPlaceholders() {
    for (const char of this.characters) {
      if (char.isPlaceholder) {
        this.upgradePlaceholderToRealistic(char);
      }
    }
  }

  /**
   * Upgrade an individual placeholder character in-place to realistic 3D model
   */
  upgradePlaceholderToRealistic(char) {
    const baseModel = this.baseModels.get(char.modelKey) || this.baseModels.get(this.defaultModelKey);
    if (!baseModel || !char.model) return;

    // Clone realistic model
    const instance = SkeletonUtils.clone(baseModel);
    instance.position.copy(char.model.position);
    instance.rotation.copy(char.model.rotation);

    const s = char.options.scale || this.getOptimalScale(instance);
    instance.scale.set(s, s, s);

    // Setup animation mixer
    const mixer = new THREE.AnimationMixer(instance);
    const actions = {};
    for (const [animName, clip] of this.animationClips.entries()) {
      actions[animName] = mixer.clipAction(clip);
    }

    const animToPlay = char.currentActionName || char.options.defaultAnimation || 'idle';
    let currentAction = null;
    if (actions[animToPlay]) {
      currentAction = actions[animToPlay];
      currentAction.play();
    } else if (actions['idle']) {
      currentAction = actions['idle'];
      currentAction.play();
    }

    // Role-specific corporate banking attire
    const role = char.options.role || char.role || 'teller';
    instance.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        const n = child.name.toLowerCase();
        if (n.includes('sweater') || n.includes('shirt')) {
          if (role === 'vip' || char.options.isExecutive) {
            child.material.color.setHex(0x18181b); // Executive Charcoal
          } else if (role === 'guard') {
            child.material.color.setHex(0x1e3a8a); // Security Navy
          } else if (role === 'female') {
            child.material.color.setHex(0x78350f); // Burgundy
          } else if (role === 'player') {
            child.material.color.setHex(0x0369a1); // Corporate Blue
          }
        }
      }
    });

    // Transfer accessories (e.g. briefcase)
    if (char.briefcase) {
      instance.add(char.briefcase);
    }

    // Preserve and transfer userData for raycast interaction & dialogue
    const oldUserData = { ...(char.userData || {}), ...(char.model.userData || {}), ...(char.options.userData || {}) };
    Object.assign(instance.userData, oldUserData);
    instance.userData.characterRef = char;
    instance.traverse((child) => {
      if (child.isMesh) {
        Object.assign(child.userData, oldUserData);
        child.userData.characterRef = char;
      }
    });

    // Replace old placeholder in scene
    if (char.model.parent) {
      char.model.parent.remove(char.model);
    }
    this.scene.add(instance);

    // Update character ref
    char.model = instance;
    char.mixer = mixer;
    char.actions = actions;
    char.currentAction = currentAction;
    char.isPlaceholder = false;
  }

  /**
   * Smoothly cross-fade to a new animation
   */
  playAnimation(character, animName, fadeDuration = 0.35) {
    if (!character) return;
    character.currentActionName = animName;

    if (!character.actions || !character.actions[animName]) {
      return;
    }

    const nextAction = character.actions[animName];
    if (character.currentAction === nextAction && nextAction.isRunning()) {
      return;
    }

    const prevAction = character.currentAction;
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, fadeDuration, true);
    }
    nextAction.play();

    character.currentAction = nextAction;
    character.currentActionName = animName;
  }

  /**
   * Move character towards (x, z) coordinates smoothly
   */
  moveTo(character, x, z, onComplete = null) {
    if (!character || !character.model) return;

    character.targetPosition = new THREE.Vector3(x, character.model.position.y, z);
    character.isMoving = true;
    character.onMoveComplete = onComplete;

    // Switch to walk animation
    this.playAnimation(character, 'walk', 0.25);
  }

  /**
   * Stop movement and return to idle
   */
  stop(character) {
    if (!character) return;
    character.isMoving = false;
    character.targetPosition = null;
    this.playAnimation(character, 'idle', 0.3);
  }

  /**
   * Update all characters and animation mixers each frame
   */
  update(delta) {
    for (let i = 0; i < this.characters.length; i++) {
      const char = this.characters[i];

      // 1. Update Animation Mixer (if any realistic model is bound)
      if (char.mixer) {
        char.mixer.update(delta);
      }

      // 2. Animate procedural humanoid limbs and body states
      if (char.isPlaceholder && char.model && char.model.userData) {
        const u = char.model.userData;
        char.walkAnimTime += delta * 7;

        const isWalking = char.isMoving || char.currentActionName === 'walk';

        if (isWalking) {
          // Walk cycle: natural hip & shoulder pivot pendulum swing
          const swing = Math.sin(char.walkAnimTime);
          if (u.leftLeg) u.leftLeg.rotation.x = swing * 0.52;
          if (u.rightLeg) u.rightLeg.rotation.x = -swing * 0.52;
          if (u.leftKnee) u.leftKnee.rotation.x = Math.max(0, swing * 0.45);
          if (u.rightKnee) u.rightKnee.rotation.x = Math.max(0, -swing * 0.45);

          if (u.leftArm) {
            u.leftArm.rotation.x = -swing * 0.42;
            u.leftArm.rotation.z = 0.08;
          }
          if (u.rightArm) {
            u.rightArm.rotation.x = swing * 0.42;
            u.rightArm.rotation.z = -0.08;
          }

          if (u.torso) u.torso.position.y = 1.08 + Math.abs(Math.sin(char.walkAnimTime * 2)) * 0.025;
          if (u.head) u.head.position.y = 1.52 + Math.abs(Math.sin(char.walkAnimTime * 2)) * 0.025;
          if (u.head) u.head.rotation.x = 0;
        } else if (char.currentActionName === 'type') {
          // Office desk typing: hips seated 90 deg, knees bent down 90 deg, arms tapping keyboard
          if (u.leftLeg) u.leftLeg.rotation.x = -Math.PI / 2;
          if (u.rightLeg) u.rightLeg.rotation.x = -Math.PI / 2;
          if (u.leftKnee) u.leftKnee.rotation.x = Math.PI / 2;
          if (u.rightKnee) u.rightKnee.rotation.x = Math.PI / 2;

          const tap = Math.sin(char.walkAnimTime * 1.8);
          if (u.leftArm) {
            u.leftArm.rotation.x = -0.82 + tap * 0.07;
            u.leftArm.rotation.z = 0.22;
          }
          if (u.rightArm) {
            u.rightArm.rotation.x = -0.82 - tap * 0.07;
            u.rightArm.rotation.z = -0.22;
          }
          if (u.head) u.head.rotation.x = 0.16; // Looking down at desk screen
        } else if (char.currentActionName === 'sit') {
          // Seated pose: hips at 90 deg, knees bent at 90 deg, feet on floor
          if (u.leftLeg) u.leftLeg.rotation.x = -Math.PI / 2;
          if (u.rightLeg) u.rightLeg.rotation.x = -Math.PI / 2;
          if (u.leftKnee) u.leftKnee.rotation.x = Math.PI / 2;
          if (u.rightKnee) u.rightKnee.rotation.x = Math.PI / 2;

          if (u.leftArm) {
            u.leftArm.rotation.x = -0.45;
            u.leftArm.rotation.z = 0.14;
          }
          if (u.rightArm) {
            u.rightArm.rotation.x = -0.45;
            u.rightArm.rotation.z = -0.14;
          }
          if (u.head) u.head.rotation.x = 0;
        } else {
          // Idle breathing with natural relaxed posture
          const breath = Math.sin(char.walkAnimTime * 0.4);
          if (u.leftLeg) u.leftLeg.rotation.x = 0;
          if (u.rightLeg) u.rightLeg.rotation.x = 0;
          if (u.leftKnee) u.leftKnee.rotation.x = 0;
          if (u.rightKnee) u.rightKnee.rotation.x = 0;

          if (u.leftArm) {
            u.leftArm.rotation.x = breath * 0.04;
            u.leftArm.rotation.z = 0.08;
          }
          if (u.rightArm) {
            u.rightArm.rotation.x = -breath * 0.04;
            u.rightArm.rotation.z = -0.08;
          }
          if (u.torso) u.torso.position.y = 1.08 + breath * 0.008;
          if (u.head) u.head.position.y = 1.52 + breath * 0.012;
          if (u.head) u.head.rotation.x = 0;
        }
      }

      // 3. Handle Movement
      if (char.isMoving && char.targetPosition) {
        const currentPos = char.model.position;
        const target = char.targetPosition;
        const dist = currentPos.distanceTo(target);

        if (dist < 0.12) {
          // Reached destination
          currentPos.copy(target);
          char.isMoving = false;
          char.targetPosition = null;

          // Cross-fade back to idle
          this.playAnimation(char, 'idle', 0.35);

          if (typeof char.onMoveComplete === 'function') {
            const cb = char.onMoveComplete;
            char.onMoveComplete = null;
            cb(char);
          }
        } else {
          // Step towards target
          const dir = target.clone().sub(currentPos).normalize();
          currentPos.addScaledVector(dir, char.speed * delta);

          // Smoothly rotate towards heading (safe modulus, no while loop)
          const targetAngle = Math.atan2(dir.x, dir.z);
          let diff = (targetAngle - char.model.rotation.y) % (Math.PI * 2);
          if (diff < -Math.PI) diff += Math.PI * 2;
          if (diff > Math.PI) diff -= Math.PI * 2;
          char.model.rotation.y += diff * Math.min(1.0, delta * 8.0);
        }
      }
    }
  }

  /**
   * Procedural Stylized Humanoid - 60 FPS Optimized & Rich Executive Detail
   */
  createFallbackPlaceholder(options = {}) {
    const group = new THREE.Group();
    const role = options.role || 'clerk';
    const isGuard = role === 'guard';
    const isClerk = role === 'clerk' || role === 'teller';
    const isVIP = role === 'vip';
    const isFemale = role === 'female' || role === 'vip_female';
    const isPlayer = role === 'player';

    // Corporate Color Palette (Tailored Egyptian Banking Attire)
    let suitColor = 0x1e293b; // Slate navy
    let pantsColor = 0x0f172a; // Dark charcoal trousers
    let tieColor = 0x0284c7; // Egyptian banking azure tie
    let skinColor = 0xf5d0a9; // Egyptian skin tone
    let hairColor = 0x1a120b; // Dark brown / black hair
    let shoeColor = 0x18181b; // Polished black leather

    if (isGuard) {
      suitColor = 0x1e3a8a; // Security navy blue uniform
      pantsColor = 0x172554;
      tieColor = 0xf59e0b; // Golden epaulet accents
      shoeColor = 0x09090b;
    } else if (isVIP) {
      suitColor = 0x27272a; // Executive charcoal bespoke suit
      pantsColor = 0x18181b;
      tieColor = 0xd4af37; // Royal Egyptian gold silk tie
      shoeColor = 0x3f2213; // Italian dark cognac leather
    } else if (isFemale) {
      suitColor = 0x78350f; // Elegant bronze/burgundy blazer
      pantsColor = 0x1e293b;
      tieColor = 0xfef08a; // Silk gold scarf / lanyard
      hairColor = 0x271911;
      shoeColor = 0x18181b;
    } else if (isPlayer) {
      suitColor = 0x0369a1; // Professional sharp Egyptian blue
      pantsColor = 0x0f172a;
      tieColor = 0x38bdf8;
      shoeColor = 0x1c1917;
    } else if (options.clothesColor) {
      suitColor = options.clothesColor;
    }

    const matSuit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.5, metalness: 0.05 });
    const matSkin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });
    const matPants = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.65 });
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const matTie = new THREE.MeshStandardMaterial({ color: tieColor, roughness: 0.25 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.18 });
    const matShoe = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.35, metalness: 0.15 });
    const matHair = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });

    // 1. Head & Neck Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.52, 0);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.12, 12), matSkin);
    neck.position.y = -0.10;
    headGroup.add(neck);

    // Head base (Spherical with chin contour)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 16), matSkin);
    head.scale.set(1.0, 1.15, 0.95);
    head.castShadow = true;
    headGroup.add(head);

    // Eyes
    const matEye = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), matEye);
    leftEye.position.set(-0.045, 0.02, 0.135);
    headGroup.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.position.x = 0.045;
    headGroup.add(rightEye);

    // Hair / Cap Styling
    if (isGuard) {
      // Security Officer Peaked Cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.07, 16), matSuit);
      cap.position.set(0, 0.11, -0.01);
      headGroup.add(cap);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.09), matShoe);
      visor.position.set(0, 0.09, 0.13);
      headGroup.add(visor);

      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8), matGold);
      badge.rotation.x = Math.PI / 2;
      badge.position.set(0, 0.12, 0.155);
      headGroup.add(badge);
    } else if (isFemale) {
      // Professional Hijab / Styled Hair Bun
      const hijab = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 16), matSuit);
      hijab.position.set(0, 0.03, -0.03);
      hijab.scale.set(1.05, 1.2, 1.05);
      headGroup.add(hijab);
    } else {
      // Groomed Short Hair with Side Part
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.152, 14, 14), matHair);
      hair.position.set(0, 0.04, -0.02);
      hair.scale.set(1.02, 1.08, 1.02);
      headGroup.add(hair);

      // Glasses for analysts / clerks / player
      if (isClerk || isPlayer) {
        const matFrame = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
        const frameL = new THREE.Mesh(new THREE.RingGeometry(0.022, 0.028, 12), matFrame);
        frameL.position.set(-0.045, 0.02, 0.142);
        headGroup.add(frameL);

        const frameR = frameL.clone();
        frameR.position.x = 0.045;
        headGroup.add(frameR);

        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.006, 0.006), matFrame);
        bridge.position.set(0, 0.02, 0.142);
        headGroup.add(bridge);
      }
    }
    group.add(headGroup);

    // 2. Torso & Upper Body
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.54, 14), matSuit);
    torso.position.y = 1.08;
    torso.scale.set(1.15, 1.0, 0.82);
    torso.castShadow = true;
    group.add(torso);

    // White Shirt Front
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.04), matWhite);
    shirt.position.set(0, 1.21, 0.14);
    group.add(shirt);

    // Silk Tie
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.02), matTie);
    tie.position.set(0, 1.17, 0.162);
    group.add(tie);

    // Hanging Corporate ID Badge Card (كارت التعريف بالرقبة)
    const lanyard = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.005, 4, 12, Math.PI), matTie);
    lanyard.rotation.x = Math.PI / 2.3;
    lanyard.position.set(0, 1.34, 0.06);
    group.add(lanyard);

    const idCard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.006), matWhite);
    idCard.position.set(0, 1.10, 0.175);
    group.add(idCard);

    // Gold Executive Lapel Pin
    if (isVIP || isGuard) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8), matGold);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(0.11, 1.24, 0.155);
      group.add(pin);
    }

    // 3. Shoulders & Arms (Pivoted at Shoulders y = 1.28)
    // Left Arm Pivot
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.25, 1.28, 0);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.26, 10), matSuit);
    leftUpperArm.position.set(0, -0.13, 0);
    leftUpperArm.castShadow = true;
    leftArmPivot.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.040, 0.22, 10), matSuit);
    leftForearm.position.set(0, -0.32, 0);
    leftForearm.castShadow = true;
    leftArmPivot.add(leftForearm);

    // White Shirt Cuff
    const leftCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.025, 10), matWhite);
    leftCuff.position.set(0, -0.42, 0);
    leftArmPivot.add(leftCuff);

    // Left Hand
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), matSkin);
    leftHand.position.set(0, -0.46, 0);
    leftArmPivot.add(leftHand);

    group.add(leftArmPivot);

    // Right Arm Pivot
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.25, 1.28, 0);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.26, 10), matSuit);
    rightUpperArm.position.set(0, -0.13, 0);
    rightUpperArm.castShadow = true;
    rightArmPivot.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.040, 0.22, 10), matSuit);
    rightForearm.position.set(0, -0.32, 0);
    rightForearm.castShadow = true;
    rightArmPivot.add(rightForearm);

    // White Shirt Cuff
    const rightCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.025, 10), matWhite);
    rightCuff.position.set(0, -0.42, 0);
    rightArmPivot.add(rightCuff);

    // Executive Gold Watch on wrist
    if (isVIP || isPlayer) {
      const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.02, 10), matGold);
      watch.position.set(0, -0.41, 0);
      rightArmPivot.add(watch);
    }

    // Right Hand
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), matSkin);
    rightHand.position.set(0, -0.46, 0);
    rightArmPivot.add(rightHand);

    group.add(rightArmPivot);

    // 4. Hips & Legs (Pivoted at Hip Sockets y = 0.76)
    // Left Leg Hip Pivot
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.11, 0.76, 0);

    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.052, 0.36, 10), matPants);
    leftThigh.position.set(0, -0.18, 0);
    leftThigh.castShadow = true;
    leftLegPivot.add(leftThigh);

    // Left Knee Pivot
    const leftKnee = new THREE.Group();
    leftKnee.position.set(0, -0.36, 0);

    const leftShin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.34, 10), matPants);
    leftShin.position.set(0, -0.17, 0);
    leftShin.castShadow = true;
    leftKnee.add(leftShin);

    // Left Oxford Dress Shoe
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.065, 0.20), matShoe);
    leftShoe.position.set(0, -0.35, 0.04);
    leftShoe.castShadow = true;
    leftKnee.add(leftShoe);

    leftLegPivot.add(leftKnee);
    group.add(leftLegPivot);

    // Right Leg Hip Pivot
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.11, 0.76, 0);

    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.052, 0.36, 10), matPants);
    rightThigh.position.set(0, -0.18, 0);
    rightThigh.castShadow = true;
    rightLegPivot.add(rightThigh);

    // Right Knee Pivot
    const rightKnee = new THREE.Group();
    rightKnee.position.set(0, -0.36, 0);

    const rightShin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.34, 10), matPants);
    rightShin.position.set(0, -0.17, 0);
    rightShin.castShadow = true;
    rightKnee.add(rightShin);

    // Right Oxford Dress Shoe
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.065, 0.20), matShoe);
    rightShoe.position.set(0, -0.35, 0.04);
    rightShoe.castShadow = true;
    rightKnee.add(rightShoe);

    rightLegPivot.add(rightKnee);
    group.add(rightLegPivot);

    // Store limb references in userData for natural physics/animation
    group.userData = {
      leftLeg: leftLegPivot,
      rightLeg: rightLegPivot,
      leftKnee,
      rightKnee,
      leftArm: leftArmPivot,
      rightArm: rightArmPivot,
      head: headGroup,
      torso
    };

    return group;
  }

  /**
   * Remove a character from scene and clean up
   */
  removeCharacter(character) {
    if (!character) return;
    const index = this.characters.indexOf(character);
    if (index !== -1) {
      this.characters.splice(index, 1);
    }
    if (character.mixer) {
      character.mixer.stopAllAction();
    }
    if (character.model && character.model.parent) {
      character.model.parent.remove(character.model);
    }
  }

  /**
   * Clear all spawned characters
   */
  clear() {
    for (const char of this.characters) {
      if (char.mixer) char.mixer.stopAllAction();
      if (char.model && char.model.parent) {
        char.model.parent.remove(char.model);
      }
    }
    this.characters = [];
  }
}
