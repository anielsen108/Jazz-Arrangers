import type { Part } from './orchestraMusic';

export const ENSEMBLE_SIZES = [
  { value: 'compact', label: 'Up to 7 parts' },
  { value: 'medium', label: '8 parts' },
  { value: 'expanded', label: '9 or more parts' },
];

// Classify by the sounding instrument, including melody parts whose family is "lead".
export const INSTRUMENT_GROUPS = [
  { value: 'saxophones', label: 'Saxophones', samples: ['soprano_sax', 'alto_sax', 'tenor_sax', 'baritone_sax'] },
  { value: 'woodwinds', label: 'Other woodwinds', samples: ['flute', 'clarinet', 'english_horn', 'bassoon'] },
  { value: 'brass', label: 'Brass', samples: ['trumpet', 'muted_trumpet', 'trombone', 'french_horn', 'tuba'] },
  { value: 'strings', label: 'Strings & harp', samples: ['string_ensemble_1', 'pizzicato_strings', 'violin', 'orchestral_harp'] },
  { value: 'keyboards', label: 'Keyboards & accordion', samples: ['acoustic_grand_piano', 'electric_piano_1', 'drawbar_organ', 'accordion'] },
  { value: 'guitars', label: 'Guitars', samples: ['acoustic_guitar_nylon', 'electric_guitar_clean'] },
  { value: 'bass', label: 'Acoustic or electric bass', samples: ['acoustic_bass', 'electric_bass_finger'] },
  { value: 'percussion', label: 'Mallets & percussion', samples: ['vibraphone', 'marimba', 'woodblock'] },
  { value: 'voices', label: 'Voices', samples: ['choir_aahs'] },
];

export interface DeskFilters { q: string; era: string; size: string; instrument: string }
export interface DeskArtist { name: string; era: string; size: string; instruments: string[] }

export function studyFacets(parts: Part[]) {
  const sounding = parts.filter((part) => part.notes.length > 0);
  const samples = new Set(sounding.map((part) => part.instrument));
  return {
    partCount: sounding.length,
    size: sounding.length <= 7 ? 'compact' : sounding.length === 8 ? 'medium' : 'expanded',
    instruments: [
      ...[...samples].map((sample) => `instrument:${sample}`),
      ...INSTRUMENT_GROUPS.filter((group) => group.samples.some((sample) => samples.has(sample))).map((group) => `family:${group.value}`),
    ],
  };
}

export function normalizeArtistSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchesDeskArtist(artist: DeskArtist, filters: DeskFilters): boolean {
  return normalizeArtistSearch(artist.name).includes(normalizeArtistSearch(filters.q))
    && (!filters.era || artist.era === filters.era)
    && (!filters.size || artist.size === filters.size)
    && (!filters.instrument || artist.instruments.includes(filters.instrument));
}

export function setDeskFilterParams(url: URL, filters: DeskFilters): void {
  for (const key of ['q', 'era', 'size', 'instrument'] as const) {
    const value = filters[key].trim();
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
}
