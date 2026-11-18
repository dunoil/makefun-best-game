// Emberward's world: the warden, the crystal, the falling embers and starlight, the three
// waves, combo scoring and the Nova Burst. Pure simulation — no DOM, no drawing — advanced in
// fixed steps by stepWorld, which reports what happened as an EVENT_* bitmask so the shell
// can play sounds and announcements.

import { CRYSTAL, EMBER_KINDS, FIELD, NOVA, SCORE, WAVES, WARDEN } from './config.js';
import { createParticleField } from './particles.js';

export const EVENT_SHATTER = 1;
export const EVENT_MAGMA_CRACK = 2;
export const EVENT_GATHER = 4;
export const EVENT_CRYSTAL_HIT = 8;
export const EVENT_NOVA = 16;
export const EVENT_WAVE_CLEAR = 32;
export const EVENT_VICTORY = 64;
export const EVENT_DEFEAT = 128;

const EMBER_KIND_NAMES = ['cinder', 'spark', 'magma'];

/** Create a world driven by the given seeded random generator. */
export function createWorld(random) {
  const particles = createParticleField();
  const state = {
    time: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    shattered: 0,
    gathered: 0,
    leaks: 0,
    crystalIntegrity: CRYSTAL.maxIntegrity,
    charge: 0,
    waveIndex: 0,
    waveTime: 0,
    waveBannerTime: 0,
    betweenWavesTime: 0,
    finished: false,
    victory: false,
    warden: { x: WARDEN.startX, y: WARDEN.startY, vx: 0, vy: 0, shieldFlash: 0 },
    embers: [],
    motes: [],
    emberTimer: 0.4,
    moteTimer: 1.6,
    novaFlash: 0,
    shake: 0,
    particles,
  };

  function resetWorld() {
    state.time = 0;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.shattered = 0;
    state.gathered = 0;
    state.leaks = 0;
    state.crystalIntegrity = CRYSTAL.maxIntegrity;
    state.charge = 0;
    state.waveIndex = 0;
    state.waveTime = 0;
    state.waveBannerTime = 2.4;
    state.betweenWavesTime = 0;
    state.finished = false;
    state.victory = false;
    state.warden.x = WARDEN.startX;
    state.warden.y = WARDEN.startY;
    state.warden.vx = 0;
    state.warden.vy = 0;
    state.warden.shieldFlash = 0;
    state.embers.length = 0;
    state.motes.length = 0;
    state.emberTimer = 0.5;
    state.moteTimer = 1.4;
    state.novaFlash = 0;
    state.shake = 0;
  }

  /** Spawn one ember of the current wave's mix at the top of the field, aimed loosely at the crystal. */
  function spawnEmber(wave) {
    const kindName = EMBER_KIND_NAMES[random.pickIndex([wave.cinder, wave.spark, wave.magma])];
    const kind = EMBER_KINDS[kindName];
    const x = random.range(50, FIELD.width - 50);
    const driftTowardCrystal = (CRYSTAL.x - x) * random.range(0.02, 0.10);
    state.embers.push({
      kind: kindName,
      x,
      y: -kind.radius - 4,
      vx: driftTowardCrystal + random.range(-26, 26),
      vy: wave.fallSpeed * random.range(0.85, 1.2),
      radius: kind.radius,
      hitsLeft: kind.hits,
      damage: kind.damage,
      scoreValue: kind.score,
      wobblePhase: random.range(0, Math.PI * 2),
      wobbleSpeed: random.range(2.2, 4.2),
      rotation: random.range(0, Math.PI * 2),
    });
  }

  /** Spawn one slow starlight mote; gather these to charge the Nova Burst. */
  function spawnStarlightMote() {
    state.motes.push({
      x: random.range(70, FIELD.width - 70),
      y: -16,
      vx: random.range(-18, 18),
      vy: random.range(64, 96),
      radius: 13,
      pulsePhase: random.range(0, Math.PI * 2),
    });
  }

  /** Score a shattered ember through the combo ladder and bank a little nova charge. */
  function scoreShatteredEmber(ember) {
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const multiplier = 1 + Math.min(state.combo, 40) * 0.1;
    state.score += Math.round(SCORE.emberShattered * ember.scoreValue * multiplier);
    state.shattered += 1;
    state.charge = Math.min(NOVA.maxCharge, state.charge + 4);
  }

  /** Move the warden toward the control's intent: a pointer target wins over keyboard direction. */
  function moveWarden(dt, control) {
    const warden = state.warden;
    let vx = 0;
    let vy = 0;
    if (control.target) {
      const dx = control.target.x - warden.x;
      const dy = control.target.y - warden.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 6) {
        const stepLength = Math.min(distance * 14, WARDEN.speed);
        vx = (dx / distance) * stepLength;
        vy = (dy / distance) * stepLength;
      }
    } else {
      const length = Math.hypot(control.moveX, control.moveY) || 1;
      vx = (control.moveX / length) * WARDEN.speed * (control.moveX || control.moveY ? 1 : 0);
      vy = (control.moveY / length) * WARDEN.speed * (control.moveX || control.moveY ? 1 : 0);
    }
    warden.vx = vx;
    warden.vy = vy;
    warden.x = Math.max(WARDEN.shieldRadius, Math.min(FIELD.width - WARDEN.shieldRadius, warden.x + vx * dt));
    // The warden may roam the sky but never enter the crystal's pedestal ground.
    warden.y = Math.max(WARDEN.shieldRadius, Math.min(CRYSTAL.baseY - CRYSTAL.height - 6, warden.y + vy * dt));
    warden.shieldFlash = Math.max(0, warden.shieldFlash - dt * 3.2);
  }

  /** Unleash the Nova Burst if the charge is full: every ember on screen shatters at once. */
  function tryNovaBurst(events) {
    if (state.charge < NOVA.maxCharge || state.finished) return events;
    state.charge = 0;
    state.novaFlash = 0.6;
    state.shake = Math.max(state.shake, 7);
    for (const ember of state.embers) {
      particles.spawnShatterBurst(ember.x, ember.y, '#ffd23e', random);
      scoreShatteredEmber(ember);
    }
    state.embers.length = 0;
    particles.spawnNovaShockwave(state.warden.x, state.warden.y, random);
    return events | EVENT_NOVA;
  }

  /** Advance embers and motes; resolve shield shatters, mote gathers, crystal hits and ground falls. */
  function advanceFallingThings(dt, events) {
    const warden = state.warden;
    for (let index = state.embers.length - 1; index >= 0; index -= 1) {
      const ember = state.embers[index];
      ember.y += ember.vy * dt;
      ember.x += ember.vx * dt + (ember.kind === 'spark' ? Math.sin(state.time * ember.wobbleSpeed + ember.wobblePhase) * 68 * dt : 0);
      ember.rotation += dt * 2.4;

      const shieldDistance = Math.hypot(ember.x - warden.x, ember.y - warden.y);
      if (shieldDistance < WARDEN.shieldRadius + ember.radius) {
        ember.hitsLeft -= 1;
        warden.shieldFlash = 1;
        if (ember.hitsLeft > 0) {
          // A cracked magma ball bounces off the shield and keeps falling, slower.
          ember.vy *= 0.45;
          ember.vx = (ember.x - warden.x) * 2.2;
          ember.y = warden.y - WARDEN.shieldRadius - ember.radius - 2;
          particles.spawnShatterBurst(ember.x, ember.y, '#ff9a3e', random);
          events |= EVENT_MAGMA_CRACK;
        } else {
          particles.spawnShatterBurst(ember.x, ember.y, ember.kind === 'magma' ? '#ff6a3e' : '#ffd23e', random);
          scoreShatteredEmber(ember);
          state.embers.splice(index, 1);
          events |= EVENT_SHATTER;
        }
        continue;
      }

      const hitsCrystal = Math.abs(ember.x - CRYSTAL.x) < CRYSTAL.width / 2 + ember.radius * 0.5
        && ember.y + ember.radius > CRYSTAL.baseY - CRYSTAL.height + 14
        && ember.y < CRYSTAL.baseY + 10;
      if (hitsCrystal) {
        state.crystalIntegrity = Math.max(0, state.crystalIntegrity - ember.damage);
        state.combo = 0;
        state.leaks += 1;
        state.shake = Math.max(state.shake, 9);
        particles.spawnCrystalImpact(ember.x, CRYSTAL.baseY - CRYSTAL.height + 20, random);
        state.embers.splice(index, 1);
        events |= EVENT_CRYSTAL_HIT;
        continue;
      }

      if (ember.y - ember.radius > FIELD.height) state.embers.splice(index, 1);
    }

    for (let index = state.motes.length - 1; index >= 0; index -= 1) {
      const mote = state.motes[index];
      mote.y += mote.vy * dt;
      mote.x += mote.vx * dt + Math.sin(state.time * 1.7 + mote.pulsePhase) * 12 * dt;
      const distance = Math.hypot(mote.x - warden.x, mote.y - warden.y);
      if (distance < WARDEN.shieldRadius + mote.radius) {
        state.charge = Math.min(NOVA.maxCharge, state.charge + NOVA.moteValue);
        state.score += SCORE.moteGathered;
        state.gathered += 1;
        particles.spawnStarlightGlints(mote.x, mote.y, random);
        state.motes.splice(index, 1);
        events |= EVENT_GATHER;
      } else if (mote.y - mote.radius > FIELD.height) {
        state.motes.splice(index, 1);
      }
    }
    return events;
  }

  /** Run the wave clock: spawn during a wave, rest between waves, finish after the third. */
  function advanceWaves(dt, events) {
    if (state.betweenWavesTime > 0) {
      state.betweenWavesTime -= dt;
      if (state.betweenWavesTime <= 0 && !state.finished) {
        state.waveIndex += 1;
        state.waveTime = 0;
        state.waveBannerTime = 2.4;
        state.emberTimer = 0.6;
      }
      return events;
    }
    const wave = WAVES[state.waveIndex];
    state.waveTime += dt;
    state.emberTimer -= dt;
    if (state.emberTimer <= 0 && state.waveTime < wave.seconds) {
      spawnEmber(wave);
      state.emberTimer = wave.emberEvery * random.range(0.7, 1.3);
    }
    state.moteTimer -= dt;
    if (state.moteTimer <= 0) {
      spawnStarlightMote();
      state.moteTimer = wave.moteEvery * random.range(0.75, 1.3);
    }
    if (state.waveTime >= wave.seconds && state.embers.length === 0) {
      state.score += SCORE.waveCleared;
      events |= EVENT_WAVE_CLEAR;
      if (state.waveIndex >= WAVES.length - 1) {
        state.finished = true;
        state.victory = true;
        if (state.crystalIntegrity >= CRYSTAL.maxIntegrity) state.score += SCORE.crystalUntouchedBonus;
        events |= EVENT_VICTORY;
      } else {
        state.betweenWavesTime = 2.6;
      }
    }
    return events;
  }

  /**
   * Advance the whole world by dt. Control: { moveX, moveY, target|null, nova }.
   * In ambient mode (the title screen) embers drift decoratively and nothing can be hurt.
   */
  function stepWorld(dt, control, ambient = false) {
    let events = 0;
    state.time += dt;
    if (random.chance(dt * 1.4)) particles.spawnAmbientSpark(random, FIELD.width, FIELD.height);
    particles.updateParticles(dt);
    state.waveBannerTime = Math.max(0, state.waveBannerTime - dt);
    state.novaFlash = Math.max(0, state.novaFlash - dt);
    state.shake = Math.max(0, state.shake - dt * 26);

    if (ambient) {
      state.emberTimer -= dt;
      if (state.emberTimer <= 0) {
        spawnEmber(WAVES[0]);
        state.emberTimer = 1.1;
      }
      for (let index = state.embers.length - 1; index >= 0; index -= 1) {
        const ember = state.embers[index];
        ember.y += ember.vy * 0.55 * dt;
        ember.x += ember.vx * dt;
        if (ember.y - ember.radius > FIELD.height) state.embers.splice(index, 1);
      }
      state.warden.x = FIELD.width / 2 + Math.sin(state.time * 0.6) * 130;
      state.warden.y = WARDEN.startY + Math.sin(state.time * 1.1) * 18;
      return events;
    }

    if (state.finished) return events;
    moveWarden(dt, control);
    if (control.nova) events = tryNovaBurst(events);
    events = advanceFallingThings(dt, events);
    events = advanceWaves(dt, events);
    if (state.crystalIntegrity <= 0 && !state.finished) {
      state.finished = true;
      state.victory = false;
      state.shake = 14;
      particles.spawnCrystalImpact(CRYSTAL.x, CRYSTAL.baseY - CRYSTAL.height / 2, random);
      events |= EVENT_DEFEAT;
    }
    return events;
  }

  resetWorld();
  return { state, reset: resetWorld, step: stepWorld };
}
