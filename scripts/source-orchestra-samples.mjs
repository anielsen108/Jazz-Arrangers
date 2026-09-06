// Fetch only the pitches used by the original studies. No remote scripts execute.
import { mkdir, writeFile } from 'node:fs/promises';
import { TREATMENTS, midi } from '../src/lib/orchestration.ts';
const source = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/';
const wanted = new Map();
for (const treatment of TREATMENTS) for (const part of treatment.parts) {
  if (!wanted.has(part.instrument)) wanted.set(part.instrument, new Set());
  for (const note of part.notes) wanted.get(part.instrument).add(midi(note.pitch));
}
await mkdir('public/audio/orchestra', { recursive: true });
let size = 0;
// Modest concurrency avoids holding all full instrument banks in memory at once.
const queue = [...wanted];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const [instrument, pitches] = queue.shift();
    const response = await fetch(`${source}${instrument}-mp3.js`, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${instrument}: ${response.status}`);
    const text = await response.text();
    const start = text.indexOf('{', text.indexOf(`MIDI.Soundfont.${instrument} =`));
    const end = text.lastIndexOf('}');
    const samples = JSON.parse(text.slice(start, end + 1).replace(/,\s*}$/, '}'));
    const selected = Object.fromEntries(Object.entries(samples).filter(([pitch]) => pitches.has(midi(pitch))).map(([pitch, data]) => [midi(pitch), data]));
    if (Object.keys(selected).length !== pitches.size) throw new Error(`Missing samples: ${instrument}`);
    const json = JSON.stringify(selected);
    await writeFile(`public/audio/orchestra/${instrument}.json`, json);
    size += json.length;
    console.log(`${instrument}: ${pitches.size} pitches, ${Math.round(json.length / 1024)} KB`);
  }
}));
console.log(`Total: ${(size / 1024 / 1024).toFixed(2)} MB`);
