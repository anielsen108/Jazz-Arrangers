export const gilEvansVariants = [
  {
    slug: '01-orchestra-dashboard',
    number: '01',
    name: 'Orchestra Dashboard',
    short: 'Dashboard',
    description: 'A practical, scan-first control panel built from reusable data cards.',
  },
  {
    slug: '02-color-laboratory',
    number: '02',
    name: 'Color Laboratory',
    short: 'Color lab',
    description: 'Instrument families behave like pigments in a luminous orchestral palette.',
  },
  {
    slug: '03-living-score',
    number: '03',
    name: 'The Living Score',
    short: 'Score',
    description: 'A manuscript-inspired page where techniques read like musical notation.',
  },
  {
    slug: '04-night-constellation',
    number: '04',
    name: 'Night Constellation',
    short: 'Constellation',
    description: 'A spacious, dark atlas that turns timbre and register into a star map.',
  },
  {
    slug: '05-mixing-desk',
    number: '05',
    name: 'Orchestral Mixing Desk',
    short: 'Mixing desk',
    description: 'A tactile console of channels, levels, and interactive sonic layers.',
  },
  {
    slug: '06-blueprint',
    number: '06',
    name: 'Orchestration Blueprint',
    short: 'Blueprint',
    description: 'A technical drawing that exposes the architecture behind the sound.',
  },
  {
    slug: '07-listening-journey',
    number: '07',
    name: 'Listening Journey',
    short: 'Journey',
    description: 'A warm, cinematic path organized around what to notice while listening.',
  },
  {
    slug: '08-card-cabinet',
    number: '08',
    name: 'Arranger Card Cabinet',
    short: 'Card cabinet',
    description: 'A tactile collection of sortable ideas, signatures, and essential records.',
  },
  {
    slug: '09-swiss-signal',
    number: '09',
    name: 'Swiss Signal',
    short: 'Swiss signal',
    description: 'A high-contrast editorial poster with ruthless hierarchy and dense visuals.',
  },
  {
    slug: '10-cinematic-field',
    number: '10',
    name: 'Cinematic Field',
    short: 'Cinematic',
    description: 'An immersive, image-led treatment with gallery-scale visual moments.',
  },
] as const;

export type GilEvansVariant = (typeof gilEvansVariants)[number];

export const gilEvansBio =
  'Canadian-born and California-raised, Gil Evans turned Claude Thornhill’s soft brass-and-reed colors into a new language for jazz orchestra. With Miles Davis, he made space, register, and instrumental color as expressive as melody.';

export const soundDNA = [
  {
    label: 'Color',
    value: 96,
    word: 'Iridescent',
    description: 'French horn, tuba and woodwinds form blended colors.',
  },
  {
    label: 'Space',
    value: 90,
    word: 'Breathing',
    description: 'Silence and sustain carry as much weight as attack.',
  },
  {
    label: 'Register',
    value: 84,
    word: 'Wide',
    description: 'Airy tops float over unusually dark foundations.',
  },
  {
    label: 'Density',
    value: 42,
    word: 'Transparent',
    description: 'Individual colors remain audible inside the blend.',
  },
  {
    label: 'Motion',
    value: 58,
    word: 'Suspended',
    description: 'Slow inner lines make harmony seem to hover.',
  },
] as const;

export const techniques = [
  {
    number: '01',
    glyph: 'blend',
    title: 'Mixed choirs',
    cue: 'Listen across sections',
    description: 'Horn + bass clarinet + tuba become one new instrument.',
  },
  {
    number: '02',
    glyph: 'spread',
    title: 'Wide register',
    cue: 'Listen top to bottom',
    description: 'Open tenths and elevenths keep the voicing transparent.',
  },
  {
    number: '03',
    glyph: 'pedal',
    title: 'Pedal foundations',
    cue: 'Follow the lowest voice',
    description: 'A held low note lets upper harmony drift freely.',
  },
  {
    number: '04',
    glyph: 'crescendo',
    title: 'Timbral crescendo',
    cue: 'Count entering colors',
    description: 'Intensity grows by adding instruments, not only volume.',
  },
  {
    number: '05',
    glyph: 'mute',
    title: 'Muted warmth',
    cue: 'Notice softened brass',
    description: 'Straight, cup and harmon mutes reshape the brass core.',
  },
  {
    number: '06',
    glyph: 'gravity',
    title: 'Rootless gravity',
    cue: 'Feel the unresolved bass',
    description: 'Thirds and sevenths below the chord keep it in motion.',
  },
] as const;

export const albums = [
  {
    year: '1957',
    title: 'Miles Ahead',
    artist: 'Miles Davis + Gil Evans',
    line: 'A continuous, bright orchestral suite with Davis’s flugelhorn at the center.',
  },
  {
    year: '1960',
    title: 'Sketches of Spain',
    artist: 'Miles Davis + Gil Evans',
    line: 'Spanish source material recast as dark, spacious, quasi-symphonic jazz.',
  },
  {
    year: '1960',
    title: 'Out of the Cool',
    artist: 'The Gil Evans Orchestra',
    line: 'The Evans sound loosens into longer forms, deeper grooves and abstraction.',
  },
] as const;

export const pieces = [
  {
    slug: 'boplicity',
    title: 'Boplicity',
    year: '1949',
    album: 'Birth of the Cool',
    videoId: 'r-gOVGLe-dA',
    videoTitle: 'Boplicity — Miles Davis, Birth of the Cool',
    note: 'The compact nonet already sounds larger than its nine chairs.',
    cue: 'Hear the French horn and tuba dissolve the usual brass/reed boundary.',
    families: [
      { label: 'Brass', value: 4, color: 'brass' },
      { label: 'Woodwinds', value: 2, color: 'reeds' },
      { label: 'Rhythm', value: 3, color: 'rhythm' },
    ],
    instruments: ['Trumpet', 'Trombone', 'French horn', 'Tuba', 'Alto sax', 'Baritone sax', 'Piano', 'Bass', 'Drums'],
  },
  {
    slug: 'summertime',
    title: 'Summertime',
    year: '1958',
    album: 'Porgy and Bess',
    videoId: 'g7oFAYru2nU',
    videoTitle: 'Summertime — Miles Davis, Porgy and Bess',
    note: 'Muted trumpet floats above an orchestra with no piano.',
    cue: 'Hear flute and bass clarinet turn the accompaniment into atmosphere.',
    families: [
      { label: 'Brass', value: 13, color: 'brass' },
      { label: 'Woodwinds', value: 4, color: 'reeds' },
      { label: 'Rhythm', value: 2, color: 'rhythm' },
    ],
    instruments: ['5 trumpets', '4 trombones', '3 French horns', 'Tuba', '2 flutes', 'Alto sax', 'Bass clarinet', 'Bass', 'Drums'],
  },
  {
    slug: 'concierto',
    title: 'Concierto de Aranjuez',
    year: '1959',
    album: 'Sketches of Spain',
    videoId: 'mpRXA3lFrqM',
    videoTitle: 'Concierto de Aranjuez: Adagio — Miles Davis, Sketches of Spain',
    note: 'Oboes, bassoon, harp and percussion expand the jazz orchestra.',
    cue: 'Hear solo flugelhorn move through layers rather than sit in front of a block.',
    families: [
      { label: 'Brass', value: 10, color: 'brass' },
      { label: 'Woodwinds', value: 8, color: 'reeds' },
      { label: 'Rhythm + color', value: 5, color: 'rhythm' },
    ],
    instruments: ['Flugelhorn', '4 trumpets', '2 trombones', '3 French horns', 'Tuba', '2 flutes', '2 oboes', 'Bassoon', 'Bass clarinet', 'Harp', 'Bass', 'Drums', '2 percussion'],
  },
] as const;
