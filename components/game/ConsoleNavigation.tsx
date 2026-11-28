'use client';

import { useEffect, useRef } from 'react';

/**
 * Console-style menu navigation.
 *
 * The game already maps an Xbox pad to movement, driving and weapons while a
 * world is running. This component covers the other half of a console title:
 * the title screen, pause menu and every modal can be driven with a D-Pad,
 * left stick, A and B, with a visible focus ring and no mouse or touch input.
 * Arrow keys and Enter do the same thing for keyboard players.
 *
 * It only listens while `active` is true, so gameplay input is never touched.
 */

type Direction = 'up' | 'down' | 'left' | 'right';

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ConsoleNavigationProps {
  active: boolean;
  onBack?: () => void;
  onToggleFullscreen?: () => void;
}

/** A cheap visibility check for the elements a player should be able to reach. */
function isReachable(el: HTMLElement): boolean {
  if (el.hidden) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (style.pointerEvents === 'none') return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  const rect = el.getBoundingClientRect();
  return rect.width >= 4 && rect.height >= 4;
}

function isRendered(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width >= 4 && rect.height >= 4;
}

/**
 * Finds the interface the player is actually looking at. Explicitly marked
 * overlays (the intro cut) win; otherwise the top-most full-screen fixed panel
 * is used so background buttons behind an open menu are unreachable.
 */
function resolveScope(): HTMLElement {
  const explicit = Array.from(
    document.querySelectorAll<HTMLElement>('[data-console-scope]'),
  ).filter(isRendered);
  if (explicit.length > 0) return explicit[explicit.length - 1];

  let best: HTMLElement | null = null;
  let bestZ = 20;
  document.querySelectorAll<HTMLElement>('div.fixed').forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.pointerEvents === 'none') return;
    const z = Number(style.zIndex);
    if (!Number.isFinite(z) || z < bestZ) return;
    const rect = el.getBoundingClientRect();
    if (
      rect.width < window.innerWidth * 0.7 ||
      rect.height < window.innerHeight * 0.7
    ) {
      return;
    }
    if (!el.querySelector(FOCUSABLE)) return;
    best = el;
    bestZ = z;
  });
  return best ?? document.body;
}

function getFocusables(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    isReachable,
  );
}

function isRange(el: Element | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement && el.type === 'range';
}

function findDirectional(
  current: HTMLElement,
  direction: Direction,
  candidates: HTMLElement[],
): HTMLElement | null {
  const currentRect = current.getBoundingClientRect();
  const cx = currentRect.left + currentRect.width / 2;
  const cy = currentRect.top + currentRect.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (candidate === current) continue;
    const rect = candidate.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - cx;
    const dy = rect.top + rect.height / 2 - cy;

    const inDirection =
      direction === 'up'
        ? dy < -8
        : direction === 'down'
          ? dy > 8
          : direction === 'left'
            ? dx < -8
            : dx > 8;
    if (!inDirection) continue;

    const primary =
      direction === 'up'
        ? -dy
        : direction === 'down'
          ? dy
          : direction === 'left'
            ? -dx
            : dx;
    const secondary =
      direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy);
    // Prefer elements in the same row/column while still allowing grid jumps.
    const score = primary + secondary * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function focusElement(el: HTMLElement): void {
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** Steps a range slider without fighting React's controlled value tracking. */
function nudgeRange(input: HTMLInputElement, delta: number): void {
  const step = Number(input.step) || 1;
  const min = Number(input.min);
  const max = Number(input.max) || 100;
  const nextValue = Math.min(
    Number.isFinite(max) ? max : 100,
    Math.max(Number.isFinite(min) ? min : 0, Number(input.value) + step * delta),
  );
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, String(nextValue));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Moves a native select to its previous/next option and notifies React. */
function nudgeSelect(select: HTMLSelectElement, delta: number): void {
  if (select.options.length === 0) return;
  const count = select.options.length;
  const nextIndex =
    ((select.selectedIndex < 0 ? 0 : select.selectedIndex) + delta + count) %
    count;
  if (nextIndex === select.selectedIndex) return;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    'value',
  )?.set;
  setter?.call(select, select.options[nextIndex].value);
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function firstGamepad(): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  for (const pad of navigator.getGamepads()) {
    if (pad && pad.connected) return pad;
  }
  return null;
}

export function ConsoleNavigation({
  active,
  onBack,
  onToggleFullscreen,
}: ConsoleNavigationProps) {
  const onBackRef = useRef(onBack);
  const onFullscreenRef = useRef(onToggleFullscreen);
  onBackRef.current = onBack;
  onFullscreenRef.current = onToggleFullscreen;

  useEffect(() => {
    if (!active) return;

    document.body.classList.add('console-nav-active');

    let raf = 0;
    let lastFocusCheck = 0;
    let heldDirection: Direction | null = null;
    let holdStartedAt = 0;
    let lastRepeatAt = 0;
    let prevA = false;
    let prevB = false;
    let prevY = false;

    const ensureFocus = (scope: HTMLElement) => {
      const focusable = getFocusables(scope);
      if (focusable.length === 0) return;
      const current = document.activeElement;
      if (current instanceof HTMLElement && focusable.includes(current)) return;
      const preferred = Array.from(
        scope.querySelectorAll<HTMLElement>('[data-console-autofocus]'),
      ).find(isReachable);
      focusElement(preferred ?? focusable[0]);
    };

    const move = (direction: Direction) => {
      const scope = resolveScope();
      const candidates = getFocusables(scope);
      if (candidates.length === 0) return;

      const current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (!current || !candidates.includes(current)) {
        focusElement(candidates[0]);
        return;
      }

      if (
        (direction === 'left' || direction === 'right') &&
        isRange(current)
      ) {
        nudgeRange(current, direction === 'right' ? 1 : -1);
        return;
      }

      if (
        (direction === 'left' || direction === 'right') &&
        current instanceof HTMLSelectElement
      ) {
        nudgeSelect(current, direction === 'right' ? 1 : -1);
        return;
      }

      // Text fields keep their native caret movement on left/right.
      if (
        (current instanceof HTMLInputElement ||
          current instanceof HTMLTextAreaElement) &&
        (direction === 'left' || direction === 'right')
      ) {
        return;
      }

      const next = findDirectional(current, direction, candidates);
      if (next) focusElement(next);
    };

    const activate = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return;
      if (isRange(el)) return;
      if (el instanceof HTMLSelectElement) {
        // Cycling is more reliable than a native dropdown on TV browsers.
        nudgeSelect(el, 1);
        return;
      }
      if (
        el instanceof HTMLInputElement &&
        !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(el.type)
      ) {
        el.focus();
        return;
      }
      el.click();
    };

    const readDirection = (pad: Gamepad): Direction | null => {
      const pressed = (index: number) => Boolean(pad.buttons[index]?.pressed);
      const xAxis = pad.axes[0] ?? 0;
      const yAxis = pad.axes[1] ?? 0;
      const x =
        pressed(15) || xAxis > 0.6 ? 1 : pressed(14) || xAxis < -0.6 ? -1 : 0;
      const y =
        pressed(13) || yAxis > 0.6 ? 1 : pressed(12) || yAxis < -0.6 ? -1 : 0;

      if (x !== 0 && Math.abs(x) >= Math.abs(y)) return x > 0 ? 'right' : 'left';
      if (y !== 0) return y > 0 ? 'down' : 'up';
      return null;
    };

    const tick = (now: number) => {
      raf = window.requestAnimationFrame(tick);

      if (now - lastFocusCheck > 450) {
        lastFocusCheck = now;
        ensureFocus(resolveScope());
      }

      const pad = firstGamepad();
      if (!pad) {
        heldDirection = null;
        prevA = prevB = prevY = false;
        return;
      }

      const direction = readDirection(pad);
      if (!direction) {
        heldDirection = null;
      } else if (direction !== heldDirection) {
        heldDirection = direction;
        holdStartedAt = now;
        lastRepeatAt = now;
        move(direction);
      } else if (now - holdStartedAt > 340 && now - lastRepeatAt > 110) {
        lastRepeatAt = now;
        move(direction);
      }

      const a = Boolean(pad.buttons[0]?.pressed);
      const b = Boolean(pad.buttons[1]?.pressed);
      const y = Boolean(pad.buttons[3]?.pressed);

      if (a && !prevA) activate();
      if (b && !prevB) onBackRef.current?.();
      if (y && !prevY) onFullscreenRef.current?.();

      prevA = a;
      prevB = b;
      prevY = y;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      const directions: Record<string, Direction | undefined> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      const direction = directions[event.key];
      if (direction) {
        event.preventDefault();
        move(direction);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        const focused = document.activeElement;
        if (
          focused instanceof HTMLButtonElement ||
          focused instanceof HTMLAnchorElement
        ) {
          return;
        }
        event.preventDefault();
        activate();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    raf = window.requestAnimationFrame(tick);

    return () => {
      document.body.classList.remove('console-nav-active');
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [active]);

  return null;
}
