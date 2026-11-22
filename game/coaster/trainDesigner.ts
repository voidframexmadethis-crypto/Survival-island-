import type { RestraintKind, TrainBodyStyle, TrainDesign, WheelStyle } from './types';

const COLOR_NAMES: Record<string, string> = {
  black: '#15171c',
  white: '#eff3f6',
  red: '#d81f26',
  crimson: '#a31224',
  blue: '#1f6fd8',
  navy: '#182b56',
  teal: '#0f8b8d',
  cyan: '#22c7d6',
  green: '#2f9e44',
  lime: '#8ec63f',
  yellow: '#f2c230',
  gold: '#d8a327',
  orange: '#e67324',
  purple: '#7a3db8',
  violet: '#9b59d0',
  pink: '#e05a9b',
  silver: '#b8c1c8',
  grey: '#7a828a',
  gray: '#7a828a',
  brown: '#6b4a2f',
  copper: '#b46b3c',
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const HEX_RE = /#([0-9a-f]{6})/gi;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function extractCars(prompt: string): number {
  const digit = prompt.match(/\b(\d{1,2})[\s-]*car(?:s)?\b/i);
  if (digit) return clamp(parseInt(digit[1], 10), 1, 12);
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}[\\s-]*car(?:s)?\\b`, 'i').test(prompt)) return value;
  }
  return 4;
}

function extractSeats(prompt: string): { seatsPerRow: number; rowsPerCar: number } {
  const wordNumber = '(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
  const across =
    prompt.match(new RegExp(`\\b(\\d{1,2})[\\s-]*across\\b`, 'i')) ??
    prompt.match(new RegExp(`\\b${wordNumber}[\\s-]*across\\b`, 'i'));
  const seats =
    prompt.match(/\b(\d{1,2})[\s-]*(?:seats?|abreast)\b/i) ??
    prompt.match(new RegExp(`\\b${wordNumber}[\\s-]*(?:seats?|abreast)\\b`, 'i'));
  const parsed = across?.[1] ?? seats?.[1];
  const numeric = parsed ? (/^\d+$/.test(parsed) ? parseInt(parsed, 10) : NUMBER_WORDS[parsed.toLowerCase()]) : undefined;
  const seatsPerRow = clamp(numeric ?? 2, 1, 12);
  const rows =
    /\b(?:three|3)[\s-]*row/i.test(prompt) ? 3 : /\b(?:two|2)[\s-]*row/i.test(prompt) ? 2 : 2;
  return { seatsPerRow, rowsPerCar: rows };
}

function extractRestraint(prompt: string): RestraintKind {
  if (/over[\s-]*the[\s-]*shoulder|\botsr\b|shoulder harness/i.test(prompt)) return 'otsr';
  if (/harness|flying|prone/i.test(prompt)) return 'harness';
  if (/lap[\s-]*bar|lap restraint/i.test(prompt)) return 'lap_bar';
  if (/no restraint|restraint[\s-]*free/i.test(prompt)) return 'none';
  return 'lap_bar';
}

function extractBody(prompt: string): TrainBodyStyle {
  if (/wood|timber|hybrid/i.test(prompt)) return 'wood';
  if (/wing/i.test(prompt)) return 'wing';
  if (/invert|suspended/i.test(prompt)) return 'invert';
  if (/flying|prone|lay[\s-]*down/i.test(prompt)) return 'flying';
  if (/launch|blitz|lsm|lsm/i.test(prompt)) return 'launch';
  return 'steel';
}

function extractWheels(prompt: string): WheelStyle {
  return /exposed|visible|open wheel|wheel assembly/i.test(prompt) ? 'exposed' : 'covered';
}

function extractColors(prompt: string): string[] {
  const found: { index: number; color: string }[] = [];
  for (const match of prompt.matchAll(HEX_RE)) {
    if (match.index !== undefined) found.push({ index: match.index, color: `#${match[1].toLowerCase()}` });
  }
  const lower = prompt.toLowerCase();
  for (const [name, color] of Object.entries(COLOR_NAMES)) {
    // Word boundaries matter: "covered" must not match the color "red".
    const match = new RegExp(`\\b${name}\\b`, 'i').exec(lower);
    if (match?.index !== undefined) found.push({ index: match.index, color });
  }
  const seen = new Set<string>();
  return found
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.color)
    .filter((color) => {
      if (seen.has(color)) return false;
      seen.add(color);
      return true;
    });
}

function makeName(style: TrainBodyStyle, colors: string[], seed: number): string {
  const prefixes = ['Aether', 'Vanguard', 'Nova', 'Titan', 'Ember', 'Cobalt', 'Vector', 'Raptor'];
  const suffixes =
    style === 'wood'
      ? ['Timber', 'Grizzly', 'Rattler']
      : style === 'launch'
        ? ['Surge', 'Bolt', 'Ignition']
        : style === 'wing'
          ? ['Wing', 'Aero', 'Glide']
          : style === 'invert'
            ? ['Invert', 'Hang', 'Suspension']
            : ['Comet', 'Runner', 'Mach'];
  const prefix = prefixes[seed % prefixes.length];
  const suffix = suffixes[(seed >>> 3) % suffixes.length];
  const colorHint = colors.length > 0 ? 'Two-Tone ' : '';
  return `${colorHint}${prefix} ${suffix}`;
}

export function trainDesignFromPrompt(
  prompt: string,
  base?: Partial<TrainDesign>,
): TrainDesign {
  const text = prompt.trim();
  const seed = hash(text || 'coaster train');
  const colors = extractColors(text);
  const primary = colors[0] ?? base?.primaryColor ?? '#1f6fd8';
  const secondary = colors[1] ?? base?.secondaryColor ?? '#15171c';
  const accent = colors[2] ?? base?.accentColor ?? '#f2c230';
  const { seatsPerRow, rowsPerCar } = extractSeats(text);
  const bodyStyle = extractBody(text);
  const restraint = extractRestraint(text);
  const wheels = extractWheels(text);
  const cars = extractCars(text);
  const aeroFairing = /aero|aerodynamic|fairing|streamlined|bodywork/i.test(text);
  const lighting = /led|light|glow|neon/i.test(text);
  const notes = [
    `${cars}-car ${bodyStyle} body`,
    `${rowsPerCar} rows × ${seatsPerRow} seats`,
    `${restraint === 'otsr' ? 'Over-the-shoulder' : restraint === 'lap_bar' ? 'Lap-bar' : restraint === 'harness' ? 'Harness' : 'No'} restraints`,
    wheels === 'exposed' ? 'Exposed wheel assemblies' : 'Covered wheel bogies',
    aeroFairing ? 'Aerodynamic bodywork' : 'Open chassis bodywork',
  ];
  if (lighting) notes.push('LED accent lighting');

  return {
    id: base?.id ?? `design_${seed.toString(36)}`,
    name: base?.name ?? makeName(bodyStyle, colors, seed),
    prompt: text,
    cars,
    rowsPerCar,
    seatsPerRow,
    bodyStyle,
    restraint,
    wheels,
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    lighting,
    aeroFairing,
    notes,
  };
}

export interface TrainDesignProvider {
  readonly id: string;
  readonly label: string;
  readonly isExternal: boolean;
  generate(prompt: string, signal?: AbortSignal): Promise<TrainDesign>;
}

/**
 * Deterministic local design engine. It parses the prompt into an editable 3D
 * train specification; it is deliberately labelled procedural, never AI.
 */
export class LocalProceduralTrainProvider implements TrainDesignProvider {
  readonly id = 'local-procedural';
  readonly label = 'Local procedural designer';
  readonly isExternal = false;

  async generate(prompt: string): Promise<TrainDesign> {
    return trainDesignFromPrompt(prompt);
  }
}

/**
 * Provider-ready bridge for an external prompt-to-3D service. It only activates
 * when an explicit endpoint is configured and never fabricates a result.
 */
export class HttpTrainDesignProvider implements TrainDesignProvider {
  readonly id = 'http-provider';
  readonly label = 'External train design provider';
  readonly isExternal = true;

  constructor(private readonly endpoint: string) {}

  async generate(prompt: string, signal?: AbortSignal): Promise<TrainDesign> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, schema: 'coaster-train-v1' }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`Train provider failed (${response.status}).`);
    }
    const payload = (await response.json()) as Partial<TrainDesign>;
    const merged = trainDesignFromPrompt(prompt, payload);
    return validateTrainDesign(merged);
  }
}

export interface TrainDesignServiceOptions {
  provider?: TrainDesignProvider | null;
}

export class TrainDesignService {
  readonly provider: TrainDesignProvider;

  constructor(options: TrainDesignServiceOptions = {}) {
    this.provider = options.provider ?? new LocalProceduralTrainProvider();
  }

  get providerLabel(): string {
    return this.provider.label;
  }

  get isExternal(): boolean {
    return this.provider.isExternal;
  }

  async generate(prompt: string, signal?: AbortSignal): Promise<TrainDesign> {
    const design = await this.provider.generate(prompt, signal);
    return validateTrainDesign(design);
  }
}

export function validateTrainDesign(design: TrainDesign): TrainDesign {
  const fallback = trainDesignFromPrompt(design.prompt || 'steel coaster train');
  return {
    ...fallback,
    ...design,
    cars: clamp(Math.round(Number(design.cars) || fallback.cars), 1, 12),
    rowsPerCar: clamp(Math.round(Number(design.rowsPerCar) || fallback.rowsPerCar), 1, 4),
    seatsPerRow: clamp(Math.round(Number(design.seatsPerRow) || fallback.seatsPerRow), 1, 12),
    bodyStyle: ['steel', 'launch', 'wood', 'wing', 'invert', 'flying'].includes(design.bodyStyle)
      ? design.bodyStyle
      : fallback.bodyStyle,
    restraint: ['lap_bar', 'otsr', 'harness', 'none'].includes(design.restraint)
      ? design.restraint
      : fallback.restraint,
    wheels: ['exposed', 'covered'].includes(design.wheels) ? design.wheels : fallback.wheels,
    primaryColor: /^#[0-9a-f]{6}$/i.test(design.primaryColor) ? design.primaryColor : fallback.primaryColor,
    secondaryColor: /^#[0-9a-f]{6}$/i.test(design.secondaryColor)
      ? design.secondaryColor
      : fallback.secondaryColor,
    accentColor: /^#[0-9a-f]{6}$/i.test(design.accentColor) ? design.accentColor : fallback.accentColor,
    name: design.name?.trim() || fallback.name,
    notes: Array.isArray(design.notes) ? design.notes.slice(0, 8) : fallback.notes,
  };
}

export function describeTrain(design: TrainDesign): string {
  const seats = design.cars * design.rowsPerCar * design.seatsPerRow;
  return `${design.cars} cars · ${seats} riders · ${design.bodyStyle} chassis · ${design.restraint.replace('_', ' ')}`;
}
