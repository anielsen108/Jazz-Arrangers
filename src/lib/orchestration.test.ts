import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CHORDS, MELODY, TREATMENTS, chordDegree, defaultTreatment, midi, performedBeat, soundingNotes, writtenBeat } from './orchestration';
import { makeMidi, makeMusicXml } from './orchestraScore';

describe('original orchestration studies', () => {
  it('retains a complete eight-bar melody and eight annotations per treatment', () => {
    expect(MELODY.reduce((sum, n) => sum + n.duration, 0)).toBe(32);
    for (const treatment of TREATMENTS) {
      expect(treatment.annotations).toHaveLength(CHORDS.length);
      const leadIds = treatment.id === 'nestico' ? ['alto1', 'tpt1'] : [treatment.parts[0].id];
      for (const note of MELODY) {
        expect(treatment.parts.filter((p) => leadIds.includes(p.id)).some((p) => p.notes.some((n) => n.beat === note.beat && n.pitch === note.pitch && n.duration === note.duration)), `${treatment.id}: missing melody ${note.pitch} at ${note.beat}`).toBe(true);
      }
    }
  });

  it('has a local decoded-audio source for every scored pitch, with no out-of-passage events', () => {
    for (const treatment of TREATMENTS) for (const part of treatment.parts) {
      const samples = JSON.parse(readFileSync(new URL(`../../public/audio/orchestra/${part.instrument}.json`, import.meta.url), 'utf8'));
      for (const note of part.notes) {
        expect(note.beat).toBeGreaterThanOrEqual(0);
        expect(note.beat + note.duration).toBeLessThanOrEqual(32);
        expect(note.duration).toBeGreaterThan(0);
        expect(midi(note.pitch)).toBeGreaterThanOrEqual(21);
        expect(samples[midi(note.pitch)], `${part.instrument} ${note.pitch}`).toMatch(/^data:audio\/mp3;base64,/);
      }
    }
  });

  it('plays the exact opening voicings discussed in the commentary', () => {
    const pitches = (style: string, ids: string[], beat: number) => soundingNotes(TREATMENTS.find((t) => t.id === style)!.parts.filter((p) => ids.includes(p.id)), beat).map(({ note }) => note.pitch);
    expect(pitches('nestico', ['alto1', 'alto2', 'tenor1', 'tenor2', 'bari'], 0)).toEqual(['E5', 'D5', 'B4', 'G4', 'E3']);
    expect(pitches('nestico', ['tpt1', 'tpt2', 'tbn1', 'tbn2'], 16)).toEqual(['E5', 'C5', 'A3', 'G3']);
    expect(pitches('nestico', ['tpt1', 'tpt2', 'tbn1', 'tbn2'], 30)).toEqual(['C5', 'A4', 'G3', 'E3']);
    expect(pitches('sebesky', ['vln1', 'vln2', 'viola', 'cello'], 0)).toEqual(['B4', 'G4', 'E4', 'D3']);
    expect(pitches('evans', ['horn1', 'horn2', 'bassoon', 'tuba'], 0)).toEqual(['D4', 'B3', 'E3', 'C2']);
    expect(chordDegree('C#3', 1)).toBe('3');
    expect(chordDegree('Bb5', 1)).toBe('♭9');
    expect(chordDegree('Ab4', 5)).toBe('♭3');
    expect(chordDegree('G#2', 0)).toBe('passing tone');
  });

  it('keeps the score clock and swing performance clock invertible', () => {
    for (const swing of [0.5, 2 / 3]) for (let beat = 0; beat <= 32; beat += 0.0625) expect(writtenBeat(performedBeat(beat, swing), swing)).toBeCloseTo(beat, 10);
    expect(performedBeat(1.5, 2 / 3)).toBeCloseTo(1 + 2 / 3);
  });

  it('selects the named page treatment without attributing unrelated studies to other arrangers', () => {
    expect(defaultTreatment('Sammy Nestico')).toBe('nestico');
    expect(defaultTreatment('Gil Evans')).toBe('evans');
    expect(defaultTreatment('Don Sebesky')).toBe('sebesky');
  });

  it('exports valid MIDI track lengths, channels, tempos and every scored note', () => {
    for (const treatment of TREATMENTS) {
      const data = makeMidi(treatment, 104);
      const view = new DataView(data.buffer);
      expect(new TextDecoder().decode(data.slice(0, 4))).toBe('MThd');
      expect(view.getUint16(10)).toBe(treatment.parts.length + 1);
      expect(view.getUint16(12)).toBe(480);
      let offset = 14;
      const played: Array<{ channel: number; pitch: number; tick: number }> = [];
      const variable = () => { let n = 0; let byte: number; do { byte = data[offset++]; n = (n << 7) | (byte & 127); } while (byte & 128); return n; };
      for (let track = 0; track <= treatment.parts.length; track++) {
        expect(new TextDecoder().decode(data.slice(offset, offset + 4))).toBe('MTrk');
        const length = view.getUint32(offset + 4); offset += 8; const end = offset + length;
        let tick = 0;
        while (offset < end) {
          tick += variable(); const status = data[offset++];
          if (status === 255) { offset++; const length = variable(); offset += length; }
          else {
            if ((status & 240) === 144) played.push({ channel: status & 15, pitch: data[offset], tick });
            offset += (status & 240) === 192 ? 1 : 2;
          }
        }
        expect(offset).toBe(end); expect(tick).toBe(32 * 480);
      }
      expect(offset).toBe(data.length);
      const expected = treatment.parts.flatMap((part, index) => part.notes.map((note) => ({ channel: index >= 9 ? index + 1 : index, pitch: midi(note.pitch), tick: Math.round(performedBeat(note.beat, treatment.swing) * 480) })));
      expect(played).toHaveLength(expected.length);
      for (const note of expected) expect(played).toContainEqual(note);
      expect(played.some((note) => note.channel === 9)).toBe(false);
    }
  });

  it('exports complete four-beat MusicXML measures including rests and simultaneous notes', () => {
    for (const treatment of TREATMENTS) {
      const xml = makeMusicXml(treatment, 104);
      const measures = [...xml.matchAll(/<measure number="\d+">([\s\S]*?)<\/measure>/g)];
      expect(measures).toHaveLength(treatment.parts.length * 8);
      for (const [, measure] of measures) {
        const notes = [...measure.matchAll(/<note>([\s\S]*?)<\/note>/g)];
        const duration = notes.filter(([, n]) => !n.includes('<chord/>')).reduce((sum, [, n]) => sum + Number(/<duration>(\d+)<\/duration>/.exec(n)![1]), 0);
        expect(duration).toBe(8);
      }
      expect(xml).not.toContain('<transpose>');
    }
  });
});
