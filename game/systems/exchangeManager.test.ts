import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCustomMarketplaceSkin,
  equipCustomMarketplaceSkin,
  getCustomMarketplaceSnapshot,
  getEquippedBackpackSkin,
} from './exchangeManager';

test('new marketplace uploads remain functional while the launch catalog starts empty', () => {
  const before = getCustomMarketplaceSnapshot();
  assert.equal(before.skins.length, 0);

  const uploaded = addCustomMarketplaceSkin({
    id: 'test_launch_skin',
    name: 'Launch Test Skin',
    category: 'backpack',
    priceLabel: 'Free',
    payhipUrl: '',
    primaryHex: '#111827',
    secondaryHex: '#1f2937',
    accentHex: '#f59e0b',
    pattern: 'solid',
  });

  assert.equal(uploaded.skins.length, 1);
  assert.equal(uploaded.skins[0].id, 'test_launch_skin');
  assert.equal(uploaded.skins[0].launchVisible, true);
});

test('an imported free backpack skin becomes the equipped pack immediately', () => {
  const uploaded = addCustomMarketplaceSkin({
    id: 'test_imported_backpack',
    name: 'Imported Backpack',
    category: 'backpack',
    priceLabel: 'Free',
    payhipUrl: '',
    freeByDefault: true,
    primaryHex: '#0f766e',
    secondaryHex: '#134e4a',
    accentHex: '#fbbf24',
    pattern: 'solid',
    mediaDataUrl: 'data:image/png;base64,test',
    mediaKind: 'image',
  });
  const skin = uploaded.skins.find((entry) => entry.id === 'test_imported_backpack');
  assert.ok(skin);

  equipCustomMarketplaceSkin(skin);
  assert.equal(getEquippedBackpackSkin()?.id, 'test_imported_backpack');
});
