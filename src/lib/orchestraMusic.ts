/** Original teaching music. All pitches are sounding pitches; C4 = MIDI 60. */
export type StyleId = string;
export type Family = 'lead' | 'woodwind' | 'brass' | 'strings' | 'rhythm';
export interface Note { beat: number; duration: number; pitch: string; velocity: number; gate: number }
export interface Part {
  id: string; label: string; instrument: string; program: number; family: Family;
  role: string; pan: number; level: number; clef: 'treble' | 'bass'; notes: Note[];
}
export interface Annotation { voicing: string; color: string; motion: string; listen: string }
export interface Treatment {
  id: StyleId; name: string; title: string; description: string; feel: string;
  swing: number; parts: Part[]; annotations: Annotation[];
  melodyParts?: string[]; melodyOctave?: number; source?: { title: string; url: string };
}
export const TOTAL_BEATS = 32;
export const CHORDS: Array<{ symbol: string; root: number; function: string; tones: Partial<Record<number, string>> }> = [
  { symbol: 'Cmaj9', root: 0, function: 'I · tonic', tones: { 0: 'root', 2: '9', 4: '3', 7: '5', 9: '13', 11: 'maj7' } },
  { symbol: 'A7(♭9)', root: 9, function: 'V/ii · secondary dominant', tones: { 9: 'root', 10: '♭9', 1: '3', 4: '5', 7: '♭7' } },
  { symbol: 'Dm9', root: 2, function: 'ii · predominant', tones: { 2: 'root', 4: '9', 5: '♭3', 7: '11', 9: '5', 0: '♭7' } },
  { symbol: 'G13', root: 7, function: 'V · dominant', tones: { 7: 'root', 9: '9', 11: '3', 2: '5', 4: '13', 5: '♭7' } },
  { symbol: 'Fmaj9', root: 5, function: 'IV · subdominant', tones: { 5: 'root', 7: '9', 9: '3', 0: '5', 2: '13', 4: 'maj7' } },
  { symbol: 'Fm6', root: 5, function: 'iv · borrowed minor', tones: { 5: 'root', 8: '♭3', 0: '5', 2: '6' } },
  { symbol: 'G13', root: 7, function: 'V · dominant', tones: { 7: 'root', 9: '9', 11: '3', 2: '5', 4: '13', 5: '♭7' } },
  { symbol: 'C6/9', root: 0, function: 'I · resolution', tones: { 0: 'root', 2: '9', 4: '3', 7: '5', 9: '6' } },
];
const pitchClasses: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(pitch: string): number {
  const match = /^([A-G])([b#]?)(-?\d)$/.exec(pitch);
  if (!match) throw new Error(`Invalid pitch: ${pitch}`);
  return (Number(match[3]) + 1) * 12 + pitchClasses[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
}
export const displayPitch = (pitch: string) => pitch.replace('b', '♭').replace('#', '♯');
export const octave = (pitch: string, shift: number) => pitch.replace(/-?\d$/, (value) => String(Number(value) + shift));
export function chordDegree(pitch: string, bar: number): string {
  return CHORDS[bar].tones[midi(pitch) % 12] ?? 'passing tone';
}
export function performedBeat(beat: number, swing: number): number {
  const whole = Math.floor(beat);
  const fraction = beat - whole;
  return whole + (fraction <= 0.5 ? fraction * 2 * swing : swing + (fraction - 0.5) * 2 * (1 - swing));
}
export function writtenBeat(beat: number, swing: number): number {
  const whole = Math.floor(beat);
  const fraction = beat - whole;
  return whole + (fraction <= swing ? fraction / (2 * swing) : 0.5 + (fraction - swing) / (2 * (1 - swing)));
}
export const phrases: Array<Array<[string, number]>> = [
  [['E5', 1], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['D5', 1]],
  [['E5', 1], ['G5', 0.5], ['Bb5', 0.5], ['A5', 1], ['E5', 1]],
  [['F5', 1], ['E5', 0.5], ['D5', 0.5], ['A4', 1], ['C5', 1]],
  [['B4', 1], ['D5', 0.5], ['E5', 0.5], ['F5', 1], ['D5', 1]],
  [['E5', 1], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1]],
  [['D5', 1], ['C5', 0.5], ['Ab4', 0.5], ['C5', 1], ['D5', 1]],
  [['E5', 1], ['D5', 0.5], ['B4', 0.5], ['A4', 1], ['B4', 1]],
  [['D5', 1], ['E5', 1], ['C5', 2]],
];
export const MELODY: Note[] = phrases.flatMap((phrase, bar) => {
  let beat = bar * 4;
  return phrase.map(([pitch, duration]) => {
    const note = { beat, duration, pitch, velocity: 0.8, gate: 0.9 };
    beat += duration;
    return note;
  });
});
// Four independent sustained string lines, high to low. The cello opens the bottom.
export const pads = [
  ['B4', 'G4', 'E4', 'D3'], ['Bb4', 'G4', 'E4', 'C#3'],
  ['C5', 'A4', 'F4', 'E3'], ['B4', 'A4', 'F4', 'E3'],
  ['E5', 'C5', 'A4', 'G3'], ['D5', 'C5', 'Ab4', 'F3'],
  ['B4', 'A4', 'F4', 'E3'], ['D5', 'A4', 'E4', 'C3'],
];
export const roots = ['C2', 'A2', 'D2', 'G2', 'F2', 'F2', 'G2', 'C2'];
export const shells = [ ['E3', 'B3'], ['C#3', 'G3'], ['F3', 'C4'], ['B2', 'F3'], ['A2', 'E3'], ['Ab2', 'D3'], ['B2', 'F3'], ['E3', 'A3'] ];
export const chordSpellings = [ ['C', 'D', 'E', 'G', 'B'], ['A', 'Bb', 'C#', 'E', 'G'], ['D', 'E', 'F', 'A', 'C'], ['G', 'A', 'B', 'D', 'E', 'F'], ['F', 'G', 'A', 'C', 'E'], ['F', 'Ab', 'C', 'D'], ['G', 'A', 'B', 'D', 'E', 'F'], ['C', 'D', 'E', 'G', 'A'] ];
export function closeVoicing(lead: string, bar: number): string[] {
  const below = chordSpellings[bar].flatMap((name) => [3, 4, 5].map((register) => `${name}${register}`))
    .filter((pitch) => midi(pitch) < midi(lead) && ([5, 7].includes(bar) || midi(pitch) % 12 !== CHORDS[bar].root))
    .sort((a, b) => midi(b) - midi(a));
  return [lead, ...below.slice(0, 3)];
}
export function part(id: string, label: string, instrument: string, program: number, family: Family, role: string, pan: number, level = 0.7, clef: 'treble' | 'bass' = 'treble'): Part {
  return { id, label, instrument, program, family, role, pan, level, clef, notes: [] };
}
export function add(target: Part, pitch: string, beat: number, duration: number, velocity = 0.65, gate = 0.92) {
  target.notes.push({ pitch, beat, duration, velocity, gate });
}
export function melody(target: Part, when = (_bar: number) => true, transpose = 0, velocity = 0.8, gate = 0.9) {
  MELODY.filter((n) => when(Math.floor(n.beat / 4))).forEach((n) => add(target, octave(n.pitch, transpose), n.beat, n.duration, velocity, gate));
}
export const commonMotion = [
  'The opening E is the third. G–A–G makes the sixth a brief neighbor before the melody lands on D, the ninth.',
  'C♯ in the accompaniment makes A a dominant. B♭ supplies the flat ninth. The root moves from A to D in the next bar, changing the altered dominant into a minor ninth chord.',
  'The melody descends F–E–D, then A–C. The E is the ninth, so it can sing against the minor chord without being treated as a wrong note.',
  'B and F are the third and flat seventh. E adds the thirteenth; it does not replace the F that establishes dominant quality.',
  'The repeated opening contour now begins on the major seventh of F. The same melody takes on a different harmonic role.',
  'A becomes A♭ as IV turns to iv. D stays natural: it is the sixth of F minor, not a dominant seventh.',
  'B and F restore the dominant tritone. The melody ends on B, a semitone below the final tonic C.',
  'D–E–C resolves onto the root. A supplies the sixth; compare which treatments retain D in the accompaniment after the melody leaves the ninth.',
];
export const annotate = (v: string[], c: string[], l: string[]): Annotation[] => commonMotion.map((motion, i) => ({ motion, voicing: v[i], color: c[i], listen: l[i] }));
export function soundingNotes(parts: Part[], beat: number) {
  return parts.flatMap((p) => p.notes.filter((n) => n.beat <= beat && n.beat + n.duration * n.gate > beat)
    .map((n) => ({ part: p, note: n }))).sort((a, b) => midi(b.note.pitch) - midi(a.note.pitch));
}
