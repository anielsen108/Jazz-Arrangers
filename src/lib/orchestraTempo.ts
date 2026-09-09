import { Stretch } from '@soundtouchjs/core';

/** Offline WSOLA: change duration while retaining concert pitch and stereo. */
export function stretchRecording(left: Float32Array, right: Float32Array, sampleRate: number, ratio: number) {
  if (!Number.isFinite(ratio) || ratio < .5 || ratio > 2) throw new Error('Unsupported playback tempo.');
  if (ratio === 1) return [left, right];
  const processor = new Stretch({sampleRate, createBuffers:true});
  processor.tempo = ratio;
  // Short correlation searches limit transient movement between separately scored parts.
  processor.setStretchParameters({sequenceMs:60,seekWindowMs:8,overlapMs:8});
  const frames = Math.ceil(left.length / ratio);
  const result = [new Float32Array(frames), new Float32Array(frames)];
  const input = new Float32Array(4096 * 2);
  let read = 0, written = 0;
  while (written < frames) {
    input.fill(0);
    for (let i=0;i<4096 && read+i<left.length;i++) {
      input[2*i]=left[read+i]; input[2*i+1]=right[read+i];
    }
    read+=4096;
    processor.inputBuffer!.putSamples(input);
    processor.process();
    const count=processor.outputBuffer!.frameCount;
    if(count) {
      const chunk=new Float32Array(count*2);
      processor.outputBuffer!.extract(chunk,0,count);
      processor.outputBuffer!.receive(count);
      for(let i=0;i<count && written<frames;i++,written++) {
        result[0][written]=chunk[2*i];result[1][written]=chunk[2*i+1];
      }
    }
    if(read>left.length+sampleRate*2 && written<frames) throw new Error('Tempo conversion did not complete.');
  }
  return result;
}
