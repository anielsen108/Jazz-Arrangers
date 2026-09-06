/** Scored, deterministic studies. The catalogue makes musical choices explicitly;
 * no artist name, hash, or random seed is used to manufacture a variation. */
import { MELODY, CHORDS, commonMotion, chordDegree, displayPitch, midi, octave, add, part, closeVoicing, type Part, type Treatment } from './orchestraMusic.ts';
import { ARTIST_PLANS } from './orchestraArtists.ts';

export type Instrument = 'flute' | 'clarinet' | 'englishHorn' | 'bassoon' | 'soprano' | 'alto' | 'tenor' | 'bari' | 'trumpet' | 'muted' | 'trombone' | 'horn' | 'tuba' | 'strings' | 'pizzicato' | 'violin' | 'piano' | 'rhodes' | 'vibes' | 'marimba' | 'guitar' | 'electricGuitar' | 'bass' | 'electricBass' | 'harp' | 'accordion' | 'organ' | 'choir' | 'woodblock';
export type Spacing = 'close' | 'drop2' | 'spread' | 'fourths' | 'cluster' | 'sixths';
export type BassFeel = 'walk' | 'two' | 'pedal' | 'funk' | 'latin' | 'tango' | 'broken';
export interface StudyPlan {
  id: string; name: string; title: string; focus: string; listen: string;
  lead: Instrument; choir: string; spacing: Spacing;
  /** Eight bar textures: M moving block, P pad, R riff, C counterpoint, U octave unison, O rests. */
  form: string; bass: BassFeel; keys?: Instrument; counter?: Instrument;
  swing?: number; attacks?: number[]; bassRoute?: number; keyPattern?: 'offbeat' | 'arpeggio' | 'pulse';
  source?: Treatment['source'];
}
type InstrumentSpec = { label: string; sample: string; program: number; family: Part['family']; low: number; high: number; clef?: Part['clef']; shift?: number };
export const INSTRUMENTS: Record<Instrument, InstrumentSpec> = {
  flute: { label: 'Flute', sample: 'flute', program: 73, family: 'woodwind', low: 60, high: 96 },
  clarinet: { label: 'Clarinet', sample: 'clarinet', program: 71, family: 'woodwind', low: 50, high: 89 },
  englishHorn: { label: 'English horn', sample: 'english_horn', program: 69, family: 'woodwind', low: 52, high: 81, shift: -1 },
  bassoon: { label: 'Bassoon', sample: 'bassoon', program: 70, family: 'woodwind', low: 34, high: 75, clef: 'bass', shift: -1 },
  soprano: { label: 'Soprano sax', sample: 'soprano_sax', program: 64, family: 'woodwind', low: 56, high: 88 },
  alto: { label: 'Alto sax', sample: 'alto_sax', program: 65, family: 'woodwind', low: 49, high: 85 },
  tenor: { label: 'Tenor sax', sample: 'tenor_sax', program: 66, family: 'woodwind', low: 44, high: 80, shift: -1 },
  bari: { label: 'Baritone sax', sample: 'baritone_sax', program: 67, family: 'woodwind', low: 36, high: 73, clef: 'bass', shift: -1 },
  trumpet: { label: 'Trumpet', sample: 'trumpet', program: 56, family: 'brass', low: 54, high: 86 },
  muted: { label: 'Muted trumpet', sample: 'muted_trumpet', program: 59, family: 'brass', low: 54, high: 86 },
  trombone: { label: 'Trombone', sample: 'trombone', program: 57, family: 'brass', low: 40, high: 77, clef: 'bass', shift: -1 },
  horn: { label: 'French horn', sample: 'french_horn', program: 60, family: 'brass', low: 41, high: 77, shift: -1 },
  tuba: { label: 'Tuba', sample: 'tuba', program: 58, family: 'brass', low: 28, high: 60, clef: 'bass', shift: -2 },
  strings: { label: 'Strings', sample: 'string_ensemble_1', program: 48, family: 'strings', low: 36, high: 96 },
  pizzicato: { label: 'Pizzicato strings', sample: 'pizzicato_strings', program: 45, family: 'strings', low: 36, high: 84 },
  violin: { label: 'Violin', sample: 'violin', program: 40, family: 'strings', low: 55, high: 96 },
  piano: { label: 'Piano', sample: 'acoustic_grand_piano', program: 0, family: 'rhythm', low: 21, high: 108 },
  rhodes: { label: 'Electric piano', sample: 'electric_piano_1', program: 4, family: 'rhythm', low: 28, high: 96 },
  vibes: { label: 'Vibraphone', sample: 'vibraphone', program: 11, family: 'rhythm', low: 53, high: 89 },
  marimba: { label: 'Marimba', sample: 'marimba', program: 12, family: 'rhythm', low: 48, high: 84 },
  guitar: { label: 'Acoustic guitar', sample: 'acoustic_guitar_nylon', program: 24, family: 'rhythm', low: 40, high: 84 },
  electricGuitar: { label: 'Electric guitar', sample: 'electric_guitar_clean', program: 27, family: 'rhythm', low: 40, high: 84 },
  bass: { label: 'Double bass', sample: 'acoustic_bass', program: 32, family: 'rhythm', low: 28, high: 67, clef: 'bass', shift: -2 },
  electricBass: { label: 'Electric bass', sample: 'electric_bass_finger', program: 33, family: 'rhythm', low: 28, high: 67, clef: 'bass', shift: -2 },
  harp: { label: 'Harp', sample: 'orchestral_harp', program: 46, family: 'strings', low: 36, high: 96 },
  accordion: { label: 'Accordion', sample: 'accordion', program: 21, family: 'woodwind', low: 41, high: 89 },
  organ: { label: 'Organ', sample: 'drawbar_organ', program: 16, family: 'rhythm', low: 36, high: 96 },
  choir: { label: 'Wordless choir', sample: 'choir_aahs', program: 52, family: 'strings', low: 48, high: 81, shift: -1 },
  woodblock: { label: 'Woodblock', sample: 'woodblock', program: 115, family: 'rhythm', low: 60, high: 84 },
};
const voicings: Record<Spacing, string[][]> = {
  close: [ ['B4','G4','E4','D4'], ['Bb4','G4','E4','C#4'], ['C5','A4','F4','E4'], ['B4','A4','F4','E4'], ['E5','C5','A4','G4'], ['D5','C5','Ab4','F4'], ['B4','A4','F4','E4'], ['D5','A4','G4','E4'] ],
  drop2: [ ['B4','G3','E4','D4'], ['Bb4','G3','E4','C#4'], ['C5','A3','F4','E4'], ['B4','A3','F4','E4'], ['E5','C4','A4','G4'], ['D5','C4','Ab4','F4'], ['B4','A3','F4','E4'], ['D5','A3','G4','E4'] ],
  spread: [ ['D5','B4','E4','G3'], ['Bb4','G4','C#4','E3'], ['E5','C5','F4','A3'], ['E5','B4','F4','A3'], ['G5','E5','A4','C4'], ['D5','C5','Ab4','F3'], ['E5','B4','F4','A3'], ['D5','A4','E4','G3'] ],
  fourths: [ ['B4','E4','A3','D3'], ['Bb4','E4','G3','C#3'], ['E5','A4','D4','G3'], ['E5','A4','D4','G3'], ['E5','A4','D4','G3'], ['D5','Ab4','C4','F3'], ['E5','A4','D4','G3'], ['E5','A4','D4','G3'] ],
  cluster: [ ['E5','D5','B4','A4'], ['Bb4','A4','G4','E4'], ['F5','E5','D5','C5'], ['B4','A4','F4','E4'], ['A5','G5','E5','D5'], ['D5','C5','Ab4','F4'], ['F5','E5','D5','B4'], ['E5','D5','C5','A4'] ],
  sixths: [ ['E5','C5','G4','E4'], ['E5','C#5','G4','E4'], ['F5','D5','A4','F4'], ['E5','B4','F4','D4'], ['A5','F5','C5','A4'], ['Ab4','F4','D4','C4'], ['F5','D5','B4','G4'], ['E5','C5','A4','G4'] ],
};
const bassRoots = ['C2','A1','D2','G1','F2','F2','G1','C2'];
const bassFifths = ['G2','E2','A2','D2','C3','C3','D2','G2'];
const walks = [ ['C2','E2','G2','G#2'], ['A2','G2','E2','C#2'], ['D2','F2','A2','Ab2'], ['G2','F2','D2','E2'], ['F2','A2','C3','E2'], ['F2','Ab2','C3','F#2'], ['G2','B2','D3','B1'], ['C2','E2','G2','C2'] ];
const textureNames: Record<string, string> = { M: 'moving harmony', P: 'sustained background', R: 'short rhythmic replies', C: 'independent moving lines', U: 'octave unisons', O: 'section rests' };
const bassDescriptions: Record<BassFeel, string> = { walk: 'quarter-note walking bass', two: 'a root-and-fifth two-beat bass', pedal: 'a held root in each bar', funk: 'a syncopated electric-bass figure', latin: 'an anticipated root-and-fifth bass figure', tango: 'a three-plus-three-plus-two bass accent pattern', broken: 'a broken bass line with room between attacks' };
function fit(pitch: string, instrument: Instrument): string {
  const { low, high } = INSTRUMENTS[instrument];
  while (midi(pitch) < low) pitch = octave(pitch, 1);
  while (midi(pitch) > high) pitch = octave(pitch, -1);
  return pitch;
}
function chair(instrument: Instrument, id: string, label: string, role: string, pan: number, level = 0.6): Part {
  const spec = INSTRUMENTS[instrument];
  return part(id, label, spec.sample, spec.program, spec.family, role, pan, level, spec.clef ?? 'treble');
}
function buildStudy(plan: StudyPlan): Treatment {
  const instruments = plan.choir.split(' ') as Instrument[];
  if (plan.form.length !== 8 || /[^MPRCUO]/.test(plan.form) || instruments.some((i) => !INSTRUMENTS[i])) throw new Error('Invalid study plan: ' + plan.id);
  const leadSpec = INSTRUMENTS[plan.lead];
  const lead = chair(plan.lead, 'lead', leadSpec.label + ' · melody', 'The complete tune' + (leadSpec.shift ? ` · ${Math.abs(leadSpec.shift)} octave${leadSpec.shift === -2 ? 's' : ''} below the reference` : ''), -0.1, 0.9);
  const swing = plan.swing ?? (['walk','two'].includes(plan.bass) ? 2 / 3 : 0.5);
  for (const n of MELODY) add(lead, octave(n.pitch, leadSpec.shift ?? 0), n.beat, n.duration, 0.8, swing > 0.5 ? 0.83 : 0.94);
  const counts: Record<string, number> = {};
  const ensemble = instruments.map((instrument, i) => {
    counts[instrument] = (counts[instrument] ?? 0) + 1;
    const label = INSTRUMENTS[instrument].label + (instruments.filter((n) => n === instrument).length > 1 ? ` ${counts[instrument]}` : '');
    return chair(instrument, `voice-${i + 1}`, label, `${plan.spacing === 'drop2' ? 'Drop-2' : plan.spacing} spacing · ${plan.form.split('').map((c) => textureNames[c]).filter((v, index, a) => a.indexOf(v) === index).join(' / ')}`, -0.65 + i * 1.3 / Math.max(1, instruments.length - 1), 0.54);
  });
  const attacks = plan.attacks ?? [1.5, 3.5];
  for (let bar = 0; bar < 8; bar++) {
    const mode = plan.form[bar];
    const chord = voicings[plan.spacing][bar];
    const velocity = 0.5 + (bar >= 6 ? 0.12 : bar >= 4 ? 0.06 : 0);
    ensemble.forEach((p, i) => {
      const instrument = instruments[i];
      const pitch = fit(i < 4 ? chord[i] : octave(chord[0], -2), instrument);
      if (mode === 'P') add(p, pitch, bar * 4, 4, velocity, 0.96);
      if (mode === 'R') for (const beat of attacks) add(p, pitch, bar * 4 + beat, 0.5, velocity + 0.08, 0.65);
      if (mode === 'M' || mode === 'U') for (const n of MELODY.filter((n) => Math.floor(n.beat / 4) === bar)) {
        const stack = closeVoicing(n.pitch, bar);
        let voice = i < 4 ? stack[i] : octave(n.pitch, -2);
        if (mode === 'U') voice = octave(n.pitch, i > 1 ? -1 : 0);
        else if (plan.spacing === 'drop2' && i === 1) voice = octave(voice, -1);
        else if (plan.spacing === 'spread' && i > 1 && i < 4) voice = octave(voice, -1);
        else if (['fourths', 'cluster', 'sixths'].includes(plan.spacing)) voice = chord[(i + Math.floor(n.beat % 4)) % 4];
        add(p, fit(voice, instrument), n.beat, n.duration, velocity, 0.79);
      }
      if (mode === 'C') {
        // Two independent, rhythmically offset two-note lines per chair; never overlap within a part.
        const start = i % 2 ? 0.5 : 0;
        add(p, pitch, bar * 4 + start, 1, velocity, 0.93);
        add(p, fit(chord[(i + 1) % 4], instrument), bar * 4 + start + 2, 1, velocity + 0.04, 0.9);
      }
    });
  }
  const bassInstrument = plan.bass === 'funk' ? 'electricBass' : 'bass';
  const bass = chair(bassInstrument, 'bass', INSTRUMENTS[bassInstrument].label, bassDescriptions[plan.bass], 0, 0.96);
  for (let bar = 0; bar < 8; bar++) {
    const root = bassRoots[bar], fifth = bassFifths[bar];
    if (plan.bass === 'walk') {
      let line = [...walks[bar]];
      if (plan.bassRoute === 1) line = [line[0], line[2], line[1], line[3]];
      if (plan.bassRoute === 2) line = [line[0], octave(line[2], -1), line[1], line[3]];
      line.forEach((pitch, i) => add(bass, fit(pitch, bassInstrument), bar * 4 + i, 1, i % 2 ? 0.78 : 0.88, 0.87));
    } else if (plan.bass === 'pedal') add(bass, root, bar * 4, 4, 0.78, 0.96);
    else if (plan.bass === 'two') { add(bass, root, bar * 4, 2, 0.83); add(bass, fifth, bar * 4 + 2, 2, 0.74); }
    else {
      const positions = plan.bass === 'funk' ? [0, 1.5, 2, 3.5] : plan.bass === 'latin' ? [0.5, 2, 3.5] : plan.bass === 'tango' ? [0, 1.5, 3] : [0, 2.5];
      positions.forEach((beat, i) => add(bass, i % 2 ? fifth : root, bar * 4 + beat, 0.5, i ? 0.77 : 0.9, plan.bass === 'funk' ? 0.7 : 0.9));
    }
  }
  const parts = [lead, ...ensemble];
  if (plan.counter) {
    const instrument = plan.counter;
    const counter = chair(instrument, 'counter', INSTRUMENTS[instrument].label + ' · answer', 'Independent two-note answer on beats 2 and 4', 0.35, 0.61);
    for (let bar = 0; bar < 8; bar++) if (bar % 2 === 1 || bar >= 4) {
      const chord = voicings[plan.spacing][bar];
      for (const [index, beat] of [1, 3].entries()) add(counter, fit(chord[index + 1], instrument), bar * 4 + beat, 1, 0.6, 0.88);
    }
    parts.push(counter);
  }
  if (plan.keys) {
    const instrument = plan.keys;
    const keys = chair(instrument, 'keys', INSTRUMENTS[instrument].label + ' · accompaniment', plan.keyPattern === 'arpeggio' ? 'Broken chord · quarter notes' : plan.keyPattern === 'pulse' ? 'Even eighth-note pulse' : 'Two-note offbeat comping', -0.3, 0.43);
    for (let bar = 0; bar < 8; bar++) {
      const chord = voicings[plan.spacing][bar];
      if (plan.keyPattern === 'arpeggio' || plan.keyPattern === 'pulse') {
        const step = plan.keyPattern === 'pulse' ? 0.5 : 1;
        for (let beat = 0; beat < 4; beat += step) add(keys, fit(chord[(Math.round(beat / step) + 2) % 4], instrument), bar * 4 + beat, step, 0.48, 0.82);
      } else for (const beat of [1.5, 3]) for (const pitch of chord.slice(2)) add(keys, fit(pitch, instrument), bar * 4 + beat, 0.5, 0.5, 0.8);
    }
    parts.push(keys);
  }
  parts.push(bass);
  const feel = swing >= 0.66 ? 'Swing eighths · 2:1' : swing > 0.5 ? 'Light swing eighths · 3:2' : 'Straight eighths';
  const description = `${plan.focus} This eight-bar setting uses ${bassDescriptions[plan.bass]} beneath ${leadSpec.label.toLowerCase()}.`;
  const annotations = CHORDS.map((_, bar) => {
    const inBar = (p: Part, at: number) => p.notes.filter((n) => n.beat >= at * 4 && n.beat < (at + 1) * 4);
    const first = ensemble.flatMap((p) => { const n = inBar(p, bar)[0]; return n ? [{ p, n }] : []; });
    const pitches = [...first].sort((a, b) => midi(b.n.pitch) - midi(a.n.pitch));
    const stack = pitches.map(({ p, n }) => `${p.label} ${displayPitch(n.pitch)} (${chordDegree(n.pitch, bar)})`).join('; ');
    const bassNotes = inBar(bass, bar).map((n) => displayPitch(n.pitch)).join('–');
    const mode = plan.form[bar];
    const texture = mode === 'M' ? 'The background follows the melody’s attacks, so the harmony moves as a block.' : mode === 'P' ? 'The background holds for the whole bar; the lead articulates against sustained harmony.' : mode === 'R' ? `The section attacks on ${attacks.map((b) => `beat ${Math.floor(b) + 1}${b % 1 ? ' &' : ''}`).join(' and ')}, then releases. Those spaces keep the reply separate from the continuous tune.` : mode === 'C' ? 'Alternate chairs enter half a beat apart, then each changes pitch two beats later. Solo adjacent lines to hear the interlocking movement.' : mode === 'U' ? 'The section follows the tune in unisons and octaves. Harmony is left to the accompanying instruments.' : 'The background section rests for this bar, exposing the tune and rhythm parts.';
    const previous = bar ? ensemble.flatMap((p) => { const before = inBar(p, bar - 1)[0], now = inBar(p, bar)[0]; return before && now ? [`${p.label}: ${displayPitch(before.pitch)} → ${displayPitch(now.pitch)}`] : []; }).slice(0, 3).join('; ') : '';
    const answer = parts.find((p) => p.id === 'counter');
    const answering = answer ? inBar(answer, bar) : [];
    const color = `${texture} ${answering.length ? `${answer!.label} adds ${answering.map((n) => displayPitch(n.pitch)).join('–')} on beats 2 and 4.` : answer ? `${answer.label} rests here, leaving the lead color exposed.` : `The ${leadSpec.label.toLowerCase()} remains the melodic foreground.`}`;
    const classes = new Set(parts.flatMap((p) => inBar(p, bar).map((n) => midi(n.pitch) % 12)));
    let harmonicMotion = commonMotion[bar];
    if (bar === 1 && !classes.has(1)) harmonicMotion = 'The written A7(♭9) leaves its third, C♯, unstated in this bar. Melody B♭ supplies the flat ninth above A in the bass; the next bass root is D.';
    if (bar === 6 && !classes.has(5)) harmonicMotion = 'G13 returns in the harmonic plan, but this voicing omits F, the flat seventh. The melody ends on B, the third of G and a semitone below the final tonic C.';
    if (bar === 7) {
      const finalClasses = new Set(parts.flatMap((p) => p.notes.filter((n) => n.beat <= 30 && n.beat + n.duration * n.gate > 30).map((n) => midi(n.pitch) % 12)));
      harmonicMotion = `D–E–C resolves the melody onto the root. At beat 3, ${finalClasses.has(9) ? 'A retains the sixth' : 'the sixth, A, is omitted'} and ${finalClasses.has(2) ? 'D retains the ninth' : 'the ninth, D, is omitted'}. The chord symbol describes the harmonic plan; the sounding-pitch table shows which colors remain at the cadence.`;
    }
    return {
      voicing: first.length ? `${mode === 'C' ? 'The first entries in each line are' : `At the section’s first attack (beat ${Math.floor(first[0].n.beat % 4) + 1}${first[0].n.beat % 1 ? ' &' : ''}), the voicing is`}: ${stack}. Bass path: ${bassNotes}.` : `The section leaves space. Bass path: ${bassNotes}; inspect the lead and accompaniment to hear how the chord is implied.`,
      color,
      motion: `${harmonicMotion}${previous ? ` Comparing the section’s first entries with the preceding bar: ${previous}.` : ''}`,
      listen: bar === 0 ? plan.listen : mode === 'O' ? `Compare bar ${bar} with this thinner texture; restore the full ensemble to hear what has dropped out.` : bar === 5 ? `Loop bars 5 and 6 by selecting each in turn. Locate A♭ in the sounding-pitch table and hear how this ${plan.name} study treats the minor turn.` : `${bar === 7 ? 'At the cadence, solo' : 'Solo'} ${ensemble.slice(0, 2).map((p) => p.label).join(' and ')} for the ${textureNames[mode]}; then add ${bass.label.toLowerCase()} and the melody.`,
    };
  });
  return { id: plan.id, name: plan.name, title: plan.title, description, feel, swing, parts, annotations, melodyParts: ['lead'], melodyOctave: leadSpec.shift ?? 0, source: plan.source };
}
export function createArtistTreatments(): Treatment[] { return ARTIST_PLANS.map(buildStudy); }
