import { performedBeat, writtenBeat, type Part, type Treatment } from './orchestraMusic';
export type LoopMode = 'off' | 'passage' | 'bar';
export interface RecordedPart { id:string; file:string; restoreGain:number; source:string; notes:number }
export interface RecordingManifest { version:1; id:string; tempo:number; gain:number; parts:RecordedPart[] }
interface PlayOptions {
  treatment:Treatment;beat:number;tempo:number;loop:LoopMode;base:string;
  muted:Set<string>;solo:Set<string>;onTick:(beat:number)=>void;onReady:()=>void;onEnd:()=>void;
}

/** All part sources start on the same audio clock; no instrument synthesis runs here. */
export class OrchestraRecordings {
  private context?:AudioContext;
  private master?:GainNode;
  private cache=new Map<string,Promise<AudioBuffer>>();
  private manifests=new Map<string,Promise<RecordingManifest>>();
  private adjusted=new Map<string,AudioBuffer>();
  private adjustedKey='';
  private gains=new Map<string,{node:GainNode;restore:number}>();
  private voices:Array<{source:AudioBufferSourceNode;envelope:GainNode;nodes:AudioNode[]}>=[];
  private timer?:ReturnType<typeof setInterval>;
  private revision=0;
  private tick?:()=>void;
  private cancelConversion?:()=>void;
  private _beat=0;
  playing=false;
  volume=.7;
  get beat(){this.tick?.();return this._beat;}

  private init(){
    if(!this.context){
      this.context=new AudioContext();this.master=this.context.createGain();
      this.master.gain.value=this.volume;this.master.connect(this.context.destination);
    }
    return this.context;
  }
  setVolume(value:number){this.volume=value;this.master?.gain.setTargetAtTime(value,this.context!.currentTime,.02);}
  mix(parts:Part[],muted:Set<string>,solo:Set<string>){
    for(const part of parts){
      const gain=this.gains.get(part.id);
      gain?.node.gain.setTargetAtTime(!muted.has(part.id)&&(!solo.size||solo.has(part.id))?part.level*gain.restore:0,this.context!.currentTime,.012);
    }
  }
  stop(){
    this.revision++;this.playing=false;if(this.timer)clearInterval(this.timer);this.tick=undefined;
    this.cancelConversion?.();this.cancelConversion=undefined;
    const now=this.context?.currentTime??0;
    for(const {source,envelope,nodes} of this.voices){
      envelope.gain.cancelScheduledValues(now);envelope.gain.setTargetAtTime(0,now,.004);
      try{source.stop(now+.025);}catch{/* Already ended. */}
      setTimeout(()=>{source.disconnect();envelope.disconnect();nodes.forEach(n=>n.disconnect());},40);
    }
    this.voices=[];this.gains.clear();
  }
  private async manifest(url:string){
    if(!this.manifests.has(url)){
      const request=fetch(url,{signal:AbortSignal.timeout(20000)}).then(async r=>{
        if(!r.ok)throw new Error(`The ensemble recording could not load (${r.status}).`);
        return await r.json() as RecordingManifest;
      });
      this.manifests.set(url,request);request.catch(()=>this.manifests.delete(url));
    }
    return this.manifests.get(url)!;
  }
  private async buffer(url:string){
    if(!this.cache.has(url)){
      const request=fetch(url,{signal:AbortSignal.timeout(30000)}).then(async r=>{
        if(!r.ok)throw new Error(`A recorded part could not load (${r.status}).`);
        return this.context!.decodeAudioData(await r.arrayBuffer());
      });
      this.cache.set(url,request);request.catch(()=>this.cache.delete(url));
    }
    return this.cache.get(url)!;
  }
  private async atTempo(buffer:AudioBuffer,key:string,ratio:number):Promise<AudioBuffer>{
    if(ratio===1)return buffer;
    const cached=this.adjusted.get(key);if(cached)return cached;
    const worker=new Worker(new URL('./orchestraTempo.worker.ts',import.meta.url),{type:'module'});
    const channels=[buffer.getChannelData(0).slice(),buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1)).slice()];
    const result=await new Promise<AudioBuffer>((resolve,reject)=>{
      const finish=()=>{worker.terminate();this.cancelConversion=undefined;};
      this.cancelConversion=()=>{finish();reject(new DOMException('Playback cancelled.','AbortError'));};
      worker.onerror=()=>{finish();reject(new Error('The recording could not be adjusted to this tempo.'));};
      worker.onmessage=event=>{
        finish();if(event.data.error){reject(new Error(event.data.error));return;}
        const values=event.data.channels as Float32Array[];
        const adjusted=this.context!.createBuffer(2,values[0].length,buffer.sampleRate);
        values.forEach((c,i)=>adjusted.copyToChannel(c as Float32Array<ArrayBuffer>,i));resolve(adjusted);
      };
      worker.postMessage({channels,sampleRate:buffer.sampleRate,ratio},{transfer:channels.map(c=>c.buffer)});
    });
    this.adjusted.set(key,result);return result;
  }
  private loopBuffer(buffer:AudioBuffer,start:number,end:number){
    const first=Math.round(start*buffer.sampleRate),last=Math.round(end*buffer.sampleRate);
    const result=this.context!.createBuffer(2,last-first,buffer.sampleRate);
    const fade=Math.min(Math.round(.005*buffer.sampleRate),Math.floor(result.length/2));
    for(let ch=0;ch<2;ch++){
      const data=result.getChannelData(ch);data.set(buffer.getChannelData(ch).subarray(first,last));
      for(let i=0;i<fade;i++){data[i]*=i/fade;data[data.length-1-i]*=i/fade;}
    }
    return result;
  }
  async play(options:PlayOptions){
    this.stop();const revision=this.revision;const context=this.init();
    await context.resume();if(revision!==this.revision)return;
    if(context.state!=='running')throw new Error('Audio is paused by the browser. Press Play again.');
    const {treatment,tempo,loop,muted,solo}=options;
    const base=`${options.base}/audio/performances/v1`;
    const manifest=await this.manifest(`${base}/${treatment.id}.json`);
    if(revision!==this.revision)return;
    if(manifest.version!==1||manifest.id!==treatment.id||manifest.parts.length!==treatment.parts.length||!Number.isFinite(manifest.gain)||manifest.parts.some((p,i)=>p.id!==treatment.parts[i].id||p.notes!==treatment.parts[i].notes.length))throw new Error('The recording does not match this score.');
    const original=await Promise.all(manifest.parts.map(p=>this.buffer(`${base}/${p.file}`)));
    if(revision!==this.revision)return;
    // Retain only the current tempo's buffers, bounding memory on phones.
    const adjustedKey=`${treatment.id}:${tempo}`;
    if(this.adjustedKey!==adjustedKey){this.adjusted.clear();this.adjustedKey=adjustedKey;}
    const buffers:AudioBuffer[]=[];
    for(let i=0;i<original.length;i++){
      buffers.push(await this.atTempo(original[i],`${manifest.parts[i].file}:${tempo}`,tempo/manifest.tempo));
      if(revision!==this.revision)return;
    }
    const seconds=60/tempo,swing=treatment.swing,from=Math.max(0,Math.min(31.999,options.beat));
    const first=loop==='bar'?Math.floor(from/4)*4:0,end=loop==='bar'?first+4:32;
    const startOffset=performedBeat(from,swing)*seconds;
    const loopStart=performedBeat(first,swing)*seconds,loopEnd=performedBeat(end,swing)*seconds;
    const at=context.currentTime+.06;
    let tail=0;
    for(let i=0;i<buffers.length;i++){
      const part=treatment.parts[i],recording=manifest.parts[i];
      const source=context.createBufferSource(),envelope=context.createGain(),gain=context.createGain();
      const split=context.createChannelSplitter(2),left=context.createGain(),right=context.createGain(),merge=context.createChannelMerger(2);
      const angle=(part.pan+1)*Math.PI/4;
      left.gain.value=Math.cos(angle)*Math.sqrt(2);right.gain.value=Math.sin(angle)*Math.sqrt(2);
      source.connect(envelope).connect(gain).connect(split);split.connect(left,0);split.connect(right,1);left.connect(merge,0,0);right.connect(merge,0,1);merge.connect(this.master!);
      gain.gain.value=0;this.gains.set(part.id,{node:gain,restore:recording.restoreGain*manifest.gain});
      envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(1,at+.005);
      source.buffer=loop==='off'?buffers[i]:this.loopBuffer(buffers[i],loopStart,loopEnd);
      source.loop=loop!=='off';tail=Math.max(tail,buffers[i].duration-startOffset);
      source.start(at,loop==='off'?startOffset:startOffset-loopStart);
      this.voices.push({source,envelope,nodes:[gain,split,left,right,merge]});
    }
    this.mix(treatment.parts,muted,solo);this.playing=true;this._beat=from;
    this.tick=()=>{
      const elapsed=Math.max(0,context.currentTime-at);
      if(loop==='off'&&elapsed>=tail){this.stop();this._beat=0;options.onEnd();return;}
      const position=loop==='off'?startOffset+elapsed:loopStart+((startOffset-loopStart+elapsed)%(loopEnd-loopStart));
      this._beat=Math.min(31.999,writtenBeat(position/seconds,swing));options.onTick(this._beat);
    };
    this.timer=setInterval(()=>this.tick?.(),30);options.onReady();this.tick();
  }
  dispose(){this.stop();void this.context?.close();this.context=undefined;this.cache.clear();this.manifests.clear();this.adjusted.clear();}
}
