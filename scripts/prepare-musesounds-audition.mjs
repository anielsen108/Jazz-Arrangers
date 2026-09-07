import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { treatmentForArtist } from '../src/lib/orchestration.ts';

const out = resolve('output/tooling/musesounds-audition');
await mkdir(out, { recursive: true });
await build({ entryPoints: ['src/lib/orchestraScore.ts'], outfile: `${out}/score.mjs`, bundle: true, platform: 'node', format: 'esm' });
const { makeMusicXml, makeMidi } = await import(pathToFileURL(`${out}/score.mjs`));
const treatment = treatmentForArtist('Christian McBride');
const tempo = 104;
let xml = makeMusicXml(treatment, tempo);
const sounds = {
  trumpet: ['Trumpet', 'brass.trumpet.c'], alto_sax: ['Alto Saxophone', 'wind.reed.saxophone.alto'],
  tenor_sax: ['Tenor Saxophone', 'wind.reed.saxophone.tenor'], baritone_sax: ['Baritone Saxophone', 'wind.reed.saxophone.baritone'],
  trombone: ['Trombone', 'brass.trombone'], acoustic_grand_piano: ['Piano', 'keyboard.piano'], acoustic_bass: ['Contrabass', 'strings.contrabass'],
};
let instrumentIndex = 0;
xml = xml.replace(/<instrument-name>[^<]*<\/instrument-name>/g, () => {
  const [name, sound] = sounds[treatment.parts[instrumentIndex++].instrument];
  return `<instrument-name>${name}</instrument-name><instrument-sound>${sound}</instrument-sound>`;
});
// Sound IDs identify timbre. Pitches remain concert pitches for every instrument.
xml = xml.replaceAll('</attributes>', '<transpose><diatonic>0</diatonic><chromatic>0</chromatic></transpose></attributes>');
// Preserve the written score while explicitly transmitting its 2:1 swing feel.
xml = xml.replaceAll(`<sound tempo="${tempo}"/>`, `<sound tempo="${tempo}"><swing><first>2</first><second>1</second><swing-type>eighth</swing-type></swing></sound>`);
let partIndex = 0;
xml = xml.replace(/<part id="P\d+">[\s\S]*?<\/part>/g, block => {
  const part = treatment.parts[partIndex++];
  const notes = [...part.notes].sort((a, b) => a.beat - b.beat || pitch(a.pitch) - pitch(b.pitch));
  let index = 0;
  block = block.replace(/<note>(?=(?:<chord\/>)?<pitch>)/g, () => `<note dynamics="${Math.round(notes[index++].velocity * 110 / 90 * 100)}">`);
  if (index !== notes.length) throw new Error(`Note count mismatch: ${part.label}`);
  const direction = '<direction><direction-type><dynamics><mf/></dynamics></direction-type></direction>';
  block = block.replace('</attributes>', '</attributes>' + direction + (part.instrument === 'acoustic_bass' ? '<direction><direction-type><words>pizz.</words></direction-type><sound pizzicato="yes"/></direction>' : ''));
  return block;
});
function pitch(p) { const m = /^([A-G])([b#]?)(-?\d)$/.exec(p); return (Number(m[3]) + 1) * 12 + { C:0,D:2,E:4,F:5,G:7,A:9,B:11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
await writeFile(`${out}/small-hours.musicxml`, xml);
await writeFile(`${out}/reference.mid`, makeMidi(treatment, tempo));
await writeFile(`${out}/manifest.json`, JSON.stringify({ artist: treatment.name, title: 'Small Hours', tempo, swing: treatment.swing, durationSeconds: 32 * 60 / tempo, parts: treatment.parts.map(p => ({ id:p.id, label:p.label, instrument:p.instrument, notes:p.notes.length })), noteCount:treatment.parts.reduce((n,p)=>n+p.notes.length,0), status:'Score prepared; MuseSounds rendering must be verified separately.' }, null, 2));
console.log(`Prepared ${treatment.parts.length} parts at ${tempo} BPM.`);

import { midi, performedBeat } from '../src/lib/orchestraMusic.ts';
await writeFile(`${out}/mix-score.json`, JSON.stringify({tempo, duration:32*60/tempo+3, parts:treatment.parts.map(p=>({...p,notes:p.notes.map(n=>({...n,midi:midi(n.pitch),start:performedBeat(n.beat,treatment.swing)*60/tempo,length:(performedBeat(n.beat+n.duration*n.gate,treatment.swing)-performedBeat(n.beat,treatment.swing))*60/tempo}))}))}));
