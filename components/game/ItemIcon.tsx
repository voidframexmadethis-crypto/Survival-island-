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
  Cherry,
  Compass,
  CookingPot,
  Crosshair,
  Droplet,
  Drumstick,
  Feather,
  Fish,
  Flame,
  Gem,
  Hammer,
  Home,
  Layers,
  Leaf,
  Mountain,
  Nut,
  Pickaxe,
  Shield,
  Soup,
  Sparkles,
  Sprout,
  Sword,
  Target,
  Trees,
  Utensils,
  Waves,
  Wheat,
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
      return <Sprout {...props} />;
    case 'wheat':
      return <Wheat {...props} />;
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
    case 'bread':
      return <Wheat {...props} />;
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
    default:
      return <Box {...props} />;
  }
}
