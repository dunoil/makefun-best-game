// Synthesized sound effects with the Web Audio API: no audio files, every sound is an
// oscillator shaped by hand. The board stays silent until the player first interacts
// (browsers require a gesture before audio may start), and every call is safe before that.

/** Create the sound board. Each play* method voices one game event. */
export function createSoundBoard() {
  let context = null;
  let master = null;

  /** Start (or resume) the audio context from a user gesture. Safe to call often. */
  function unlock() {
    if (context === null) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      context = new AudioCtor();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
  }

  /** One enveloped tone: frequency glides from `from` to `to` over `seconds`. */
  function playTone(from, to, seconds, type, volume) {
    if (context === null || master === null) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(to, 1), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + seconds + 0.02);
  }

  /** A short burst of filtered noise, for shattering embers and crystal hits. */
  function playNoiseBurst(seconds, volume, frequency) {
    if (context === null || master === null) return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    source.connect(filter).connect(gain).connect(master);
    source.start(now);
  }

  return {
    unlock,
    playShatter() {
      playNoiseBurst(0.12, 0.7, 2400);
      playTone(880, 220, 0.1, 'triangle', 0.35);
    },
    playMagmaCrack() {
      playNoiseBurst(0.16, 0.8, 1200);
      playTone(320, 90, 0.16, 'sawtooth', 0.3);
    },
    playGatherStarlight() {
      playTone(1240, 1980, 0.14, 'sine', 0.4);
      playTone(1860, 2480, 0.18, 'sine', 0.2);
    },
    playCrystalHit() {
      playNoiseBurst(0.25, 0.9, 700);
      playTone(196, 49, 0.3, 'square', 0.35);
    },
    playNovaBurst() {
      playNoiseBurst(0.5, 1.0, 3600);
      playTone(160, 1440, 0.45, 'sawtooth', 0.3);
      playTone(2400, 300, 0.5, 'sine', 0.25);
    },
    playWaveHorn() {
      playTone(392, 392, 0.16, 'triangle', 0.4);
      playTone(587, 587, 0.22, 'triangle', 0.4);
    },
    playVictoryChime() {
      playTone(523, 523, 0.16, 'sine', 0.4);
      playTone(659, 659, 0.16, 'sine', 0.4);
      playTone(784, 784, 0.3, 'sine', 0.45);
    },
    playShatteredCrystal() {
      playNoiseBurst(0.7, 1.0, 900);
      playTone(740, 55, 0.8, 'triangle', 0.4);
    },
  };
}
