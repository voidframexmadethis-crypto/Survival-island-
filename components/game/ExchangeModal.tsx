'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Backpack,
  Check,
  Coins,
  CreditCard,
  Crosshair,
  History,
  Lock,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  ExchangeProduct,
  GunWeaponClass,
  RARITY_META,
  WEAPON_CLASS_LABELS,
  formatCurrencyPrice,
} from '@/game/data/exchangeCatalog';
import {
  ExchangeStorefrontState,
  PayhipPurchaseStatus,
  createPayhipCheckout,
  equipExchangeProduct,
  getExchangeStateSnapshot,
  markPayhipCheckoutPending,
  pollPayhipCheckoutStatus,
  purchaseExchangeProduct,
  refreshStorefront,
  requestCoinPackageCheckout,
  subscribeExchangeState,
} from '@/game/systems/exchangeManager';
import { ExchangePreview3D } from './ExchangePreview3D';
import { ExchangeAdminPanel } from './ExchangeAdminPanel';
import { PlayerAccountAuthPanel } from './PlayerAccountAuthPanel';
import { isNativeMobileApp } from '@/game/systems/apiConfig';

interface ExchangeModalProps {
  onClose: () => void;
  onCosmeticsChanged?: () => void;
  onOpenVaultStore?: () => void;
  onOpenCustomMarketplace?: () => void;
}

type StoreSection =
  | 'featured'
  | 'gun_skins'
  | 'backpack_skins'
  | 'cosmetics'
  | 'new_arrivals'
  | 'best_sellers'
  | 'owned';

type TopView = 'store' | 'buy_coins' | 'history' | 'admin';

export function ExchangeModal({
  onClose,
  onCosmeticsChanged,
  onOpenVaultStore,
  onOpenCustomMarketplace,
}: ExchangeModalProps) {
  const [state, setState] = useState<ExchangeStorefrontState>(() =>
    getExchangeStateSnapshot(),
  );
  const nativePurchasesBlocked = isNativeMobileApp();
  const [topView, setTopView] = useState<TopView>('store');
  const [section, setSection] = useState<StoreSection>('featured');
  const [weaponFilter, setWeaponFilter] = useState<GunWeaponClass | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<ExchangeProduct | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [payhipCheckout, setPayhipCheckout] = useState<{
    checkoutId: string;
    productId: string;
    productName: string;
    url: string;
    status: PayhipPurchaseStatus;
  } | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'warn' | 'err' } | null>(
    null,
  );

  const reload = useCallback(async () => {
    try {
      const fresh = await refreshStorefront();
      setState(fresh);
    } catch {
      // keep existing snapshot
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeExchangeState(() => {
      setState({ ...getExchangeStateSnapshot() });
    });
    void refreshStorefront().catch(() => {
      // keep cached snapshot
    });
    return unsub;
  }, []);

  // Poll active Payhip checkout verification status until terminal delivered/failed/refunded state
  useEffect(() => {
    if (!payhipCheckout?.checkoutId) return;
    let cancelled = false;
    const checkoutId = payhipCheckout.checkoutId;
    const poll = async () => {
      const res = await pollPayhipCheckoutStatus(checkoutId);
      if (cancelled || !res.ok) return;
      if (res.status === 'delivered' || res.delivered) {
        setPayhipCheckout(null);
        setNotice({
          text: 'Payment successful — Item delivered successfully',
          tone: 'ok',
        });
        onCosmeticsChanged?.();
      } else if (res.status === 'failed') {
        setPayhipCheckout(null);
        setNotice({
          text: 'Payment unsuccessful',
          tone: 'err',
        });
      } else if (res.status === 'refunded') {
        setPayhipCheckout(null);
        setNotice({
          text: 'Payment refunded — item entitlement revoked.',
          tone: 'warn',
        });
        onCosmeticsChanged?.();
      } else if (res.status && res.status !== payhipCheckout.status) {
        setPayhipCheckout((prev) => (prev ? { ...prev, status: res.status! } : null));
        if (res.statusMessage) {
          setNotice({ text: res.statusMessage, tone: 'warn' });
        }
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [payhipCheckout?.checkoutId, payhipCheckout?.status, onCosmeticsChanged]);

  const visibleProducts = useMemo(() => {
    if (section === 'owned') {
      return state.ownedProducts;
    }
    let list = state.products;
    if (section === 'featured') {
      list = list.filter((p) => p.featured);
    } else if (section === 'gun_skins') {
      list = list.filter((p) => p.category === 'gun_skin');
      if (weaponFilter !== 'all') {
        list = list.filter((p) => p.weaponClass === weaponFilter);
      }
    } else if (section === 'backpack_skins') {
      list = list.filter((p) => p.category === 'backpack_skin');
    } else if (section === 'cosmetics') {
      list = list.filter((p) => p.category === 'cosmetic');
    } else if (section === 'new_arrivals') {
      list = list.filter((p) => p.newArrival);
    } else if (section === 'best_sellers') {
      list = list.filter((p) => p.bestSeller);
    }
    return list;
  }, [section, state.ownedProducts, state.products, weaponFilter]);

  const selectedProduct = useMemo(() => {
    if (selectedId) {
      const found =
        visibleProducts.find((p) => p.id === selectedId) ||
        state.products.find((p) => p.id === selectedId) ||
        state.ownedProducts.find((p) => p.id === selectedId);
      if (found) return found;
    }
    return visibleProducts[0] || null;
  }, [selectedId, visibleProducts, state.products, state.ownedProducts]);

  const isOwned = (p: ExchangeProduct) =>
    Boolean(p.freeByDefault) || state.ownedProductIds.includes(p.id);

  const isPayhipProduct = (p: ExchangeProduct) =>
    Boolean(p.payhipUrl || (p.realMoneyAmount && p.realMoneyAmount > 0));

  const formatProductPriceBadge = (p: ExchangeProduct) => {
    if (p.freeByDefault || (!isPayhipProduct(p) && p.price <= 0)) return 'Free';
    if (isPayhipProduct(p) && p.realMoneyAmount && p.realMoneyAmount > 0) {
      return formatCurrencyPrice(p.realMoneyAmount, p.realMoneyCurrency || 'USD');
    }
    return `${p.price.toLocaleString()} SI`;
  };

  const isEquipped = (p: ExchangeProduct) => {
    if (p.category === 'gun_skin') {
      if (p.weaponClass && state.equippedGunSkinsByClass[p.weaponClass] === p.id) {
        return true;
      }
      return Object.values(state.equippedGunSkinsByClass).includes(p.id);
    }
    if (p.category === 'backpack_skin') {
      return state.equippedBackpackSkinId === p.id;
    }
    if (p.category === 'cosmetic') {
      return state.equippedCosmeticIds.includes(p.id);
    }
    return false;
  };

  const handleStartPayhipPurchase = async (product: ExchangeProduct) => {
    if (nativePurchasesBlocked) {
      setNotice({
        text: 'Purchases are available on the website. Items already owned can be equipped here.',
        tone: 'warn',
      });
      return;
    }
    if (!state.authenticated) {
      setShowAuthPrompt(true);
      setNotice({
        text: 'Sign in or create an account before completing your Payhip purchase.',
        tone: 'warn',
      });
      return;
    }
    setBusyAction(true);
    setNotice({ text: 'Waiting for payment confirmation', tone: 'warn' });
    const res = await createPayhipCheckout(product.id);
    setBusyAction(false);
    if (!res.ok || !res.checkoutUrl || !res.checkoutId) {
      if (res.authRequired) setShowAuthPrompt(true);
      setNotice({
        text: res.error || 'Payment unsuccessful',
        tone: 'err',
      });
      return;
    }
    setPayhipCheckout({
      checkoutId: res.checkoutId,
      productId: product.id,
      productName: product.name,
      url: res.checkoutUrl,
      status: res.status || 'waiting_confirmation',
    });
    setNotice({
      text: res.statusMessage || 'Waiting for payment confirmation',
      tone: 'warn',
    });
  };

  const handleClosePayhipFrame = async () => {
    if (payhipCheckout) {
      const res = await markPayhipCheckoutPending(payhipCheckout.checkoutId);
      setNotice({
        text: res.statusMessage || 'Purchase pending verification',
        tone: 'warn',
      });
    }
    setPayhipCheckout(null);
  };

  const handleConfirmPurchase = async () => {
    if (!confirmItem) return;
    if (nativePurchasesBlocked) {
      setConfirmItem(null);
      setNotice({
        text: 'Purchases are available on the website. Items already owned can be equipped here.',
        tone: 'warn',
      });
      return;
    }
    if (!state.authenticated) {
      setConfirmItem(null);
      setShowAuthPrompt(true);
      setNotice({
        text: 'Please sign in to your Survival Island account first.',
        tone: 'warn',
      });
      return;
    }
    setBusyAction(true);
    setNotice(null);
    const res = await purchaseExchangeProduct(confirmItem.id);
    setBusyAction(false);
    setConfirmItem(null);
    if (!res.ok) {
      if (res.authRequired) setShowAuthPrompt(true);
      setNotice({
        text: res.error || 'Could not complete purchase.',
        tone: res.insufficientFunds ? 'warn' : 'err',
      });
      return;
    }
    setNotice({
      text: `Item delivered successfully — "${confirmItem.name}" is now owned.`,
      tone: 'ok',
    });
  };

  const handleToggleEquip = async (p: ExchangeProduct) => {
    if (!state.authenticated) {
      setShowAuthPrompt(true);
      setNotice({
        text: 'Sign in to equip and sync your owned cosmetics across devices.',
        tone: 'warn',
      });
      return;
    }
    setBusyAction(true);
    setNotice(null);
    const nextAction = isEquipped(p) ? 'unequip' : 'equip';
    const res = await equipExchangeProduct(p.id, nextAction);
    setBusyAction(false);
    if (!res.ok) {
      if (res.authRequired) setShowAuthPrompt(true);
      setNotice({ text: res.error || 'Could not update cosmetic.', tone: 'err' });
      return;
    }
    onCosmeticsChanged?.();
    setNotice({
      text:
        nextAction === 'equip'
          ? `Equipped "${p.name}".`
          : `Unequipped "${p.name}".`,
      tone: 'ok',
    });
  };

  const handleBuyCoinPackage = async (packageId: string) => {
    if (nativePurchasesBlocked) {
      setNotice({
        text: 'Purchases are available on the website. Your coin balance and owned items remain visible here.',
        tone: 'warn',
      });
      return;
    }
    if (!state.authenticated) {
      setShowAuthPrompt(true);
      setNotice({
        text: 'Sign in before starting a coin checkout.',
        tone: 'warn',
      });
      return;
    }
    setBusyAction(true);
    setNotice(null);
    const res = await requestCoinPackageCheckout(packageId);
    setBusyAction(false);
    setNotice({
      text: res.message,
      tone: res.ok ? 'ok' : 'warn',
    });
  };

  const sectionTabs: { id: StoreSection; label: string }[] = [
    { id: 'featured', label: 'Featured' },
    { id: 'gun_skins', label: 'Gun Skins' },
    { id: 'backpack_skins', label: 'Backpack Skins' },
    { id: 'cosmetics', label: 'Cosmetics' },
    { id: 'new_arrivals', label: 'New Arrivals' },
    { id: 'best_sellers', label: 'Best Sellers' },
    { id: 'owned', label: `Owned Items (${state.ownedProductIds.length})` },
  ];

  const emptyMessage =
    section === 'owned'
      ? 'You do not own any paid cosmetics yet. Verified Payhip purchases stay permanently tied to your account.'
      : section === 'gun_skins'
        ? 'Nothing in Gun Skins yet. Check back soon!'
        : section === 'backpack_skins'
          ? 'Nothing in Backpack Skins yet. Check back soon!'
          : section === 'cosmetics'
            ? 'Nothing in Cosmetics yet. Check back soon!'
            : 'Nothing in the store yet. Check back soon!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4">
      <div className="relative w-full max-w-6xl h-[94dvh] rounded-2xl border border-stone-800 bg-stone-950 text-stone-100 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-stone-950/95 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/50 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold tracking-wide text-stone-50 uppercase">
                SURVIVAL ISLAND EXCHANGE
              </h2>
              <p className="text-[11px] text-stone-400">
                Official Weapon Skins, Backpack Skins &amp; Cosmetics · Verified Payhip Delivery
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* SI Coin Balance */}
            <div className="px-3.5 py-2 rounded-xl bg-stone-900 border border-amber-500/50 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-200">
                {state.coinBalance.toLocaleString()} SI
              </span>
            </div>

            <button
              type="button"
              onClick={() => setTopView(topView === 'buy_coins' ? 'store' : 'buy_coins')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
                topView === 'buy_coins'
                  ? 'bg-amber-600 text-stone-950 border-amber-500'
                  : 'bg-stone-900 hover:bg-stone-800 text-amber-200 border-amber-500/40'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Buy Coins</span>
            </button>

            {onOpenVaultStore && (
              <button
                type="button"
                onClick={onOpenVaultStore}
                className="px-3 py-2 rounded-xl text-xs font-bold border bg-amber-500/15 hover:bg-amber-500 hover:text-stone-950 text-amber-300 border-amber-500/50 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vault Store (Payhip)</span>
              </button>
            )}

            {onOpenCustomMarketplace && (
              <button
                type="button"
                onClick={onOpenCustomMarketplace}
                className="px-3 py-2 rounded-xl text-xs font-bold border bg-emerald-500/15 hover:bg-emerald-500 hover:text-stone-950 text-emerald-300 border-emerald-500/50 flex items-center gap-1.5 transition"
              >
                <span>+ Phone Skins</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setTopView(topView === 'history' ? 'store' : 'history')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                topView === 'history'
                  ? 'bg-stone-700 text-stone-50 border-stone-500'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>

            <button
              type="button"
              onClick={() => setTopView(topView === 'admin' ? 'store' : 'admin')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                topView === 'admin'
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border-stone-800'
              }`}
              title="Owner Admin Panel"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Owner Admin</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300"
              aria-label="Close Exchange"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Account Strip */}
        {topView !== 'admin' && (
          <div className="px-4 sm:px-6 pt-3">
            <PlayerAccountAuthPanel
              authenticated={state.authenticated}
              account={state.account}
              compact={!showAuthPrompt}
              promptMessage={
                showAuthPrompt
                  ? 'Sign in or register so Payhip unlocks are bound to your account across sessions and devices.'
                  : null
              }
              onAuthenticated={() => {
                setShowAuthPrompt(false);
                setNotice(null);
              }}
            />
          </div>
        )}

        {/* Status Notice */}
        {notice && (
          <div
            className={`mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
              notice.tone === 'ok'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : notice.tone === 'warn'
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                  : 'bg-red-950/60 border-red-500/50 text-red-200'
            }`}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Embedded Payhip Checkout Overlay View */}
        {payhipCheckout ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-3xl mx-auto rounded-2xl border border-amber-500/50 bg-stone-900/95 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold uppercase text-amber-400">
                    Payhip Embedded Checkout
                  </div>
                  <div className="text-sm font-bold text-stone-100">
                    {payhipCheckout.productName} ·{' '}
                    <span className="text-amber-300">
                      {payhipCheckout.status === 'pending_verification'
                        ? 'Purchase pending verification'
                        : 'Waiting for payment confirmation'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void pollPayhipCheckoutStatus(payhipCheckout.checkoutId)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold"
                  >
                    Refresh Status
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePayhipFrame}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Store</span>
                  </button>
                </div>
              </div>

              <iframe
                title={`Payhip Checkout - ${payhipCheckout.productName}`}
                src={payhipCheckout.url}
                className="w-full h-[460px] rounded-xl border border-stone-800 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />

              <p className="text-[11px] text-stone-400">
                Items unlock automatically only after Payhip server webhook verification completes.
              </p>
            </div>
          </div>
        ) : (
          /* Main Scrollable Content */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 survival-scroll">
            {topView === 'admin' ? (
              <ExchangeAdminPanel onStorefrontUpdated={reload} />
            ) : topView === 'buy_coins' ? (
              <div className="max-w-4xl mx-auto space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-stone-100">
                      Survival Island Coins (SI Coins)
                    </h3>
                    <p className="text-xs text-stone-400">
                      Official SI Coin packages set by the store owner. Coins are credited only
                      after verified payment-provider confirmation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTopView('store')}
                    className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-semibold text-stone-200"
                  >
                    Back to Store
                  </button>
                </div>

                {!state.paymentProvider.configured && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-xs text-amber-200 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-100">Marketplace Demo Mode: </span>
                      Coin packages and prices are active for display and testing. Live
                      real-money payment processing is currently disabled until a payment
                      provider is optionally connected, so no real charges or unverified coin
                      credits will occur.
                    </div>
                  </div>
                )}

                {nativePurchasesBlocked ? (
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-8 text-center space-y-2.5">
                    <Coins className="w-10 h-10 text-stone-600 mx-auto" />
                    <div className="text-base font-bold text-stone-200">
                      Purchases are available on the website
                    </div>
                    <p className="text-xs text-stone-400 max-w-md mx-auto">
                      Your coin balance, owned items, and transaction history remain available in
                      the app. New digital purchases are not initiated inside the mobile app.
                    </p>
                  </div>
                ) : state.coinPackages.length === 0 ? (
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-12 text-center space-y-2.5">
                    <Coins className="w-10 h-10 text-stone-600 mx-auto" />
                    <div className="text-base font-bold text-stone-200">
                      No SI Coin packages available yet.
                    </div>
                    <p className="text-xs text-stone-400 max-w-md mx-auto">
                      Check back soon! The store owner has not published any SI Coin packages
                      yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {state.coinPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="rounded-2xl border border-stone-800 bg-stone-900/85 p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          {pkg.imageUrl && (
                            <div className="h-28 rounded-xl bg-stone-950 border border-stone-800 overflow-hidden flex items-center justify-center p-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={pkg.imageUrl}
                                alt={pkg.name}
                                className="max-h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="text-sm font-bold text-stone-100">{pkg.name}</div>
                          <div className="text-xl font-mono font-bold text-amber-300">
                            {pkg.coins.toLocaleString()} SI
                          </div>
                          {pkg.bonusCoins > 0 && (
                            <div className="text-xs font-semibold text-emerald-300">
                              +{pkg.bonusCoins.toLocaleString()} Bonus SI Coins
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={() => handleBuyCoinPackage(pkg.id)}
                          className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-sm transition"
                        >
                          Purchase · {formatCurrencyPrice(pkg.priceAmount, pkg.currency)}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : topView === 'history' ? (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-100">Transaction History</h3>
                  <button
                    type="button"
                    onClick={() => setTopView('store')}
                    className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-semibold text-stone-200"
                  >
                    Back to Store
                  </button>
                </div>
                {state.transactions.length === 0 ? (
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-10 text-center text-xs text-stone-400">
                    No transactions recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {state.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-xl border border-stone-800 bg-stone-900/75 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-stone-100">
                            {tx.itemName || tx.type}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            {tx.note || tx.status} ·{' '}
                            {new Date(tx.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          {tx.realMoneyAmount !== undefined && tx.realMoneyAmount !== 0 ? (
                            <div
                              className={`font-mono font-bold ${
                                tx.status === 'refunded'
                                  ? 'text-red-300'
                                  : 'text-emerald-300'
                              }`}
                            >
                              {formatCurrencyPrice(
                                Math.abs(tx.realMoneyAmount),
                                tx.currency || 'USD',
                              )}
                            </div>
                          ) : (
                            <div
                              className={`font-mono font-bold ${
                                tx.coinDelta > 0
                                  ? 'text-emerald-300'
                                  : tx.coinDelta < 0
                                    ? 'text-amber-300'
                                    : 'text-stone-400'
                              }`}
                            >
                              {tx.coinDelta > 0 ? `+${tx.coinDelta}` : tx.coinDelta} SI
                            </div>
                          )}
                          <div className="text-[10px] uppercase text-stone-500">{tx.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ============ PLAYER STOREFRONT ============ */
              <div className="space-y-5">
                {/* Navigation Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {sectionTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSection(tab.id);
                        setSelectedId(null);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                        section === tab.id
                          ? 'bg-amber-600 text-stone-950 border-amber-500'
                          : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Gun Class Sub-filter */}
                {section === 'gun_skins' &&
                  state.products.some((p) => p.category === 'gun_skin') && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setWeaponFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
                          weaponFilter === 'all'
                            ? 'bg-stone-200 text-stone-950 border-stone-200'
                            : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
                        }`}
                      >
                        All Firearms
                      </button>
                      {(Object.keys(WEAPON_CLASS_LABELS) as GunWeaponClass[]).map((wc) => (
                        <button
                          key={wc}
                          type="button"
                          onClick={() => setWeaponFilter(wc)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
                            weaponFilter === wc
                              ? 'bg-stone-200 text-stone-950 border-stone-200'
                              : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
                          }`}
                        >
                          {WEAPON_CLASS_LABELS[wc]}
                        </button>
                      ))}
                    </div>
                  )}

                {/* Empty State vs Populated Store */}
                {visibleProducts.length === 0 ? (
                  <div className="rounded-2xl border border-stone-800 bg-gradient-to-b from-stone-900/80 to-stone-950 p-12 sm:p-16 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto">
                      {section === 'gun_skins' ? (
                        <Crosshair className="w-7 h-7 text-stone-500" />
                      ) : section === 'backpack_skins' ? (
                        <Backpack className="w-7 h-7 text-stone-500" />
                      ) : (
                        <Sparkles className="w-7 h-7 text-amber-500/70" />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-stone-100">{emptyMessage}</h3>
                    <p className="text-xs text-stone-400 max-w-md mx-auto">
                      Survival Island Exchange features official Weapon Skins, Backpack Skins,
                      and Cosmetics published directly by the game owner.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Product Grid */}
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {visibleProducts.map((p) => {
                        const owned = isOwned(p);
                        const equipped = isEquipped(p);
                        const active = selectedProduct?.id === p.id;
                        const rMeta = RARITY_META[p.rarity];

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedId(p.id)}
                            className={`text-left rounded-2xl border p-3.5 bg-stone-900/85 hover:bg-stone-900 transition flex flex-col justify-between gap-3 ${
                              active
                                ? 'border-amber-500 ring-1 ring-amber-500/60'
                                : rMeta.border
                            }`}
                          >
                            <div className="space-y-2.5">
                              <div className="h-36 rounded-xl bg-stone-950 border border-stone-800 overflow-hidden flex items-center justify-center relative">
                                {p.productImageUrl || p.previewImageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={p.productImageUrl || p.previewImageUrl || ''}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full"
                                    style={{
                                      background: `linear-gradient(135deg, ${p.visual.primaryHex} 0%, ${p.visual.secondaryHex} 60%, ${p.visual.accentHex} 100%)`,
                                    }}
                                  />
                                )}
                                <span
                                  className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${rMeta.badge}`}
                                >
                                  {rMeta.label}
                                </span>
                                {equipped && (
                                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-600 text-stone-950 text-[10px] font-bold uppercase">
                                    Equipped
                                  </span>
                                )}
                              </div>

                              <div>
                                <div className="text-sm font-bold text-stone-100 truncate">
                                  {p.name}
                                </div>
                                <div className="text-[11px] text-stone-400">
                                  {CATEGORY_LABELS[p.category]}
                                  {p.weaponClass ? ` · ${WEAPON_CLASS_LABELS[p.weaponClass]}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
                              {owned ? (
                                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  OWNED
                                </span>
                              ) : (
                                <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
                                  {isPayhipProduct(p) ? (
                                    <CreditCard className="w-3.5 h-3.5" />
                                  ) : (
                                    <Coins className="w-3.5 h-3.5" />
                                  )}
                                  {formatProductPriceBadge(p)}
                                </span>
                              )}
                              <span className="text-[10px] text-stone-500 uppercase font-semibold">
                                Inspect
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Sticky Product Showcase */}
                    {selectedProduct && (
                      <div className="lg:col-span-5 lg:sticky lg:top-0 rounded-2xl border border-stone-800 bg-stone-900/90 p-4 sm:p-5 space-y-4">
                        <ExchangePreview3D item={selectedProduct} heightClass="h-64 sm:h-72" />

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                RARITY_META[selectedProduct.rarity].badge
                              }`}
                            >
                              {RARITY_META[selectedProduct.rarity].label}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-[10px] font-bold uppercase">
                              {CATEGORY_LABELS[selectedProduct.category]}
                            </span>
                            {isOwned(selectedProduct) && (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold uppercase">
                                Owned
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-bold text-stone-50">
                            {selectedProduct.name}
                          </h3>
                          {selectedProduct.description && (
                            <p className="text-xs text-stone-300 leading-relaxed">
                              {selectedProduct.description}
                            </p>
                          )}

                          <div className="rounded-xl bg-stone-950 border border-stone-800 p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-stone-400">Compatible With</span>
                              <span className="font-semibold text-stone-200 text-right">
                                {selectedProduct.compatibleLabel}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-stone-400">Gameplay Impact</span>
                              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                Cosmetic Only
                              </span>
                            </div>
                          </div>
                        </div>

                        {isOwned(selectedProduct) ? (
                          <button
                            type="button"
                            disabled={busyAction}
                            onClick={() => handleToggleEquip(selectedProduct)}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition ${
                              isEquipped(selectedProduct)
                                ? 'bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-stone-950'
                            }`}
                          >
                            {isEquipped(selectedProduct) ? 'Unequip Cosmetic' : 'Equip Cosmetic'}
                          </button>
                        ) : nativePurchasesBlocked ? (
                          <div className="w-full py-3 rounded-xl border border-stone-700 bg-stone-900 px-4 text-center text-xs text-stone-300">
                            Purchases are available on the website. Items already owned can be equipped here.
                          </div>
                        ) : isPayhipProduct(selectedProduct) ? (
                          <button
                            type="button"
                            disabled={busyAction}
                            onClick={() => void handleStartPayhipPurchase(selectedProduct)}
                            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 transition"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>
                              Buy with Payhip ({formatProductPriceBadge(selectedProduct)})
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyAction}
                            onClick={() => setConfirmItem(selectedProduct)}
                            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 transition"
                          >
                            <Tag className="w-4 h-4" />
                            <span>
                              Buy for {selectedProduct.price.toLocaleString()} SI Coins
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Purchase Confirmation Modal (SI Coins) */}
      {confirmItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/60 bg-stone-950 p-5 space-y-4">
            <h3 className="text-base font-bold text-stone-100">Confirm Purchase</h3>
            <p className="text-xs text-stone-300">
              Purchase <span className="font-bold text-stone-100">{confirmItem.name}</span> for{' '}
              <span className="font-mono font-bold text-amber-300">
                {confirmItem.price.toLocaleString()} SI Coins
              </span>
              ?
            </p>
            {state.coinBalance < confirmItem.price && (
              <div className="rounded-xl border border-amber-500/50 bg-amber-950/40 p-3 text-xs text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Insufficient SI Coins. You need{' '}
                  {(confirmItem.price - state.coinBalance).toLocaleString()} more SI Coins.
                </span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold"
              >
                Cancel
              </button>
              {state.coinBalance < confirmItem.price ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmItem(null);
                    setTopView('buy_coins');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold"
                >
                  Get SI Coins
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={handleConfirmPurchase}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold"
                >
                  {busyAction ? 'Processing...' : 'Confirm Purchase'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
