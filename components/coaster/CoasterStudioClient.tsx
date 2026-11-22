'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Box,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Factory,
  Focus,
  FolderOpen,
  Gauge,
  Globe2,
  Grid3x3,
  Layers,
  Loader2,
  Search,
  SlidersHorizontal,
  MousePointer2,
  Move3d,
  Pause,
  Pencil,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Route,
  Save,
  Sparkles,
  Trash2,
  TrainFront,
  Undo2,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
  Wrench,
  Crosshair,
  ChevronLeft,
} from 'lucide-react';
import { CoasterStudioScene, type StudioTool } from '@/game/coaster/scene';
import {
  SECTION_LABELS,
  ELEMENT_LIBRARY,
  appendElement,
  autoBankPoints,
  clamp,
  computeTrackStats,
  createBlankProject,
  dePumpPoints,
  duplicatePoint,
  addManualSupport,
  newId,
  offsetPointLateral,
  projectFromCsv,
  projectToCsv,
  removeManualSupport,
  removePoint,
  sampleTrack,
  segmentLength,
  setSegmentLength,
  updateManualSupport,
  updatePoint,
  validateTrack,
} from '@/game/coaster/track';
import {
  CATALOG_STATS,
  COASTER_TYPES,
  MANUFACTURER_CATEGORIES,
  MANUFACTURERS,
  defaultTrainForType,
  getCoasterType,
  getManufacturer,
  manufacturerSupportsElement,
  manufacturerSupportsType,
  searchManufacturers,
  type ManufacturerCategory,
} from '@/game/coaster/catalog';
import {
  CoasterProjectStore,
  type ProjectSummary,
} from '@/game/coaster/storage';
import {
  HttpTrainDesignProvider,
  TrainDesignService,
  describeTrain,
} from '@/game/coaster/trainDesigner';
import type {
  CameraProjection,
  CoasterElementKind,
  CoasterProject,
  CoasterTypeId,
  EditingMode,
  MechanicalSnapshot,
  RestraintKind,
  RideCameraMode,
  SupportMaterial,
  TrainBodyStyle,
  TrainDesign,
  TrainTelemetry,
  TrackPoint,
  TrackPointKind,
  TrackStats,
  Vec3,
} from '@/game/coaster/types';

type Tab = 'build' | 'elements' | 'catalog' | 'properties' | 'trains' | 'mechanics' | 'test' | 'projects';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'build', label: 'Build', icon: Grid3x3 },
  { key: 'elements', label: 'Elements', icon: Layers },
  { key: 'catalog', label: 'Catalog', icon: Factory },
  { key: 'properties', label: 'Point', icon: Move3d },
  { key: 'trains', label: 'Trains', icon: TrainFront },
  { key: 'mechanics', label: 'Mechanics', icon: Wrench },
  { key: 'test', label: 'Test Ride', icon: Play },
  { key: 'projects', label: 'Projects', icon: FolderOpen },
];

const KINDS: TrackPointKind[] = [
  'track',
  'station',
  'unload_station',
  'storage',
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

const EMPTY_STATS: TrackStats = {
  length: 0,
  maxHeight: 0,
  minHeight: 0,
  inversions: 0,
  maxBank: 0,
  estimatedPeakSpeedKmh: 0,
  estimatedMaxLateralG: 0,
  estimatedMaxVerticalG: 0,
  pointCount: 0,
};

const EMPTY_MECHANICAL: MechanicalSnapshot = {
  transfer: { installed: false, progress: 0, side: 'main' },
  switchTrack: { installed: false, route: 'main', progress: 0 },
  drop: { installed: false, progress: 0, phase: 'up' },
  tilt: { installed: false, progress: 0, phase: 'level' },
  lastAction: 'Idle',
  blockStatus: [],
  dispatchAllowed: true,
  sensors: [],
};

function fmt(value: number, digits = 0): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function fieldClass(): string {
  return 'min-h-[38px] w-full rounded-lg border border-stone-700 bg-stone-950/80 px-2.5 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/15';
}

function smallButton(active = false): string {
  return `inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
    active
      ? 'border-amber-400/80 bg-amber-400/15 text-amber-100'
      : 'border-stone-700 bg-stone-900/80 text-stone-300 hover:border-stone-500 hover:text-stone-100'
  }`;
}

function primaryButton(): string {
  return 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-amber-300/60 bg-amber-400 px-4 py-2 text-sm font-extrabold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40';
}

function secondaryButton(): string {
  return 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-stone-600 bg-stone-900/80 px-4 py-2 text-sm font-bold text-stone-200 transition hover:border-stone-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';
}

export function CoasterStudioClient() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<CoasterStudioScene | null>(null);
  const storeRef = useRef<CoasterProjectStore | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const historyRef = useRef<{ past: CoasterProject[]; future: CoasterProject[] }>({ past: [], future: [] });
  const callbacksRef = useRef<{
    select: (index: number) => void;
    add: (position: Vec3) => void;
    move: (index: number, position: Vec3) => void;
    telemetry: (telemetry: TrainTelemetry, mechanical: MechanicalSnapshot, stats: TrackStats) => void;
  }>({ select: () => {}, add: () => {}, move: () => {}, telemetry: () => {} });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});

  const [project, setProject] = useState<CoasterProject>(() => createBlankProject());
  const projectRef = useRef(project);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('build');
  const [tool, setTool] = useState<StudioTool>('select');
  const [snap, setSnap] = useState(1);
  const [historyCounts, setHistoryCounts] = useState({ past: 0, future: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [savedProjects, setSavedProjects] = useState<ProjectSummary[]>([]);
  const [telemetry, setTelemetry] = useState<TrainTelemetry | null>(null);
  const [mechanical, setMechanical] = useState<MechanicalSnapshot>(EMPTY_MECHANICAL);
  const [stats, setStats] = useState<TrackStats>(EMPTY_STATS);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [autoDispatch, setAutoDispatch] = useState(false);
  const [designPrompt, setDesignPrompt] = useState(project.train.prompt);
  const [design, setDesign] = useState<TrainDesign>(project.train);
  const [trainDesigns, setTrainDesigns] = useState<TrainDesign[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [catalogCategory, setCatalogCategory] = useState<ManufacturerCategory>('united_states');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [projection, setProjectionState] = useState<CameraProjection>(project.camera.projection);
  const [rideCamera, setRideCameraState] = useState<RideCameraMode>(project.camera.rideMode);
  const trainService = useMemo(() => {
    const endpoint = process.env.NEXT_PUBLIC_COASTER_TRAIN_PROVIDER_URL;
    return new TrainDesignService({
      provider: endpoint ? new HttpTrainDesignProvider(endpoint) : undefined,
    });
  }, []);
  const providerLabel = trainService.providerLabel;

  const toast = useCallback((message: string) => {
    setNotice(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotice(null), 3200);
  }, []);

  const refreshProjectList = useCallback(() => {
    setSavedProjects(storeRef.current?.list() ?? []);
    setTrainDesigns(storeRef.current?.listTrains() ?? []);
  }, []);

  const applyProject = useCallback(
    (next: CoasterProject, record = true, nextSelected: string | null = selectedIdRef.current) => {
      if (record) {
        historyRef.current.past.push(projectRef.current);
        if (historyRef.current.past.length > 60) historyRef.current.past.shift();
        historyRef.current.future = [];
      }
      const stamped = { ...next, updatedAt: Date.now() };
      projectRef.current = stamped;
      selectedIdRef.current = nextSelected;
      setProject(stamped);
      setSelectedId(nextSelected);
      setStats(computeTrackStats(sampleTrack(stamped.points, stamped.closed, 10), stamped.points.length));
      sceneRef.current?.setProject(stamped);
      setHistoryCounts({ past: historyRef.current.past.length, future: 0 });
    },
    [],
  );

  useEffect(() => {
    const store = new CoasterProjectStore(window.localStorage);
    storeRef.current = store;
    const timer = setTimeout(() => {
      const draft = store.loadDraft();
      if (draft) {
        projectRef.current = draft;
        setProject(draft);
        setDesign(draft.train);
        setDesignPrompt(draft.train.prompt);
        setProjectionState(draft.camera.projection);
        setRideCameraState(draft.camera.rideMode);
        setStats(computeTrackStats(sampleTrack(draft.points, draft.closed, 10), draft.points.length));
        sceneRef.current?.setProject(draft);
      }
      refreshProjectList();
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshProjectList]);

  useEffect(() => {
    const element = mountRef.current;
    if (!element) return;
    let scene: CoasterStudioScene;
    try {
      scene = new CoasterStudioScene(element, projectRef.current, {
        onSelectPoint: (index) => callbacksRef.current.select(index),
        onAddPoint: (position) => callbacksRef.current.add(position),
        onMovePoint: (index, position) => callbacksRef.current.move(index, position),
        onTelemetry: (nextTelemetry, nextMechanical, nextStats) =>
          callbacksRef.current.telemetry(nextTelemetry, nextMechanical, nextStats),
        onNotice: (message) => toast(message),
      });
    } catch (error) {
      const timer = setTimeout(() => {
        setSceneError(
          error instanceof Error && error.message.includes('WebGL')
            ? 'WebGL could not start in this browser. Enable hardware acceleration or try a WebGL-capable browser to build and ride coasters.'
            : 'The 3D studio could not start. Your saved projects are safe.',
        );
      }, 0);
      return () => clearTimeout(timer);
    }
    sceneRef.current = scene;
    scene.setTool(tool);
    scene.setSnap(snap);
    scene.setProjection(projectRef.current.camera.projection);
    scene.setRideCamera(projectRef.current.camera.rideMode);
    scene.focusTrack();
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // The scene is created once; live options are pushed through its setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(
      () =>
        storeRef.current?.saveDraft({
          ...project,
          camera: sceneRef.current?.getCameraPose() ?? project.camera,
        }),
      650,
    );
    return () => clearTimeout(timer);
  }, [project, hydrated]);

  useEffect(() => {
    sceneRef.current?.setTool(tool);
  }, [tool]);

  useEffect(() => {
    sceneRef.current?.setSnap(snap);
  }, [snap]);

  useEffect(() => {
    const index = project.points.findIndex((point) => point.id === selectedId);
    sceneRef.current?.setSelected(index);
  }, [selectedId, project.points]);

  const undo = () => {
    const previous = historyRef.current.past.pop();
    if (!previous) return;
    historyRef.current.future.push(projectRef.current);
    projectRef.current = previous;
    setProject(previous);
    setSelectedId((id) => (id && previous.points.some((point) => point.id === id) ? id : null));
    setStats(computeTrackStats(sampleTrack(previous.points, previous.closed, 10), previous.points.length));
    sceneRef.current?.setProject(previous);
    setHistoryCounts({ past: historyRef.current.past.length, future: historyRef.current.future.length });
  };

  const redo = () => {
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(projectRef.current);
    projectRef.current = next;
    setProject(next);
    setSelectedId((id) => (id && next.points.some((point) => point.id === id) ? id : null));
    setStats(computeTrackStats(sampleTrack(next.points, next.closed, 10), next.points.length));
    sceneRef.current?.setProject(next);
    setHistoryCounts({ past: historyRef.current.past.length, future: historyRef.current.future.length });
  };

  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redoRef.current();
        else undoRef.current();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redoRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    callbacksRef.current = {
      select: (index) => {
        const point = projectRef.current.points[index];
        if (point) {
          selectedIdRef.current = point.id;
          setSelectedId(point.id);
        }
      },
      add: (position) => {
        const point: TrackPoint = {
          id: newId('pt'),
          position,
          bank: 0,
          kind: 'track',
        };
        const next = { ...projectRef.current, points: [...projectRef.current.points, point], closed: false };
        applyProject(next, true, point.id);
        toast('Control point added. Drag it in the viewport to shape the spline.');
      },
      move: (index, position) => {
        const point = projectRef.current.points[index];
        if (!point) return;
        const points = projectRef.current.points.map((candidate, i) =>
          i === index ? { ...candidate, position } : candidate,
        );
        applyProject({ ...projectRef.current, points }, true, point.id);
      },
      telemetry: (nextTelemetry, nextMechanical, nextStats) => {
        setTelemetry(nextTelemetry);
        setMechanical(nextMechanical);
        setStats(nextStats);
      },
    };
  });

  const samples = useMemo(
    () => sampleTrack(project.points, project.closed, 10),
    [project.points, project.closed],
  );
  const validation = useMemo(
    () => validateTrack(project.points, samples, project.closed),
    [project.points, samples, project.closed],
  );
  const selectedPoint = project.points.find((point) => point.id === selectedId) ?? null;
  const selectedIndex = selectedPoint ? project.points.indexOf(selectedPoint) : -1;
  const canUndo = historyCounts.past > 0;
  const canRedo = historyCounts.future > 0;
  const installs = mechanical;
  const manufacturer = getManufacturer(project.manufacturerId);
  const coasterType = getCoasterType(project.coasterTypeId);
  const isAdvanced = project.editingMode === 'advanced';
  const catalogManufacturers = searchManufacturers(catalogQuery).filter(
    (entry) => entry.category === catalogCategory,
  );
  const typeCompatible = manufacturer ? manufacturerSupportsType(manufacturer, project.coasterTypeId) : true;

  const patchSelected = (patch: Parameters<typeof updatePoint>[2]) => {
    if (!selectedPoint) return;
    const points = updatePoint(project.points, selectedPoint.id, patch);
    applyProject({ ...project, points }, true, selectedPoint.id);
  };

  const addElement = (element: CoasterElementKind) => {
    const points = appendElement(project.points, element);
    const added = points[points.length - 1];
    applyProject({ ...project, points, closed: false }, true, added?.id ?? null);
    toast(`${ELEMENT_LIBRARY.flatMap((group) => group.items).find((item) => item.key === element)?.label ?? element} added. Circuit opened for editing.`);
  };

  const saveProject = () => {
    if (!storeRef.current) return;
    if (
      storeRef.current.exists(project.id) &&
      !window.confirm(`Overwrite the saved coaster “${project.name}”? Your draft remains available.`)
    ) {
      return;
    }
    const withCamera = { ...project, camera: sceneRef.current?.getCameraPose() ?? project.camera };
    const saved = storeRef.current.save(withCamera);
    projectRef.current = saved;
    setProject(saved);
    refreshProjectList();
    toast(`Saved “${saved.name}” to the standalone coaster library.`);
  };

  const saveProjectAs = () => {
    if (!storeRef.current) return;
    const name = window.prompt('Name this coaster project:', `${project.name} II`);
    if (!name?.trim()) return;
    const copy = storeRef.current.save({
      ...project,
      camera: sceneRef.current?.getCameraPose() ?? project.camera,
      id: newId('project'),
      name: name.trim(),
      createdAt: Date.now(),
      points: project.points.map((point) => ({ ...point, id: newId('pt'), position: { ...point.position } })),
    });
    applyProject(copy, false, null);
    refreshProjectList();
    toast(`Created “${copy.name}”.`);
  };

  const newProject = () => {
    if (!window.confirm('Start a new empty coaster project? The current layout stays in Draft autosave until replaced.')) return;
    const blank = createBlankProject();
    historyRef.current = { past: [], future: [] };
    applyProject(blank, false, null);
    setDesign(blank.train);
    setDesignPrompt(blank.train.prompt);
    setProjectionState(blank.camera.projection);
    setRideCameraState(blank.camera.rideMode);
    setIsPlaying(false);
    sceneRef.current?.setProjection(blank.camera.projection);
    sceneRef.current?.setRideCamera(blank.camera.rideMode);
    sceneRef.current?.reset();
    setTab('build');
  };

  const importProject = async (file: File | null) => {
    if (!file || !storeRef.current) return;
    try {
      const imported = storeRef.current.importJson(await file.text());
      applyProject(imported, true, null);
      setDesign(imported.train);
      setDesignPrompt(imported.train.prompt);
      setProjectionState(imported.camera.projection);
      setRideCameraState(imported.camera.rideMode);
      toast(`Imported “${imported.name}”.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not import that project.');
    }
  };

  const exportProject = () => {
    if (!storeRef.current) return;
    const withCamera = { ...project, camera: sceneRef.current?.getCameraPose() ?? project.camera };
    const blob = new Blob([storeRef.current.exportJson(withCamera)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'coaster'}.coaster.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast('Project JSON exported.');
  };

  const exportCsv = () => {
    const blob = new Blob([projectToCsv(project)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'coaster'}-track.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast('Track geometry CSV exported.');
  };

  const importCsv = async (file: File | null) => {
    if (!file) return;
    try {
      const imported = projectFromCsv(projectRef.current, await file.text());
      applyProject(imported, true, null);
      setDesign(imported.train);
      setDesignPrompt(imported.train.prompt);
      setTab('build');
      toast(`Imported ${imported.points.length} track points from CSV as a new project.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not import that CSV.');
    }
  };

  const generateTrain = async () => {
    if (!designPrompt.trim()) return;
    setGenerating(true);
    try {
      const generated = await trainService.generate(designPrompt);
      const preview = { ...generated, id: design.id };
      setDesign(preview);
      sceneRef.current?.setTrainDesign(preview);
      toast('Train design generated and previewed on the ride. Apply it to keep it.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The train provider could not generate a design.');
    } finally {
      setGenerating(false);
    }
  };

  const applyDesign = () => {
    const nextProject = { ...project, train: design };
    applyProject(nextProject, true, selectedId);
    sceneRef.current?.setTrainDesign(design);
    toast('Train design assigned to this coaster.');
  };

  const saveDesign = () => {
    if (!storeRef.current) return;
    const saved = storeRef.current.saveTrain(design);
    setDesign(saved);
    refreshProjectList();
    toast(`Saved train design “${saved.name}”.`);
  };

  const updateDesign = <K extends keyof TrainDesign>(key: K, value: TrainDesign[K]) => {
    const next = { ...design, [key]: value };
    setDesign(next);
    sceneRef.current?.setTrainDesign(next);
  };

  const loadProject = (id: string) => {
    const loaded = storeRef.current?.load(id);
    if (!loaded) return;
    applyProject(loaded, true, null);
    setDesign(loaded.train);
    setDesignPrompt(loaded.train.prompt);
    setProjectionState(loaded.camera.projection);
    setRideCameraState(loaded.camera.rideMode);
    sceneRef.current?.setProjection(loaded.camera.projection);
    sceneRef.current?.setRideCamera(loaded.camera.rideMode);
    sceneRef.current?.reset();
    setIsPlaying(false);
    toast(`Loaded “${loaded.name}”.`);
  };

  const renameProject = (id: string, currentName: string) => {
    const name = window.prompt('Rename this coaster project:', currentName);
    if (!name?.trim()) return;
    const renamed = storeRef.current?.rename(id, name);
    if (!renamed) return;
    refreshProjectList();
    if (projectRef.current.id === id) {
      projectRef.current = { ...projectRef.current, name: renamed.name };
      setProject((current) => ({ ...current, name: renamed.name }));
    }
    toast(`Renamed to “${renamed.name}”.`);
  };

  const deleteProject = (id: string) => {
    if (!window.confirm('Delete this saved coaster project? This does not affect island drafts or island saves.')) return;
    storeRef.current?.remove(id);
    refreshProjectList();
  };

  const chooseCoasterType = (typeId: CoasterTypeId) => {
    const defaults = defaultTrainForType(typeId);
    const type = getCoasterType(typeId);
    const train = { ...project.train, ...defaults };
    const next: CoasterProject = {
      ...project,
      coasterTypeId: typeId,
      train,
      supports: type
        ? { ...project.supports, material: type.supportMaterial }
        : project.supports,
    };
    applyProject(next, true, selectedId);
    setDesign(train);
    setDesignPrompt(train.prompt);
    toast(`${type?.label ?? typeId} type selected. Build every track section yourself.`);
  };

  const chooseManufacturer = (manufacturerId: string) => {
    const manufacturer = getManufacturer(manufacturerId);
    applyProject({ ...project, manufacturerId }, true, selectedId);
    toast(
      manufacturer
        ? `${manufacturer.name} profile selected — ${manufacturer.specialization}. No track has been generated.`
        : 'Independent profile selected. No track has been generated.',
    );
  };

  const changeProjection = (next: CameraProjection) => {
    setProjectionState(next);
    sceneRef.current?.setProjection(next);
    const updated = { ...project, camera: { ...project.camera, projection: next } };
    projectRef.current = updated;
    setProject(updated);
  };

  const changeRideCamera = (mode: RideCameraMode) => {
    setRideCameraState(mode);
    sceneRef.current?.setRideCamera(mode);
    const updated = { ...project, camera: { ...project.camera, rideMode: mode } };
    projectRef.current = updated;
    setProject(updated);
  };

  const play = async () => {
    const scene = sceneRef.current;
    if (!scene) return;
    await scene.play();
    if (!scene.hasRunningTrain()) {
      const started = scene.dispatch();
      if (!started) {
        scene.pause();
        setIsPlaying(false);
        setTab('test');
        return;
      }
    }
    setIsPlaying(true);
    setTab('test');
  };

  const pause = () => {
    sceneRef.current?.pause();
    setIsPlaying(false);
  };

  const resetRide = () => {
    sceneRef.current?.reset();
    setIsPlaying(false);
    changeRideCamera('free');
  };

  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    sceneRef.current?.setMuted(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0d1218] text-stone-100">
      <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-stone-800 bg-stone-950/95 px-2.5 py-2 sm:gap-3 sm:px-4">
        <Link
          href="/"
          className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-lg px-1.5 text-stone-400 transition hover:text-amber-300"
          aria-label="Back to Survival Island menu"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden text-xs font-bold sm:inline">Island</span>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 sm:text-[11px]">
              Ultimate Coaster Studio
            </span>
            <span className="hidden rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-200 sm:inline">
              Creative
            </span>
          </div>
          <input
            value={project.name}
            onChange={(event) => {
              const next = { ...project, name: event.target.value };
              projectRef.current = next;
              setProject(next);
            }}
            aria-label="Coaster project name"
            className="mt-0.5 w-full max-w-[260px] truncate border-0 bg-transparent p-0 text-sm font-bold text-stone-100 outline-none focus:text-amber-100"
          />
          <div className="hidden truncate text-[9px] uppercase tracking-wider text-stone-500 sm:block">
            {manufacturer?.name ?? 'Independent profile'} · {coasterType?.label ?? project.coasterTypeId}
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <button type="button" onClick={undo} disabled={!canUndo} className={smallButton()} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} className={smallButton()} title="Redo (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => changeProjection(projection === 'perspective' ? 'orthographic' : 'perspective')}
          className={smallButton(projection === 'orthographic')}
          title="Toggle perspective / orthographic construction camera"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden lg:inline">{projection === 'orthographic' ? 'Ortho' : 'Persp'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const nextMode: EditingMode = isAdvanced ? 'beginner' : 'advanced';
            applyProject({ ...project, editingMode: nextMode }, false, selectedId);
            toast(nextMode === 'advanced' ? 'Advanced editing enabled.' : 'Beginner editing enabled.');
          }}
          className={smallButton(isAdvanced)}
          title="Beginner / advanced editing"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden xl:inline">{isAdvanced ? 'Advanced' : 'Beginner'}</span>
        </button>
        <button type="button" onClick={saveProject} className={smallButton()}>
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Save</span>
        </button>
        <div className="hidden items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900/80 px-2 py-1 text-[11px] font-mono md:flex">
          <Gauge className="h-3.5 w-3.5 text-amber-300" />
          <span>{fmt(stats.length, 0)} m</span>
          <span className="text-stone-600">·</span>
          <span>{fmt(stats.maxHeight, 1)} m peak</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative order-1 h-[47dvh] shrink-0 overflow-hidden bg-[#9db7c9] lg:order-2 lg:h-auto lg:flex-1">
          <div ref={mountRef} className="absolute inset-0" />
          {sceneError && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-950/92 p-6 text-center">
              <div className="max-w-md rounded-2xl border border-amber-400/40 bg-stone-900 p-5">
                <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-amber-300" />
                <p className="text-sm font-bold text-stone-100">3D viewport unavailable</p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-400">{sceneError}</p>
                <Link href="/" className={`${secondaryButton()} mt-3`}>Return to island</Link>
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-stone-900/30 bg-stone-950/75 p-1 backdrop-blur">
              <button
                type="button"
                onClick={() => setTool('select')}
                className={smallButton(tool === 'select')}
                title="Select and drag control points"
              >
                <MousePointer2 className="h-4 w-4" />
                <span className="hidden sm:inline">Select</span>
              </button>
              <button
                type="button"
                onClick={() => setTool('add')}
                className={smallButton(tool === 'add')}
                title="Click the ground to add a control point"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add point</span>
              </button>
              <span className="mx-0.5 hidden h-6 w-px bg-stone-700 sm:block" />
              <label className="hidden items-center gap-1 text-[10px] font-bold text-stone-300 sm:flex">
                Snap
                <select
                  value={snap}
                  onChange={(event) => setSnap(Number(event.target.value))}
                  className="rounded border border-stone-700 bg-stone-900 px-1 py-1 text-[11px] text-stone-200"
                >
                  <option value={0}>Off</option>
                  <option value={0.5}>0.5 m</option>
                  <option value={1}>1 m</option>
                  <option value={2}>2 m</option>
                  <option value={5}>5 m</option>
                </select>
              </label>
            </div>
            <div className="pointer-events-auto flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 rounded-xl border border-stone-900/30 bg-stone-950/75 p-1 backdrop-blur">
                <button type="button" onClick={() => sceneRef.current?.focusTrack()} className={smallButton()} title="Frame the whole layout">
                  <Focus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const index = selectedId ? project.points.findIndex((point) => point.id === selectedId) : -1;
                    if (index >= 0) sceneRef.current?.focusPoint(index);
                    else sceneRef.current?.focusTrack();
                  }}
                  className={smallButton()}
                  title="Focus selected point"
                >
                  <Crosshair className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-stone-900/30 bg-stone-950/75 p-1 backdrop-blur">
                {([
                  ['top', 'Top'],
                  ['front', 'Front'],
                  ['side', 'Side'],
                  ['iso', '3/4'],
                ] as const).map(([preset, label]) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      sceneRef.current?.setCameraPreset(preset);
                      setRideCameraState('free');
                    }}
                    className="rounded px-1.5 py-1 text-[9px] font-black uppercase tracking-wider text-stone-300 hover:bg-stone-800 hover:text-amber-200"
                    title={`Align camera: ${label}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex flex-wrap gap-1.5">
            {[
              ['Length', `${fmt(stats.length, 0)} m`],
              ['Peak', `${fmt(stats.maxHeight, 1)} m`],
              ['Est. speed', `${fmt(stats.estimatedPeakSpeedKmh, 0)} km/h`],
              ['Est. G', `${fmt(stats.estimatedMaxVerticalG, 2)} G`],
              ['Inversions', `${stats.inversions}`],
              ['Points', `${project.points.length}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-stone-900/25 bg-stone-950/70 px-2 py-1 backdrop-blur">
                <div className="text-[8px] font-bold uppercase tracking-wider text-stone-400">{label}</div>
                <div className="font-mono text-[11px] font-black text-stone-100">{value}</div>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute bottom-2.5 right-2.5 flex items-center gap-2 rounded-lg border border-stone-900/25 bg-stone-950/70 px-2 py-1 text-[10px] font-bold text-stone-300 backdrop-blur">
            {project.closed ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Circuit closed
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Open layout
              </>
            )}
          </div>

          {telemetry && (
            <div className="pointer-events-none absolute right-2.5 top-16 rounded-xl border border-stone-900/30 bg-stone-950/75 px-3 py-2 text-right backdrop-blur">
              <div className="font-mono text-lg font-black leading-none text-amber-300">{fmt(telemetry.speedKmh, 1)}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400">km/h</div>
              <div className="mt-1 font-mono text-[10px] text-stone-300">{fmt(telemetry.gForce, 2)} G · {fmt(telemetry.lateralG, 2)} lat · {telemetry.state}</div>
            </div>
          )}
        </main>

        <aside className="order-2 flex min-h-0 flex-1 flex-col border-t border-stone-800 bg-stone-950/90 lg:order-1 lg:w-[392px] lg:flex-none lg:border-r lg:border-t-0">
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-stone-800 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setTab(entry.key)}
                  className={`flex min-h-[38px] shrink-0 items-center gap-1 rounded-lg px-2.5 text-[10px] font-black uppercase tracking-wide transition ${
                    tab === entry.key
                      ? 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/40'
                      : 'text-stone-400 hover:bg-stone-900 hover:text-stone-100'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {entry.label}
                </button>
              );
            })}
          </nav>

          <div className="survival-scroll min-h-0 flex-1 overflow-y-auto p-3">
            {tab === 'build' && (
              <div className="space-y-3">
                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                    <Grid3x3 className="h-3.5 w-3.5 text-amber-300" /> Construction tools
                  </h2>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setTool('add')} className={smallButton(tool === 'add')}>
                      <Plus className="h-4 w-4" /> Add point
                    </button>
                    <button type="button" onClick={() => setTool('select')} className={smallButton(tool === 'select')}>
                      <MousePointer2 className="h-4 w-4" /> Select / drag
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const smoothed = autoBankPoints(project.points, project.closed);
                        applyProject({ ...project, points: smoothed, autoBank: true }, true, selectedId);
                        toast('Banking recalculated from horizontal curvature.');
                      }}
                      className={smallButton()}
                    >
                      <Wand2 className="h-4 w-4" /> Auto-bank
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        applyProject({ ...project, closed: !project.closed }, true, selectedId);
                        toast(project.closed ? 'Circuit opened.' : 'Circuit closed — the spline joins the last point to the station.');
                      }}
                      className={smallButton(project.closed)}
                    >
                      <Route className="h-4 w-4" /> {project.closed ? 'Open circuit' : 'Close circuit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedId) {
                          applyProject({ ...project, points: duplicatePoint(project.points, selectedId) }, true, selectedId);
                        } else {
                          toast('Select a point to duplicate.');
                        }
                      }}
                      className={smallButton()}
                    >
                      <Copy className="h-4 w-4" /> Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedId) {
                          toast('Select a point to delete.');
                          return;
                        }
                        applyProject(
                          { ...project, points: removePoint(project.points, selectedId) },
                          true,
                          null,
                        );
                      }}
                      className={smallButton()}
                    >
                      <Trash2 className="h-4 w-4" /> Delete point
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(['x', 'y', 'z'] as const).map((axis) => (
                      <button
                        key={axis}
                        type="button"
                        onClick={() => {
                          if (!selectedPoint) {
                            toast('Select a point to align the layout.');
                            return;
                          }
                          const value = selectedPoint.position[axis];
                          applyProject(
                            {
                              ...project,
                              points: project.points.map((point) => ({
                                ...point,
                                position: { ...point.position, [axis]: value },
                              })),
                            },
                            true,
                            selectedId,
                          );
                          toast(`All points aligned on ${axis.toUpperCase()} = ${value}.`);
                        }}
                        className={smallButton()}
                      >
                        Align {axis.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                    <Wand2 className="h-3.5 w-3.5 text-amber-300" /> Transition smoothing
                  </h2>
                  <p className="mb-2 text-[10px] leading-relaxed text-stone-500">
                    De-pump blends uneven height and bank transitions without moving the layout footprint.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const points = dePumpPoints(project.points, project.closed, isAdvanced ? 0.7 : 0.45);
                      applyProject({ ...project, points }, true, selectedId);
                      toast('De-pump smoothing applied to height and bank transitions.');
                    }}
                    className={`${secondaryButton()} w-full`}
                  >
                    <Wand2 className="h-4 w-4" /> De-pump / smooth transitions
                  </button>
                </section>

                {isAdvanced ? (
                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                      <Layers className="h-3.5 w-3.5 text-amber-300" /> Structural supports
                    </h2>
                    <span className="rounded border border-stone-700 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-400">
                      {project.supports.manual.length} manual
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyProject({ ...project, supports: { ...project.supports, auto: !project.supports.auto } }, true, selectedId)}
                      className={smallButton(project.supports.auto)}
                    >
                      Auto {project.supports.auto ? 'on' : 'off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyProject({ ...project, supports: { ...project.supports, crossBrace: !project.supports.crossBrace } }, true, selectedId)}
                      className={smallButton(project.supports.crossBrace)}
                    >
                      Bracing
                    </button>
                    <select
                      value={project.supports.material}
                      onChange={(event) =>
                        applyProject(
                          {
                            ...project,
                            supports: { ...project.supports, material: event.target.value as SupportMaterial },
                          },
                          true,
                          selectedId,
                        )
                      }
                      className={fieldClass()}
                      aria-label="Support material"
                    >
                      <option value="steel">Steel</option>
                      <option value="wood">Timber</option>
                      <option value="concrete">Concrete</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!selectedPoint}
                    onClick={() => {
                      if (!selectedPoint) return;
                      applyProject(addManualSupport(project, selectedIndex), true, selectedId);
                      toast('Manual support added beneath the selected control point.');
                    }}
                    className={`${secondaryButton()} mt-1.5 w-full`}
                  >
                    <Plus className="h-4 w-4" /> Add support at selected point
                  </button>
                  {project.supports.manual.length > 0 && (
                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                      {project.supports.manual.map((support, index) => (
                        <div key={support.id} className="flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-950/60 p-1.5">
                          <span className="w-5 font-mono text-[9px] text-stone-500">{index + 1}</span>
                          <input
                            type="number"
                            min={0.8}
                            max={140}
                            step={1}
                            value={Number(support.height.toFixed(1))}
                            onChange={(event) =>
                              applyProject(
                                updateManualSupport(project, support.id, { height: Number(event.target.value) }),
                                true,
                                selectedId,
                              )
                            }
                            className={`${fieldClass()} min-h-[32px] flex-1 py-1`}
                            aria-label={`Support ${index + 1} height`}
                          />
                          <span className="text-[9px] text-stone-500">m</span>
                          <button
                            type="button"
                            onClick={() => applyProject(removeManualSupport(project, support.id), true, selectedId)}
                            className="rounded p-1.5 text-stone-500 hover:text-rose-300"
                            aria-label={`Remove support ${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                ) : (
                  <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3 text-[10px] leading-relaxed text-stone-500">
                    Beginner mode uses automatic structural supports. Switch to Advanced in the header for manual support placement,
                    height editing and material overrides.
                  </div>
                )}

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-stone-300">Control points</h2>
                    <span className="font-mono text-[10px] text-stone-500">{project.points.length}</span>
                  </div>
                  <div className="max-h-[38dvh] space-y-1 overflow-y-auto pr-1 lg:max-h-[30dvh]">
                    {project.points.map((point, index) => (
                      <button
                        key={point.id}
                        type="button"
                        onClick={() => {
                          selectedIdRef.current = point.id;
                          setSelectedId(point.id);
                          sceneRef.current?.focusPoint(index);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
                          point.id === selectedId
                            ? 'border-amber-400/70 bg-amber-400/10'
                            : 'border-stone-800 bg-stone-950/50 hover:border-stone-600'
                        }`}
                      >
                        <span className="w-5 shrink-0 font-mono text-[10px] text-stone-500">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-bold text-stone-200">
                            {SECTION_LABELS[point.kind]}
                          </span>
                          <span className="block truncate font-mono text-[9px] text-stone-500">
                            {fmt(point.position.x, 1)}, {fmt(point.position.y, 1)}, {fmt(point.position.z, 1)} · bank {fmt(point.bank, 0)}°
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Engineering check
                  </h2>
                  {validation.errors.length === 0 && validation.warnings.length === 0 ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Layout passes clearance and station checks.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-[11px] leading-snug">
                      {validation.errors.map((error) => (
                        <li key={error} className="flex gap-1.5 text-rose-300">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {error}
                        </li>
                      ))}
                      {validation.warnings.map((warning) => (
                        <li key={warning} className="flex gap-1.5 text-amber-200/90">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {warning}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {tab === 'elements' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-[11px] leading-relaxed text-amber-100/90">
                  Elements append to the end of the current layout from its last heading. After inserting, switch to
                  <span className="font-bold"> Point </span> to fine-tune height, banking brake and launch speed — everything stays
                  fully editable, not locked to a prefab.
                </div>
                {ELEMENT_LIBRARY.map((group) => (
                  <section key={group.category}>
                    <h2 className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">{group.category}</h2>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.items.map((item) => {
                        const supported = !manufacturer || manufacturerSupportsElement(manufacturer, item.key);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => addElement(item.key)}
                            className={`group rounded-lg border p-2 text-left transition ${
                              supported
                                ? 'border-stone-800 bg-stone-900/60 hover:border-amber-400/60 hover:bg-amber-400/5'
                                : 'border-stone-800/60 bg-stone-950/50 hover:border-amber-400/30'
                            }`}
                            title={supported ? item.detail : `${item.detail} · not listed for the selected manufacturer profile`}
                          >
                            <span className={`block text-[11px] font-bold ${supported ? 'text-stone-100 group-hover:text-amber-100' : 'text-stone-400'}`}>
                              {item.label}
                              {!supported && <span className="ml-1 text-[8px] font-black uppercase text-amber-200/60">non-profile</span>}
                            </span>
                            <span className="mt-0.5 block text-[9px] leading-snug text-stone-400">{item.detail}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {tab === 'catalog' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-[11px] leading-relaxed text-amber-100/90">
                  Manufacturer and coaster-type profiles set design language, materials, compatible elements and train
                  defaults. They never create a roller coaster: every track point and section remains player-built.
                </div>

                <section className="grid grid-cols-4 gap-1.5">
                  {[
                    ['USA', CATALOG_STATS.american],
                    ['China', CATALOG_STATS.chinese],
                    ['World', CATALOG_STATS.international],
                    ['Types', CATALOG_STATS.coasterTypes],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-lg border border-stone-800 bg-stone-900/60 px-2 py-1.5 text-center">
                      <div className="font-mono text-sm font-black text-amber-200">{value as number}</div>
                      <div className="text-[8px] font-bold uppercase tracking-wider text-stone-500">{label as string}</div>
                    </div>
                  ))}
                </section>

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                    <Factory className="h-3.5 w-3.5 text-amber-300" /> Manufacturer browser
                  </h2>
                  <div className="mb-2 grid grid-cols-3 gap-1">
                    {MANUFACTURER_CATEGORIES.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setCatalogCategory(entry.id)}
                        className={smallButton(catalogCategory === entry.id)}
                        title={entry.description}
                      >
                        {entry.id === 'international' ? <Globe2 className="h-3.5 w-3.5" /> : null}
                        {entry.shortLabel}
                      </button>
                    ))}
                  </div>
                  <label className="mb-2 flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950/80 px-2">
                    <Search className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                    <input
                      value={catalogQuery}
                      onChange={(event) => setCatalogQuery(event.target.value)}
                      placeholder={`Search ${MANUFACTURERS.length} profiles, countries, examples…`}
                      className="min-h-[36px] w-full bg-transparent text-[11px] text-stone-100 outline-none placeholder:text-stone-600"
                    />
                  </label>
                  <p className="mb-2 text-[9px] leading-relaxed text-stone-500">
                    {MANUFACTURER_CATEGORIES.find((entry) => entry.id === catalogCategory)?.description}
                  </p>
                  <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                    {catalogManufacturers.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => chooseManufacturer(entry.id)}
                        className={`w-full rounded-lg border px-2 py-1.5 text-left transition ${
                          project.manufacturerId === entry.id
                            ? 'border-amber-400/70 bg-amber-400/10'
                            : 'border-stone-800 bg-stone-950/50 hover:border-stone-600'
                        }`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] font-bold text-stone-200">{entry.name}</span>
                            <span className="block truncate text-[9px] text-stone-500">
                              {entry.country} · {entry.specialization}
                            </span>
                          </span>
                          <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                            entry.status === 'historical'
                              ? 'bg-stone-700/60 text-stone-300'
                              : entry.status === 'unverified'
                                ? 'bg-amber-500/15 text-amber-200'
                                : 'bg-emerald-500/15 text-emerald-200'
                          }`}>
                            {entry.status}
                          </span>
                        </span>
                      </button>
                    ))}
                    {catalogManufacturers.length === 0 && (
                      <p className="py-3 text-center text-[10px] text-stone-500">No profiles match this search.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-[12px] font-black text-stone-100">
                        {manufacturer?.name ?? 'Independent / unassigned'}
                      </h2>
                      <p className="mt-0.5 text-[9px] uppercase tracking-wider text-stone-500">
                        {manufacturer ? `${manufacturer.country} · ${manufacturer.classification.replace('_', ' ')} · ${manufacturer.status}` : 'No manufacturer profile selected'}
                      </p>
                    </div>
                    {manufacturer?.successor && (
                      <span className="shrink-0 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-200">
                        → {manufacturer.successor}
                      </span>
                    )}
                  </div>
                  {manufacturer ? (
                    <div className="space-y-1.5 text-[10px] leading-relaxed text-stone-400">
                      <p>{manufacturer.trackCharacteristics}</p>
                      <p>{manufacturer.trainCharacteristics}</p>
                      <div className="flex flex-wrap gap-1">
                        {manufacturer.materials.map((material) => (
                          <span key={material} className="rounded border border-stone-700 px-1.5 py-0.5 text-[8px] uppercase text-stone-300">{material}</span>
                        ))}
                        {manufacturer.restraints.map((restraint) => (
                          <span key={restraint} className="rounded border border-sky-400/25 bg-sky-400/5 px-1.5 py-0.5 text-[8px] uppercase text-sky-200">{restraint.replace('_', ' ')}</span>
                        ))}
                      </div>
                      {manufacturer.documentedExamples.length > 0 && (
                        <p className="text-[9px] text-stone-500">Documented examples: {manufacturer.documentedExamples.join(' · ')}</p>
                      )}
                      {manufacturer.notes && <p className="text-[9px] text-amber-200/70">{manufacturer.notes}</p>}
                    </div>
                  ) : (
                    <p className="text-[10px] text-stone-500">Select a manufacturer profile to use its design language. Track construction remains fully manual.</p>
                  )}
                </section>

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                    <TrainFront className="h-3.5 w-3.5 text-amber-300" /> Coaster technology
                  </h2>
                  <p className="mb-2 text-[10px] text-stone-500">Selected: <span className="font-bold text-stone-200">{coasterType?.label ?? project.coasterTypeId}</span></p>
                  <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto pr-1">
                    {COASTER_TYPES.map((entry) => {
                      const compatible = !manufacturer || manufacturerSupportsType(manufacturer, entry.id);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => chooseCoasterType(entry.id)}
                          className={`rounded-lg border px-2 py-1.5 text-left text-[10px] transition ${
                            project.coasterTypeId === entry.id
                              ? 'border-amber-400/70 bg-amber-400/10 text-amber-100'
                              : compatible
                                ? 'border-stone-800 bg-stone-950/50 text-stone-300 hover:border-stone-600'
                                : 'border-stone-800/60 bg-stone-950/40 text-stone-500 hover:border-stone-700'
                          }`}
                          title={compatible ? entry.detail : `${entry.detail} · outside the selected manufacturer's listed categories`}
                        >
                          <span className="flex items-center justify-between gap-1 font-bold">
                            {entry.label}
                            {!compatible && <span className="text-[7px] font-black uppercase text-amber-200/50">outside</span>}
                          </span>
                          <span className="block text-[8px] uppercase tracking-wider text-stone-500">{entry.group} · {entry.trackStyle}</span>
                        </button>
                      );
                    })}
                  </div>
                  {coasterType && (
                    <p className="mt-2 text-[10px] leading-relaxed text-stone-500">{coasterType.detail}</p>
                  )}
                  {!typeCompatible && (
                    <p className="mt-1.5 flex items-start gap-1.5 rounded border border-amber-400/20 bg-amber-400/5 p-1.5 text-[9px] leading-snug text-amber-200">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      This manufacturer profile lists different coaster categories. You can still build it, but review the profile before relying on compatibility claims.
                    </p>
                  )}
                </section>
              </div>
            )}

            {tab === 'properties' && (
              <div className="space-y-3">
                {!selectedPoint ? (
                  <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/30 p-5 text-center">
                    <Move3d className="mx-auto mb-2 h-7 w-7 text-stone-500" />
                    <p className="text-xs font-bold text-stone-300">No control point selected</p>
                    <p className="mt-1 text-[11px] text-stone-500">Click a yellow point in the viewport or choose one in Build.</p>
                  </div>
                ) : (
                  <>
                    <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-wider text-stone-300">Point {selectedIndex + 1}</h2>
                        <button
                          type="button"
                          onClick={() => sceneRef.current?.focusPoint(selectedIndex)}
                          className={smallButton()}
                        >
                          <Crosshair className="h-3.5 w-3.5" /> Focus
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['x', 'y', 'z'] as const).map((axis) => (
                          <label key={axis} className="block">
                            <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">
                              {axis} (m)
                            </span>
                            <input
                              type="number"
                              step={0.5}
                              value={Number(selectedPoint.position[axis].toFixed(2))}
                              onChange={(event) => patchSelected({ position: { [axis]: Number(event.target.value) } })}
                              className={fieldClass()}
                            />
                          </label>
                        ))}
                      </div>
                      {selectedIndex > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          <label className="block">
                            <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">
                              Segment length (m)
                            </span>
                            <input
                              type="number"
                              min={0.25}
                              max={500}
                              step={0.5}
                              value={Number(segmentLength(project.points, selectedIndex).toFixed(2))}
                              onChange={(event) =>
                                applyProject(
                                  {
                                    ...project,
                                    points: setSegmentLength(project.points, selectedIndex, Number(event.target.value)),
                                  },
                                  true,
                                  selectedId,
                                )
                              }
                              className={fieldClass()}
                            />
                          </label>
                          <div>
                            <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">
                              Curve bias
                            </span>
                            <div className="grid grid-cols-2 gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  applyProject(
                                    { ...project, points: offsetPointLateral(project.points, selectedIndex, 1) },
                                    true,
                                    selectedId,
                                  )
                                }
                                className={smallButton()}
                                title="Bend this control point 1 m to the right"
                              >
                                ← 1 m
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  applyProject(
                                    { ...project, points: offsetPointLateral(project.points, selectedIndex, -1) },
                                    true,
                                    selectedId,
                                  )
                                }
                                className={smallButton()}
                                title="Bend this control point 1 m to the left"
                              >
                                1 m →
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <label className="block">
                          <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Bank °</span>
                          <input
                            type="number"
                            step={5}
                            min={-180}
                            max={180}
                            value={Number(selectedPoint.bank.toFixed(1))}
                            onChange={(event) => patchSelected({ bank: clamp(Number(event.target.value), -180, 180) })}
                            className={fieldClass()}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Section type</span>
                          <select
                            value={selectedPoint.kind}
                            onChange={(event) => patchSelected({ kind: event.target.value as TrackPointKind })}
                            className={fieldClass()}
                          >
                            {KINDS.map((kind) => (
                              <option key={kind} value={kind}>
                                {SECTION_LABELS[kind]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {(selectedPoint.kind === 'launch' || selectedPoint.kind === 'chain_lift' || selectedPoint.kind === 'cable_lift') && (
                        <label className="mt-2 block">
                          <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">
                            Target speed (m/s)
                          </span>
                          <input
                            type="number"
                            step={1}
                            min={5}
                            max={60}
                            value={selectedPoint.targetSpeed ?? 34}
                            onChange={(event) => patchSelected({ targetSpeed: clamp(Number(event.target.value), 5, 60) })}
                            className={fieldClass()}
                          />
                        </label>
                      )}
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {(['x', 'y', 'z'] as const).map((axis) => (
                          <button
                            key={axis}
                            type="button"
                            onClick={() => patchSelected({ position: { [axis]: 0 } })}
                            className={smallButton()}
                          >
                            Level {axis.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </section>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          applyProject({ ...project, points: duplicatePoint(project.points, selectedPoint.id) }, true, selectedPoint.id);
                        }}
                        className={secondaryButton()}
                      >
                        <Copy className="h-4 w-4" /> Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyProject({ ...project, points: removePoint(project.points, selectedPoint.id) }, true, null)
                        }
                        className={secondaryButton()}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'trains' && (
              <div className="space-y-3">
                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Prompt to 3D train
                  </h2>
                  <textarea
                    value={designPrompt}
                    onChange={(event) => setDesignPrompt(event.target.value)}
                    rows={4}
                    placeholder="Describe the train: four cars, black and red seats, exposed wheels, lap bars…"
                    className={`${fieldClass()} resize-y leading-relaxed`}
                  />
                  <button type="button" onClick={generateTrain} disabled={generating || !designPrompt.trim()} className={`${primaryButton()} mt-2 w-full`}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {generating ? 'Building 3D train…' : 'Generate train'}
                  </button>
                  <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
                    {trainService.isExternal
                      ? `${providerLabel} connected. Generated specs are validated before they become ride geometry.`
                      : `${providerLabel}. This parses your prompt into real editable geometry and colors — it is not an image and does not claim external AI. Set NEXT_PUBLIC_COASTER_TRAIN_PROVIDER_URL to connect a prompt-to-3D provider.`}
                  </p>
                </section>

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-[11px] font-black uppercase tracking-wider text-stone-300">{design.name}</h2>
                      <p className="mt-0.5 text-[10px] text-stone-400">{describeTrain(design)}</p>
                    </div>
                    <Box className="h-5 w-5 shrink-0 text-amber-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Cars</span>
                      <input type="number" min={1} max={12} value={design.cars} onChange={(event) => updateDesign('cars', clamp(Number(event.target.value), 1, 12))} className={fieldClass()} />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Rows / car</span>
                      <input type="number" min={1} max={4} value={design.rowsPerCar} onChange={(event) => updateDesign('rowsPerCar', clamp(Number(event.target.value), 1, 4))} className={fieldClass()} />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Seats / row</span>
                      <input type="number" min={1} max={12} value={design.seatsPerRow} onChange={(event) => updateDesign('seatsPerRow', clamp(Number(event.target.value), 1, 12))} className={fieldClass()} />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Body style</span>
                      <select value={design.bodyStyle} onChange={(event) => updateDesign('bodyStyle', event.target.value as TrainBodyStyle)} className={fieldClass()}>
                        <option value="steel">Steel</option>
                        <option value="launch">Launch</option>
                        <option value="wood">Wood</option>
                        <option value="wing">Wing</option>
                        <option value="invert">Inverted</option>
                        <option value="flying">Flying</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Restraint</span>
                      <select value={design.restraint} onChange={(event) => updateDesign('restraint', event.target.value as RestraintKind)} className={fieldClass()}>
                        <option value="lap_bar">Lap bar</option>
                        <option value="otsr">Over-shoulder</option>
                        <option value="harness">Harness</option>
                        <option value="none">None</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Wheels</span>
                      <select value={design.wheels} onChange={(event) => updateDesign('wheels', event.target.value as TrainDesign['wheels'])} className={fieldClass()}>
                        <option value="exposed">Exposed</option>
                        <option value="covered">Covered</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Chassis</span>
                      <select value={design.chassisStyle} onChange={(event) => updateDesign('chassisStyle', event.target.value as TrainDesign['chassisStyle'])} className={fieldClass()}>
                        <option value="open">Open frame</option>
                        <option value="enclosed">Enclosed body</option>
                        <option value="monocoque">Monocoque</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Nose</span>
                      <select value={design.noseStyle} onChange={(event) => updateDesign('noseStyle', event.target.value as TrainDesign['noseStyle'])} className={fieldClass()}>
                        <option value="rounded">Rounded</option>
                        <option value="pointed">Pointed</option>
                        <option value="flat">Flat</option>
                        <option value="shark">Shark</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Seat material</span>
                      <select value={design.seatMaterial} onChange={(event) => updateDesign('seatMaterial', event.target.value as TrainDesign['seatMaterial'])} className={fieldClass()}>
                        <option value="padded">Padded</option>
                        <option value="molded">Molded</option>
                        <option value="timber">Timber</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">Wheel colour</span>
                      <input type="color" value={design.wheelColor} onChange={(event) => updateDesign('wheelColor', event.target.value)} className="h-9 w-full cursor-pointer rounded-lg border border-stone-700 bg-stone-950 p-0.5" />
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map((key, index) => (
                      <label key={key} className="block">
                        <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-stone-500">
                          {index === 0 ? 'Body' : index === 1 ? 'Trim' : 'Accent'}
                        </span>
                        <input
                          type="color"
                          value={design[key]}
                          onChange={(event) => updateDesign(key, event.target.value)}
                          className="h-9 w-full cursor-pointer rounded-lg border border-stone-700 bg-stone-950 p-0.5"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => updateDesign('lighting', !design.lighting)} className={smallButton(design.lighting)}>
                      <Sparkles className="h-3.5 w-3.5" /> LED {design.lighting ? 'on' : 'off'}
                    </button>
                    <button type="button" onClick={() => updateDesign('aeroFairing', !design.aeroFairing)} className={smallButton(design.aeroFairing)}>
                      <Box className="h-3.5 w-3.5" /> Aero fairing
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={applyDesign} className={primaryButton()}>
                      <CheckCircle2 className="h-4 w-4" /> Assign to ride
                    </button>
                    <button type="button" onClick={saveDesign} className={secondaryButton()}>
                      <Save className="h-4 w-4" /> Save design
                    </button>
                  </div>
                </section>

                {trainDesigns.length > 0 && (
                  <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                    <h2 className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">Saved trains</h2>
                    <div className="space-y-1">
                      {trainDesigns.map((saved) => (
                        <div key={saved.id} className="flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-950/50 p-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDesign(saved);
                              setDesignPrompt(saved.prompt || saved.name);
                              sceneRef.current?.setTrainDesign(saved);
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="block truncate text-[11px] font-bold text-stone-200">{saved.name}</span>
                            <span className="block truncate text-[9px] text-stone-500">{describeTrain(saved)}</span>
                          </button>
                          <button type="button" onClick={() => storeRef.current?.removeTrain(saved.id)} className="rounded p-1.5 text-stone-500 hover:text-rose-300" aria-label={`Delete ${saved.name}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {tab === 'mechanics' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                    <Wrench className="h-3.5 w-3.5 text-amber-300" /> Installed systems
                  </h2>
                  <div className="space-y-1.5">
                    {[
                      ['transfer', 'Transfer track', installs.transfer.installed, `${Math.round(installs.transfer.progress * 100)}% · ${installs.transfer.side}`],
                      ['switch', 'Switch track', installs.switchTrack.installed, `${Math.round(installs.switchTrack.progress * 100)}% · ${installs.switchTrack.route}`],
                      ['drop', 'Drop track', installs.drop.installed, `${Math.round(installs.drop.progress * 100)}% · ${installs.drop.phase}`],
                      ['tilt', 'Tilt track', installs.tilt.installed, `${Math.round(installs.tilt.progress * 100)}% · ${installs.tilt.phase}`],
                    ].map(([key, label, installed, status]) => (
                      <div key={key as string} className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 bg-stone-950/50 px-2 py-1.5">
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-stone-200">{label as string}</div>
                          <div className="font-mono text-[9px] text-stone-500">{installed ? (status as string) : 'Not on layout'}</div>
                        </div>
                        <button
                          type="button"
                          disabled={!installed}
                          onClick={() => sceneRef.current?.triggerMechanical(key as 'transfer' | 'switch' | 'drop' | 'tilt')}
                          className={smallButton()}
                        >
                          Test
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
                    Add mechanical sections from Elements. Operation is automatic once installed: transfers cycle on arrival,
                    switches select routes, drop sections lower and reset, and tilt sections return level.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">Block safety & sensors</h2>
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2 py-1.5 text-[10px] text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {installs.dispatchAllowed ? 'Interlock clear — dispatch permitted' : 'Interlock holding dispatch'}
                  </div>
                  <div className="space-y-1">
                    {installs.blockStatus.length === 0 ? (
                      <p className="text-[10px] text-stone-500">No block brakes on this layout. Add one from Elements to create sections.</p>
                    ) : (
                      installs.blockStatus.map((block) => (
                        <div key={block.index} className="flex items-center justify-between rounded border border-stone-800 px-2 py-1 text-[10px]">
                          <span className="text-stone-300">B{block.index + 1} · {block.kind}</span>
                          <span className={block.occupiedBy !== null ? 'font-bold text-rose-300' : 'text-emerald-300'}>
                            {block.occupiedBy !== null ? `Train ${block.occupiedBy + 1}` : 'Clear'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-2 text-[10px] text-stone-500">
                    Sensors: {installs.sensors.length ? installs.sensors.join(' · ') : 'none triggered yet'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !autoDispatch;
                    setAutoDispatch(next);
                    sceneRef.current?.setAutoDispatch(next);
                  }}
                  className={`${smallButton(autoDispatch)} w-full`}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Automatic dispatch {autoDispatch ? 'enabled' : 'disabled'}
                </button>
              </div>
            )}

            {tab === 'test' && (
              <div className="space-y-3">
                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                    <Gauge className="h-3.5 w-3.5 text-amber-300" /> Ride telemetry
                  </h2>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      ['Speed', `${fmt(telemetry?.speedKmh ?? 0, 1)} km/h`],
                      ['Height', `${fmt(telemetry?.height ?? 0, 1)} m`],
                      ['Vertical G', `${fmt(telemetry?.gForce ?? 1, 2)} G`],
                      ['Lateral G', `${fmt(telemetry?.lateralG ?? 0, 2)} G`],
                      ['Combined G', `${fmt(telemetry?.combinedG ?? 1, 2)} G`],
                      ['Section', telemetry ? SECTION_LABELS[telemetry.section] : 'Station'],
                      ['Lap', `${fmt((telemetry?.lapProgress ?? 0) * 100, 0)}%`],
                      ['State', telemetry?.state ?? 'stopped'],
                      ['Train mass', `${fmt((telemetry?.massKg ?? 0) / 1000, 1)} t`],
                      ['Riders', `${telemetry?.riders ?? 0}`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-stone-800 bg-stone-950/60 px-2 py-1.5">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-stone-500">{label}</div>
                        <div className="mt-0.5 font-mono text-[12px] font-bold text-stone-100">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 space-y-1 rounded-lg border border-stone-800 bg-stone-950/60 p-2">
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-stone-500">
                      <span>G-force comb</span>
                      <span className="font-mono text-stone-300">{fmt(telemetry?.combinedG ?? 1, 2)} G</span>
                    </div>
                    {[
                      ['Vertical', telemetry?.gForce ?? 1, 'bg-amber-400'],
                      ['Lateral', telemetry?.lateralG ?? 0, 'bg-sky-400'],
                    ].map(([label, value, colour]) => (
                      <div key={label as string} className="flex items-center gap-2">
                        <span className="w-12 text-[8px] uppercase text-stone-500">{label as string}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-800">
                          <div className={`h-full rounded-full ${colour as string} transition-[width]`} style={{ width: `${clamp(Math.abs(value as number) / 6, 0, 1) * 100}%` }} />
                        </div>
                        <span className="w-9 text-right font-mono text-[9px] text-stone-400">{fmt(value as number, 2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={isPlaying ? pause : play} className={primaryButton()}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {isPlaying ? 'Pause' : 'Start ride'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (sceneRef.current?.dispatch()) setIsPlaying(true);
                      }}
                      className={secondaryButton()}
                    >
                      <Play className="h-4 w-4" /> Dispatch
                    </button>
                    <button type="button" onClick={resetRide} className={secondaryButton()}>
                      <RotateCcw className="h-4 w-4" /> Reset
                    </button>
                    <button type="button" onClick={toggleMuted} className={smallButton(muted)}>
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      {muted ? 'Muted' : 'Sound'}
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                      <Camera className="h-3.5 w-3.5" /> Ride cameras
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {([
                        ['front', 'Front seat'],
                        ['rear', 'Rear seat'],
                        ['passenger', 'Passenger'],
                        ['side', 'Side follow'],
                        ['trackside', 'Trackside'],
                        ['free', 'Free / builder'],
                      ] as [RideCameraMode, string][]).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            changeRideCamera(mode);
                            if (mode === 'free') sceneRef.current?.focusTrack();
                          }}
                          className={smallButton(rideCamera === mode)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Trains on circuit
                    </span>
                    <select
                      value={project.trainCount}
                      onChange={(event) => {
                        const count = Number(event.target.value);
                        applyProject({ ...project, trainCount: count }, true, selectedId);
                        sceneRef.current?.setTrainCount(count);
                      }}
                      className={fieldClass()}
                    >
                      <option value={1}>1 train</option>
                      <option value={2}>2 trains · block spacing</option>
                      <option value={3}>3 trains · block spacing</option>
                    </select>
                  </label>
                  <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
                    Additional trains stay stored until their block is clear. Dispatch is coordinated by the block controller,
                    and auto-dispatch waits for the station, block and mechanical interlocks.
                  </p>
                </section>

                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-100/80">
                  Ride physics use gravity, rolling resistance, aerodynamic drag, chain/cable lifts, launches, friction and
                  magnetic brakes. On-ride view follows the front car; use External to return to the builder camera.
                </div>
              </div>
            )}

            {tab === 'projects' && (
              <div className="space-y-3">
                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-300">
                    <FolderOpen className="h-3.5 w-3.5 text-amber-300" /> Standalone library
                  </h2>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={saveProject} className={primaryButton()}>
                      <Save className="h-4 w-4" /> Save project
                    </button>
                    <button type="button" onClick={saveProjectAs} className={secondaryButton()}>
                      <Copy className="h-4 w-4" /> Save as
                    </button>
                    <button type="button" onClick={newProject} className={secondaryButton()}>
                      <Plus className="h-4 w-4" /> New
                    </button>
                    <button type="button" onClick={exportProject} className={secondaryButton()}>
                      <Download className="h-4 w-4" /> Export JSON
                    </button>
                    <label className={`${secondaryButton()} cursor-pointer`}>
                      <Upload className="h-4 w-4" /> Import JSON
                      <input
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(event) => {
                          void importProject(event.target.files?.[0] ?? null);
                          event.target.value = '';
                        }}
                      />
                    </label>
                    <button type="button" onClick={exportCsv} className={secondaryButton()}>
                      <Download className="h-4 w-4" /> Export CSV
                    </button>
                    <label className={`${secondaryButton()} cursor-pointer`}>
                      <Upload className="h-4 w-4" /> Import CSV
                      <input
                        type="file"
                        accept="text/csv,.csv"
                        className="hidden"
                        onChange={(event) => {
                          void importCsv(event.target.files?.[0] ?? null);
                          event.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        storeRef.current?.saveDraft({
                          ...project,
                          camera: sceneRef.current?.getCameraPose() ?? project.camera,
                        });
                        toast('Draft saved with the current camera position.');
                      }}
                      className={secondaryButton()}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Save draft
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-stone-500">
                    Projects use the isolated <span className="font-mono">si_ultimate_coaster_studio_v1</span> library in this
                    browser. Survival Island saves, terrain, caves, vehicles and world generation are never touched.
                  </p>
                </section>

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-stone-300">Saved coasters</h2>
                    <span className="font-mono text-[10px] text-stone-500">{savedProjects.length}</span>
                  </div>
                  {savedProjects.length === 0 ? (
                    <p className="py-3 text-center text-[11px] text-stone-500">No saved layouts yet. Save this one to begin a library.</p>
                  ) : (
                    <div className="space-y-1">
                      {savedProjects.map((saved) => (
                        <div key={saved.id} className="flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-950/50 p-1.5">
                          <button type="button" onClick={() => loadProject(saved.id)} className="min-w-0 flex-1 text-left">
                            <span className="block truncate text-[11px] font-bold text-stone-200">{saved.name}</span>
                            <span className="block truncate font-mono text-[9px] text-stone-500">
                              {saved.pointCount} pts · {new Date(saved.updatedAt).toLocaleString()}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => renameProject(saved.id, saved.name)}
                            className="rounded p-1.5 text-stone-500 hover:text-sky-300"
                            aria-label={`Rename ${saved.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = storeRef.current?.duplicate(saved.id);
                              if (copy) {
                                refreshProjectList();
                                toast(`Duplicated “${copy.name}”.`);
                              }
                            }}
                            className="rounded p-1.5 text-stone-500 hover:text-amber-300"
                            aria-label={`Duplicate ${saved.name}`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProject(saved.id)}
                            className="rounded p-1.5 text-stone-500 hover:text-rose-300"
                            aria-label={`Delete ${saved.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3 text-[10px] leading-relaxed text-stone-400">
                  <div className="mb-1 flex items-center gap-1.5 font-bold text-stone-300">
                    <Route className="h-3.5 w-3.5 text-amber-300" /> Studio rules
                  </div>
                  Flat, empty terrain · independent of Survival Island · every coaster built manually · autosaved
                  draft · JSON and CSV exchange · saved projects are never overwritten without confirmation · all
                  construction changes reversible with undo/redo.
                </section>
              </div>
            )}
          </div>
        </aside>
      </div>

      {notice && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] w-[min(92vw,560px)] -translate-x-1/2 rounded-xl border border-amber-300/40 bg-stone-950/95 px-3 py-2 text-center text-[11px] font-semibold text-amber-100 shadow-2xl">
          {notice}
        </div>
      )}
    </div>
  );
}
