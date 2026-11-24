import type { FirearmReloadMode } from '../types';

/**
 * Which physical action a firearm uses while reloading. Each mechanism gets
 * its own sound timeline, so a pump shotgun does not sound like a pistol
 * magazine change.
 */
export type ReloadMechanism =
  | 'pistol'
  | 'smg'
  | 'rifle'
  | 'belt'
  | 'plasma'
  | 'shotgun_tube'
  | 'shotgun_break'
  | 'revolver'
  | 'bolt'
  | 'musket';

export type ReloadSfxKind =
  | 'mag_release'
  | 'mag_out'
  | 'mag_in'
  | 'mag_seat'
  | 'slide'
  | 'charge'
  | 'bolt_open'
  | 'bolt_close'
  | 'shell_in'
  | 'shell_seat'
  | 'pump'
  | 'cylinder_open'
  | 'cylinder_close'
  | 'break_open'
  | 'break_close'
  | 'powder'
  | 'ramrod'
  | 'cock'
  | 'belt_feed'
  | 'cell_out'
  | 'cell_in'
  | 'cell_latch'
  | 'action_open'
  | 'action_close';

export interface ReloadStage {
  /** 0..1 of the current reload cycle. */
  at: number;
  kind: ReloadSfxKind;
  /** Once-per-reload stages are not replayed on each shell of a tube reload. */
  once?: boolean;
}

const WEAPON_MECHANISMS: Record<string, ReloadMechanism> = {
  gun: 'pistol',
  glock_19: 'pistol',
  colt_m1911: 'pistol',
  desert_eagle: 'pistol',
  magnum_44: 'revolver',
  pirate_musket: 'musket',
  remington_870: 'shotgun_tube',
  mossberg_590: 'shotgun_tube',
  sawed_off: 'shotgun_break',
  mp5: 'smg',
  uzi: 'smg',
  vector: 'smg',
  ak_47: 'rifle',
  m4a1: 'rifle',
  scar_h: 'rifle',
  fn_fal: 'rifle',
  barrett_50: 'bolt',
  remington_700: 'bolt',
  m249_saw: 'belt',
  alien_plasma_gun: 'plasma',
};

export function weaponReloadMechanism(weaponId: string): ReloadMechanism {
  return WEAPON_MECHANISMS[weaponId] ?? 'rifle';
}

/**
 * Reload stages for one cycle.
 *
 * Magazine weapons run the whole cycle once. Single-round weapons repeat the
 * shell stages for every round loaded; `once` marks the action-open stage that
 * must only play at the start of the whole reload.
 */
export function getReloadTimeline(
  mechanism: ReloadMechanism,
  mode: FirearmReloadMode,
): ReloadStage[] {
  switch (mechanism) {
    case 'pistol':
      if (mode === 'single') return getReloadTimeline('revolver', mode);
      return [
        { at: 0.02, kind: 'mag_release' },
        { at: 0.14, kind: 'mag_out' },
        { at: 0.48, kind: 'mag_in' },
        { at: 0.66, kind: 'mag_seat' },
        { at: 0.86, kind: 'slide' },
      ];
    case 'smg':
      if (mode === 'single') return getReloadTimeline('revolver', mode);
      return [
        { at: 0.02, kind: 'mag_release' },
        { at: 0.12, kind: 'mag_out' },
        { at: 0.5, kind: 'mag_in' },
        { at: 0.68, kind: 'mag_seat' },
        { at: 0.88, kind: 'charge' },
      ];
    case 'rifle':
      if (mode === 'single') return getReloadTimeline('bolt', mode);
      return [
        { at: 0.03, kind: 'mag_release' },
        { at: 0.16, kind: 'mag_out' },
        { at: 0.54, kind: 'mag_in' },
        { at: 0.72, kind: 'mag_seat' },
        { at: 0.9, kind: 'charge' },
      ];
    case 'belt':
      if (mode === 'single') return getReloadTimeline('bolt', mode);
      return [
        { at: 0.04, kind: 'action_open' },
        { at: 0.18, kind: 'mag_out' },
        { at: 0.48, kind: 'belt_feed' },
        { at: 0.64, kind: 'belt_feed' },
        { at: 0.8, kind: 'action_close' },
        { at: 0.92, kind: 'charge' },
      ];
    case 'plasma':
      if (mode === 'single') return getReloadTimeline('revolver', mode);
      return [
        { at: 0.06, kind: 'cell_out' },
        { at: 0.52, kind: 'cell_in' },
        { at: 0.76, kind: 'cell_latch' },
        { at: 0.92, kind: 'charge' },
      ];
    case 'shotgun_tube':
      return [
        { at: 0, kind: 'action_open', once: true },
        { at: 0.5, kind: 'shell_in' },
        { at: 0.78, kind: 'shell_seat' },
      ];
    case 'shotgun_break':
      return [
        { at: 0, kind: 'break_open', once: true },
        { at: 0.46, kind: 'shell_in' },
        { at: 0.74, kind: 'shell_seat' },
      ];
    case 'revolver':
      return [
        { at: 0, kind: 'cylinder_open', once: true },
        { at: 0.44, kind: 'shell_in' },
        { at: 0.7, kind: 'shell_seat' },
      ];
    case 'bolt':
      if (mode === 'magazine') {
        // Box-magazine bolt gun (e.g. Barrett): open bolt, swap magazine,
        // then close the bolt as part of the same sequence.
        return [
          { at: 0.03, kind: 'bolt_open' },
          { at: 0.18, kind: 'mag_out' },
          { at: 0.54, kind: 'mag_in' },
          { at: 0.72, kind: 'mag_seat' },
          { at: 0.9, kind: 'bolt_close' },
        ];
      }
      return [
        { at: 0, kind: 'bolt_open', once: true },
        { at: 0.48, kind: 'shell_in' },
        { at: 0.74, kind: 'shell_seat' },
      ];
    case 'musket':
      return [
        { at: 0, kind: 'powder', once: true },
        { at: 0.38, kind: 'ramrod' },
        { at: 0.62, kind: 'shell_in' },
        { at: 0.86, kind: 'shell_seat' },
      ];
  }
}

/** Closing action played once the whole reload finishes (single-round guns). */
export function getReloadFinishStages(
  mechanism: ReloadMechanism,
  mode: FirearmReloadMode,
): ReloadSfxKind[] {
  switch (mechanism) {
    case 'shotgun_tube':
      return ['pump'];
    case 'shotgun_break':
      return ['break_close'];
    case 'revolver':
      return ['cylinder_close'];
    case 'bolt':
      // The magazine-fed bolt gun closes its bolt inside the timeline.
      return mode === 'magazine' ? [] : ['bolt_close'];
    case 'musket':
      return ['cock'];
    default:
      return [];
  }
}

/**
 * Turns reload progress into a stream of one-shot sounds. It never schedules
 * audio ahead of time, so cancelling or firing mid-reload immediately stops
 * future stages from playing.
 */
export class ReloadSoundSequencer {
  private weaponId = '';
  private mode: FirearmReloadMode = 'magazine';
  private mask = 0;
  private onceMask = 0;
  private lastProgress = 0;
  private active = false;

  public begin(weaponId: string, mode: FirearmReloadMode): ReloadSfxKind[] {
    this.weaponId = weaponId;
    this.mode = mode;
    this.mask = 0;
    this.lastProgress = 0;
    this.active = true;
    this.onceMask = this.buildOnceMask();
    return this.poll(weaponId, mode, 0);
  }

  public poll(
    weaponId: string,
    mode: FirearmReloadMode,
    progress: number,
  ): ReloadSfxKind[] {
    if (!this.active) return [];
    if (weaponId !== this.weaponId || mode !== this.mode) {
      return this.begin(weaponId, mode);
    }

    const clamped = Math.max(0, Math.min(1.0001, progress));
    // A single-round reload repeats its per-shell stages. When the shell timer
    // restarts, drop everything except the once-per-reload action stage.
    if (mode === 'single' && clamped + 0.002 < this.lastProgress) {
      this.mask = this.onceMask;
    }
    this.lastProgress = clamped;

    const timeline = getReloadTimeline(
      weaponReloadMechanism(weaponId),
      mode,
    );
    const played: ReloadSfxKind[] = [];
    for (let i = 0; i < timeline.length; i += 1) {
      const bit = 1 << i;
      if (this.mask & bit) continue;
      if (clamped + 1e-6 >= timeline[i].at) {
        this.mask |= bit;
        played.push(timeline[i].kind);
      }
    }
    return played;
  }

  public finish(
    weaponId: string,
    mode: FirearmReloadMode,
  ): ReloadSfxKind[] {
    if (!this.active || weaponId !== this.weaponId || mode !== this.mode) {
      return [];
    }
    this.active = false;
    return getReloadFinishStages(
      weaponReloadMechanism(this.weaponId),
      this.mode,
    );
  }

  public cancel(): void {
    this.active = false;
    this.mask = 0;
    this.lastProgress = 0;
  }

  private buildOnceMask(): number {
    const timeline = getReloadTimeline(
      weaponReloadMechanism(this.weaponId),
      this.mode,
    );
    let mask = 0;
    for (let i = 0; i < timeline.length; i += 1) {
      if (timeline[i].once) mask |= 1 << i;
    }
    return mask;
  }
}
