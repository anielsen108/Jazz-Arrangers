import { describe, expect, it } from 'vitest';
import { TREATMENTS, treatmentForArtist } from './orchestration';
import { INSTRUMENT_GROUPS, matchesDeskArtist, setDeskFilterParams, studyFacets, type DeskFilters } from './deskFilters';

const empty: DeskFilters = { q: '', era: '', size: '', instrument: '' };

describe('Arranging Desk filters', () => {
  it('counts sounding score parts and puts boundary sizes in distinct ranges', () => {
    const part = treatmentForArtist('Christian McBride').parts[0];
    const silent = { ...part, notes: [] };
    for (const [count, size] of [[5, 'compact'], [7, 'compact'], [8, 'medium'], [9, 'expanded'], [11, 'expanded']] as const) {
      const facets = studyFacets([...Array(count).fill(part), silent]);
      expect(facets.partCount).toBe(count);
      expect(facets.size).toBe(size);
    }
  });

  it('classifies the actual sounds, including leads and distinct string and vocal colors', () => {
    const sebesky = studyFacets(treatmentForArtist('Don Sebesky').parts);
    expect(sebesky.instruments).toContain('instrument:flute');
    expect(sebesky.instruments).toContain('family:woodwinds');
    expect(sebesky.instruments).toContain('family:strings');
    expect(sebesky.instruments).not.toContain('family:saxophones');
    const source = treatmentForArtist('Don Sebesky').parts[0];
    const choir = studyFacets([{ ...source, instrument: 'choir_aahs' }]);
    expect(choir.instruments).toContain('family:voices');
    expect(choir.instruments).not.toContain('family:strings');
    const silentBrass = studyFacets([{ ...source, instrument: 'trumpet', notes: [] }]);
    expect(silentBrass.instruments).not.toContain('family:brass');
  });

  it('covers every instrument in all 150 studies and matches its own size and instrument filters', () => {
    for (const study of TREATMENTS) {
      const facets = studyFacets(study.parts);
      const artist = { name: study.name, era: 'example-era', ...facets };
      expect(facets.partCount).toBe(study.parts.length);
      for (const part of study.parts) {
        expect(INSTRUMENT_GROUPS.some((group) => group.samples.includes(part.instrument)), part.instrument).toBe(true);
        expect(matchesDeskArtist(artist, { ...empty, size: facets.size, instrument: `instrument:${part.instrument}` })).toBe(true);
      }
    }
  });

  it('intersects name, period, size and instrumentation instead of combining their results', () => {
    const artist = { name: 'Christian McBride', era: 'contemporary', ...studyFacets(treatmentForArtist('Christian McBride').parts) };
    const filters = { q: 'mcbride', era: 'contemporary', size: 'expanded', instrument: 'family:saxophones' };
    expect(matchesDeskArtist(artist, filters)).toBe(true);
    for (const mismatch of [{ q: 'Evans' }, { era: 'swing' }, { size: 'compact' }, { instrument: 'instrument:flute' }]) {
      expect(matchesDeskArtist(artist, { ...filters, ...mismatch })).toBe(false);
    }
    expect(matchesDeskArtist(artist, empty)).toBe(true);
  });

  it('keeps accent and punctuation insensitive name matching when other filters are active', () => {
    const artist = { name: "Miguel Zenón", era: 'contemporary', size: 'medium', instruments: ['family:saxophones'] };
    expect(matchesDeskArtist(artist, { ...empty, q: 'ZENON', instrument: 'family:saxophones' })).toBe(true);
    expect(matchesDeskArtist({ ...artist, name: "Arturo O’Farrill" }, { ...empty, q: 'o farrill', size: 'medium' })).toBe(true);
  });

  it('preserves every filter in links and removes cleared filters without losing other URL state', () => {
    const url = new URL('https://example.com/arranging-desk/?source=home#orchestration');
    const filters = { q: ' Miguel Zenón ', era: 'contemporary', size: 'medium', instrument: 'instrument:alto_sax' };
    setDeskFilterParams(url, filters);
    expect(url.searchParams.get('q')).toBe('Miguel Zenón');
    for (const key of ['era', 'size', 'instrument'] as const) expect(url.searchParams.get(key)).toBe(filters[key]);
    setDeskFilterParams(url, { ...filters, q: '' });
    expect(url.searchParams.has('q')).toBe(false);
    expect(url.searchParams.get('instrument')).toBe(filters.instrument);
    setDeskFilterParams(url, empty);
    expect(url.href).toBe('https://example.com/arranging-desk/?source=home#orchestration');
  });
});
