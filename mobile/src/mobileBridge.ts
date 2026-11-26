import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

const ROOT_HASH = '#/';

function routeHome(): void {
  if (window.location.hash && window.location.hash !== ROOT_HASH) {
    window.location.hash = ROOT_HASH;
  }
}

export async function setupMobileBridge(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add('capacitor-native');

  await Promise.allSettled([
    StatusBar.setStyle({ style: Style.Dark }),
    StatusBar.setBackgroundColor({ color: '#0c0a09' }),
    StatusBar.setOverlaysWebView({ overlay: false }),
    SplashScreen.hide(),
  ]);

  await Promise.allSettled([Keyboard.setAccessoryBarVisible({ isVisible: false })]);

  await App.addListener('backButton', () => {
    if (window.location.hash && window.location.hash !== ROOT_HASH) {
      routeHome();
      return;
    }

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    const handled = !window.dispatchEvent(escape);
    if (!handled) {
      void App.exitApp();
    }
  });
}
