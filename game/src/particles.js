// The particle pool: sparks, ember shards, starlight glints and shockwave rings, all kept in
// one pre-allocated array so bursts never allocate mid-frame. Particles are pure decoration —
// the world spawns them on events, the renderer draws them, nothing reads them back.

const MAX_PARTICLES = 900;

/** Create an empty particle field. */
export function createParticleField() {
  const particles = [];
  for (let index = 0; index < MAX_PARTICLES; index += 1) {
    particles.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', gravity: 0, ring: false });
  }
  let cursor = 0;

  function spawn(properties) {
    const particle = particles[cursor];
    cursor = (cursor + 1) % MAX_PARTICLES;
    Object.assign(particle, { alive: true, ring: false, gravity: 0 }, properties);
    particle.maxLife = particle.life;
  }

  return {
    particles,
    /** A burst of hot shards where an ember shattered against the shield. */
    spawnShatterBurst(x, y, color, random) {
      for (let index = 0; index < 16; index += 1) {
        const angle = random.next() * Math.PI * 2;
        const speed = random.range(60, 340);
        spawn({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60, life: random.range(0.3, 0.7), size: random.range(1.5, 4), color, gravity: 420 });
      }
    },
    /** Soft golden glints when the warden gathers a starlight mote. */
    spawnStarlightGlints(x, y, random) {
      for (let index = 0; index < 12; index += 1) {
        const angle = random.next() * Math.PI * 2;
        const speed = random.range(30, 150);
        spawn({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random.range(0.35, 0.8), size: random.range(1.5, 3.5), color: '#ffe9a3', gravity: -60 });
      }
    },
    /** A dark red-brown spray and a smoke puff where an ember struck the crystal. */
    spawnCrystalImpact(x, y, random) {
      for (let index = 0; index < 22; index += 1) {
        const angle = random.range(-Math.PI, 0);
        const speed = random.range(80, 380);
        spawn({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random.range(0.3, 0.8), size: random.range(2, 5), color: index % 3 ? '#ff7a29' : '#7df0ff', gravity: 500 });
      }
    },
    /** The expanding ring of a Nova Burst, plus a fountain of white sparks. */
    spawnNovaShockwave(x, y, random) {
      spawn({ x, y, vx: 0, vy: 0, life: 0.55, size: 10, color: '#c9b8ff', ring: true });
      for (let index = 0; index < 40; index += 1) {
        const angle = random.next() * Math.PI * 2;
        const speed = random.range(200, 620);
        spawn({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random.range(0.4, 0.9), size: random.range(2, 4.5), color: index % 2 ? '#ffe9a3' : '#8f7bff', gravity: 120 });
      }
    },
    /** One rising ambient spark, called occasionally so the night never sits still. */
    spawnAmbientSpark(random, fieldWidth, fieldHeight) {
      spawn({ x: random.range(0, fieldWidth), y: fieldHeight + 6, vx: random.range(-14, 14), vy: random.range(-46, -22), life: random.range(2.5, 5), size: random.range(1, 2.4), color: '#ff9a3e', gravity: -8 });
    },
    /** Advance every live particle by dt seconds. Rings grow instead of travelling. */
    updateParticles(dt) {
      for (const particle of particles) {
        if (!particle.alive) continue;
        particle.life -= dt;
        if (particle.life <= 0) {
          particle.alive = false;
          continue;
        }
        if (particle.ring) {
          particle.size += 1500 * dt;
        } else {
          particle.vy += particle.gravity * dt;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
        }
      }
    },
  };
}
