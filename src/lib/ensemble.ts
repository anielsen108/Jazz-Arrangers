export type StageRowName = 'trumpets' | 'low-brass' | 'reeds' | 'rhythm';

export interface InstrumentInfo {
  label: string;
  abbr: string;
  row: StageRowName;
}

// Declaration order here fixes seat order within each stage row.
export const INSTRUMENTS: Record<string, InstrumentInfo> = {
  // Back row: trumpets
  trumpet: { label: 'Trumpet', abbr: 'Tpt', row: 'trumpets' },
  cornet: { label: 'Cornet', abbr: 'Cnt', row: 'trumpets' },
  flugelhorn: { label: 'Flugelhorn', abbr: 'Flg', row: 'trumpets' },
  // Middle row: low brass
  'french-horn': { label: 'French Horn', abbr: 'FHn', row: 'low-brass' },
  trombone: { label: 'Trombone', abbr: 'Tbn', row: 'low-brass' },
  'bass-trombone': { label: 'Bass Trombone', abbr: 'BTb', row: 'low-brass' },
  euphonium: { label: 'Euphonium', abbr: 'Euph', row: 'low-brass' },
  tuba: { label: 'Tuba', abbr: 'Tba', row: 'low-brass' },
  // Front row: saxes and woodwinds
  'soprano-sax': { label: 'Soprano Sax', abbr: 'SS', row: 'reeds' },
  'alto-sax': { label: 'Alto Sax', abbr: 'AS', row: 'reeds' },
  'tenor-sax': { label: 'Tenor Sax', abbr: 'TS', row: 'reeds' },
  'baritone-sax': { label: 'Baritone Sax', abbr: 'BS', row: 'reeds' },
  'bass-sax': { label: 'Bass Sax', abbr: 'BsS', row: 'reeds' },
  clarinet: { label: 'Clarinet', abbr: 'Cl', row: 'reeds' },
  'bass-clarinet': { label: 'Bass Clarinet', abbr: 'BCl', row: 'reeds' },
  piccolo: { label: 'Piccolo', abbr: 'Pic', row: 'reeds' },
  flute: { label: 'Flute', abbr: 'Fl', row: 'reeds' },
  'alto-flute': { label: 'Alto Flute', abbr: 'AFl', row: 'reeds' },
  oboe: { label: 'Oboe', abbr: 'Ob', row: 'reeds' },
  'english-horn': { label: 'English Horn', abbr: 'EH', row: 'reeds' },
  bassoon: { label: 'Bassoon', abbr: 'Bsn', row: 'reeds' },
  // Rhythm section and everything else
  piano: { label: 'Piano', abbr: 'Pno', row: 'rhythm' },
  'electric-piano': { label: 'Electric Piano', abbr: 'EP', row: 'rhythm' },
  organ: { label: 'Organ', abbr: 'Org', row: 'rhythm' },
  synthesizer: { label: 'Synthesizer', abbr: 'Syn', row: 'rhythm' },
  celesta: { label: 'Celesta', abbr: 'Cel', row: 'rhythm' },
  accordion: { label: 'Accordion', abbr: 'Acc', row: 'rhythm' },
  guitar: { label: 'Guitar', abbr: 'Gtr', row: 'rhythm' },
  banjo: { label: 'Banjo', abbr: 'Bjo', row: 'rhythm' },
  'upright-bass': { label: 'Upright Bass', abbr: 'Bass', row: 'rhythm' },
  'electric-bass': { label: 'Electric Bass', abbr: 'EBs', row: 'rhythm' },
  drums: { label: 'Drums', abbr: 'Dr', row: 'rhythm' },
  percussion: { label: 'Percussion', abbr: 'Perc', row: 'rhythm' },
  congas: { label: 'Congas', abbr: 'Cga', row: 'rhythm' },
  vibraphone: { label: 'Vibraphone', abbr: 'Vib', row: 'rhythm' },
  marimba: { label: 'Marimba', abbr: 'Mba', row: 'rhythm' },
  harp: { label: 'Harp', abbr: 'Hp', row: 'rhythm' },
  voice: { label: 'Voice', abbr: 'Vox', row: 'rhythm' },
  choir: { label: 'Choir', abbr: 'Ch', row: 'rhythm' },
  violin: { label: 'Violin', abbr: 'Vln', row: 'rhythm' },
  viola: { label: 'Viola', abbr: 'Vla', row: 'rhythm' },
  cello: { label: 'Cello', abbr: 'Vc', row: 'rhythm' },
  strings: { label: 'String Section', abbr: 'Str', row: 'rhythm' },
  turntables: { label: 'Turntables', abbr: 'TT', row: 'rhythm' },
  electronics: { label: 'Electronics', abbr: 'Elec', row: 'rhythm' },
};

export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS);

const ROW_ORDER: StageRowName[] = ['trumpets', 'low-brass', 'reeds', 'rhythm'];

const ROW_TITLES: Record<StageRowName, string> = {
  trumpets: 'Trumpets',
  'low-brass': 'Trombones & Low Brass',
  reeds: 'Saxes & Woodwinds',
  rhythm: 'Rhythm Section',
};

// The classic 5-4-4-4 big band; the baseline that ghost seats compare against.
export const STANDARD_BIG_BAND: Record<string, number> = {
  'alto-sax': 2,
  'tenor-sax': 2,
  'baritone-sax': 1,
  trumpet: 4,
  trombone: 3,
  'bass-trombone': 1,
  piano: 1,
  guitar: 1,
  'upright-bass': 1,
  drums: 1,
};

export interface Seat {
  instrument: string;
  label: string;
  abbr: string;
  ghost: boolean;
}

export interface StageRow {
  row: StageRowName;
  title: string;
  seats: Seat[];
}

function makeSeats(instrument: string, count: number, ghost: boolean): Seat[] {
  const info = INSTRUMENTS[instrument];
  if (!info) {
    throw new Error(`Unknown instrument id: ${instrument}`);
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Invalid count ${count} for instrument: ${instrument}`);
  }
  return Array.from({ length: count }, () => ({
    instrument,
    label: info.label,
    abbr: info.abbr,
    ghost,
  }));
}

function ghostShortfalls(ensemble: Record<string, number>): Seat[] {
  const ghosts: Seat[] = [];
  for (const [instrument, standardCount] of Object.entries(STANDARD_BIG_BAND)) {
    const shortfall = standardCount - (ensemble[instrument] ?? 0);
    if (shortfall > 0) {
      ghosts.push(...makeSeats(instrument, shortfall, true));
    }
  }
  return ghosts;
}

/**
 * Arrange an ensemble (instrument id → chair count) into stage-plot rows,
 * back of stage first. With `ghostStandard`, chairs of the classic big band
 * that this ensemble does NOT use are appended as ghost seats, so unusual
 * instrumentations read at a glance against the standard lineup.
 */
export function stageRows(
  ensemble: Record<string, number>,
  opts: { ghostStandard?: boolean } = {}
): StageRow[] {
  const real = Object.entries(ensemble).flatMap(([instrument, count]) =>
    makeSeats(instrument, count, false)
  );
  const ghosts = opts.ghostStandard ? ghostShortfalls(ensemble) : [];

  const vocabOrder = (seat: Seat) => INSTRUMENT_IDS.indexOf(seat.instrument);
  return ROW_ORDER.map((row) => ({
    row,
    title: ROW_TITLES[row],
    seats: [...real, ...ghosts]
      .filter((seat) => INSTRUMENTS[seat.instrument].row === row)
      .sort(
        (a, b) =>
          Number(a.ghost) - Number(b.ghost) || vocabOrder(a) - vocabOrder(b)
      ),
  })).filter((r) => r.seats.length > 0);
}
