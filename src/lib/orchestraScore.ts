import { CHORDS, displayPitch, midi, performedBeat, type Note, type Part, type Treatment } from './orchestraMusic';

const esc = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const step = (pitch: string) => Number(pitch.slice(-1)) * 7 + 'CDEFGAB'.indexOf(pitch[0]);

/** Small concert-pitch part score. Every rendered event comes from the played part. */
export function measureSvg(notes: Note[], bar: number, clef: 'treble' | 'bass', label: string): string {
  const events = notes.filter((note) => Math.floor(note.beat / 4) === bar);
  const bottom = clef === 'treble' ? step('E4') : step('G2');
  const yAt = (pitch: string) => 102 - (step(pitch) - bottom) * 5;
  let out = `<svg viewBox="0 0 280 178" role="img" aria-label="${esc(label)}, bar ${bar + 1}, ${esc(CHORDS[bar].symbol)}"><title>${esc(events.map((n) => `${displayPitch(n.pitch)} beat ${n.beat % 4 + 1}, ${n.duration} beats`).join('; ') || 'Whole-bar rest')}</title>`;
  out += `<text x="12" y="20" class="score-bar-number">${bar + 1}</text><text x="58" y="23" class="score-chord">${CHORDS[bar].symbol}</text>`;
  for (let i = 0; i < 5; i++) out += `<line x1="10" y1="${102 - i * 10}" x2="277" y2="${102 - i * 10}" class="staff-line"/>`;
  out += `<line x1="277" y1="62" x2="277" y2="102" class="staff-line"/><text x="12" y="${clef === 'treble' ? 98 : 91}" class="score-clef">${clef === 'treble' ? '𝄞' : '𝄢'}</text>`;
  const groups = new Map<number, Note[]>();
  for (const event of events) {
    if (!groups.has(event.beat)) groups.set(event.beat, []);
    groups.get(event.beat)!.push(event);
  }
  const accidentalState = new Map<string, string>();
  const rests: Array<[number, number]> = [];
  let cursor = bar * 4;
  for (const [beat, group] of [...groups].sort(([a], [b]) => a - b)) {
    if (beat > cursor) rests.push([cursor, beat - cursor]);
    cursor = Math.max(cursor, beat + Math.max(...group.map((n) => n.duration)));
    const x = 63 + (beat % 4) * 51;
    const sorted = [...group].sort((a, b) => midi(a.pitch) - midi(b.pitch));
    let priorY = 999;
    for (const note of sorted) {
      const y = yAt(note.pitch);
      const nx = x + (Math.abs(y - priorY) === 5 ? 10 : 0);
      priorY = y;
      for (let ly = 112; ly <= y; ly += 10) out += `<line x1="${nx - 10}" y1="${ly}" x2="${nx + 10}" y2="${ly}" class="ledger"/>`;
      for (let ly = 52; ly >= y; ly -= 10) out += `<line x1="${nx - 10}" y1="${ly}" x2="${nx + 10}" y2="${ly}" class="ledger"/>`;
      const accidental = note.pitch.includes('#') ? '♯' : note.pitch.includes('b') ? '♭' : '';
      const key = note.pitch[0] + note.pitch.slice(-1);
      const prior = accidentalState.get(key) ?? '';
      if (accidental !== prior) out += `<text x="${nx - 20}" y="${y + 5}" class="score-accidental">${accidental || '♮'}</text>`;
      accidentalState.set(key, accidental);
      out += `<g data-note-beat="${note.beat}" data-note-end="${note.beat + note.duration * note.gate}"><ellipse cx="${nx}" cy="${y}" rx="${note.duration === 4 ? 7.5 : 6.1}" ry="4.2" transform="rotate(-18 ${nx} ${y})" class="note-head ${note.duration >= 2 ? 'open-note' : ''}"/>`;
      if (note.duration < 4) {
        const down = y < 82;
        const stemX = nx + (down ? -5.5 : 5.5);
        const stemEnd = y + (down ? 28 : -28);
        out += `<path d="M${stemX},${y} V${stemEnd}" class="note-stem"/>`;
        if (note.duration === 0.5) out += `<path d="M${stemX},${stemEnd} q14,${down ? -8 : 8} 4,${down ? -21 : 21}" class="note-flag"/>`;
      }
      out += '</g>';
    }
  }
  if (cursor < (bar + 1) * 4) rests.push([cursor, (bar + 1) * 4 - cursor]);
  for (const [beat, length] of rests) {
    let left = length;
    let current = beat;
    while (left > 0.001) {
      const duration = [4, 2, 1, 0.5].find((d) => d <= left && (d <= 1 || current % d === 0)) ?? 0.5;
      const x = 63 + current % 4 * 51;
      if (duration >= 2) out += `<rect x="${duration === 4 ? 145 : x - 5}" y="${duration === 4 ? 72 : 77}" width="10" height="5" class="score-rest"/>`;
      else out += `<text x="${x - 7}" y="93" class="score-rest-glyph">${duration === 1 ? '𝄽' : '𝄾'}</text>`;
      left -= duration; current += duration;
    }
  }
  out += '<g class="score-beats">';
  for (let i = 0; i < 4; i++) out += `<text x="${63 + i * 51}" y="167">${i + 1}</text>`;
  return out + '</g></svg>';
}

function variable(value: number): number[] {
  let buffer = value & 127;
  const out: number[] = [];
  while ((value >>= 7)) { buffer <<= 8; buffer |= (value & 127) | 128; }
  while (true) { out.push(buffer & 255); if (buffer & 128) buffer >>= 8; else break; }
  return out;
}
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const bytes = (s: string) => [...new TextEncoder().encode(s)];
const chunk = (data: number[]) => [...bytes('MTrk'), ...u32(data.length), ...data];

/** All parts are exported, independent of the listening mixer. Swing is encoded. */
export function makeMidi(treatment: Treatment, tempo: number): Uint8Array {
  const mpq = Math.round(60000000 / tempo);
  const tempoTrack = chunk([0, 255, 81, 3, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255, 0, 255, 88, 4, 4, 2, 24, 8, ...variable(32 * 480), 255, 47, 0]);
  const tracks = treatment.parts.map((part, index) => {
    const channel = index >= 9 ? index + 1 : index; // Channel 10 is reserved for drums.
    const name = bytes(part.label);
    const events: Array<{ tick: number; data: number[]; order: number }> = [
      { tick: 0, data: [255, 3, ...variable(name.length), ...name], order: -3 },
      { tick: 0, data: [192 + channel, part.program], order: -2 },
      { tick: 0, data: [176 + channel, 10, Math.round((part.pan + 1) * 63.5)], order: -1 },
      { tick: 0, data: [176 + channel, 7, Math.round(part.level * 100)], order: -1 },
    ];
    for (const note of part.notes) {
      events.push({ tick: Math.round(performedBeat(note.beat, treatment.swing) * 480), data: [144 + channel, midi(note.pitch), Math.round(note.velocity * 110)], order: 1 });
      events.push({ tick: Math.round(performedBeat(note.beat + note.duration * note.gate, treatment.swing) * 480), data: [128 + channel, midi(note.pitch), 0], order: 0 });
    }
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    let cursor = 0;
    const data = events.flatMap((event) => { const delta = event.tick - cursor; cursor = event.tick; return [...variable(delta), ...event.data]; });
    return chunk([...data, ...variable(32 * 480 - cursor), 255, 47, 0]);
  });
  return new Uint8Array([...bytes('MThd'), 0, 0, 0, 6, 0, 1, 0, tracks.length + 1, 1, 224, ...tempoTrack, ...tracks.flat()]);
}

/** Editable concert-pitch score; one part per independent chair or string division. */
export function makeMusicXml(treatment: Treatment, tempo: number): string {
  const durationType = (d: number) => d === 4 ? 'whole' : d === 2 ? 'half' : d === 1 ? 'quarter' : 'eighth';
  const partList = treatment.parts.map((part, i) => `<score-part id="P${i}"><part-name>${esc(part.label)}</part-name><score-instrument id="I${i}"><instrument-name>${esc(part.label)}</instrument-name></score-instrument><midi-instrument id="I${i}"><midi-channel>${i >= 9 ? i + 2 : i + 1}</midi-channel><midi-program>${part.program + 1}</midi-program></midi-instrument></score-part>`).join('');
  const parts = treatment.parts.map((part, i) => {
    const measures = CHORDS.map((chord, bar) => {
      let content = bar === 0 ? `<attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>${part.clef === 'bass' ? 'F' : 'G'}</sign><line>${part.clef === 'bass' ? 4 : 2}</line></clef></attributes><direction><direction-type><words>${esc(treatment.feel)}; concert pitch</words></direction-type><sound tempo="${tempo}"/></direction>` : '';
      content += `<direction><direction-type><words>${esc(chord.symbol)}</words></direction-type></direction>`;
      let cursor = bar * 4;
      const notes = part.notes.filter((n) => Math.floor(n.beat / 4) === bar).sort((a, b) => a.beat - b.beat || midi(a.pitch) - midi(b.pitch));
      const rest = (length: number) => {
        let result = '';
        while (length > 0) {
          const d = [4, 2, 1, 0.5].find((n) => n <= length) ?? 0.5;
          result += `<note><rest/><duration>${d * 2}</duration><type>${durationType(d)}</type></note>`;
          length -= d;
        }
        return result;
      };
      notes.forEach((note, index) => {
        const isChord = index > 0 && notes[index - 1].beat === note.beat;
        if (!isChord && note.beat > cursor) content += rest(note.beat - cursor);
        const alter = note.pitch.includes('#') ? 1 : note.pitch.includes('b') ? -1 : 0;
        content += `<note>${isChord ? '<chord/>' : ''}<pitch><step>${note.pitch[0]}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${note.pitch.slice(-1)}</octave></pitch><duration>${note.duration * 2}</duration><type>${durationType(note.duration)}</type>${note.gate < 0.8 ? '<notations><articulations><staccato/></articulations></notations>' : ''}</note>`;
        cursor = Math.max(cursor, note.beat + note.duration);
      });
      if (cursor < bar * 4 + 4) content += rest(bar * 4 + 4 - cursor);
      return `<measure number="${bar + 1}">${content}${bar === 7 ? '<barline location="right"><bar-style>light-heavy</bar-style></barline>' : ''}</measure>`;
    }).join('');
    return `<part id="P${i}">${measures}</part>`;
  }).join('');
  return `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="4.0"><work><work-title>Small Hours — study in the style of ${esc(treatment.name)}</work-title></work><identification><creator type="composer">Original Jazz Arrangers teaching study</creator></identification><part-list>${partList}</part-list>${parts}</score-partwise>`;
}
