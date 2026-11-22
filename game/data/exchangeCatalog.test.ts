import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_EXCHANGE_CATALOG,
  DEFAULT_COIN_PACKAGES,
  VAULT_PAYHIP_CATALOG,
} from './exchangeCatalog';

test('launch marketplace starts with an empty public catalog and vault', () => {
  assert.equal(DEFAULT_EXCHANGE_CATALOG.length, 0);
  assert.equal(VAULT_PAYHIP_CATALOG.length, 0);
  assert.equal(DEFAULT_COIN_PACKAGES.length, 0);
});
