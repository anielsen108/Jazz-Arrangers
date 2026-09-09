import { describe,it,expect } from 'vitest';
import { stretchRecording } from './orchestraTempo';
describe('recorded tempo conversion',()=>{
  const sampleRate=24000;
  const tone=Float32Array.from({length:sampleRate*3},(_,i)=>.4*Math.sin(2*Math.PI*440*i/sampleRate));
  it('leaves the approved default-tempo recording untouched',()=>{
    const [left,right]=stretchRecording(tone,tone,sampleRate,1);expect(left).toBe(tone);expect(right).toBe(tone);
  });
  it.each([72/104,160/104])('changes duration without changing a 440 Hz pitch at ratio %s',ratio=>{
    const [left,right]=stretchRecording(tone,tone,sampleRate,ratio);
    expect(left.length).toBe(Math.ceil(tone.length/ratio));expect(right).toEqual(left);
    let crossings=0;for(let i=sampleRate/2;i<sampleRate*1.5;i++)if(left[i]<=0&&left[i+1]>0)crossings++;
    expect(Math.abs(crossings-440)).toBeLessThan(3);
    expect(left.every(Number.isFinite)).toBe(true);
  });
  it.each([72/104,160/104])('retains later phrases rather than repeating the opening at ratio %s',ratio=>{
    const changing=Float32Array.from({length:sampleRate*3},(_,i)=>.4*Math.sin(2*Math.PI*(i<sampleRate?220:880)*i/sampleRate));
    const [left]=stretchRecording(changing,changing,sampleRate,ratio);
    const start=Math.round(1.6/ratio*sampleRate),end=Math.round(2.6/ratio*sampleRate);
    let crossings=0;for(let i=start;i<end;i++)if(left[i]<=0&&left[i+1]>0)crossings++;
    expect(Math.abs(crossings*sampleRate/(end-start)-880)).toBeLessThan(4);
  });
});
