'use client';

import React from 'react';
import {
  CircleDot,
  Download,
  Droplets,
  Focus,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Store,
  Trash2,
  Trees,
  Upload,
} from 'lucide-react';
import {
  PARK_CATALOG,
  PARK_THEMES,
  countParkAttractions,
  describePark,
  getParkCatalogEntry,
  type ParkCategory,
  type ParkElement,
  type ParkElementKind,
  type ParkLayout,
  type ParkTheme,
} from '@/game/coaster/park';

interface ParkPanelProps {
  park: ParkLayout;
  brush: ParkElementKind | null;
  rotation: number;
  category: ParkCategory;
  embedded: boolean;
  onSetBrush: (kind: ParkElementKind | null) => void;
  onSetRotation: (rotation: number) => void;
  onSetCategory: (category: ParkCategory) => void;
  onUpdatePark: (patch: Partial<ParkLayout>) => void;
  onRemoveElement: (id: string) => void;
  onUpdateElement: (id: string, patch: Partial<ParkElement>) => void;
  onRegenerate: () => void;
  onClear: () => void;
  onDeliver: () => void;
  onExport: () => void;
  onImport: (file: File | null) => void;
  onFocus: () => void;
  onSave: () => void;
}

const CATEGORY_META: Record<ParkCategory, { label: string; icon: React.ElementType }> = {
  paths: { label: 'Paths & Queues', icon: MapPin },
  thrill: { label: 'Thrill Rides', icon: CircleDot },
  family: { label: 'Family Rides', icon: Sparkles },
  water: { label: 'Water Rides', icon: Droplets },
  shops: { label: 'Shops & Food', icon: Store },
  scenery: { label: 'Scenery', icon: Trees },
};

function panelButton(active = false, disabled = false): string {
  return `inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
    disabled
      ? 'cursor-not-allowed border-stone-800 bg-stone-950 text-stone-600'
      : active
        ? 'border-amber-400/80 bg-amber-400/15 text-amber-100'
        : 'border-stone-700 bg-stone-900/80 text-stone-300 hover:border-stone-500 hover:text-stone-100'
  }`;
}

function actionButton(): string {
  return 'inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-amber-300/50 bg-amber-400 px-3 py-1.5 text-[11px] font-extrabold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40';
}

export function ParkPanel({
  park,
  brush,
  rotation,
  category,
  embedded,
  onSetBrush,
  onSetRotation,
  onSetCategory,
  onUpdatePark,
  onRemoveElement,
  onUpdateElement,
  onRegenerate,
  onClear,
  onDeliver,
  onExport,
  onImport,
  onFocus,
  onSave,
}: ParkPanelProps) {
  const catalog = PARK_CATALOG.filter((entry) => entry.category === category);
  const attractions = countParkAttractions(park);
  const activeBrush = brush ? getParkCatalogEntry(brush) : null;

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
              <Trees className="h-3.5 w-3.5" /> Amusement park creator
            </h2>
            <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-amber-100/80">
              Build the park around the coaster in the live 3D viewport. Choose an element, then click the ground to
              place it. Drag still orbits; a plain click places. Paths, queues, rides, shops, water features and
              landscaped scenery all save with the project and deliver to Survival Island.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={onFocus} className={panelButton()} title="Frame the entire park">
              <Focus className="h-3.5 w-3.5" /> Frame park
            </button>
            <button type="button" onClick={onDeliver} className={actionButton()} title="Helicopter-deliver this park to the island">
              <Upload className="h-3.5 w-3.5" /> Deliver to island
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-stone-300">
          <span>{describePark(park)}</span>
          <span>{attractions} attractions</span>
          <span>{park.elements.filter((element) => element.kind === 'path').length} path tiles</span>
          <span>{embedded ? 'Embedded in game' : 'Standalone studio'}</span>
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
        <h2 className="mb-2 text-[11px] font-black uppercase tracking-wider text-stone-300">Park identity</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-400">Park name</span>
            <input
              value={park.name}
              onChange={(event) => onUpdatePark({ name: event.target.value.slice(0, 64) })}
              className="min-h-[38px] w-full rounded-lg border border-stone-700 bg-stone-950/80 px-2.5 text-sm font-bold text-stone-100 outline-none focus:border-amber-400/80"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-400">Visitors</span>
            <input
              type="range"
              min={0}
              max={60}
              value={park.visitorCount}
              onChange={(event) => onUpdatePark({ visitorCount: Number(event.target.value) })}
              className="mt-2 w-full accent-amber-400"
            />
            <span className="font-mono text-[10px] text-stone-400">{park.visitorCount} walking visitors</span>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
          {PARK_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onUpdatePark({ theme: theme.id as ParkTheme })}
              className={`rounded-lg border p-2 text-left transition ${
                park.theme === theme.id
                  ? 'border-amber-400/70 bg-amber-400/10'
                  : 'border-stone-800 bg-stone-950/50 hover:border-stone-600'
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-wide text-stone-100">{theme.label}</span>
              <span className="mt-0.5 block text-[9px] leading-snug text-stone-400">{theme.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-stone-300">Placement palette</h2>
          {activeBrush && (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-200">
              Placing {activeBrush.label}
            </span>
          )}
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_META) as ParkCategory[]).map((key) => {
            const meta = CATEGORY_META[key];
            const Icon = meta.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSetCategory(key)}
                className={panelButton(category === key)}
              >
                <Icon className="h-3.5 w-3.5" /> {meta.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
          {catalog.map((entry) => (
            <button
              key={entry.kind}
              type="button"
              onClick={() => {
                onSetBrush(brush === entry.kind ? null : entry.kind);
                if (brush !== entry.kind) onSetRotation(park.entrance.rotation);
              }}
              className={panelButton(brush === entry.kind)}
              title={entry.description}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.accent }}
              />
              <span className="truncate">{entry.label}</span>
              <span className="ml-auto font-mono text-[9px] opacity-60">
                {entry.footprint.w}×{entry.footprint.d}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-stone-800 bg-stone-950/60 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Placement rotation</span>
            <span className="font-mono text-[11px] text-amber-200">{rotation}°</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={-180}
              max={180}
              step={15}
              value={rotation}
              onChange={(event) => onSetRotation(Number(event.target.value))}
              className="w-full accent-amber-400"
            />
            <button type="button" onClick={() => onSetRotation(0)} className={panelButton()} title="Reset rotation">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          {brush ? (
            <button type="button" onClick={() => onSetBrush(null)} className={`${panelButton()} mt-2 w-full`}>
              Stop placing · return to camera orbit
            </button>
          ) : (
            <p className="mt-1 text-[9px] leading-relaxed text-stone-500">
              Choose an element above. Click the ground to place it; click and drag to orbit the camera, scroll or pinch
              to zoom.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-stone-300">
            Park layout <span className="font-mono text-stone-500">({park.elements.length})</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={onRegenerate} className={panelButton()}>
              <Sparkles className="h-3.5 w-3.5" /> Starter park
            </button>
            <button type="button" onClick={onClear} className={panelButton()}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>
        <div className="max-h-[40dvh] space-y-1 overflow-y-auto pr-1">
          {park.elements.length === 0 && (
            <p className="rounded-lg border border-stone-800 bg-stone-950/60 p-3 text-[10px] text-stone-500">
              The park is empty. Add a gate, a path spine and a ride, or load the starter park.
            </p>
          )}
          {park.elements.map((element, index) => {
            const entry = getParkCatalogEntry(element.kind);
            return (
              <div
                key={element.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-800 bg-stone-950/60 px-2 py-1.5"
              >
                <span className="w-5 shrink-0 font-mono text-[9px] text-stone-500">{index + 1}</span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.accent }}
                />
                <span className="min-w-[90px] flex-1 truncate text-[11px] font-bold text-stone-200">{entry.label}</span>
                <span className="font-mono text-[9px] text-stone-500">
                  {Math.round(element.x)}, {Math.round(element.z)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateElement(element.id, { rotation: (element.rotation - 15 + 360) % 360 })}
                    className="h-6 rounded bg-stone-800 px-1.5 text-[10px] text-stone-300 hover:bg-stone-700"
                    title="Rotate 15° counter-clockwise"
                  >
                    −15°
                  </button>
                  <span className="w-14 text-center font-mono text-[9px] text-stone-400">
                    {Math.round(element.rotation)}°
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateElement(element.id, { rotation: (element.rotation + 15) % 360 })}
                    className="h-6 rounded bg-stone-800 px-1.5 text-[10px] text-stone-300 hover:bg-stone-700"
                    title="Rotate 15° clockwise"
                  >
                    +15°
                  </button>
                </div>
                <label className="flex items-center gap-1">
                  <span className="text-[9px] text-stone-500">Scale</span>
                  <input
                    type="range"
                    min={0.6}
                    max={2.4}
                    step={0.1}
                    value={element.scale}
                    onChange={(event) => onUpdateElement(element.id, { scale: Number(event.target.value) })}
                    className="w-16 accent-amber-400"
                    aria-label={`${entry.label} scale`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveElement(element.id)}
                  className="rounded bg-stone-800 p-1 text-stone-400 hover:bg-rose-900/60 hover:text-rose-200"
                  aria-label={`Remove ${entry.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
        <h2 className="mb-2 text-[11px] font-black uppercase tracking-wider text-stone-300">Save & delivery</h2>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <button type="button" onClick={onSave} className={panelButton()}>
            <Save className="h-3.5 w-3.5" /> Save project
          </button>
          <button type="button" onClick={onExport} className={panelButton()}>
            <Download className="h-3.5 w-3.5" /> Export park
          </button>
          <label className={`${panelButton()} cursor-pointer`}>
            <Upload className="h-3.5 w-3.5" /> Import park
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                void onImport(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        <div className="mt-2 rounded-lg border border-emerald-400/25 bg-emerald-400/5 p-2.5 text-[10px] leading-relaxed text-emerald-100/80">
          <span className="font-black uppercase tracking-wider text-emerald-200">Delivery</span> — the entire park and its
          coaster are airlifted to a surveyed open site on Survival Island. The helicopter lowers the layout into place,
          then the rides, shops, paths and visitors become part of the persistent world. Existing island coasters and
          saves are preserved.
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" onClick={onDeliver} className={actionButton()}>
            <Plus className="h-3.5 w-3.5" /> Deliver park to Survival Island
          </button>
        </div>
      </section>
    </div>
  );
}
