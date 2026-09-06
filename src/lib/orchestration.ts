/** Original teaching music. All pitches are sounding pitches; C4 = MIDI 60. */
export type StyleId = 'sebesky' | 'nestico' | 'evans';
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
}
export const TOTAL_BEATS = 32;
export const CHORDS: Array<{ symbol: string; root: number; function: string; tones: Partial<Record<number, string>> }> = [
  { symbol: 'Cmaj9', root: 0, function: 'I · tonic', tones: { 0: 'root', 2: '9', 4: '3', 7: '5', 9: '13', 11: 'maj7' } },
  { symbol: 'A7(♭9)', root: 9, function: 'V/ii · secondary dominant', tones: { 9: 'root', 10: '♭9', 1: '3', 4: '5', 7: '♭7' } },
  { symbol: 'Dm9', root: 2, function: 'ii · predominant', tones: { 2: 'root', 4: '9', 5: '♭3', 9: '5', 0: '♭7' } },
  { symbol: 'G13', root: 7, function: 'V · dominant', tones: { 7: 'root', 9: '9', 11: '3', 2: '5', 4: '13', 5: '♭7' } },
  { symbol: 'Fmaj9', root: 5, function: 'IV · subdominant', tones: { 5: 'root', 7: '9', 9: '3', 0: '5', 4: 'maj7' } },
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
const phrases: Array<Array<[string, number]>> = [
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
const pads = [
  ['B4', 'G4', 'E4', 'D3'], ['Bb4', 'G4', 'E4', 'C#3'],
  ['C5', 'A4', 'F4', 'E3'], ['B4', 'A4', 'F4', 'E3'],
  ['E5', 'C5', 'A4', 'G3'], ['D5', 'C5', 'Ab4', 'F3'],
  ['B4', 'A4', 'F4', 'E3'], ['D5', 'A4', 'E4', 'C3'],
];
const roots = ['C2', 'A2', 'D2', 'G2', 'F2', 'F2', 'G2', 'C2'];
const shells = [ ['E3', 'B3'], ['C#3', 'G3'], ['F3', 'C4'], ['B2', 'F3'], ['A2', 'E3'], ['Ab2', 'D3'], ['B2', 'F3'], ['E3', 'A3'] ];
const chordSpellings = [ ['C', 'D', 'E', 'G', 'B'], ['A', 'Bb', 'C#', 'E', 'G'], ['D', 'E', 'F', 'A', 'C'], ['G', 'A', 'B', 'D', 'E', 'F'], ['F', 'G', 'A', 'C', 'E'], ['F', 'Ab', 'C', 'D'], ['G', 'A', 'B', 'D', 'E', 'F'], ['C', 'D', 'E', 'G', 'A'] ];
function closeVoicing(lead: string, bar: number): string[] {
  const below = chordSpellings[bar].flatMap((name) => [3, 4, 5].map((register) => `${name}${register}`))
    .filter((pitch) => midi(pitch) < midi(lead) && ([5, 7].includes(bar) || midi(pitch) % 12 !== CHORDS[bar].root))
    .sort((a, b) => midi(b) - midi(a));
  return [lead, ...below.slice(0, 3)];
}
function part(id: string, label: string, instrument: string, program: number, family: Family, role: string, pan: number, level = 0.7, clef: 'treble' | 'bass' = 'treble'): Part {
  return { id, label, instrument, program, family, role, pan, level, clef, notes: [] };
}
function add(target: Part, pitch: string, beat: number, duration: number, velocity = 0.65, gate = 0.92) {
  target.notes.push({ pitch, beat, duration, velocity, gate });
}
function melody(target: Part, when = (_bar: number) => true, transpose = 0, velocity = 0.8, gate = 0.9) {
  MELODY.filter((n) => when(Math.floor(n.beat / 4))).forEach((n) => add(target, octave(n.pitch, transpose), n.beat, n.duration, velocity, gate));
}
function sebeskyParts(): Part[] {
  const parts = [
    part('flute', 'Flute', 'flute', 73, 'lead', 'Melody · light upper register', -0.2, 0.95),
    part('english-horn', 'English horn', 'english_horn', 69, 'woodwind', 'Octave color · enters in bar 5', 0.2, 0.5),
    part('vln1', 'Violins I', 'string_ensemble_1', 48, 'strings', 'Upper extension · sustained', -0.65, 0.6),
    part('vln2', 'Violins II', 'string_ensemble_1', 48, 'strings', 'Inner string voice', -0.3, 0.5),
    part('viola', 'Violas', 'string_ensemble_1', 48, 'strings', 'Third / seventh · middle register', 0.3, 0.5),
    part('cello', 'Cellos', 'string_ensemble_1', 48, 'strings', 'Open lower voice', 0.6, 0.55, 'bass'),
    part('horn', 'French horn', 'french_horn', 60, 'brass', 'Inner-voice reinforcement · bars 3–8', 0.1, 0.4),
    part('keys', 'Electric piano', 'electric_piano_1', 4, 'rhythm', 'Rootless offbeat punctuation', -0.4, 0.5),
    part('bass', 'Electric bass', 'electric_bass_finger', 33, 'rhythm', 'Root and fifth · two-beat foundation', 0, 0.9, 'bass'),
  ];
  melody(parts[0]); melody(parts[1], (bar) => bar >= 4, -1, 0.6);
  pads.forEach((notes, bar) => {
    notes.forEach((pitch, voice) => add(parts[voice + 2], pitch, bar * 4, 4, 0.55 + bar * 0.018, 0.98));
    if (bar >= 2) add(parts[6], notes[2], bar * 4, 4, 0.55, 0.94);
    for (const beat of [1.5, 3]) for (const pitch of shells[bar]) add(parts[7], octave(pitch, 1), bar * 4 + beat, 0.5, 0.55, 0.85);
    add(parts[8], roots[bar], bar * 4, 2, 0.85);
    const fifths = ['G2', 'E3', 'A2', 'D3', 'C3', 'C3', 'D3', 'G2'];
    add(parts[8], fifths[bar], bar * 4 + 2, 2, 0.7);
  });
  return parts;
}
function nesticoParts(): Part[] {
  const parts = [
    part('alto1', 'Alto sax 1', 'alto_sax', 65, 'woodwind', 'Lead of the four-part sax block', -0.6, 0.9),
    part('alto2', 'Alto sax 2', 'alto_sax', 65, 'woodwind', 'Second voice in close position', -0.3, 0.55),
    part('tenor1', 'Tenor sax 1', 'tenor_sax', 66, 'woodwind', 'Third voice in close position', 0.1, 0.55),
    part('tenor2', 'Tenor sax 2', 'tenor_sax', 66, 'woodwind', 'Fourth voice in close position', 0.35, 0.55),
    part('bari', 'Baritone sax', 'baritone_sax', 67, 'woodwind', 'Lead doubled two octaves below', 0.6, 0.65, 'bass'),
    part('tpt1', 'Trumpet 1', 'trumpet', 56, 'brass', 'Answers; takes melody in bars 5, 6, 8', -0.3, 0.75),
    part('tpt2', 'Trumpet 2', 'trumpet', 56, 'brass', 'Upper brass harmony', 0.3, 0.45),
    part('tbn1', 'Trombone 1', 'trombone', 57, 'brass', 'Open lower brass voice', -0.15, 0.55, 'bass'),
    part('tbn2', 'Trombone 2', 'trombone', 57, 'brass', 'Open lower brass voice', 0.15, 0.55, 'bass'),
    part('piano', 'Piano', 'acoustic_grand_piano', 0, 'rhythm', 'Short guide-tone replies', -0.4, 0.5, 'bass'),
    part('bass', 'Double bass', 'acoustic_bass', 32, 'rhythm', 'Quarter-note walking line', 0, 0.95, 'bass'),
  ];
  const brassLead = (bar: number) => [4, 5, 7].includes(bar);
  for (const n of MELODY) {
    const bar = Math.floor(n.beat / 4);
    const voices = closeVoicing(n.pitch, bar);
    if (!brassLead(bar)) {
      voices.forEach((pitch, i) => add(parts[i], pitch, n.beat, n.duration, i ? 0.62 : 0.85, 0.77));
      add(parts[4], octave(n.pitch, -2), n.beat, n.duration, 0.68, 0.77);
    } else {
      voices.forEach((pitch, i) => add(parts[5 + i], octave(pitch, i > 1 ? -1 : 0), n.beat, n.duration, i ? 0.65 : 0.88, 0.8));
    }
  }
  for (let bar = 0; bar < 8; bar++) {
    if (!brassLead(bar)) {
      const last = phrases[bar].at(-1)![0];
      closeVoicing(last, bar).forEach((pitch, i) => add(parts[5 + i], octave(pitch, i > 1 ? -1 : 0), bar * 4 + 3.5, 0.5, 0.6, 0.65));
    } else {
      const voices = closeVoicing(phrases[bar][0][0], bar);
      voices.forEach((pitch, i) => add(parts[i], pitch, bar * 4, 2, 0.46, 0.9));
      add(parts[4], octave(voices[0], -2), bar * 4, 2, 0.5, 0.9);
    }
    for (const pitch of shells[bar]) add(parts[9], pitch, bar * 4 + 2.5, 0.5, 0.6, 0.65);
  }
  const walking = [ ['C2', 'E2', 'G2', 'G#2'], ['A2', 'C#3', 'E3', 'C#3'], ['D3', 'F2', 'A2', 'Ab2'], ['G2', 'B2', 'D3', 'E2'], ['F2', 'A2', 'C3', 'E2'], ['F2', 'Ab2', 'C3', 'F#2'], ['G2', 'B2', 'D3', 'B1'], ['C2', 'E2', 'G2', 'C2'] ];
  walking.forEach((notes, bar) => notes.forEach((pitch, beat) => add(parts[10], pitch, bar * 4 + beat, 1, beat ? 0.75 : 0.9, 0.87)));
  return parts;
}
function evansParts(): Part[] {
  const parts = [
    part('trumpet', 'Muted trumpet', 'muted_trumpet', 59, 'lead', 'Melody · centered, restrained', -0.15, 0.85),
    part('flute', 'Flute', 'flute', 73, 'woodwind', 'Unison lead color · bars 3, 4, 7, 8', 0.25, 0.45),
    part('horn1', 'French horn 1', 'french_horn', 60, 'brass', 'Upper middle voice', -0.45, 0.65),
    part('horn2', 'French horn 2', 'french_horn', 60, 'brass', 'Lower middle voice', -0.1, 0.6),
    part('bassoon', 'Bassoon', 'bassoon', 70, 'woodwind', 'Low reed · third / seventh', 0.45, 0.65, 'bass'),
    part('tuba', 'Tuba', 'tuba', 58, 'brass', 'Sustained root · open foundation', 0.2, 0.7, 'bass'),
    part('vibes', 'Vibraphone', 'vibraphone', 11, 'rhythm', 'Upper extension · two quiet attacks', -0.5, 0.4),
  ];
  melody(parts[0], () => true, 0, 0.75, 0.91);
  melody(parts[1], (bar) => [2, 3, 6, 7].includes(bar), 0, 0.55, 0.91);
  const middle = [ ['D4', 'B3', 'E3'], ['Bb3', 'G3', 'C#3'], ['E4', 'C4', 'F3'], ['A3', 'F3', 'B2'], ['G4', 'E4', 'A3'], ['D4', 'C4', 'Ab3'], ['A3', 'F3', 'B2'], ['D4', 'A3', 'E3'] ];
  middle.forEach((notes, bar) => {
    notes.forEach((pitch, i) => add(parts[2 + i], pitch, bar * 4, 4, 0.58, 0.94));
    add(parts[5], ['C2', 'A1', 'D2', 'G1', 'F2', 'F2', 'G1', 'C2'][bar], bar * 4, 4, 0.65, 0.93);
    if ([1, 5].includes(bar)) add(parts[6], octave(notes[0], 1), bar * 4 + 2, 2, 0.52, 0.9);
  });
  return parts;
}
const commonMotion = [
  'The opening E is the third. G–A–G makes the sixth a brief neighbor before the melody lands on D, the ninth.',
  'C♯ in the accompaniment makes A a dominant. B♭ supplies the flat ninth. The root moves from A to D in the next bar, changing the altered dominant into a minor ninth chord.',
  'The melody descends F–E–D, then A–C. The E is the ninth, so it can sing against the minor chord without being treated as a wrong note.',
  'B and F are the third and flat seventh. E adds the thirteenth; it does not replace the F that establishes dominant quality.',
  'The repeated opening contour now begins on the major seventh of F. The same melody takes on a different harmonic role.',
  'A becomes A♭ as IV turns to iv. D stays natural: it is the sixth of F minor, not a dominant seventh.',
  'B and F restore the dominant tritone. The melody ends on B, a semitone below the final tonic C.',
  'D–E–C resolves onto the root. A supplies the sixth; compare which treatments retain D in the accompaniment after the melody leaves the ninth.',
];
const annotate = (v: string[], c: string[], l: string[]): Annotation[] => commonMotion.map((motion, i) => ({ motion, voicing: v[i], color: c[i], listen: l[i] }));
export const TREATMENTS: Treatment[] = [
  {
    id: 'sebesky', name: 'Don Sebesky', title: 'Strings with a woodwind edge', feel: 'Straight eighths', swing: 0.5,
    description: 'A reduced studio orchestra: a flute melody over four sustained string lines, with horn reinforcement and an English horn octave entering as the phrase grows.',
    parts: sebeskyParts(),
    annotations: annotate([
      'The strings hold B4–G4–E4 above D3, with C2 in the bass. Opening the gap between cello and viola keeps the low ninth out of a tight cluster; the upper strings supply maj7, 5 and 3.',
      'B♭4–G4–E4 sit over C♯3 and A2. Each note has a job: flat ninth, flat seventh, fifth, third and root. The bass and cello are a tenth apart.',
      'C5–A4–F4 over E3 places the seventh, fifth and minor third in the upper strings, with the ninth down in the cello. Compare the exposed E3 with the flute’s passing E5.',
      'B4–A4–F4 over E3 leaves the root to the bass. The inner A4–B4 second is high enough to read as color, while F4 and B4 state the dominant tritone.',
      'E5–C5–A4 over G3 makes a rootless Fmaj9 string pad. E5 now meets the flute in unison at the opening; the English horn enters an octave below at E4.',
      'D5–C5–A♭4 over F3 changes the color with little inner movement. C5 is retained from bar 5 and A4 falls to A♭4; the upper E5 falls to D5.',
      'The return to B4–A4–F4 over E3 brings back the dominant color. Hear the larger downward moves out of the F-minor pad before the final release.',
      'D5–A4–E4 over C3 supports the final C5. The strings retain 9 and 6 above a stable root; the viola moves F4–E4 from the previous bar.',
    ], [
      'Flute gives the phrase a clear front edge; the slower string attacks carry the harmony underneath. Electric piano only punctuates the offbeats.',
      'The same instrumental balance exposes the altered harmony without making the orchestration louder. The cello carries the defining C♯.',
      'French horn enters on F4, doubling the viola exactly. Solo these two parts together to hear the reinforcement of one inner voice.',
      'The horn follows the viola on F4 while violins II sustain A4. This keeps the added brass weight inside the string chord.',
      'English horn E4 doubles flute E5 an octave below. Its reed attack gives the melody more body as the upper string voice briefly joins the flute.',
      'Flute A♭4 and English horn A♭3 preserve the octave at the low point of the melody. The lower register makes the double-reed color more prominent.',
      'The English horn remains below the flute; horn and viola remain in unison. Two separate doublings reinforce melody and inner harmony.',
      'The string pad holds through the final melody C. The electric bass moves C2–G2, so the end stays gently active beneath the sustained upper chord.',
    ], [
      'Solo the four string parts, then add the flute. Compare a clear melodic attack with a sustained harmonic bed.',
      'Solo cello and bass to hear A2 beneath C♯3, then add violins I for B♭4.',
      'Mute the horn, then restore it. The pitches stay the same; the middle-register weight changes.',
      'Solo violins I and II for the B4–A4 second. Add cello to hear how the spacing opens underneath.',
      'Mute the English horn and compare the first half of the phrase with its newly doubled return.',
      'Solo violas across bars 5–6 to hear A4 become A♭4 while violins II hold C5.',
      'Compare this bar with bar 4: the harmony returns, but the English horn is now part of the melody.',
      'Solo the string quartet for the final voicing, then add the flute’s D–E–C resolution.',
    ]),
  },
  {
    id: 'nestico', name: 'Sammy Nestico', title: 'A saxophone call, a brass reply', feel: 'Swing eighths · 2:1', swing: 2 / 3,
    description: 'Five saxophones, four brass voices, piano and walking bass. Close reed writing gives way to an open brass lead in bars 5, 6 and 8; short replies leave room around each phrase.',
    parts: nesticoParts(),
    annotations: annotate([
      'The sax block opens E5–D5–B4–G4, with baritone on E3. Four upper voices move with the lead; the baritone reinforces its contour two octaves below.',
      'The opening reed stack is E5–C♯5–B♭4–G4 over baritone E3 and walking bass A2. The moving block preserves the altered dominant’s C♯ and B♭.',
      'F5–E5–C5–A4 puts a close second directly below the lead. The third and ninth are neighbors high in the sax section; the bass provides D.',
      'B4–A4–F4–E4 packs the dominant color into the reeds. Inspect later beats as the inner notes are reharmonized beneath the descending and rising lead.',
      'Brass takes the opening E5–C5–A3–G3. Dropping the lower two voices an octave separates the trombone register from the two trumpets.',
      'The brass lead begins D5–C5–A♭3–F3. The low A♭ makes the minor turn explicit while the trumpets carry the sixth and fifth.',
      'Saxes return with E5–D5–B4–A4 and baritone E3. The bass supplies G; the piano’s later B2–F3 punctuation makes the dominant tritone explicit.',
      'The brass starts D5–C5–A3–G3 and follows the lead to C5–A4–G3–E3. Read beat 3 to inspect the actual final chord rather than just the opening stack.',
    ], [
      'Two altos and two tenors act as one moving choir. A short brass answer arrives on the last offbeat, overlapping the end of the saxophone phrase.',
      'The saxophones carry the altered notes together. A crisp release keeps this dense sonority from spilling into the next chord.',
      'The baritone is a melodic doubling, not a substitute for the walking bass. Solo both to hear their different rhythms and register paths.',
      'Brass waits until the last offbeat. Its short answer frames the lead without continuously doubling it.',
      'Trumpets take over the moving melody while saxophones sustain a quiet two-beat background and then rest.',
      'The brass keeps its register separation through the minor chord. Lower voices add weight; the lead trumpet maintains a clear top edge.',
      'Returning to the reeds after two brass-led bars changes the foreground color even though the tune remains continuous.',
      'The final melody returns to brass. Saxes release halfway through the bar, leaving the trumpet/trombone stack and bass to finish.',
    ], [
      'Solo saxophones. Add baritone, then brass, and notice which part changes weight and which changes the conversation.',
      'Follow the B♭ lead note on beat 2-and. The flat ninth is a deliberate melodic accent.',
      'Solo baritone and double bass to distinguish melody reinforcement from harmonic foundation.',
      'Loop this bar and listen for the brass pickup on beat 4-and.',
      'Compare trumpet 1 and alto sax 1: the trumpet moves while the sax sustains, then leaves space.',
      'Solo both trombones for A♭3 and F3 at the opening, then add the upper brass.',
      'Solo piano and bass to hear how little accompaniment is needed to establish the chord.',
      'Inspect beat 3 for the final C6 sound in brass, then replay the full ensemble.',
    ]),
  },
  {
    id: 'evans', name: 'Gil Evans', title: 'A melody above a mixed choir', feel: 'Straight eighths · broad releases', swing: 0.5,
    description: 'Muted trumpet over two horns, bassoon and tuba. Flute enters selectively in unison with the lead; a few vibraphone notes illuminate the upper extensions.',
    parts: evansParts(),
    annotations: annotate([
      'Horns hold D4 and B3 above bassoon E3 and tuba C2. The root-to-third interval at the bottom is open; the ninth is placed at the top of the accompaniment.',
      'B♭3–G3 in the horns sit above C♯3 in bassoon and A1 in tuba. The dominant is complete without filling every octave between bass and melody.',
      'Horns E4–C4 and bassoon F3 form the 9–7–3 above tuba D2. The flute doubles the trumpet’s F5, separate from this slower moving inner choir.',
      'Horns A3–F3, bassoon B2 and tuba G1 spell 9–7–3–root. The missing fifth leaves room for the lead and avoids thickening the lowest register.',
      'Horns G4–E4 rise above bassoon A3 and tuba F2. The large lower gap opens the sound as the melody returns to its first contour.',
      'D4–C4 in horns and A♭3 in bassoon sit above tuba F2. The horns move G4–D4 and E4–C4, while the bassoon lowers A3 to A♭3.',
      'A3–F3 over B2–G1 restores the lower dominant stack. With flute back in unison, the brighter lead contrasts with the darker accompaniment.',
      'Horns D4–A3 and bassoon E3 over C2 retain 9, 6 and 3. The trumpet resolves above them to C5 without making the middle choir move rhythmically.',
    ], [
      'The bassoon’s reed sound is placed between tuba weight and horn warmth. These instruments share the same slow harmonic rhythm.',
      'Vibraphone enters on B♭4 at beat 3, adding a struck attack to the horn’s B♭3. Its decay changes the emphasis of a held pitch.',
      'Flute enters in exact unison with muted trumpet. Solo each, then combine them to compare the bright edge with the breathier component.',
      'Flute and trumpet continue in unison; the inner choir stays still while the melody articulates the beat.',
      'The flute rests. That subtraction exposes the muted trumpet as the accompanying horns move upward.',
      'Vibraphone D5 enters on beat 3 above horn D4. Its brief shimmer emphasizes the sixth of the minor chord.',
      'The returning flute adds brightness without adding another harmony note to the lead.',
      'Flute and trumpet finish together while each lower instrument sustains its own chord member. The final color comes from the spacing and blend.',
    ], [
      'Solo horns, bassoon and tuba. Hear the chord as one combined color, then separate the instruments.',
      'Loop the bar with vibraphone muted, then restore it for the attack on beat 3.',
      'Solo flute and trumpet together, then mute either one to hear the components of the unison.',
      'Solo bassoon and tuba for B2 over G1; add the horns for the complete dominant.',
      'Compare bars 4 and 5 to hear both the change of register and the flute’s withdrawal.',
      'Solo bassoon across bars 5–6 for A3–A♭3, then add the horn voices D4 and C4 in bar 6.',
      'Mute flute and compare the foreground with bar 5; restore it without changing the chord.',
      'Solo the lower choir, then add the lead’s resolution to C5.',
    ]),
  },
];
export const defaultTreatment = (arrangerName: string): StyleId => /nestico/i.test(arrangerName) ? 'nestico' : /gil evans/i.test(arrangerName) ? 'evans' : 'sebesky';
export function soundingNotes(parts: Part[], beat: number) {
  return parts.flatMap((p) => p.notes.filter((n) => n.beat <= beat && n.beat + n.duration * n.gate > beat)
    .map((n) => ({ part: p, note: n }))).sort((a, b) => midi(b.note.pitch) - midi(a.note.pitch));
}
