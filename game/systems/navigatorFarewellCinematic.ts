/**
 * Camera and subtitle choreography for the one-shot navigator farewell.
 * Kept pure so the timing, dialogue and camera framing can be tested without WebGL.
 */
export const NAVIGATOR_FAREWELL_DURATION = 14.2;

export interface NavigatorFarewellSample {
  finished: boolean;
  shot: number;
  speaker: string;
  subtitle: string;
  ferryX: number;
  ferryY: number;
  ferryZ: number;
  ferryYaw: number;
  ferryRoll: number;
  ferryScale: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
}

export function sampleNavigatorFarewell(
  time: number,
  boardX: number,
  boardZ: number,
  oceanLevel = 0,
  navigatorName = 'Elena',
): NavigatorFarewellSample {
  const t = Math.max(0, Math.min(NAVIGATOR_FAREWELL_DURATION, time));
  const progress = t / NAVIGATOR_FAREWELL_DURATION;
  const ferryX = boardX - 50 + progress * 112;
  // Keep the galleon's hull clear of the close-up camera by giving it its own
  // deeper lane beyond the driftwood.
  const ferryZ = boardZ + 16;
  const ferryY = oceanLevel + 0.12 + Math.sin(t * 0.9) * 0.28;

  let shot = 0;
  let speaker = '';
  let subtitle = '';

  if (t < 3.6) {
    const e = t / 3.6;
    shot = 0;
    subtitle =
      e < 0.55
        ? `The ferry cuts past the old shipwreck. ${navigatorName} sits alone on the drifting plank, watching you go.`
        : 'The navigator does not call out. Just turns toward the ferry as it comes abreast of the wreck.';
    return {
      finished: false,
      shot,
      speaker,
      subtitle,
      ferryX,
      ferryY,
      ferryZ,
      ferryYaw: Math.PI / 2,
      ferryRoll: Math.sin(t * 0.75) * 0.018,
      ferryScale: 0.65,
      cameraX: boardX - 14,
      cameraY: oceanLevel + 4.6,
      cameraZ: boardZ + 6.5,
      lookX: boardX + 3,
      lookY: oceanLevel + 1.8,
      lookZ: boardZ + 7,
    };
  }

  if (t < 8.8) {
    shot = 1;
    speaker = navigatorName.toUpperCase();
    subtitle =
      t < 6.2
        ? 'I thought we were companions... I thought everything was fine.'
        : 'You could have just told me. I would have understood.';
    return {
      finished: false,
      shot,
      speaker,
      subtitle,
      ferryX,
      ferryY,
      ferryZ,
      ferryYaw: Math.PI / 2,
      ferryRoll: Math.sin(t * 0.75) * 0.018,
      ferryScale: 0.65,
      cameraX: boardX + 3.8,
      cameraY: oceanLevel + 2.65,
      cameraZ: boardZ + 4.7,
      lookX: boardX,
      lookY: oceanLevel + 1.15,
      lookZ: boardZ,
    };
  }

  if (t < 12.4) {
    shot = 2;
    subtitle =
      t < 10.4
        ? `The ferry keeps moving. ${navigatorName} stays seated, hands folded in their lap, eyes following it out.`
        : 'The navigator looks smaller against the water now. Whatever they expected from you, they are letting it go.';
    return {
      finished: false,
      shot,
      speaker,
      subtitle,
      ferryX,
      ferryY,
      ferryZ,
      ferryYaw: Math.PI / 2,
      ferryRoll: Math.sin(t * 0.75) * 0.018,
      ferryScale: 0.65,
      cameraX: boardX - 4.2,
      cameraY: oceanLevel + 2.9,
      cameraZ: boardZ - 4.8,
      lookX: ferryX,
      lookY: oceanLevel + 1.3,
      lookZ: ferryZ,
    };
  }

  shot = 3;
  subtitle = 'The navigator stays there, on the wood, where the pirate ship went down.';
  return {
    finished: t >= NAVIGATOR_FAREWELL_DURATION,
    shot,
    speaker,
    subtitle,
    ferryX,
    ferryY,
    ferryZ,
    ferryYaw: Math.PI / 2,
    ferryRoll: Math.sin(t * 0.75) * 0.018,
    ferryScale: 0.65,
    cameraX: boardX - 17,
    cameraY: oceanLevel + 6.2,
    cameraZ: boardZ + 2,
    lookX: boardX + 1,
    lookY: oceanLevel + 1.2,
    lookZ: boardZ + 8,
  };
}
