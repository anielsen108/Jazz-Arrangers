import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// The arranger pages live at the repo root in arrangers/<decade>/<slug>.md.
// They have no frontmatter yet (Phase 1 adds it); metadata is parsed from
// each page's H1 heading via src/lib/arrangers.ts.
const arrangers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './arrangers' }),
});

export const collections = { arrangers };
