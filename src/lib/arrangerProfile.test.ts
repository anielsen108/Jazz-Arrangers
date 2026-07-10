import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArrangerProfile } from './arrangerProfile';

describe('parseArrangerProfile', () => {
  it('turns long-form arranger copy into compact visual content', () => {
    const markdown = `
# Example Arranger (1900-1980)
## Biography
Example Arranger was born somewhere. They led an orchestra and wrote many enduring scores.
## Musical Style
Their style used transparent counterpoint, unusual instrumental color, and a strong rhythmic pulse.
## Orchestration Techniques
Open-position voicings created wide spacing. Independent contrapuntal lines moved between sections. Muted brass changed the instrumental color. Pedal bass notes supported upper harmony. Subito dynamics shaped the form. Rhythmic ostinatos drove the ensemble.
## Top Albums
### Example Artist - "First Record" (1955)
The first record demonstrates the mature orchestral style in a concise program.
### "Second Record" (1960)
This later album expands the palette.
### Educational Impact
The arranger also influenced generations of writers.
`;
    const profile = parseArrangerProfile(markdown);
    expect(profile.bioWordCount).toBeLessThanOrEqual(42);
    expect(profile.soundDNA).toHaveLength(5);
    expect(profile.techniques).toHaveLength(6);
    expect(profile.albums).toHaveLength(3);
    expect(profile.albums[0]).toMatchObject({ year: '1955', title: 'First Record', artist: 'Example Artist' });
  });

  it('produces a complete dashboard profile for all 159 arranger files', () => {
    const root = join(__dirname, '..', '..', 'arrangers');
    const files = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((directory) =>
        readdirSync(join(root, directory.name))
          .filter((file) => file.endsWith('.md'))
          .map((file) => join(root, directory.name, file))
      );

    expect(files).toHaveLength(159);
    for (const file of files) {
      const profile = parseArrangerProfile(readFileSync(file, 'utf8'));
      expect(profile.bio.length, `${file} has no concise bio`).toBeGreaterThan(20);
      expect(profile.bioWordCount, `${file} bio is too long`).toBeLessThanOrEqual(42);
      expect(profile.thesis.length, `${file} has no thesis`).toBeGreaterThan(10);
      expect(profile.soundDNA, `${file} has incomplete Sound DNA`).toHaveLength(5);
      expect(profile.techniques, `${file} has an incomplete technique deck`).toHaveLength(6);
      expect(profile.albums.length, `${file} has incomplete album recommendations`).toBeGreaterThanOrEqual(2);
    }
  });
});
