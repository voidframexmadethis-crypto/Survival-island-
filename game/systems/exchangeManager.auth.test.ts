import assert from 'node:assert/strict';
import { test } from 'node:test';

function installBrowserGlobals(): void {
  const values = new Map<string, string>();
  const localStorage = {
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
    removeItem(key: string) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    get length() {
      return values.size;
    },
  };
  (globalThis as unknown as { window: unknown }).window = {
    localStorage,
    location: { origin: 'https://example.test' },
  };
}

installBrowserGlobals();

const exchange = await import('./exchangeManager');
const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const account = {
  playerId: 'acct_test',
  username: 'Tester',
  email: 'tester@example.com',
  createdAt: 1,
};

test('account requests fail clearly when the server cannot be reached', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  try {
    const login = await exchange.loginPlayerAccount('tester@example.com', 'password');
    assert.equal(login.ok, false);
    assert.match(login.error || '', /cannot reach the account server/i);

    const register = await exchange.registerPlayerAccount(
      'tester@example.com',
      'password',
    );
    assert.equal(register.ok, false);
    assert.match(register.error || '', /cannot reach the account server/i);

    const reset = await exchange.resetPlayerPassword(
      'tester@example.com',
      'AAAA-AAAA-AAAA',
      'new-password',
    );
    assert.equal(reset.ok, false);
    assert.match(reset.error || '', /cannot reach the account server/i);

    const logout = await exchange.logoutPlayerAccount();
    assert.equal(logout.ok, false);
    assert.match(logout.error || '', /cannot reach the account server/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a successful sign-in is not rolled back when the storefront refresh fails', async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/api/exchange/auth')) {
      return jsonResponse({ ok: true, authenticated: true, account });
    }
    throw new TypeError('Failed to fetch');
  };
  try {
    const result = await exchange.loginPlayerAccount('tester@example.com', 'password');
    assert.equal(result.ok, true);
    assert.equal(result.account?.playerId, 'acct_test');
    assert.equal(exchange.getExchangeStateSnapshot().authenticated, true);
    assert.equal(exchange.getExchangeStateSnapshot().account?.email, 'tester@example.com');
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sign-out only clears the local account after the server accepts it', async () => {
  globalThis.fetch = async (input, init) => {
    if (String(input).endsWith('/api/exchange/auth') && init?.method === 'DELETE') {
      return jsonResponse({ ok: true, authenticated: false });
    }
    return jsonResponse({
      authenticated: false,
      account: null,
      playerId: null,
      coinBalance: 0,
      ownedProductIds: [],
      revokedProductIds: [],
      ownedProducts: [],
      equippedGunSkinsByClass: {},
      equippedBackpackSkinId: null,
      equippedCosmeticIds: [],
      products: [],
      coinPackages: [],
      transactions: [],
      pendingCheckouts: [],
      paymentProvider: {
        configured: false,
        provider: null,
        webhookConfigured: false,
      },
    });
  };
  try {
    const result = await exchange.logoutPlayerAccount();
    assert.equal(result.ok, true);
    assert.equal(exchange.getExchangeStateSnapshot().authenticated, false);
    assert.equal(exchange.getExchangeStateSnapshot().account, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
