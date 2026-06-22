// One-off generator para sa maliliit na WAV sound effects.
// Patakbuhin: node scripts/generate-sounds.js
// Gumagawa ng PCM 16-bit mono WAV files sa assets/sounds/.

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

// Gumawa ng WAV buffer mula sa float samples (-1..1).
function toWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buffer;
}

// Isang tono na may attack/decay envelope (iwas "click").
function tone(freq, durationMs, { type = 'sine', gain = 0.5, attack = 0.005, release = 0.05 } = {}) {
  const n = Math.floor((durationMs / 1000) * SAMPLE_RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const phase = 2 * Math.PI * freq * t;
    let v;
    if (type === 'square') v = Math.sign(Math.sin(phase));
    else if (type === 'triangle') v = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else v = Math.sin(phase);
    // envelope
    const tt = i / n;
    const dur = durationMs / 1000;
    const a = Math.min(1, t / attack);
    const r = Math.min(1, (dur - t) / release);
    const env = Math.max(0, Math.min(a, r));
    out[i] = v * gain * env;
  }
  return out;
}

// Pagdugtong-dugtungin ang mga tono (sequence).
function seq(...parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

// Pagsamahin (mix) ang dalawang magkapatong na tono.
function mix(a, b) {
  const n = Math.max(a.length, b.length);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (a[i] || 0) + (b[i] || 0);
  return out;
}

const sounds = {
  // Add: mabilis na pataas na blip.
  add: seq(
    tone(660, 45, { type: 'triangle', gain: 0.45 }),
    tone(990, 55, { type: 'triangle', gain: 0.45 })
  ),
  // Minus: mabilis na pababa na blip.
  minus: seq(
    tone(440, 45, { type: 'triangle', gain: 0.4 }),
    tone(294, 60, { type: 'triangle', gain: 0.4 })
  ),
  // Reset: maikling "whoosh" / two-tone.
  reset: seq(
    tone(523, 50, { type: 'sine', gain: 0.4 }),
    tone(392, 70, { type: 'sine', gain: 0.4 })
  ),
  // Boost (+10): malakas na "charge up" — pataas na square-tone punch.
  boost: seq(
    tone(330, 45, { type: 'square', gain: 0.28 }),
    tone(494, 45, { type: 'square', gain: 0.28 }),
    tone(660, 55, { type: 'square', gain: 0.3 }),
    mix(
      tone(880, 200, { type: 'square', gain: 0.26, release: 0.16 }),
      tone(440, 200, { type: 'triangle', gain: 0.22, release: 0.16 })
    )
  ),
  // Level down: malungkot na pababang tono (rank down).
  leveldown: seq(
    tone(440, 90, { type: 'triangle', gain: 0.4 }),
    tone(349, 90, { type: 'triangle', gain: 0.4 }),
    tone(262, 200, { type: 'triangle', gain: 0.4, release: 0.16 })
  ),
  // SECRET (level 67 easter egg) — placeholder na chiptune jingle.
  // Palitan ang assets/sounds/secret67.wav ng totoong "6 7" meme clip.
  secret67: seq(
    tone(784, 110, { type: 'square', gain: 0.26 }), // G5
    tone(659, 110, { type: 'square', gain: 0.26 }), // E5
    tone(784, 110, { type: 'square', gain: 0.26 }), // G5
    tone(988, 150, { type: 'square', gain: 0.28 }), // B5
    mix(
      tone(1175, 280, { type: 'square', gain: 0.24, release: 0.18 }), // D6
      tone(784, 280, { type: 'triangle', gain: 0.2, release: 0.18 })
    )
  ),
  // NOTE: ang secret67b (follow-up) ay totoong mp3 na — tingnan ang
  // assets/sounds/secret67b.mp3. Hindi na ito ginagawa rito.
  // Level up: pataas na arpeggio na may chord sa dulo.
  levelup: seq(
    tone(523, 80, { type: 'triangle', gain: 0.4 }), // C5
    tone(659, 80, { type: 'triangle', gain: 0.4 }), // E5
    tone(784, 90, { type: 'triangle', gain: 0.4 }), // G5
    mix(
      tone(1047, 220, { type: 'triangle', gain: 0.35, release: 0.18 }), // C6
      tone(659, 220, { type: 'sine', gain: 0.25, release: 0.18 })
    )
  ),
};

const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  const file = path.join(outDir, `${name}.wav`);
  fs.writeFileSync(file, toWav(samples));
  console.log('wrote', file, (samples.length / SAMPLE_RATE).toFixed(2) + 's');
}
console.log('done');
