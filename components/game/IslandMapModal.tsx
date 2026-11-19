'use client';

import React, { useEffect, useRef } from 'react';
import { Compass, MapPin, X } from 'lucide-react';
import { HUDStateSnapshot } from '@/game/types';
import {
  AUTUMN_GROVE_POS,
  BADLANDS_MINESHAFT_POS,
  BIOME_INFO,
  CAVE_POS,
  CHERRY_GROVE_POS,
  CORAL_REEF_POS,
  DEAD_OAK_POS,
  DESERT_PYRAMID_POS,
  DESERT_VILLAGE_POS,
  DRAGON_VALLEY_POS,
  EXPEDITION_POS,
  FARMER_POS,
  FROZEN_OCEAN_ICEBERG_POS,
  FROZEN_PEAKS_POS,
  HILL_HOUSE_POS,
  HOMESTEAD_POS,
  ICE_SPIKES_POS,
  JAGGED_PEAKS_POS,
  JUNGLE_TEMPLE_POS,
  LAKE_CENTER,
  MANGROVE_SWAMP_POS,
  MUSHROOM_FIELDS_POS,
  OCEAN_MONUMENT_POS,
  PILLAGER_OUTPOST_POS,
  PLAINS_VILLAGE_POS,
  RESORT_CORNER_POS,
  RUINED_CASTLE_POS,
  RUINED_PORTAL_POS,
  SAVANNA_VILLAGE_POS,
  SNOWY_IGLOO_POS,
  SNOWY_SLOPES_IGLOO_POS,
  SNOWY_VILLAGE_POS,
  VIKING_VILLAGE_POS,
  SNOWY_WOODLAND_POS,
  STONY_PEAKS_POS,
  SUNFLOWER_VILLAGE_POS,
  SWAMP_HUT_POS,
  SWAMP_POS,
  TAIGA_VILLAGE_POS,
  TRAIL_RUINS_POS,
  TRIAL_CHAMBERS_POS,
  VEHICLE_GARAGE_POS,
  WATERFALL_POS,
  WHEATFIELD_POS,
  WOODLAND_MANSION_POS,
  getBiomeAt,
  getTerrainHeight,
} from '@/game/world/terrain';

interface IslandMapModalProps {
  hud: HUDStateSnapshot;
  onClose: () => void;
}

export function IslandMapModal({ hud, onClose }: IslandMapModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isFlat = hud.worldType === 'flat';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 340;
    const worldSpan = isFlat ? 640 : 1760; // Flat covers -320..+320, Grand Finale Island covers -880..+880
    const fogGrid = 32;
    const exploredSet = new Set(hud.exploredCells || []);
    const isExploredWorld = (wx: number, wz: number) => {
      if (isFlat) return true;
      const gx = Math.floor(((wx + worldSpan / 2) / worldSpan) * fogGrid);
      const gz = Math.floor(((wz + worldSpan / 2) / worldSpan) * fogGrid);
      return exploredSet.has(gz * fogGrid + gx);
    };

    const toPx = (wx: number, wz: number) => ({
      x: ((wx / worldSpan) + 0.5) * size,
      y: ((wz / worldSpan) + 0.5) * size,
    });

    if (isFlat) {
      // Level Flat Park Grounds background + grid
      const concrete = hud.flatSurfaceStyle === 'concrete_plaza';
      ctx.fillStyle = concrete ? '#475569' : '#245228';
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = concrete ? '#64748b' : '#2f6b35';
      ctx.lineWidth = 1;
      for (let w = -320; w <= 320; w += 32) {
        const p = toPx(w, w);
        ctx.beginPath();
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, p.y);
        ctx.lineTo(size, p.y);
        ctx.stroke();
      }

      // Park boundary circle (310m radius)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, (310 / worldSpan) * size, 0, Math.PI * 2);
      ctx.stroke();

      // Park Hub & Music Pro Pavilion at center
      const hub = toPx(0, 0);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 10px sans-serif';
      ctx.strokeStyle = '#0c0a09';
      ctx.lineWidth = 2;
      ctx.strokeText('Park Hub & Music Pro', hub.x + 7, hub.y + 3);
      ctx.fillText('Park Hub & Music Pro', hub.x + 7, hub.y + 3);
    } else {
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
              Math.abs(wx - VEHICLE_GARAGE_POS.x) < 11.2 &&
              Math.abs(wz - VEHICLE_GARAGE_POS.z) < 6.8;

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
            } else if (biome === 'warm_ocean') {
              r = 14;
              g = 165;
              b = 185;
            } else if (biome === 'lukewarm_ocean') {
              r = 14;
              g = 116;
              b = 168;
            } else if (biome === 'cold_ocean') {
              r = 24;
              g = 72;
              b = 148;
            } else if (biome === 'frozen_ocean') {
              r = 134;
              g = 186;
              b = 232;
            } else if (biome === 'ocean' || h < -0.2) {
              const depth = Math.max(0, Math.min(1, (-h) / 5));
              r = 12 - depth * 6;
              g = 84 - depth * 35;
              b = 125 - depth * 35;
            } else if (biome === 'frozen_river') {
              r = 182;
              g = 228;
              b = 250;
            } else if (biome === 'lake' || biome === 'river') {
              r = 20;
              g = 184;
              b = 166;
            } else if (biome === 'snowy_beach') {
              r = 226;
              g = 234;
              b = 242;
            } else if (biome === 'stony_shore') {
              r = 122;
              g = 118;
              b = 112;
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
            } else if (biome === 'snowy_taiga') {
              r = 214;
              g = 226;
              b = 238;
            } else if (biome === 'old_growth_pine_taiga') {
              r = 78;
              g = 68;
              b = 44;
            } else if (biome === 'old_growth_spruce_taiga') {
              r = 38;
              g = 76;
              b = 58;
            } else if (biome === 'taiga') {
              r = 40;
              g = 94;
              b = 62;
            } else if (biome === 'pale_garden') {
              r = 126;
              g = 134;
              b = 129;
            } else if (biome === 'flower_forest') {
              r = 198;
              g = 92;
              b = 148;
            } else if (biome === 'birch_forest') {
              r = 124;
              g = 176;
              b = 66;
            } else if (biome === 'old_growth_birch_forest') {
              r = 88;
              g = 142;
              b = 52;
            } else if (biome === 'jungle') {
              r = 24;
              g = 110;
              b = 56;
            } else if (biome === 'sparse_jungle') {
              r = 66;
              g = 152;
              b = 78;
            } else if (biome === 'bamboo_jungle') {
              r = 112;
              g = 172;
              b = 50;
            } else if (biome === 'dark_forest') {
              r = 30;
              g = 58;
              b = 36;
            } else if (biome === 'plains') {
              r = 126;
              g = 184;
              b = 84;
            } else if (biome === 'sunflower_plains') {
              r = 212;
              g = 190;
              b = 62;
            } else if (biome === 'snowy_plains') {
              r = 228;
              g = 238;
              b = 248;
            } else if (biome === 'ice_spikes') {
              r = 124;
              g = 198;
              b = 245;
            } else if (biome === 'meadow') {
              r = 96;
              g = 168;
              b = 110;
            } else if (biome === 'cherry_grove') {
              r = 242;
              g = 164;
              b = 198;
            } else if (biome === 'grove') {
              r = 178;
              g = 204;
              b = 216;
            } else if (biome === 'snowy_slopes') {
              r = 236;
              g = 244;
              b = 252;
            } else if (biome === 'jagged_peaks') {
              r = 148;
              g = 158;
              b = 172;
            } else if (biome === 'frozen_peaks') {
              r = 154;
              g = 212;
              b = 244;
            } else if (biome === 'stony_peaks') {
              r = 166;
              g = 164;
              b = 158;
            } else if (biome === 'windswept_hills') {
              r = 104;
              g = 132;
              b = 102;
            } else if (biome === 'windswept_gravelly_hills') {
              r = 138;
              g = 136;
              b = 132;
            } else if (biome === 'windswept_forest') {
              r = 66;
              g = 108;
              b = 76;
            } else if (biome === 'desert') {
              r = 234;
              g = 204;
              b = 132;
            } else if (biome === 'savanna') {
              r = 184;
              g = 160;
              b = 78;
            } else if (biome === 'savanna_plateau') {
              r = 164;
              g = 142;
              b = 68;
            } else if (biome === 'windswept_savanna') {
              r = 144;
              g = 132;
              b = 88;
            } else if (biome === 'badlands') {
              r = 198;
              g = 90;
              b = 52;
            } else if (biome === 'wooded_badlands') {
              r = 166;
              g = 104;
              b = 58;
            } else if (biome === 'eroded_badlands') {
              r = 222;
              g = 110;
              b = 58;
            } else if (biome === 'swamp') {
              r = 74;
              g = 104;
              b = 56;
            } else if (biome === 'mangrove_swamp') {
              r = 54;
              g = 90;
              b = 56;
            } else if (biome === 'mushroom_fields') {
              r = 146;
              g = 114;
              b = 166;
            } else if (biome === 'dragon_valley') {
              r = 168;
              g = 38;
              b = 34;
            } else if (biome === 'viking_village') {
              r = 84;
              g = 112;
              b = 58;
            } else if (biome === 'resort_corner') {
              r = 45;
              g = 212;
              b = 191;
            } else if (biome === 'ruined_castle') {
              r = 102;
              g = 72;
              b = 168;
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

      // Discovered Landmarks only
      const landmarks = [
        { label: 'Dragon Valley', pos: DRAGON_VALLEY_POS, color: '#ef4444' },
        { label: 'Viking Village', pos: VIKING_VILLAGE_POS, color: '#84cc16' },
        { label: 'Resort Corner', pos: RESORT_CORNER_POS, color: '#22d3ee' },
        { label: 'Ruined Castle', pos: RUINED_CASTLE_POS, color: '#a855f7' },
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
        { label: 'Trial Chambers', pos: TRIAL_CHAMBERS_POS, color: '#ea580c' },
        { label: 'Woodland Mansion', pos: WOODLAND_MANSION_POS, color: '#78350f' },
        { label: 'Taiga Village', pos: TAIGA_VILLAGE_POS, color: '#86efac' },
        { label: 'Pillager Outpost', pos: PILLAGER_OUTPOST_POS, color: '#f87171' },
        { label: 'Trail Ruins', pos: TRAIL_RUINS_POS, color: '#c084fc' },
        { label: 'Snowy Village', pos: SNOWY_VILLAGE_POS, color: '#bae6fd' },
        { label: 'Ice Igloo', pos: SNOWY_IGLOO_POS, color: '#f0f9ff' },
        { label: 'Jungle Temple', pos: JUNGLE_TEMPLE_POS, color: '#34d399' },
        { label: 'Plains Village', pos: PLAINS_VILLAGE_POS, color: '#a3e635' },
        { label: 'Sunflower Village', pos: SUNFLOWER_VILLAGE_POS, color: '#fde047' },
        { label: 'Ruined Portal', pos: RUINED_PORTAL_POS, color: '#a855f7' },
        { label: 'Cherry Grove', pos: CHERRY_GROVE_POS, color: '#f472b6' },
        { label: 'Ice Spikes', pos: ICE_SPIKES_POS, color: '#7dd3fc' },
        { label: 'Jagged Peaks', pos: JAGGED_PEAKS_POS, color: '#e2e8f0' },
        { label: 'Frozen Peaks', pos: FROZEN_PEAKS_POS, color: '#bae6fd' },
        { label: 'Stony Peaks', pos: STONY_PEAKS_POS, color: '#d6d3d1' },
        { label: 'Slopes Igloo', pos: SNOWY_SLOPES_IGLOO_POS, color: '#f8fafc' },
        { label: 'Desert Pyramid', pos: DESERT_PYRAMID_POS, color: '#fcd34d' },
        { label: 'Desert Village', pos: DESERT_VILLAGE_POS, color: '#fde68a' },
        { label: 'Savanna Village', pos: SAVANNA_VILLAGE_POS, color: '#d97706' },
        { label: 'Mineshaft', pos: BADLANDS_MINESHAFT_POS, color: '#ea580c' },
        { label: 'Swamp Hut', pos: SWAMP_HUT_POS, color: '#84cc16' },
        { label: 'Mangrove', pos: MANGROVE_SWAMP_POS, color: '#22c55e' },
        { label: 'Mushroom Fields', pos: MUSHROOM_FIELDS_POS, color: '#c084fc' },
        { label: 'Ocean Monument', pos: OCEAN_MONUMENT_POS, color: '#2dd4bf' },
        { label: 'Coral Reef', pos: CORAL_REEF_POS, color: '#fb7185' },
        { label: 'Icebergs', pos: FROZEN_OCEAN_ICEBERG_POS, color: '#93c5fd' },
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
    }

    // Roller Coasters overlay (works on both Flat and Island worlds)
    (hud.coasters || []).forEach((coaster) => {
      if (!coaster.nodes || coaster.nodes.length < 2) return;
      ctx.strokeStyle = coaster.trackColor || '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      coaster.nodes.forEach((node, idx) => {
        const p = toPx(node.position.x, node.position.z);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });

    // Placed Structures
    hud.structures.forEach((st) => {
      const p = toPx(st.x, st.z);
      ctx.fillStyle =
        st.type === 'coaster_station'
          ? '#38bdf8'
          : st.type === 'campfire'
            ? '#f97316'
            : '#fcd34d';
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    });

    // Tracked Dinosaur / Wildlife Sightings in explored areas (Island World)
    if (!isFlat) {
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
          s.species === 'creaking' ||
          s.species === 'vex' ||
          s.species === 'evoker' ||
          s.species === 'pillager' ||
          s.species === 'witch' ||
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
    }

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
    isFlat,
    hud.flatSurfaceStyle,
    hud.coasters,
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
              {isFlat ? 'Flat Park Grounds Map' : 'Island Topographical Map'}
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
              <div className="text-xs text-stone-400">
                {isFlat ? 'Park Zone' : 'Current Region'}
              </div>
              <div className="text-base font-semibold text-amber-300 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{isFlat ? 'Flat Park Grounds' : hud.biomeName}</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {isFlat
                  ? '310m radius level buildable terrain with central Music Pro Pavilion, Smart TV Lounge, and Roller Coaster build zones.'
                  : BIOME_INFO[hud.biome].description}
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
                  <span>{isFlat ? 'Builder' : 'Explorer'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-sky-400 inline-block" />
                  <span>Coaster Station / Hub</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-amber-300 inline-block" />
                  <span>Placed Structure</span>
                </div>
                {!isFlat && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                      <span>Predator Nearby</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-lime-400 inline-block" />
                      <span>Herbivore Herd</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                      <span>Expedition Camp</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-xs text-stone-400">
              {isFlat
                ? `Active Coasters: ${hud.coasters?.length ?? 0} · Placed Structures: ${hud.structures.length}`
                : `Discovered Regions: ${hud.visitedBiomes.length} / ${Object.keys(BIOME_INFO).length}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
