// Emberward's renderer: every pixel of the game on one canvas. It paints the night sky, the
// volcano, the crystal on its pedestal, the falling embers and starlight, the warden and its
// shield, the particle field, the HUD, and the title / pause / victory / defeat screens.
// It reads the world state and never changes it.

import { CRYSTAL, FIELD, NOVA, PALETTE, SCORE, WAVES, WARDEN } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Background stars, placed by a fixed hash so the sky is the same every frame and every run. */
const SKY_STARS = [];
for (let index = 0; index < 130; index += 1) {
  const a = Math.sin(index * 127.1) * 43758.5453;
  const b = Math.sin(index * 311.7) * 12543.1234;
  SKY_STARS.push({ x: (a - Math.floor(a)) * FIELD.width, y: (b - Math.floor(b)) * FIELD.height * 0.62, size: 0.8 + ((index * 7) % 10) / 6, twinkle: index * 0.7 });
}

/** Create the renderer bound to a canvas. draw(state, screen, best) paints one frame. */
export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, offsetX: 0, offsetY: 0, width: 0, height: 0 };

  /** Fit the logical field into the window, letterboxed, at the device's pixel ratio. */
  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    view.width = window.innerWidth;
    view.height = window.innerHeight;
    canvas.width = Math.round(view.width * ratio);
    canvas.height = Math.round(view.height * ratio);
    view.scale = Math.min(view.width / FIELD.width, view.height / FIELD.height);
    view.offsetX = (view.width - FIELD.width * view.scale) / 2;
    view.offsetY = (view.height - FIELD.height * view.scale) / 2;
    canvas.dataset.ratio = String(ratio);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  /** Convert a client (mouse) point into field coordinates, undoing the letterbox fit. */
  function clientToField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.offsetX) / view.scale,
      y: (clientY - rect.top - view.offsetY) / view.scale,
    };
  }

  function drawCenteredText(text, y, font, color, alpha = 1) {
    context.save();
    context.globalAlpha = alpha;
    context.font = font;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, FIELD.width / 2, y);
    context.restore();
  }

  /** The night sky, moon, volcano and far ridges — the still backdrop of every screen. */
  function drawBackdrop(state) {
    const sky = context.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, '#141031');
    sky.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const star of SKY_STARS) {
      const glow = 0.45 + 0.4 * Math.sin(state.time * 1.6 + star.twinkle);
      context.globalAlpha = Math.max(0.12, glow);
      context.fillStyle = '#dfe8ff';
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;

    // A pale moon, top right.
    context.save();
    context.shadowColor = '#cfd8ff';
    context.shadowBlur = 42;
    context.fillStyle = '#e8ecff';
    context.beginPath();
    context.arc(FIELD.width - 150, 104, 34, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = 'rgba(160,170,220,0.35)';
    context.beginPath();
    context.arc(FIELD.width - 162, 94, 7, 0, Math.PI * 2);
    context.arc(FIELD.width - 138, 116, 5, 0, Math.PI * 2);
    context.fill();

    // The volcano, far left, breathing a thin lava line — the source of the ember rain.
    context.fillStyle = '#0d0a1e';
    context.beginPath();
    context.moveTo(-40, FIELD.height - 90);
    context.lineTo(150, 300);
    context.lineTo(215, 205);
    context.lineTo(300, 300);
    context.lineTo(500, FIELD.height - 90);
    context.closePath();
    context.fill();
    const lavaGlow = 0.55 + 0.3 * Math.sin(state.time * 2.2);
    context.strokeStyle = `rgba(255,110,40,${lavaGlow.toFixed(3)})`;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(215, 212);
    context.quadraticCurveTo(234, 292, 228, 378);
    context.stroke();

    // Far ridge across the back.
    context.fillStyle = '#100b26';
    context.beginPath();
    context.moveTo(0, FIELD.height - 90);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, FIELD.height - 150 - Math.abs(Math.sin(x * 0.011)) * 74);
    }
    context.lineTo(FIELD.width, FIELD.height - 90);
    context.closePath();
    context.fill();

    // The ground.
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, CRYSTAL.baseY + 12, FIELD.width, FIELD.height - CRYSTAL.baseY);
    context.fillStyle = 'rgba(125,240,255,0.07)';
    context.fillRect(0, CRYSTAL.baseY + 12, FIELD.width, 2);
  }

  /** The pedestal and the great crystal itself, glowing harder while its integrity holds. */
  function drawCrystal(state) {
    const { x, baseY, width, height } = CRYSTAL;
    context.fillStyle = '#241a45';
    context.beginPath();
    context.moveTo(x - width * 0.95, baseY + 12);
    context.lineTo(x - width * 0.62, baseY - 16);
    context.lineTo(x + width * 0.62, baseY - 16);
    context.lineTo(x + width * 0.95, baseY + 12);
    context.closePath();
    context.fill();

    const integrityRatio = state.crystalIntegrity / CRYSTAL.maxIntegrity;
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 2.6);
    context.save();
    context.shadowColor = PALETTE.crystal;
    context.shadowBlur = 46 * integrityRatio * pulse + 6;
    const body = context.createLinearGradient(x, baseY - height, x, baseY);
    body.addColorStop(0, '#d8fbff');
    body.addColorStop(0.45, PALETTE.crystal);
    body.addColorStop(1, PALETTE.crystalDeep);
    context.fillStyle = body;
    context.globalAlpha = 0.35 + 0.65 * integrityRatio;
    context.beginPath();
    context.moveTo(x, baseY - height);
    context.lineTo(x + width * 0.42, baseY - height * 0.52);
    context.lineTo(x + width * 0.3, baseY - 12);
    context.lineTo(x - width * 0.3, baseY - 12);
    context.lineTo(x - width * 0.42, baseY - height * 0.52);
    context.closePath();
    context.fill();
    // Facet lines.
    context.globalAlpha = 0.5;
    context.strokeStyle = '#eafdff';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(x, baseY - height);
    context.lineTo(x, baseY - 12);
    context.moveTo(x - width * 0.42, baseY - height * 0.52);
    context.lineTo(x + width * 0.42, baseY - height * 0.52);
    context.stroke();
    context.restore();

    // Cracks appear as the crystal suffers.
    if (integrityRatio < 0.72) {
      context.strokeStyle = 'rgba(10,16,40,0.75)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x - 8, baseY - height + 26);
      context.lineTo(x + 4, baseY - height + 52);
      context.lineTo(x - 6, baseY - height + 76);
      if (integrityRatio < 0.4) {
        context.moveTo(x + 16, baseY - height + 40);
        context.lineTo(x + 4, baseY - height + 66);
        context.lineTo(x + 18, baseY - height + 92);
      }
      context.stroke();
    }
  }

  /** One falling ember: a flickering teardrop of flame; magma is larger and crack-veined. */
  function drawEmber(ember, state) {
    const flicker = 1 + Math.sin(state.time * 18 + ember.wobblePhase) * 0.13;
    const radius = ember.radius * flicker;
    context.save();
    context.translate(ember.x, ember.y);
    context.shadowColor = ember.kind === 'magma' ? PALETTE.magma : PALETTE.ember;
    context.shadowBlur = 22;
    const flame = context.createRadialGradient(0, 0, 1, 0, 0, radius * 1.5);
    flame.addColorStop(0, PALETTE.emberCore);
    flame.addColorStop(0.45, ember.kind === 'magma' ? '#ff5a26' : PALETTE.ember);
    flame.addColorStop(1, 'rgba(190,40,10,0.05)');
    context.fillStyle = flame;
    context.beginPath();
    context.moveTo(0, -radius * 1.65);
    context.quadraticCurveTo(radius * 1.05, -radius * 0.2, radius * 0.82, radius * 0.45);
    context.quadraticCurveTo(radius * 0.6, radius * 1.05, 0, radius * 1.05);
    context.quadraticCurveTo(-radius * 0.6, radius * 1.05, -radius * 0.82, radius * 0.45);
    context.quadraticCurveTo(-radius * 1.05, -radius * 0.2, 0, -radius * 1.65);
    context.fill();
    if (ember.kind === 'magma') {
      context.strokeStyle = ember.hitsLeft < EMBER_MAX_HITS(ember) ? '#ffe9a3' : 'rgba(60,8,4,0.8)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-radius * 0.4, -radius * 0.4);
      context.lineTo(0, radius * 0.1);
      context.lineTo(radius * 0.35, radius * 0.55);
      context.stroke();
    }
    context.restore();
  }

  function EMBER_MAX_HITS(ember) {
    return ember.kind === 'magma' ? 2 : 1;
  }

  /** One starlight mote: a slowly turning four-point sparkle. */
  function drawStarlightMote(mote, state) {
    const twinkle = 0.8 + 0.3 * Math.sin(state.time * 4 + mote.pulsePhase);
    context.save();
    context.translate(mote.x, mote.y);
    context.rotate(Math.sin(state.time * 1.4 + mote.pulsePhase) * 0.5);
    context.shadowColor = PALETTE.starlight;
    context.shadowBlur = 18;
    context.fillStyle = PALETTE.starlight;
    const r = mote.radius * twinkle;
    context.beginPath();
    context.moveTo(0, -r);
    context.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
    context.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
    context.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
    context.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
    context.fill();
    context.restore();
  }

  /** The warden: a small hooded guardian with a glowing core, ringed by its shield. */
  function drawWarden(state) {
    const warden = state.warden;
    const bob = Math.sin(state.time * 3.1) * 4;
    context.save();
    context.translate(warden.x, warden.y + bob);
    // The shield ring brightens for a moment whenever it shatters something.
    const flash = warden.shieldFlash;
    context.save();
    context.globalAlpha = 0.35 + flash * 0.55;
    context.strokeStyle = PALETTE.shield;
    context.lineWidth = 3 + flash * 3;
    context.shadowColor = PALETTE.shield;
    context.shadowBlur = 16 + flash * 26;
    context.beginPath();
    context.arc(0, 0, WARDEN.shieldRadius, state.time * 0.9, state.time * 0.9 + Math.PI * 1.55);
    context.stroke();
    context.beginPath();
    context.arc(0, 0, WARDEN.shieldRadius, state.time * 0.9 + Math.PI, state.time * 0.9 + Math.PI * 1.35);
    context.stroke();
    context.restore();
    // Cloak.
    const tilt = Math.max(-0.28, Math.min(0.28, warden.vx * 0.0006));
    context.rotate(tilt);
    context.fillStyle = '#4b348f';
    context.beginPath();
    context.moveTo(0, -WARDEN.radius - 6);
    context.quadraticCurveTo(WARDEN.radius + 6, WARDEN.radius * 0.4, WARDEN.radius * 0.72, WARDEN.radius + 12);
    context.quadraticCurveTo(0, WARDEN.radius + 4, -WARDEN.radius * 0.72, WARDEN.radius + 12);
    context.quadraticCurveTo(-WARDEN.radius - 6, WARDEN.radius * 0.4, 0, -WARDEN.radius - 6);
    context.fill();
    // Hood and face.
    context.fillStyle = '#2c1c5e';
    context.beginPath();
    context.arc(0, -8, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.starlight;
    context.beginPath();
    context.arc(-5, -8, 2.4, 0, Math.PI * 2);
    context.arc(5, -8, 2.4, 0, Math.PI * 2);
    context.fill();
    // The warden's heart-light.
    context.save();
    context.shadowColor = PALETTE.crystal;
    context.shadowBlur = 14;
    context.fillStyle = PALETTE.crystal;
    context.beginPath();
    context.arc(0, 8, 4.6, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.restore();
  }

  /** Sparks, shards and rings from the particle field. */
  function drawParticles(state) {
    for (const particle of state.particles.particles) {
      if (!particle.alive) continue;
      const alpha = Math.max(0, particle.life / particle.maxLife);
      context.save();
      context.globalAlpha = particle.ring ? alpha * 0.8 : alpha;
      context.fillStyle = particle.color;
      context.strokeStyle = particle.color;
      if (particle.ring) {
        context.lineWidth = 5;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.stroke();
      } else {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
  }

  /** A labelled meter: the crystal's integrity and the nova charge share this shape. */
  function drawMeter(x, y, width, ratio, fillColor, label, glow) {
    context.save();
    context.font = '600 13px system-ui, sans-serif';
    context.fillStyle = PALETTE.dimText;
    context.textAlign = 'left';
    context.fillText(label, x, y - 8);
    context.fillStyle = 'rgba(255,255,255,0.13)';
    context.fillRect(x, y, width, 13);
    if (glow) {
      context.shadowColor = fillColor;
      context.shadowBlur = 16;
    }
    context.fillStyle = fillColor;
    context.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), 13);
    context.restore();
  }

  /** The in-play HUD: score, wave, best, combo, and the two meters. */
  function drawHeadsUpDisplay(state, best) {
    context.save();
    context.textBaseline = 'alphabetic';
    context.fillStyle = PALETTE.text;
    context.font = '700 30px system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillText(String(state.score), 26, 44);
    context.font = '600 13px system-ui, sans-serif';
    context.fillStyle = PALETTE.dimText;
    context.fillText('SCORE', 27, 64);

    const wave = WAVES[state.waveIndex];
    context.textAlign = 'center';
    context.fillStyle = PALETTE.text;
    context.font = '700 21px system-ui, sans-serif';
    context.fillText(state.betweenWavesTime > 0 ? 'WAVE CLEARED' : `WAVE ${state.waveIndex + 1} OF ${WAVES.length} — ${wave.name.toUpperCase()}`, FIELD.width / 2, 40);
    // Wave progress pips.
    for (let index = 0; index < WAVES.length; index += 1) {
      context.fillStyle = index < state.waveIndex ? PALETTE.crystal : index === state.waveIndex ? PALETTE.ember : 'rgba(255,255,255,0.2)';
      context.beginPath();
      context.arc(FIELD.width / 2 - 26 + index * 26, 60, 6, 0, Math.PI * 2);
      context.fill();
    }

    context.textAlign = 'right';
    context.fillStyle = PALETTE.text;
    context.font = '700 30px system-ui, sans-serif';
    context.fillText(String(Math.max(best, state.score)), FIELD.width - 26, 44);
    context.font = '600 13px system-ui, sans-serif';
    context.fillStyle = PALETTE.dimText;
    context.fillText('BEST', FIELD.width - 27, 64);

    if (state.combo >= 3) {
      const multiplier = (1 + Math.min(state.combo, 40) * 0.1).toFixed(1);
      context.textAlign = 'center';
      context.fillStyle = PALETTE.starlight;
      context.font = '800 24px system-ui, sans-serif';
      context.fillText(`COMBO ${state.combo}  ×${multiplier}`, FIELD.width / 2, 102);
    }

    drawMeter(26, FIELD.height - 34, 300, state.crystalIntegrity / CRYSTAL.maxIntegrity, state.crystalIntegrity > 34 ? PALETTE.crystal : '#ff5340', 'CRYSTAL INTEGRITY', false);
    const novaReady = state.charge >= NOVA.maxCharge;
    drawMeter(FIELD.width - 326, FIELD.height - 34, 300, state.charge / NOVA.maxCharge, novaReady ? PALETTE.starlight : PALETTE.shield, novaReady ? 'NOVA READY — SPACE / CLICK!' : 'STARLIGHT CHARGE', novaReady);
    context.restore();
  }

  /** The wave banner that sweeps in as each wave begins. */
  function drawWaveBanner(state) {
    if (state.waveBannerTime <= 0 || state.finished) return;
    const wave = WAVES[state.waveIndex];
    const alpha = Math.min(1, state.waveBannerTime / 0.8);
    drawCenteredText(`WAVE ${state.waveIndex + 1}`, 268, '800 54px system-ui, sans-serif', PALETTE.text, alpha);
    drawCenteredText(wave.name, 316, '600 26px system-ui, sans-serif', PALETTE.starlight, alpha);
  }

  /** The title screen: the game's name, its promise, how to play, and the invitation. */
  function drawTitleScreen(state, best) {
    drawCenteredText('EMBERWARD', 148, '900 96px system-ui, sans-serif', PALETTE.text);
    drawCenteredText('Guard the Last Crystal', 208, '600 30px system-ui, sans-serif', PALETTE.crystal);
    drawCenteredText('Embers rain from the volcano. Your shield is the crystal’s only wall.', 300, '400 21px system-ui, sans-serif', PALETTE.dimText);
    drawCenteredText('Move — Mouse or Arrow Keys / WASD        Shatter embers with your shield', 356, '400 19px system-ui, sans-serif', PALETTE.text);
    drawCenteredText('Gather starlight, then SPACE / Click — Nova Burst        P — Pause', 388, '400 19px system-ui, sans-serif', PALETTE.text);
    drawCenteredText('Survive all 3 waves. If the crystal’s integrity reaches zero, the light goes out.', 420, '400 19px system-ui, sans-serif', PALETTE.text);
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3.4);
    drawCenteredText('CLICK OR PRESS ENTER TO BEGIN', 486, '800 26px system-ui, sans-serif', PALETTE.starlight, pulse);
    if (best > 0) drawCenteredText(`Best score ${best}`, 532, '600 18px system-ui, sans-serif', PALETTE.dimText);
  }

  /** The end screen, won or lost, with the run's whole story and the way back in. */
  function drawEndScreen(state, best) {
    context.save();
    context.fillStyle = 'rgba(5,4,16,0.62)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.restore();
    if (state.victory) {
      drawCenteredText('THE CRYSTAL SHINES', 170, '900 64px system-ui, sans-serif', PALETTE.crystal);
      drawCenteredText('All three waves broken against your shield. Dawn comes, and the light remains.', 224, '400 21px system-ui, sans-serif', PALETTE.text);
    } else {
      drawCenteredText('THE CRYSTAL SHATTERED', 170, '900 60px system-ui, sans-serif', '#ff6a4d');
      drawCenteredText('The last light went out under the ember rain — but a warden always rises again.', 224, '400 21px system-ui, sans-serif', PALETTE.text);
    }
    const lines = [
      `Final score  ${state.score}`,
      `Embers shattered  ${state.shattered}      Starlight gathered  ${state.gathered}`,
      `Best combo  ${state.bestCombo}      Crystal integrity  ${Math.round(state.crystalIntegrity)}%`,
      `Best score  ${Math.max(best, state.score)}`,
    ];
    lines.forEach((line, index) => {
      drawCenteredText(line, 292 + index * 42, index === 0 ? '800 30px system-ui, sans-serif' : '400 21px system-ui, sans-serif', index === 0 ? PALETTE.starlight : PALETTE.text);
    });
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3.4);
    drawCenteredText('CLICK OR PRESS ENTER TO PLAY AGAIN', 508, '800 24px system-ui, sans-serif', PALETTE.starlight, pulse);
  }

  /** Paint one frame of the named screen over the world state. */
  function drawFrame(state, screen, best) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#05040e';
    context.fillRect(0, 0, view.width, view.height);
    context.translate(view.offsetX, view.offsetY);
    context.scale(view.scale, view.scale);
    if (state.shake > 0.2) {
      context.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    drawBackdrop(state);
    drawCrystal(state);
    for (const mote of state.motes) drawStarlightMote(mote, state);
    for (const ember of state.embers) drawEmber(ember, state);
    drawParticles(state);
    drawWarden(state);

    if (state.novaFlash > 0) {
      context.fillStyle = `rgba(201,184,255,${(state.novaFlash * 0.55).toFixed(3)})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }

    if (screen === SCREEN_TITLE) {
      drawTitleScreen(state, best);
    } else {
      drawHeadsUpDisplay(state, best);
      drawWaveBanner(state);
      if (screen === SCREEN_PAUSED) {
        context.fillStyle = 'rgba(5,4,16,0.55)';
        context.fillRect(0, 0, FIELD.width, FIELD.height);
        drawCenteredText('PAUSED', 330, '900 58px system-ui, sans-serif', PALETTE.text);
        drawCenteredText('Press P or Enter to resume', 384, '400 21px system-ui, sans-serif', PALETTE.dimText);
      } else if (screen === SCREEN_OVER) {
        drawEndScreen(state, best);
      }
    }
  }

  return { draw: drawFrame, clientToField };
}
