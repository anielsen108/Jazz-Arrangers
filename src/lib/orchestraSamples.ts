export interface RecordedSample {
  root: number;
  tune: number;
  audio: string;
  loop?: [number, number];
  file?: string;
  sha256?: string;
}
export interface RecordedBank {
  version: 2;
  source: string;
  license: string;
  upstream: string;
  dynamics: number[];
  sustained: boolean;
  samples: Record<string, RecordedSample>;
  pitches: Record<string, string[]>;
}
export type SampleBank = RecordedBank | Record<string, string>;

export function isRecordedBank(bank: SampleBank): bank is RecordedBank {
  return bank.version === 2;
}

/** Each written pitch uses a nearby recorded pitch, with its original tuning correction. */
export function sampleChoice(bank: RecordedBank, pitch: number, velocity: number) {
  const ids = bank.pitches[pitch];
  if (!ids) throw new Error(`Missing recorded pitch ${pitch}.`);
  const layer = bank.dynamics.findIndex((maximum) => velocity <= maximum);
  const id = ids[layer < 0 ? ids.length - 1 : layer];
  const sample = bank.samples[id];
  if (!sample) throw new Error(`Missing recording ${id}.`);
  return { id, sample, rate: 2 ** ((pitch - sample.root + sample.tune / 100) / 12) };
}
