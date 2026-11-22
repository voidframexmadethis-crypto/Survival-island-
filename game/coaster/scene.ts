import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CoasterAudio } from './audio';
import { CoasterSimulation } from './physics';
import { MechanicalController, deriveMechanics } from './mechanics';
import {
  TRACK_GAUGE,
  computeTrackStats,
  sampleAtDistance,
  sampleTrack,
} from './track';
import type {
  CameraPose,
  CameraProjection,
  CoasterProject,
  MechanicalSnapshot,
  RideCameraMode,
  SupportMaterial,
  TrackSample,
  TrackStats,
  TrainDesign,
  TrainTelemetry,
  Vec3,
} from './types';

export type StudioTool = 'select' | 'add';

export interface CoasterSceneCallbacks {
  onSelectPoint: (index: number) => void;
  onAddPoint: (position: Vec3) => void;
  onMovePoint: (index: number, position: Vec3) => void;
  onTelemetry: (telemetry: TrainTelemetry, mechanical: MechanicalSnapshot, stats: TrackStats) => void;
  onNotice: (message: string) => void;
}

interface MechanicalVisual {
  kind: 'transfer' | 'switch' | 'drop' | 'tilt';
  group: THREE.Group;
  base: THREE.Vector3;
  right: THREE.Vector3;
}

const UP = new THREE.Vector3(0, 1, 0);
const BASIS = new THREE.Matrix4();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();

function basisQuaternion(sample: TrackSample): THREE.Quaternion {
  _right.set(sample.right.x, sample.right.y, sample.right.z);
  _up.set(sample.up.x, sample.up.y, sample.up.z);
  _tangent.set(sample.tangent.x, sample.tangent.y, sample.tangent.z);
  BASIS.makeBasis(_right, _up, _tangent);
  return _quat.setFromRotationMatrix(BASIS);
}

function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) geometries.add(child.geometry);
      if (Array.isArray(child.material)) child.material.forEach((material) => materials.add(material));
      else if (child.material) materials.add(child.material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function railGeometry(samples: TrackSample[], offset: number): THREE.BufferGeometry {
  const halfW = 0.055;
  const halfH = 0.075;
  const positions: number[] = [];
  const indices: number[] = [];
  for (const sample of samples) {
    const cx = sample.position.x + sample.right.x * offset + sample.up.x * 0.06;
    const cy = sample.position.y + sample.right.y * offset + sample.up.y * 0.06;
    const cz = sample.position.z + sample.right.z * offset + sample.up.z * 0.06;
    const corners = [
      [-halfW, -halfH],
      [halfW, -halfH],
      [halfW, halfH],
      [-halfW, halfH],
    ];
    for (const [x, y] of corners) {
      positions.push(
        cx + sample.right.x * x + sample.up.x * y,
        cy + sample.right.y * x + sample.up.y * y,
        cz + sample.right.z * x + sample.up.z * y,
      );
    }
  }
  for (let i = 0; i < samples.length - 1; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    for (let face = 0; face < 4; face++) {
      const next = (face + 1) % 4;
      indices.push(a + face, b + face, b + next, a + face, b + next, a + next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export class CoasterStudioScene {
  private readonly container: HTMLElement;
  private readonly callbacks: CoasterSceneCallbacks;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly orthoCamera: THREE.OrthographicCamera;
  private readonly orthoControls: OrbitControls;
  private projection: CameraProjection = 'perspective';
  private rideCamera: RideCameraMode = 'free';
  private tracksideDistance = 0;
  private readonly orthoViewSize = 92;
  private readonly audio = new CoasterAudio();
  private readonly resizeObserver: ResizeObserver;
  private readonly groups = {
    world: new THREE.Group(),
    track: new THREE.Group(),
    nodes: new THREE.Group(),
    mechanical: new THREE.Group(),
    trains: new THREE.Group(),
  };
  private readonly raycaster = new THREE.Raycaster();
  private project: CoasterProject;
  private samples: TrackSample[] = [];
  private simulation: CoasterSimulation;
  private mechanics: MechanicalController;
  private trainDesign: TrainDesign;
  private carGroups: THREE.Group[][] = [];
  private nodeMeshes: THREE.Mesh[] = [];
  private nodeBaseMaterial!: THREE.MeshStandardMaterial;
  private nodeSelectedMaterial!: THREE.MeshStandardMaterial;
  private mechanicalVisuals: MechanicalVisual[] = [];
  private stationGroup: THREE.Group | null = null;
  private stationGate: THREE.Mesh | null = null;
  private selectedIndex = -1;
  private tool: StudioTool = 'select';
  private snap = 1;
  private playing = false;
  private onboard = false;
  private autoDispatch = false;
  private autoTimer = 0;
  private selectedDrag: { index: number; moved: boolean; position: Vec3 } | null = null;
  private pointerStart = { x: 0, y: 0 };
  private animationFrame = 0;
  private disposed = false;
  private lastTelemetryAt = 0;
  private lastFrameTime = performance.now();
  private previousTrainStates: string[] = [];
  private readonly boundPointerDown: (event: PointerEvent) => void;
  private readonly boundPointerMove: (event: PointerEvent) => void;
  private readonly boundPointerUp: (event: PointerEvent) => void;

  constructor(container: HTMLElement, project: CoasterProject, callbacks: CoasterSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.project = project;
    this.trainDesign = project.train;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.setAttribute('aria-label', 'Coaster construction viewport');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc9d8e4, 140, 380);
    this.scene.add(this.groups.world, this.groups.track, this.groups.nodes, this.groups.mechanical, this.groups.trains);

    const aspect = Math.max(0.1, container.clientWidth / Math.max(1, container.clientHeight));
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 900);
    this.camera.position.set(54, 40, 74);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 260;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.target.set(0, 8, 26);

    this.orthoCamera = new THREE.OrthographicCamera(
      (-this.orthoViewSize * aspect) / 2,
      (this.orthoViewSize * aspect) / 2,
      this.orthoViewSize / 2,
      -this.orthoViewSize / 2,
      0.1,
      900,
    );
    this.orthoCamera.position.set(54, 90, 74);
    this.orthoControls = new OrbitControls(this.orthoCamera, this.renderer.domElement);
    this.orthoControls.enableDamping = true;
    this.orthoControls.dampingFactor = 0.075;
    this.orthoControls.minZoom = 0.08;
    this.orthoControls.maxZoom = 8;
    this.orthoControls.maxPolarAngle = Math.PI * 0.495;
    this.orthoControls.target.set(0, 8, 26);
    this.orthoControls.enabled = false;

    this.applyCameraPose(project.camera);
    this.buildWorld();
    this.samples = sampleTrack(project.points, project.closed, 14);
    this.simulation = this.createSimulation();
    this.mechanics = new MechanicalController(this.samples, deriveMechanics(project.points));
    this.rebuildAll();

    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.renderer.domElement.addEventListener('pointerdown', this.boundPointerDown, true);
    this.renderer.domElement.addEventListener('pointermove', this.boundPointerMove, true);
    this.renderer.domElement.addEventListener('pointerup', this.boundPointerUp, true);
    this.renderer.domElement.addEventListener('pointercancel', this.boundPointerUp, true);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.animate();
  }

  private buildWorld(): void {
    const skyGeometry = new THREE.SphereGeometry(620, 32, 20);
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x6ca8d8) },
        bottomColor: { value: new THREE.Color(0xdbe6ea) },
        horizonColor: { value: new THREE.Color(0xeef1e4) },
      },
      vertexShader: `varying vec3 vWorld; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform vec3 horizonColor; varying vec3 vWorld;
        void main(){ float h = normalize(vWorld).y; vec3 col = mix(horizonColor, topColor, smoothstep(0.02, 0.72, h)); col = mix(bottomColor, col, smoothstep(-0.16, 0.08, h)); gl_FragColor = vec4(col, 1.0); }`,
    });
    this.scene.add(new THREE.Mesh(skyGeometry, skyMaterial));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x768b60, roughness: 0.96, metalness: 0.02 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.groups.world.add(ground);

    const grid = new THREE.GridHelper(400, 100, 0x38452f, 0x506044);
    grid.position.y = 0.02;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.42;
    this.groups.world.add(grid);

    const largerGrid = new THREE.GridHelper(800, 40, 0x2f3a29, 0x46543c);
    largerGrid.position.y = 0.012;
    const largerMaterial = largerGrid.material as THREE.Material;
    largerMaterial.transparent = true;
    largerMaterial.opacity = 0.25;
    this.groups.world.add(largerGrid);

    const hemi = new THREE.HemisphereLight(0xd7ecff, 0x4f4532, 1.15);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d8, 2.35);
    sun.position.set(80, 120, 42);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 300;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb9d8f0, 0.45);
    fill.position.set(-60, 45, -70);
    this.scene.add(fill);
  }

  private createSimulation(): CoasterSimulation {
    const design = this.project.train;
    const ridersPerTrain = design.cars * design.rowsPerCar * design.seatsPerRow;
    return new CoasterSimulation(this.samples, this.project.closed, this.project.trainCount, {
      targetSpeeds: this.project.points.map((point) => point.targetSpeed),
      ridersPerTrain,
      emptyTrainMassKg: 1400 + design.cars * 1050,
    });
  }

  private get activeCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.projection === 'orthographic' ? this.orthoCamera : this.camera;
  }

  private get activeControls(): OrbitControls {
    return this.projection === 'orthographic' ? this.orthoControls : this.controls;
  }

  setCameraPreset(preset: 'iso' | 'top' | 'front' | 'side'): void {
    const target = this.activeControls.target.clone();
    const offset =
      preset === 'top'
        ? new THREE.Vector3(0.01, 130, 0.01)
        : preset === 'front'
          ? new THREE.Vector3(0, 24, 92)
          : preset === 'side'
            ? new THREE.Vector3(92, 24, 0)
            : new THREE.Vector3(46, 28, 52);
    this.setRideCamera('free');
    this.activeControls.target.copy(target);
    this.activeCamera.position.copy(target).add(offset);
    if (this.projection === 'orthographic') {
      this.orthoCamera.zoom = preset === 'top' ? 1.35 : 1;
      this.orthoCamera.updateProjectionMatrix();
    }
    this.activeControls.update();
  }

  setProjection(projection: CameraProjection): void {
    if (projection === this.projection) return;
    const target = this.activeControls.target.clone();
    this.projection = projection;
    this.controls.enabled = projection === 'perspective' && this.rideCamera === 'free';
    this.orthoControls.enabled = projection === 'orthographic' && this.rideCamera === 'free';
    if (projection === 'orthographic') {
      this.orthoControls.target.copy(target);
      this.orthoCamera.position.set(target.x + 6, Math.max(70, target.y + 65), target.z + 16);
      this.orthoCamera.zoom = 1;
      this.orthoCamera.updateProjectionMatrix();
      this.orthoControls.update();
    } else {
      this.controls.target.copy(target);
      this.camera.position.set(target.x + 46, Math.max(30, target.y + 28), target.z + 52);
      this.controls.update();
    }
    this.project = { ...this.project, camera: { ...this.project.camera, projection } };
  }

  getProjection(): CameraProjection {
    return this.projection;
  }

  applyCameraPose(pose: CameraPose): void {
    this.projection = pose.projection;
    this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.controls.target.set(pose.target.x, pose.target.y, pose.target.z);
    this.orthoCamera.position.set(pose.position.x, Math.max(40, pose.position.y + 55), pose.position.z);
    this.orthoControls.target.set(pose.target.x, pose.target.y, pose.target.z);
    this.controls.enabled = pose.projection === 'perspective';
    this.orthoControls.enabled = pose.projection === 'orthographic';
    this.controls.update();
    this.orthoControls.update();
    this.setRideCamera(pose.rideMode);
  }

  getCameraPose(): CameraPose {
    const camera = this.activeCamera;
    const target = this.activeControls.target;
    return {
      projection: this.projection,
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: { x: target.x, y: target.y, z: target.z },
      rideMode: this.rideCamera,
    };
  }

  setRideCamera(mode: RideCameraMode): void {
    this.rideCamera = mode;
    this.onboard = mode !== 'free';
    const canOrbit = mode === 'free';
    this.controls.enabled = canOrbit && this.projection === 'perspective';
    this.orthoControls.enabled = canOrbit && this.projection === 'orthographic';
    this.tracksideDistance = 0;
  }

  getRideCamera(): RideCameraMode {
    return this.rideCamera;
  }

  setProject(project: CoasterProject): void {
    const geometryChanged =
      this.project.points !== project.points ||
      this.project.closed !== project.closed ||
      this.project.id !== project.id ||
      this.project.trackColor !== project.trackColor ||
      this.project.supportColor !== project.supportColor ||
      this.project.supports !== project.supports;
    const projectChanged = this.project.id !== project.id;
    this.project = project;
    this.trainDesign = project.train;
    if (this.simulation) {
      this.simulation.options.ridersPerTrain =
        project.train.cars * project.train.rowsPerCar * project.train.seatsPerRow;
      this.simulation.options.emptyTrainMassKg = 1400 + project.train.cars * 1050;
    }
    if (projectChanged) this.applyCameraPose(project.camera);
    if (geometryChanged) {
      this.samples = sampleTrack(project.points, project.closed, 14);
      this.simulation = this.createSimulation();
      this.mechanics = new MechanicalController(this.samples, deriveMechanics(project.points));
      this.playing = false;
      this.autoTimer = 0;
      this.previousTrainStates = [];
      this.rebuildAll();
    } else {
      this.rebuildTrains();
    }
  }

  setSelected(index: number): void {
    this.selectedIndex = index;
    this.nodeMeshes.forEach((mesh, markerIndex) => {
      mesh.material = markerIndex === index ? this.nodeSelectedMaterial : this.nodeBaseMaterial;
      mesh.scale.setScalar(markerIndex === index ? 1.35 : 1);
    });
  }

  setTool(tool: StudioTool): void {
    this.tool = tool;
    this.renderer.domElement.style.cursor = tool === 'add' ? 'crosshair' : 'grab';
  }

  setSnap(snap: number): void {
    this.snap = Math.max(0, snap);
  }

  setAutoDispatch(enabled: boolean): void {
    this.autoDispatch = enabled;
    this.autoTimer = 0;
  }

  setTrainCount(count: number): void {
    this.project = { ...this.project, trainCount: count };
    this.simulation.setTrainCount(count);
    this.rebuildTrains();
  }

  setTrainDesign(design: TrainDesign): void {
    this.trainDesign = design;
    this.project = { ...this.project, train: design };
    this.simulation.options.ridersPerTrain = design.cars * design.rowsPerCar * design.seatsPerRow;
    this.simulation.options.emptyTrainMassKg = 1400 + design.cars * 1050;
    this.rebuildTrains();
  }

  async play(): Promise<void> {
    await this.audio.start();
    this.playing = true;
    this.autoTimer = 0;
  }

  pause(): void {
    this.playing = false;
    this.audio.update(0, 'track');
  }

  reset(): void {
    this.playing = false;
    this.autoTimer = 0;
    this.previousTrainStates = [];
    this.simulation.reset();
    this.audio.update(0, 'track');
  }

  hasRunningTrain(): boolean {
    return this.simulation.trains.some((train) => train.state === 'running');
  }

  dispatch(): boolean {
    if (!this.project.closed) {
      this.callbacks.onNotice('Close the circuit before dispatching a train.');
      return false;
    }
    if (!this.mechanics.isHome()) {
      this.callbacks.onNotice('Mechanical cycle in progress — dispatch held.');
      return false;
    }
    const train = this.simulation.trains.find((candidate) => candidate.state === 'stopped');
    if (!train) {
      this.callbacks.onNotice('All trains are already running.');
      return false;
    }
    if (!this.mechanics.canDispatch(train.id, train.s) || !this.simulation.dispatch(train.id)) {
      this.callbacks.onNotice('Block interlock: a train still occupies the platform or the next block.');
      return false;
    }
    this.autoTimer = 0;
    this.playing = true;
    void this.audio.start();
    this.callbacks.onNotice(`Train ${train.id + 1} dispatched. All clear.`);
    return true;
  }

  dispatchAll(): void {
    this.playing = true;
    void this.audio.start();
    for (const train of this.simulation.trains) {
      if (train.state !== 'stopped' || !this.mechanics.canDispatch(train.id, train.s)) continue;
      if (this.simulation.dispatch(train.id)) {
        this.mechanics.senseTrain(train.id, train.s, this.samples);
        this.autoTimer = 0;
        break;
      }
    }
  }

  triggerMechanical(action: 'transfer' | 'switch' | 'drop' | 'tilt'): void {
    const started = this.mechanics.request(action);
    if (!started) {
      this.callbacks.onNotice(
        this.mechanics.snapshot().lastAction === action
          ? 'Mechanical cycle already running — action queued.'
          : `Add a ${action} section to the track before testing it.`,
      );
    }
  }

  setOnboard(enabled: boolean): void {
    if (enabled) {
      this.setRideCamera('front');
      return;
    }
    this.setRideCamera('free');
    this.activeControls.enabled = true;
  }

  setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  focusTrack(): void {
    if (!this.samples.length) return;
    const box = new THREE.Box3();
    for (const sample of this.samples) box.expandByPoint(new THREE.Vector3(sample.position.x, sample.position.y, sample.position.z));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z, size.y * 1.5);
    const distance = Math.max(40, Math.min(95, span * 0.85));
    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + distance * 0.82,
      Math.max(24, center.y + distance * 0.55),
      center.z + distance * 0.92,
    );
    this.orthoControls.target.copy(center);
    this.orthoCamera.position.set(center.x + 8, Math.max(70, center.y + 70), center.z + 18);
    this.orthoCamera.zoom = Math.max(0.5, Math.min(3, 80 / Math.max(20, span)));
    this.orthoCamera.updateProjectionMatrix();
    this.controls.update();
    this.orthoControls.update();
  }

  focusPoint(index: number): void {
    const point = this.project.points[index];
    if (!point) return;
    const target = new THREE.Vector3(point.position.x, point.position.y, point.position.z);
    this.controls.target.copy(target);
    this.camera.position.set(
      point.position.x + 22,
      point.position.y + 16,
      point.position.z + 22,
    );
    this.orthoControls.target.copy(target);
    this.orthoCamera.position.set(point.position.x + 2, point.position.y + 55, point.position.z + 6);
    this.controls.update();
    this.orthoControls.update();
  }

  snapshot(): { telemetry: TrainTelemetry | null; mechanical: MechanicalSnapshot; stats: TrackStats } {
    return {
      telemetry: this.simulation.telemetry(0),
      mechanical: this.mechanics.snapshot(),
      stats: computeTrackStats(this.samples, this.project.points.length),
    };
  }

  private rebuildAll(): void {
    this.rebuildTrack();
    this.rebuildNodes();
    this.rebuildMechanicals();
    this.rebuildTrains();
    this.setSelected(this.selectedIndex);
  }

  private rebuildTrack(): void {
    disposeObject(this.groups.track);
    this.groups.track.clear();
    if (this.samples.length < 2) return;

    const railMat = new THREE.MeshStandardMaterial({
      color: this.project.trackColor,
      metalness: 0.88,
      roughness: 0.28,
    });
    const leftRail = new THREE.Mesh(railGeometry(this.samples, TRACK_GAUGE / 2), railMat);
    const rightRail = new THREE.Mesh(railGeometry(this.samples, -TRACK_GAUGE / 2), railMat);
    leftRail.castShadow = true;
    rightRail.castShadow = true;
    this.groups.track.add(leftRail, rightRail);

    const spineMat = new THREE.MeshStandardMaterial({
      color: 0x9aa7ae,
      metalness: 0.65,
      roughness: 0.42,
    });
    const spinePoints = this.samples.map((sample) => new THREE.Vector3(sample.position.x, sample.position.y - 0.16, sample.position.z));
    if (this.project.closed && spinePoints.length > 2) spinePoints.pop();
    const spineCurve = new THREE.CatmullRomCurve3(spinePoints, this.project.closed, 'centripetal');
    const spine = new THREE.Mesh(
      new THREE.TubeGeometry(spineCurve, Math.max(40, Math.min(700, spinePoints.length * 2)), 0.13, 6, this.project.closed),
      spineMat,
    );
    spine.castShadow = true;
    this.groups.track.add(spine);

    const tieMat = new THREE.MeshStandardMaterial({ color: 0x4b5054, metalness: 0.4, roughness: 0.72 });
    const tieCount = Math.max(1, Math.floor((this.samples.length - 1) / 3));
    const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(TRACK_GAUGE + 0.52, 0.09, 0.17), tieMat, tieCount);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < tieCount; i++) {
      const sample = this.samples[Math.min(this.samples.length - 1, i * 3)];
      _right.set(sample.right.x, sample.right.y, sample.right.z);
      _up.set(sample.up.x, sample.up.y, sample.up.z);
      _tangent.set(sample.tangent.x, sample.tangent.y, sample.tangent.z);
      matrix.makeBasis(_right, _up, _tangent);
      matrix.setPosition(sample.position.x, sample.position.y, sample.position.z);
      ties.setMatrixAt(i, matrix);
    }
    ties.instanceMatrix.needsUpdate = true;
    ties.castShadow = true;
    ties.receiveShadow = true;
    this.groups.track.add(ties);

    this.buildSupports();
    this.buildStation();
  }

  private supportColor(material: SupportMaterial): string {
    if (material === 'wood') return '#6b4a2f';
    if (material === 'concrete') return '#a7a397';
    return this.project.supportColor;
  }

  private buildSupports(): void {
    const settings = this.project.supports;
    if (settings.auto) {
      const supportMat = new THREE.MeshStandardMaterial({
        color: this.supportColor(settings.material),
        metalness: settings.material === 'wood' ? 0.05 : 0.55,
        roughness: settings.material === 'wood' ? 0.88 : 0.55,
      });
      const positions: { point: Vec3; height: number }[] = [];
      let lastDistance = -10;
      for (const sample of this.samples) {
        if (sample.distance - lastDistance < 9) continue;
        if (sample.position.y < 0.8) continue;
        if (sample.kind === 'station' || sample.kind === 'unload_station') continue;
        positions.push({ point: sample.position, height: sample.position.y - 0.2 });
        lastDistance = sample.distance;
      }
      if (positions.length) {
        const columnGeometry =
          settings.material === 'wood'
            ? new THREE.BoxGeometry(0.26, 1, 0.26)
            : new THREE.CylinderGeometry(0.11, 0.17, 1, 8);
        const column = new THREE.InstancedMesh(columnGeometry, supportMat, positions.length);
        const footer = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.18, 0.9), supportMat, positions.length);
        const matrix = new THREE.Matrix4();
        positions.forEach((entry, i) => {
          const base = settings.material === 'wood' ? 0.16 : 0.1;
          matrix.makeScale(1, entry.height, 1);
          matrix.setPosition(entry.point.x, entry.height / 2 + base, entry.point.z);
          column.setMatrixAt(i, matrix);
          matrix.makeTranslation(entry.point.x, base, entry.point.z);
          footer.setMatrixAt(i, matrix);
        });
        column.instanceMatrix.needsUpdate = true;
        footer.instanceMatrix.needsUpdate = true;
        column.castShadow = true;
        column.receiveShadow = true;
        footer.receiveShadow = true;
        this.groups.track.add(column, footer);
      }
    }

    for (const support of settings.manual) {
      const material = new THREE.MeshStandardMaterial({
        color: this.supportColor(support.material),
        metalness: support.material === 'wood' ? 0.04 : 0.6,
        roughness: support.material === 'wood' ? 0.9 : 0.46,
      });
      const column = new THREE.Mesh(
        support.material === 'wood'
          ? new THREE.BoxGeometry(0.28, support.height, 0.28)
          : new THREE.CylinderGeometry(0.12, 0.19, support.height, 8),
        material,
      );
      column.position.set(support.x, support.y + support.height / 2, support.z);
      column.castShadow = true;
      column.receiveShadow = true;
      const footer = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.2, 1.05), material);
      footer.position.set(support.x, support.y + 0.1, support.z);
      footer.receiveShadow = true;
      this.groups.track.add(column, footer);
      if (support.crossBrace) {
        const braceGeometry = new THREE.BoxGeometry(0.08, support.height * 0.82, 0.08);
        for (const side of [-1, 1]) {
          const brace = new THREE.Mesh(braceGeometry, material);
          brace.position.set(support.x + side * 0.3, support.y + support.height * 0.48, support.z);
          brace.rotation.z = side * 0.32;
          brace.castShadow = true;
          this.groups.track.add(brace);
        }
      }
    }
  }

  private buildStation(): void {
    if (this.stationGroup) {
      disposeObject(this.stationGroup);
      this.stationGroup.removeFromParent();
      this.stationGroup = null;
      this.stationGate = null;
    }
    const stationPoint = this.project.points.find((point) => point.kind === 'station');
    if (!stationPoint) return;
    const sample = this.samples.find((candidate) => candidate.pointIndex === this.project.points.indexOf(stationPoint));
    if (!sample) return;
    const group = new THREE.Group();
    group.position.set(sample.position.x, sample.position.y, sample.position.z);
    group.quaternion.copy(basisQuaternion(sample));
    const concrete = new THREE.MeshStandardMaterial({ color: 0xb7b3a4, roughness: 0.88, metalness: 0.05 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x355463, roughness: 0.62, metalness: 0.35 });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.32, 15), concrete);
    platform.position.set(TRACK_GAUGE / 2 + 3.1, -0.9, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.22, 15.5), roofMat);
    roof.position.set(TRACK_GAUGE / 2 + 3.1, 3.9, 0);
    roof.castShadow = true;
    group.add(roof);
    for (const z of [-6.3, 6.3]) {
      for (const x of [0.4, 5.8]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.7, 0.16), roofMat);
        post.position.set(x, 1.9, z);
        post.castShadow = true;
        group.add(post);
      }
    }
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.1, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x2c7a64, metalness: 0.2, roughness: 0.5 }),
    );
    gate.position.set(TRACK_GAUGE / 2 + 0.35, -0.35, -3.5);
    group.add(gate);
    this.stationGate = gate;
    this.stationGroup = group;
    this.groups.track.add(group);
  }

  private rebuildNodes(): void {
    disposeObject(this.groups.nodes);
    this.groups.nodes.clear();
    this.nodeMeshes = [];
    this.nodeBaseMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4b942,
      emissive: 0x8a5a00,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.2,
    });
    this.nodeSelectedMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffc94d,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const geometry = new THREE.SphereGeometry(0.38, 14, 12);
    this.project.points.forEach((point, index) => {
      const marker = new THREE.Mesh(geometry, this.nodeBaseMaterial);
      marker.position.set(point.position.x, point.position.y + 0.35, point.position.z);
      marker.userData.pointIndex = index;
      marker.castShadow = true;
      this.groups.nodes.add(marker);
      this.nodeMeshes.push(marker);
    });
  }

  private rebuildMechanicals(): void {
    disposeObject(this.groups.mechanical);
    this.groups.mechanical.clear();
    this.mechanicalVisuals = [];
    const kinds: ('transfer' | 'switch' | 'drop' | 'tilt')[] = ['transfer', 'switch', 'drop', 'tilt'];
    for (const kind of kinds) {
      const index = this.project.points.findIndex((point) => point.kind === kind);
      if (index < 0) continue;
      const sample = this.samples.find((candidate) => candidate.pointIndex === index);
      if (!sample) continue;
      const group = new THREE.Group();
      group.position.set(sample.position.x, sample.position.y, sample.position.z);
      group.quaternion.copy(basisQuaternion(sample));
      const steel = new THREE.MeshStandardMaterial({ color: 0x8d989e, metalness: 0.8, roughness: 0.32 });
      const accent = new THREE.MeshStandardMaterial({
        color: 0x2ec4b6,
        emissive: 0x0f6f68,
        emissiveIntensity: 0.45,
        metalness: 0.4,
        roughness: 0.4,
      });
      if (kind === 'transfer') {
        const table = new THREE.Mesh(new THREE.BoxGeometry(5, 0.24, 3.2), steel);
        table.position.set(5.6, -0.32, 0);
        table.castShadow = true;
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 3.2), accent);
        marker.position.set(5.6, -0.16, 0);
        group.add(table, marker);
      } else if (kind === 'switch') {
        for (const side of [-1, 1]) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 4.2), steel);
          blade.position.set(side * 0.5, 0.02, 1.4);
          blade.rotation.y = side * 0.08;
          group.add(blade);
        }
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), accent);
        lamp.position.set(0, 1.2, 0);
        group.add(lamp);
      } else if (kind === 'drop') {
        const platform = new THREE.Group();
        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 3.6), steel);
        bed.position.set(0, -0.3, 0);
        const railL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 3.6), accent);
        railL.position.set(-0.5, -0.12, 0);
        const railR = railL.clone();
        railR.position.x = 0.5;
        platform.add(bed, railL, railR);
        platform.position.y = 0;
        platform.name = 'dropPlatform';
        group.add(platform);
        for (const x of [-1.8, 1.8]) {
          const mast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 8.4, 0.2), steel);
          mast.position.set(x, 3.5, 0);
          group.add(mast);
        }
      } else {
        const pivot = new THREE.Group();
        pivot.name = 'tiltPivot';
        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 4.2), steel);
        bed.position.set(0, -0.28, 1.4);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.1, 0.16), accent);
        edge.position.set(0, -0.12, 3.4);
        pivot.add(bed, edge);
        group.add(pivot);
      }
      this.groups.mechanical.add(group);
      this.mechanicalVisuals.push({
        kind,
        group,
        base: new THREE.Vector3(sample.position.x, sample.position.y, sample.position.z),
        right: new THREE.Vector3(sample.right.x, sample.right.y, sample.right.z),
      });
    }
  }

  private rebuildTrains(): void {
    disposeObject(this.groups.trains);
    this.groups.trains.clear();
    this.carGroups = [];
    if (this.samples.length < 2) return;
    const design = this.trainDesign;
    for (let trainIndex = 0; trainIndex < this.simulation.trains.length; trainIndex++) {
      const cars: THREE.Group[] = [];
      for (let carIndex = 0; carIndex < design.cars; carIndex++) {
        const car = this.createCar(design, carIndex === 0);
        this.groups.trains.add(car);
        cars.push(car);
      }
      this.carGroups.push(cars);
    }
    this.updateTrainTransforms();
  }

  private createCar(design: TrainDesign, front: boolean): THREE.Group {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: design.primaryColor,
      metalness: design.bodyStyle === 'wood' ? 0.1 : 0.58,
      roughness: design.bodyStyle === 'wood' ? 0.82 : 0.32,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: design.secondaryColor,
      metalness: design.bodyStyle === 'wood' ? 0.08 : 0.5,
      roughness: 0.45,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: design.accentColor,
      emissive: design.lighting ? design.accentColor : 0x000000,
      emissiveIntensity: design.lighting ? 1.4 : 0,
      metalness: 0.4,
      roughness: 0.35,
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: design.wheelColor, metalness: 0.85, roughness: 0.35 });
    const seatMat = new THREE.MeshStandardMaterial({
      color:
        design.seatMaterial === 'timber'
          ? '#6b4a2f'
          : design.seatMaterial === 'molded'
            ? design.accentColor
            : design.secondaryColor,
      metalness: design.seatMaterial === 'timber' ? 0.02 : 0.18,
      roughness: design.seatMaterial === 'timber' ? 0.92 : 0.58,
    });
    const width = Math.max(1.6, design.seatsPerRow * 0.52 + 0.34);
    const length = Math.max(2.8, design.rowsPerCar * 1.05 + 1.35);
    const body = new THREE.Mesh(new RoundedBoxGeometry(width, 0.62, length, 2, 0.14), bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    car.add(body);
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.22, length * 0.92), trimMat);
    chassis.position.y = 0.18;
    chassis.castShadow = true;
    car.add(chassis);
    if (design.chassisStyle === 'enclosed') {
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.58, length * 0.84), bodyMat);
        panel.position.set(side * (width / 2 - 0.02), 0.58, 0);
        panel.castShadow = true;
        car.add(panel);
      }
      const roof = new THREE.Mesh(new RoundedBoxGeometry(width * 0.92, 0.16, length * 0.78, 2, 0.06), trimMat);
      roof.position.y = 1.02;
      car.add(roof);
    } else if (design.chassisStyle === 'monocoque') {
      const shell = new THREE.Mesh(new RoundedBoxGeometry(width * 0.96, 0.68, length * 0.96, 2, 0.12), bodyMat);
      shell.position.y = 0.48;
      car.add(shell);
    }
    if (front) {
      const noseMat = design.aeroFairing ? bodyMat : accentMat;
      let nose: THREE.Mesh;
      if (design.noseStyle === 'pointed' || design.noseStyle === 'shark') {
        nose = new THREE.Mesh(new THREE.ConeGeometry(width * 0.38, design.noseStyle === 'shark' ? 1.5 : 1.1, 12), noseMat);
        nose.rotation.x = Math.PI / 2;
        nose.scale.y = design.noseStyle === 'shark' ? 0.62 : 0.8;
      } else if (design.noseStyle === 'flat') {
        nose = new THREE.Mesh(new RoundedBoxGeometry(width * 0.86, 0.5, 0.7, 2, 0.08), noseMat);
      } else {
        nose = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), noseMat);
        nose.scale.set(width * 0.44, 0.3, design.aeroFairing ? 0.95 : 0.42);
      }
      nose.position.set(0, 0.55, length / 2 + 0.22);
      nose.castShadow = true;
      car.add(nose);
    }
    for (let row = 0; row < design.rowsPerCar; row++) {
      const z = (row - (design.rowsPerCar - 1) / 2) * 1.02;
      for (let seat = 0; seat < design.seatsPerRow; seat++) {
        const x = (seat - (design.seatsPerRow - 1) / 2) * 0.5;
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.5), seatMat);
        cushion.position.set(x, 0.86, z - 0.04);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.13), seatMat);
        back.position.set(x, 1.12, z + 0.3);
        back.rotation.x = -0.12;
        car.add(cushion, back);
        if (design.restraint !== 'none') {
          if (design.restraint === 'otsr') {
            const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.07), accentMat);
            leftBar.position.set(x - 0.24, 1.3, z + 0.08);
            const rightBar = leftBar.clone();
            rightBar.position.x = x + 0.24;
            const top = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.08), accentMat);
            top.position.set(x, 1.68, z + 0.08);
            car.add(leftBar, rightBar, top);
          } else if (design.restraint === 'harness') {
            const vest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.55, 0.12), accentMat);
            vest.position.set(x, 1.2, z + 0.18);
            car.add(vest);
          } else {
            const lap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.08), accentMat);
            lap.position.set(x, 1.03, z + 0.02);
            car.add(lap);
          }
        }
      }
      const rowTrim = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.05, 0.05), accentMat);
      rowTrim.position.set(0, 0.8, z - 0.35);
      car.add(rowTrim);
    }
    for (const side of [-1, 1]) {
      for (const z of [-length * 0.3, 0, length * 0.3]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.13, 10), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * (width / 2 + 0.03), design.wheels === 'exposed' ? 0.14 : 0.2, z);
        car.add(wheel);
      }
      if (design.wheels === 'exposed') {
        const bogie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, length * 0.65), wheelMat);
        bogie.position.set(side * (width / 2 - 0.02), 0.2, 0);
        car.add(bogie);
      }
      if (design.lighting) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, length * 0.7), accentMat);
        strip.position.set(side * (width / 2 + 0.01), 0.62, 0);
        car.add(strip);
      }
    }
    if (design.bodyStyle === 'invert') {
      for (const x of [-width * 0.3, width * 0.3]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.12), trimMat);
        arm.position.set(x, 0.05, 0);
        car.add(arm);
      }
    }
    return car;
  }

  private updateTrainTransforms(): void {
    if (!this.samples.length) return;
    const design = this.trainDesign;
    const carSpacing = Math.max(3.2, design.rowsPerCar * 1.05 + 1.6);
    const hanging = design.bodyStyle === 'invert' || design.bodyStyle === 'flying';
    for (let trainIndex = 0; trainIndex < this.simulation.trains.length; trainIndex++) {
      const train = this.simulation.trains[trainIndex];
      const cars = this.carGroups[trainIndex];
      if (!cars) continue;
      for (let carIndex = 0; carIndex < cars.length; carIndex++) {
        const sample = sampleAtDistance(this.samples, train.s - carIndex * carSpacing);
        if (!sample) continue;
        const car = cars[carIndex];
        const bodyOffset = hanging ? -1.05 : 0.32;
        car.position.set(
          sample.position.x + sample.up.x * bodyOffset,
          sample.position.y + sample.up.y * bodyOffset,
          sample.position.z + sample.up.z * bodyOffset,
        );
        car.quaternion.copy(basisQuaternion(sample));
        if (hanging) car.rotateZ(Math.PI);
        car.visible = trainIndex === 0 || train.state !== 'stopped' || trainIndex < 1;
      }
    }
  }

  private updateStationGate(dt: number): void {
    if (!this.stationGate) return;
    const train = this.simulation.trains[0];
    const open = Boolean(train && (train.state === 'stopped' || train.state === 'arriving'));
    const target = open ? -1.2 : -0.35;
    this.stationGate.position.y += (target - this.stationGate.position.y) * Math.min(1, dt * 5);
  }

  private updateRideCamera(): void {
    if (this.rideCamera === 'free') return;
    const train = this.simulation.trains[0];
    if (!train) return;
    const camera = this.activeCamera;
    const design = this.trainDesign;
    const carSpacing = Math.max(3.2, design.rowsPerCar * 1.05 + 1.6);
    const sample = sampleAtDistance(this.samples, train.s);
    if (!sample) return;

    if (this.rideCamera === 'side') {
      camera.position.set(
        sample.position.x + sample.right.x * 14 + sample.up.x * 5,
        sample.position.y + sample.right.y * 14 + sample.up.y * 5,
        sample.position.z + sample.right.z * 14 + sample.up.z * 5,
      );
      camera.lookAt(
        sample.position.x + sample.up.x * 1.1,
        sample.position.y + sample.up.y * 1.1,
        sample.position.z + sample.up.z * 1.1,
      );
      return;
    }

    if (this.rideCamera === 'trackside') {
      const total = Math.max(1, this.simulation.length);
      const difference = Math.abs(train.s - this.tracksideDistance);
      if (this.tracksideDistance === 0 || Math.min(difference, total - difference) > 62) {
        this.tracksideDistance = (train.s + 26) % total;
      }
      const fixed = sampleAtDistance(this.samples, this.tracksideDistance);
      if (fixed) {
        camera.position.set(
          fixed.position.x + fixed.right.x * 13 + fixed.up.x * 3.2,
          fixed.position.y + fixed.right.y * 13 + fixed.up.y * 3.2,
          fixed.position.z + fixed.right.z * 13 + fixed.up.z * 3.2,
        );
        camera.lookAt(
          sample.position.x + sample.up.x * 1.1,
          sample.position.y + sample.up.y * 1.1,
          sample.position.z + sample.up.z * 1.1,
        );
      }
      return;
    }

    const offsetCars =
      this.rideCamera === 'rear'
        ? design.cars - 1
        : this.rideCamera === 'passenger'
          ? Math.max(0, Math.floor((design.cars - 1) / 2))
          : 0;
    const rideSample = sampleAtDistance(this.samples, train.s - offsetCars * carSpacing) ?? sample;
    const height = this.rideCamera === 'rear' ? 1.35 : 1.18;
    camera.position.set(
      rideSample.position.x + rideSample.up.x * height,
      rideSample.position.y + rideSample.up.y * height,
      rideSample.position.z + rideSample.up.z * height,
    );
    const ahead = sampleAtDistance(this.samples, train.s + (this.rideCamera === 'rear' ? 5 : 10));
    if (ahead) {
      camera.lookAt(
        ahead.position.x + ahead.up.x * 0.8,
        ahead.position.y + ahead.up.y * 0.8,
        ahead.position.z + ahead.up.z * 0.8,
      );
    }
  }

  private updateMechanicalVisuals(time: number): void {
    const snapshot = this.mechanics.snapshot();
    for (const visual of this.mechanicalVisuals) {
      if (visual.kind === 'transfer') {
        const offset = Math.sin(snapshot.transfer.progress * Math.PI) * 5.4;
        visual.group.position.copy(visual.base).addScaledVector(visual.right, offset);
      } else if (visual.kind === 'drop') {
        const platform = visual.group.getObjectByName('dropPlatform');
        if (platform) platform.position.y = -snapshot.drop.progress * 6;
      } else if (visual.kind === 'tilt') {
        const pivot = visual.group.getObjectByName('tiltPivot');
        if (pivot) pivot.rotation.x = -snapshot.tilt.progress * (Math.PI / 2);
      } else if (visual.kind === 'switch') {
        visual.group.rotation.z = Math.sin(time * 1.2) * 0.01;
      }
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    const index = this.pickNode(event);
    if (index >= 0) {
      event.stopPropagation();
      this.setSelected(index);
      this.callbacks.onSelectPoint(index);
      const point = this.project.points[index];
      this.selectedDrag = { index, moved: false, position: { ...point.position } };
      this.activeControls.enabled = false;
      this.renderer.domElement.setPointerCapture?.(event.pointerId);
      return;
    }
    if (this.tool === 'add') {
      const ground = this.pickGround(event);
      if (ground) {
        event.stopPropagation();
        const last = this.project.points[this.project.points.length - 1];
        this.callbacks.onAddPoint({ x: ground.x, y: last ? last.position.y : 4, z: ground.z });
      }
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.selectedDrag) return;
    event.stopPropagation();
    const ground = this.pickGround(event, this.selectedDrag.position.y);
    if (!ground) return;
    this.selectedDrag.moved = true;
    let next = { x: ground.x, y: this.selectedDrag.position.y, z: ground.z };
    // Magnetic endpoint snapping makes it possible to weld sections precisely.
    const threshold = Math.max(1.2, this.snap * 2);
    for (let index = 0; index < this.project.points.length; index++) {
      if (index === this.selectedDrag.index) continue;
      const candidate = this.project.points[index].position;
      if (Math.abs(candidate.y - next.y) > 2.5) continue;
      if (Math.hypot(candidate.x - next.x, candidate.z - next.z) > threshold) continue;
      next = { x: candidate.x, y: candidate.y, z: candidate.z };
      break;
    }
    this.selectedDrag.position = next;
    const marker = this.nodeMeshes[this.selectedDrag.index];
    if (marker) marker.position.set(next.x, next.y + 0.35, next.z);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.selectedDrag) return;
    event.stopPropagation();
    const drag = this.selectedDrag;
    this.selectedDrag = null;
    this.activeControls.enabled = !this.onboard;
    try {
      this.renderer.domElement.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
    if (drag.moved) this.callbacks.onMovePoint(drag.index, drag.position);
  };

  private pickNode(event: PointerEvent): number {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(_ndc, this.activeCamera);
    const hits = this.raycaster.intersectObjects(this.nodeMeshes, false);
    return hits.length ? Number(hits[0].object.userData.pointIndex ?? -1) : -1;
  }

  private pickGround(event: PointerEvent, height = 0): { x: number; z: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(_ndc, this.activeCamera);
    _plane.constant = -height;
    if (!this.raycaster.ray.intersectPlane(_plane, _hit)) return null;
    const snap = this.snap > 0 ? this.snap : 0;
    const x = snap > 0 ? Math.round(_hit.x / snap) * snap : _hit.x;
    const z = snap > 0 ? Math.round(_hit.z / snap) * snap : _hit.z;
    return { x, z };
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.animationFrame = requestAnimationFrame(this.animate);
    const now = performance.now();
    const frameDt = Math.min(0.25, Math.max(0, (now - this.lastFrameTime) / 1000));
    const dt = Math.min(0.05, frameDt);
    this.lastFrameTime = now;
    if (this.playing) {
      this.simulation.step(dt);
      for (const train of this.simulation.trains) {
        this.mechanics.senseTrain(train.id, train.s, this.samples);
        const previous = this.previousTrainStates[train.id];
        if (train.state === 'stopped' && previous && previous !== 'stopped') {
          this.mechanics.handleTrainArrival();
        }
        this.previousTrainStates[train.id] = train.state;
      }
      if (this.autoDispatch) {
        this.autoTimer += dt;
        if (this.autoTimer > 4.5) {
          for (const train of this.simulation.trains) {
            if (train.state === 'stopped' && this.mechanics.canDispatch(train.id, train.s)) {
              this.simulation.dispatch(train.id);
              this.autoTimer = 0;
              break;
            }
          }
        }
      }
      const telemetry = this.simulation.telemetry(0);
      this.audio.update(telemetry?.speedKmh ?? 0, telemetry?.section ?? 'track');
      this.updateTrainTransforms();
      this.updateRideCamera();
    } else {
      this.audio.update(0, 'track');
    }
    // Mechanical rigs can be cycled from the panel even while the ride is paused.
    this.mechanics.update(frameDt);
    this.updateMechanicalVisuals(now / 1000);
    this.updateStationGate(dt);
    if (this.rideCamera === 'free') this.activeControls.update();
    this.renderer.render(this.scene, this.activeCamera);

    if (now - this.lastTelemetryAt > 180) {
      this.lastTelemetryAt = now;
      const telemetry = this.simulation.telemetry(0);
      if (telemetry) {
        this.callbacks.onTelemetry(
          telemetry,
          this.mechanics.snapshot(),
          computeTrackStats(this.samples, this.project.points.length),
        );
      }
    }
  };

  private resize(): void {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.orthoCamera.left = (-this.orthoViewSize * aspect) / 2;
    this.orthoCamera.right = (this.orthoViewSize * aspect) / 2;
    this.orthoCamera.top = this.orthoViewSize / 2;
    this.orthoCamera.bottom = -this.orthoViewSize / 2;
    this.orthoCamera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.boundPointerDown, true);
    this.renderer.domElement.removeEventListener('pointermove', this.boundPointerMove, true);
    this.renderer.domElement.removeEventListener('pointerup', this.boundPointerUp, true);
    this.renderer.domElement.removeEventListener('pointercancel', this.boundPointerUp, true);
    this.controls.dispose();
    this.orthoControls.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
        object.geometry?.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    void this.audio.dispose();
  }
}
