import * as THREE from 'three';
import { CharacterManager } from './CharacterManager.js';

/**
 * DioramaScene - Cinematic 3D Bank Vault Diorama Background
 * Features:
 * - Procedural open steel vault with titanium bevels
 * - Stacks of glittering 24K gold bullion bars & cash bundles
 * - Realistic 3D Characters & Skeletal Animations via CharacterManager
 * - Warm cinematic spotlight & atmospheric particles
 * - Slow orbital camera sweep for a premium tycoon feel
 * - Pause/Resume rendering to conserve mobile battery & performance
 */
export class DioramaScene {
  constructor(containerElement) {
    this.container = containerElement || document.body;
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.animationFrameId = null;
    this.isRunning = false;
    this.isHighQuality = true;

    // Animation variables
    this.time = 0;
    this.clock = new THREE.Clock();
    this.charManager = null;
    this.patrolTimer = 0;
    this.guardChar = null;
    this.bankerChar = null;
    this.vipChar = null;
    this.orbitRadius = 7.5;
    this.orbitSpeed = 0.0035;
    this.dustParticles = null;
    this.vaultWheel = null;

    this.init();
  }

  init() {
    // 1. Create Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'diorama-canvas';
    this.canvas.className = 'diorama-canvas';
    this.canvas.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none;
    `;
    this.container.appendChild(this.canvas);

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b14);
    this.scene.fog = new THREE.FogExp2(0x070b14, 0.045);

    // 3. Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.camera.position.set(0, 2.5, 8.5);

    // 4. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.updateQuality();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 5. Build Content
    this.setupLighting();
    this.buildVaultStructure();
    this.buildGoldBullionStacks();
    this.buildCashStacks();
    this.buildDustParticles();

    // 6. Realistic 3D Characters via CharacterManager
    this.charManager = new CharacterManager(this.scene);
    this.spawnDioramaCharacters();
    this.charManager.initDefaultAssets().catch((err) => {
      console.warn('[DioramaScene] Asset load note:', err.message);
    });

    // 7. Resize Listener
    this.onResize = () => {
      if (!this.camera || !this.renderer) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };
    window.addEventListener('resize', this.onResize);

    this.start();
  }

  updateQuality() {
    if (!this.renderer) return;
    const maxRatio = this.isHighQuality ? Math.min(window.devicePixelRatio, 1.75) : 1;
    this.renderer.setPixelRatio(maxRatio);
  }

  setQuality(highQuality) {
    this.isHighQuality = highQuality;
    this.updateQuality();
  }

  setupLighting() {
    // Soft balanced ambient light so character clothes & skin look vibrant
    const ambient = new THREE.AmbientLight(0xffffff, 1.3);
    this.scene.add(ambient);

    // Directional key light with shadow for realistic character contours
    const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    dirLight.position.set(4, 9, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Warm golden directional spotlight aimed directly inside the vault
    const goldSpot = new THREE.SpotLight(0xfcd34d, 3.5, 20, Math.PI / 4, 0.5, 1.2);
    goldSpot.position.set(2, 6, 4);
    goldSpot.target.position.set(0, 0.8, 0);
    goldSpot.castShadow = true;
    this.scene.add(goldSpot);
    this.scene.add(goldSpot.target);

    // Cool cyan-blue rim light from the rear left
    const rimLight = new THREE.PointLight(0x38bdf8, 2.2, 15);
    rimLight.position.set(-5, 4, -2);
    this.scene.add(rimLight);

    // Deep emerald fill light from the right
    const emeraldLight = new THREE.PointLight(0x059669, 1.8, 12);
    emeraldLight.position.set(4, 1.5, 2);
    this.scene.add(emeraldLight);
  }

  spawnDioramaCharacters() {
    if (!this.charManager || !this.scene) return;

    // 1. Bank Vault Security Guard standing watch near entrance
    this.guardChar = this.charManager.spawnCharacter({
      role: 'guard',
      position: [2.0, 0, 0.8],
      rotationY: -Math.PI / 3,
      defaultAnimation: 'idle'
    });

    // 2. Bank Executive examining vault assets
    this.bankerChar = this.charManager.spawnCharacter({
      role: 'banker',
      position: [-1.6, 0, 1.2],
      rotationY: Math.PI / 3,
      defaultAnimation: 'idle'
    });

    // 3. VIP Wealth Client admiring gold bullion
    this.vipChar = this.charManager.spawnCharacter({
      role: 'female',
      position: [0.2, 0, 2.6],
      rotationY: 0,
      defaultAnimation: 'idle'
    });
  }

  buildVaultStructure() {
    const vaultGroup = new THREE.Group();

    // Shared Materials
    const matSteel = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25
    });

    const matDarkSteel = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.35
    });

    const matGoldTrim = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    });

    const matFloorMarble = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.3,
      roughness: 0.2
    });

    // Vault Interior Floor
    const floorGeo = new THREE.BoxGeometry(16, 0.4, 16);
    const floor = new THREE.Mesh(floorGeo, matFloorMarble);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    vaultGroup.add(floor);

    // Vault Rear Wall (inside)
    const backWallGeo = new THREE.BoxGeometry(6, 4.5, 0.5);
    const backWall = new THREE.Mesh(backWallGeo, matDarkSteel);
    backWall.position.set(0, 2.25, -2.5);
    backWall.receiveShadow = true;
    vaultGroup.add(backWall);

    // Safe Deposit Boxes Grid on Back Wall
    const boxGeo = new THREE.BoxGeometry(0.55, 0.35, 0.1);
    const matBox = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.75,
      roughness: 0.3
    });
    for (let row = 0; row < 5; row++) {
      for (let col = -3; col <= 3; col++) {
        const box = new THREE.Mesh(boxGeo, matBox);
        box.position.set(col * 0.65, 1.0 + row * 0.45, -2.2);
        vaultGroup.add(box);

        // Tiny gold keyhole
        const keyGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.02, 6);
        keyGeo.rotateX(Math.PI / 2);
        const key = new THREE.Mesh(keyGeo, matGoldTrim);
        key.position.set(col * 0.65, 1.0 + row * 0.45, -2.14);
        vaultGroup.add(key);
      }
    }

    // Vault Heavy Outer Circular Frame
    const outerRingGeo = new THREE.TorusGeometry(2.6, 0.3, 16, 48);
    const outerRing = new THREE.Mesh(outerRingGeo, matSteel);
    outerRing.position.set(0, 2.4, 0);
    outerRing.castShadow = true;
    vaultGroup.add(outerRing);

    // Decorative Gold Rivets around Outer Ring
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const rivetGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const rivet = new THREE.Mesh(rivetGeo, matGoldTrim);
      rivet.position.set(
        Math.cos(angle) * 2.6,
        2.4 + Math.sin(angle) * 2.6,
        0.28
      );
      vaultGroup.add(rivet);
    }

    // Vault Heavy Round Door (Angled Open at 65 degrees to reveal interior treasures)
    const doorHingePivot = new THREE.Group();
    doorHingePivot.position.set(-2.5, 2.4, 0); // Hinge on the left

    const doorMeshGroup = new THREE.Group();
    const mainDoorGeo = new THREE.CylinderGeometry(2.3, 2.3, 0.45, 36);
    mainDoorGeo.rotateX(Math.PI / 2);
    const mainDoor = new THREE.Mesh(mainDoorGeo, matSteel);
    mainDoor.castShadow = true;
    doorMeshGroup.add(mainDoor);

    // Door Gold Cogwheel / Mechanism
    const cogGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.5, 16);
    cogGeo.rotateX(Math.PI / 2);
    const cog = new THREE.Mesh(cogGeo, matGoldTrim);
    doorMeshGroup.add(cog);

    // Center Gold Wheel
    const wheelGroup = new THREE.Group();
    const wheelRimGeo = new THREE.TorusGeometry(0.8, 0.1, 12, 24);
    const wheelRim = new THREE.Mesh(wheelRimGeo, matGoldTrim);
    wheelGroup.add(wheelRim);

    for (let i = 0; i < 4; i++) {
      const spokeGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8);
      spokeGeo.rotateZ((i * Math.PI) / 4);
      const spoke = new THREE.Mesh(spokeGeo, matGoldTrim);
      wheelGroup.add(spoke);
    }
    wheelGroup.position.set(0, 0, 0.35);
    doorMeshGroup.add(wheelGroup);
    this.vaultWheel = wheelGroup;

    // Offset door from hinge and open it outward
    doorMeshGroup.position.set(2.4, 0, 0);
    doorHingePivot.add(doorMeshGroup);
    doorHingePivot.rotation.y = -Math.PI * 0.38; // 68 degrees swung open
    vaultGroup.add(doorHingePivot);

    this.scene.add(vaultGroup);
  }

  buildGoldBullionStacks() {
    const goldGroup = new THREE.Group();

    // High polish 24K Gold Bar Material
    const matGoldBar = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0x78350f,
      emissiveIntensity: 0.15,
      metalness: 0.95,
      roughness: 0.18
    });

    const barGeo = new THREE.BoxGeometry(0.65, 0.22, 0.32);

    // Pyramid 1 (Center-right inside vault)
    const basePositions = [
      // Level 0 (Base 3x3)
      [-0.7, 0, -0.7], [0, 0, -0.7], [0.7, 0, -0.7],
      [-0.7, 0, 0], [0, 0, 0], [0.7, 0, 0],
      [-0.7, 0, 0.7], [0, 0, 0.7], [0.7, 0, 0.7],
      // Level 1 (2x2)
      [-0.35, 0.24, -0.35], [0.35, 0.24, -0.35],
      [-0.35, 0.24, 0.35], [0.35, 0.24, 0.35],
      // Level 2 (Top 1)
      [0, 0.48, 0]
    ];

    basePositions.forEach(([x, y, z]) => {
      const bar = new THREE.Mesh(barGeo, matGoldBar);
      bar.position.set(x + 0.6, y + 0.11, z - 0.8);
      bar.rotation.y = (Math.random() - 0.5) * 0.08;
      bar.castShadow = true;
      bar.receiveShadow = true;
      goldGroup.add(bar);
    });

    // Secondary smaller gold pile on the left
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(barGeo, matGoldBar);
      bar.position.set(-1.1 + (i % 2) * 0.7, Math.floor(i / 2) * 0.23 + 0.11, -0.5);
      bar.rotation.y = 0.2 + (Math.random() - 0.5) * 0.1;
      bar.castShadow = true;
      goldGroup.add(bar);
    }

    this.scene.add(goldGroup);
  }

  buildCashStacks() {
    const cashGroup = new THREE.Group();

    // Egyptian Banknote Bundles (Emerald-tinted money straps)
    const matCash = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.7,
      metalness: 0.1
    });

    const matStrap = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.5,
      metalness: 0.1
    });

    const cashGeo = new THREE.BoxGeometry(0.7, 0.25, 0.4);
    const strapGeo = new THREE.BoxGeometry(0.12, 0.26, 0.41);

    for (let i = 0; i < 8; i++) {
      const bundle = new THREE.Group();
      const cash = new THREE.Mesh(cashGeo, matCash);
      cash.castShadow = true;
      const strap = new THREE.Mesh(strapGeo, matStrap);
      bundle.add(cash, strap);

      bundle.position.set(
        -0.8 + (i % 2) * 0.75,
        Math.floor(i / 2) * 0.26 + 0.13,
        0.5 + (Math.random() - 0.5) * 0.2
      );
      bundle.rotation.y = (i * 0.2) + (Math.random() - 0.5) * 0.1;
      cashGroup.add(bundle);
    }

    this.scene.add(cashGroup);
  }

  buildDustParticles() {
    const particleCount = 75;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 10;
      positions[i + 1] = Math.random() * 5;
      positions[i + 2] = (Math.random() - 0.5) * 10;
      scales[i / 3] = Math.random() * 0.08 + 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xfcd34d,
      size: 0.08,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  pause() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.animate();
    }
  }

  animate() {
    if (!this.isRunning) return;

    const delta = Math.min(0.1, this.clock.getDelta());
    this.time += delta;

    // Update Characters & Animations
    if (this.charManager) {
      this.charManager.update(delta);

      // Gentle periodic stroll for VIP character
      this.patrolTimer = (this.patrolTimer || 0) + delta;
      if (this.patrolTimer > 10 && this.vipChar && !this.vipChar.isMoving) {
        this.patrolTimer = 0;
        const targets = [
          [0.8, 2.2],
          [-0.8, 2.4],
          [0.2, 2.6]
        ];
        const next = targets[Math.floor(Math.random() * targets.length)];
        this.charManager.moveTo(this.vipChar, next[0], next[1]);
      }
    }

    // 1. Smooth Camera Orbit & Gentle Breathing Bob
    const camAngle = Math.sin(this.time * 0.25) * 0.35 + 0.1;
    const camHeight = 2.4 + Math.cos(this.time * 0.3) * 0.25;
    const camDist = 7.8 + Math.sin(this.time * 0.15) * 0.4;

    this.camera.position.x = Math.sin(camAngle) * camDist;
    this.camera.position.z = Math.cos(camAngle) * camDist;
    this.camera.position.y = camHeight;
    this.camera.lookAt(0, 1.8, 0);

    // 2. Slow Vault Door Wheel Idle Spin
    if (this.vaultWheel) {
      this.vaultWheel.rotation.z += 0.008;
    }

    // 3. Floating Dust Particles
    if (this.dustParticles) {
      const positions = this.dustParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 0.003;
        if (positions[i] < 0) positions[i] = 4.8;
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Render
    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    this.pause();
    if (this.charManager) {
      this.charManager.clear();
      this.charManager = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
    }
    if (this.scene) {
      this.scene.traverse((object) => {
        if (!object) return;
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => {
              if (mat) {
                for (const key in mat) {
                  if (mat[key] && mat[key].isTexture) {
                    mat[key].dispose();
                  }
                }
                mat.dispose();
              }
            });
          } else {
            for (const key in object.material) {
              if (object.material[key] && object.material[key].isTexture) {
                object.material[key].dispose();
              }
            }
            object.material.dispose();
          }
        }
      });
      this.scene.clear();
      this.scene = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (typeof this.renderer.forceContextLoss === 'function') {
        this.renderer.forceContextLoss();
      }
      this.renderer.domElement = null;
      this.renderer = null;
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null;
    }
  }
}
