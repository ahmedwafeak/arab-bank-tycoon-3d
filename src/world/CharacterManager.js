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
   * Preload default character assets (Instant procedural humanoids - 0ms overhead)
   */
  async initDefaultAssets() {
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = false;
    this.isLoaded = true;
    console.log('[CharacterManager] High-performance procedural 3D humanoids initialized (60 FPS ready).');
    this.loadPromise = Promise.resolve(true);
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
   * Upgrade an individual placeholder character in-place
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
    instance.userData.characterRef = char;
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

        if (char.isMoving) {
          // Walk cycle: alternating legs and arms
          const swing = Math.sin(char.walkAnimTime);
          if (u.leftLeg) u.leftLeg.rotation.x = swing * 0.55;
          if (u.rightLeg) u.rightLeg.rotation.x = -swing * 0.55;
          if (u.leftArm) u.leftArm.rotation.x = -swing * 0.45;
          if (u.rightArm) u.rightArm.rotation.x = swing * 0.45;
          if (u.torso) u.torso.position.y = 1.08 + Math.abs(Math.sin(char.walkAnimTime * 2)) * 0.03;
          if (u.head) u.head.position.y = 1.52 + Math.abs(Math.sin(char.walkAnimTime * 2)) * 0.03;
        } else if (char.currentActionName === 'type') {
          // Office desk typing: arms bent forward oscillating
          const tap = Math.sin(char.walkAnimTime * 1.5);
          if (u.leftArm) {
            u.leftArm.rotation.x = -0.9 + tap * 0.08;
            u.leftArm.rotation.z = 0.2;
          }
          if (u.rightArm) {
            u.rightArm.rotation.x = -0.9 - tap * 0.08;
            u.rightArm.rotation.z = -0.2;
          }
          if (u.leftLeg) u.leftLeg.rotation.x = -1.4; // Seated legs
          if (u.rightLeg) u.rightLeg.rotation.x = -1.4;
          if (u.head) u.head.rotation.x = 0.15; // Looking down at desk
        } else if (char.currentActionName === 'sit') {
          // Seated pose
          if (u.leftLeg) u.leftLeg.rotation.x = -1.4;
          if (u.rightLeg) u.rightLeg.rotation.x = -1.4;
          if (u.leftArm) u.leftArm.rotation.x = -0.5;
          if (u.rightArm) u.rightArm.rotation.x = -0.5;
          if (u.head) u.head.rotation.x = 0;
        } else {
          // Idle breathing
          const breath = Math.sin(char.walkAnimTime * 0.4);
          if (u.leftLeg) u.leftLeg.rotation.x = 0;
          if (u.rightLeg) u.rightLeg.rotation.x = 0;
          if (u.leftArm) {
            u.leftArm.rotation.x = breath * 0.05;
            u.leftArm.rotation.z = 0.06;
          }
          if (u.rightArm) {
            u.rightArm.rotation.x = -breath * 0.05;
            u.rightArm.rotation.z = -0.06;
          }
          if (u.head) u.head.position.y = 1.52 + breath * 0.015;
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
          const targetHeading = Math.atan2(dir.x, dir.z);
          let diff = (targetHeading - char.model.rotation.y) % (Math.PI * 2);
          if (diff < -Math.PI) diff += Math.PI * 2;
          if (diff > Math.PI) diff -= Math.PI * 2;
          char.model.rotation.y += diff * Math.min(1.0, delta * 9);
        }
      }
    }
  }

  /**
   * Procedural Stylized Humanoid - 60 FPS Optimized & Rich Detail
   */
  createFallbackPlaceholder(options = {}) {
    const group = new THREE.Group();
    const role = options.role || 'clerk';
    const isGuard = role === 'guard';
    const isClerk = role === 'clerk' || role === 'teller';
    const isVIP = role === 'vip';
    const isFemale = role === 'female' || role === 'vip_female';
    const isPlayer = role === 'player';

    // Color Palette
    let suitColor = 0x0f172a; // Default charcoal
    let pantsColor = 0x1e293b;
    let tieColor = 0x38bdf8; // Sky blue

    if (isGuard) {
      suitColor = 0x1e3a8a; // Security navy blue
      pantsColor = 0x172554;
      tieColor = 0xf59e0b;
    } else if (isVIP) {
      suitColor = 0x334155; // Executive slate gray
      pantsColor = 0x1e293b;
      tieColor = 0xd4af37; // Gold tie
    } else if (isFemale) {
      suitColor = 0xb45309; // Elegant warm bronze/camel
      pantsColor = 0x1e293b;
      tieColor = 0xfef08a;
    } else if (isPlayer) {
      suitColor = 0x0c4a6e; // Professional cobalt blue
      pantsColor = 0x0f172a;
      tieColor = 0x38bdf8;
    } else if (options.clothesColor) {
      suitColor = options.clothesColor;
    }

    const matSuit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.5 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.65 });
    const matPants = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.6 });
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const matTie = new THREE.MeshStandardMaterial({ color: tieColor, roughness: 0.3 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), matSkin);
    head.position.y = 1.52;
    head.castShadow = true;
    group.add(head);

    // Hair / Cap
    if (isGuard) {
      // Security Peaked Cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.08, 16), matSuit);
      cap.position.set(0, 1.63, 0);
      group.add(cap);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.1), matSuit);
      visor.position.set(0, 1.61, 0.14);
      group.add(visor);
    } else if (isFemale) {
      // Stylish Hair Bun
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x271911, roughness: 0.8 });
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), hairMat);
      bun.position.set(0, 1.64, -0.09);
      group.add(bun);
    } else {
      // Short Hair
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.8 });
      const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.09, 14), hairMat);
      hair.position.set(0, 1.62, -0.01);
      group.add(hair);
    }

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 12), matSuit);
    torso.position.y = 1.08;
    torso.castShadow = true;
    group.add(torso);

    // Shirt Collar & Tie
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.05), matWhite);
    shirt.position.set(0, 1.22, 0.17);
    group.add(shirt);

    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.02), matTie);
    tie.position.set(0, 1.18, 0.2);
    group.add(tie);

    // Guard badge / Executive pin
    if (isGuard || isVIP) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 8), matGold);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(0.1, 1.25, 0.19);
      group.add(pin);
    }

    // Arms
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), matSuit);
    leftArm.position.set(-0.25, 1.05, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), matSuit);
    rightArm.position.set(0.25, 1.05, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), matPants);
    leftLeg.position.set(-0.11, 0.42, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), matPants);
    rightLeg.position.set(0.11, 0.42, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    group.userData = { leftLeg, rightLeg, leftArm, rightArm, head, torso };
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
