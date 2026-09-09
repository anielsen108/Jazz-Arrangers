import {describe,it,expect} from 'vitest';
import {readFileSync,statSync,openSync,readSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TREATMENTS} from './orchestration';

const root='public/audio/performances/v1';
describe('published performance catalogue',()=>{
  it('has a matching performance for every artist and every scored part',()=>{
    const index=JSON.parse(readFileSync(`${root}/index.json`,'utf8'));
    expect(Object.keys(index).sort()).toEqual(TREATMENTS.map(t=>t.id).sort());
    const checked=new Set<string>();
    for(const t of TREATMENTS){
      const manifest=JSON.parse(readFileSync(`${root}/${t.id}.json`,'utf8'));
      expect(manifest.id).toBe(t.id);expect(manifest.tempo).toBe(104);
      expect(manifest.parts.map((p:{id:string})=>p.id)).toEqual(t.parts.map(p=>p.id));
      expect(manifest.gain).toBeGreaterThan(0);expect(Number.isFinite(manifest.gain)).toBe(true);
      expect(manifest.loudness).toBeLessThanOrEqual(-19.9);expect(manifest.peakDb).toBeLessThanOrEqual(-2.9);
      t.parts.forEach((p,i)=>{
        const recorded=manifest.parts[i];
        const definition={instrument:p.instrument,program:p.program,clef:p.clef,swing:t.swing,notes:p.notes};
        const hash=createHash('sha256').update(JSON.stringify(definition)).digest('hex').slice(0,24);
        expect(recorded.hash,`${t.name}: rerender ${p.label} after changing its score`).toBe(hash);
        expect(recorded.file).toBe(`${hash}.ogg`);expect(recorded.notes).toBe(p.notes.length);
        expect(recorded.source).toBeTruthy();expect(recorded.license).toBeTruthy();
        expect(recorded.restoreGain).toBeGreaterThan(0);expect(Number.isFinite(recorded.restoreGain)).toBe(true);
        if(['trumpet','alto_sax','tenor_sax','baritone_sax','trombone','acoustic_grand_piano'].includes(p.instrument)&&p.notes.length){
          expect(recorded.source).toBe('MuseSounds');expect(recorded.museVerified).toBe(true);
        }
        if(!checked.has(hash)){
          const path=`${root}/${recorded.file}`;expect(statSync(path).size).toBeGreaterThan(100);
          const file=openSync(path,'r'),header=Buffer.alloc(64);
          try{readSync(file,header,0,header.length,0);}finally{closeSync(file);}
          expect(header.subarray(0,4).toString()).toBe('OggS');expect(header.includes(Buffer.from('OpusHead'))).toBe(true);
          checked.add(hash);
        }
      });
    }
    expect(checked.size).toBeGreaterThan(150);
  });
});
