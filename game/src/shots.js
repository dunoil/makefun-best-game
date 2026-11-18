// The screenshot scenes behind ?shot=start|play|win. Each one plays the real rules forward
// from a fresh world, steered by the autopilot below, so every frame is a frame a real game
// can reach, and the same seed always reaches the same frame.

import { CRYSTAL, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const TITLE_SECONDS = 4;
/** Long enough to land mid–wave 2, where the sky is busy: wave 1, the calm, then 10 s more. */
const PLAY_SECONDS = 39;
const END_LIMIT_SECONDS = 260;
/** Into wave 3's thick of it: both earlier waves, both calms, then 12 s of the volcano's heart. */
const LATE_SECONDS = 74;

/**
 * The autopilot's control for this step: guard the crystal first. It predicts where each
 * ember will cross the crystal's height, hurries to intercept the most urgent one inside
 * the crystal's span, and otherwise drifts toward starlight or the crystal's centre.
 * It fires the Nova Burst when the sky is crowded and the charge is full.
 */
export function chooseAutopilotControl(state) {
  const warden = state.warden;
  const crystalTop = CRYSTAL.baseY - CRYSTAL.height;
  let target = { x: CRYSTAL.x, y: crystalTop - 130 };
  let mostUrgentTime = Infinity;

  for (const ember of state.embers) {
    const secondsToCrystal = (crystalTop - ember.y) / Math.max(ember.vy, 1);
    if (secondsToCrystal < 0) continue;
    const landingX = ember.x + ember.vx * secondsToCrystal;
    const threatensCrystal = Math.abs(landingX - CRYSTAL.x) < CRYSTAL.width * 1.15;
    const urgency = threatensCrystal ? secondsToCrystal : secondsToCrystal + 2.5;
    if (urgency < mostUrgentTime) {
      mostUrgentTime = urgency;
      const lead = Math.min(0.42, Math.max(0.1, secondsToCrystal * 0.4));
      target = { x: ember.x + ember.vx * lead, y: Math.min(ember.y + ember.vy * lead, crystalTop - 30) };
    }
  }

  if (mostUrgentTime > 1.15) {
    for (const mote of state.motes) {
      target = { x: mote.x, y: mote.y };
      break;
    }
  }

  const nova = state.charge >= 100 && state.embers.length >= 6;
  return { moveX: 0, moveY: 0, target, nova };
}

/**
 * Set `world` to the named scene (start, play or win; any other name is start) and return
 * the screen to draw over it and the best score to show. "win" plays the whole game out
 * with the autopilot; if the autopilot ever falls, its defeat screen is the honest frame.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'late') {
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, { moveX: 0, moveY: 0, target: null, nova: false }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'win' ? END_LIMIT_SECONDS : name === 'late' ? LATE_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    world.step(STEP, chooseAutopilotControl(world.state), false);
    if (name === 'win' && world.state.finished) break;
  }
  if (name === 'win') return { screen: SCREEN_OVER, best: world.state.score };
  return { screen: world.state.finished ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
