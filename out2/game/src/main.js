// Emberward's boot and one game loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between four screens:
// title (with the world drifting ambiently behind it), play, paused, and the end screen —
// victory when the third wave breaks, defeat when the crystal shatters.
//
// ?seed=N fixes the ember pattern. ?shot=start|play|win (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_CRYSTAL_HIT, EVENT_DEFEAT, EVENT_GATHER, EVENT_MAGMA_CRACK,
  EVENT_NOVA, EVENT_SHATTER, EVENT_VICTORY, EVENT_WAVE_CLEAR,
} from './world.js';
import { ACTION_CONFIRM, ACTION_NOVA, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createSoundBoard } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSoundBoard();

function readBestScore() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShotScene(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (clientX, clientY) => renderer.clientToField(clientX, clientY));
  let screen = SCREEN_TITLE;
  let best = readBestScore();
  let accumulator = 0;
  let last = performance.now();
  let novaQueued = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    novaQueued = false;
    screen = SCREEN_PLAY;
    sound.unlock();
    sound.playWaveHorn();
    announce('Playing. Wave 1: First Embers. Guard the crystal.');
  }

  function finishGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBestScore(best);
    }
    if (world.state.victory) {
      sound.playVictoryChime();
      announce(`Victory. Score ${world.state.score}. Best ${best}.`);
    } else {
      sound.playShatteredCrystal();
      announce(`The crystal shattered. Score ${world.state.score}. Best ${best}.`);
    }
  }

  /** Play the sounds and announcements for one step's events. */
  function reactToEvents(events) {
    if (events & EVENT_SHATTER) sound.playShatter();
    if (events & EVENT_MAGMA_CRACK) sound.playMagmaCrack();
    if (events & EVENT_GATHER) sound.playGatherStarlight();
    if (events & EVENT_NOVA) sound.playNovaBurst();
    if (events & EVENT_WAVE_CLEAR) sound.playWaveHorn();
    if (events & EVENT_CRYSTAL_HIT) {
      sound.playCrystalHit();
      announce(`Crystal hit. Integrity ${Math.round(world.state.crystalIntegrity)} percent.`);
    }
    if ((events & (EVENT_VICTORY | EVENT_DEFEAT)) && screen === SCREEN_PLAY) finishGame();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions) sound.unlock();
    if ((actions & ACTION_CONFIRM) && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if ((actions & ACTION_PAUSE) && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if ((actions & (ACTION_PAUSE | ACTION_CONFIRM)) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if ((actions & ACTION_NOVA) && screen === SCREEN_PLAY) novaQueued = true;
  }

  function buildControl() {
    const direction = input.keyboardDirection();
    const pointer = input.pointerPosition();
    const usePointer = pointer !== null && direction.x === 0 && direction.y === 0;
    const control = { moveX: direction.x, moveY: direction.y, target: usePointer ? pointer : null, nova: novaQueued };
    novaQueued = false;
    return control;
  }

  function stepOnce() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { moveX: 0, moveY: 0, target: null, nova: false }, true);
      return;
    }
    const events = world.step(STEP, buildControl(), false);
    reactToEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        stepOnce();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting embers fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberward. Click or press Enter to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShotScene(shot);
else runGame();
