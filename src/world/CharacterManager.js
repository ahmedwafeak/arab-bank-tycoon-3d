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
   * Preload default character models and animations
   */
  async initDefaultAssets() {
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        // 1. Load Main Male Character Model (FBX prioritized)
        await this.loadCharacterModel('character', [
          '/assets/characters/character.fbx',
          '/assets/characters/character.glb',
          '/assets/character.fbx'
        ]);

        // 2. Load Female Character Model
        try {
          await this.loadCharacterModel('character_female', [
            '/assets/characters/character_female.fbx',
            '/assets/characters/character_female.glb',
            '/assets/character_female.fbx'
          ]);
        } catch (e) {
          console.warn('[CharacterManager] Female character model skipped:', e.message);
        }

        // 3. Load Skeletal Animations
        await Promise.allSettled([
          this.loadAnimation('idle', [
            '/assets/animations/Breathing Idle.fbx',
            '/assets/animations/idle.fbx',
            '/assets/animations/idle.glb'
          ]),
          this.loadAnimation('walk', [
            '/assets/animations/Standard Walk.fbx',
            '/assets/animations/walk.fbx',
            '/assets/animations/walk.glb'
          ]),
          this.loadAnimation('sit', [
            '/assets/animations/Sitting Idle.fbx',
            '/assets/animations/sit.fbx',
            '/assets/animations/sit.glb'
          ]),
          this.loadAnimation('type', [
            '/assets/animations/Typing.fbx',
            '/assets/animations/type.fbx',
            '/assets/animations/work.glb'
          ])
        ]);

        this.isLoaded = true;
        this.isLoading = false;
        console.log('[CharacterManager] Realistic 3D character assets ready. Upgrading active characters...');

        // Upgrade any placeholders that were spawned while assets were loading
        this.upgradeAllPlaceholders();

        return true;
      } catch (err) {
        this.isLoading = false;
        console.error('[CharacterManager] Error loading default assets:', err);
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

      // 1. Update Animation Mixer (for realistic models)
      if (char.mixer) {
        char.mixer.update(delta);
      }

      // 2. Animate fallback placeholder limbs if active
      if (char.isPlaceholder && char.model && char.model.userData) {
        char.walkAnimTime += delta * 6;
        if (char.isMoving) {
          const anim = Math.sin(char.walkAnimTime);
          if (char.model.userData.leftLeg) char.model.userData.leftLeg.rotation.x = anim * 0.45;
          if (char.model.userData.rightLeg) char.model.userData.rightLeg.rotation.x = -anim * 0.45;
          if (char.model.userData.leftArm) char.model.userData.leftArm.rotation.x = -anim * 0.35;
          if (char.model.userData.rightArm) char.model.userData.rightArm.rotation.x = anim * 0.35;
        } else {
          if (char.model.userData.leftLeg) char.model.userData.leftLeg.rotation.x = 0;
          if (char.model.userData.rightLeg) char.model.userData.rightLeg.rotation.x = 0;
          if (char.model.userData.leftArm) char.model.userData.leftArm.rotation.x = 0;
          if (char.model.userData.rightArm) char.model.userData.rightArm.rotation.x = 0;
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

          // Smoothly rotate towards heading
          const targetHeading = Math.atan2(dir.x, dir.z);
          let diff = targetHeading - char.model.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          char.model.rotation.y += diff * Math.min(1.0, delta * 9);
        }
      }
    }
  }

  /**
   * Procedural Fallback Placeholder (Used while models finish downloading)
   */
  createFallbackPlaceholder(options = {}) {
    const group = new THREE.Group();
    const isClerk = options.role === 'clerk' || options.role === 'teller';
    const isGuard = options.role === 'guard';
    const isFemale = options.role === 'female' || options.role === 'vip_female';

    const clothesColor = isGuard ? 0x1e3a8a : (isClerk ? 0x0f172a : (isFemale ? 0xd97706 : 0x0284c7));
    const matSuit = new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.5 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xf6d7b0, roughness: 0.6 });
    const matPants = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), matSkin);
    head.position.y = 1.52;
    head.castShadow = true;
    group.add(head);

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 12), matSuit);
    torso.position.y = 1.08;
    torso.castShadow = true;
    group.add(torso);

    // Arms
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), matSuit);
    leftArm.position.set(-0.24, 1.05, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), matSuit);
    rightArm.position.set(0.24, 1.05, 0);
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
