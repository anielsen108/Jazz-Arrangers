# Plan: Interactive Jazz Arrangers Site

Convert the current Markdown repository (160 arranger pages organized by decade) into an
interactive website featuring a photo timeline carousel, embedded YouTube performances, and
big band ensemble (instrumentation) visualizations.

---

## 1. Recommended architecture

| Decision | Recommendation | Why |
|---|---|---|
| Framework | **Astro** (static site generator) | Native Markdown "content collections" — the 160 existing `.md` files become pages with almost no rewriting; ships zero JS by default, adds islands of interactivity only where needed (carousel, ensemble viz) |
| Hosting | **GitHub Pages** via GitHub Actions | Repo is already on GitHub; free, automatic deploy on push |
| Interactivity | Vanilla JS/Svelte islands + **SVG** for the ensemble diagrams | No heavy chart library needed; SVG stage plots are small, accessible, and themeable |
| Video | `lite-youtube-embed` style facade components | Embedding 160+ pages of raw YouTube iframes would be slow; facades load the player only on click |
| Testing | Vitest (data-schema validation + component tests) | Tests written before each feature, per project convention |

Why not plain HTML? 160 pages of repeated layout is unmaintainable by hand. Why not
Next.js/React? Overkill for a content site — Astro keeps the Markdown workflow you already have.

---

## 2. Data model (the real work)

The current pages are prose-only. Every interactive feature needs **structured data** added as
YAML frontmatter to each arranger page:

```yaml
---
name: Thad Jones
slug: thad-jones
born: 1923
died: 1986
decade: 1950s
tagline: Modern big band innovator
photo:
  src: /images/arrangers/thad-jones.jpg
  credit: "William P. Gottlieb, Library of Congress"
  license: public-domain
videos:
  - id: dQw4w9WgXcQ          # YouTube video ID
    title: "A Child Is Born — Live at the Village Vanguard"
    piece: a-child-is-born
pieces:
  - slug: a-child-is-born
    title: "A Child Is Born"
    album: "Live at the Village Vanguard"
    year: 1967
    ensemble:
      saxes: { alto: 2, tenor: 2, baritone: 1 }
      brass: { trumpet: 4, trombone: 3, bass-trombone: 1 }
      rhythm: [piano, upright-bass, drums, guitar]
      other: [flugelhorn]
---
```

A shared `ensembles.schema.json` defines the allowed instruments (drums, piano, guitar,
upright bass, electric bass, alto/tenor/bari/soprano sax, trumpet, flugelhorn, trombone,
bass trombone, tuba, vibes, percussion, voice, strings, woodwind doubles…). A validation test
runs over all 160 files so bad data fails CI instead of silently breaking a diagram.

**Curation strategy for 160 arrangers:** do it in batches by decade (the repo's existing
structure), starting with 2–3 pieces per arranger drawn from the existing "Top Albums"
sections. Photos and video IDs can be researched in parallel batches (this is a good
subagent/workflow task). Ship the site with partial data — components should degrade
gracefully (no photo → styled placeholder with initials; no ensemble data → section hidden).

**Photo licensing:** prefer Wikimedia Commons / Library of Congress (the William P. Gottlieb
collection is public domain and covers most pre-1950 jazz figures). Store `credit` and
`license` in frontmatter and render them under each image. Living arrangers are the hard
cases — use Commons-licensed photos only, placeholder otherwise.

---

## 3. The three features

### 3a. Timeline carousel (home page)

A horizontally scrolling timeline from the 1920s to the present:

```
1920s ──── 1930s ──── 1940s ──── 1950s ──── 1960s ──── ▶
  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐
  │photo│  │photo│  │photo│  │photo│  │photo│   ← portrait cards
  │ Don │  │Duke │  │Gil  │  │Thad │  │Oliver│
  └────┘  └────┘  └────┘  └────┘  └────┘
```

- CSS scroll-snap horizontal strip with decade markers; arranger portrait cards sorted by
  birth year (or era of peak activity), each linking to the arranger's page.
- Decade jump-links; drag/swipe on touch; arrow-key navigation for accessibility.
- Cards show photo, name, years, and the one-line tagline already in the README.
- Progressive enhancement: without JS it's still a scrollable strip of links.

### 3b. Embedded YouTube videos

- On each arranger page, a "Listen" section renders the `videos:` frontmatter list as
  click-to-load embeds (thumbnail + play button; the iframe loads only on click).
- Videos link to their associated piece so the ensemble diagram and the recording sit together.
- Fallback: if a video is ever taken down, the component shows a "search YouTube" link built
  from arranger + piece title. A periodic link-check script (YouTube oEmbed endpoint) can flag
  dead IDs.

### 3c. Big band ensemble visualization

An SVG **stage plot** — the standard big band seating chart musicians already know:

```
        ┌─────────── trumpets (4) ───────────┐
      ┌─────────── trombones (3+1) ────────────┐
    ┌────────── saxes (2A 2T 1B) ────────────────┐
  ┌ piano ┐  ┌ guitar ┐  ┌ bass ┐  ┌ drums ┐
```

- One shared `<EnsembleDiagram>` component reads a piece's `ensemble` data and renders rows of
  instrument icons: sax row in front, trombones behind, trumpets in back, rhythm section to
  the side — with counts, section labels, and distinct icons for variants (electric vs upright
  bass, bass trombone, flugelhorn).
- Hover/tap an instrument → tooltip naming it (and the player, if we later add personnel data).
- Instruments *not* used are optionally ghosted, so unusual instrumentations (Gil Evans's
  french horns and tuba, Don Ellis's quarter-tone trumpets, Kamasi's strings and choir) read
  at a glance against the standard 5-4-4-4 big band.
- A comparison view on decade pages: small-multiple mini-plots showing how instrumentation
  evolved (e.g., electric bass and synths appearing in the 1970s).

---

## 4. Phases

| Phase | Deliverable | Size |
|---|---|---|
| **0. Scaffold** | Astro project in repo, existing Markdown rendering as styled pages, GitHub Actions deploy to Pages | Small |
| **1. Data schema** | Frontmatter schema + `ensembles.schema.json`, validation tests, 5 fully-curated pilot arrangers (e.g., Ellington, Thad Jones, Gil Evans, Maria Schneider, Kamasi Washington — one per era, diverse instrumentations) | Small |
| **2. Ensemble diagram** | Tests + `<EnsembleDiagram>` SVG component, live on the 5 pilot pages | Medium |
| **3. Video embeds** | Tests + click-to-load YouTube component on pilot pages | Small |
| **4. Timeline carousel** | Tests + home-page carousel with the pilot arrangers' photos | Medium |
| **5. Data curation at scale** | Batch-fill frontmatter (photos, videos, ensembles) decade by decade for all 160 arrangers; graceful-degradation states for missing data | Large — the long pole; parallelizable |
| **6. Polish** | Search/filter (by decade, instrument, style), decade index pages, dark mode, mobile pass, accessibility audit, image optimization | Medium |

Pilot-first (phases 1–4 on 5 arrangers) proves the whole design before committing to the
160-arranger curation grind, and gives a shippable demo early.

## 5. Open questions

1. **Hosting** — GitHub Pages assumed; fine, or do you have a domain/host in mind?
2. **Ensemble data depth** — instrumentation per *piece* (as planned), or is per-*album* /
   per-arranger-typical-band enough? Per-piece is more accurate but roughly triples curation work.
3. **Personnel** — should ensemble diagrams eventually name the actual players (Snooky Young on
   lead trumpet…)? Affects the schema now even if filled in later.
4. **Curation automation** — OK to use research subagents to batch-draft photo sources, video
   IDs, and instrumentation data for human review, decade by decade?
