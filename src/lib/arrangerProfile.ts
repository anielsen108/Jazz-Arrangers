export interface SoundDimension {
  label: 'Color' | 'Space' | 'Register' | 'Density' | 'Motion';
  value: number;
  word: string;
  description: string;
}

export interface TechniqueCard {
  number: string;
  glyph: 'blend' | 'spread' | 'pedal' | 'crescendo' | 'mute' | 'gravity';
  title: string;
  cue: string;
  description: string;
}

export interface AlbumRow {
  year: string;
  title: string;
  artist: string;
  line: string;
}

export interface ScoreCard {
  slug: string;
  title: string;
  album: string;
  year: string;
  note: string;
  cue: string;
  dimensions: Array<{ label: 'Color' | 'Register' | 'Density' | 'Motion'; value: number }>;
}

export interface ArrangerProfile {
  bio: string;
  bioWordCount: number;
  thesis: string;
  soundDNA: SoundDimension[];
  techniques: TechniqueCard[];
  albums: AlbumRow[];
  scores: ScoreCard[];
  tags: string[];
}

const SECTION_PATTERNS = {
  biography: /^##\s+Biography\b.*$/im,
  style: /^##\s+Musical Style\b.*$/im,
  techniques: /^##\s+Orchestration Techniques\b.*$/im,
  albums: /^##\s+.*Albums\b.*$/im,
};

function section(body: string, heading: RegExp): string {
  const match = heading.exec(body);
  if (!match || match.index === undefined) return '';
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const next = /^##\s+/m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function supplementaryStyleSection(body: string): string {
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)];
  for (let index = 0; index < headings.length; index += 1) {
    const title = headings[index][1];
    if (/Biography|Orchestration|Albums|Significance|Major .*Work/i.test(title)) continue;
    const start = (headings[index].index ?? 0) + headings[index][0].length;
    const end = headings[index + 1]?.index ?? body.length;
    return body.slice(start, end).trim();
  }
  return '';
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentences(value: string): string[] {
  const clean = cleanMarkdown(value);
  if (!clean) return [];
  return clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function capWords(value: string, limit: number): string {
  const items = words(cleanMarkdown(value));
  if (items.length <= limit) return items.join(' ');
  return `${items.slice(0, limit).join(' ').replace(/[,:;—-]+$/, '')}…`;
}

function conciseSection(value: string, targetWords: number): string {
  const selected: string[] = [];
  let count = 0;
  for (const item of sentences(value)) {
    const length = words(item).length;
    if (selected.length > 0 && count + length > targetWords) break;
    selected.push(item);
    count += length;
    if (count >= Math.min(24, targetWords)) break;
  }
  return capWords(selected.join(' ') || value, targetWords);
}

const dimensionRules = [
  {
    label: 'Color' as const,
    terms: ['color', 'timbre', 'orchestrat', 'instrument', 'blend', 'mute', 'doubl', 'brass', 'woodwind', 'palette'],
    words: ['Focused', 'Varied', 'Iridescent'],
    descriptions: ['A concentrated instrumental palette.', 'Contrasting families shape the sound.', 'Instrumental color leads the design.'],
  },
  {
    label: 'Space' as const,
    terms: ['space', 'sparse', 'transparent', 'open', 'silence', 'sustain', 'chamber', 'clarity', 'breath'],
    words: ['Compact', 'Balanced', 'Breathing'],
    descriptions: ['Ideas arrive in tightly packed frames.', 'Space and activity stay in balance.', 'Silence and sustain carry structural weight.'],
  },
  {
    label: 'Register' as const,
    terms: ['register', 'range', 'octave', 'spread', 'spacing', 'upper', 'lower', 'wide', 'voicing'],
    words: ['Centered', 'Layered', 'Expansive'],
    descriptions: ['The writing favors a centered range.', 'Registers work as distinct layers.', 'Wide spans define the orchestral frame.'],
  },
  {
    label: 'Density' as const,
    terms: ['dense', 'complex', 'layer', 'polyphon', 'contrapunt', 'cluster', 'tutti', 'multiple', 'independent'],
    words: ['Transparent', 'Layered', 'Ornate'],
    descriptions: ['Individual lines stay easy to follow.', 'Several musical planes coexist.', 'Dense detail rewards close listening.'],
  },
  {
    label: 'Motion' as const,
    terms: ['rhyth', 'swing', 'syncop', 'groove', 'pulse', 'drive', 'momentum', 'polyrhythm', 'ostinato', 'metric'],
    words: ['Suspended', 'Elastic', 'Propulsive'],
    descriptions: ['Motion unfolds with patience.', 'The rhythmic feel expands and contracts.', 'Rhythm actively drives the architecture.'],
  },
];

function scoreDimension(text: string, terms: string[]): number {
  const normalized = text.toLowerCase();
  let total = 0;
  let unique = 0;
  for (const term of terms) {
    const matches = normalized.match(new RegExp(term, 'g'))?.length ?? 0;
    if (matches > 0) unique += 1;
    total += Math.min(matches, 4);
  }
  return Math.max(38, Math.min(96, 40 + unique * 5 + total * 1.7));
}

function soundDimensions(style: string, techniqueText: string): SoundDimension[] {
  const source = `${style} ${techniqueText}`;
  return dimensionRules.map((rule) => {
    const value = Math.round(scoreDimension(source, rule.terms));
    const tier = value >= 75 ? 2 : value >= 56 ? 1 : 0;
    return {
      label: rule.label,
      value,
      word: rule.words[tier],
      description: rule.descriptions[tier],
    };
  });
}

const techniqueRules = [
  { title: 'Mixed choirs', glyph: 'blend' as const, cue: 'Listen across sections', terms: ['timbre', 'doubl', 'blend', 'combination', 'pair', 'mixed'] },
  { title: 'Voicing design', glyph: 'spread' as const, cue: 'Hear the chord spacing', terms: ['voicing', 'spacing', 'interval', 'close-position', 'open-position'] },
  { title: 'Bass foundations', glyph: 'pedal' as const, cue: 'Follow the lowest voice', terms: ['bass', 'pedal', 'foundation', 'bottom'] },
  { title: 'Dynamic shape', glyph: 'crescendo' as const, cue: 'Track the changing weight', terms: ['dynamic', 'crescendo', 'volume', 'intensity', 'subito'] },
  { title: 'Featured colors', glyph: 'mute' as const, cue: 'Notice the altered tone', terms: ['mute', 'plunger', 'extended technique', 'individual', 'personality', 'solo'] },
  { title: 'Harmonic gravity', glyph: 'gravity' as const, cue: 'Feel tension and release', terms: ['harmon', 'chord', 'cluster', 'quartal', 'disson', 'tonal'] },
  { title: 'Independent lines', glyph: 'blend' as const, cue: 'Follow one line at a time', terms: ['counterpoint', 'contrapunt', 'independent', 'polyphon', 'imitative'] },
  { title: 'Register layers', glyph: 'spread' as const, cue: 'Listen top to bottom', terms: ['register', 'range', 'octave', 'upper', 'lower'] },
  { title: 'Rhythmic layers', glyph: 'crescendo' as const, cue: 'Count the simultaneous pulses', terms: ['rhyth', 'syncop', 'metric', 'ostinato', 'groove', 'swing'] },
  { title: 'Section dialogue', glyph: 'pedal' as const, cue: 'Hear the handoff', terms: ['section', 'antiphon', 'call-and-response', 'exchange', 'answer'] },
];

function techniqueCards(value: string): TechniqueCard[] {
  const sourceSentences = sentences(value);
  const usedRules = new Set<string>();
  const usedSentences = new Set<number>();
  const selected: Omit<TechniqueCard, 'number'>[] = [];

  for (let sentenceIndex = 0; sentenceIndex < sourceSentences.length && selected.length < 6; sentenceIndex += 1) {
    const lower = sourceSentences[sentenceIndex].toLowerCase();
    const rule = techniqueRules.find(
      (candidate) => !usedRules.has(candidate.title) && candidate.terms.some((term) => lower.includes(term))
    );
    if (!rule) continue;
    usedRules.add(rule.title);
    usedSentences.add(sentenceIndex);
    selected.push({
      title: rule.title,
      glyph: rule.glyph,
      cue: rule.cue,
      description: capWords(sourceSentences[sentenceIndex], 18),
    });
  }

  for (let index = 0; index < sourceSentences.length && selected.length < 6; index += 1) {
    if (usedSentences.has(index)) continue;
    selected.push({
      title: `Arranging device ${selected.length + 1}`,
      glyph: (['blend', 'spread', 'pedal', 'crescendo', 'mute', 'gravity'] as const)[selected.length % 6],
      cue: 'Listen for this detail',
      description: capWords(sourceSentences[index], 18),
    });
  }

  while (selected.length < 6) {
    const fallback = techniqueRules[selected.length];
    selected.push({
      title: fallback.title,
      glyph: fallback.glyph,
      cue: fallback.cue,
      description: 'A recurring device in this arranger’s orchestral language.',
    });
  }

  return selected.slice(0, 6).map((item, index) => ({ ...item, number: `0${index + 1}` }));
}

function parseAlbumHeading(heading: string): Pick<AlbumRow, 'year' | 'title' | 'artist'> {
  const yearMatch = heading.match(/\((\d{4}(?:[–-]\d{2,4})?)\)\s*$/);
  const year = yearMatch?.[1] ?? '—';
  const withoutYear = heading.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const quoted = withoutYear.match(/["“]([^"”]+)["”]/)?.[1];
  const dashParts = withoutYear.split(/\s+[–—-]\s+/);
  const artist = dashParts.length > 1 ? dashParts[0].trim() : '';
  const title = quoted ?? (dashParts.length > 1 ? dashParts.slice(1).join(' — ') : withoutYear);
  return { year, title: title.replace(/^["“]|["”]$/g, ''), artist };
}

function albumRows(value: string): AlbumRow[] {
  return value
    .split(/^###\s+/m)
    .slice(1)
    .map((block) => {
      const [heading = '', ...bodyLines] = block.split(/\r?\n/);
      return {
        ...parseAlbumHeading(heading.trim()),
        line: capWords(sentences(bodyLines.join(' '))[0] ?? bodyLines.join(' '), 22),
      };
    })
    .filter((album) => album.title)
    .slice(0, 3);
}

function quotedWorkRows(body: string): AlbumRow[] {
  const allSentences = sentences(body);
  const seen = new Set<string>();
  const rows: AlbumRow[] = [];
  for (const match of body.matchAll(/["“]([^"”]{2,80})["”]\s*\((\d{4})/g)) {
    const title = match[1].trim();
    if (seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    const context = allSentences.find((item) => item.includes(title));
    rows.push({
      year: match[2],
      title,
      artist: '',
      line: capWords(context ?? `A featured work from this arranger’s catalog.`, 22),
    });
    if (rows.length === 3) break;
  }
  return rows;
}

function scoreSlug(value: string, index: number): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${slug || 'score'}-${index + 1}`;
}

function scoreCards(albumText: string, albums: AlbumRow[], overall: SoundDimension[]): ScoreCard[] {
  const blocks = albumText.split(/^###\s+/m).slice(1);
  return albums.map((album, index) => {
    const block = blocks[index] ?? '';
    const [, ...bodyLines] = block.split(/\r?\n/);
    const bodyText = cleanMarkdown(bodyLines.join(' ')) || album.line;
    const quotedTitle = [...bodyText.matchAll(/["“]([^"”]{2,80})["”]/g)]
      .map((match) => match[1].trim())
      .find((title) => title.toLowerCase() !== album.title.toLowerCase());
    const title = quotedTitle ?? album.title;
    const scoreDimensions = (['Color', 'Register', 'Density', 'Motion'] as const).map((label) => {
      const rule = dimensionRules.find((candidate) => candidate.label === label)!;
      const baseline = overall.find((dimension) => dimension.label === label)?.value ?? 50;
      return {
        label,
        value: Math.round(baseline * 0.75 + scoreDimension(bodyText, rule.terms) * 0.25),
      };
    });
    const strongest = [...scoreDimensions].sort((a, b) => b.value - a.value)[0];
    return {
      slug: scoreSlug(title, index),
      title,
      album: album.title,
      year: album.year,
      note: capWords(sentences(bodyText)[0] ?? bodyText, 22),
      cue: `Notice how ${strongest.label.toLowerCase()} shapes the orchestral profile.`,
      dimensions: scoreDimensions,
    };
  });
}

export function parseArrangerProfile(body: string): ArrangerProfile {
  const biography = section(body, SECTION_PATTERNS.biography);
  const style = section(body, SECTION_PATTERNS.style) || supplementaryStyleSection(body);
  const techniqueText = section(body, SECTION_PATTERNS.techniques);
  const albumText = section(body, SECTION_PATTERNS.albums);
  const bio = conciseSection(biography, 42);
  const soundDNA = soundDimensions(style, techniqueText);
  const ranked = [...soundDNA].sort((a, b) => b.value - a.value);

  const parsedAlbums = albumRows(albumText);
  const fallbackAlbums = quotedWorkRows(body).filter(
    (candidate) => !parsedAlbums.some((album) => album.title.toLowerCase() === candidate.title.toLowerCase())
  );

  const albums = [...parsedAlbums, ...fallbackAlbums].slice(0, 3);

  return {
    bio,
    bioWordCount: words(bio).length,
    thesis: capWords(sentences(style)[0] ?? style, 16),
    soundDNA,
    techniques: techniqueCards(techniqueText),
    albums,
    scores: scoreCards(albumText, albums, soundDNA),
    tags: ranked.slice(0, 3).map((item) => `${item.word.toLowerCase()} ${item.label.toLowerCase()}`),
  };
}
