import { describe, expect, it } from 'vitest';
import {
  INSTRUMENTS,
  INSTRUMENT_IDS,
  STANDARD_BIG_BAND,
  stageRows,
} from './ensemble';

// The classic Thad Jones/Mel Lewis instrumentation.
const STANDARD = {
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

describe('instrument vocabulary', () => {
  it('every instrument id has a label, abbreviation, and stage row', () => {
    expect(INSTRUMENT_IDS.length).toBeGreaterThan(30);
    for (const id of INSTRUMENT_IDS) {
      const info = INSTRUMENTS[id];
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.abbr.length).toBeGreaterThan(0);
      expect(['trumpets', 'low-brass', 'reeds', 'rhythm']).toContain(info.row);
    }
  });

  it('the standard big band baseline only uses known instruments', () => {
    for (const id of Object.keys(STANDARD_BIG_BAND)) {
      expect(INSTRUMENT_IDS).toContain(id);
    }
  });
});

describe('stageRows', () => {
  it('expands counts into individual seats grouped by row', () => {
    const rows = stageRows(STANDARD);
    const byRow = Object.fromEntries(rows.map((r) => [r.row, r.seats]));
    expect(byRow['trumpets']).toHaveLength(4);
    expect(byRow['low-brass']).toHaveLength(4); // 3 tbn + 1 btbn
    expect(byRow['reeds']).toHaveLength(5); // 2a 2t 1b
    expect(byRow['rhythm']).toHaveLength(4); // pno gtr bass dr
  });

  it('orders rows back-of-stage first: trumpets, low-brass, reeds, rhythm', () => {
    const rows = stageRows(STANDARD);
    expect(rows.map((r) => r.row)).toEqual([
      'trumpets',
      'low-brass',
      'reeds',
      'rhythm',
    ]);
  });

  it('orders seats within a row by the vocabulary order (alto before tenor before bari)', () => {
    const rows = stageRows(STANDARD);
    const reeds = rows.find((r) => r.row === 'reeds')!;
    expect(reeds.seats.map((s) => s.instrument)).toEqual([
      'alto-sax',
      'alto-sax',
      'tenor-sax',
      'tenor-sax',
      'baritone-sax',
    ]);
  });

  it('omits rows with no seats', () => {
    const rows = stageRows({ piano: 1, 'upright-bass': 1, drums: 1 });
    expect(rows.map((r) => r.row)).toEqual(['rhythm']);
  });

  it('places unusual instruments in sensible rows', () => {
    const rows = stageRows({
      'french-horn': 2,
      tuba: 1,
      flute: 1,
      accordion: 1,
      'electric-bass': 1,
      choir: 1,
    });
    const byRow = Object.fromEntries(
      rows.map((r) => [r.row, r.seats.map((s) => s.instrument)])
    );
    expect(byRow['low-brass']).toContain('french-horn');
    expect(byRow['low-brass']).toContain('tuba');
    expect(byRow['reeds']).toContain('flute');
    expect(byRow['rhythm']).toEqual(
      expect.arrayContaining(['accordion', 'electric-bass', 'choir'])
    );
  });

  it('throws on unknown instrument ids', () => {
    expect(() => stageRows({ kazoo: 1 })).toThrow(/kazoo/);
  });

  it('rejects non-positive counts', () => {
    expect(() => stageRows({ trumpet: 0 })).toThrow(/trumpet/);
    expect(() => stageRows({ trumpet: -1 })).toThrow(/trumpet/);
  });

  describe('with ghostStandard', () => {
    it('marks standard chairs missing from the ensemble as ghost seats', () => {
      // Electric-bass band with no guitar: upright bass + guitar chairs ghost.
      const { guitar, 'upright-bass': upright, ...rest } = STANDARD;
      const rows = stageRows(
        { ...rest, 'electric-bass': 1 },
        { ghostStandard: true }
      );
      const rhythm = rows.find((r) => r.row === 'rhythm')!;
      const ghosts = rhythm.seats.filter((s) => s.ghost);
      expect(ghosts.map((s) => s.instrument).sort()).toEqual([
        'guitar',
        'upright-bass',
      ]);
    });

    it('ghosts only the shortfall when some chairs are filled', () => {
      const rows = stageRows({ trumpet: 2, piano: 1 }, { ghostStandard: true });
      const trumpets = rows.find((r) => r.row === 'trumpets')!;
      expect(trumpets.seats.filter((s) => !s.ghost)).toHaveLength(2);
      expect(trumpets.seats.filter((s) => s.ghost)).toHaveLength(2);
    });

    it('adds no ghosts when the ensemble covers the standard band', () => {
      const rows = stageRows(STANDARD, { ghostStandard: true });
      expect(rows.flatMap((r) => r.seats).filter((s) => s.ghost)).toHaveLength(0);
    });

    it('appends ghost seats after real seats within a row', () => {
      const rows = stageRows({ trumpet: 2 }, { ghostStandard: true });
      const seats = rows.find((r) => r.row === 'trumpets')!.seats;
      expect(seats.findIndex((s) => s.ghost)).toBe(2);
    });
  });
});
