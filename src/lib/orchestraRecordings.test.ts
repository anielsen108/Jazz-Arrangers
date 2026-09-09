import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {OrchestraRecordings} from './orchestraRecordings';
import {treatmentForArtist} from './orchestration';
import {performedBeat} from './orchestraMusic';
class Param {value=0;setTargetAtTime(v:number){this.value=v;}setValueAtTime(v:number){this.value=v;}linearRampToValueAtTime(v:number){this.value=v;}cancelScheduledValues(){}}
class Node {gain=new Param();connect(){return this;}disconnect(){}}
class Buffer {
  numberOfChannels=2;sampleRate=100;length:number;duration:number;channels:Float32Array[];
  constructor(length=2150){this.length=length;this.duration=length/100;this.channels=[new Float32Array(length),new Float32Array(length)];}
  getChannelData(i:number){return this.channels[i];}
  copyToChannel(data:Float32Array,i:number){this.channels[i].set(data);}
}
class Source extends Node {buffer?:Buffer;loop=false;start=vi.fn();stop=vi.fn();}
class Context {
  static last:Context;currentTime=0;state='running';destination=new Node();sources:Source[]=[];gains:Node[]=[];
  constructor(){Context.last=this;}
  resume(){return Promise.resolve();}close(){return Promise.resolve();}
  createGain(){const n=new Node();this.gains.push(n);return n;}
  createBufferSource(){const n=new Source();this.sources.push(n);return n;}
  createChannelSplitter(){return new Node();}createChannelMerger(){return new Node();}
  createBuffer(_channels:number,length:number){return new Buffer(length);}
  decodeAudioData(){return Promise.resolve(new Buffer());}
}
const treatment=treatmentForArtist('Christian McBride');
const manifest={version:1,id:treatment.id,tempo:104,gain:.6,parts:treatment.parts.map(p=>({id:p.id,file:p.id+'.ogg',restoreGain:1,notes:p.notes.length,source:'recording'}))};
const options=()=>({treatment,tempo:104,beat:0,loop:'off' as const,base:'',muted:new Set<string>(),solo:new Set<string>(),onTick:vi.fn(),onReady:vi.fn(),onEnd:vi.fn()});
let engine:OrchestraRecordings;
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('AudioContext',Context);vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>manifest,arrayBuffer:async()=>new ArrayBuffer(1)})));engine=new OrchestraRecordings();});
afterEach(()=>{engine.dispose();vi.useRealTimers();vi.unstubAllGlobals();});
describe('recording transport',()=>{
  it('starts all nine parts together at the correct swung seek offset',async()=>{
    await engine.play({...options(),beat:1.5});
    expect(Context.last.sources).toHaveLength(9);
    for(const source of Context.last.sources){
      expect(source.start.mock.calls[0][0]).toBe(.06);
      expect(source.start.mock.calls[0][1]).toBeCloseTo(performedBeat(1.5,treatment.swing)*60/104,10);
    }
    expect(engine.playing).toBe(true);
    Context.last.currentTime=.06+60/104;expect(engine.beat).toBeCloseTo(2.5);
  });
  it('cancels loading without starting any part',async()=>{
    let finish!:(value:unknown)=>void;
    vi.stubGlobal('fetch',vi.fn(()=>new Promise(resolve=>finish=resolve)));
    const pending=engine.play(options());await Promise.resolve();engine.stop();
    finish({ok:true,json:async()=>manifest});await pending;
    expect(Context.last.sources).toHaveLength(0);expect(engine.playing).toBe(false);
  });
  it('keeps additive solo and mute changes on the same transport',async()=>{
    await engine.play(options());const sources=[...Context.last.sources];
    const solo=new Set(treatment.parts.slice(0,2).map(p=>p.id));
    engine.mix(treatment.parts,new Set([treatment.parts[0].id]),solo);
    const gains=(engine as unknown as {gains:Map<string,{node:Node}>}).gains;
    expect(gains.get(treatment.parts[0].id)!.node.gain.value).toBe(0);
    expect(gains.get(treatment.parts[1].id)!.node.gain.value).toBeGreaterThan(0);
    expect(gains.get(treatment.parts[2].id)!.node.gain.value).toBe(0);
    expect(Context.last.sources).toEqual(sources);
  });
  it('loops a selected bar and lets the final release finish when looping is off',async()=>{
    await engine.play({...options(),beat:9,loop:'bar'});
    expect(Context.last.sources.every(s=>s.loop)).toBe(true);
    Context.last.currentTime=.06+4*60/104;expect(engine.beat).toBeCloseTo(9);
    engine.stop();Context.last.currentTime=0;
    const opts=options();await engine.play(opts);Context.last.currentTime=19;
    expect(engine.beat).toBeCloseTo(31.999);expect(opts.onEnd).not.toHaveBeenCalled();
    Context.last.currentTime=22;expect(engine.beat).toBe(0);expect(opts.onEnd).toHaveBeenCalledOnce();
  });
  it('rejects a stale score manifest and permits a failed fetch to be retried',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:503})));
    await expect(engine.play(options())).rejects.toThrow('503');
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({...manifest,id:'wrong-artist'})})));
    await expect(engine.play(options())).rejects.toThrow('does not match');
  });
});
