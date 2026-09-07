# Instrument recordings and credits

The player combines recorded multisamples with selected FluidR3 GM sounds. Only
pitches and dynamics needed by the studies are bundled; playback needs no plug-in
or external audio service.

## VSCO 2 Community Edition

Recorded by **Sam Gossner / Versilian Studios** and **Simon Dalzell / Ivy Audio**;
sample cutting by **Elan Hickler / Soundemote**.

- Source: https://github.com/sgossner/VSCO-2-CE
- Audio revision: `440300901dfe9275fd84e0b7763af1f8443ae62e`
- SFZ mapping revision: `6dd651d55dde97fd4028699be9d4481f26917891`
- License: **CC0 1.0**, https://creativecommons.org/publicdomain/zero/1.0/
- License text: [LICENSE-vsco.txt](LICENSE-vsco.txt)

Used for trumpet, Harmon-muted trumpet, trombone, French horn, tuba, flute,
clarinet, bassoon, violin/viola/cello sections, solo violin, harp, upright piano,
and marimba. The piano remains labelled “Piano” in the scores.

## MTG Solo Saxophones

Soprano, alto, tenor and baritone saxophone recordings by **MTG**, from its
[Freesound sample packs](https://freesound.org/people/MTG/). Editing, looping,
tuning corrections and SFZ mappings by **kinwie**.

- Source: https://github.com/sfzinstruments/MTG.SoloSax
- Revision: `b494d256549b3d088fdec176ce82867f8a1f58b2`
- License: **Creative Commons Attribution 4.0 International**,
  https://creativecommons.org/licenses/by/4.0/
- License text: [LICENSE-sax.txt](LICENSE-sax.txt)

The browser subset retains two recorded dynamics for soprano, alto and tenor,
and three for baritone. It uses the original first take for each selected pitch;
the SFZ engine's neighbouring-note round robins are not included.

## Karoryfer Meatbass

A 1958 Otto Rubner double bass, played and mapped by **Drogomir Smolken**,
recorded by **Ludwik Zamenhof**, released by **Karoryfer Samples**.

- Source: https://github.com/sfzinstruments/karoryfer.meatbass
- Revision: `ac9e859564bda286ab5ec672d00ff1aa2fef2895`
- License: **CC0 1.0**, https://creativecommons.org/publicdomain/zero/1.0/
- License text: [LICENSE-bass.txt](LICENSE-bass.txt)

Used for plucked acoustic bass, with two recorded dynamics selected from the
library's four-layer pizzicato instrument.

## Retained FluidR3 GM sounds

By **Frank Wen and contributors**, rendered for MIDI.js by **Benjamin Gleitzman
and contributors**.

- Source: https://github.com/gleitz/midi-js-soundfonts/tree/gh-pages/FluidR3_GM
- License: **Creative Commons Attribution 3.0 Unported**,
  https://creativecommons.org/licenses/by/3.0/
- Upstream attribution: https://github.com/gleitz/midi-js-soundfonts#soundfonts-available

Retained for accordion, acoustic and electric guitar, electric bass, electric
piano, English horn, organ, vibraphone, woodblock and wordless choir, plus eight
extreme-register pitches beyond the chosen trombone and French-horn recordings.
These are identified individually in the new banks. Original baseline:
Jazz-Arrangers commit `62e31536d8072cf09aacd82cfa2f2e06c3851e26`.

## Changes made for this player

The new recordings are selected from upstream mappings, trimmed at the start to
remove silence, level-matched, limited to 3.6 seconds for sustained instruments
or 5 seconds for decaying instruments, and encoded as 44.1 kHz MP3. String sections,
solo violin, harp and piano retain stereo. Sustained sounds receive crossfaded
loop regions. The browser preserves source pitch centers and tuning corrections,
and chooses a recorded dynamic from note velocity. Velocity split points are
adapted to the studies. Some source instruments have only one recorded dynamic.

Saxophones use a sparse pitch grid, generally every three semitones. Other
instruments use the supplied SFZ zones. Pitch shifts are limited to five semitones;
uncovered pitches retain FluidR3 recordings. Each new sample identifies its source
file and the SHA-256 digest of the upstream recording. These are reduced teaching
instruments, not complete SFZ implementations or full commercial libraries.

To rebuild, run `node scripts/source-orchestra-hq.mjs --write` with Node 22.18+
and FFmpeg (`--ffmpeg=path` or `FFMPEG_PATH`). Downloads and intermediate audio stay
in ignored `output/tooling/` folders. Use `--dry-run` to check mappings first.
`scripts/source-orchestra-samples.mjs` refreshes only the retained legacy banks.

The music and commentary are original educational illustrations, not excerpts
from recordings or from Sebesky's or Nestico's books.
