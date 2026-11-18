export type InventoryItem = {
  id: string;
  name: string;
  icon: string;
  quantity: number;
  category: 'carcass' | 'meat';
  animalId?: string;
  image?: string;
};

export type DeadAnimal = {
  id: string;
  species: string;
  displayName: string;
  carcassIcon: string;
  meatIcon: string;
  meatName: string;
  harvested: boolean;
};

export type PlayerInventory = {
  items: InventoryItem[];
  hotbar: InventoryItem[];
};

function addOrStack(
  items: InventoryItem[],
  newItem: InventoryItem,
): InventoryItem[] {
  const existing = items.find((item) => item.id === newItem.id);

  if (existing) {
    return items.map((item) =>
      item.id === newItem.id
        ? { ...item, quantity: item.quantity + newItem.quantity }
        : item,
    );
  }

  return [...items, { ...newItem }];
}

export function harvestDeadAnimal(
  animal: DeadAnimal,
  inventory: PlayerInventory,
): PlayerInventory {
  if (animal.harvested) return inventory;

  animal.harvested = true;

  const carcass: InventoryItem = {
    id: `carcass_${animal.species}`,
    name: `${animal.displayName} Carcass`,
    icon: animal.carcassIcon,
    quantity: 1,
    category: 'carcass',
    animalId: animal.id,
  };

  const meat: InventoryItem = {
    id: `meat_${animal.species}`,
    name: `${animal.displayName} Meat`,
    icon: animal.meatIcon,
    quantity: 1,
    category: 'meat',
  };

  return {
    items: addOrStack(addOrStack(inventory.items, carcass), meat),
    hotbar: addOrStack(addOrStack(inventory.hotbar, carcass), meat),
  };
}
