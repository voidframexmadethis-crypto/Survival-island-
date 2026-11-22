import { newId, createDefaultTrain } from './track';
import { validateTrainDesign } from './trainDesigner';
import type { CoasterProject, TrackPoint, TrackPointKind, TrainDesign } from './types';

export const STORAGE_PREFIX = 'si_ultimate_coaster_studio_v1';
export const PROJECTS_KEY = `${STORAGE_PREFIX}:projects`;
export const DRAFT_KEY = `${STORAGE_PREFIX}:draft`;
export const TRAINS_KEY = `${STORAGE_PREFIX}:trains`;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

const POINT_KINDS: TrackPointKind[] = [
  'track',
  'station',
  'chain_lift',
  'cable_lift',
  'launch',
  'brake',
  'block_brake',
  'magnetic_brake',
  'transfer',
  'switch',
  'drop',
  'tilt',
];

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  pointCount: number;
  lengthHint: number;
}

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safePoint(raw: unknown, index: number): TrackPoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const point = raw as Partial<TrackPoint>;
  const position = point.position as { x?: unknown; y?: unknown; z?: unknown } | undefined;
  if (!position) return null;
  const kind = POINT_KINDS.includes(point.kind as TrackPointKind) ? (point.kind as TrackPointKind) : 'track';
  return {
    id: typeof point.id === 'string' && point.id ? point.id : `pt_imported_${index}`,
    position: { x: finite(position.x), y: finite(position.y, 4), z: finite(position.z) },
    bank: finite(point.bank, 0),
    kind,
    element: typeof point.element === 'string' ? (point.element as TrackPoint['element']) : undefined,
    targetSpeed: point.targetSpeed === undefined ? undefined : finite(point.targetSpeed),
  };
}

export function sanitizeProject(raw: unknown): CoasterProject {
  if (!raw || typeof raw !== 'object') throw new Error('Project data is not an object.');
  const source = raw as Partial<CoasterProject>;
  if (!Array.isArray(source.points)) throw new Error('Project is missing track points.');
  const points = source.points
    .slice(0, 500)
    .map((point, index) => safePoint(point, index))
    .filter((point): point is TrackPoint => point !== null);
  if (points.length < 2) throw new Error('Project needs at least two valid track points.');
  const train: TrainDesign = validateTrainDesign({
    ...createDefaultTrain(),
    ...(source.train && typeof source.train === 'object' ? (source.train as TrainDesign) : {}),
    prompt: source.train?.prompt ?? '',
  });
  const now = Date.now();
  return {
    schemaVersion: 1,
    id: typeof source.id === 'string' && source.id ? source.id : newId('project'),
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 80) : 'Imported Coaster',
    createdAt: finite(source.createdAt, now),
    updatedAt: finite(source.updatedAt, now),
    points,
    closed: Boolean(source.closed),
    autoBank: source.autoBank !== false,
    trackColor: /^#[0-9a-f]{6}$/i.test(source.trackColor ?? '') ? source.trackColor! : '#dbe3ea',
    supportColor: /^#[0-9a-f]{6}$/i.test(source.supportColor ?? '') ? source.supportColor! : '#5d6a72',
    train,
    trainCount: Math.min(3, Math.max(1, Math.round(finite(source.trainCount, 1)))),
  };
}

export class CoasterProjectStore {
  constructor(private readonly storage: StorageLike) {}

  private readArray<T>(key: string): T[] {
    try {
      const raw = this.storage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  list(): ProjectSummary[] {
    return this.readArray<CoasterProject>(PROJECTS_KEY)
      .map((project) => {
        try {
          const safe = sanitizeProject(project);
          return {
            id: safe.id,
            name: safe.name,
            updatedAt: safe.updatedAt,
            pointCount: safe.points.length,
            lengthHint: safe.points.length,
          };
        } catch {
          return null;
        }
      })
      .filter((summary): summary is ProjectSummary => summary !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  load(id: string): CoasterProject | null {
    const projects = this.readArray<CoasterProject>(PROJECTS_KEY);
    const found = projects.find((project) => project.id === id);
    if (!found) return null;
    try {
      return sanitizeProject(found);
    } catch {
      return null;
    }
  }

  save(project: CoasterProject): CoasterProject {
    const safe = sanitizeProject({ ...project, updatedAt: Date.now() });
    const projects = this.readArray<CoasterProject>(PROJECTS_KEY).filter((p) => p.id !== safe.id);
    projects.push(safe);
    this.storage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(-40)));
    return safe;
  }

  remove(id: string): void {
    const projects = this.readArray<CoasterProject>(PROJECTS_KEY).filter((project) => project.id !== id);
    this.storage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }

  duplicate(id: string): CoasterProject | null {
    const source = this.load(id);
    if (!source) return null;
    const now = Date.now();
    const copy: CoasterProject = {
      ...source,
      id: newId('project'),
      name: `${source.name} Copy`,
      createdAt: now,
      updatedAt: now,
      points: source.points.map((point) => ({ ...point, id: newId('pt'), position: { ...point.position } })),
    };
    return this.save(copy);
  }

  exportJson(project: CoasterProject): string {
    return JSON.stringify({ format: STORAGE_PREFIX, project }, null, 2);
  }

  importJson(text: string): CoasterProject {
    const parsed = JSON.parse(text) as { project?: unknown } | CoasterProject;
    const candidate = parsed && typeof parsed === 'object' && 'project' in parsed ? parsed.project : parsed;
    const safe = sanitizeProject(candidate);
    safe.id = newId('project');
    safe.name = `${safe.name} (Imported)`;
    safe.createdAt = Date.now();
    safe.updatedAt = Date.now();
    return safe;
  }

  saveDraft(project: CoasterProject): void {
    try {
      this.storage.setItem(DRAFT_KEY, JSON.stringify({ updatedAt: Date.now(), project }));
    } catch {
      // Storage can be full or disabled; the studio still works in memory.
    }
  }

  loadDraft(): CoasterProject | null {
    try {
      const raw = this.storage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { project?: unknown };
      return parsed.project ? sanitizeProject(parsed.project) : null;
    } catch {
      return null;
    }
  }

  clearDraft(): void {
    this.storage.removeItem(DRAFT_KEY);
  }

  listTrains(): TrainDesign[] {
    return this.readArray<TrainDesign>(TRAINS_KEY)
      .map((design) => {
        try {
          return validateTrainDesign(design);
        } catch {
          return null;
        }
      })
      .filter((design): design is TrainDesign => design !== null);
  }

  saveTrain(design: TrainDesign): TrainDesign {
    const safe = validateTrainDesign(design);
    const trains = this.listTrains().filter((train) => train.id !== safe.id);
    trains.push(safe);
    this.storage.setItem(TRAINS_KEY, JSON.stringify(trains.slice(-20)));
    return safe;
  }

  removeTrain(id: string): void {
    this.storage.setItem(TRAINS_KEY, JSON.stringify(this.listTrains().filter((train) => train.id !== id)));
  }
}
