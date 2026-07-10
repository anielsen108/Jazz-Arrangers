import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const arrangersRoot = fileURLToPath(new URL('../arrangers/', import.meta.url));
const imageRoot = fileURLToPath(new URL('../public/images/arrangers/', import.meta.url));
const reportPath = fileURLToPath(new URL('./portrait-sourcing-report.json', import.meta.url));
const shouldWrite = process.argv.includes('--write');
const userAgent = 'JazzArrangersPortraitSourcing/1.0 (https://github.com/anielsen108/Jazz-Arrangers)';

const acceptedLicenses = [
  /^CC0(?:\s|$)/i,
  /^CC BY(?:\s|$|-)/i,
  /^CC BY-SA(?:\s|$|-)/i,
  /^Public domain$/i,
  /^PD(?:\s|$|-)/i,
];

const wikipediaAliases = new Map(Object.entries({
  'Bill Russo': 'William Russo (musician)',
  'David Matthews': 'David Matthews (keyboardist)',
  'George Russell': 'George Russell (composer)',
  'Johnny Carisi': 'John Carisi',
  'Michael Abene': 'Mike Abene',
  'Russ Garcia': 'Russell Garcia (composer)',
}));

// Commons filename search is only a fallback for images that are not connected
// to Wikipedia. Each name here has been manually checked against the returned
// Commons file; common-name matches are deliberately left unresolved.
const reviewedCommonsFallbacks = new Set([
  'Benny Carter',
  'Billy May',
  'Bill Cunliffe',
  'David Matthews',
  'Ed Partyka',
  'Eddie Sauter',
  'John Hollenbeck',
  'Johnny Richards',
  'Mike Mainieri',
  'Miho Hazama',
  'Rob McConnell',
  'Russell Ferrante',
]);

function normalizeName(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalizeName(value).replace(/\s+/g, '-');
}

function decodeHtml(value = '') {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function yamlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function fetchJson(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
    if (response.ok) return response.json();
    if (response.status !== 429 || attempt === 4) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 4000 * (attempt + 1)));
  }
}

async function getMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? getMarkdownFiles(path) : path.endsWith('.md') ? [path] : [];
    })
  );
  return nested.flat();
}

function parseDocument(path, source) {
  const heading = source.match(/^#\s+(.+?)(?:\s+\([^\n]*\))?\s*$/m);
  if (!heading) throw new Error(`No H1 arranger name in ${path}`);
  const photoBlock = source.match(/^photo:\s*\r?\n(?:^[ \t]+.*\r?\n?)+/m)?.[0];
  const field = (name) => {
    let value = photoBlock?.match(new RegExp(`^\\s+${name}:\\s*(.+?)\\s*$`, 'm'))?.[1]?.trim();
    if (!value) return value;
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    return value.replaceAll("''", "'");
  };
  return {
    path,
    source,
    name: heading[1].trim(),
    photo: photoBlock
      ? { src: field('src'), credit: field('credit'), license: field('license'), source: field('source') }
      : undefined,
  };
}

async function searchWikipedia(name) {
  const requestedTitle = wikipediaAliases.get(name) || name;
  const exactParams = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    redirects: '1',
    titles: requestedTitle,
    prop: 'pageimages|description|info|pageprops',
    piprop: 'name|original',
    pilicense: 'free',
    inprop: 'url',
  });
  const exactData = await fetchJson(`https://en.wikipedia.org/w/api.php?${exactParams}`);
  const exactPage = Object.values(exactData.query?.pages ?? {})[0];
  const exactSignal = /jazz|arrang|compos|musician|bandleader|instrumentalist|pianist|saxophonist|trumpeter|trombonist|conductor/i
    .test(exactPage?.description ?? '');
  const titleMatches = normalizeName(exactPage?.title ?? '') === normalizeName(requestedTitle);
  const identifiedPage = exactSignal && titleMatches ? exactPage : undefined;
  if (exactPage?.pageimage && exactPage.original?.source && exactSignal && titleMatches) {
    return { status: 'matched', page: exactPage };
  }

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `"${name}" jazz arranger`,
    gsrnamespace: '0',
    gsrlimit: '8',
    prop: 'pageimages|description|info|pageprops',
    piprop: 'name|original',
    pilicense: 'free',
    inprop: 'url',
  });
  const data = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
  const pages = Object.values(data.query?.pages ?? {});
  const exact = pages
    .filter((page) => normalizeName(page.title) === normalizeName(name))
    .filter((page) => page.pageimage && page.original?.source)
    .sort((a, b) => {
      const signal = (page) => /jazz|arrang|compos|musician|bandleader|instrumentalist/i.test(page.description ?? '') ? 1 : 0;
      return signal(b) - signal(a);
    });
  if (!exact.length) {
    return identifiedPage
      ? { status: 'identified', page: identifiedPage, candidates: pages.map((page) => page.title) }
      : { status: 'unresolved', candidates: pages.map((page) => page.title) };
  }
  if (exact.length > 1 && normalizeName(exact[0].title) === normalizeName(exact[1].title)) {
    return { status: 'ambiguous', candidates: exact.map((page) => page.title) };
  }
  return { status: 'matched', page: exact[0] };
}

async function getCommonsCategory(qid) {
  if (!qid) return undefined;
  const params = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    origin: '*',
    ids: qid,
    props: 'claims',
  });
  const data = await fetchJson(`https://www.wikidata.org/w/api.php?${params}`);
  return data.entities?.[qid]?.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
}

async function searchCommonsCategory(page, name) {
  const category = await getCommonsCategory(page?.pageprops?.wikibase_item);
  if (!category) return { status: 'unresolved' };
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'categorymembers',
    gcmtitle: `Category:${category}`,
    gcmtype: 'file',
    gcmlimit: '30',
    prop: 'imageinfo|info',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '900',
    inprop: 'url',
  });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const rejectedKinds = /album|book|cover|logo|poster|signature|autograph|sheet music|tomb|grave|memorial|plaque|building|program/i;
  const nameKey = normalizeName(name);
  const candidates = Object.values(data.query?.pages ?? {})
    .filter((candidate) => {
      const filename = normalizeName(candidate.title.replace(/^File:/, '').replace(/\.[^.]+$/, ''));
      return filename.includes(nameKey) && !rejectedKinds.test(candidate.title);
    })
    .map((candidate) => ({ page: candidate, photo: commonsPhotoFromPage(candidate) }))
    .filter(({ photo }) => photo.status === 'accepted')
    .sort((a, b) => {
      const score = ({ page: candidate }) => {
        const filename = normalizeName(candidate.title.replace(/^File:/, '').replace(/\.[^.]+$/, ''));
        return (filename.includes(nameKey) ? 6 : 0)
          + (candidate.imageinfo?.[0]?.mime === 'image/jpeg' ? 3 : 0)
          + (/portrait|headshot/i.test(candidate.title) ? 2 : 0);
      };
      return score(b) - score(a);
    });
  return candidates[0]?.photo || { status: 'unresolved' };
}

async function getCommonsImage(filename) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    titles: `File:${filename}`,
    prop: 'imageinfo|info',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '900',
    inprop: 'url',
  });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const page = Object.values(data.query?.pages ?? {})[0];
  return commonsPhotoFromPage(page);
}

function commonsPhotoFromPage(page) {
  const info = page?.imageinfo?.[0];
  if (!page || 'missing' in page || !info) return { status: 'not-on-commons' };
  const metadata = info.extmetadata ?? {};
  const license = decodeHtml(metadata.LicenseShortName?.value ?? '');
  if (!acceptedLicenses.some((pattern) => pattern.test(license))) {
    return { status: 'license-rejected', license };
  }
  const artist = decodeHtml(metadata.Artist?.value || metadata.Credit?.value || 'Wikimedia Commons contributor');
  return {
    status: 'accepted',
    downloadUrl: info.thumburl || info.url,
    mime: info.mime,
    credit: `${artist}, via Wikimedia Commons`,
    license,
    source: page.canonicalurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
  };
}

async function searchCommonsPortrait(name) {
  if (!reviewedCommonsFallbacks.has(name)) return { status: 'unresolved' };
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `"${name}" filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '10',
    prop: 'imageinfo|info',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '900',
    inprop: 'url',
  });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const nameKey = normalizeName(name);
  const rejectedKinds = /album|book|cover|logo|poster|signature|sheet music|tomb|grave|memorial|plaque/i;
  const candidates = Object.values(data.query?.pages ?? {})
    .filter((page) => {
      const filename = page.title.replace(/^File:/, '').replace(/\.[^.]+$/, '');
      return normalizeName(filename).includes(nameKey) && !rejectedKinds.test(filename);
    })
    .map((page) => ({ page, photo: commonsPhotoFromPage(page) }))
    .filter(({ photo }) => photo.status === 'accepted')
    .sort((a, b) => {
      const score = ({ page }) => {
        const filename = page.title.replace(/^File:/, '').replace(/\.[^.]+$/, '');
        const key = normalizeName(filename);
        return (key.startsWith(nameKey) ? 4 : 0) + (page.imageinfo?.[0]?.mime === 'image/jpeg' ? 2 : 0);
      };
      return score(b) - score(a);
    });
  return candidates[0]?.photo || { status: 'unresolved' };
}

function extensionFor(mime, url) {
  const byMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
  return byMime[mime] || extname(new URL(url).pathname).toLowerCase() || '.jpg';
}

async function downloadImage(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

function addPhotoFrontmatter(source, photo) {
  const block = [
    'photo:',
    `  src: ${photo.src}`,
    `  credit: ${yamlString(photo.credit)}`,
    `  license: ${yamlString(photo.license)}`,
    `  source: ${yamlString(photo.source)}`,
  ].join('\n');
  if (source.startsWith('---\n') || source.startsWith('---\r\n')) {
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const closing = source.indexOf(`${newline}---`, 4);
    return `${source.slice(0, closing)}${newline}${block.replaceAll('\n', newline)}${source.slice(closing)}`;
  }
  return `---\n${block}\n---\n${source}`;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

const paths = await getMarkdownFiles(arrangersRoot);
const documents = await Promise.all(paths.map(async (path) => parseDocument(path, await readFile(path, 'utf8'))));
const existingByName = new Map(documents.filter((doc) => doc.photo).map((doc) => [normalizeName(doc.name), doc.photo]));
const uniqueMissing = [...new Map(
  documents.filter((doc) => !doc.photo && !existingByName.has(normalizeName(doc.name))).map((doc) => [normalizeName(doc.name), doc])
).values()];

await mkdir(imageRoot, { recursive: true });
const sourced = await mapLimit(uniqueMissing, 2, async (document) => {
  try {
    const wiki = await searchWikipedia(document.name);
    let commons = wiki.status === 'matched' ? await getCommonsImage(wiki.page.pageimage) : { status: 'unresolved' };
    let commonsOnly = false;
    if (commons.status !== 'accepted') {
      commons = await searchCommonsCategory(wiki.page, document.name);
      commonsOnly = commons.status === 'accepted';
    }
    if (commons.status !== 'accepted') {
      commons = await searchCommonsPortrait(document.name);
      commonsOnly = commons.status === 'accepted';
    }
    if (commons.status !== 'accepted') {
      return {
        name: document.name,
        status: commons.status,
        wikipedia: wiki.page?.fullurl,
        candidates: wiki.candidates,
        license: commons.license,
      };
    }
    const extension = extensionFor(commons.mime, commons.downloadUrl);
    const filename = `${slugify(document.name)}${extension}`;
    const photo = {
      src: `/images/arrangers/${filename}`,
      credit: commons.credit,
      license: commons.license,
      source: commons.source,
    };
    if (shouldWrite) await downloadImage(commons.downloadUrl, join(imageRoot, filename));
    return {
      name: document.name,
      status: 'sourced',
      wikipedia: wiki.page?.fullurl,
      commonsOnly,
      filename,
      photo,
    };
  } catch (error) {
    return { name: document.name, status: 'error', error: error.message };
  }
});

const sourcedByName = new Map(sourced.filter((item) => item.photo).map((item) => [normalizeName(item.name), item.photo]));
let updatedDocuments = 0;
if (shouldWrite) {
  await Promise.all(documents.map(async (document) => {
    if (document.photo) return;
    const photo = existingByName.get(normalizeName(document.name)) || sourcedByName.get(normalizeName(document.name));
    if (!photo) return;
    await writeFile(document.path, addPhotoFrontmatter(document.source, photo));
    updatedDocuments += 1;
  }));
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: shouldWrite ? 'write' : 'dry-run',
  documents: documents.length,
  alreadyCurated: documents.filter((doc) => doc.photo).length,
  reusedFromDuplicate: documents.filter((doc) => !doc.photo && existingByName.has(normalizeName(doc.name))).length,
  sourced: sourced.filter((item) => item.status === 'sourced').length,
  updatedDocuments,
  unresolved: sourced.filter((item) => item.status !== 'sourced'),
  results: sourced,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, results: undefined, unresolved: report.unresolved.length }, null, 2));
console.log(`Report: ${relative(root, reportPath)}`);
