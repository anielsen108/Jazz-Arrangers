import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { TREATMENTS } from '../src/lib/orchestration.ts';
import { midi, performedBeat } from '../src/lib/orchestraMusic.ts';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = resolve('output/tooling/ensemble-render');
await mkdir(`${out}/scores`, { recursive: true });
await build({entryPoints:['src/lib/orchestraScore.ts'],outfile:`${out}/score.mjs`,bundle:true,platform:'node',format:'esm'});
const {makeMusicXml} = await import(pathToFileURL(`${out}/score.mjs`));
const sounds = {
  trumpet:['Trumpet','brass.trumpet.c'], alto_sax:['Alto Saxophone','wind.reed.saxophone.alto'],
  tenor_sax:['Tenor Saxophone','wind.reed.saxophone.tenor'], baritone_sax:['Baritone Saxophone','wind.reed.saxophone.baritone'],
  soprano_sax:['Soprano Saxophone','wind.reed.saxophone.soprano'], trombone:['Trombone','brass.trombone'],
  acoustic_grand_piano:['Piano','keyboard.piano'], flute:['Flute','wind.flutes.flute'],
  english_horn:['English Horn','wind.reed.english-horn'], french_horn:['Horn','brass.french-horn'],
  bassoon:['Bassoon','wind.reed.bassoon'], tuba:['Tuba','brass.tuba'], clarinet:['Clarinet','wind.reed.clarinet'],
  violin:['Violin','strings.violin'], orchestral_harp:['Harp','pluck.harp'],
  string_ensemble_1:['Violins','strings.group'],
};
// Keep the existing Harmon-muted trumpet recording: a generic mute instruction
// would not guarantee the same mute color. Bass likewise uses approved Meatbass.
const stems = new Map();
const studies = [];
for (const t of TREATMENTS) {
  const parts = [];
  for (const p of t.parts) {
    const definition = {instrument:p.instrument,program:p.program,clef:p.clef,swing:t.swing,notes:p.notes};
    const hash = createHash('sha256').update(JSON.stringify(definition)).digest('hex').slice(0,24);
    parts.push({id:p.id,stem:hash,level:p.level,pan:p.pan});
    if (stems.has(hash)) continue;
    const single = {...t, parts:[p]};
    let xml = makeMusicXml(single,104);
    const sound = sounds[p.instrument];
    if (sound) xml=xml.replace(/<instrument-name>[^<]*<\/instrument-name>/,`<instrument-name>${sound[0]}</instrument-name><instrument-sound>${sound[1]}</instrument-sound>`);
    xml=xml.replaceAll('</attributes>','<transpose><diatonic>0</diatonic><chromatic>0</chromatic></transpose></attributes>');
    if(t.swing!==.5) xml=xml.replace('<sound tempo="104"/>',`<sound tempo="104"><swing><first>${Math.round(t.swing*300)}</first><second>${Math.round((1-t.swing)*300)}</second><swing-type>eighth</swing-type></swing></sound>`);
    const notes=[...p.notes].sort((a,b)=>a.beat-b.beat||midi(a.pitch)-midi(b.pitch));
    let n=0;
    xml=xml.replace(/<note>(?=(?:<chord\/>)?<pitch>)/g,()=>`<note dynamics="${Math.round(notes[n++].velocity*110/90*100)}">`);
    if(n!==notes.length) throw Error(`Notes lost in ${t.name}/${p.label}`);
    xml=xml.replace('</attributes>','</attributes><direction><direction-type><dynamics><mf/></dynamics></direction-type></direction>');
    await writeFile(`${out}/scores/${hash}.musicxml`,xml);
    stems.set(hash,{hash,instrument:p.instrument,muse:!!sound,notes:p.notes.map(n=>({...n,midi:midi(n.pitch),start:performedBeat(n.beat,t.swing)*60/104,length:(performedBeat(n.beat+n.duration*n.gate,t.swing)-performedBeat(n.beat,t.swing))*60/104}))});
  }
  studies.push({id:t.id,name:t.name,tempo:104,swing:t.swing,parts});
}
await writeFile(`${out}/catalogue.json`,JSON.stringify({version:1,tempo:104,duration:32*60/104+3,stems:[...stems.values()],studies},null,2));
console.log(JSON.stringify({studies:studies.length,uniqueStems:stems.size,museStems:[...stems.values()].filter(s=>s.muse).length,instruments:[...new Set([...stems.values()].map(s=>s.instrument))]}));
