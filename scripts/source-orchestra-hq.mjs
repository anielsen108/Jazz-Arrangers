// Curate recorded, redistributable multisamples. No upstream code is executed.
// Requires Node 22.18+ and FFmpeg (--ffmpeg=path, FFMPEG_PATH, or the ignored tooling install).
import { mkdir, readFile, writeFile, copyFile, access, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve, posix } from 'node:path';
import { TREATMENTS, midi } from '../src/lib/orchestration.ts';

const sources = {
  vsco: { repo: 'sgossner/VSCO-2-CE', ref: '440300901dfe9275fd84e0b7763af1f8443ae62e', maps: '6dd651d55dde97fd4028699be9d4481f26917891', name: 'VSCO 2 Community Edition', license: 'CC0-1.0' },
  sax: { repo: 'sfzinstruments/MTG.SoloSax', ref: 'b494d256549b3d088fdec176ce82867f8a1f58b2', name: 'MTG Solo Saxophones', license: 'CC-BY-4.0' },
  bass: { repo: 'sfzinstruments/karoryfer.meatbass', ref: 'ac9e859564bda286ab5ec672d00ff1aa2fef2895', name: 'Karoryfer Meatbass', license: 'CC0-1.0' },
};
const plans = {
  soprano_sax: { source: 'sax', sax: 'sop' }, alto_sax: { source: 'sax', sax: 'alt' },
  tenor_sax: { source: 'sax', sax: 'ten' }, baritone_sax: { source: 'sax', sax: 'bar' },
  acoustic_bass: { source: 'bass', maps: ['Programs/pizz_basic_map.sfz'], decay: true },
  trumpet: { maps: ['TrumpetSus.sfz'] }, muted_trumpet: { maps: ['TrumpetHarmonMuteSus.sfz'] },
  trombone: { maps: ['TromboneSus.sfz'] }, french_horn: { maps: ['FHornSus.sfz'] }, tuba: { maps: ['TubaSus.sfz'] },
  flute: { maps: ['FluteSusNV.sfz'] }, clarinet: { maps: ['ClarinetSus.sfz'] }, bassoon: { maps: ['BassoonSus.sfz'] },
  string_ensemble_1: { maps: ['CelloEnsSusVib.sfz', 'ViolaEnsSusVib.sfz', 'ViolinEnsSusVib.sfz'], sections: true, stereo: true },
  violin: { maps: ['SViolinVib.sfz'], stereo: true }, orchestral_harp: { maps: ['Harp.sfz'], decay: true, stereo: true },
  acoustic_grand_piano: { maps: ['UprightPiano.sfz'], decay: true, stereo: true }, marimba: { maps: ['Marimba.sfz'], decay: true },
};
const args = process.argv.slice(2);
const only = args.find((arg) => arg.startsWith('--only='))?.slice(7).split(',');
const dryRun = args.includes('--dry-run');
const install = args.includes('--write');
const cache = 'output/tooling/sample-sources/cache';
const output = 'output/tooling/hq-banks';
const ffmpeg = args.find((arg) => arg.startsWith('--ffmpeg='))?.slice(9) ?? process.env.FFMPEG_PATH ?? resolve('output/tooling/node_modules/ffmpeg-static/ffmpeg.exe');
await mkdir(cache, { recursive: true });
await mkdir(output, { recursive: true });
const hash = (value) => createHash('sha256').update(value).digest('hex');

async function download(source, path, mapping = false) {
  const ref = mapping ? source.maps ?? source.ref : source.ref;
  const url = `https://raw.githubusercontent.com/${source.repo}/${ref}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const filename = `${cache}/${hash(url)}${posix.extname(path)}`;
  try {
    const bytes = await readFile(filename);
    if (!bytes.length || (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.length < bytes.readUInt32LE(4) + 8)) throw Error('Incomplete cached download');
    return { bytes, filename };
  } catch { /* Fetch once, or recover an interrupted download. */ }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw Error(`${response.status} ${url}`);
      let bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.subarray(0, 80).toString().startsWith('version https://git-lfs.github.com')) {
        response = await fetch(url.replace('raw.githubusercontent.com', 'media.githubusercontent.com/media'), { signal: AbortSignal.timeout(60000) });
        if (!response.ok) throw Error(`${response.status} LFS ${url}`);
        bytes = Buffer.from(await response.arrayBuffer());
      }
      if (!bytes.length) throw Error(`Empty download: ${url}`);
      const temporary = `${filename}.${randomUUID()}.tmp`;
      await writeFile(temporary, bytes);
      await rename(temporary, filename);
      return { bytes, filename };
    } catch (error) { if (attempt === 2) throw error; }
  }
}

// Only the pitch/velocity region subset needed by these pinned mappings is read.
function regions(text) {
  const result = [];
  let global = {}, group = {}, base = '';
  for (const match of text.replace(/\/\/[^\n]*/g, '').matchAll(/<(control|global|group|region)>([\s\S]*?)(?=<|$)/g)) {
    const data = Object.fromEntries([...match[2].matchAll(/([a-z_0-9]+)=([^=]*?)(?=\s+[a-z_0-9]+=|$)/g)].map((m) => [m[1], m[2].trim()]));
    if (match[1] === 'control') { base = data.default_path?.replaceAll('\\', '/') ?? ''; continue; }
    if (match[1] === 'global') { global = data; group = {}; continue; }
    if (match[1] === 'group') { group = data; continue; }
    const values = { ...global, ...group, ...data };
    if (!values.sample) continue;
    result.push({ file: base + values.sample.replaceAll('\\', '/'), root: Number(values.pitch_keycenter ?? values.key), low: Number(values.lokey ?? values.key ?? 0), high: Number(values.hikey ?? values.key ?? 127), lowVelocity: Number(values.lovel ?? 0), highVelocity: Number(values.hivel ?? 127), tune: Number(values.tune ?? 0), rr: Number(values.seq_position ?? 1) });
  }
  return result;
}

function run(args, input) {
  return new Promise((accept, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-threads', '1', ...args], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const output = [], errors = [];
    child.stdout.on('data', (chunk) => output.push(chunk));
    child.stderr.on('data', (chunk) => errors.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? accept(Buffer.concat(output)) : reject(Error(Buffer.concat(errors).toString())));
    child.stdin.on('error', (error) => { if (error.code !== 'EPIPE') reject(error); });
    child.stdin.end(input);
  });
}

async function convert(source, region, plan) {
  let raw;
  if (region.legacy) {
    const baseline = { repo: 'anielsen108/Jazz-Arrangers', ref: '62e31536d8072cf09aacd82cfa2f2e06c3851e26' };
    const bank = JSON.parse((await download(baseline, `public/audio/orchestra/${region.legacy}.json`)).bytes);
    const bytes = Buffer.from(bank[region.root].split(',')[1], 'base64');
    const filename = `${cache}/${hash(bytes)}.mp3`;
    await writeFile(filename, bytes);
    raw = { bytes, filename };
  } else raw = await download(source, region.file);
  const channels = plan.stereo ? 2 : 1;
  const rate = 44100;
  const decoded = await run(['-i', raw.filename, '-t', '9', '-ar', String(rate), '-ac', String(channels), '-f', 'f32le', 'pipe:1']);
  const floats = new Float32Array(decoded.buffer, decoded.byteOffset, decoded.byteLength / 4);
  const frames = floats.length / channels;
  let peak = 0;
  for (const value of floats) peak = Math.max(peak, Math.abs(value));
  if (peak < 0.0001) throw Error(`Silent recording: ${region.file}`);
  // Remove only leading silence; keep 4 ms ahead of the first audible attack.
  let onset = 0;
  const threshold = Math.max(0.00012, peak * 0.008);
  while (onset < frames && Math.max(...floats.subarray(onset * channels, (onset + 1) * channels).map(Math.abs)) < threshold) onset++;
  onset = Math.max(0, onset - Math.round(rate * 0.004));
  const duration = Math.min(plan.decay ? 5 : 3.6, (frames - onset) / rate);
  const data = floats.slice(onset * channels, (onset + Math.floor(duration * rate)) * channels);
  let sum = 0, measured = 0, max = 0;
  for (let i = 0; i < data.length; i++) {
    max = Math.max(max, Math.abs(data[i]));
    if (i < rate * channels * 1.2) { sum += data[i] * data[i]; measured++; }
  }
  const rms = Math.sqrt(sum / measured);
  const gain = Math.min(0.72 / max, (plan.decay ? 0.105 : 0.125) / Math.max(rms, 0.001), 20);
  for (let i = 0; i < data.length; i++) data[i] *= gain;
  let loop;
  if (!plan.decay && duration >= 0.8) {
    const first = Math.floor(Math.min(0.65, duration * 0.25) * rate);
    const last = Math.floor(Math.min(2.8, duration * 0.78) * rate);
    const blend = Math.min(Math.floor(rate * 0.07), Math.floor((last - first) / 3));
    for (let i = 0; i < blend; i++) for (let c = 0; c < channels; c++) {
      const weight = i / blend;
      data[(last - blend + i) * channels + c] = data[(last - blend + i) * channels + c] * (1 - weight) + data[(first + i) * channels + c] * weight;
    }
    loop = [(first + blend) / rate, last / rate];
  }
  // Seekable output includes MP3 gapless metadata, preserving attack and loop timing.
  const encodedPath = `${cache}/${hash(region.file)}-encoded.mp3`;
  await run(['-f', 'f32le', '-ar', String(rate), '-ac', String(channels), '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', channels === 2 ? '128k' : '96k', '-y', encodedPath], Buffer.from(data.buffer));
  const encoded = await readFile(encodedPath);
  return { root: region.root, tune: region.tune, audio: `data:audio/mp3;base64,${encoded.toString('base64')}`, ...(loop ? { loop } : {}), file: region.file, sha256: hash(raw.bytes), source: region.legacy ? 'FluidR3 GM' : source.name };
}

let total = 0;
for (const [instrument, plan] of Object.entries(plans)) {
  if (only && !only.includes(instrument)) continue;
  const source = sources[plan.source ?? 'vsco'];
  const pitches = [...new Set(TREATMENTS.flatMap((t) => t.parts.filter((p) => p.instrument === instrument).flatMap((p) => p.notes.map((n) => midi(n.pitch)))))].sort((a, b) => a - b);
  const layerNames = plan.sax === 'bar' ? ['p', 'm', 'f'] : ['p', 'f'];
  let maps = [];
  if (plan.sax) {
    for (const layer of layerNames) {
      const file = `MTG Solo Saxophones/Data/${plan.sax}_${layer}_rr1.txt`;
      maps.push(regions((await download(source, file)).bytes.toString()).map((region) => ({ ...region, file: 'MTG Solo Saxophones/Samples/' + region.file.replace('$EXT', 'flac') })));
    }
  } else {
    for (const file of plan.maps) {
      const text = (await download(source, file, true)).bytes.toString();
      maps.push(regions(text).filter((region) => region.rr === 1 && (!plan.decay || !/_rr[234]\.wav$/i.test(region.file))).map((region) => ({ ...region, file: plan.source === 'bass' ? posix.normalize('Programs/' + region.file) : region.file })));
    }
  }
  const bank = { version: 2, source: source.name, license: source.license, upstream: `https://github.com/${source.repo}/tree/${source.ref}`, dynamics: layerNames.length === 3 ? [0.6, 0.8, 1] : [0.72, 1], sustained: !plan.decay, samples: {}, pitches: {} };
  const selected = new Map();
  for (const pitch of pitches) {
    bank.pitches[pitch] = [];
    for (let layer = 0; layer < bank.dynamics.length; layer++) {
      const map = plan.sax ? maps[layer] : maps[plan.sections ? pitch < 55 ? 0 : pitch < 60 ? 1 : 2 : 0];
      const velocity = layer === 0 ? 50 : 115;
      const candidates = map.filter((r) => plan.sax
        ? (r.root - map[0].root) % 3 === 0 || r.root === map.at(-1).root
        : r.lowVelocity <= velocity && r.highVelocity >= velocity);
      candidates.sort((a, b) => Number(!(pitch >= a.low && pitch <= a.high)) - Number(!(pitch >= b.low && pitch <= b.high)) || Math.abs(a.root - pitch) - Math.abs(b.root - pitch));
      let region = candidates[0];
      if (!region || !Number.isFinite(region.root)) throw Error(`${instrument}: invalid mapping for ${pitch}, layer ${layer}`);
      // Preserve the existing instrument at extreme registers beyond the source library.
      if (Math.abs(region.root - pitch) > 5) region = { root: pitch, tune: 0, file: `FluidR3_GM/${instrument}/${pitch}`, legacy: instrument };
      const id = hash(region.file).slice(0, 16);
      selected.set(id, region);
      bank.pitches[pitch].push(id);
    }
  }
  const fallbackCount = [...selected.values()].filter((region) => region.legacy).length;
  if (fallbackCount) bank.fallback = 'FluidR3 GM for ' + fallbackCount + ' pitches outside the recorded range';
  console.log(`${instrument}: ${pitches.length} pitches, ${selected.size} recordings, ${bank.dynamics.length} dynamics${fallbackCount ? `; ${fallbackCount} original extreme-register pitches` : ''}`);
  if (dryRun) continue;
  const queue = [...selected];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const [id, region] = queue.shift();
      const cached = `${cache}/${hash(JSON.stringify({ region, plan, version: 1 }))}.json`;
      try { bank.samples[id] = JSON.parse(await readFile(cached, 'utf8')); }
      catch { bank.samples[id] = await convert(source, region, plan); await writeFile(cached, JSON.stringify(bank.samples[id])); }
    }
  }));
  const json = JSON.stringify(bank);
  await writeFile(`${output}/${instrument}.json`, json);
  total += json.length;
  console.log(`  ${(json.length / 1024 / 1024).toFixed(2)} MB`);
}
if (install && !dryRun) {
  for (const instrument of Object.keys(plans).filter((name) => !only || only.includes(name))) {
    await access(`${output}/${instrument}.json`);
  }
  for (const instrument of Object.keys(plans).filter((name) => !only || only.includes(name))) await copyFile(`${output}/${instrument}.json`, `public/audio/orchestra/${instrument}.json`);
  for (const [name, source] of Object.entries(sources)) await writeFile(`public/audio/orchestra/LICENSE-${name}.txt`, (await download(source, 'LICENSE')).bytes.toString().trimEnd() + '\n');
}
console.log(`Prepared ${(total / 1024 / 1024).toFixed(2)} MB${install ? ' and installed selected banks' : ' in ' + output}.`);
