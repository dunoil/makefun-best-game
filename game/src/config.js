// Emberward's tuning in one place: the field, the crystal the player guards, the warden who
// guards it, the three ember waves, and the scoring rules. Everything else reads from here.

/** The logical play field; the renderer scales it to whatever window it is given. */
export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step, in seconds: the world always advances in these slices. */
export const STEP = 1 / 60;

/** The crystal stands on its pedestal at the bottom centre of the field. */
export const CRYSTAL = {
  x: FIELD.width / 2,
  baseY: FIELD.height - 46,
  width: 104,
  height: 118,
  maxIntegrity: 100,
};

/** The warden: a flying guardian whose round shield shatters embers on contact. */
export const WARDEN = {
  radius: 26,
  shieldRadius: 46,
  speed: 660,
  startX: FIELD.width / 2,
  startY: FIELD.height - 260,
};

/** Starlight charge needed for one Nova Burst, and what one mote is worth. */
export const NOVA = { maxCharge: 100, moteValue: 25, radius: 9999 };

/** Scoring: a shattered ember, the combo ladder, and the wave-clear bonus. */
export const SCORE = {
  emberShattered: 10,
  moteGathered: 15,
  waveCleared: 250,
  crystalUntouchedBonus: 500,
};

/**
 * The three waves. Each names how long it lasts, how often embers and starlight fall,
 * how fast embers travel, and the mix of ember kinds (cinder, zigzagging spark, heavy magma).
 */
export const WAVES = [
  { name: 'First Embers', seconds: 26, emberEvery: 0.92, moteEvery: 3.4, fallSpeed: 215, cinder: 0.78, spark: 0.22, magma: 0.0 },
  { name: 'The Ashen Rain', seconds: 30, emberEvery: 0.66, moteEvery: 3.0, fallSpeed: 275, cinder: 0.58, spark: 0.28, magma: 0.14 },
  { name: 'Heart of the Volcano', seconds: 34, emberEvery: 0.48, moteEvery: 2.7, fallSpeed: 340, cinder: 0.44, spark: 0.32, magma: 0.24 },
];

/** Ember kinds: size, toughness (shield hits to shatter), and the damage a leak deals the crystal. */
export const EMBER_KINDS = {
  cinder: { radius: 13, hits: 1, damage: 7, score: 1.0 },
  spark: { radius: 10, hits: 1, damage: 5, score: 1.5 },
  magma: { radius: 22, hits: 2, damage: 14, score: 2.5 },
};

/** localStorage key for the best score. */
export const BEST_KEY = 'emberward-best-score';

/** The palette the renderer paints with, named so the whole game shares one night sky. */
export const PALETTE = {
  skyTop: '#070812',
  skyBottom: '#1b1035',
  starlight: '#ffe9a3',
  crystal: '#7df0ff',
  crystalDeep: '#2b9fd8',
  ember: '#ff7a29',
  emberCore: '#ffd23e',
  magma: '#e83a1d',
  warden: '#c9b8ff',
  shield: '#8f7bff',
  ground: '#120d24',
  text: '#f4efff',
  dimText: '#a99fd6',
};
