import * as THREE from 'three';

const MAX_RAIN_STREAKS = 1400;
const MAX_SPLASH_RINGS = 140;

const RAIN_STREAK_VERTEX = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec2 aParams; // x = speed multiplier, y = length multiplier

  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uFallSpeed;
  uniform float uWindX;
  uniform float uWindZ;
  uniform float uAreaSize;
  uniform float uHeightSpan;

  varying vec2 vUv;
  varying float vFade;

  void main() {
    vUv = uv;

    // 100% GPU-driven wrapping fall position around camera/ship center
    float fallDist = uTime * uFallSpeed * aParams.x;
    float y = mod(aOffset.y - fallDist, uHeightSpan);
    float driftX = uTime * uWindX * aParams.x;
    float driftZ = uTime * uWindZ * aParams.x;

    vec3 localPos = vec3(
      mod(aOffset.x + driftX + uAreaSize * 0.5, uAreaSize) - uAreaSize * 0.5,
      y,
      mod(aOffset.z + driftZ + uAreaSize * 0.5, uAreaSize) - uAreaSize * 0.5
    );

    vec3 worldCenter = uCenter + localPos;

    // Distance fade so rain seamlessly wraps without harsh edges
    float horizDist = length(localPos.xz) / (uAreaSize * 0.5);
    float topFade = smoothstep(uHeightSpan, uHeightSpan - 2.6, y);
    float botFade = smoothstep(0.0, 1.4, y);
    vFade = (1.0 - smoothstep(0.55, 1.0, horizDist)) * topFade * botFade;

    // Velocity-aligned rain streak direction (slanted by wind)
    vec3 streakDir = normalize(vec3(uWindX, -uFallSpeed * aParams.x, uWindZ));
    vec3 toCam = normalize(cameraPosition - worldCenter);
    vec3 rightAxis = normalize(cross(toCam, streakDir));

    float streakWidth = 0.022;
    float streakLength = 0.95 * aParams.y;

    vec3 vertexPos = worldCenter
      + rightAxis * (position.x * streakWidth)
      + streakDir * (position.y * streakLength);

    gl_Position = projectionMatrix * viewMatrix * vec4(vertexPos, 1.0);
  }
`;

const RAIN_STREAK_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vFade;

  void main() {
    // Crisp center core + tapered soft tail & bright leading droplet head
    float center = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float core = pow(clamp(center, 0.0, 1.0), 1.8);
    float head = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.12, vUv.y);
    float tipHighlight = smoothstep(0.75, 1.0, vUv.y) * 0.45;
    float alpha = (core * head + tipHighlight * core) * uOpacity * vFade;
    if (alpha < 0.015) discard;
    vec3 col = uColor + vec3(0.22) * tipHighlight;
    gl_FragColor = vec4(col, alpha);
  }
`;

const RAIN_SPLASH_VERTEX = /* glsl */ `
  attribute vec3 aSplashPos; // x, z offset around center; y = phase offset

  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uGroundY;

  varying vec2 vUv;
  varying float vLife;

  void main() {
    vUv = uv;
    float life = fract(uTime * 1.9 + aSplashPos.y);
    vLife = life;

    float radius = mix(0.06, 0.42, life);
    vec3 worldPos = vec3(
      uCenter.x + aSplashPos.x + position.x * radius,
      uGroundY + 0.05,
      uCenter.z + aSplashPos.z + position.y * radius
    );

    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const RAIN_SPLASH_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vLife;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);
    // Expanding thin concentric ripple ring
    float ring = smoothstep(0.55, 0.78, d) * (1.0 - smoothstep(0.82, 1.0, d));
    float fade = (1.0 - vLife) * smoothstep(0.0, 0.15, vLife);
    float alpha = ring * fade * uOpacity;
    if (alpha < 0.015) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export class RealisticRainSystem {
  public readonly group = new THREE.Group();
  private readonly streakGeo: THREE.InstancedBufferGeometry;
  private readonly streakMat: THREE.ShaderMaterial;
  private readonly streakMesh: THREE.Mesh;

  private readonly splashGeo: THREE.InstancedBufferGeometry;
  private readonly splashMat: THREE.ShaderMaterial;
  private readonly splashMesh: THREE.Mesh;

  private readonly areaSize = 38;
  private readonly heightSpan = 22;

  constructor() {
    // 1. Volumetric GPU-animated rain streaks (1 draw call, 0 CPU updates)
    const baseQuad = new THREE.PlaneGeometry(1, 1);
    this.streakGeo = new THREE.InstancedBufferGeometry();
    this.streakGeo.index = baseQuad.index;
    this.streakGeo.attributes.position = baseQuad.attributes.position;
    this.streakGeo.attributes.uv = baseQuad.attributes.uv;
    baseQuad.dispose();

    const offsets = new Float32Array(MAX_RAIN_STREAKS * 3);
    const params = new Float32Array(MAX_RAIN_STREAKS * 2);
    for (let i = 0; i < MAX_RAIN_STREAKS; i++) {
      offsets[i * 3] = (Math.random() - 0.5) * this.areaSize;
      offsets[i * 3 + 1] = Math.random() * this.heightSpan;
      offsets[i * 3 + 2] = (Math.random() - 0.5) * this.areaSize;
      params[i * 2] = 0.8 + Math.random() * 0.55;
      params[i * 2 + 1] = 0.75 + Math.random() * 0.7;
    }
    this.streakGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    this.streakGeo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 2));
    this.streakGeo.instanceCount = MAX_RAIN_STREAKS;

    this.streakMat = new THREE.ShaderMaterial({
      vertexShader: RAIN_STREAK_VERTEX,
      fragmentShader: RAIN_STREAK_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        uFallSpeed: { value: 26.0 },
        uWindX: { value: 3.2 },
        uWindZ: { value: 1.4 },
        uAreaSize: { value: this.areaSize },
        uHeightSpan: { value: this.heightSpan },
        uColor: { value: new THREE.Color(0xdbeafe) },
        uOpacity: { value: 0.42 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    this.streakMesh = new THREE.Mesh(this.streakGeo, this.streakMat);
    this.streakMesh.frustumCulled = false;
    this.streakMesh.renderOrder = 4;

    // 2. GPU-animated ground raindrop splash ripples (1 draw call, 0 CPU updates)
    const splashQuad = new THREE.PlaneGeometry(1, 1);
    this.splashGeo = new THREE.InstancedBufferGeometry();
    this.splashGeo.index = splashQuad.index;
    this.splashGeo.attributes.position = splashQuad.attributes.position;
    this.splashGeo.attributes.uv = splashQuad.attributes.uv;
    splashQuad.dispose();

    const splashPos = new Float32Array(MAX_SPLASH_RINGS * 3);
    for (let i = 0; i < MAX_SPLASH_RINGS; i++) {
      const r = 1.5 + Math.random() * 14.5;
      const a = Math.random() * Math.PI * 2;
      splashPos[i * 3] = Math.cos(a) * r;
      splashPos[i * 3 + 1] = Math.random(); // phase offset
      splashPos[i * 3 + 2] = Math.sin(a) * r;
    }
    this.splashGeo.setAttribute('aSplashPos', new THREE.InstancedBufferAttribute(splashPos, 3));
    this.splashGeo.instanceCount = MAX_SPLASH_RINGS;

    this.splashMat = new THREE.ShaderMaterial({
      vertexShader: RAIN_SPLASH_VERTEX,
      fragmentShader: RAIN_SPLASH_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        uGroundY: { value: 0 },
        uColor: { value: new THREE.Color(0xe0f2fe) },
        uOpacity: { value: 0.36 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.splashMesh = new THREE.Mesh(this.splashGeo, this.splashMat);
    this.splashMesh.frustumCulled = false;
    this.splashMesh.renderOrder = 3;

    this.group.add(this.streakMesh, this.splashMesh);
    this.group.visible = false;
    this.group.userData.ignoreLightingPass = true;
  }

  public update(params: {
    visible: boolean;
    elapsed: number;
    centerX: number;
    centerY: number;
    centerZ: number;
    groundY: number;
    isStorm: boolean;
    isNight: boolean;
    densityScale: number;
    showSplashes: boolean;
  }): void {
    this.group.visible = params.visible;
    if (!params.visible) return;

    const scale = Math.max(0.2, Math.min(1, params.densityScale));
    const stormBoost = params.isStorm ? 1.0 : 0.72;
    this.streakGeo.instanceCount = Math.max(
      180,
      Math.round(MAX_RAIN_STREAKS * scale * stormBoost),
    );
    this.splashGeo.instanceCount = Math.max(
      24,
      Math.round(MAX_SPLASH_RINGS * scale * stormBoost),
    );

    const su = this.streakMat.uniforms;
    su.uTime.value = params.elapsed;
    su.uCenter.value.set(params.centerX, Math.max(0, params.centerY - 6.5), params.centerZ);
    su.uFallSpeed.value = params.isStorm ? 32.0 : 23.0;
    su.uWindX.value = params.isStorm
      ? 6.4 + Math.sin(params.elapsed * 0.7) * 1.8
      : 2.2 + Math.sin(params.elapsed * 0.4) * 0.7;
    su.uWindZ.value = params.isStorm ? 2.6 : 0.9;
    su.uOpacity.value = params.isStorm ? 0.5 : 0.36;
    su.uColor.value.setHex(params.isNight ? 0x93c5fd : 0xe2e8f0);

    this.splashMesh.visible = params.showSplashes;
    if (params.showSplashes) {
      const pu = this.splashMat.uniforms;
      pu.uTime.value = params.elapsed;
      pu.uCenter.value.set(params.centerX, 0, params.centerZ);
      pu.uGroundY.value = params.groundY;
      pu.uOpacity.value = params.isStorm ? 0.42 : 0.28;
    }
  }

  public dispose(): void {
    this.streakGeo.dispose();
    this.streakMat.dispose();
    this.splashGeo.dispose();
    this.splashMat.dispose();
  }
}
