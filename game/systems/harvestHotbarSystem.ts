export type HarvestItem = {
  id: string;
  name: string;
  icon: string;
  quantity: number;
};

export function addHarvestToHotbar(
  hotbar: HarvestItem[],
  item: HarvestItem,
): HarvestItem[] {
  const existing = hotbar.find((slot) => slot.id === item.id);

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    hotbar.push({ ...item });
  }

  return hotbar;
}

export function collectCarcass(
  hotbar: HarvestItem[],
  carcass: {
    id: string;
    meatType: string;
    collected: boolean;
  },
) {
  if (carcass.collected) return hotbar;

  carcass.collected = true;

  return addHarvestToHotbar(hotbar, {
    id: carcass.meatType,
    name: carcass.meatType,
    icon: '🥩',
    quantity: 1,
  });
}
