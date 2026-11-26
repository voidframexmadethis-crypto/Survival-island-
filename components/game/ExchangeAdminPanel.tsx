'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Coins,
  Edit3,
  Eye,
  EyeOff,
  FileBox,
  Image as ImageIcon,
  Lock,
  LogOut,
  Package,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  CoinPackage,
  CosmeticPatternType,
  DEFAULT_VISUAL_SPEC,
  ExchangeCategory,
  ExchangeProduct,
  ExchangeRarity,
  GunWeaponClass,
  PublicationStatus,
  RARITY_META,
  WEAPON_CLASS_LABELS,
  formatCurrencyPrice,
} from '@/game/data/exchangeCatalog';
import {
  AdminAuthStatus,
  AdminCatalogState,
  adminCreateCoinPackage,
  adminCreateProduct,
  adminDeleteCoinPackage,
  adminDeleteProduct,
  adminUpdateCoinPackage,
  adminUpdateProduct,
  adminUploadAsset,
  authenticateOwnerAdmin,
  checkAdminAuthStatus,
  fetchAdminCatalog,
  logoutOwnerAdmin,
} from '@/game/systems/exchangeManager';
import { ExchangePreview3D } from './ExchangePreview3D';

interface ExchangeAdminPanelProps {
  onStorefrontUpdated: () => void;
}

type AdminSection = 'products' | 'coins';

interface ProductFormState {
  id: string | null;
  name: string;
  description: string;
  category: ExchangeCategory;
  weaponClass: GunWeaponClass;
  rarity: ExchangeRarity;
  price: string;
  realMoneyAmount: string;
  realMoneyCurrency: string;
  payhipProductId: string;
  payhipUrl: string;
  partialRefundPolicy: 'revoke' | 'keep';
  status: PublicationStatus;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  productImageUrl: string | null;
  previewImageUrl: string | null;
  model3dUrl: string | null;
  model3dFileName: string | null;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  pattern: CosmeticPatternType;
}

interface CoinPackageFormState {
  id: string | null;
  name: string;
  coins: string;
  bonusCoins: string;
  priceAmount: string;
  currency: string;
  imageUrl: string | null;
  active: boolean;
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  id: null,
  name: '',
  description: '',
  category: 'gun_skin',
  weaponClass: 'assault_rifle',
  rarity: 'common',
  price: '0',
  realMoneyAmount: '',
  realMoneyCurrency: 'USD',
  payhipProductId: '',
  payhipUrl: '',
  partialRefundPolicy: 'revoke',
  status: 'draft',
  featured: false,
  newArrival: false,
  bestSeller: false,
  productImageUrl: null,
  previewImageUrl: null,
  model3dUrl: null,
  model3dFileName: null,
  primaryHex: DEFAULT_VISUAL_SPEC.primaryHex,
  secondaryHex: DEFAULT_VISUAL_SPEC.secondaryHex,
  accentHex: DEFAULT_VISUAL_SPEC.accentHex,
  pattern: 'solid',
};

const EMPTY_COIN_FORM: CoinPackageFormState = {
  id: null,
  name: '',
  coins: '100',
  bonusCoins: '0',
  priceAmount: '0.99',
  currency: 'USD',
  imageUrl: null,
  active: true,
};

export function ExchangeAdminPanel({ onStorefrontUpdated }: ExchangeAdminPanelProps) {
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerSetupCode, setOwnerSetupCode] = useState('');
  const [ownerRecoveryCode, setOwnerRecoveryCode] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [section, setSection] = useState<AdminSection>('products');
  const [catalog, setCatalog] = useState<AdminCatalogState | null>(null);
  const [banner, setBanner] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<ExchangeProduct | null>(null);

  const [showCoinForm, setShowCoinForm] = useState(false);
  const [coinForm, setCoinForm] = useState<CoinPackageFormState>(EMPTY_COIN_FORM);
  const [savingCoin, setSavingCoin] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await fetchAdminCatalog();
      setCatalog(data);
    } catch {
      setCatalog(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    checkAdminAuthStatus().then((status) => {
      if (!active) return;
      setAuthStatus(status);
      if (status.authenticated) {
        loadCatalog();
      }
    });
    return () => {
      active = false;
    };
  }, [loadCatalog]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    const mode = authStatus?.needsSetup ? 'setup' : 'login';
    const res = await authenticateOwnerAdmin({
      email: ownerEmail,
      password: ownerPassword,
      username: ownerUsername,
      setupCode: ownerSetupCode,
      mode,
    });
    setAuthBusy(false);
    if (!res.ok) {
      setAuthError(res.error || 'Authentication failed.');
      return;
    }
    if (res.recoveryCode) setOwnerRecoveryCode(res.recoveryCode);
    setOwnerPassword('');
    setOwnerSetupCode('');
    const nextStatus = await checkAdminAuthStatus();
    setAuthStatus(nextStatus);
    await loadCatalog();
  };

  const handleLogout = async () => {
    await logoutOwnerAdmin();
    setCatalog(null);
    const nextStatus = await checkAdminAuthStatus();
    setAuthStatus(nextStatus);
  };

  const handleAssetUpload = async (
    file: File | undefined,
    kind: 'image' | 'model3d',
    target: 'productImage' | 'previewImage' | 'model3d' | 'coinImage',
  ) => {
    if (!file) return;
    setUploadingField(target);
    setBanner(null);
    const res = await adminUploadAsset(file, kind);
    setUploadingField(null);
    if (!res.ok || !res.url) {
      setBanner({ text: res.error || 'Upload failed.', tone: 'err' });
      return;
    }
    if (target === 'productImage') {
      setProductForm((prev) => ({ ...prev, productImageUrl: res.url || null }));
    } else if (target === 'previewImage') {
      setProductForm((prev) => ({ ...prev, previewImageUrl: res.url || null }));
    } else if (target === 'model3d') {
      setProductForm((prev) => ({
        ...prev,
        model3dUrl: res.url || null,
        model3dFileName: res.fileName || file.name,
      }));
    } else if (target === 'coinImage') {
      setCoinForm((prev) => ({ ...prev, imageUrl: res.url || null }));
    }
    setBanner({ text: `Uploaded ${res.fileName || file.name}.`, tone: 'ok' });
  };

  const buildProductPayload = (statusOverride?: PublicationStatus): Partial<ExchangeProduct> => ({
    name: productForm.name.trim(),
    description: productForm.description.trim(),
    category: productForm.category,
    weaponClass: productForm.category === 'gun_skin' ? productForm.weaponClass : undefined,
    rarity: productForm.rarity,
    price: Math.max(0, Math.round(Number(productForm.price) || 0)),
    realMoneyAmount: productForm.realMoneyAmount.trim()
      ? Math.max(0, Number(productForm.realMoneyAmount) || 0)
      : null,
    realMoneyCurrency: productForm.realMoneyCurrency.trim().toUpperCase() || 'USD',
    payhipProductId: productForm.payhipProductId.trim() || null,
    payhipUrl: productForm.payhipUrl.trim() || null,
    partialRefundPolicy: productForm.partialRefundPolicy,
    status: statusOverride || productForm.status,
    featured: productForm.featured,
    newArrival: productForm.newArrival,
    bestSeller: productForm.bestSeller,
    productImageUrl: productForm.productImageUrl,
    previewImageUrl: productForm.previewImageUrl,
    model3dUrl: productForm.model3dUrl,
    model3dFileName: productForm.model3dFileName,
    visual: {
      ...DEFAULT_VISUAL_SPEC,
      primaryHex: productForm.primaryHex,
      secondaryHex: productForm.secondaryHex,
      accentHex: productForm.accentHex,
      pattern: productForm.pattern,
    },
  });

  const handleSaveProduct = async (statusOverride?: PublicationStatus) => {
    if (!productForm.name.trim()) {
      setBanner({ text: 'Please enter a product name.', tone: 'err' });
      return;
    }
    setSavingProduct(true);
    setBanner(null);
    const payload = buildProductPayload(statusOverride);
    const res = productForm.id
      ? await adminUpdateProduct(productForm.id, payload)
      : await adminCreateProduct(payload);
    setSavingProduct(false);
    if (!res.ok) {
      setBanner({ text: res.error || 'Could not save product.', tone: 'err' });
      return;
    }
    setShowProductForm(false);
    setProductForm(EMPTY_PRODUCT_FORM);
    await loadCatalog();
    onStorefrontUpdated();
    setBanner({
      text:
        statusOverride === 'published'
          ? 'Product published to Survival Island Exchange.'
          : statusOverride === 'draft'
            ? 'Product saved as draft.'
            : 'Product saved.',
      tone: 'ok',
    });
  };

  const startEditProduct = (p: ExchangeProduct) => {
    setProductForm({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      weaponClass: p.weaponClass || 'assault_rifle',
      rarity: p.rarity,
      price: String(p.price),
      realMoneyAmount:
        p.realMoneyAmount !== undefined && p.realMoneyAmount !== null
          ? String(p.realMoneyAmount)
          : '',
      realMoneyCurrency: p.realMoneyCurrency || 'USD',
      payhipProductId: p.payhipProductId || '',
      payhipUrl: p.payhipUrl || '',
      partialRefundPolicy: p.partialRefundPolicy || 'revoke',
      status: p.status,
      featured: p.featured,
      newArrival: p.newArrival,
      bestSeller: p.bestSeller,
      productImageUrl: p.productImageUrl || null,
      previewImageUrl: p.previewImageUrl || null,
      model3dUrl: p.model3dUrl || null,
      model3dFileName: p.model3dFileName || null,
      primaryHex: p.visual.primaryHex,
      secondaryHex: p.visual.secondaryHex,
      accentHex: p.visual.accentHex,
      pattern: p.visual.pattern,
    });
    setShowProductForm(true);
  };

  const handleQuickStatus = async (p: ExchangeProduct, nextStatus: PublicationStatus) => {
    const res = await adminUpdateProduct(p.id, { status: nextStatus });
    if (res.ok) {
      await loadCatalog();
      onStorefrontUpdated();
      setBanner({
        text: `${p.name} is now ${nextStatus}.`,
        tone: 'ok',
      });
    }
  };

  const handleDeleteProduct = async (p: ExchangeProduct) => {
    const res = await adminDeleteProduct(p.id);
    if (res.ok) {
      await loadCatalog();
      onStorefrontUpdated();
      setBanner({
        text: `Deleted "${p.name}". Existing owners retain their purchased copy.`,
        tone: 'ok',
      });
    }
  };

  const handleSaveCoinPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinForm.name.trim()) {
      setBanner({ text: 'Please enter a coin package name.', tone: 'err' });
      return;
    }
    setSavingCoin(true);
    setBanner(null);
    const payload: Partial<CoinPackage> = {
      name: coinForm.name.trim(),
      coins: Math.max(1, Math.round(Number(coinForm.coins) || 1)),
      bonusCoins: Math.max(0, Math.round(Number(coinForm.bonusCoins) || 0)),
      priceAmount: Math.max(0, Number(coinForm.priceAmount) || 0),
      currency: coinForm.currency.trim().toUpperCase() || 'USD',
      imageUrl: coinForm.imageUrl,
      active: coinForm.active,
    };
    const res = coinForm.id
      ? await adminUpdateCoinPackage(coinForm.id, payload)
      : await adminCreateCoinPackage(payload);
    setSavingCoin(false);
    if (!res.ok) {
      setBanner({ text: res.error || 'Could not save coin package.', tone: 'err' });
      return;
    }
    setShowCoinForm(false);
    setCoinForm(EMPTY_COIN_FORM);
    await loadCatalog();
    onStorefrontUpdated();
    setBanner({ text: 'Coin package saved.', tone: 'ok' });
  };

  const startEditCoinPackage = (pkg: CoinPackage) => {
    setCoinForm({
      id: pkg.id,
      name: pkg.name,
      coins: String(pkg.coins),
      bonusCoins: String(pkg.bonusCoins || 0),
      priceAmount: String(pkg.priceAmount),
      currency: pkg.currency,
      imageUrl: pkg.imageUrl || null,
      active: pkg.active,
    });
    setShowCoinForm(true);
  };

  // ---- Unauthenticated Owner Login Gate ----
  if (!authStatus) {
    return (
      <div className="p-8 text-center text-sm text-stone-400">
        Verifying owner session...
      </div>
    );
  }

  if (!authStatus.authenticated) {
    return (
      <div className="max-w-md mx-auto my-8 rounded-2xl border border-stone-800 bg-stone-900/95 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-100">
              Owner Administrator Access
            </h3>
            <p className="text-xs text-stone-400">
              Server-side protected management console for Survival Island Exchange
            </p>
          </div>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-3">
          {authStatus.productionBlocked && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Owner access active.</span>
            </div>
          )}
          {authStatus.needsSetup && (
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Create the one owner account for this store. Customers cannot use this form.
            </p>
          )}
          {ownerRecoveryCode && (
            <div className="rounded-xl border border-amber-400/60 bg-amber-950/40 p-3 text-[11px] text-amber-100 space-y-1.5">
              <div className="font-bold uppercase tracking-wide text-amber-300">
                Save the owner recovery code
              </div>
              <code className="block select-all rounded-lg border border-amber-500/40 bg-stone-950 px-3 py-2 font-mono text-base tracking-widest text-amber-200">
                {ownerRecoveryCode}
              </code>
              <p className="text-amber-200/80">
                It is shown once and is required to reset the owner password.
              </p>
            </div>
          )}
          {authStatus.needsSetup && (
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Owner Name
              </label>
              <input
                type="text"
                value={ownerUsername}
                onChange={(e) => setOwnerUsername(e.target.value)}
                placeholder="Store owner"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Owner Email
            </label>
            <input
              type="email"
              required
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="Owner email"
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Owner Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="Owner password (min 6 chars)"
              autoComplete={authStatus.needsSetup ? 'new-password' : 'current-password'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          {authStatus.needsSetup && authStatus.setupCodeRequired && (
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Owner Setup Code
              </label>
              <input
                type="password"
                value={ownerSetupCode}
                onChange={(e) => setOwnerSetupCode(e.target.value)}
                placeholder="EXCHANGE_ADMIN_SECRET"
                autoComplete="off"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
          {authError && (
            <div className="text-xs text-red-400 font-medium">{authError}</div>
          )}
          <button
            type="submit"
            disabled={authBusy}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-sm transition"
          >
            {authBusy
              ? 'Please wait...'
              : authStatus.needsSetup
                ? 'Create Owner Account'
                : 'Sign In as Owner'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {ownerRecoveryCode && (
        <div className="rounded-xl border border-amber-400/60 bg-amber-950/40 p-3 text-xs text-amber-100 space-y-1.5">
          <div className="font-bold uppercase tracking-wide text-amber-300">
            Save the owner recovery code
          </div>
          <code className="block select-all rounded-lg border border-amber-500/40 bg-stone-950 px-3 py-2 font-mono text-base tracking-widest text-amber-200">
            {ownerRecoveryCode}
          </code>
          <p className="text-amber-200/80">
            It is shown once and is required to reset the owner password.
          </p>
        </div>
      )}

      {/* Admin Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSection('products')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 border transition ${
              section === 'products'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Management ({catalog?.products.length ?? 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('coins')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 border transition ${
              section === 'coins'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Coin Management ({catalog?.coinPackages.length ?? 0})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-semibold text-stone-300 flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {banner && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            banner.tone === 'ok'
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/50 border-red-500/50 text-red-200'
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============ PRODUCT MANAGEMENT ============ */}
      {section === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-stone-100">
                Marketplace Product Catalog
              </h3>
              <p className="text-xs text-stone-400">
                Upload your own Gun Skins and Backpack Skins. Only published items appear to
                players.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setProductForm(EMPTY_PRODUCT_FORM);
                setShowProductForm(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wide flex items-center gap-2 shadow-lg transition"
            >
              <Upload className="w-4 h-4" />
              <span>UPLOAD NEW PRODUCT</span>
            </button>
          </div>

          {showProductForm && (
            <div className="rounded-2xl border border-amber-500/50 bg-stone-900/95 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                  {productForm.id ? 'Edit Product' : 'Upload New Product'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Enter your custom skin name"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Product Category *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        category: e.target.value as ExchangeCategory,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100"
                  >
                    <option value="gun_skin">Gun Skins</option>
                    <option value="backpack_skin">Backpack Skins</option>
                    <option value="cosmetic">Cosmetics</option>
                  </select>
                </div>

                {productForm.category === 'gun_skin' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Compatible Weapon Class
                    </label>
                    <select
                      value={productForm.weaponClass}
                      onChange={(e) =>
                        setProductForm((p) => ({
                          ...p,
                          weaponClass: e.target.value as GunWeaponClass,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100"
                    >
                      {(Object.keys(WEAPON_CLASS_LABELS) as GunWeaponClass[]).map((wc) => (
                        <option key={wc} value={wc}>
                          {WEAPON_CLASS_LABELS[wc]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Rarity Label (Visual Only — Does Not Control Price)
                  </label>
                  <select
                    value={productForm.rarity}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        rarity: e.target.value as ExchangeRarity,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100"
                  >
                    <option value="common">Common</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                    <option value="exclusive">Exclusive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">
                    Survival Island Coins Price (Your Custom Price)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, price: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-amber-500/60 text-sm font-mono text-amber-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={productForm.status}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        status: e.target.value as PublicationStatus,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100"
                  >
                    <option value="draft">Draft (Hidden from Players)</option>
                    <option value="published">Published (Live in Store)</option>
                    <option value="unpublished">Unpublished (Hidden, Owners Keep It)</option>
                  </select>
                </div>

                {/* Payhip Direct Checkout & Automatic Delivery Config */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl border border-amber-500/30 bg-stone-950/75 p-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-300 mb-1">
                      Payhip Price (Real Money)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={productForm.realMoneyAmount}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, realMoneyAmount: e.target.value }))
                      }
                      placeholder="e.g. 3.99"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-xs font-mono text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      Payhip Product ID
                    </label>
                    <input
                      type="text"
                      value={productForm.payhipProductId}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, payhipProductId: e.target.value }))
                      }
                      placeholder="e.g. 2804256"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      Payhip Checkout URL
                    </label>
                    <input
                      type="url"
                      value={productForm.payhipUrl}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, payhipUrl: e.target.value }))
                      }
                      placeholder="https://payhip.com/b/..."
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      Partial Refund Policy
                    </label>
                    <select
                      value={productForm.partialRefundPolicy}
                      onChange={(e) =>
                        setProductForm((p) => ({
                          ...p,
                          partialRefundPolicy: e.target.value as 'revoke' | 'keep',
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-xs text-stone-100"
                    >
                      <option value="revoke">Revoke Item Entitlement</option>
                      <option value="keep">Keep Item on Partial Refund</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Product Description
                  </label>
                  <textarea
                    rows={2}
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Describe your cosmetic skin..."
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100"
                  />
                </div>

                {/* File Uploads */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <label className="rounded-xl border border-dashed border-stone-700 hover:border-amber-500/70 bg-stone-950/70 p-3 cursor-pointer flex flex-col gap-1.5 transition">
                    <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      Product Image
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {uploadingField === 'productImage'
                        ? 'Uploading...'
                        : productForm.productImageUrl
                          ? 'Image uploaded (click to replace)'
                          : 'PNG, JPG, WEBP (max 4 MB)'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) =>
                        handleAssetUpload(e.target.files?.[0], 'image', 'productImage')
                      }
                    />
                  </label>

                  <label className="rounded-xl border border-dashed border-stone-700 hover:border-amber-500/70 bg-stone-950/70 p-3 cursor-pointer flex flex-col gap-1.5 transition">
                    <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-sky-400" />
                      Preview Image
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {uploadingField === 'previewImage'
                        ? 'Uploading...'
                        : productForm.previewImageUrl
                          ? 'Preview uploaded (click to replace)'
                          : 'Optional showcase image'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) =>
                        handleAssetUpload(e.target.files?.[0], 'image', 'previewImage')
                      }
                    />
                  </label>

                  <label className="rounded-xl border border-dashed border-stone-700 hover:border-amber-500/70 bg-stone-950/70 p-3 cursor-pointer flex flex-col gap-1.5 transition">
                    <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                      <FileBox className="w-4 h-4 text-emerald-400" />
                      3D Model (.glb / .gltf)
                    </span>
                    <span className="text-[11px] text-stone-400 truncate">
                      {uploadingField === 'model3d'
                        ? 'Uploading...'
                        : productForm.model3dFileName || 'Optional 3D file (max 8 MB)'}
                    </span>
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      className="hidden"
                      onChange={(e) =>
                        handleAssetUpload(e.target.files?.[0], 'model3d', 'model3d')
                      }
                    />
                  </label>
                </div>

                {/* In-game 3D material tint & storefront flags */}
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Primary Finish</label>
                    <input
                      type="color"
                      value={productForm.primaryHex}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, primaryHex: e.target.value }))
                      }
                      className="w-full h-9 rounded-lg bg-stone-950 border border-stone-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Secondary Finish</label>
                    <input
                      type="color"
                      value={productForm.secondaryHex}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, secondaryHex: e.target.value }))
                      }
                      className="w-full h-9 rounded-lg bg-stone-950 border border-stone-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Accent Trim</label>
                    <input
                      type="color"
                      value={productForm.accentHex}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, accentHex: e.target.value }))
                      }
                      className="w-full h-9 rounded-lg bg-stone-950 border border-stone-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Surface Pattern</label>
                    <select
                      value={productForm.pattern}
                      onChange={(e) =>
                        setProductForm((p) => ({
                          ...p,
                          pattern: e.target.value as CosmeticPatternType,
                        }))
                      }
                      className="w-full h-9 px-2 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
                    >
                      <option value="solid">Solid</option>
                      <option value="camo_woodland">Woodland Camo</option>
                      <option value="camo_desert">Desert Camo</option>
                      <option value="camo_arctic">Arctic Camo</option>
                      <option value="carbon">Carbon Fiber</option>
                      <option value="damascus">Damascus</option>
                      <option value="hazard">Hazard</option>
                      <option value="futuristic_grid">Futuristic Grid</option>
                      <option value="royal_gold">Royal Gold</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-wrap items-center gap-4 text-xs text-stone-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.featured}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, featured: e.target.checked }))
                      }
                    />
                    <span>Show in Featured</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.newArrival}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, newArrival: e.target.checked }))
                      }
                    />
                    <span>Mark as New Arrival</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.bestSeller}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, bestSeller: e.target.checked }))
                      }
                    />
                    <span>Mark as Best Seller</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    const draftPreview: ExchangeProduct = {
                      id: productForm.id || 'preview_temp',
                      name: productForm.name || 'Untitled Preview',
                      description: productForm.description,
                      category: productForm.category,
                      weaponClass:
                        productForm.category === 'gun_skin'
                          ? productForm.weaponClass
                          : undefined,
                      compatibleWeapons: [],
                      compatibleLabel:
                        productForm.category === 'gun_skin'
                          ? WEAPON_CLASS_LABELS[productForm.weaponClass]
                          : 'All Tactical Backpacks',
                      rarity: productForm.rarity,
                      price: Math.max(0, Math.round(Number(productForm.price) || 0)),
                      status: productForm.status,
                      featured: productForm.featured,
                      newArrival: productForm.newArrival,
                      bestSeller: productForm.bestSeller,
                      productImageUrl: productForm.productImageUrl,
                      previewImageUrl: productForm.previewImageUrl,
                      model3dUrl: productForm.model3dUrl,
                      model3dFileName: productForm.model3dFileName,
                      visual: {
                        ...DEFAULT_VISUAL_SPEC,
                        primaryHex: productForm.primaryHex,
                        secondaryHex: productForm.secondaryHex,
                        accentHex: productForm.accentHex,
                        pattern: productForm.pattern,
                      },
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };
                    setPreviewProduct(draftPreview);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  disabled={savingProduct}
                  onClick={() => handleSaveProduct('draft')}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save as Draft</span>
                </button>
                <button
                  type="button"
                  disabled={savingProduct}
                  onClick={() => handleSaveProduct('published')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{productForm.id ? 'Save & Publish' : 'Upload & Publish'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Product List */}
          {!catalog || catalog.products.length === 0 ? (
            <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-10 text-center space-y-2">
              <Package className="w-8 h-8 text-stone-600 mx-auto" />
              <div className="text-sm font-bold text-stone-200">
                Your marketplace catalog is empty
              </div>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Click <span className="text-amber-300 font-semibold">UPLOAD NEW PRODUCT</span>{' '}
                above to add your first Gun Skin or Backpack Skin and set your own SI Coin
                price.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catalog.products.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-stone-800 bg-stone-900/80 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg border border-stone-700 bg-stone-950 overflow-hidden shrink-0 flex items-center justify-center">
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
                            background: `linear-gradient(135deg, ${p.visual.primaryHex}, ${p.visual.accentHex})`,
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-stone-100 truncate">
                          {p.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            p.status === 'published'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                              : p.status === 'draft'
                                ? 'bg-stone-800 text-stone-300 border-stone-600'
                                : 'bg-amber-950 text-amber-300 border-amber-500/50'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {CATEGORY_LABELS[p.category]}
                        {p.weaponClass ? ` · ${WEAPON_CLASS_LABELS[p.weaponClass]}` : ''} ·{' '}
                        <span className={RARITY_META[p.rarity].text}>
                          {RARITY_META[p.rarity].label}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-300">
                        {p.price.toLocaleString()} SI Coins
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-800/80">
                    <button
                      type="button"
                      onClick={() => setPreviewProduct(p)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditProduct(p)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {p.status !== 'published' ? (
                      <button
                        type="button"
                        onClick={() => handleQuickStatus(p, 'published')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-stone-950 text-[11px] font-bold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickStatus(p, 'unpublished')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-500/50 text-amber-200 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Unpublish</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p)}
                      className="ml-auto px-2.5 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-200 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ COIN MANAGEMENT ============ */}
      {section === 'coins' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-stone-100">
                COIN MANAGEMENT — Survival Island Coins Packages
              </h3>
              <p className="text-xs text-stone-400">
                Create and price your own SI Coin packages. Real-money purchases only credit
                coins after payment-provider webhook verification.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCoinForm(EMPTY_COIN_FORM);
                setShowCoinForm(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wide flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>CREATE COIN PACKAGE</span>
            </button>
          </div>

          {/* Payment Mode & Readiness Banner */}
          <div
            className={`rounded-xl border p-3.5 text-xs flex items-start gap-2.5 ${
              catalog?.paymentProvider.configured
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-stone-900 border-amber-500/40 text-stone-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-stone-100">
                {catalog?.paymentProvider.configured
                  ? `Live Payment Mode — Connected (${catalog.paymentProvider.provider})`
                  : 'Demo Mode Active — No API Keys or External Accounts Required'}
              </div>
              {catalog?.paymentProvider.configured ? (
                <p className="text-emerald-200/90">
                  Payhip checkout and automatic item fulfillment are connected via{' '}
                  <code className="text-amber-300">/api/payhip/webhook</code>.
                </p>
              ) : (
                <p className="text-stone-400 leading-relaxed">
                  You can freely create, edit, and price all Gun Skins, Backpack Skins, and
                  SI Coin packages right now with zero external setup. Live real-money card
                  charging and automatic webhook coin crediting are optional and only require
                  connecting a payment provider when you choose to enable live billing later.
                </p>
              )}
            </div>
          </div>

          {showCoinForm && (
            <form
              onSubmit={handleSaveCoinPackage}
              className="rounded-2xl border border-amber-500/50 bg-stone-900/95 p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h4 className="text-sm font-bold text-amber-300 uppercase">
                  {coinForm.id ? 'Edit Coin Package' : 'New SI Coin Package'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCoinForm(false)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={coinForm.name}
                    onChange={(e) => setCoinForm((c) => ({ ...c, name: e.target.value }))}
                    placeholder="e.g. Starter Pack"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">
                    Number of SI Coins *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={coinForm.coins}
                    onChange={(e) => setCoinForm((c) => ({ ...c, coins: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm font-mono text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Optional Bonus Coins
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={coinForm.bonusCoins}
                    onChange={(e) =>
                      setCoinForm((c) => ({ ...c, bonusCoins: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm font-mono text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">
                    Real-Money Price *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={coinForm.priceAmount}
                    onChange={(e) =>
                      setCoinForm((c) => ({ ...c, priceAmount: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm font-mono text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={coinForm.currency}
                    onChange={(e) =>
                      setCoinForm((c) => ({ ...c, currency: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Package Image
                  </label>
                  <label className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-dashed border-stone-700 hover:border-amber-500/60 text-xs text-stone-300 flex items-center gap-2 cursor-pointer">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span className="truncate">
                      {uploadingField === 'coinImage'
                        ? 'Uploading...'
                        : coinForm.imageUrl
                          ? 'Image uploaded'
                          : 'Upload image (optional)'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) =>
                        handleAssetUpload(e.target.files?.[0], 'image', 'coinImage')
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coinForm.active}
                    onChange={(e) =>
                      setCoinForm((c) => ({ ...c, active: e.target.checked }))
                    }
                  />
                  <span>Active (Visible to Players)</span>
                </label>
                <button
                  type="submit"
                  disabled={savingCoin}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold"
                >
                  {savingCoin ? 'Saving...' : 'Save Coin Package'}
                </button>
              </div>
            </form>
          )}

          {!catalog || catalog.coinPackages.length === 0 ? (
            <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-8 text-center space-y-2">
              <Coins className="w-8 h-8 text-stone-600 mx-auto" />
              <div className="text-sm font-bold text-stone-200">
                No SI Coin packages created yet
              </div>
              <p className="text-xs text-stone-400">
                Create your own coin packages with any SI Coin amounts and real-money prices.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalog.coinPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-stone-800 bg-stone-900/80 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-stone-100">{pkg.name}</div>
                      <div className="text-xs font-mono text-amber-300 font-bold mt-0.5">
                        {pkg.coins.toLocaleString()} SI Coins
                        {pkg.bonusCoins > 0
                          ? ` + ${pkg.bonusCoins.toLocaleString()} Bonus`
                          : ''}
                      </div>
                      <div className="text-xs text-emerald-300 font-semibold mt-0.5">
                        {formatCurrencyPrice(pkg.priceAmount, pkg.currency)}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        pkg.active
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      {pkg.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-stone-800">
                    <button
                      type="button"
                      onClick={() => startEditCoinPackage(pkg)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminUpdateCoinPackage(pkg.id, { active: !pkg.active });
                        await loadCatalog();
                        onStorefrontUpdated();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-semibold"
                    >
                      {pkg.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminDeleteCoinPackage(pkg.id);
                        await loadCatalog();
                        onStorefrontUpdated();
                      }}
                      className="ml-auto px-2.5 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-200 text-[11px] font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-stone-700 bg-stone-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase text-amber-400">
                  Owner Product Preview
                </div>
                <div className="text-base font-bold text-stone-100">
                  {previewProduct.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ExchangePreview3D item={previewProduct} heightClass="h-72" />
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span>{previewProduct.compatibleLabel}</span>
              <span className="font-mono font-bold text-amber-300">
                {previewProduct.price.toLocaleString()} SI Coins
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
