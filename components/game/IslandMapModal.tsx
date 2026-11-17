'use client';

import React, { useEffect, useRef } from 'react';
import { Compass, MapPin, X } from 'lucide-react';
import { HUDStateSnapshot } from '@/game/types';
import {
  AUTUMN_GROVE_POS,
  BIOME_INFO,
  CAVE_POS,
  DEAD_OAK_POS,
  EXPEDITION_POS,
  FARMER_POS,
  HILL_HOUSE_POS,
  HOMESTEAD_POS,
  LAKE_CENTER,
  SNOWY_WOODLAND_POS,
  SWAMP_POS,
  VEHICLE_GARAGE_POS,
  WATERFALL_POS,
  WHEATFIELD_POS,
  getBiomeAt,
  getTerrainHeight,
} from '@/game/world/terrain';

interface IslandMapModalProps {
  hud: HUDStateSnapshot;
  onClose: () => void;
}

export function IslandMapModal({ hud, onClose }: IslandMapModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 340;
    const worldSpan = 320; // -160 .. +160
    const fogGrid = 32;
    const exploredSet = new Set(hud.exploredCells || []);
    const isExploredWorld = (wx: number, wz: number) => {
      const gx = Math.floor(((wx + worldSpan / 2) / worldSpan) * fogGrid);
      const gz = Math.floor(((wz + worldSpan / 2) / worldSpan) * fogGrid);
      return exploredSet.has(gz * fogGrid + gx);
    };

    const img = ctx.createImageData(size, size);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const wx = ((px / size) - 0.5) * worldSpan;
        const wz = ((py / size) - 0.5) * worldSpan;
        const explored = isExploredWorld(wx, wz);

        let r = 15,
          g = 23,
          b = 34;

        if (explored) {
          const h = getTerrainHeight(wx, wz);
          const biome = getBiomeAt(wx, wz);
          const dSnow = Math.hypot(wx - SNOWY_WOODLAND_POS.x, wz - SNOWY_WOODLAND_POS.z);
          const dAutumn = Math.hypot(wx - AUTUMN_GROVE_POS.x, wz - AUTUMN_GROVE_POS.z);
          const dSwamp = Math.hypot(wx - SWAMP_POS.x, wz - SWAMP_POS.z);
          const dWheat = Math.hypot(wx - WHEATFIELD_POS.x, wz - WHEATFIELD_POS.z);
          const inHouse =
            Math.abs(wx - HILL_HOUSE_POS.x) < 5.6 &&
            Math.abs(wz - HILL_HOUSE_POS.z) < 4.6;
          const inGarage =
            Math.abs(wx - VEHICLE_GARAGE_POS.x) < 7.2 &&
            Math.abs(wz - VEHICLE_GARAGE_POS.z) < 5.2;

          if (inHouse) {
            r = 165;
            g = 96;
            b = 58;
          } else if (inGarage) {
            r = 100;
            g = 116;
            b = 139;
          } else if (dWheat < 7.8) {
            r = 212;
            g = 172;
            b = 64;
          } else if (dSwamp < SWAMP_POS.radius + 1.5) {
            r = 45;
            g = 62;
            b = 34;
          } else if (dSnow < 12.5) {
            r = 216;
            g = 226;
            b = 238;
          } else if (dAutumn < 10.5) {
            r = 152;
            g = 90;
            b = 44;
          } else if (biome === 'ocean' || h < -0.2) {
            const depth = Math.max(0, Math.min(1, (-h) / 5));
            r = 12 - depth * 6;
            g = 84 - depth * 35;
            b = 125 - depth * 35;
          } else if (biome === 'lake' || biome === 'river') {
            r = 20;
            g = 184;
            b = 166;
          } else if (biome === 'beach') {
            r = 230;
            g = 200;
            b = 135;
          } else if (biome === 'mountain' || biome === 'cave') {
            const shade = Math.min(45, h * 1.8);
            r = 82 + shade;
            g = 76 + shade;
            b = 70 + shade;
          } else if (biome === 'grassland') {
            r = 128;
            g = 162;
            b = 60;
          } else if (biome === 'expedition') {
            r = 165;
            g = 120;
            b = 70;
          } else {
            r = 46;
            g = 112;
            b = 54;
          }
        }

        const idx = (py * size + px) * 4;
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const toPx = (wx: number, wz: number) => ({
      x: ((wx / worldSpan) + 0.5) * size,
      y: ((wz / worldSpan) + 0.5) * size,
    });

    // Discovered Landmarks only
    const landmarks = [
      { label: 'Waterfall', pos: WATERFALL_POS, color: '#67e8f9' },
      { label: 'Obsidian Cave', pos: CAVE_POS, color: '#cbd5e1' },
      { label: 'Snowy Woodland', pos: SNOWY_WOODLAND_POS, color: '#e2e8f0' },
      { label: 'Expedition', pos: EXPEDITION_POS, color: '#fbbf24' },
      { label: 'Autumn Grove', pos: AUTUMN_GROVE_POS, color: '#f97316' },
      { label: 'Murky Swamp', pos: SWAMP_POS, color: '#65a30d' },
      { label: 'Dead Oak Perch', pos: DEAD_OAK_POS, color: '#d6d3d1' },
      { label: 'Homestead Pasture', pos: HOMESTEAD_POS, color: '#f59e0b' },
      { label: 'Wheatfield', pos: WHEATFIELD_POS, color: '#facc15' },
      { label: 'Farmer Market', pos: FARMER_POS, color: '#4ade80' },
      { label: 'Hilltop House', pos: HILL_HOUSE_POS, color: '#fb923c' },
      { label: 'Vehicle Garage', pos: VEHICLE_GARAGE_POS, color: '#38bdf8' },
      { label: 'Azure Lake', pos: LAKE_CENTER, color: '#2dd4bf' },
    ];
    ctx.font = '600 10px sans-serif';
    landmarks.forEach((lm) => {
      if (!isExploredWorld(lm.pos.x, lm.pos.z)) return;
      const p = toPx(lm.pos.x, lm.pos.z);
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0c0a09';
      ctx.lineWidth = 2;
      ctx.strokeText(lm.label, p.x + 6, p.y + 3);
      ctx.fillText(lm.label, p.x + 6, p.y + 3);
    });

    // Placed Camp Structures
    hud.structures.forEach((st) => {
      const p = toPx(st.x, st.z);
      ctx.fillStyle = st.type === 'campfire' ? '#f97316' : '#fcd34d';
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    });

    // Tracked Dinosaur / Wildlife Sightings in explored areas
    hud.trackedSightings.forEach((s) => {
      if (!isExploredWorld(s.x, s.z)) return;
      const p = toPx(s.x, s.z);
      ctx.fillStyle =
        s.species === 'trex' ||
        s.species === 'spinosaurus' ||
        s.species === 'allosaurus' ||
        s.species === 'dilophosaurus' ||
        s.species === 'velociraptor' ||
        s.species === 'grizzly_bear' ||
        s.species === 'polar_bear' ||
        s.species === 'gray_wolf' ||
        s.species === 'african_lion' ||
        s.species === 'tiger' ||
        s.species === 'cheetah' ||
        s.species === 'hyena' ||
        s.species === 'great_white_shark' ||
        s.species === 'saltwater_crocodile'
          ? '#ef4444'
          : s.species === 'dolphin' ||
              s.species === 'sea_turtle' ||
              s.species === 'manta_ray' ||
              s.species === 'bald_eagle' ||
              s.species === 'peregrine_falcon' ||
              s.species === 'pteranodon' ||
              s.species === 'toucan' ||
              s.species === 'flamingo'
            ? '#38bdf8'
            : '#a3e635';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player Marker + Heading Arrow
    const playerP = toPx(hud.playerX, hud.playerZ);
    ctx.save();
    ctx.translate(playerP.x, playerP.y);
    ctx.rotate(-hud.playerYaw + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0c0a09';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }, [
    hud.playerX,
    hud.playerZ,
    hud.playerYaw,
    hud.structures,
    hud.trackedSightings,
    hud.exploredCells,
  ]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-stone-100">
              Island Topographical Map
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Close Map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto survival-scroll grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="w-full max-w-[340px] aspect-square rounded-xl border border-stone-700 bg-stone-950"
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-stone-950/70 border border-stone-800 p-3.5">
              <div className="text-xs text-stone-400">Current Region</div>
              <div className="text-base font-semibold text-amber-300 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{hud.biomeName}</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {BIOME_INFO[hud.biome].description}
              </p>
              <div className="text-xs font-mono-tabular text-stone-300 mt-2">
                Coords: X {Math.round(hud.playerX)} · Z {Math.round(hud.playerZ)}
              </div>
            </div>

            <div className="space-y-2 text-xs text-stone-300">
              <div className="font-semibold text-stone-100">Map Legend</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-white border border-stone-950 inline-block" />
                  <span>Explorer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" />
                  <span>Campfire / Base</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span>Predator Nearby</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-lime-400 inline-block" />
                  <span>Herbivore Herd</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" />
                  <span>Coastal Dolphins</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  <span>Expedition Camp</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-stone-400">
              Discovered Regions: {hud.visitedBiomes.length} / 9
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
