# Recorded artist performances

These are original eight-bar musical performances of the site's artist studies.
They are rendered on GitHub Actions with free instrument libraries, then served
as stereo Opus recordings. No MuseScore installation or sample library is needed
on the listener's computer. The underlying MuseSounds libraries are not included.

Each artist has a manifest in `v1/`, identifying every part's recording, source,
level restoration and ensemble normalization. Content hashes let genuinely
identical musical parts share a file. The score, instrumentation and notes determine
that hash; artist names never select an unrelated recording.

## Instruments and credits

- **MuseSounds**, by Muse Group: verified available winds, piano and orchestral
  instruments from the free Muse Brass, Muse Woodwinds, Muse Keys and Muse Strings
  libraries. https://www.musehub.com/bundle/musesounds-core
- **Karoryfer Meatbass**, CC0: the plucked upright bass used in the approved
  McBride audition. Played and mapped by Drogomir Smolken, recorded by Ludwik
  Zamenhof, released by Karoryfer Samples.
  https://github.com/sfzinstruments/karoryfer.meatbass
- **VSCO 2 CE**, CC0, by Sam Gossner / Versilian Studios and Simon Dalzell /
  Ivy Audio; sample cutting by Elan Hickler / Soundemote: retained for instruments
  without a verified matching MuseSounds voice, including Harmon-muted trumpet.
  https://github.com/sgossner/VSCO-2-CE
- **MTG Solo Saxophones**, CC BY 4.0, by MTG, edited and mapped by kinwie:
  available as the recorded saxophone source if a free MuseSounds voice is missing.
  https://github.com/sfzinstruments/MTG.SoloSax
- **FluidR3 GM**, CC BY 3.0, by Frank Wen and contributors; MIDI.js renderings by
  Benjamin Gleitzman and contributors: retained for electric piano, electric bass,
  guitars, organ, accordion, wordless choir, vibraphone and woodblock.
  https://github.com/gleitz/midi-js-soundfonts/tree/gh-pages/FluidR3_GM

Detailed upstream revisions, attribution and license texts for the bundled
instrument sources are in [the sample credits](../orchestra/README.md).
The actual source of each rendered part is recorded in its artist manifest.
Unsupported MuseSounds voices do not silently use MuseScore's basic sound bank.

## Playback and rebuilding

The performance tempo is 104 BPM. The browser schedules all parts together and
applies the score's original levels and stereo placement. Mixes target -20 LUFS,
with additional headroom where necessary. Solo and mute change the same playing
parts; they do not switch to a different instrument renderer. Seeking uses the
score's swing mapping, and playback includes the final release.

Tempo changes use **SoundTouchJS core 2.1.1** (MPL-2.0) in a worker to preserve
pitch without blocking the controls. The default tempo plays the unmodified
recordings. Source: https://github.com/cutterbl/SoundTouchJS
License: [MPL-2.0](LICENSE-soundtouch.txt).

Run the `Render recorded ensemble` GitHub workflow to regenerate the catalogue.
Its free public runners install MuseScore Studio 4.7.4 and free MuseSounds through
the official installer. Rendered pitches are checked against each source measure;
MuseSampler activation and audio levels are verified before packaging. Download
the `recorded-ensemble-catalogue` artifact into `public/audio/performances/v1/`,
then run the repository tests and production build before publishing.
