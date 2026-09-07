import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TREATMENTS, midi } from './orchestration';
import { isRecordedBank, sampleChoice, type RecordedBank, type SampleBank } from './orchestraSamples';

describe('recorded multisamples', () => {
  const fixture: RecordedBank = {
    version: 2, source: 'test', license: 'test', upstream: 'test', sustained: true,
    dynamics: [0.72, 1], pitches: { 62: ['soft', 'strong'] },
    samples: { soft: { root: 60, tune: -12, audio: '' }, strong: { root: 63, tune: 5, audio: '' } },
  };
  it('selects a recorded dynamic instead of only changing sample volume', () => {
    expect(sampleChoice(fixture, 62, 0.6).id).toBe('soft');
    expect(sampleChoice(fixture, 62, 0.72).id).toBe('soft');
    expect(sampleChoice(fixture, 62, 0.8).id).toBe('strong');
    expect(sampleChoice(fixture, 62, 1).id).toBe('strong');
  });
  it('applies the source pitch center and cent tuning correction in both directions', () => {
    expect(sampleChoice(fixture, 62, 0.5).rate).toBeCloseTo(2 ** (1.88 / 12), 10);
    expect(sampleChoice(fixture, 62, 0.9).rate).toBeCloseTo(2 ** (-0.95 / 12), 10);
    expect(() => sampleChoice(fixture, 90, 0.5)).toThrow('Missing recorded pitch');
  });
  it('retains compatibility with the remaining single-dynamic banks', () => {
    expect(isRecordedBank({ 60: 'data:audio/mp3;base64,test' })).toBe(false);
    expect(isRecordedBank(fixture)).toBe(true);
  });
  it('covers every used pitch at every dynamic and includes source provenance', () => {
    const names = [...new Set(TREATMENTS.flatMap((t) => t.parts.map((p) => p.instrument)))];
    let upgraded = 0;
    for (const name of names) {
      const bank: SampleBank = JSON.parse(readFileSync(new URL(`../../public/audio/orchestra/${name}.json`, import.meta.url), 'utf8'));
      if (!isRecordedBank(bank)) continue;
      upgraded++;
      expect(bank.upstream).toMatch(/^https:\/\/github.com\//);
      expect(['CC0-1.0', 'CC-BY-4.0']).toContain(bank.license);
      expect(bank.dynamics.at(-1)).toBe(1);
      const pitches = new Set(TREATMENTS.flatMap((t) => t.parts.filter((p) => p.instrument === name).flatMap((p) => p.notes.map((n) => midi(n.pitch)))));
      for (const pitch of pitches) {
        expect(bank.pitches[pitch]).toHaveLength(bank.dynamics.length);
        for (const velocity of bank.dynamics) {
          const choice = sampleChoice(bank, pitch, velocity);
          expect(Math.abs(choice.sample.root - pitch)).toBeLessThanOrEqual(5);
          expect(choice.sample.audio).toMatch(/^data:audio\/mp3;base64,/);
          expect(choice.sample.sha256).toMatch(/^[a-f0-9]{64}$/);
          if (choice.sample.loop) {
            expect(choice.sample.loop[0]).toBeGreaterThan(0);
            expect(choice.sample.loop[1]).toBeGreaterThan(choice.sample.loop[0] + 0.1);
            expect(bank.sustained).toBe(true);
          }
        }
      }
    }
    expect(upgraded).toBe(18);
  });
});
