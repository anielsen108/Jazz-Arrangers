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

// Chronological order drives the index page and, later, the timeline carousel.
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
