export interface PlayerControlsMinimizerOptions {
  controlSelectors?: string[];
  carDeckSelector?: string;
  toggleBtnSelector?: string;
  onToggle?: (minimized: boolean) => void;
  onResetInputs?: () => void;
}

export class PlayerControlsMinimizer {
  public controlSelectors: string[];
  public carDeckSelector: string;
  public toggleBtnSelector: string;
  public onToggle: ((minimized: boolean) => void) | null;
  public onResetInputs: (() => void) | null;
  public minimized: boolean;

  constructor(options: PlayerControlsMinimizerOptions = {}) {
    this.controlSelectors = options.controlSelectors || [
      '#joystick-pad',
      '#combat-controls',
      '#flight-controls',
      '#hotbar-dock',
      '#teleport-bar',
    ];
    this.carDeckSelector = options.carDeckSelector || '#car-hydraulics-deck';
    this.toggleBtnSelector = options.toggleBtnSelector || '#minimize-controls-btn';
    this.onToggle = options.onToggle || null;
    this.onResetInputs = options.onResetInputs || null;
    this.minimized = false;
  }

  public setMinimized(shouldMinimize: boolean): void {
    this.minimized = Boolean(shouldMinimize);

    // Clear active movement/action inputs so nothing stays stuck while hidden
    if (this.minimized && typeof this.onResetInputs === 'function') {
      this.onResetInputs();
    }

    if (typeof document !== 'undefined') {
      for (const sel of this.controlSelectors) {
        const els = document.querySelectorAll<HTMLElement>(sel);
        els.forEach((el) => {
          el.style.display = this.minimized ? 'none' : '';
        });
      }

      // Keep car hydraulics / airbag / droptop controls visible and easy to tap
      const carDeck = document.querySelector<HTMLElement>(this.carDeckSelector);
      if (carDeck) {
        carDeck.style.display = '';
        carDeck.classList.toggle('controls-minimized-mode', this.minimized);
      }

      const btn = document.querySelector<HTMLElement>(this.toggleBtnSelector);
      if (btn) {
        btn.textContent = this.minimized ? 'Show Controls' : 'Minimize HUD';
        btn.setAttribute('aria-pressed', String(this.minimized));
      }
    }

    if (typeof this.onToggle === 'function') {
      this.onToggle(this.minimized);
    }
  }

  public toggle(): void {
    this.setMinimized(!this.minimized);
  }
}
