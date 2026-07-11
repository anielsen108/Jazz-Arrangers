import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const arrangersRoot = join(root, 'arrangers');
const reportPath = join(root, 'scripts', 'youtube-examples-report.json');
const shouldWrite = process.argv.includes('--write');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Infinity;
const offsetArg = process.argv.indexOf('--offset');
const offset = offsetArg >= 0 ? Number(process.argv[offsetArg + 1]) : 0;
const concurrencyArg = process.argv.indexOf('--concurrency');
const concurrency = concurrencyArg >= 0 ? Number(process.argv[concurrencyArg + 1]) : 2;
const userAgent = 'Mozilla/5.0 (compatible; JazzArrangersListeningExamples/1.0)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalize(value = '') {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|and|by|from|with|for|of|in|on)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(value = '') {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleFromAlbumHeading(heading) {
  const withoutYear = heading.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const quoted = withoutYear.match(/["“]([^"”]+)["”]/)?.[1];
  const parts = withoutYear.split(/\s+[–—-]\s+/);
  return (quoted ?? (parts.length > 1 ? parts.slice(1).join(' — ') : withoutYear)).replace(/^["“]|["”]$/g, '');
}

function arrangerName(markdown) {
  return markdown.match(/^#\s+(.+?)(?:\s+\([^\n]*\))?\s*$/m)?.[1]?.trim();
}

function scoresFromMarkdown(markdown) {
  const heading = /^##\s+.*Albums\b.*$/im.exec(markdown);
  const rest = heading?.index === undefined ? '' : markdown.slice(heading.index + heading[0].length);
  const nextHeading = /^##\s+/m.exec(rest);
  const albumSection = (nextHeading ? rest.slice(0, nextHeading.index) : rest).trim();
  return albumSection
    .split(/^###\s+/m)
    .slice(1)
    .map((block) => {
      const [heading = '', ...body] = block.split(/\r?\n/);
      const album = titleFromAlbumHeading(heading);
      const text = body.join(' ').replace(/\s+/g, ' ').trim();
      const quoted = [...text.matchAll(/["“]([^"”]{2,80})["”]/g)]
        .map((match) => match[1].trim())
        .find((title) => normalize(title) !== normalize(album));
      return { title: quoted ?? album, album };
    })
    .filter((score) => score.title);
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  }));
  return children.flat();
}

function extractInitialData(html) {
  const marker = 'var ytInitialData = ';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('YouTube response did not contain search data');
  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return JSON.parse(html.slice(jsonStart, index + 1));
  }
  throw new Error('Unable to parse YouTube search data');
}

function textValue(value) {
  return value?.simpleText ?? value?.runs?.map((run) => run.text).join('') ?? '';
}

function videoResults(data) {
  const found = [];
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (value.videoRenderer?.videoId) {
      const video = value.videoRenderer;
      found.push({
        id: video.videoId,
        title: textValue(video.title),
        channel: textValue(video.ownerText),
        description: textValue(video.detailedMetadataSnippets?.[0]?.snippetText),
        seconds: Number(video.lengthText?.simpleText?.split(':').reduce((total, part) => total * 60 + Number(part), 0) ?? 0),
      });
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(data);
  return [...new Map(found.map((video) => [video.id, video])).values()];
}

async function searchYouTube(query) {
  await sleep(350);
  const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': userAgent, 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!response.ok) throw new Error(`YouTube search returned ${response.status}`);
  return videoResults(extractInitialData(await response.text()));
}

function pickCandidate(name, score, candidates) {
  const work = normalizeTitle(score.title);
  const album = normalize(score.album);
  const lastName = normalize(name).split(' ').at(-1) ?? '';
  const isAlbumTitle = work === normalizeTitle(score.album);
  const reject = /tutorial|lesson|analysis|reaction|review|interview|documentary|how to play/i;
  const ranked = candidates
    .filter((candidate) => {
      const source = normalize(`${candidate.title} ${candidate.channel} ${candidate.description}`);
      return !reject.test(candidate.title)
        && normalizeTitle(candidate.title).includes(work)
        && (!isAlbumTitle || (lastName.length > 2 && source.includes(lastName)));
    })
    .map((candidate) => {
      const source = normalize(`${candidate.title} ${candidate.channel} ${candidate.description}`);
      let scoreValue = source.includes(work) ? 100 : 0;
      if (lastName.length > 2 && source.includes(lastName)) scoreValue += 30;
      if (album.length > 5 && source.includes(album)) scoreValue += 25;
      if (candidate.seconds >= 60) scoreValue += 5;
      return { ...candidate, confidence: scoreValue };
    })
    .sort((a, b) => b.confidence - a.confidence);
  return ranked[0]?.confidence >= 130 ? ranked[0] : undefined;
}

function addVideosFrontmatter(markdown, videos) {
  const entries = videos.flatMap((video) => [
    `  - id: ${video.id}`,
    `    title: '${video.title.replaceAll("'", "''")}'`,
    `    piece: '${video.piece.replaceAll("'", "''")}'`,
  ]).join('\n');
  const existingBlock = /^videos:\r?\n(?:(?:^[ \t].*(?:\r?\n|$))*)/m.exec(markdown);
  if (existingBlock?.index !== undefined) {
    const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
    return `${markdown.slice(0, existingBlock.index)}${existingBlock[0].trimEnd()}${newline}${entries.replaceAll('\n', newline)}${newline}${markdown.slice(existingBlock.index + existingBlock[0].length)}`;
  }
  const block = `videos:\n${entries}`;
  const frontmatter = /^(---\r?\n[\s\S]*?)(\r?\n---)(?=\r?\n|$)/.exec(markdown);
  if (frontmatter) {
    const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
    const insertionAt = frontmatter[1].length;
    return `${markdown.slice(0, insertionAt)}${newline}${block.replaceAll('\n', newline)}${markdown.slice(insertionAt)}`;
  }
  return `---\n${block}\n---\n${markdown}`;
}

function repairMisplacedVideos(markdown) {
  const trailing = /\r?\n(videos:\r?\n(?:  - id: [^\r\n]+\r?\n    title: [^\r\n]+\r?\n    piece: [^\r\n]+\r?\n?)+)\s*$/.exec(markdown);
  if (!trailing || !markdown.startsWith('---')) return markdown;

  const withoutTrailing = markdown.slice(0, trailing.index).replace(/\s+$/, '');
  const videoLines = trailing[1].split(/\r?\n/).filter(Boolean);
  const videos = [];
  for (let index = 1; index < videoLines.length; index += 3) {
    videos.push({
      id: videoLines[index].replace(/^  - id: /, ''),
      title: videoLines[index + 1].replace(/^    title: '/, '').replace(/'$/, '').replaceAll("''", "'"),
      piece: videoLines[index + 2].replace(/^    piece: '/, '').replace(/'$/, '').replaceAll("''", "'"),
    });
  }
  return addVideosFrontmatter(withoutTrailing, videos);
}

const files = await markdownFiles(arrangersRoot);
const targets = [];
const repairs = new Map();
for (const path of files) {
  const originalMarkdown = await readFile(path, 'utf8');
  const markdown = repairMisplacedVideos(originalMarkdown);
  if (markdown !== originalMarkdown) repairs.set(path, markdown);
  if (/^pieces:/m.test(markdown)) continue;
  const name = arrangerName(markdown);
  if (!name) continue;
  const existingPieces = new Set(
    [...markdown.matchAll(/^\s+piece:\s+['"]?(.+?)['"]?\s*$/gm)].map((match) => match[1].replaceAll("''", "'"))
  );
  for (const score of scoresFromMarkdown(markdown)) {
    if (!existingPieces.has(score.title)) targets.push({ path, markdown, name, score });
  }
}

const batch = targets.slice(offset, offset + limit);
async function sourceTarget(target) {
  const query = `${target.name} "${target.score.title}" ${target.score.album} jazz`;
  try {
    const candidates = await searchYouTube(query);
    const match = pickCandidate(target.name, target.score, candidates);
    return { ...target, query, status: match ? 'matched' : 'unresolved', match, candidates: candidates.slice(0, 3) };
  } catch (error) {
    return { ...target, query, status: 'error', error: error.message };
  }
}

const results = new Array(batch.length);
let next = 0;
await Promise.all(Array.from({ length: Math.max(1, concurrency) }, async () => {
  while (next < batch.length) {
    const index = next++;
    results[index] = await sourceTarget(batch[index]);
  }
}));

if (shouldWrite) {
  const grouped = new Map([...repairs].map(([path, markdown]) => [path, { markdown, videos: [] }]));
  for (const result of results.filter((result) => result.status === 'matched')) {
    const group = grouped.get(result.path) ?? { markdown: result.markdown, videos: [] };
    group.videos.push({ id: result.match.id, title: result.match.title, piece: result.score.title });
    grouped.set(result.path, group);
  }
  await Promise.all([...grouped].map(([path, group]) => writeFile(path, addVideosFrontmatter(group.markdown, group.videos))));
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: shouldWrite ? 'write' : 'dry-run',
  targets: targets.length,
  offset,
  concurrency,
  processed: results.length,
  matched: results.filter((result) => result.status === 'matched').length,
  unresolved: results.filter((result) => result.status !== 'matched').length,
  results: results.map(({ markdown, ...result }) => ({ ...result, path: relative(root, result.path) })),
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
