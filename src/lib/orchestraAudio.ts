import { midi, performedBeat, writtenBeat, type Part, type Treatment } from './orchestraMusic';
import { isRecordedBank, sampleChoice, type SampleBank } from './orchestraSamples';

export type LoopMode = 'off' | 'passage' | 'bar';
type Voice = { source: AudioBufferSourceNode; envelope: GainNode };
type DecodedBank = { definition: SampleBank; buffers: Map<string, AudioBuffer> };

/** Sample playback and transport share the audio clock, including the score cursor. */
export class OrchestraAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private cache = new Map<string, Promise<DecodedBank>>();
  private sustainCache = new WeakMap<AudioBuffer, { buffer: AudioBuffer; start: number; end: number }>();
  private voices = new Set<Voice>();
  private gains = new Map<string, GainNode>();
  private timer?: ReturnType<typeof setInterval>;
  private revision = 0;
  private tick?: () => void;
  private _beat = 0;
  playing = false;
  volume = 0.7;

  get beat() { this.tick?.(); return this._beat; }

  private init() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume * 0.36;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 8;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.18;
      this.master.connect(compressor).connect(this.context.destination);
    }
    return this.context;
  }

  private bank(instrument: string, base: string, notes: Array<{ pitch: string; velocity: number }>): Promise<DecodedBank> {
    const key = instrument + ':' + [...new Set(notes.map((note) => `${midi(note.pitch)}:${note.velocity}`))].sort().join(',');
    if (this.cache.has(key)) return this.cache.get(key)!;
    const context = this.init();
    const request = (async () => {
      const response = await fetch(`${base}/audio/orchestra/${instrument}.json`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Could not load ${instrument.replaceAll('_', ' ')} (${response.status}).`);
      const definition: SampleBank = await response.json();
      const samples = isRecordedBank(definition) ? Object.fromEntries(Object.entries(definition.samples).map(([id, sample]) => [id, sample.audio])) : definition;
      const needed = new Set(notes.map((note) => isRecordedBank(definition) ? sampleChoice(definition, midi(note.pitch), note.velocity).id : String(midi(note.pitch))));
      const decoded = await Promise.all(Object.entries(samples).filter(([id]) => needed.has(id)).map(async ([id, data]) => {
        const bytes = Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), (c) => c.charCodeAt(0));
        return [id, await context.decodeAudioData(bytes.buffer)] as const;
      }));
      return { definition, buffers: new Map(decoded) };
    })();
    this.cache.set(key, request);
    request.catch(() => this.cache.delete(key));
    return request;
  }

  setVolume(value: number) {
    this.volume = value;
    if (this.context && this.master) this.master.gain.setTargetAtTime(value * 0.36, this.context.currentTime, 0.02);
  }

  mix(parts: Part[], muted: Set<string>, solo: Set<string>) {
    if (!this.context) return;
    for (const part of parts) {
      const audible = !muted.has(part.id) && (!solo.size || solo.has(part.id));
      this.gains.get(part.id)?.gain.setTargetAtTime(audible ? part.level : 0, this.context.currentTime, 0.012);
    }
  }

  stop() {
    this.revision++;
    this.playing = false;
    clearInterval(this.timer);
    this.tick = undefined;
    const now = this.context?.currentTime ?? 0;
    for (const voice of this.voices) {
      voice.envelope.gain.cancelScheduledValues(now);
      voice.envelope.gain.setTargetAtTime(0, now, 0.005);
      try { voice.source.stop(now + 0.03); } catch { /* Already ended. */ }
    }
    this.voices.clear();
    for (const gain of this.gains.values()) {
      // Disconnect after release, so pause and style changes do not click.
      setTimeout(() => gain.disconnect(), 40);
    }
    this.gains.clear();
  }

  async play(options: {
    treatment: Treatment; beat: number; tempo: number; loop: LoopMode; base: string;
    muted: Set<string>; solo: Set<string>; onTick: (beat: number) => void;
    onReady: () => void; onEnd: () => void;
  }) {
    this.stop();
    const revision = this.revision;
    const context = this.init();
    // Resume synchronously within the user's click, before fetching any assets.
    const resume = context.resume();
    const { treatment, tempo, loop, base, muted, solo } = options;
    const banks = new Map(await Promise.all([...new Set(treatment.parts.map((p) => p.instrument))]
      .map(async (instrument) => [instrument, await this.bank(instrument, base, treatment.parts.filter((part) => part.instrument === instrument).flatMap((part) => part.notes))] as const)));
    await resume;
    if (revision !== this.revision) return;
    if (context.state !== 'running') throw new Error('Audio is paused by the browser. Press Play again to resume.');

    for (const part of treatment.parts) {
      const gain = context.createGain();
      const pan = context.createStereoPanner();
      pan.pan.value = part.pan;
      gain.connect(pan).connect(this.master!);
      this.gains.set(part.id, gain);
    }
    this.mix(treatment.parts, muted, solo);
    const seconds = 60 / tempo;
    const from = Math.min(31.999, options.beat);
    const loopStart = loop === 'bar' ? Math.floor(from / 4) * 4 : 0;
    const end = loop === 'bar' ? loopStart + 4 : 32;
    const swing = treatment.swing;
    const startTime = context.currentTime + 0.06;
    const firstDuration = (performedBeat(end, swing) - performedBeat(from, swing)) * seconds;
    let nextBoundary = startTime + firstDuration;
    const cycleDuration = (end - loopStart) * seconds;

    const schedule = (start: number, firstBeat: number) => {
      for (const part of treatment.parts) {
        const bank = banks.get(part.instrument)!;
        for (const note of part.notes) {
          const noteEnd = note.beat + note.duration * note.gate;
          if (note.beat >= end || noteEnd <= firstBeat) continue;
          const pitch = midi(note.pitch);
          const recorded = isRecordedBank(bank.definition) ? sampleChoice(bank.definition, pitch, note.velocity) : undefined;
          const buffer = bank.buffers.get(recorded?.id ?? String(pitch));
          if (!buffer) throw new Error(`Missing pitch ${note.pitch} for ${part.label}.`);
          const attackBeat = Math.max(firstBeat, note.beat);
          const at = start + (performedBeat(attackBeat, swing) - performedBeat(firstBeat, swing)) * seconds;
          const duration = (performedBeat(Math.min(end, noteEnd), swing) - performedBeat(attackBeat, swing)) * seconds;
          const source = context.createBufferSource();
          const rate = recorded?.rate ?? 1;
          source.playbackRate.value = rate;
          const envelope = context.createGain();
          let playedBuffer = buffer;
          // The source includes the instrumental attack and decay. Long held notes
          // repeat a crossfaded sustain region instead of falling silent at slow tempi.
          const sustained = isRecordedBank(bank.definition) ? bank.definition.sustained : part.family !== 'rhythm';
          if (recorded?.sample.loop && duration * rate > recorded.sample.loop[1]) {
            source.loop = true;
            [source.loopStart, source.loopEnd] = recorded.sample.loop;
          } else if (!recorded && sustained && duration > buffer.duration - 0.25) {
            let cached = this.sustainCache.get(buffer);
            if (!cached) {
              const startLoop = Math.min(0.55, buffer.duration * 0.25);
              const endLoop = Math.min(1.7, buffer.duration * 0.72);
              const blend = Math.floor(buffer.sampleRate * 0.04);
              const first = Math.floor(startLoop * buffer.sampleRate);
              const last = Math.floor(endLoop * buffer.sampleRate);
              const looped = context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
              for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const original = buffer.getChannelData(channel);
                const data = looped.getChannelData(channel);
                data.set(original);
                for (let i = 0; i < blend; i++) data[last - blend + i] = original[last - blend + i] * (1 - i / blend) + original[first + i] * i / blend;
              }
              cached = { buffer: looped, start: (first + blend) / buffer.sampleRate, end: last / buffer.sampleRate };
              this.sustainCache.set(buffer, cached);
            }
            playedBuffer = cached.buffer;
            source.loop = true;
            source.loopStart = cached.start;
            source.loopEnd = cached.end;
          }
          source.buffer = playedBuffer;
          source.connect(envelope).connect(this.gains.get(part.id)!);
          const attack = recorded ? 0.004 : part.family === 'strings' ? 0.07 : 0.009;
          const release = part.family === 'strings' ? 0.13 : 0.045;
          // Recorded banks have a consistent source level; match the retained GM
          // instruments before applying the arrangement's dynamics and part mix.
          const velocity = note.velocity * (recorded ? 0.5 : 1);
          envelope.gain.setValueAtTime(0, at);
          envelope.gain.linearRampToValueAtTime(velocity, at + Math.min(attack, duration / 3));
          envelope.gain.setValueAtTime(velocity, at + duration);
          envelope.gain.linearRampToValueAtTime(0, at + duration + release);
          source.start(at);
          source.stop(at + duration + release + 0.01);
          const voice = { source, envelope };
          this.voices.add(voice);
          source.onended = () => { source.disconnect(); envelope.disconnect(); this.voices.delete(voice); };
        }
      }
    };
    try { schedule(startTime, from); } catch (error) { this.stop(); throw error; }
    this.playing = true;
    options.onReady();
    this.tick = () => {
      if (!this.playing) return;
      const now = context.currentTime;
      if (loop !== 'off' && now + 0.2 >= nextBoundary) {
        // A background tab may miss several intervals. Resume at the next cycle.
        while (nextBoundary < now - cycleDuration) nextBoundary += cycleDuration;
        schedule(nextBoundary, loopStart);
        nextBoundary += cycleDuration;
      }
      const elapsed = Math.max(0, now - startTime);
      if (loop === 'off' && elapsed >= firstDuration) {
        this._beat = 0;
        this.stop();
        options.onEnd();
        return;
      }
      const performed = elapsed < firstDuration
        ? performedBeat(from, swing) + elapsed / seconds
        : loopStart + ((elapsed - firstDuration) % cycleDuration) / seconds;
      this._beat = Math.min(31.999, writtenBeat(performed, swing));
      options.onTick(this._beat);
    };
    this.timer = setInterval(this.tick, 30);
    this.tick();
  }

  dispose() { this.stop(); this.cache.clear(); void this.context?.close(); }
}
