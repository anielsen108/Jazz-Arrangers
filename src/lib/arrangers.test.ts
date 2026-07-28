import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  DECADES,
  ERAS,
  arrangerSlugFromId,
  canonicalizeArrangers,
  decadeFromId,
  eraFromArrangerId,
  lifespanLabel,
  parseArrangerHeading,
} from './arrangers';

describe('parseArrangerHeading', () => {
  it('parses a name with birth and death years', () => {
    const md = '# Thad Jones (1923-1986)\n\n## Biography\n...';
    expect(parseArrangerHeading(md)).toEqual({
      name: 'Thad Jones',
      born: 1923,
      died: 1986,
    });
  });

  it('parses a living arranger with "b." years', () => {
    const md = '# Maria Schneider (b. 1960)\n';
    expect(parseArrangerHeading(md)).toEqual({
      name: 'Maria Schneider',
      born: 1960,
      died: null,
    });
  });

  it('parses a name with no years', () => {
    const md = '# Greg Hopkins\n\n## Biography';
    expect(parseArrangerHeading(md)).toEqual({
      name: 'Greg Hopkins',
      born: null,
      died: null,
    });
  });

  it('handles accented characters and apostrophes in names', () => {
    expect(parseArrangerHeading("# Chico O'Farrill (1921-2001)").name).toBe(
      "Chico O'Farrill"
    );
    expect(parseArrangerHeading('# Miguel Zenón (b. 1976)').name).toBe(
      'Miguel Zenón'
    );
    expect(parseArrangerHeading('# J.J. Johnson (1924-2001)').name).toBe(
      'J.J. Johnson'
    );
  });

  it('ignores leading whitespace/blank lines before the heading', () => {
    expect(parseArrangerHeading('\n\n# Sun Ra (1914-1993)\n').name).toBe(
      'Sun Ra'
    );
  });

  it('returns null name fields for markdown without an H1', () => {
    expect(parseArrangerHeading('## Biography\ntext')).toEqual({
      name: null,
      born: null,
      died: null,
    });
  });
});

describe('lifespanLabel', () => {
  it('formats a completed lifespan with an en dash', () => {
    expect(lifespanLabel(1923, 1986)).toBe('1923–1986');
  });

  it('formats a living arranger', () => {
    expect(lifespanLabel(1960, null)).toBe('b. 1960');
  });

  it('returns an empty string when years are unknown', () => {
    expect(lifespanLabel(null, null)).toBe('');
  });
});

describe('decadeFromId', () => {
  it('extracts the decade segment from a collection entry id', () => {
    expect(decadeFromId('1950s/thad-jones')).toBe('1950s');
    expect(decadeFromId('1920s-1930s/duke-ellington')).toBe('1920s-1930s');
    expect(decadeFromId('2000s-present/miho-hazama')).toBe('2000s-present');
  });
});

describe('DECADES', () => {
  it('lists all eight decades in chronological order with labels', () => {
    expect(DECADES.map((d) => d.slug)).toEqual([
      '1920s-1930s',
      '1940s',
      '1950s',
      '1960s',
      '1970s',
      '1980s',
      '1990s',
      '2000s-present',
    ]);
    for (const d of DECADES) {
      expect(d.label.length).toBeGreaterThan(0);
    }
  });
});

describe('era classification', () => {
  it('classifies arrangers by a predominant musical era rather than folder alone', () => {
    expect(eraFromArrangerId('1920s-1930s/jelly-roll-morton').slug).toBe('early-jazz');
    expect(eraFromArrangerId('1940s/billy-strayhorn').slug).toBe('swing-big-band');
    expect(eraFromArrangerId('1940s/tadd-dameron').slug).toBe('bebop-progressive');
    expect(eraFromArrangerId('1950s/bill-holman').slug).toBe('cool-west-coast');
    expect(eraFromArrangerId('1960s/wayne-shorter').slug).toBe('hard-bop-post-bop');
    expect(eraFromArrangerId('1960s/carla-bley').slug).toBe('third-stream-avant-garde');
    expect(eraFromArrangerId('1970s/bob-james').slug).toBe('fusion-jazz-funk');
    expect(eraFromArrangerId('1970s/maria-schneider').slug).toBe('contemporary-hybrid');
  });

  it('defines eight eras in chronological order', () => {
    expect(ERAS.map((era) => era.slug)).toEqual([
      'early-jazz',
      'swing-big-band',
      'bebop-progressive',
      'cool-west-coast',
      'hard-bop-post-bop',
      'third-stream-avant-garde',
      'fusion-jazz-funk',
      'contemporary-hybrid',
    ]);
  });

  it('chooses one canonical profile for arrangers found in multiple folders', () => {
    const canonical = canonicalizeArrangers([
      { id: '1970s/maria-schneider' },
      { id: '1990s/maria-schneider' },
      { id: '1940s/gil-evans' },
    ]);
    expect(canonical.map((item) => item.id).sort()).toEqual([
      '1940s/gil-evans',
      '1970s/maria-schneider',
    ]);
  });
});

describe('repository content', () => {
  const root = join(__dirname, '..', '..', 'arrangers');

  it('every arranger page has a parseable H1 heading, known decade, and known era', () => {
    const decadeSlugs = new Set(DECADES.map((d) => d.slug));
    const eraSlugs = new Set(ERAS.map((era) => era.slug));
    const decadeDirs = readdirSync(root, { withFileTypes: true }).filter((e) =>
      e.isDirectory()
    );
    expect(decadeDirs.length).toBeGreaterThan(0);

    let pageCount = 0;
    for (const dir of decadeDirs) {
      expect(decadeSlugs.has(dir.name), `unknown decade dir: ${dir.name}`).toBe(
        true
      );
      const files = readdirSync(join(root, dir.name)).filter((f) =>
        f.endsWith('.md')
      );
      for (const file of files) {
        pageCount += 1;
        const md = readFileSync(join(root, dir.name, file), 'utf8');
        const { name } = parseArrangerHeading(md);
        expect(name, `${dir.name}/${file} has no parseable H1`).toBeTruthy();
        expect(
          eraSlugs.has(eraFromArrangerId(`${dir.name}/${file.replace(/\.md$/, '')}`).slug)
        ).toBe(true);
      }
    }
    expect(pageCount).toBeGreaterThan(0);
  });

  it('the canonical catalogue contains each arranger slug exactly once', () => {
    const ids = readdirSync(root, { withFileTypes: true }).flatMap((directory) =>
      directory.isDirectory()
        ? readdirSync(join(root, directory.name))
            .filter((file) => file.endsWith('.md'))
            .map((file) => `${directory.name}/${file.replace(/\.md$/, '')}`)
        : []
    );
    const canonical = canonicalizeArrangers(ids.map((id) => ({ id })));
    const slugs = canonical.map((item) => arrangerSlugFromId(item.id));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(canonical.length).toBeLessThan(ids.length);
  });

  it('every declared portrait points to a local image asset', () => {
    const publicRoot = join(__dirname, '..', '..', 'public');
    for (const decade of DECADES) {
      const directory = join(root, decade.slug);
      const files = readdirSync(directory).filter((file) => file.endsWith('.md'));
      for (const file of files) {
        const markdown = readFileSync(join(directory, file), 'utf8');
        const src = markdown.match(/^\s+src:\s+(['"]?)(\/images\/[^\s'"]+)\1\s*$/m)?.[2];
        if (!src) continue;
        expect(
          existsSync(join(publicRoot, src.slice(1))),
          `${decade.slug}/${file} references missing portrait ${src}`
        ).toBe(true);
      }
    }
  });
});
