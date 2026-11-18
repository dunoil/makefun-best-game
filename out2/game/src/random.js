// A small seeded random generator (mulberry32). A fixed seed makes a fixed ember pattern,
// which is what lets the screenshot scenes replay exactly, while a random seed keeps real
// games fresh.

/**
 * Create a generator from a 32-bit seed. Returns an object with next() in [0, 1),
 * range(min, max) for floats, and pick(weights) for choosing an index by weight.
 */
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    chance(probability) {
      return next() < probability;
    },
    pickIndex(weights) {
      let roll = next();
      for (let index = 0; index < weights.length; index += 1) {
        roll -= weights[index];
        if (roll <= 0) return index;
      }
      return weights.length - 1;
    },
  };
}
