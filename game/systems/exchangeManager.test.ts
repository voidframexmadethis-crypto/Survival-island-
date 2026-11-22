import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCustomMarketplaceSkin,
  getCustomMarketplaceSnapshot,
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
