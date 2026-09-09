import { stretchRecording } from './orchestraTempo';
self.onmessage = (event: MessageEvent<{channels:Float32Array[];sampleRate:number;ratio:number}>) => {
  try {
    const {channels,sampleRate,ratio}=event.data;
    const result=stretchRecording(channels[0],channels[1],sampleRate,ratio);
    self.postMessage({channels:result}, {transfer:result.map(c=>c.buffer)});
  } catch(error) {
    self.postMessage({error:error instanceof Error ? error.message : 'Tempo conversion failed.'});
  }
};
