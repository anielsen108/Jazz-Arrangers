# Orchestration studies

The Orchestration section now plays an original eight-bar miniature, **Small Hours**,
in **150 individual artist treatments**, covering every supported arranger. Each
page plays that artist's own score; there is no shared three-style selector or
fallback to another artist. Duplicate historical URLs for the same person resolve
to the same treatment. Unknown artists fail explicitly so new profiles cannot
silently inherit an unrelated score.

The melody and eight-bar chord sequence are shared. Instrumentation, foreground
register, inner voicings, rhythmic figures, phrase development and commentary differ.
The original Sebesky, Nestico and Gil Evans scores are retained on their own pages.
Christian McBride's study uses a trumpet melody, five reeds, trombone answers,
piano and walking bass, with spread reed harmony and a closing octave statement.

These are original, reduced teaching arrangements illustrating selected facets of
the artists' work, informed by the collection's profiles. They are not claims to
reconstruct an entire personal style. In particular, asymmetrical accent studies
retain the miniature's 4/4 meter; sampled woodblocks are not a full Latin percussion
section. The artist context on McBride's page links to his official musical-projects
page; the specific scoring is our illustrative interpretation.

The player offers concert-pitch part notation, beat inspection, a sounding-pitch
table with chord roles, additive solo/mute controls, tempo, master volume, bar or
passage loops, and MIDI/MusicXML downloads. MIDI encodes the swing timing; MusicXML
contains the written rhythms and marks the feel in text.

## References consulted

These are original teaching studies, not transcriptions or reproductions. References
were checked visually in the supplied scans:

- `books/Don Sebesky - The Contemporary Arranger.pdf`: printed pp. 69–70 / PDF
  pp. 78–79, **Combining the Woodwinds**; printed p. 124 / PDF p. 133,
  **Voicing the Strings**; printed p. 155 / PDF p. 164,
  **Combining Strings with Winds**. Register and acoustic balance matter when
  combining families; adding a wind to a string line changes its character and weight.
- `Sammy Nestico - The Complete Arranger.pdf` (at the repository root): printed
  p. 24 / PDF p. 26, **Close [Block] Voicing** and **Semi-Open Voicing**; printed
  pp. 22–23 / PDF pp. 24–25, the adjacent example of saxophone/brass combinations.
  Close moving voices and selectively lowered voices provide a concrete spacing comparison.
- The collection's existing arranger profiles supply the broader stylistic context.
  The examples illustrate selected devices, not a comprehensive model of an arranger.

## Implementation

- `src/lib/orchestration.ts`: complete artist registry, exact name lookup, and the
  three original detailed scores. Names normalize accents and punctuation; no
  unknown-name fallback is permitted.
- `src/lib/orchestraMusic.ts`: shared melody, harmonic vocabulary, note models and
  musical helpers. All pitches are sounding pitches, with C4 = MIDI 60.
- `src/lib/orchestraArtists.ts`: 147 individually authored orchestration briefs:
  instrument choices, spacing, eight-bar texture plans, bass patterns and listening
  focus. No random seeds or name hashes select an artist's musical choices.
- `src/lib/orchestraStudies.ts`: scores the briefs and derives bar-by-bar pitch,
  register and voice-motion commentary from the actual parts. A lead can move down
  one or two octaves to suit its instrument; the melody score and solo follow it.
- `src/lib/orchestraAudio.ts`: Web Audio sample player, transport, swing timing and mixer.
- `src/lib/orchestraScore.ts`: concert-pitch part notation and MIDI/MusicXML exports.
- `src/components/OrchestrationPlayer.astro`, `src/lib/orchestraPlayer.ts` and
  `src/styles/orchestration-player.css`: page interface and controls.
- `public/audio/orchestra/`: approximately 17 MB of locally bundled FluidR3 GM
  sample subsets, with attribution in its README. No external audio service is
  required. Only the instruments used on the page are fetched on first playback.
  Each page embeds only its own treatment data; the complete catalogue is not
  included in the browser's JavaScript bundle.

Sample playback approximates section size, instrumental phrasing, specific mutes
and bowing. It is intended for comparing musical choices, not as a finished recording.
The books and their scanned pages are not part of the public build.

To refresh sample subsets after editing pitches, run
`node scripts/source-orchestra-samples.mjs` with Node 22.18 or newer and network access.
Normal builds use the bundled sample files. Validate changes with `npm test`
and `npm run build`. On a slow OneDrive checkout, the repository tests can be run
with `npm test -- --testTimeout=60000 --maxWorkers=1 --no-file-parallelism`.
The orchestration tests check all profile names, unique musical scores (excluding
labels and cosmetic mix changes), complete melody coverage, instrument ranges,
every sampled pitch, and every MIDI and MusicXML part across the full collection.
