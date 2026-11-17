'use client';

import React from 'react';
import {
  Anchor,
  Apple,
  Axe,
  Banana,
  Beef,
  BedDouble,
  Bone,
  Box,
  Cake,
  Candy,
  Car,
  Carrot,
  Cherry,
  CircleDot,
  Cog,
  Compass,
  Cookie,
  CookingPot,
  Croissant,
  Crosshair,
  Cylinder,
  Droplet,
  Drumstick,
  Egg,
  Factory,
  Feather,
  Fish,
  Flame,
  FlaskConical,
  Gauge,
  Gem,
  GitCommitHorizontal,
  GlassWater,
  Hammer,
  Home,
  Layers,
  Leaf,
  Milk,
  Mountain,
  Nut,
  Orbit,
  Package,
  Pickaxe,
  Salad,
  Scissors,
  Settings2,
  Shield,
  ShieldAlert,
  Soup,
  Sparkles,
  Sprout,
  Sword,
  Target,
  Trees,
  Tv,
  Utensils,
  Waves,
  Wheat,
  Wrench,
  Zap,
} from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { ItemId } from '@/game/types';

export function ItemIcon({
  itemId,
  className = 'w-5 h-5',
}: {
  itemId: ItemId;
  className?: string;
}) {
  const def = ITEMS[itemId];
  const props = { className, style: { color: def.color } };

  switch (def.iconKey) {
    case 'logs':
      return <Trees {...props} />;
    case 'branch':
      return <Feather {...props} />;
    case 'stone':
      return <Mountain {...props} />;
    case 'flint':
      return <Gem {...props} />;
    case 'ore':
      return <Sparkles {...props} />;
    case 'fiber':
    case 'grass':
    case 'sugarcane':
    case 'seed':
      return <Sprout {...props} />;
    case 'wheat':
      return <Wheat {...props} />;
    case 'flour':
    case 'sugar':
    case 'salt':
    case 'butter':
      return <Package {...props} />;
    case 'dough':
    case 'bread':
    case 'bread_loaf':
      return <Croissant {...props} />;
    case 'milk':
      return <Milk {...props} />;
    case 'egg':
      return <Egg {...props} />;
    case 'chocolate':
      return <Candy {...props} />;
    case 'cake':
      return <Cake {...props} />;
    case 'cookies':
      return <Cookie {...props} />;
    case 'lettuce':
      return <Leaf {...props} />;
    case 'tomato':
    case 'onion':
    case 'garlic':
    case 'potato':
    case 'pumpkin':
      return <CircleDot {...props} />;
    case 'cucumber':
    case 'jalapeno':
    case 'bell_pepper':
    case 'corn':
      return <Sprout {...props} />;
    case 'carrot':
      return <Carrot {...props} />;
    case 'salad':
      return <Salad {...props} />;
    case 'sickle':
      return <Scissors {...props} />;
    case 'clay':
      return <Layers {...props} />;
    case 'sand':
      return <Waves {...props} />;
    case 'berries':
      return <Cherry {...props} />;
    case 'coconut':
      return <Nut {...props} />;
    case 'apple':
      return <Apple {...props} />;
    case 'banana':
      return <Banana {...props} />;
    case 'maple_syrup':
      return <Droplet {...props} />;
    case 'mushroom':
      return <Sprout {...props} />;
    case 'leaf':
      return <Leaf {...props} />;
    case 'raw_meat':
    case 'dino_meat':
      return <Beef {...props} />;
    case 'roasted_meat':
    case 'roasted_dino_meat':
      return <Drumstick {...props} />;
    case 'roasted_coconut':
      return <Nut {...props} />;
    case 'roasted_banana':
      return <Banana {...props} />;
    case 'baked_apple':
      return <Apple {...props} />;
    case 'maple_glazed_fruit':
      return <Sparkles {...props} />;
    case 'berry_medley':
      return <Utensils {...props} />;
    case 'stew':
    case 'dino_feast':
      return <Soup {...props} />;
    case 'grilled_fish':
    case 'coconut_fish_curry':
    case 'fish':
      return <Fish {...props} />;
    case 'hide':
      return <Shield {...props} />;
    case 'bone':
      return <Bone {...props} />;
    case 'axe':
      return <Axe {...props} />;
    case 'pickaxe':
      return <Pickaxe {...props} />;
    case 'club':
    case 'warhammer':
      return <Hammer {...props} />;
    case 'knife':
    case 'spear':
      return <Sword {...props} />;
    case 'rope':
    case 'whip':
      return <Compass {...props} />;
    case 'lasso':
      return <Target {...props} />;
    case 'gun':
      return <Crosshair {...props} />;
    case 'ammo':
      return <Target {...props} />;
    case 'bow':
    case 'arrows':
      return <Crosshair {...props} />;
    case 'fishing_rod':
      return <Anchor {...props} />;
    case 'dirty_bottle':
      return <FlaskConical {...props} />;
    case 'filtered_bottle':
      return <GlassWater {...props} />;
    case 'campfire':
      return <Flame {...props} />;
    case 'bed':
      return <BedDouble {...props} />;
    case 'chest':
      return <Box {...props} />;
    case 'table':
      return <Hammer {...props} />;
    case 'cooking_station':
      return <CookingPot {...props} />;
    case 'shelter':
      return <Home {...props} />;
    case 'shovel':
      return <Pickaxe {...props} />;
    case 'powder_keg':
      return <Flame {...props} />;
    case 'water_torrent':
      return <Waves {...props} />;
    case 'stone_block':
      return <Box {...props} />;
    case 'stone_pillar':
    case 'timber_pillar':
      return <Layers {...props} />;
    case 'stone_arch':
      return <Anchor {...props} />;
    case 'timber_beam':
      return <Hammer {...props} />;
    case 'water_wheel':
      return <Settings2 {...props} />;
    case 'steam_boiler':
      return <Gauge {...props} />;
    case 'steam_engine':
      return <Cog {...props} />;
    case 'drive_shaft':
      return <GitCommitHorizontal {...props} />;
    case 'gear_box':
      return <Cog {...props} />;
    case 'belt_pulley':
      return <Wrench {...props} />;
    case 'fluid_pipe':
      return <Cylinder {...props} />;
    case 'auto_assembler':
      return <Factory {...props} />;
    case 'vehicle_chassis_kit':
      return <Car {...props} />;
    case 'auto_turret':
      return <Crosshair {...props} />;
    case 'smart_tv':
      return <Tv {...props} />;
    case 'gravity_monolith':
      return <Zap {...props} />;
    case 'spike_barricade':
      return <ShieldAlert {...props} />;
    case 'timeshift_sundial':
      return <Compass {...props} />;
    case 'portal_gun':
      return <Orbit {...props} />;
    case 'alien_plasma_gun':
      return <Zap {...props} />;
    case 'inferno_blade':
      return <Flame {...props} />;
    case 'diamond_ammo':
      return <Sparkles {...props} />;
    case 'crystal_armor':
      return <Shield {...props} />;
    case 'nether_ember':
      return <Flame {...props} />;
    case 'alien_core':
      return <Orbit {...props} />;
    case 'diamond_crystal':
      return <Gem {...props} />;
    default:
      return <Box {...props} />;
  }
}
