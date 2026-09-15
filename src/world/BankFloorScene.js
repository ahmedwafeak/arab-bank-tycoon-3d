import * as THREE from 'three';
import { CharacterManager } from './CharacterManager.js';
import { PlayerController } from './PlayerController.js';
import { InteractableDesk } from './InteractableDesk.js';
import { ThirdPersonPlayerController } from './ThirdPersonPlayerController.js';
import { CinematicDialogueSystem } from './CinematicDialogueSystem.js';

/**
 * BankFloorScene - Interactive 3D Isometric, First-Person & Third-Person Bank Floor Engine (Three.js)
 * Arcade Idle & Narrative Simulation style featuring:
 * - Direct Third-Person 3D Character control (Career Mode)
 * - Dual-Perspective (Isometric Overview + First-Person Explorer)
 * - Workstation Mode (Sitting at Teller Desk, inspecting dossiers, physical stamps)
 * - Interactive 3D NPCs with cinematic over-the-shoulder dialogue
 * - 3 Teller stations with animated clerks and cash counters
 * - Main Vault with cash stacks scaling dynamically with treasury cash
 * - Dual ATM machines with collectable fees
 * - Waiting lounge with seating and ticket kiosk
 * - Autonomous Low-Poly Customer NPCs with states
 * - Interactive raycaster for clicking on tellers, ATMs, and customers
 */
export class BankFloorScene {
  constructor(containerElement, gameState, audio, callbacks = {}) {
    this.container = containerElement;
    this.state = gameState;
    this.audio = audio;
    this.callbacks = callbacks; // { onTellerClick, onATMClick, onCustomerClick, onVaultClick }

    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null; // Isometric Orthographic Camera
    this.fpCamera = null; // Perspective Camera (used for FP and Third-Person follow)
    this.currentPerspective = 'isometric'; // 'isometric' | 'first_person' | 'third_person'
    this.playerController = null;
    this.tpController = null;
    this.dialogueSystem = null;
    this.careerPlayerChar = null;
    this.storyNPCs = {};
    this.isCareerMode = false;
    this.executiveDeskMesh = null;
    this.waterCoolerMesh = null;
    this.workstationDesk = null;
    this.collisionBoxes = [];

    this.animationFrameId = null;
    this.isRunning = false;
    this.clock = new THREE.Clock();
    this.charManager = null;

    // Floor Stations & Props
    this.tellers = [];
    this.atms = [];
    this.waitingSeats = [];
    this.ticketKiosk = null;
    this.vaultMesh = null;
    this.cashStacksGroup = null;
    this.particles = [];

    // NPCs
    this.customers = [];
    this.securityGuard = null;
    this.nextCustomerSpawnTime = 0;
    this.maxCustomers = 8;
    this.customerCounterId = 1;

    // Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredObject = null;

    this.init();
  }

  init() {
    // 1. Create Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'bank-floor-canvas';
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      cursor: default;
    `;
    this.container.appendChild(this.canvas);

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

    // 3. Dual Camera Setup (Isometric Orthographic + First-Person Perspective)
    const aspect = this.container.clientWidth / Math.max(1, this.container.clientHeight);
    const d = 8.5;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100);
    this.camera.position.set(12, 14, 12);
    this.camera.lookAt(0, 0.5, 0);

    // Perspective Camera for First-Person exploration
    this.fpCamera = new THREE.PerspectiveCamera(65, aspect, 0.1, 100);
    this.fpCamera.position.set(0, 1.68, 4.2);

    // 4. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 5. Build Environment
    this.setupLighting();
    this.buildFloorAndWalls();
    this.buildTellerCounters();
    this.buildWaitingLounge();
    this.buildTicketKiosk();
    this.buildATMZone();
    this.buildVaultRoom();
    this.buildExecutiveOffice();
    this.buildBreakCorner();

    // 6. Character Manager (Realistic 3D Models & Animations)
    this.charManager = new CharacterManager(this.scene);
    this.spawnStaff();
    this.spawnStoryNPCs();
    this.charManager.initDefaultAssets().catch((err) => {
      console.warn('[BankFloorScene] Asset load note:', err.message);
    });

    // 7. Collision Detection & Player Controller (First/Third-Person)
    this.buildCollisionBoxes();
    this.playerController = new PlayerController(this.fpCamera, this.canvas, this.scene, {
      collisionBoxes: this.collisionBoxes,
      audio: this.audio,
      keycardLevel: this.state?.careerManager?.currentStage?.id || 1
    });

    // 8. Physical Interactive Workstation Desk (Teller #1)
    this.workstationDesk = new InteractableDesk(this.scene, {
      position: new THREE.Vector3(-2.6, 0, -2.5),
      rotationY: 0,
      deskName: 'شباك الصراف #1 (مكتبك الميداني)',
      keycardLevel: 1,
      gameState: this.state,
      careerManager: this.state?.careerManager,
      audio: this.audio
    });

    // 9. Event Listeners
    this.setupInteractions();

    this.onResize = () => {
      if (!this.container || !this.renderer) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      const asp = width / Math.max(1, height);

      if (this.camera) {
        this.camera.left = -d * asp;
        this.camera.right = d * asp;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();
      }

      if (this.fpCamera) {
        this.fpCamera.aspect = asp;
        this.fpCamera.updateProjectionMatrix();
      }

      this.renderer.setSize(width, height);
    };
    window.addEventListener('resize', this.onResize);

    this.start();
  }

  /**
   * Build boundary & furniture collision bounding boxes
   */
  buildCollisionBoxes() {
    this.collisionBoxes = [
      // Back Wall
      new THREE.Box3(new THREE.Vector3(-7.2, 0, -7.5), new THREE.Vector3(7.2, 4, -6.6)),
      // Left Wall
      new THREE.Box3(new THREE.Vector3(-7.5, 0, -7.2), new THREE.Vector3(-6.6, 4, 7.2)),
      // Right Wall Boundary
      new THREE.Box3(new THREE.Vector3(6.8, 0, -7.2), new THREE.Vector3(7.5, 4, 7.2)),
      // Front Boundary
      new THREE.Box3(new THREE.Vector3(-7.2, 0, 6.8), new THREE.Vector3(7.2, 4, 7.5)),
      // Vault Room
      new THREE.Box3(new THREE.Vector3(3.0, 0, -7.0), new THREE.Vector3(7.0, 4, -3.2)),
      // Teller Counters
      new THREE.Box3(new THREE.Vector3(-3.8, 0, -3.8), new THREE.Vector3(3.8, 1.6, -2.6)),
      // Waiting Lounge Chairs
      new THREE.Box3(new THREE.Vector3(-3.8, 0, 1.1), new THREE.Vector3(1.6, 1.2, 2.1)),
      // Ticket Dispenser Kiosk
      new THREE.Box3(new THREE.Vector3(-4.9, 0, 3.8), new THREE.Vector3(-4.0, 1.6, 4.7)),
      // ATM Units
      new THREE.Box3(new THREE.Vector3(4.0, 0, 0.2), new THREE.Vector3(5.8, 2.0, 4.4)),
      // Executive Manager Desk (Farouk)
      new THREE.Box3(new THREE.Vector3(3.2, 0, -3.1), new THREE.Vector3(5.2, 1.6, -2.1)),
      // Water Cooler Dispenser (Mahmoud)
      new THREE.Box3(new THREE.Vector3(-4.1, 0, 1.5), new THREE.Vector3(-3.5, 1.6, 2.1))
    ];
  }

  /**
   * Toggle between Isometric, First-Person, and Third-Person Player Mode
   */
  togglePerspectiveMode(forcedMode = null) {
    let nextMode = forcedMode;
    if (!nextMode) {
      if (this.isCareerMode) {
        nextMode = this.currentPerspective === 'third_person' ? 'isometric' : 'third_person';
      } else {
        nextMode = this.currentPerspective === 'isometric' ? 'first_person' : 'isometric';
      }
    }
    this.currentPerspective = nextMode;

    if (this.currentPerspective === 'first_person') {
      this.canvas.style.cursor = 'none';
      if (this.playerController) {
        this.playerController.lock();
      }
      return 'first_person';
    } else if (this.currentPerspective === 'third_person') {
      this.canvas.style.cursor = 'default';
      if (this.playerController) {
        this.playerController.unlock();
      }
      if (this.tpController) {
        this.tpController.updateCameraPosition(true);
      }
      return 'third_person';
    } else {
      this.canvas.style.cursor = 'default';
      if (this.playerController) {
        this.playerController.unlock();
      }
      return 'isometric';
    }
  }

  setupLighting() {
    // Soft Ambient Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);

    // Warm Sun Spotlight from front-right with soft shadow
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    sunLight.position.set(10, 16, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    const shadowD = 12;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Cool blue-cyan fill light from back-left
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    fillLight.position.set(-10, 10, -8);
    this.scene.add(fillLight);
  }

  buildFloorAndWalls() {
    // 1. High-End Polished Marble / Porcelain Floor (14 x 14)
    const floorGeo = new THREE.BoxGeometry(14, 0.4, 14);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep polished navy-charcoal porcelain
      roughness: 0.22,
      metalness: 0.12
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Decorative inner executive carpet pattern
    const carpetGeo = new THREE.PlaneGeometry(10, 8);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x090e1a, // Rich royal navy velvet weave
      roughness: 0.65
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.01, 1);
    carpet.receiveShadow = true;
    this.scene.add(carpet);

    // Brushed gold brass border inlays
    const borderGeo = new THREE.RingGeometry(4.8, 5.0, 4);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.18, metalness: 0.88 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = -Math.PI / 2;
    border.rotation.z = Math.PI / 4;
    border.position.set(0, 0.02, 1);
    this.scene.add(border);

    // Secondary perimeter brass line
    const outerBorder = new THREE.Mesh(
      new THREE.RingGeometry(5.2, 5.25, 4),
      borderMat
    );
    outerBorder.rotation.x = -Math.PI / 2;
    outerBorder.rotation.z = Math.PI / 4;
    outerBorder.position.set(0, 0.02, 1);
    this.scene.add(outerBorder);

    // 2. Luxury Architectural Walls (Back & Left Cutaway)
    const wallNavyMat = new THREE.MeshStandardMaterial({ color: 0x131d2e, roughness: 0.55 });
    const walnutMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1b, roughness: 0.32, metalness: 0.1 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.18 });

    // Back wall (Z = -7)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(14, 3.4, 0.4), wallNavyMat);
    backWall.position.set(0, 1.7, -7);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall (X = -7)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 14), wallNavyMat);
    leftWall.position.set(-7, 1.7, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Top Architectural Cornice Molding with Gold Lip
    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.16, 0.45), walnutMat);
    trimBack.position.set(0, 3.32, -7);
    this.scene.add(trimBack);

    const goldLipBack = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.03, 0.48), brassMat);
    goldLipBack.position.set(0, 3.22, -7);
    this.scene.add(goldLipBack);

    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 14.2), walnutMat);
    trimLeft.position.set(-7, 3.32, 0);
    this.scene.add(trimLeft);

    const goldLipLeft = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 14.2), brassMat);
    goldLipLeft.position.set(-7, 3.22, 0);
    this.scene.add(goldLipLeft);

    // 3. Vertical Acoustic Walnut Slats Feature Wall (Behind Tellers)
    const slatsBacking = new THREE.Mesh(
      new THREE.BoxGeometry(9.4, 2.7, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x080c14, roughness: 0.9 })
    );
    slatsBacking.position.set(0, 1.5, -6.78);
    this.scene.add(slatsBacking);

    const slatGeo = new THREE.BoxGeometry(0.065, 2.65, 0.04);
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x54321d, roughness: 0.35, metalness: 0.08 });
    const slatCount = 58;
    const slatSpacing = 0.155;
    const slatStartX = -((slatCount - 1) * slatSpacing) / 2;

    for (let s = 0; s < slatCount; s++) {
      const slatMesh = new THREE.Mesh(slatGeo, slatMat);
      slatMesh.position.set(slatStartX + s * slatSpacing, 1.5, -6.75);
      slatMesh.receiveShadow = true;
      slatMesh.castShadow = true;
      this.scene.add(slatMesh);
    }

    // 4. Digital Financial Ticker Display Boards (Wall-Mounted FX Panels)
    const createTickerBoard = (posX) => {
      const boardGroup = new THREE.Group();
      boardGroup.position.set(posX, 2.05, -6.74);

      // Bezel frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.75, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.85, roughness: 0.2 })
      );
      boardGroup.add(frame);

      // Gold border trim
      const goldRim = new THREE.Mesh(
        new THREE.BoxGeometry(1.53, 0.78, 0.02),
        brassMat
      );
      goldRim.position.z = -0.01;
      boardGroup.add(goldRim);

      // Digital display screen
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.42, 0.67),
        new THREE.MeshBasicMaterial({ color: 0x0c1424 })
      );
      screen.position.z = 0.022;
      boardGroup.add(screen);

      // Glowing simulated ticker bars
      const barMat1 = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const barMat2 = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      for (let b = 0; b < 3; b++) {
        const bar = new THREE.Mesh(
          new THREE.PlaneGeometry(1.25, 0.08),
          b % 2 === 0 ? barMat1 : barMat2
        );
        bar.position.set(0, 0.18 - b * 0.18, 0.024);
        boardGroup.add(bar);
      }

      this.scene.add(boardGroup);
    };
    createTickerBoard(-3.8);
    createTickerBoard(3.8);

    // 5. Up/Down Modern Brushed Brass Wall Sconces
    const sconcePositions = [-5.4, -2.0, 2.0, 5.4];
    sconcePositions.forEach((sx) => {
      const sconceGroup = new THREE.Group();
      sconceGroup.position.set(sx, 2.15, -6.74);

      const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.22, 16),
        brassMat
      );
      cylinder.castShadow = true;
      sconceGroup.add(cylinder);

      // Gold wall mounting backplate
      const backPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.14, 0.03),
        brassMat
      );
      backPlate.position.z = -0.025;
      sconceGroup.add(backPlate);

      // Subtle warm accent point light
      const sLight = new THREE.PointLight(0xffecd1, 0.45, 3.2);
      sLight.position.set(0, 0, 0.08);
      sconceGroup.add(sLight);

      this.scene.add(sconceGroup);
    });

    // 6. Bank Logo Emblem on Back Wall
    const emblemGroup = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.09, 32);
    const disk = new THREE.Mesh(diskGeo, brassMat);
    disk.rotation.x = Math.PI / 2;
    disk.castShadow = true;
    emblemGroup.add(disk);

    // Luminous halo outer accent ring
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.96, 0.025, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    halo.position.z = 0.02;
    emblemGroup.add(halo);

    // 3D Geometric Pyramid & Pillar crest
    const pyraGeo = new THREE.ConeGeometry(0.48, 0.62, 4);
    const pyraMat = new THREE.MeshStandardMaterial({ color: 0x0a101d, metalness: 0.3, roughness: 0.4 });
    const pyra = new THREE.Mesh(pyraGeo, pyraMat);
    pyra.position.set(0, 0, 0.06);
    pyra.rotation.x = Math.PI / 2;
    emblemGroup.add(pyra);

    emblemGroup.position.set(0, 2.15, -6.73);
    this.scene.add(emblemGroup);

    // 7. Left Wall Decor: Lower Walnut Wainscoting & VIP Abstract Art
    const wainscotLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.15, 14),
      walnutMat
    );
    wainscotLeft.position.set(-6.78, 0.575, 0);
    this.scene.add(wainscotLeft);

    const wainscotBead = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.035, 14),
      brassMat
    );
    wainscotBead.position.set(-6.77, 1.15, 0);
    this.scene.add(wainscotBead);

    // Large Gallery Framed Modern Art on Left Wall
    const createArtPiece = (posZ) => {
      const artGroup = new THREE.Group();
      artGroup.position.set(-6.76, 2.0, posZ);

      // Gold picture frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 1.25, 1.7),
        brassMat
      );
      frame.castShadow = true;
      artGroup.add(frame);

      // Abstract canvas (Royal Navy, Gold, Emerald gradient)
      const canvas = new THREE.Mesh(
        new THREE.PlaneGeometry(1.58, 1.13),
        new THREE.MeshStandardMaterial({
          color: posZ < 0 ? 0x0f2b3e : 0x0b2c24,
          roughness: 0.5,
          metalness: 0.25
        })
      );
      canvas.rotation.y = Math.PI / 2;
      canvas.position.x = 0.022;
      artGroup.add(canvas);

      // Picture light fixture above
      const picLight = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8),
        brassMat
      );
      picLight.rotation.z = Math.PI / 2;
      picLight.position.set(0.12, 0.72, 0);
      artGroup.add(picLight);

      this.scene.add(artGroup);
    };
    createArtPiece(-2.5);
    createArtPiece(2.5);

    // Potted indoor luxury plants
    this.createPottedPlant(-6.2, 0, -6.2);
    this.createPottedPlant(6.2, 0, -6.2);
    this.createPottedPlant(-6.2, 0, 4.5);
  }

  createPottedPlant(x, y, z) {
    const plant = new THREE.Group();
    // Modern Fluted Ceramic Pot with Gold Rim
    const potMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.22 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.18 });

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.6, 16), potMat);
    pot.position.y = 0.3;
    pot.castShadow = true;
    plant.add(pot);

    // Gold top and bottom rim
    const topRim = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 16), goldMat);
    topRim.position.y = 0.6;
    plant.add(topRim);

    const baseRim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 16), goldMat);
    baseRim.position.y = 0.015;
    plant.add(baseRim);

    // Tiered Realistic Foliage (Monstera / Ficus)
    const leafMatDark = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.6 });
    const leafMatBright = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.65 });

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x3d2516 }));
    stem.position.y = 0.7;
    plant.add(stem);

    const leaf1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42), leafMatDark);
    leaf1.position.y = 0.88;
    leaf1.castShadow = true;
    plant.add(leaf1);

    const leaf2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34), leafMatBright);
    leaf2.position.set(0.12, 1.15, -0.08);
    leaf2.castShadow = true;
    plant.add(leaf2);

    plant.position.set(x, y, z);
    this.scene.add(plant);
  }

  /**
   * Create realistic 3D ergonomic office swivel chair
   */
  createSwivelChair(options = {}) {
    const chair = new THREE.Group();
    const isExecutive = options.isExecutive || false;
    const seatColor = options.seatColor || (isExecutive ? 0x111827 : 0x1e293b);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95, roughness: 0.15 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
    const seatMat = new THREE.MeshStandardMaterial({ color: seatColor, roughness: 0.45, metalness: 0.08 });
    const meshBackMat = new THREE.MeshStandardMaterial({
      color: isExecutive ? 0x111827 : 0x090d16,
      roughness: 0.7
    });

    // 1. 5-Star Chrome Caster Base
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 16), metalMat);
    hub.position.y = 0.065;
    chair.add(hub);

    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const legArm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.24, 8), metalMat);
      legArm.rotation.z = Math.PI / 2;
      legArm.rotation.y = angle;
      legArm.position.set(Math.cos(angle) * 0.12, 0.055, Math.sin(angle) * 0.12);
      chair.add(legArm);

      // Caster wheel
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), darkMetal);
      wheel.position.set(Math.cos(angle) * 0.24, 0.022, Math.sin(angle) * 0.24);
      chair.add(wheel);
    }

    // 2. Gas Lift Piston & Mechanism
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.26, 12), metalMat);
    piston.position.y = 0.20;
    chair.add(piston);

    const mechBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), darkMetal);
    mechBox.position.y = 0.34;
    chair.add(mechBox);

    // 3. Ergonomic Contoured Seat Cushion (Top surface at y = 0.43m)
    const seatW = isExecutive ? 0.50 : 0.46;
    const seatD = isExecutive ? 0.46 : 0.42;
    const seatGeo = new THREE.BoxGeometry(seatW, 0.06, seatD);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.40, 0);
    seat.castShadow = true;
    chair.add(seat);

    // 4. Curved Ergonomic Backrest
    const backGroup = new THREE.Group();
    const backHeight = isExecutive ? 0.64 : 0.44;
    const backWidth = isExecutive ? 0.48 : 0.42;
    const backMesh = new THREE.Mesh(
      new THREE.BoxGeometry(backWidth, backHeight, 0.035),
      meshBackMat
    );
    backMesh.position.set(0, backHeight / 2, 0);
    backMesh.castShadow = true;
    backGroup.add(backMesh);

    // Spine support bar
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, backHeight * 0.9, 8), darkMetal);
    spine.position.set(0, backHeight * 0.48, -0.03);
    backGroup.add(spine);

    // Headrest for executive
    if (isExecutive) {
      const headrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.14, 0.05),
        seatMat
      );
      headrest.position.set(0, backHeight + 0.07, 0.02);
      backGroup.add(headrest);
    }

    backGroup.position.set(0, 0.42, -0.18);
    chair.add(backGroup);

    // 5. 3D Armrests
    const armX = isExecutive ? 0.26 : 0.24;
    const armGeo = new THREE.BoxGeometry(0.055, 0.025, 0.20);
    const armL = new THREE.Mesh(armGeo, darkMetal);
    armL.position.set(-armX, 0.56, -0.02);
    chair.add(armL);

    const armPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.17, 8), darkMetal);
    armPostL.position.set(-armX, 0.475, -0.02);
    chair.add(armPostL);

    const armR = new THREE.Mesh(armGeo, darkMetal);
    armR.position.set(armX, 0.56, -0.02);
    chair.add(armR);

    const armPostR = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.17, 8), darkMetal);
    armPostR.position.set(armX, 0.475, -0.02);
    chair.add(armPostR);

    if (options.position) {
      chair.position.copy(options.position);
    }
    if (options.rotationY !== undefined) {
      chair.rotation.y = options.rotationY;
    }

    return chair;
  }

  buildTellerCounters() {
    // 3 Teller counters positioned parallel to back wall
    const counterZ = -3.2;
    const startX = -2.6;
    const spacingX = 2.6;

    const flutedMat = new THREE.MeshStandardMaterial({ color: 0x482918, roughness: 0.35, metalness: 0.1 });
    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.16, metalness: 0.05 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.18 });

    for (let i = 0; i < 3; i++) {
      const posX = startX + i * spacingX;
      const counterGroup = new THREE.Group();

      // 1. Main Counter Base (with fluted vertical walnut paneling on front)
      const baseBody = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.95, 0.88),
        new THREE.MeshStandardMaterial({ color: 0x1f293d, roughness: 0.4 })
      );
      baseBody.position.y = 0.475;
      baseBody.castShadow = true;
      baseBody.receiveShadow = true;
      baseBody.userData = { interactiveType: 'teller', tellerIndex: i };
      counterGroup.add(baseBody);

      // Fluted walnut slats on front customer-facing side
      const slatWidth = 0.04;
      const slatDepth = 0.03;
      const slatH = 0.92;
      const numSlats = 24;
      for (let s = 0; s < numSlats; s++) {
        const slatMesh = new THREE.Mesh(
          new THREE.BoxGeometry(slatWidth, slatH, slatDepth),
          flutedMat
        );
        slatMesh.position.set(-0.95 + s * 0.082, 0.48, 0.45);
        slatMesh.castShadow = true;
        counterGroup.add(slatMesh);
      }

      // Recessed gold brass kickplate at the base
      const kickplate = new THREE.Mesh(
        new THREE.BoxGeometry(2.02, 0.06, 0.9),
        brassMat
      );
      kickplate.position.y = 0.03;
      counterGroup.add(kickplate);

      // 2. Calacatta Gold White Marble Countertop
      const topGeo = new THREE.BoxGeometry(2.1, 0.1, 0.98);
      const top = new THREE.Mesh(topGeo, marbleMat);
      top.position.y = 1.0;
      top.castShadow = true;
      top.receiveShadow = true;
      top.userData = { interactiveType: 'teller', tellerIndex: i };
      counterGroup.add(top);

      // Brass Bullnose Edge Trim around Marble Top
      const topTrim = new THREE.Mesh(
        new THREE.BoxGeometry(2.12, 0.04, 1.0),
        brassMat
      );
      topTrim.position.y = 0.97;
      counterGroup.add(topTrim);

      // Customer Transaction Shelf (Raised writing ledge)
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.05, 0.22),
        brassMat
      );
      shelf.position.set(0, 1.07, 0.38);
      counterGroup.add(shelf);

      // 3. Ultra-Clear Tempered Security Glass Partition
      const glassGeo = new THREE.BoxGeometry(1.9, 0.72, 0.04);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.28,
        roughness: 0.06,
        transmission: 0.92
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, 1.46, 0.24);
      counterGroup.add(glass);

      // Circular Acoustic Speak-Port in Glass Center
      const speakPort = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.012, 8, 24),
        brassMat
      );
      speakPort.position.set(0, 1.35, 0.24);
      counterGroup.add(speakPort);

      // Brass glass mounting clamps
      [-0.85, 0.85].forEach((gx) => {
        const clamp = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.12, 0.08),
          brassMat
        );
        clamp.position.set(gx, 1.12, 0.24);
        counterGroup.add(clamp);
      });

      // 4. Staff Workstation Pedestal & Equipment
      // Dual-drawer under-counter pedestal
      const pedestal = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.65, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
      );
      pedestal.position.set(-0.68, 0.35, -0.12);
      counterGroup.add(pedestal);

      // Silver drawer bar handles
      [0.22, 0.48].forEach((hy) => {
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.02, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 })
        );
        handle.position.set(-0.68, hy, -0.4);
        counterGroup.add(handle);
      });

      // Leather desk blotter on clerk side
      const blotter = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.015, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 })
      );
      blotter.position.set(0.05, 1.055, -0.15);
      counterGroup.add(blotter);

      // Computer Monitor & Keyboard
      const monitor = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.32, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3 })
      );
      monitor.position.set(0.42, 1.26, -0.12);
      monitor.rotation.y = -Math.PI / 9;
      counterGroup.add(monitor);

      const monitorDisplay = new THREE.Mesh(
        new THREE.PlaneGeometry(0.41, 0.28),
        new THREE.MeshBasicMaterial({ color: 0x0ea5e9 })
      );
      monitorDisplay.position.set(0.42, 1.26, -0.098);
      monitorDisplay.rotation.y = -Math.PI / 9;
      counterGroup.add(monitorDisplay);

      // Currency Counting Machine
      const billCounter = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.24, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 })
      );
      billCounter.position.set(-0.48, 1.2, -0.1);
      counterGroup.add(billCounter);

      // Teller Number Sign (Backlit Gold Plate)
      const signGroup = new THREE.Group();
      signGroup.position.set(0, 1.88, 0.24);

      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.22, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.8, roughness: 0.2 })
      );
      signGroup.add(signBoard);

      const signFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.24, 0.04),
        brassMat
      );
      signFrame.position.z = -0.01;
      signGroup.add(signFrame);

      const signText = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      signText.position.z = 0.028;
      signGroup.add(signText);
      counterGroup.add(signGroup);

      // 5. Ergonomic Swivel Chair behind each Teller
      const chair = this.createSwivelChair({
        position: new THREE.Vector3(0, 0, -0.75),
        rotationY: 0,
        seatColor: i === 1 ? 0x1e3a8a : 0x1e293b
      });
      counterGroup.add(chair);

      counterGroup.position.set(posX, 0, counterZ);
      this.scene.add(counterGroup);

      // Save teller station data
      this.tellers.push({
        index: i,
        group: counterGroup,
        deskPosition: new THREE.Vector3(posX, 0, counterZ),
        queueSlotPosition: new THREE.Vector3(posX, 0, counterZ + 1.4),
        clerkPosition: new THREE.Vector3(posX, 0, counterZ - 0.75),
        isBusy: false,
        currentCustomer: null,
        level: 1,
        speedMultiplier: 1.0,
        clerkMesh: null
      });
    }
  }

  buildWaitingLounge() {
    // Luxury Modern Tandem Beam Seating (Seats 1 to 4) in Warm Cognac Leather
    const loungeZ = 1.6;
    const startX = -3.2;
    const chairSpacing = 1.2;

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95, roughness: 0.15 });
    const cognacLeather = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // Rich warm cognac leather
      roughness: 0.44,
      metalness: 0.08
    });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.18 });

    // Continuous Chrome Support Beam under the tandem seats
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 4.4, 16),
      chromeMat
    );
    beam.rotation.z = Math.PI / 2;
    beam.position.set(-1.4, 0.28, loungeZ);
    this.scene.add(beam);

    // Arch support legs for beam
    [-2.8, 0.0].forEach((lx) => {
      const archLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.28, 0.55),
        chromeMat
      );
      archLeg.position.set(lx, 0.14, loungeZ);
      this.scene.add(archLeg);
    });

    for (let i = 0; i < 4; i++) {
      const chairGroup = new THREE.Group();
      const posX = startX + i * chairSpacing;

      // Contoured Cognac Leather Seat Cushion with rounded waterfall front
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.12, 0.64),
        cognacLeather
      );
      seat.position.y = 0.44;
      seat.castShadow = true;
      chairGroup.add(seat);

      // Ergonomic Backrest with lumbar contour
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.58, 0.11),
        cognacLeather
      );
      back.position.set(0, 0.74, -0.28);
      back.rotation.x = -0.06;
      back.castShadow = true;
      chairGroup.add(back);

      // Padded Armrests between seats & ends
      [-0.36, 0.36].forEach((ax) => {
        const armPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.24, 8),
          chromeMat
        );
        armPost.position.set(ax, 0.54, 0);
        chairGroup.add(armPost);

        const armPad = new THREE.Mesh(
          new THREE.BoxGeometry(0.065, 0.035, 0.38),
          cognacLeather
        );
        armPad.position.set(ax, 0.66, 0);
        chairGroup.add(armPad);
      });

      chairGroup.position.set(posX, 0, loungeZ);
      chairGroup.rotation.y = Math.PI; // Facing towards entrance
      this.scene.add(chairGroup);

      this.waitingSeats.push({
        index: i,
        position: new THREE.Vector3(posX, 0, loungeZ),
        isOccupied: false,
        customer: null
      });
    }

    // Modern Luxury Coffee Table (Italian Calacatta White Marble Top & Brass Frame)
    const tableGroup = new THREE.Group();
    tableGroup.position.set(2.2, 0, loungeZ);

    // Marble Top
    const marbleTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.06, 0.65),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.16, metalness: 0.05 })
    );
    marbleTop.position.y = 0.38;
    marbleTop.castShadow = true;
    tableGroup.add(marbleTop);

    // Brass geometric frame & legs
    const frameGeo = new THREE.BoxGeometry(0.03, 0.36, 0.03);
    const legCoords = [
      [-0.58, 0.18, -0.28],
      [0.58, 0.18, -0.28],
      [-0.58, 0.18, 0.28],
      [0.58, 0.18, 0.28]
    ];
    legCoords.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(frameGeo, brassMat);
      leg.position.set(lx, ly, lz);
      tableGroup.add(leg);
    });

    // Lower Brass Stretcher Rail
    const railX = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.02, 0.02), brassMat);
    railX.position.y = 0.08;
    tableGroup.add(railX);

    // Tabletop accessories: Financial Journals & Magazines
    const mag1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.02, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })
    );
    mag1.position.set(-0.25, 0.42, 0.05);
    mag1.rotation.y = 0.15;
    tableGroup.add(mag1);

    const mag2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.02, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4 })
    );
    mag2.position.set(-0.22, 0.44, 0.08);
    mag2.rotation.y = -0.1;
    tableGroup.add(mag2);

    // Minimalist Geometric Brass Vase & Mini Plant
    const miniVase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.14, 8),
      brassMat
    );
    miniVase.position.set(0.3, 0.46, 0);
    tableGroup.add(miniVase);

    const miniSucculent = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.07),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6 })
    );
    miniSucculent.position.set(0.3, 0.56, 0);
    tableGroup.add(miniSucculent);

    this.scene.add(tableGroup);
  }

  buildTicketKiosk() {
    // Ticket Machine Kiosk near entrance door
    const kioskGroup = new THREE.Group();

    // Stand
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.3, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
    );
    body.position.y = 0.65;
    body.castShadow = true;
    kioskGroup.add(body);

    // Touchscreen
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 }) // Glowing cyan
    );
    screen.position.set(0, 0.95, 0.23);
    screen.rotation.x = -Math.PI / 12;
    kioskGroup.add(screen);

    // Ticket output slot
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.04, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    slot.position.set(0, 0.7, 0.23);
    kioskGroup.add(slot);

    kioskGroup.position.set(-4.5, 0, 4.2);
    kioskGroup.rotation.y = Math.PI / 4;
    kioskGroup.userData = { interactiveType: 'kiosk' };
    this.scene.add(kioskGroup);

    this.ticketKiosk = {
      group: kioskGroup,
      servicePosition: new THREE.Vector3(-4.0, 0, 4.6)
    };
  }

  buildATMZone() {
    // 2 ATMs embedded along the right wall (X = 5.8)
    const startZ = 2.0;
    const atmSpacing = 2.0;

    for (let i = 0; i < 2; i++) {
      const posZ = startZ + i * atmSpacing;
      const atmGroup = new THREE.Group();

      // Main ATM Chassis
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.9, 0.75),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.3 }) // Nile Blue
      );
      chassis.position.y = 0.95;
      chassis.castShadow = true;
      chassis.userData = { interactiveType: 'atm', atmIndex: i };
      atmGroup.add(chassis);

      // Screen
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.38),
        new THREE.MeshBasicMaterial({ color: 0x10b981 }) // Emerald glowing screen
      );
      screen.position.set(-0.38, 1.25, 0);
      screen.rotation.y = -Math.PI / 2;
      atmGroup.add(screen);

      // Keypad
      const keypad = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.05, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8 })
      );
      keypad.position.set(-0.35, 0.95, 0);
      atmGroup.add(keypad);

      // Top Header (Meeza / Nile ATM logo)
      const topSign = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.25, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 })
      );
      topSign.position.y = 1.95;
      atmGroup.add(topSign);

      atmGroup.position.set(5.8, 0, posZ);
      atmGroup.rotation.y = 0;
      this.scene.add(atmGroup);

      this.atms.push({
        index: i,
        group: atmGroup,
        screenMesh: screen,
        userSlotPosition: new THREE.Vector3(4.8, 0, posZ),
        isBusy: false,
        pendingFees: 1250 * (i + 1),
        currentCustomer: null
      });
    }
  }

  buildVaultRoom() {
    // Main Bank Vault in top-right corner (X = 4.8, Z = -5.0)
    const vaultGroup = new THREE.Group();

    // Reinforced Vault Enclosure
    const wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 3.0, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4 })
    );
    wall1.position.set(0, 1.5, 1.75);
    vaultGroup.add(wall1);

    const wall2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 3.0, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4 })
    );
    wall2.position.set(-1.75, 1.5, 0);
    vaultGroup.add(wall2);

    // Circular Titanium Vault Door (Stylized Open Door)
    const doorGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.25, 32);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.15
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.rotation.x = Math.PI / 2;
    door.position.set(-0.6, 1.4, 1.9);
    door.castShadow = true;
    door.userData = { interactiveType: 'vault' };
    vaultGroup.add(door);

    // Vault Wheel Handle
    const wheelGeo = new THREE.TorusGeometry(0.4, 0.08, 8, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(-0.6, 1.4, 2.1);
    vaultGroup.add(wheel);

    // Inside Vault Cash & Bullion Stacks Group
    this.cashStacksGroup = new THREE.Group();
    this.cashStacksGroup.position.set(0.5, 0, 0);
    vaultGroup.add(this.cashStacksGroup);

    this.updateVaultCashDisplay();

    vaultGroup.position.set(4.8, 0, -5.0);
    this.scene.add(vaultGroup);
    this.vaultMesh = vaultGroup;
  }

  updateVaultCashDisplay() {
    if (!this.cashStacksGroup) return;

    // Clear old stacks
    while (this.cashStacksGroup.children.length > 0) {
      this.cashStacksGroup.remove(this.cashStacksGroup.children[0]);
    }

    const cash = this.state ? this.state.treasuryCash : 50000;
    // Scale stack height and count based on actual cash
    const stackCount = Math.min(18, Math.max(3, Math.floor(cash / 40000) + 2));

    const bundleGeo = new THREE.BoxGeometry(0.35, 0.12, 0.22);
    const bundleMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6 }); // Egyptian green 200 EGP notes
    const goldGeo = new THREE.BoxGeometry(0.3, 0.1, 0.15);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });

    for (let i = 0; i < stackCount; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const height = Math.floor(i / 6);

      const isGold = i % 3 === 0;
      const stack = new THREE.Mesh(isGold ? goldGeo : bundleGeo, isGold ? goldMat : bundleMat);
      stack.position.set(col * 0.4 - 0.6, height * 0.14 + 0.07, row * 0.3 - 0.4);
      stack.castShadow = true;
      this.cashStacksGroup.add(stack);
    }
  }

  /**
   * Character Factory - Builds Low-Poly Stylized Humanoid
   */
  createCharacterMesh(role = 'customer', options = {}) {
    const char = new THREE.Group();

    const skinColor = options.skinColor || 0xffdbac;
    const clothesColor = options.clothesColor || (role === 'clerk' ? 0x0f172a : (role === 'guard' ? 0x1e3a8a : 0x0284c7));
    const hairColor = options.hairColor || 0x271911;

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const clothesMat = new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: options.pantsColor || 0x1e293b, roughness: 0.6 });

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), skinMat);
    head.position.y = 1.35;
    head.castShadow = true;
    char.add(head);

    // Hair / Hat
    if (role === 'guard') {
      // Security Cap
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.12, 0.38),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a })
      );
      cap.position.y = 1.52;
      char.add(cap);
    } else {
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), hairMat);
      hair.position.y = 1.51;
      char.add(hair);
    }

    // Torso (Suit / Shirt)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.28), clothesMat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    char.add(torso);

    // Left Arm
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.14), clothesMat);
    leftArm.position.set(-0.28, 0.92, 0);
    leftArm.castShadow = true;
    char.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.14), clothesMat);
    rightArm.position.set(0.28, 0.92, 0);
    rightArm.castShadow = true;
    char.add(rightArm);

    // Left Leg
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.18), pantsMat);
    leftLeg.position.set(-0.12, 0.38, 0);
    leftLeg.castShadow = true;
    char.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.18), pantsMat);
    rightLeg.position.set(0.12, 0.38, 0);
    rightLeg.castShadow = true;
    char.add(rightLeg);

    // Accessories
    if (role === 'customer' && options.hasBriefcase) {
      const briefcase = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.24, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 })
      );
      briefcase.position.set(0.34, 0.65, 0.05);
      briefcase.castShadow = true;
      char.add(briefcase);
    }

    char.userData = {
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      torso,
      head
    };

    return char;
  }

  spawnStaff() {
    // 1. Three Tellers behind each station
    this.tellers.forEach((t, i) => {
      const isFemale = i === 1;
      const clerkChar = this.charManager.spawnCharacter({
        role: isFemale ? 'female' : 'clerk',
        position: t.clerkPosition,
        rotationY: 0,
        defaultAnimation: 'type'
      });
      t.clerkChar = clerkChar;
      t.clerkMesh = clerkChar.model;
    });

    // 2. Security Guard patrolling near entrance & vault
    const guardWps = [
      new THREE.Vector3(-4.5, 0, 2.5),
      new THREE.Vector3(-1.0, 0, 0.0),
      new THREE.Vector3(2.5, 0, -2.5),
      new THREE.Vector3(3.5, 0, 1.0)
    ];

    const guardChar = this.charManager.spawnCharacter({
      role: 'guard',
      position: guardWps[0],
      rotationY: 0,
      defaultAnimation: 'walk'
    });

    this.securityGuard = {
      mesh: guardChar.model,
      charRef: guardChar,
      waypoints: guardWps,
      currentWpIndex: 0,
      speed: 1.2
    };
  }

  /**
   * Executive Branch Manager Office (Farouk's Office Zone)
   */
  buildExecutiveOffice() {
    const officeGroup = new THREE.Group();
    officeGroup.position.set(4.2, 0, -2.6);

    const walnutMat = new THREE.MeshStandardMaterial({
      color: 0x3d2215, // Rich bookmatched walnut
      roughness: 0.28,
      metalness: 0.15
    });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.18 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95, roughness: 0.15 });
    const cognacLeather = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.44, metalness: 0.08 });

    // 1. Presidential Walnut Executive Desk
    const deskGeo = new THREE.BoxGeometry(1.85, 0.9, 1.05);
    const desk = new THREE.Mesh(deskGeo, walnutMat);
    desk.position.set(0, 0.45, 0);
    desk.castShadow = true;
    desk.receiveShadow = true;
    officeGroup.add(desk);

    // Gold Brass Trim along Desktop Edge
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(1.88, 0.05, 1.08),
      brassMat
    );
    trim.position.set(0, 0.88, 0);
    officeGroup.add(trim);

    // Inlaid Black Leather Desk Blotter with Gold Border
    const blotter = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.015, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 })
    );
    blotter.position.set(-0.05, 0.91, 0.05);
    officeGroup.add(blotter);

    const blotterGoldBorder = new THREE.Mesh(
      new THREE.BoxGeometry(1.07, 0.01, 0.67),
      brassMat
    );
    blotterGoldBorder.position.set(-0.05, 0.905, 0.05);
    officeGroup.add(blotterGoldBorder);

    // Recessed Modesty Panel Inlay Crest
    const crest = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.02, 8, 24),
      brassMat
    );
    crest.position.set(0, 0.48, 0.53);
    officeGroup.add(crest);

    // Side Credenza Wing
    const credenza = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.78, 0.48),
      walnutMat
    );
    credenza.position.set(1.1, 0.39, -0.2);
    officeGroup.add(credenza);

    // 2. Executive Slim Laptop
    const laptopBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.02, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
    );
    laptopBase.position.set(-0.24, 0.92, 0.05);
    officeGroup.add(laptopBase);

    const laptopScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.25, 0.015),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    laptopScreen.position.set(-0.24, 1.04, -0.07);
    laptopScreen.rotation.x = -Math.PI / 12;
    officeGroup.add(laptopScreen);

    const screenGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    screenGlow.position.set(-0.24, 1.04, -0.058);
    screenGlow.rotation.x = -Math.PI / 12;
    officeGroup.add(screenGlow);

    // 3. Banker's Green Emerald Desk Lamp
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.03, 16),
      brassMat
    );
    lampBase.position.set(0.6, 0.92, -0.2);
    officeGroup.add(lampBase);

    const lampArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8),
      brassMat
    );
    lampArm.position.set(0.6, 1.05, -0.2);
    officeGroup.add(lampArm);

    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.18, 16, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.2 })
    );
    lampShade.rotation.z = Math.PI / 2;
    lampShade.position.set(0.6, 1.19, -0.2);
    officeGroup.add(lampShade);

    // 4. Presidential Leather High-Back Swivel Chair
    const execChair = this.createSwivelChair({
      isExecutive: true,
      seatColor: 0x111827,
      position: new THREE.Vector3(0, 0, -0.6),
      rotationY: 0
    });
    officeGroup.add(execChair);

    // 5. Visitor / Guest Armchairs in front of the desk
    [-0.55, 0.55].forEach((gx) => {
      const guestChair = new THREE.Group();
      guestChair.position.set(gx, 0, 0.78);
      guestChair.rotation.y = Math.PI; // Facing towards Farouk

      // Seat & back
      const gSeat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.5), cognacLeather);
      gSeat.position.y = 0.44;
      gSeat.castShadow = true;
      guestChair.add(gSeat);

      const gBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.08), cognacLeather);
      gBack.position.set(0, 0.68, -0.22);
      gBack.castShadow = true;
      guestChair.add(gBack);

      // Cantilever chrome frame
      const gLegL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.44, 0.48), chromeMat);
      gLegL.position.set(-0.25, 0.22, 0);
      guestChair.add(gLegL);

      const gLegR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.44, 0.48), chromeMat);
      gLegR.position.set(0.25, 0.22, 0);
      guestChair.add(gLegR);

      officeGroup.add(guestChair);
    });

    // 6. Nameplate: المدير العام: فاروق الألفي
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.04), brassMat);
    plate.position.set(0.35, 0.95, 0.35);
    plate.rotation.x = -Math.PI / 8;
    officeGroup.add(plate);

    this.scene.add(officeGroup);
    this.executiveDeskMesh = officeGroup;
  }

  /**
   * Break Corner & Water Cooler Dispenser (Mahmoud's Hangout)
   */
  buildBreakCorner() {
    const breakGroup = new THREE.Group();
    breakGroup.position.set(-3.8, 0, 1.8);

    // Water Cooler Cabinet
    const coolerBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.95, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
    );
    coolerBase.position.y = 0.475;
    coolerBase.castShadow = true;
    breakGroup.add(coolerBase);

    // Blue Inverted Water Bottle
    const bottleGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.48, 16);
    const bottleMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.72,
      roughness: 0.1,
      transmission: 0.8
    });
    const bottle = new THREE.Mesh(bottleGeo, bottleMat);
    bottle.position.set(0, 1.18, 0);
    breakGroup.add(bottle);

    // Spigots
    const coldSpigot = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.04, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
    );
    coldSpigot.position.set(0.08, 0.68, 0.24);
    breakGroup.add(coldSpigot);

    const hotSpigot = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.04, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    );
    hotSpigot.position.set(-0.08, 0.68, 0.24);
    breakGroup.add(hotSpigot);

    this.scene.add(breakGroup);
    this.waterCoolerMesh = breakGroup;
  }

  /**
   * Spawn and configure 3D Story NPCs (Farouk, Sara, Mahmoud)
   */
  spawnStoryNPCs() {
    if (!this.charManager) return;

    if (!this.dialogueSystem) {
      this.dialogueSystem = new CinematicDialogueSystem(this.scene, this.fpCamera, this.audio, this.state?.careerManager);
    }

    // 1. Farouk (Branch Director) at his office desk
    if (!this.storyNPCs.farouk) {
      const faroukChar = this.charManager.spawnCharacter({
        role: 'vip',
        position: [4.2, 0, -2.4],
        rotationY: 0,
        defaultAnimation: 'idle'
      });

      faroukChar.model.userData = {
        isInteractable: true,
        type: 'npc_dialogue',
        interactLabel: 'تحدث مع المدير فاروق [E]',
        npcId: 'farouk',
        onStartDialogue: (controller) => {
          this.dialogueSystem.startDialogue({
            id: 'farouk',
            name: 'المدير فاروق الألفي',
            role: 'مدير عام فرع المهندسين',
            icon: '👔',
            model: faroukChar.model
          }, controller);
        }
      };

      faroukChar.model.traverse((child) => {
        if (child.isMesh) {
          child.userData = faroukChar.model.userData;
        }
      });

      this.storyNPCs.farouk = faroukChar;
    }

    // 2. Sara (Rival Colleague) at Teller Station #2 (index 1)
    if (!this.storyNPCs.sara && this.tellers[1] && this.tellers[1].clerkChar) {
      const saraChar = this.tellers[1].clerkChar;
      saraChar.model.userData = {
        isInteractable: true,
        type: 'npc_dialogue',
        interactLabel: 'تحدث مع الزميلة سارة [E]',
        npcId: 'sara',
        onStartDialogue: (controller) => {
          this.dialogueSystem.startDialogue({
            id: 'sara',
            name: 'سارة عبد الرحمن',
            role: 'صرافة أولى (منافستك على الترقية)',
            icon: '👩‍💼',
            model: saraChar.model
          }, controller);
        }
      };

      saraChar.model.traverse((child) => {
        if (child.isMesh) {
          child.userData = saraChar.model.userData;
        }
      });

      this.storyNPCs.sara = saraChar;
    }

    // 3. Mahmoud (Prankster) at Water Cooler
    if (!this.storyNPCs.mahmoud) {
      const mahmoudChar = this.charManager.spawnCharacter({
        role: 'clerk',
        position: [-3.3, 0, 1.8],
        rotationY: -Math.PI / 2,
        defaultAnimation: 'idle'
      });

      // Small paper coffee/tea cup
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.028, 0.09, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      cup.position.set(0.24, 0.85, 0.18);
      mahmoudChar.model.add(cup);

      mahmoudChar.model.userData = {
        isInteractable: true,
        type: 'npc_dialogue',
        interactLabel: 'تحدث مع محمود (مبرد المياه) [E]',
        npcId: 'mahmoud',
        onStartDialogue: (controller) => {
          this.dialogueSystem.startDialogue({
            id: 'mahmoud',
            name: 'محمود فهمي',
            role: 'صراف شباك (خبير كواليس وإشاعات الفرع)',
            icon: '☕',
            model: mahmoudChar.model
          }, controller);
        }
      };

      mahmoudChar.model.traverse((child) => {
        if (child.isMesh) {
          child.userData = mahmoudChar.model.userData;
        }
      });

      this.storyNPCs.mahmoud = mahmoudChar;
    }
  }

  /**
   * Launch / Initialize 3D Third-Person Career Mode
   */
  initCareer3DMode(careerConfig = {}) {
    this.isCareerMode = true;
    this.currentPerspective = 'third_person';

    // 1. Ensure story NPCs exist
    this.spawnStoryNPCs();

    // 2. Spawn / Reset 3D Player Avatar
    const isFemale = careerConfig.gender === 'female';
    const playerRole = isFemale ? 'female' : 'player';

    if (!this.careerPlayerChar) {
      this.careerPlayerChar = this.charManager.spawnCharacter({
        role: playerRole,
        position: [-5.5, 0, 5.0],
        rotationY: 2.2, // Facing inside branch towards center
        defaultAnimation: 'idle'
      });

      // Attach leather briefcase to player
      const caseGroup = new THREE.Group();
      const briefcaseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.32, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x271911, roughness: 0.35 })
      );
      briefcaseMesh.castShadow = true;
      caseGroup.add(briefcaseMesh);

      const lock1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.04, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 })
      );
      lock1.position.set(0, 0.08, -0.1);
      caseGroup.add(lock1);

      const lock2 = lock1.clone();
      lock2.position.z = 0.1;
      caseGroup.add(lock2);

      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x1a120b })
      );
      handle.position.set(0, 0.18, 0);
      caseGroup.add(handle);

      caseGroup.position.set(0.36, 0.48, 0);
      this.careerPlayerChar.model.add(caseGroup);
      this.careerPlayerChar.briefcase = caseGroup;
    } else {
      this.careerPlayerChar.model.position.set(-5.5, 0, 5.0);
      this.careerPlayerChar.model.rotation.y = 2.2;
      this.careerPlayerChar.model.visible = true;
      if (this.charManager) {
        this.charManager.playAnimation(this.careerPlayerChar, 'idle', 0.2);
      }
    }

    // 3. Third-Person Player Controller Setup
    if (this.tpController) {
      this.tpController.destroy();
    }
    this.tpController = new ThirdPersonPlayerController(this.fpCamera, this.canvas, this.scene, {
      charManager: this.charManager,
      playerChar: this.careerPlayerChar,
      collisionBoxes: this.collisionBoxes,
      audio: this.audio,
      initialYaw: 0.65,
      getInteractables: () => this.getInteractableList()
    });

    // 4. Update workstation desk bindings
    if (this.workstationDesk) {
      this.workstationDesk.careerManager = this.state?.careerManager;
      this.workstationDesk.keycardLevel = this.state?.careerManager?.currentStage?.id || 1;
    }

    // 5. Update dialogue career manager reference
    if (this.dialogueSystem) {
      this.dialogueSystem.careerManager = this.state?.careerManager;
      this.dialogueSystem.updateHUDObjective('توجه لمكتب المدير فاروق بالحقيبة واستلم بطاقتك الوظيفية [E]');
    }
  }

  /**
   * Customer Lifecycle Spawning & Queue Management
   */
  spawnCustomer() {
    if (this.customers.length >= this.maxCustomers) return;

    const archetypes = [
      { type: 'retail', name: 'عميل أفراد (تجزئة)', clothesColor: 0x0284c7, maxPatience: 50, speed: 1.8, ticketType: 'سحب / إيداع' },
      { type: 'corporate', name: 'مندوب شركة ومستثمر', clothesColor: 0x1e1b4b, maxPatience: 35, speed: 2.2, hasBriefcase: true, ticketType: 'تمويل وشركات' },
      { type: 'elderly', name: 'مواطن على المعاش', clothesColor: 0x78350f, maxPatience: 70, speed: 1.2, ticketType: 'شهادات ادخار' },
      { type: 'vip', name: 'عميل ثروات VIP', clothesColor: 0xd4af37, maxPatience: 28, speed: 2.0, hasBriefcase: true, ticketType: 'خدمة كبار العملاء' }
    ];

    const arch = archetypes[Math.floor(Math.random() * archetypes.length)];
    const id = this.customerCounterId++;
    const isFemale = arch.type === 'vip' || Math.random() < 0.45;

    const charInstance = this.charManager.spawnCharacter({
      role: isFemale ? 'female' : 'customer',
      position: [-5.5, 0, 5.5],
      defaultAnimation: 'walk',
      speed: arch.speed
    });
    const mesh = charInstance.model;

    const customer = {
      id,
      name: `عميل رقم #${id}`,
      archetype: arch,
      charRef: charInstance,
      mesh,
      state: 'TO_TICKET', // TO_TICKET -> AT_TICKET -> TO_LOUNGE -> WAITING -> TO_TELLER -> AT_TELLER -> EXITING
      patience: arch.maxPatience,
      maxPatience: arch.maxPatience,
      assignedTeller: null,
      assignedSeat: null,
      transactionTimer: 0,
      targetPosition: this.ticketKiosk.servicePosition.clone(),
      speed: arch.speed,
      walkAnimTime: Math.random() * 10
    };

    mesh.userData = {
      interactiveType: 'customer',
      customerRef: customer
    };

    this.customers.push(customer);
  }

  updateNPCs(delta) {
    if (this.charManager) {
      this.charManager.update(delta);
    }

    // 1. Patrol Security Guard
    if (this.securityGuard) {
      const g = this.securityGuard;
      const target = g.waypoints[g.currentWpIndex];
      const dist = g.mesh.position.distanceTo(target);

      if (dist < 0.2) {
        g.currentWpIndex = (g.currentWpIndex + 1) % g.waypoints.length;
      } else {
        const dir = target.clone().sub(g.mesh.position).normalize();
        g.mesh.position.addScaledVector(dir, g.speed * delta);
        g.mesh.rotation.y = Math.atan2(dir.x, dir.z);

        if (g.charRef) {
          this.charManager.playAnimation(g.charRef, 'walk', 0.2);
        }

        // Arm/Leg swinging animation for procedural fallback
        if (g.mesh.userData && g.mesh.userData.leftLeg) {
          const t = this.clock.getElapsedTime() * 5;
          g.mesh.userData.leftLeg.rotation.x = Math.sin(t) * 0.45;
          g.mesh.userData.rightLeg.rotation.x = -Math.sin(t) * 0.45;
          if (g.mesh.userData.leftArm) g.mesh.userData.leftArm.rotation.x = -Math.sin(t) * 0.35;
          if (g.mesh.userData.rightArm) g.mesh.userData.rightArm.rotation.x = Math.sin(t) * 0.35;
        }
      }
    }

    // 2. Spawn Timer
    const now = this.clock.getElapsedTime();
    if (now >= this.nextCustomerSpawnTime) {
      this.spawnCustomer();
      // Spawn interval influenced by bank reputation
      const rep = this.state ? this.state.reputation : 50;
      const interval = Math.max(3.5, 9.0 - (rep / 20));
      this.nextCustomerSpawnTime = now + interval;
    }

    // 3. Update Customers State Machine
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      c.walkAnimTime += delta * 6;

      // Patience decay
      if (c.state !== 'EXITING') {
        const isSeated = c.state === 'WAITING';
        const decayRate = isSeated ? 0.6 : 1.0;
        c.patience -= delta * decayRate;

        // Rage quit if patience exhausted!
        if (c.patience <= 0) {
          this.triggerCustomerRageQuit(c);
          continue;
        }
      }

      switch (c.state) {
        case 'TO_TICKET': {
          const reached = this.moveTowards(c, c.targetPosition, delta);
          if (reached) {
            c.state = 'AT_TICKET';
            c.transactionTimer = 1.2;
            if (c.charRef) this.charManager.playAnimation(c.charRef, 'idle', 0.3);
            if (this.audio) this.audio.playPaper();
          }
          break;
        }

        case 'AT_TICKET': {
          c.transactionTimer -= delta;
          if (c.transactionTimer <= 0) {
            // Find free waiting seat or go straight to teller if one is ready
            const freeTeller = this.tellers.find(t => !t.isBusy);
            const freeSeat = this.waitingSeats.find(s => !s.isOccupied);

            if (freeTeller) {
              this.assignTeller(c, freeTeller);
            } else if (freeSeat) {
              freeSeat.isOccupied = true;
              freeSeat.customer = c;
              c.assignedSeat = freeSeat;
              c.targetPosition = freeSeat.position.clone();
              c.state = 'TO_LOUNGE';
            } else {
              // Stand near waiting area
              c.targetPosition = new THREE.Vector3(-1.0 + Math.random() * 2, 0, 3.2);
              c.state = 'TO_LOUNGE';
            }
          }
          break;
        }

        case 'TO_LOUNGE': {
          const reached = this.moveTowards(c, c.targetPosition, delta);
          if (reached) {
            c.state = 'WAITING';
            if (c.assignedSeat) {
              // Sit down animation
              c.mesh.rotation.y = Math.PI; // Face outwards
              if (c.charRef) {
                this.charManager.playAnimation(c.charRef, 'sit', 0.35);
              }
              if (c.mesh.userData && c.mesh.userData.leftLeg) {
                c.mesh.position.y = -0.15;
                c.mesh.userData.leftLeg.rotation.x = -Math.PI / 2.2;
                c.mesh.userData.rightLeg.rotation.x = -Math.PI / 2.2;
              }
            } else {
              if (c.charRef) this.charManager.playAnimation(c.charRef, 'idle', 0.3);
            }
          }
          break;
        }

        case 'WAITING': {
          // Check if a teller becomes free
          const freeTeller = this.tellers.find(t => !t.isBusy);
          if (freeTeller) {
            if (c.assignedSeat) {
              c.assignedSeat.isOccupied = false;
              c.assignedSeat.customer = null;
              c.assignedSeat = null;
              if (c.mesh.userData && c.mesh.userData.leftLeg) {
                c.mesh.position.y = 0; // Stand back up
                c.mesh.userData.leftLeg.rotation.x = 0;
                c.mesh.userData.rightLeg.rotation.x = 0;
              }
            }
            if (c.charRef) this.charManager.playAnimation(c.charRef, 'walk', 0.25);
            this.assignTeller(c, freeTeller);
            if (this.audio) this.audio.playBell();
          }
          break;
        }

        case 'TO_TELLER': {
          const reached = this.moveTowards(c, c.targetPosition, delta);
          if (reached) {
            c.state = 'AT_TELLER';
            c.mesh.rotation.y = Math.PI; // Face the teller
            if (c.charRef) this.charManager.playAnimation(c.charRef, 'idle', 0.3);
            if (c.assignedTeller && c.assignedTeller.clerkChar) {
              this.charManager.playAnimation(c.assignedTeller.clerkChar, 'type', 0.25);
            }
            c.transactionTimer = 3.5 / (c.assignedTeller.speedMultiplier || 1);
            if (this.audio) this.audio.playCash();
          }
          break;
        }

        case 'AT_TELLER': {
          c.transactionTimer -= delta;

          // Animate teller counting cash
          if (c.assignedTeller && c.assignedTeller.clerkMesh) {
            const clerk = c.assignedTeller.clerkMesh;
            if (clerk.userData && clerk.userData.leftArm) {
              clerk.userData.leftArm.rotation.x = Math.sin(this.clock.getElapsedTime() * 12) * 0.4;
              clerk.userData.rightArm.rotation.x = -Math.sin(this.clock.getElapsedTime() * 12) * 0.4;
            }
          }

          // Spawn cash particles
          if (Math.random() < 0.15) {
            this.spawnCashParticle(c.mesh.position.clone().add(new THREE.Vector3(0, 1.2, -0.6)));
          }

          if (c.transactionTimer <= 0) {
            // Transaction complete!
            this.finishTellerTransaction(c);
          }
          break;
        }

        case 'EXITING': {
          const reached = this.moveTowards(c, new THREE.Vector3(-6.0, 0, 5.5), delta);
          if (reached) {
            // Remove from scene
            if (c.charRef) {
              this.charManager.removeCharacter(c.charRef);
            } else if (c.mesh && c.mesh.parent) {
              this.scene.remove(c.mesh);
            }
            this.customers.splice(i, 1);
          }
          break;
        }
      }
    }

    // 4. Update Cash Particles
    for (let p = this.particles.length - 1; p >= 0; p--) {
      const part = this.particles[p];
      part.mesh.position.addScaledVector(part.velocity, delta);
      part.mesh.rotation.x += delta * 4;
      part.mesh.rotation.y += delta * 5;
      part.life -= delta;
      if (part.life <= 0) {
        this.scene.remove(part.mesh);
        this.particles.splice(p, 1);
      }
    }
  }

  moveTowards(customer, target, delta) {
    const mesh = customer.mesh;
    if (!mesh) return true;
    const current = mesh.position;
    const dist = current.distanceTo(target);

    if (dist < 0.15) {
      if (customer.charRef) {
        this.charManager.playAnimation(customer.charRef, 'idle', 0.3);
      }
      return true;
    }

    const dir = target.clone().sub(current).normalize();
    mesh.position.addScaledVector(dir, customer.speed * delta);
    mesh.rotation.y = Math.atan2(dir.x, dir.z);

    if (customer.charRef) {
      this.charManager.playAnimation(customer.charRef, 'walk', 0.2);
    }

    // Leg & arm swinging for fallback procedural mesh
    if (mesh.userData && mesh.userData.leftLeg) {
      const anim = Math.sin(customer.walkAnimTime);
      mesh.userData.leftLeg.rotation.x = anim * 0.55;
      mesh.userData.rightLeg.rotation.x = -anim * 0.55;
      if (mesh.userData.leftArm) mesh.userData.leftArm.rotation.x = -anim * 0.4;
      if (mesh.userData.rightArm) mesh.userData.rightArm.rotation.x = anim * 0.4;
    }

    return false;
  }

  assignTeller(customer, teller) {
    teller.isBusy = true;
    teller.currentCustomer = customer;
    customer.assignedTeller = teller;
    customer.targetPosition = teller.queueSlotPosition.clone();
    customer.state = 'TO_TELLER';
  }

  finishTellerTransaction(customer) {
    const teller = customer.assignedTeller;
    if (teller) {
      teller.isBusy = false;
      teller.currentCustomer = null;
    }

    // Award transaction fees to bank
    if (this.state) {
      const fee = 150 + Math.floor(Math.random() * 250);
      this.state.treasuryCash += fee;
      if (this.state.licensesManager) {
        this.state.licensesManager.addXP(10, 'خدمة عميل بالشباك');
      }
      this.updateVaultCashDisplay();
    }

    customer.state = 'EXITING';
    customer.targetPosition = new THREE.Vector3(-6.0, 0, 5.5);
    if (customer.charRef) this.charManager.playAnimation(customer.charRef, 'walk', 0.2);
    if (this.audio) this.audio.playSuccess();
  }

  triggerCustomerRageQuit(customer) {
    if (customer.assignedSeat) {
      customer.assignedSeat.isOccupied = false;
      customer.assignedSeat.customer = null;
    }
    if (customer.assignedTeller) {
      customer.assignedTeller.isBusy = false;
      customer.assignedTeller.currentCustomer = null;
    }

    // Hurt bank reputation slightly
    if (this.state) {
      this.state.reputation = Math.max(10, this.state.reputation - 0.25);
    }

    customer.state = 'EXITING';
    customer.speed *= 1.5; // Stomps out angrily
    customer.targetPosition = new THREE.Vector3(-6.0, 0, 5.5);
    if (customer.charRef) this.charManager.playAnimation(customer.charRef, 'walk', 0.2);
    if (this.audio) this.audio.playError();
  }

  spawnCashParticle(position) {
    const geo = new THREE.PlaneGeometry(0.2, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide });
    const pMesh = new THREE.Mesh(geo, mat);
    pMesh.position.copy(position);
    this.scene.add(pMesh);

    this.particles.push({
      mesh: pMesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        1.5 + Math.random() * 1.0,
        (Math.random() - 0.5) * 1.5
      ),
      life: 0.85
    });
  }

  /**
   * Fast list of all clickable / interactable 3D targets in the bank
   */
  getInteractableList() {
    const list = [];
    if (this.storyNPCs) {
      if (this.storyNPCs.farouk?.model) list.push(this.storyNPCs.farouk.model);
      if (this.storyNPCs.sara?.model) list.push(this.storyNPCs.sara.model);
      if (this.storyNPCs.mahmoud?.model) list.push(this.storyNPCs.mahmoud.model);
    }
    if (this.workstationDesk?.group) {
      list.push(this.workstationDesk.group);
    }
    if (this.tellers) {
      this.tellers.forEach(t => {
        if (t.counterGroup) list.push(t.counterGroup);
        if (t.clerkMesh) list.push(t.clerkMesh);
      });
    }
    if (this.atms) {
      this.atms.forEach(a => {
        if (a.mesh) list.push(a.mesh);
      });
    }
    if (this.vaultMesh) {
      list.push(this.vaultMesh);
    }
    if (this.customers) {
      this.customers.forEach(c => {
        if (c.mesh) list.push(c.mesh);
      });
    }
    return list;
  }

  /**
   * Raycasting & Interactive Clicks (High Performance, Throttled)
   */
  setupInteractions() {
    let lastMoveCheck = 0;
    this.onPointerMove = (e) => {
      const now = performance.now();
      if (now - lastMoveCheck < 35) return; // 30 FPS throttle
      lastMoveCheck = now;

      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const targets = this.getInteractableList();
      const intersects = this.raycaster.intersectObjects(targets, true);

      let found = null;
      for (const hit of intersects) {
        let obj = hit.object;
        while (obj && obj !== this.scene) {
          if (obj.userData && (obj.userData.interactiveType || obj.userData.isInteractable)) {
            found = obj;
            break;
          }
          obj = obj.parent;
        }
        if (found) break;
      }

      if (found) {
        this.canvas.style.cursor = 'pointer';
        this.hoveredObject = found;
      } else {
        this.canvas.style.cursor = 'default';
        this.hoveredObject = null;
      }
    };

    this.onPointerDown = (e) => {
      if (this.currentPerspective === 'first_person') return; // Handled by PlayerController
      if (e.button !== 0) return; // Left click only
      if (!this.hoveredObject) return;

      const data = this.hoveredObject.userData;
      if (this.audio) this.audio.playClick();

      if (data.interactiveType === 'teller' && this.callbacks.onTellerClick) {
        this.callbacks.onTellerClick(data.tellerIndex);
      } else if (data.interactiveType === 'atm' && this.callbacks.onATMClick) {
        this.callbacks.onATMClick(data.atmIndex);
      } else if (data.interactiveType === 'customer' && this.callbacks.onCustomerClick) {
        this.callbacks.onCustomerClick(data.customerRef);
      } else if (data.interactiveType === 'vault' && this.callbacks.onVaultClick) {
        this.callbacks.onVaultClick();
      }
    };

    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    const animate = () => {
      if (!this.isRunning) return;
      this.animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(0.1, this.clock.getDelta());
      this.updateNPCs(delta);

      if (this.currentPerspective === 'third_person' && this.tpController) {
        this.tpController.update(delta);
        this.renderer.render(this.scene, this.fpCamera);
      } else if (this.currentPerspective === 'first_person' && this.playerController) {
        this.playerController.update(delta);
        this.renderer.render(this.scene, this.fpCamera);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  pause() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume() {
    if (this.isRunning) return;
    this.clock.start();
    this.start();
  }

  destroy() {
    this.pause();
    if (this.playerController) {
      this.playerController.destroy();
      this.playerController = null;
    }
    if (this.tpController) {
      this.tpController.destroy();
      this.tpController = null;
    }
    if (this.dialogueSystem) {
      this.dialogueSystem.destroy();
      this.dialogueSystem = null;
    }
    if (this.workstationDesk) {
      this.workstationDesk.destroy();
      this.workstationDesk = null;
    }
    if (this.charManager) {
      this.charManager.clear();
      this.charManager = null;
    }
    window.removeEventListener('resize', this.onResize);
    if (this.canvas) {
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.remove();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
