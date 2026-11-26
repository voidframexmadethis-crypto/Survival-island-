# Survival Island: The Lost World — Capacitor Packaging Architecture

**Status:** Implemented on November 25, 2026. The website and mobile web bundles pass, and iOS/Android Capacitor projects are generated and synced. Native IDE builds were not run because this environment has no Xcode or Java/Android SDK. Nothing has been committed or pushed.

## 1. Executive Summary

**Recommended architecture:** keep the Vercel Next.js website exactly as it is, and add a **separate Vite-built mobile web shell** that reuses the existing React game components and game engine. Capacitor packages that local static shell for iOS and Android.

```text
Vercel website (unchanged)
  Next.js 15 App Router
  app/page.tsx  -> SurvivalGameClient
  app/coaster-studio/page.tsx -> CoasterStudioClient
  app/api/* -> accounts, exchange, Payhip, P2P signaling, YouTube search

Capacitor app
  Capacitor WebView
  mobile/dist (Vite build)
    -> imports the same SurvivalGameClient / CoasterStudioClient
    -> bundles game code, Three.js, CSS, and public assets locally
  HTTPS API calls -> Vercel /api/*
```

This satisfies the important constraints:

- The existing website remains the Next.js/Vercel deployment.
- The production app does **not** load the whole game from Vercel.
- The game is not rewritten, replaced, or statically exported.
- Website and mobile builds are separate.
- Online features stay on the existing server API.

It also avoids the two bad options:

- **Do not** use `server.url` in `capacitor.config.ts` to point at Vercel. That would fail the “local game bundle” requirement and make the app network-dependent.
- **Do not** switch the whole Next.js app to `output: 'export'`. The API routes, cookie auth, Payhip webhooks, filesystem-backed exchange store, and image optimizer are not static-export compatible.

## 2. Current Architecture Audit

### Stack

- Next.js 15.4.9, App Router
- React 19.2.1
- Three.js 0.187
- Tailwind CSS 4
- Bun package manager
- `next.config.ts` currently uses `output: 'standalone'`

### Frontend is already client-side

- `app/page.tsx` only renders `<SurvivalGameClient />`.
- `app/coaster-studio/page.tsx` only renders `<CoasterStudioClient />`.
- `app/layout.tsx` provides metadata, viewport, and global CSS.
- `app/500.tsx` and `app/not-found.tsx` use `next/link`, but are not part of the game route.
- The game code under `game/` imports no Next.js server APIs.
- Only two client modules use Next-specific UI imports:
  - `components/game/TvPlayerModal.tsx` uses `next/image`.
  - `components/coaster/CoasterStudioClient.tsx` uses `next/link`.
- `CoasterStudioClient.tsx`, `GameEngine.ts`, and `carRadioSystem.ts` reference `process.env`; these are simple build-time values and can be defined by Vite.
- `public/` is about 27 MB. The game is largely procedural, and no static asset imports were found, but the whole `public/` directory should still be copied so no existing asset is lost.

### Saves are local browser storage

`game/systems/saveManager.ts` stores saves in `localStorage`:

- `survival_island_lost_world_saves_v1`
- `survival_island_slot_v1_*`
- `survival_island_settings_v1`
- `survival_island_active_session_v1`
- launch-save keys from `game/systems/launchSave.ts`

The mobile app will reuse the same schema and keys. It will **not** automatically see website saves, because `https://<vercel-domain>` and `capacitor://localhost` are different storage origins.

## 3. API Route Audit

All API routes are server-only and must remain on Vercel or another persistent HTTPS server.

| Route | Methods | Server requirement | Notes |
|---|---|---|---|
| `/api/p2p` | GET, POST | Signaling and relay | Uses an in-memory `globalThis` room map. Rooms expire after 45 seconds of peer inactivity and 12 hours total. Not safe across multiple serverless instances. |
| `/api/exchange/storefront` | GET | Yes | Reads the exchange store and authenticated player. |
| `/api/exchange/auth` | GET, POST, DELETE | Yes | Email/password auth, HMAC session token, httpOnly cookie. |
| `/api/exchange/equip` | POST | Yes | Server-authoritative equipped cosmetics. |
| `/api/exchange/purchase` | POST | Yes | Server-authoritative coin balance and ownership. |
| `/api/exchange/coins/checkout` | POST | Yes | Coin package checkout preview; payment provider webhook must confirm. |
| `/api/exchange/payhip/checkout` | POST | Yes | Creates a Payhip checkout session. |
| `/api/exchange/payhip/status` | GET, POST | Yes | Polls and updates checkout status. |
| `/api/payhip/webhook` | POST | Yes | Payhip server-to-server webhook; signature verification and idempotency. |
| `/api/exchange/payhip/webhook` | POST | Yes | Re-exports the Payhip webhook handler. |
| `/api/exchange/admin/auth` | GET, POST, DELETE | Yes | Owner admin session. |
| `/api/exchange/admin/catalog` | GET | Yes | Admin catalog. |
| `/api/exchange/admin/products` | POST | Yes | Admin product creation. |
| `/api/exchange/admin/products/[id]` | PATCH, DELETE | Yes | Admin product changes. |
| `/api/exchange/admin/coins` | POST | Yes | Admin coin package creation. |
| `/api/exchange/admin/coins/[id]` | PATCH, DELETE | Yes | Admin coin package changes. |
| `/api/exchange/admin/upload` | POST | Yes | Admin image/GLB upload; returns data URLs. |
| `/api/youtube/search` | GET | Yes | Server-side YouTube search/embed verification. Browser CORS and YouTube scraping make this server-only. |

**Server runtime issue:** `lib/exchangeStore.ts` persists to `.data/exchange-store.json` using `node:fs`. That is not durable on Vercel serverless filesystems. This is an existing website reliability issue, not a Capacitor issue, but it directly affects whether mobile accounts and purchases survive redeploys. A durable database is required before calling the account/store system production-ready.

**P2P issue:** `/api/p2p` stores rooms in process memory. On Vercel, different requests can hit different instances. The current signaling/relay can therefore fail even on the website. A durable relay or shared Redis-backed room store is required for reliable cross-device multiplayer.

## 4. Architecture Options

| Option | Result | Decision |
|---|---|---|
| **A. Separate Vite mobile shell + Capacitor local bundle** | Reuses existing game components; website unchanged; local assets; remote APIs | **Recommended** |
| B. Convert Next.js app to static export | API routes are unsupported; image optimizer and `output: 'standalone'` conflict; would require restructuring the whole app | Rejected |
| C. Capacitor `server.url` pointing at Vercel | Loads the entire game remotely; fails requirement 5; poor offline behavior; App Store review risk | Rejected |
| D. PWA/home-screen wrapper only | Not a native package; no App Store/Play submission | Rejected |

## 5. Proposed Mobile Runtime

### Build boundary

- Vercel keeps `bun run build` and `next.config.ts` unchanged.
- Mobile uses `vite build --config vite.mobile.config.ts`.
- Vite output goes to `mobile/dist`.
- Capacitor copies `mobile/dist` into the native projects.

### Mobile shell responsibilities

The shell should contain **only** bootstrapping and platform glue, not game logic:

- Create the React root.
- Import `app/globals.css` so Tailwind and existing global styles are preserved.
- Mount the existing `SurvivalGameClient`.
- Route `#/coaster-studio` to the existing `CoasterStudioClient` when needed.
- Provide `next/image` and `next/link` shims for the two client imports.
- Set runtime API and website URLs on `window`.
- Configure status bar, splash screen, safe areas, and Android back handling.

No gameplay code, assets, world content, save schema, or systems are replaced.

### Runtime configuration

The mobile shell sets:

```ts
window.__SI_API_BASE_URL__ = 'https://<vercel-domain>';
window.__SI_WEB_URL__ = 'https://<vercel-domain>';
```

The existing website leaves these unset, so `apiUrl()` resolves to relative URLs and current behavior is unchanged.

## 6. Online Feature Plan

### Multiplayer / P2P

- Keep WebRTC data channels for player state, structures, vehicles, combat, chat, and voice.
- Keep `/api/p2p` as the signaling and relay endpoint.
- Mobile fetches must use the absolute API base URL.
- Add CORS support for `capacitor://localhost` (iOS) and `https://localhost` (Android).
- Keep WebRTC microphone permission prompts; iOS needs `NSMicrophoneUsageDescription`; Android needs `RECORD_AUDIO`.
- For production reliability, move room state to a shared store or a single durable relay service. The current in-memory map is not reliable on multi-instance serverless hosting.

### Accounts and exchange

- Keep cookie auth for the website.
- Add bearer-token auth for mobile so the app does not depend on cross-origin httpOnly cookies.
- `createPlayerSessionToken()` already creates a signed 30-day HMAC token. Reuse it.
- `getAuthenticatedPlayer()` should accept either:
  - the existing httpOnly cookie for web, or
  - `Authorization: Bearer <token>` for mobile.
- Login/register responses return the token to mobile and continue setting the cookie for web.
- Store the mobile token through a small abstraction. Initial implementation can use `localStorage`; a later hardening step can use `@capacitor/preferences` or secure storage.
- Admin routes stay web-only and should be hidden in the native UI.

### Payhip

- Keep Payhip checkout creation and webhook handling on the server.
- On web, keep the existing embedded checkout behavior.
- On native, do not initiate digital checkout. Owned items and account state remain visible and equippable. The implemented native UI explicitly directs purchases to the website.
- If a native purchase path is approved later, add StoreKit 2 and Google Play Billing with server-side receipt validation rather than linking to Payhip.
- **Store-policy decision required:** Apple and Google generally require their own in-app purchase systems for digital goods and virtual currency. Shipping a Payhip purchase link for cosmetics or SI Coins inside the iOS/Android app is a likely rejection.
  - Recommended: Payhip remains the website purchase path; mobile shows owned items and account state but does not initiate digital purchases until an IAP path is approved.
  - Alternative: add StoreKit 2 and Google Play Billing with server-side receipt validation.

### YouTube TV

- Keep `/api/youtube/search` server-side.
- The YouTube iframe itself loads remotely; only the search API needs the mobile base URL.
- The iframe `origin` parameter currently uses `window.location.origin`. On mobile that becomes `capacitor://localhost`, which YouTube may reject. Use the public website URL for this value or omit it on native.
- Keep the existing preset fallback if the search API is unavailable.

### Local-only features

These continue to work offline inside the app:

- Gameplay, world generation, Three.js rendering
- Local saves and settings
- Crafting, building, vehicles, caves, ecosystem
- Local audio and music studio
- Local mod manager
- Local coaster/park studio storage

## 7. Save and Progress Preservation

The mobile app must use the same save schema and keys. No save migration or reset is proposed.

However, existing website saves cannot be read automatically by the app because localStorage is origin-scoped. Three options:

1. **Accept separate app saves.** The app starts fresh; website saves remain untouched. This is the lowest-risk packaging path but does not preserve cross-platform progress.
2. **Add one-time save export/import.** Export the relevant `survival_island_*` localStorage keys as JSON from the website; import them in the app. This is the smallest change that preserves existing player progress.
3. **Add cloud saves.** Requires new authenticated server storage and conflict handling. Larger scope.

Recommended before release: option 2, implemented as a save-transfer tool that does not change the game save format. Do not enable any destructive migration automatically.

## 8. Proposed File Changes

### New files

| File | Purpose |
|---|---|
| `vite.mobile.config.ts` | Vite build for the mobile shell. Root at repository root so Tailwind scans `components/`, `game/`, and `app/`; output `mobile/dist`; copy `public/`. |
| `mobile/index.html` | Mobile document shell, viewport/safe-area meta, root element. |
| `mobile/src/main.tsx` | React root and route selection for game vs coaster studio. |
| `mobile/src/mobileConfig.ts` | Sets `window.__SI_API_BASE_URL__` and `window.__SI_WEB_URL__` from `VITE_*` values. |
| `mobile/src/mobileBridge.ts` | Capacitor platform setup: splash, status bar, app resume, back button, optional orientation. |
| `mobile/src/mobile.css` | Imports `app/globals.css`; adds native safe-area/height fixes. |
| `mobile/src/shims/next-image.tsx` | Local `<img>` fallback supporting `fill`, `sizes`, and standard image props. |
| `mobile/src/shims/next-link.tsx` | Local `<a>` fallback mapping internal routes to the mobile shell. |
| `game/systems/apiConfig.ts` | Shared `getApiBaseUrl()`, `apiUrl()`, `getWebUrl()`, and auth-header helpers. |
| `game/systems/sessionToken.ts` | Shared mobile session-token storage abstraction. |
| `game/systems/saveTransfer.ts` | One-time full save backup/restore for existing `survival_island_*` keys without auth tokens. |
| `lib/mobileAppOrigins.ts` | Shared Capacitor origin allowlist for CORS and mobile-only token issuance. |
| `middleware.ts` | CORS allowlist and `OPTIONS` handling for `/api/:path*` from Capacitor origins. |
| `capacitor.config.ts` | App ID, name, `webDir: 'mobile/dist'`, status bar/splash settings. |
| `CAPACITOR_PLAN.md` | This architecture plan. |

`ios/` and `android/` will be generated by Capacitor after approval. They should not be hand-authored before the web build is validated.

### Modified files

| File | Change |
|---|---|
| `package.json` | Add mobile build scripts and Capacitor/Vite dependencies. Website `build` stays unchanged. |
| `.gitignore` | Ignore `mobile/dist`, native build output, Pods, Gradle caches, keystores, and local env files. |
| `tsconfig.json` | Exclude `mobile/` from the Next typecheck, or add a separate `mobile/tsconfig.json`. |
| `game/systems/exchangeManager.ts` | Use `apiUrl()` for all fetches; attach bearer token when present; keep web cookie behavior. |
| `game/systems/p2pMultiplayer.ts` | Use `apiUrl()` for every `/api/p2p` request. |
| `components/game/TvPlayerModal.tsx` | Use `apiUrl()` for YouTube search; use public web URL for the iframe origin. |
| `components/game/MultiplayerModal.tsx` | Build invite links from the website URL, not `window.location.href`. |
| `components/game/PersistentYouTubeOverlay.tsx` | Avoid using `capacitor://localhost` as a YouTube origin value. |
| `components/game/ExchangeModal.tsx` | Native branch opens Payhip via `@capacitor/browser`; web keeps iframe. |
| `components/game/PayhipMarketplaceModal.tsx` | Same native external-browser branch. |
| `components/game/BlankPhoneMarketplaceModal.tsx` | Native purchase action is blocked; owned items remain equippable. |
| `components/game/WorldSelectionMenu.tsx` | Export/restore controls for the one-time save backup. |
| `lib/exchangeStore.ts` | Accept bearer token in addition to the web cookie. No account/save schema change. |
| `app/api/exchange/auth/route.ts` | Return the signed session token to mobile; keep the web cookie. |
| `middleware.ts` | CORS for Capacitor origins and preflight requests. |

### Explicitly unchanged

- `app/page.tsx`
- `app/layout.tsx`
- `app/coaster-studio/page.tsx`
- `next.config.ts`
- `game/engine/GameEngine.ts`
- All gameplay systems, world content, assets, and save formats
- Vercel deployment and `bun run build`

`next.config.ts` must not be changed to `output: 'export'`.

## 9. Proposed Build Commands

These are the commands used for verification.

```bash
# Website — unchanged
bun run build

# Mobile web bundle
bun run build:mobile

# Native sync
bunx cap sync

# Native IDEs
bunx cap open ios
bunx cap open android
```

Suggested `package.json` scripts:

```json
{
  "build:mobile": "vite build --config vite.mobile.config.ts",
  "cap:sync": "bun run build:mobile && cap sync",
  "cap:ios": "bun run build:mobile && cap sync ios && cap open ios",
  "cap:android": "bun run build:mobile && cap sync android && cap open android"
}
```

## 10. iPhone Packaging Plan

1. Build `mobile/dist` with Vite.
2. Add the iOS platform with Capacitor.
3. Open the generated Xcode workspace.
4. Set the bundle identifier, Apple team, version, and build number.
5. Use the current Capacitor-supported iOS deployment target; do not lower it without testing the game.
6. Add `NSMicrophoneUsageDescription` for P2P voice and audio recording.
7. Add `NSPhotoLibraryUsageDescription` if players can pick images from Photos for marketplace/mod uploads.
8. Keep the game bundle local. Do not configure `server.url`.
9. Set status bar, splash screen, and safe-area behavior.
10. Test on a physical iPhone, including:
    - first launch and splash
    - save, close, and relaunch
    - touch controls and orientation
    - WebGL performance and memory
    - P2P voice permission and connection
    - account login and owned cosmetics
    - YouTube TV playback
    - Payhip policy behavior
11. Archive and upload to TestFlight.
12. Submit with a privacy policy and App Store privacy disclosures.

### iOS review blockers to resolve

- **Digital goods:** Payhip purchases for virtual items/coins likely require StoreKit in-app purchase. Decide web-only purchase vs IAP.
- **Account deletion:** If the app supports account creation, Apple expects an in-app account deletion path.
- **User-generated content:** Marketplace uploads and multiplayer chat may require reporting, blocking, and moderation controls.
- **Privacy:** Microphone, photo library, account data, and purchase data must be declared.

## 11. Android Packaging Plan

1. Build `mobile/dist` with Vite.
2. Add the Android platform with Capacitor.
3. Open the generated Android project in Android Studio.
4. Set application ID, version code, version name, and signing configuration.
5. Keep `INTERNET`; add `RECORD_AUDIO` for P2P voice.
6. Keep cleartext traffic disabled; all API calls must use HTTPS.
7. Test on a physical Android device, including:
    - WebView/WebGL startup
    - back-button behavior
    - save persistence across app restarts
    - touch controls and performance
    - P2P voice and relay
    - account login and storefront
    - Payhip policy behavior
8. Build a signed Android App Bundle (`.aab`).
9. Complete Play Console data safety, privacy policy, and content declarations.
10. Use internal testing, then closed testing, then production.

### Android review blockers to resolve

- Digital goods must generally use Google Play Billing.
- Account deletion path is required for account-based apps.
- UGC moderation/reporting may be required for chat and marketplace content.
- Target the current Play API level.

## 12. Key Risks and Decisions

| Risk / decision | Impact | Recommendation |
|---|---|---|
| Payhip vs App Store/Play billing | Could block release | Keep Payhip web-only; add IAP later or hide mobile purchases. |
| Existing website saves are not accessible from the app | Player progress gap | Add one-time save export/import before release. |
| Exchange data uses local `.data` JSON on Vercel | Accounts/purchases can be lost on redeploy/serverless scaling | Move to a durable database before production. |
| P2P rooms use in-memory server state | Cross-instance multiplayer can fail | Use a shared room store or single durable relay. |
| Cross-origin cookies on mobile | Login may fail | Use bearer tokens for mobile; keep cookies for web. |
| No account deletion | App Store/Play rejection risk | Add in-app account deletion before submission. |
| UGC chat/marketplace | Review/moderation risk | Add reporting/blocking or hide on native. |
| Two build systems | Maintenance overhead | Keep the mobile shell thin; no gameplay duplication. |
| Mobile memory/WebGL performance | Crashes on low-end devices | Test on minimum devices; use existing graphics presets. |

## 13. Recommendation

Implemented approach:

1. **Vite mobile shell + Capacitor local bundle.**
2. **Remote API base URL with bearer-token auth and CORS.**
3. **Payhip web-only for the first mobile release.**
4. **One-time save export/import** before release.
5. **Durable server storage and P2P relay** before calling multiplayer and purchases production-ready.

## 14. Approval Decisions

Confirmed before implementation:

1. App identifier: `com.adventureforgegames.survivalisland`.
2. Production API domain: `https://survival-island-nu.vercel.app`.
3. Mobile Payhip purchases stay web-only for the first release.
4. Existing website saves use one-time export/import.
5. Coaster Studio is included in the first mobile build.
6. Target iOS 15+ and Android 10+.

## 15. Implementation Result (November 25, 2026)

### Verified

- `bun tsc -b --noEmit` passed.
- `bun test` passed: 385 tests across 64 files.
- `bun run build` passed with all 20 static pages, API routes, middleware, and `/coaster-studio`.
- `bun run build:mobile` passed; Vite emitted `mobile/dist/index.html` and the bundled game CSS/JS/public assets.
- `bunx cap sync` completed for both native platforms with all 8 Capacitor plugins.
- Local CORS preflight from `capacitor://localhost` returned 204 with the expected headers.
- Mobile-origin login returned a bearer token; website-origin login did not return one, preserving httpOnly-cookie-only website auth.
- Bearer-authenticated storefront request returned 200.
- The built mobile bundle loaded in headless Chromium, rendered World Selection, and rendered the Coaster Studio hash route. Headless WebGL was unavailable, so 3D rendering was not visually verified there.
- iOS deployment target is 15.0 and Swift package platform is iOS 15. Android `minSdkVersion` is 29 (Android 10), `targetSdkVersion` 36.
- iOS microphone/photo-library usage descriptions and Android `RECORD_AUDIO` were added for existing multiplayer voice and upload flows.

### Remaining release blockers

- Native iOS/Android compilation and device testing require Xcode and the Android SDK/Java toolchain.
- Production CORS and bearer-token issuance take effect only after the website is deployed. Until then the mobile app cannot call the production API from `capacitor://localhost`.
- Exchange accounts and purchases still persist to `.data/exchange-store.json` via `node:fs`; this is not durable on Vercel serverless.
- `/api/p2p` rooms still live in process memory; cross-instance signaling remains unreliable.
- Payhip/StoreKit and Google Play Billing policy decisions remain.
- App Store/Play account deletion, UGC moderation, privacy disclosures, app icons, and signing credentials remain.

No commit or push was made.
