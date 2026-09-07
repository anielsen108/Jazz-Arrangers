# Orchestration studies

## Dedicated listening view

The home page has a prominent **At the Arranging Desk** player entry, also available
in the main navigation. `/arranging-desk/` opens the standalone player with Christian
McBride selected. Each artist has a direct URL, for example
`/arranging-desk/christian-mcbride/` or `/arranging-desk/gil-evans/`.

The artist list searches across all 150 names, ignoring accents, spaces and
punctuation. Name search combines with time period (the artist's predominant era),
ensemble size (up to 7, 8, or 9+ scored parts), and instrumentation (a family or
individual instrument present in the study). Size counts scored parts, including
section parts, rather than claiming a player headcount. Instrument facets use the
sounding instruments, including leads, and exclude silent parts. Option counts
reflect the other active filters; unavailable combinations are disabled.

Enter opens the first match; Arrow Down moves from search into the results, and
arrow keys navigate the list. Escape or Clear resets the name search; Reset all
clears all four controls. Filtering leaves the current player unchanged until an
artist is selected, with a notice if the current artist is outside the results.
Selection preserves `q`, `era`, `size`, and `instrument` in the URL. Native links provide
bookmarking, Back/Forward and a browseable list without JavaScript; playback still
requires JavaScript. The picker folds away on phones.

The desk reuses the same `OrchestrationPlayer` component and scores as artist
profiles. `ArrangingDesk.astro` supplies the searchable directory and profile links;
`deskFilters.ts` derives study facets and combines filters; `deskNavigation.ts`
handles controls, URL state and keyboard navigation. Artist changes open
the selected score ready to play and stop the previous page's audio.

## Artist studies

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
  Recorded dynamics and pitch-center selection are defined in `orchestraSamples.ts`.
  Only recordings needed by the current study are decoded; sustain buffers are cached.
- `src/lib/orchestraScore.ts`: concert-pitch part notation and MIDI/MusicXML exports.
- `src/components/OrchestrationPlayer.astro`, `src/lib/orchestraPlayer.ts` and
  `src/styles/orchestration-player.css`: page interface and controls.
- `public/audio/orchestra/`: locally bundled VSCO 2 CE, MTG Solo Saxophones,
  Karoryfer Meatbass and retained FluidR3 GM sample subsets, with attribution,
  licenses and conversion details in its README. Eighteen instrument banks use
  the new recorded format, with two or three dynamics where available. Ten less
  common colors retain the previous banks; eight extreme-register brass pitches
  also retain their previous recordings. No external audio service is
  required. Only the instruments used on the page are fetched on first playback.
  Each page embeds only its own treatment data; the complete catalogue is not
  included in the browser's JavaScript bundle.

Sample playback approximates section size, instrumental phrasing, specific mutes
and bowing. It is intended for comparing musical choices, not as a finished recording.
The books and their scanned pages are not part of the public build.

To refresh sample subsets after editing pitches, run
`node scripts/source-orchestra-samples.mjs` for retained legacy sounds and
`node scripts/source-orchestra-hq.mjs --write` for the new recordings, with Node
22.18 or newer and network access. The latter also requires FFmpeg. Its source
revisions are pinned, and its downloads and intermediate files stay under
`output/tooling/`. `--dry-run` checks pitch and dynamic selections before conversion.
Normal builds use the bundled sample files. Validate changes with `npm test`
and `npm run build`. On a slow OneDrive checkout, the repository tests can be run
with `npm test -- --testTimeout=60000 --maxWorkers=1 --no-file-parallelism`.
The orchestration tests check all profile names, unique musical scores (excluding
labels and cosmetic mix changes), complete melody coverage, instrument ranges,
every sampled pitch, and every MIDI and MusicXML part across the full collection.
