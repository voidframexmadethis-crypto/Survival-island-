import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import {
  CustomModAsset,
  CustomModScript,
  ItemId,
  ModExportBundle,
  ModGameplayTweaks,
  ModSystemSnapshot,
  WeatherType,
} from '../types';

export const DEFAULT_MOD_TWEAKS: ModGameplayTweaks = {
  moveSpeedMultiplier: 1.0,
  gravityMultiplier: 1.0,
  damageMultiplier: 1.0,
  dayLengthMultiplier: 1.0,
  jumpMultiplier: 1.0,
  gatherYieldMultiplier: 1.0,
  vehicleSpeedMultiplier: 1.0,
};

export interface ModRuntimeHooks {
  toast: (msg: string, tone?: 'gain' | 'craft' | 'warning' | 'discovery' | 'info') => void;
  giveItem: (itemId: ItemId, qty: number) => void;
  spawnCreature: (species: string) => void;
  setWeather: (weather: WeatherType) => void;
  setTime: (timeOfDay: number) => void;
  getPlayerPos: () => { x: number; y: number; z: number };
  onTweaksUpdated: (tweaks: ModGameplayTweaks) => void;
}

export interface LoadedAssetEntry {
  meta: CustomModAsset;
  root: THREE.Group;
}

export const STARTER_MOD_PRESETS: {
  id: string;
  name: string;
  description: string;
  tweaks?: Partial<ModGameplayTweaks>;
  code?: string;
}[] = [
  {
    id: 'moon_gravity',
    name: 'Moon Island Low-Gravity',
    description: '0.45x gravity, 1.45x jump power & fast sprint across island cliffs.',
    tweaks: {
      gravityMultiplier: 0.45,
      jumpMultiplier: 1.45,
      moveSpeedMultiplier: 1.35,
    },
  },
  {
    id: 'turbo_survival',
    name: 'Turbo Expedition 2x',
    description: 'Double movement speed, double vehicle top speed, 2x gather yield & 1.5x damage.',
    tweaks: {
      moveSpeedMultiplier: 1.8,
      vehicleSpeedMultiplier: 1.8,
      gatherYieldMultiplier: 2.0,
      damageMultiplier: 1.5,
    },
  },
  {
    id: 'golden_hour_script',
    name: 'Eternal Golden Sunset (Script)',
    description: 'Locks island sky to warm cinematic golden hour and boosts vehicle speed.',
    code: `// Mod API available: api.setTime(0..1), api.setWeather('clear'|'rain'|'storm'), api.setTweaks({...}), api.toast(msg)\napi.setTweaks({ vehicleSpeedMultiplier: 1.4 });\napi.setWeather('clear');\napi.setTime(0.68);\napi.toast('Eternal Golden Sunset mod activated!');`,
  },
];

export class ModSystemManager {
  public tweaks: ModGameplayTweaks = { ...DEFAULT_MOD_TWEAKS };
  public assets: LoadedAssetEntry[] = [];
  public scripts: CustomModScript[] = [];

  private tickHandlers = new Map<string, (dt: number) => void>();
  private gltfLoader = new GLTFLoader();
  private objLoader = new OBJLoader();
  private hooks: ModRuntimeHooks;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, hooks: ModRuntimeHooks) {
    this.scene = scene;
    this.hooks = hooks;
  }

  public getSnapshot(): ModSystemSnapshot {
    return {
      tweaks: { ...this.tweaks },
      assets: this.assets.map((a) => ({ ...a.meta })),
      scripts: this.scripts.map((s) => ({ ...s })),
    };
  }

  public setTweaks(partial: Partial<ModGameplayTweaks>): void {
    this.tweaks = {
      moveSpeedMultiplier: THREE.MathUtils.clamp(
        partial.moveSpeedMultiplier ?? this.tweaks.moveSpeedMultiplier,
        0.3,
        3.5,
      ),
      gravityMultiplier: THREE.MathUtils.clamp(
        partial.gravityMultiplier ?? this.tweaks.gravityMultiplier,
        0.15,
        3.0,
      ),
      damageMultiplier: THREE.MathUtils.clamp(
        partial.damageMultiplier ?? this.tweaks.damageMultiplier,
        0.2,
        6.0,
      ),
      dayLengthMultiplier: THREE.MathUtils.clamp(
        partial.dayLengthMultiplier ?? this.tweaks.dayLengthMultiplier,
        0.2,
        5.0,
      ),
      jumpMultiplier: THREE.MathUtils.clamp(
        partial.jumpMultiplier ?? this.tweaks.jumpMultiplier,
        0.4,
        2.8,
      ),
      gatherYieldMultiplier: THREE.MathUtils.clamp(
        partial.gatherYieldMultiplier ?? this.tweaks.gatherYieldMultiplier,
        1,
        5,
      ),
      vehicleSpeedMultiplier: THREE.MathUtils.clamp(
        partial.vehicleSpeedMultiplier ?? this.tweaks.vehicleSpeedMultiplier,
        0.4,
        3.0,
      ),
    };
    this.hooks.onTweaksUpdated(this.tweaks);
  }

  public resetTweaks(): void {
    this.tweaks = { ...DEFAULT_MOD_TWEAKS };
    this.hooks.onTweaksUpdated(this.tweaks);
  }

  private normalizeAndGroundModel(
    rawRoot: THREE.Object3D,
    targetMaxDim = 2.6,
  ): { root: THREE.Group; meshCount: number } {
    const wrapper = new THREE.Group();
    const container = new THREE.Group();
    container.add(rawRoot);

    let meshCount = 0;
    rawRoot.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount += 1;
        child.castShadow = true;
        child.receiveShadow = true;
        if (!child.material) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xd6d3d1,
            roughness: 0.6,
            metalness: 0.2,
          });
        }
      }
    });

    rawRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rawRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const fitScale = targetMaxDim / maxDim;

    rawRoot.position.set(-center.x, -box.min.y, -center.z);
    container.scale.setScalar(fitScale);
    wrapper.add(container);

    return { root: wrapper, meshCount };
  }

  public async importModelFromFile(
    file: File,
    x: number,
    y: number,
    z: number,
    yaw = 0,
  ): Promise<CustomModAsset> {
    const lower = file.name.toLowerCase();
    const format: CustomModAsset['format'] = lower.endsWith('.obj')
      ? 'obj'
      : lower.endsWith('.gltf')
        ? 'gltf'
        : 'glb';

    let loadedObj: THREE.Object3D;
    if (format === 'obj') {
      const text = await file.text();
      loadedObj = this.objLoader.parse(text);
    } else {
      const url = URL.createObjectURL(file);
      try {
        const gltf = await this.gltfLoader.loadAsync(url);
        loadedObj = gltf.scene;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    const { root, meshCount } = this.normalizeAndGroundModel(loadedObj);
    root.position.set(x, y, z);
    root.rotation.y = yaw;
    this.scene.add(root);

    const meta: CustomModAsset = {
      id: `mod_asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      format,
      sourceType: 'file',
      x,
      y,
      z,
      scale: 1,
      rotationY: yaw,
      meshCount,
    };
    this.assets.push({ meta, root });
    this.hooks.toast(`Imported 3D Model "${file.name}" (${meshCount} meshes)`, 'craft');
    return meta;
  }

  public async importModelFromUrl(
    url: string,
    x: number,
    y: number,
    z: number,
    yaw = 0,
  ): Promise<CustomModAsset> {
    const cleanUrl = url.trim();
    if (!cleanUrl) throw new Error('Model URL is empty');
    const lower = cleanUrl.toLowerCase().split('?')[0];
    const format: CustomModAsset['format'] = lower.endsWith('.obj')
      ? 'obj'
      : lower.endsWith('.gltf')
        ? 'gltf'
        : 'glb';

    const loadedObj =
      format === 'obj'
        ? await this.objLoader.loadAsync(cleanUrl)
        : (await this.gltfLoader.loadAsync(cleanUrl)).scene;

    const fileName = cleanUrl.split('/').pop()?.split('?')[0] || `custom.${format}`;
    const { root, meshCount } = this.normalizeAndGroundModel(loadedObj);
    root.position.set(x, y, z);
    root.rotation.y = yaw;
    this.scene.add(root);

    const meta: CustomModAsset = {
      id: `mod_asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: fileName,
      format,
      sourceType: 'url',
      sourceUrl: cleanUrl,
      x,
      y,
      z,
      scale: 1,
      rotationY: yaw,
      meshCount,
    };
    this.assets.push({ meta, root });
    this.hooks.toast(`Loaded 3D Asset "${fileName}" from URL`, 'craft');
    return meta;
  }

  public updateAssetTransform(
    assetId: string,
    patch: { scale?: number; rotationY?: number },
  ): void {
    const entry = this.assets.find((a) => a.meta.id === assetId);
    if (!entry) return;
    if (patch.scale !== undefined) {
      const s = THREE.MathUtils.clamp(patch.scale, 0.2, 8);
      entry.meta.scale = s;
      entry.root.scale.setScalar(s);
    }
    if (patch.rotationY !== undefined) {
      entry.meta.rotationY = patch.rotationY;
      entry.root.rotation.y = patch.rotationY;
    }
  }

  public removeAsset(assetId: string): void {
    const idx = this.assets.findIndex((a) => a.meta.id === assetId);
    if (idx === -1) return;
    const entry = this.assets[idx];
    this.assets.splice(idx, 1);
    this.scene.remove(entry.root);
    entry.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m) m.dispose();
        }
      }
    });
  }

  public async loadScriptFromUrl(url: string, name?: string): Promise<CustomModScript> {
    const cleanUrl = url.trim();
    const res = await fetch(cleanUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching mod script`);
    const code = await res.text();
    const modName =
      name?.trim() || cleanUrl.split('/').pop()?.split('?')[0] || 'Remote Script Mod';
    return this.addAndRunScript(modName, code, cleanUrl);
  }

  public addAndRunScript(
    name: string,
    code: string,
    sourceUrl?: string,
  ): CustomModScript {
    const script: CustomModScript = {
      id: `mod_script_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || 'Custom Mod Script',
      sourceUrl,
      code,
      enabled: true,
    };
    this.scripts.push(script);
    this.executeScript(script);
    return script;
  }

  public toggleScript(scriptId: string, enabled: boolean): void {
    const script = this.scripts.find((s) => s.id === scriptId);
    if (!script) return;
    script.enabled = enabled;
    if (!enabled) {
      this.tickHandlers.delete(scriptId);
    } else {
      this.executeScript(script);
    }
  }

  public removeScript(scriptId: string): void {
    this.tickHandlers.delete(scriptId);
    this.scripts = this.scripts.filter((s) => s.id !== scriptId);
  }

  public tick(dt: number): void {
    for (const [scriptId, fn] of this.tickHandlers.entries()) {
      try {
        fn(dt);
      } catch (err) {
        const s = this.scripts.find((x) => x.id === scriptId);
        if (s) s.lastError = err instanceof Error ? err.message : String(err);
        this.tickHandlers.delete(scriptId);
      }
    }
  }

  private executeScript(script: CustomModScript): void {
    this.tickHandlers.delete(script.id);
    script.lastError = undefined;
    const api = {
      setTweaks: (partial: Partial<ModGameplayTweaks>) => this.setTweaks(partial),
      getTweaks: () => ({ ...this.tweaks }),
      toast: (msg: string) => this.hooks.toast(String(msg), 'discovery'),
      giveItem: (itemId: ItemId, qty = 1) => this.hooks.giveItem(itemId, qty),
      spawnCreature: (species: string) => this.hooks.spawnCreature(species),
      setWeather: (weather: WeatherType) => this.hooks.setWeather(weather),
      setTime: (timeOfDay: number) => this.hooks.setTime(timeOfDay),
      getPlayerPos: () => this.hooks.getPlayerPos(),
      onTick: (fn: (dt: number) => void) => {
        if (typeof fn === 'function') {
          this.tickHandlers.set(script.id, fn);
        }
      },
    };
    try {
      const runner = new Function('api', `'use strict';\n${script.code}`);
      runner(api);
    } catch (err) {
      script.lastError = err instanceof Error ? err.message : String(err);
      this.hooks.toast(`Mod script "${script.name}" error: ${script.lastError}`, 'warning');
    }
  }

  public applyBundle(bundle: ModExportBundle): void {
    if (bundle.tweaks) {
      this.setTweaks(bundle.tweaks);
    }
    if (Array.isArray(bundle.scripts)) {
      for (const s of bundle.scripts) {
        const created = this.addAndRunScript(s.name, s.code, s.sourceUrl);
        if (!s.enabled) this.toggleScript(created.id, false);
      }
    }
  }

  public dispose(): void {
    this.tickHandlers.clear();
    for (const a of [...this.assets]) {
      this.removeAsset(a.meta.id);
    }
  }
}
