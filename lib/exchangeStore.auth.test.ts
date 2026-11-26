import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, test } from 'node:test';
import { NextRequest } from 'next/server';

const dataDir = mkdtempSync(path.join(tmpdir(), 'si-auth-test-'));
process.env.EXCHANGE_DATA_DIR = dataDir;
delete process.env.MONGODB_URI;

const store = await import('./exchangeStore');
const dataFile = path.join(dataDir, 'exchange-store.json');

beforeEach(async () => {
  store.resetExchangeStoreForTests();
  rmSync(dataFile, { force: true });
  await store.loadExchangeDb();
});

function playerRequest(token: string): NextRequest {
  return new NextRequest('http://localhost/api/exchange/auth', {
    headers: { cookie: `${store.getPlayerCookieName()}=${token}` },
  });
}

function adminRequest(token: string): NextRequest {
  return new NextRequest('http://localhost/api/exchange/admin/auth', {
    headers: { cookie: `${store.getAdminCookieName()}=${token}` },
  });
}

test('owner setup is one-time and owner login checks the stored owner record', async () => {
  const created = await store.createOwnerAccount({
    email: 'Owner@Example.com',
    password: 'owner-password',
    username: 'Owner',
  });
  assert.equal(created.ok, true);
  assert.equal(created.account?.role, 'owner');
  assert.equal(created.account?.email, 'owner@example.com');
  assert.match(created.recoveryCode || '', /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  const second = await store.createOwnerAccount({
    email: 'other-owner@example.com',
    password: 'other-password',
  });
  assert.equal(second.ok, false);
  assert.equal(second.status, 409);

  const good = store.authenticateOwnerAccount({
    email: 'owner@example.com',
    password: 'owner-password',
  });
  assert.equal(good.ok, true);

  const wrong = store.authenticateOwnerAccount({
    email: 'owner@example.com',
    password: 'incorrect-password',
  });
  assert.equal(wrong.ok, false);

  const status = store.getAdminAuthConfigStatus();
  assert.equal(status.ownerExists, true);
  assert.equal(status.needsSetup, false);
});

test('customers register and sign in, and duplicate emails are rejected', async () => {
  const created = await store.registerPlayerAccount({
    email: 'Customer@Example.com',
    password: 'customer-password',
    username: 'Survivor',
  });
  assert.equal(created.ok, true);
  assert.equal(created.account?.role, 'customer');
  assert.equal(created.account?.email, 'customer@example.com');
  assert.ok(created.recoveryCode);

  const duplicate = await store.registerPlayerAccount({
    email: 'customer@example.com',
    password: 'another-password',
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.status, 409);

  const good = store.authenticatePlayerAccount({
    email: 'CUSTOMER@example.com',
    password: 'customer-password',
  });
  assert.equal(good.ok, true);

  const wrong = store.authenticatePlayerAccount({
    email: 'customer@example.com',
    password: 'not-the-password',
  });
  assert.equal(wrong.ok, false);
});

test('owner cannot be created by customer registration and owner tokens are not customer tokens', async () => {
  const owner = await store.createOwnerAccount({
    email: 'owner@example.com',
    password: 'owner-password',
  });
  const customer = await store.registerPlayerAccount({
    email: 'customer@example.com',
    password: 'customer-password',
  });
  assert.ok(owner.account);
  assert.ok(customer.account);

  const ownerToken = store.createAdminSessionToken(owner.account);
  assert.equal(store.isAdminRequestAuthorized(adminRequest(ownerToken)), true);

  const forgedCustomerAdminToken = store.createAdminSessionToken(customer.account);
  assert.equal(
    store.isAdminRequestAuthorized(adminRequest(forgedCustomerAdminToken)),
    false,
  );

  const customerSession = store.createPlayerSessionToken(
    customer.account.playerId,
    customer.account.sessionVersion ?? 0,
  );
  assert.equal(store.getAuthenticatedPlayer(playerRequest(customerSession))?.playerId, customer.account.playerId);
});

test('recovery code resets a password and invalidates the old session', async () => {
  const created = await store.registerPlayerAccount({
    email: 'reset@example.com',
    password: 'old-password',
  });
  assert.ok(created.account);
  assert.ok(created.recoveryCode);

  const oldSession = store.createPlayerSessionToken(
    created.account.playerId,
    created.account.sessionVersion ?? 0,
  );
  assert.equal(store.getAuthenticatedPlayer(playerRequest(oldSession))?.playerId, created.account.playerId);

  const wrongCode = await store.resetPlayerPassword({
    email: 'reset@example.com',
    recoveryCode: 'AAAA-AAAA-AAAA',
    newPassword: 'new-password',
  });
  assert.equal(wrongCode.ok, false);

  const reset = await store.resetPlayerPassword({
    email: 'reset@example.com',
    recoveryCode: created.recoveryCode!,
    newPassword: 'new-password',
  });
  assert.equal(reset.ok, true);
  assert.ok(reset.recoveryCode);
  assert.notEqual(reset.recoveryCode, created.recoveryCode);

  assert.equal(
    store.authenticatePlayerAccount({
      email: 'reset@example.com',
      password: 'old-password',
    }).ok,
    false,
  );
  assert.equal(
    store.authenticatePlayerAccount({
      email: 'reset@example.com',
      password: 'new-password',
    }).ok,
    true,
  );
  assert.equal(store.getAuthenticatedPlayer(playerRequest(oldSession)), null);

  const reusedCode = await store.resetPlayerPassword({
    email: 'reset@example.com',
    recoveryCode: created.recoveryCode!,
    newPassword: 'another-password',
  });
  assert.equal(reusedCode.ok, false);
});

test('password and recovery code are never written to the development store in plaintext', async () => {
  await store.createOwnerAccount({
    email: 'owner@example.com',
    password: 'plaintext-password',
  });
  const created = await store.registerPlayerAccount({
    email: 'customer@example.com',
    password: 'plaintext-password',
  });

  const raw = readFileSync(dataFile, 'utf8');
  assert.equal(raw.includes('plaintext-password'), false);
  assert.equal(raw.includes(created.recoveryCode || '__missing__'), false);
  assert.equal(raw.includes('passwordHash'), true);
  assert.equal(raw.includes('recoveryCodeHash'), true);
});
