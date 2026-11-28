import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, test } from 'node:test';
import { NextRequest } from 'next/server';

const dataDir = mkdtempSync(path.join(tmpdir(), 'si-auth-test-'));
process.env.EXCHANGE_DATA_DIR = dataDir;
delete process.env.MONGODB_URI;

const store = await import('./exchangeStore');
const authRoute = await import('../app/api/exchange/auth/route');
const storefrontRoute = await import('../app/api/exchange/storefront/route');
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

function signPlayerToken(params: {
  playerId: string;
  sessionVersion: number;
  expiresAt: number;
  nonce?: string;
  legacy?: boolean;
}): string {
  const secret = store.getExchangeDb().signingSecret;
  assert.ok(secret);
  const signingKey = crypto
    .createHash('sha256')
    .update(`si-player-sign:${secret}`)
    .digest('hex');
  const nonce = params.nonce || 'session-test-nonce';
  const payload = params.legacy
    ? `player.${params.playerId}.${params.expiresAt}.${nonce}`
    : `player.${params.playerId}.${params.sessionVersion}.${params.expiresAt}.${nonce}`;
  const sig = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
  return `${payload}.${sig}`;
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

test('sessions expire, reject tampering, and restore through the auth route', async () => {
  const created = await store.registerPlayerAccount({
    email: 'session@example.com',
    password: 'session-password',
  });
  assert.ok(created.account);

  const valid = store.createPlayerSessionToken(
    created.account.playerId,
    created.account.sessionVersion ?? 0,
  );
  const restore = await authRoute.GET(playerRequest(valid));
  const restored = (await restore.json()) as {
    ok: boolean;
    authenticated: boolean;
    account?: { email: string };
  };
  assert.equal(restore.status, 200);
  assert.equal(restored.authenticated, true);
  assert.equal(restored.account?.email, 'session@example.com');

  const anonymous = await authRoute.GET(playerRequest(''));
  const anonymousBody = (await anonymous.json()) as { authenticated: boolean };
  assert.equal(anonymousBody.authenticated, false);

  const expired = signPlayerToken({
    playerId: created.account.playerId,
    sessionVersion: created.account.sessionVersion ?? 0,
    expiresAt: Date.now() - 1000,
  });
  assert.equal(store.getAuthenticatedPlayer(playerRequest(expired)), null);

  const tampered = `${valid.slice(0, -1)}${valid.endsWith('0') ? '1' : '0'}`;
  assert.equal(store.getAuthenticatedPlayer(playerRequest(tampered)), null);

  // Versionless legacy sessions still work for accounts that have never reset
  // their password, and remain invalid once sessionVersion increments.
  const legacy = signPlayerToken({
    playerId: created.account.playerId,
    sessionVersion: 0,
    expiresAt: Date.now() + 60_000,
    legacy: true,
  });
  assert.equal(store.getAuthenticatedPlayer(playerRequest(legacy))?.playerId, created.account.playerId);
  const reset = await store.resetPlayerPassword({
    email: 'session@example.com',
    recoveryCode: created.recoveryCode!,
    newPassword: 'new-session-password',
  });
  assert.equal(reset.ok, true);
  assert.equal(store.getAuthenticatedPlayer(playerRequest(legacy)), null);
});

test('one player session cannot read another player account or storefront state', async () => {
  const first = await store.registerPlayerAccount({
    email: 'first@example.com',
    password: 'first-password',
  });
  const second = await store.registerPlayerAccount({
    email: 'second@example.com',
    password: 'second-password',
  });
  assert.ok(first.account);
  assert.ok(second.account);

  const secondRecord = store.getOrCreatePlayerAccount(second.account.playerId);
  secondRecord.coinBalance = 9_999;
  secondRecord.ownedProductIds.push('second_only_product');
  secondRecord.equippedBackpackSkinId = 'second_only_product';

  const firstToken = store.createPlayerSessionToken(
    first.account.playerId,
    first.account.sessionVersion ?? 0,
  );
  const secondToken = store.createPlayerSessionToken(
    second.account.playerId,
    second.account.sessionVersion ?? 0,
  );

  assert.equal(store.getAuthenticatedPlayer(playerRequest(firstToken))?.email, 'first@example.com');
  assert.equal(store.getAuthenticatedPlayer(playerRequest(secondToken))?.email, 'second@example.com');

  const firstStorefront = (await (
    await storefrontRoute.GET(playerRequest(firstToken))
  ).json()) as {
    account: { email: string } | null;
    coinBalance: number;
    ownedProductIds: string[];
    equippedBackpackSkinId: string | null;
  };
  const secondStorefront = (await (
    await storefrontRoute.GET(playerRequest(secondToken))
  ).json()) as {
    account: { email: string } | null;
    coinBalance: number;
    ownedProductIds: string[];
    equippedBackpackSkinId: string | null;
  };

  assert.equal(firstStorefront.account?.email, 'first@example.com');
  assert.equal(firstStorefront.coinBalance, 0);
  assert.equal(firstStorefront.ownedProductIds.includes('second_only_product'), false);
  assert.equal(firstStorefront.equippedBackpackSkinId, null);

  assert.equal(secondStorefront.account?.email, 'second@example.com');
  assert.equal(secondStorefront.coinBalance, 9_999);
  assert.equal(secondStorefront.ownedProductIds.includes('second_only_product'), true);
  assert.equal(secondStorefront.equippedBackpackSkinId, 'second_only_product');
});

test('auth HTTP routes register, reject duplicates and bad passwords, sign in, restore and clear the session cookie', async () => {
  const post = (body: unknown) =>
    authRoute.POST(
      new NextRequest('http://localhost/api/exchange/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  const registered = await post({
    mode: 'register',
    email: 'Route@Test.com',
    password: 'route-password',
    username: 'Route Tester',
  });
  const registeredBody = (await registered.json()) as {
    ok: boolean;
    account?: { email: string; username: string };
    recoveryCode?: string;
    sessionToken?: string;
  };
  assert.equal(registered.status, 200);
  assert.equal(registeredBody.ok, true);
  assert.equal(registeredBody.account?.email, 'route@test.com');
  assert.equal(registeredBody.account?.username, 'Route Tester');
  assert.ok(registeredBody.recoveryCode);
  assert.equal(registeredBody.sessionToken, undefined);
  const setCookie = registered.headers.get('set-cookie') || '';
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(setCookie, /Max-Age=2592000/i);
  const token = setCookie.match(new RegExp(`${store.getPlayerCookieName()}=([^;]+)`))?.[1];
  assert.ok(token);

  const duplicate = await post({
    mode: 'register',
    email: 'route@test.com',
    password: 'different-password',
  });
  assert.equal(duplicate.status, 409);
  assert.match(
    ((await duplicate.json()) as { error: string }).error,
    /already exists/i,
  );

  const wrongPassword = await post({
    mode: 'login',
    email: 'route@test.com',
    password: 'wrong-password',
  });
  assert.equal(wrongPassword.status, 401);
  assert.match(
    ((await wrongPassword.json()) as { error: string }).error,
    /invalid email or password/i,
  );

  const login = await post({
    mode: 'login',
    email: 'ROUTE@test.com',
    password: 'route-password',
  });
  const loginBody = (await login.json()) as { ok: boolean; account?: { email: string } };
  assert.equal(login.status, 200);
  assert.equal(loginBody.ok, true);
  assert.equal(loginBody.account?.email, 'route@test.com');

  const restored = await authRoute.GET(playerRequest(token!));
  const restoredBody = (await restored.json()) as {
    authenticated: boolean;
    account?: { email: string };
  };
  assert.equal(restoredBody.authenticated, true);
  assert.equal(restoredBody.account?.email, 'route@test.com');

  const invalid = await post({ mode: 'login', email: '', password: '' });
  assert.equal(invalid.status, 400);

  const loggedOut = await authRoute.DELETE();
  assert.equal(loggedOut.status, 200);
  assert.match(loggedOut.headers.get('set-cookie') || '', /Max-Age=0/i);
});

test('logout returns an expired httpOnly session cookie', async () => {
  const response = await authRoute.DELETE();
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie') || '';
  assert.match(setCookie, new RegExp(`${store.getPlayerCookieName()}=`));
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Max-Age=0/i);
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
