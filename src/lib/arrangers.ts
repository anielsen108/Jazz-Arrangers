export interface ArrangerHeading {
  name: string | null;
  born: number | null;
  died: number | null;
}

export interface Decade {
  slug: string;
  label: string;
  blurb: string;
}

export interface Era {
  slug: string;
  label: string;
  shortLabel: string;
  dateRange: string;
  blurb: string;
}

// The source files retain their original decade folders so existing profile
// URLs keep working. The public interface classifies each arranger by one
// predominant musical era instead.
export const DECADES: Decade[] = [
  {
    slug: '1920s-1930s',
    label: '1920s–1930s: The Big Band Era Begins',
    blurb:
      'The birth of jazz arranging as a distinct art form, creating the frameworks that would define big band jazz.',
  },
  {
    slug: '1940s',
    label: '1940s: Swing Peaks and Bebop Emerges',
    blurb:
      'Swing reached its commercial peak while bebop revolutionized jazz harmony and rhythm.',
  },
  {
    slug: '1950s',
    label: '1950s: Cool Jazz and Hard Bop',
    blurb:
      'Cool jazz sophistication and hard bop energy, with arrangers exploring both directions.',
  },
  {
    slug: '1960s',
    label: '1960s: Modal Jazz and Free Jazz',
    blurb:
      'Modal jazz expanded harmonic possibilities while free jazz broke all boundaries.',
  },
  {
    slug: '1970s',
    label: '1970s: Fusion and Jazz-Funk',
    blurb:
      'Jazz embraced rock and funk rhythms, with arrangers creating new electric soundscapes.',
  },
  {
    slug: '1980s',
    label: '1980s: Contemporary Jazz',
    blurb:
      'Renewed interest in acoustic jazz while maintaining fusion’s innovations.',
  },
  {
    slug: '1990s',
    label: '1990s: Neo-Traditional and Experimental',
    blurb:
      'A return to jazz traditions alongside continued experimentation with form and electronics.',
  },
  {
    slug: '2000s-present',
    label: '2000s–Present: Modern Jazz Arrangers',
    blurb:
      'Contemporary arrangers push boundaries, incorporating global influences and new technologies.',
  },
];

export const ERAS: Era[] = [
  {
    slug: 'early-jazz',
    label: 'Early Jazz & Dance Bands',
    shortLabel: 'Early Jazz',
    dateRange: '1890s–early 1930s',
    blurb:
      'Written ragtime, collective New Orleans practice, and the first dance-band orchestrations establish the arranger’s role.',
  },
  {
    slug: 'swing-big-band',
    label: 'Swing & the Big Band Era',
    shortLabel: 'Swing & Big Band',
    dateRange: '1930s–mid-1940s',
    blurb:
      'Reed, brass, and rhythm sections become a flexible orchestra built on riffs, call and response, soli, and shout choruses.',
  },
  {
    slug: 'bebop-progressive',
    label: 'Bebop & Progressive Big Band',
    shortLabel: 'Bebop',
    dateRange: 'mid-1940s–1950s',
    blurb:
      'Bebop harmony, rhythmic displacement, and more angular melodic writing reshape both small-group and large-ensemble scores.',
  },
  {
    slug: 'cool-west-coast',
    label: 'Cool Jazz & West Coast',
    shortLabel: 'Cool & West Coast',
    dateRange: 'late 1940s–1950s',
    blurb:
      'Transparent voicings, counterpoint, chamber textures, and expanded instrumental colors bring a new kind of orchestral restraint.',
  },
  {
    slug: 'hard-bop-post-bop',
    label: 'Hard Bop, Modal & Post-Bop',
    shortLabel: 'Hard Bop & Post-Bop',
    dateRange: '1950s–1960s',
    blurb:
      'Blues and gospel weight meet modal harmony, punchier backgrounds, and increasingly open forms.',
  },
  {
    slug: 'third-stream-avant-garde',
    label: 'Third Stream & Avant-Garde',
    shortLabel: 'Third Stream',
    dateRange: 'late 1950s–1970s',
    blurb:
      'Jazz orchestra meets concert music, free improvisation, unusual notation, extended form, and radical approaches to color.',
  },
  {
    slug: 'fusion-jazz-funk',
    label: 'Fusion & Jazz-Funk',
    shortLabel: 'Fusion & Jazz-Funk',
    dateRange: 'late 1960s–1980s',
    blurb:
      'Electric instruments, studio production, rock energy, and layered funk grooves expand the arranger’s palette.',
  },
  {
    slug: 'contemporary-hybrid',
    label: 'Contemporary & Hybrid Jazz',
    shortLabel: 'Contemporary',
    dateRange: '1980s–present',
    blurb:
      'Large ensembles draw freely from the full jazz tradition alongside classical, Latin, global, electronic, and experimental practices.',
  },
];

const DEFAULT_ERA_BY_DECADE: Record<string, string> = {
  '1920s-1930s': 'swing-big-band',
  '1940s': 'bebop-progressive',
  '1950s': 'cool-west-coast',
  '1960s': 'hard-bop-post-bop',
  '1970s': 'fusion-jazz-funk',
  '1980s': 'contemporary-hybrid',
  '1990s': 'contemporary-hybrid',
  '2000s-present': 'contemporary-hybrid',
};

// Exceptions make the classification biographical rather than a mechanical
// relabeling of the decade folders.
const ERA_BY_ARRANGER_SLUG: Record<string, string> = {
  'jelly-roll-morton': 'early-jazz',
  'don-redman': 'early-jazz',
  'fletcher-henderson': 'early-jazz',
  'luis-russell': 'early-jazz',
  'bill-challis': 'early-jazz',
  'ferde-grofe': 'early-jazz',

  'billy-strayhorn': 'swing-big-band',
  'neal-hefti': 'swing-big-band',
  'billy-may': 'swing-big-band',
  'ralph-burns': 'swing-big-band',
  'jerry-gray': 'swing-big-band',
  'gerald-wilson': 'swing-big-band',
  'melba-liston': 'swing-big-band',
  'buster-harding': 'swing-big-band',
  'ray-conniff': 'swing-big-band',
  'andy-gibson': 'swing-big-band',
  'sammy-nestico': 'swing-big-band',
  'louie-bellson': 'swing-big-band',

  'tadd-dameron': 'bebop-progressive',
  'gil-fuller': 'bebop-progressive',
  'george-handy': 'bebop-progressive',
  'chico-ofarrill': 'bebop-progressive',

  'gil-evans': 'cool-west-coast',
  'gerry-mulligan': 'cool-west-coast',
  'pete-rugolo': 'cool-west-coast',
  'johnny-carisi': 'cool-west-coast',
  'johnny-mandel': 'cool-west-coast',
  'eddie-sauter': 'cool-west-coast',

  'thad-jones': 'hard-bop-post-bop',
  'ernie-wilkins': 'hard-bop-post-bop',
  'quincy-jones': 'hard-bop-post-bop',
  'benny-golson': 'hard-bop-post-bop',
  'jimmy-heath': 'hard-bop-post-bop',
  'oliver-nelson': 'hard-bop-post-bop',
  'duke-pearson': 'hard-bop-post-bop',
  'herbie-hancock': 'hard-bop-post-bop',
  'wayne-shorter': 'hard-bop-post-bop',
  'phil-woods': 'hard-bop-post-bop',
  'toshiko-akiyoshi': 'hard-bop-post-bop',
  'jj-johnson': 'hard-bop-post-bop',
  'frank-foster': 'hard-bop-post-bop',
  'slide-hampton': 'hard-bop-post-bop',

  'bob-brookmeyer': 'third-stream-avant-garde',
  'jimmy-giuffre': 'third-stream-avant-garde',
  'bill-russo': 'third-stream-avant-garde',
  'george-russell': 'third-stream-avant-garde',
  'andre-previn': 'third-stream-avant-garde',
  'gary-mcfarland': 'third-stream-avant-garde',
  'clare-fischer': 'third-stream-avant-garde',
  'carla-bley': 'third-stream-avant-garde',
  'sun-ra': 'third-stream-avant-garde',
  'don-ellis': 'third-stream-avant-garde',
  'gunther-schuller': 'third-stream-avant-garde',
  'hank-levy': 'third-stream-avant-garde',
  'david-amram': 'third-stream-avant-garde',
  'michael-gibbs': 'third-stream-avant-garde',

  'gary-burton': 'fusion-jazz-funk',
  'don-sebesky': 'fusion-jazz-funk',
  'russell-ferrante': 'fusion-jazz-funk',
  'mike-mainieri': 'fusion-jazz-funk',
  'randy-brecker': 'fusion-jazz-funk',
  'gil-goldstein': 'fusion-jazz-funk',

  'bob-mintzer': 'contemporary-hybrid',
  'maria-schneider': 'contemporary-hybrid',
  'jim-mcneely': 'contemporary-hybrid',
  'vince-mendoza': 'contemporary-hybrid',
  'john-clayton': 'contemporary-hybrid',
  'tom-kubis': 'contemporary-hybrid',
  'alan-ferber': 'contemporary-hybrid',
  'darcy-james-argue': 'contemporary-hybrid',
  'john-hollenbeck': 'contemporary-hybrid',
  'miho-hazama': 'contemporary-hybrid',
  'ryan-truesdell': 'contemporary-hybrid',
};

// When the repository contains two profiles for one person, retain the richer
// existing page as the canonical destination and classify that person once.
const CANONICAL_SOURCE_BY_SLUG: Record<string, string> = {
  'alan-ferber': '1990s/alan-ferber',
  'bob-brookmeyer': '1990s/bob-brookmeyer',
  'darcy-james-argue': '1980s/darcy-james-argue',
  'gil-goldstein': '1980s/gil-goldstein',
  'john-clayton': '1970s/john-clayton',
  'john-hollenbeck': '1980s/john-hollenbeck',
  'maria-schneider': '1970s/maria-schneider',
  'miho-hazama': '1990s/miho-hazama',
  'ryan-truesdell': '1980s/ryan-truesdell',
};

const HEADING_RE = /^#\s+(.+?)(?:\s+\((?:b\.\s*(\d{4})|(\d{4})\s*[-–]\s*(\d{4}))\))?\s*$/m;

/**
 * Parse an arranger page's H1 into name and lifespan.
 * Handles "# Name (1923-1986)", "# Name (b. 1961)", and "# Name".
 */
export function parseArrangerHeading(markdown: string): ArrangerHeading {
  const match = markdown.match(HEADING_RE);
  if (!match) {
    return { name: null, born: null, died: null };
  }
  const [, name, bornOnly, born, died] = match;
  return {
    name,
    born: bornOnly ? Number(bornOnly) : born ? Number(born) : null,
    died: died ? Number(died) : null,
  };
}

/** Format a lifespan for display: "1923–1986", "b. 1960", or "". */
export function lifespanLabel(born: number | null, died: number | null): string {
  if (born === null) return '';
  return died === null ? `b. ${born}` : `${born}–${died}`;
}

/** A content-collection entry id like "1950s/thad-jones" → "1950s". */
export function decadeFromId(id: string): string {
  return id.split('/')[0];
}

/** A content id like "1950s/thad-jones" → "thad-jones". */
export function arrangerSlugFromId(id: string): string {
  return id.split('/').at(-1) ?? id;
}

/** Resolve one predominant era for any arranger content id. */
export function eraFromArrangerId(id: string): Era {
  const eraSlug =
    ERA_BY_ARRANGER_SLUG[arrangerSlugFromId(id)] ??
    DEFAULT_ERA_BY_DECADE[decadeFromId(id)] ??
    'contemporary-hybrid';
  return ERAS.find((era) => era.slug === eraSlug) ?? ERAS[ERAS.length - 1];
}

/** Collapse duplicate decade records into one canonical arranger profile. */
export function canonicalizeArrangers<T extends { id: string }>(items: T[]): T[] {
  const bySlug = new Map<string, T[]>();
  for (const item of items) {
    const slug = arrangerSlugFromId(item.id);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), item]);
  }

  return [...bySlug.entries()].map(([slug, candidates]) => {
    const preferredId = CANONICAL_SOURCE_BY_SLUG[slug];
    return (
      candidates.find((candidate) => candidate.id === preferredId) ??
      [...candidates].sort((a, b) => a.id.localeCompare(b.id))[0]
    );
  });
}
