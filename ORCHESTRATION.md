# Orchestration studies

The Orchestration section now plays an original eight-bar miniature, **Small Hours**,
in three named treatments: Don Sebesky, Sammy Nestico and Gil Evans. The melody and
chord sequence are shared. Each treatment has its own scored parts, voicings,
articulation, rhythm and commentary. Matching arranger pages select their treatment;
other pages identify the shared comparison collection explicitly.

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
- The three existing arranger profiles supply the broader stylistic context.
  The examples illustrate selected devices, not a comprehensive model of an arranger.

## Implementation

- `src/lib/orchestration.ts`: original music and bar commentary; all pitches are
  sounding pitches, with C4 = MIDI 60. Each string division is an independent line.
- `src/lib/orchestraAudio.ts`: Web Audio sample player, transport, swing timing and mixer.
- `src/lib/orchestraScore.ts`: concert-pitch part notation and MIDI/MusicXML exports.
- `src/components/OrchestrationPlayer.astro`, `src/lib/orchestraPlayer.ts` and
  `src/styles/orchestration-player.css`: page interface and controls.
- `public/audio/orchestra/`: approximately 5 MB of locally bundled FluidR3 GM
  sample subsets, with attribution in its README. No external audio service is
  required. Instrument samples are fetched on first playback for each treatment.

Sample playback approximates section size, instrumental phrasing, specific mutes
and bowing. It is intended for comparing musical choices, not as a finished recording.
The books and their scanned pages are not part of the public build.

To refresh sample subsets after editing pitches, run
`node scripts/source-orchestra-samples.mjs` with Node 22.18 or newer and network access.
Normal builds use the bundled sample files. Validate changes with `npm test`
and `npm run build`. On a slow OneDrive checkout, the repository tests can be run
with `npm test -- --testTimeout=60000 --maxWorkers=1 --no-file-parallelism`.
