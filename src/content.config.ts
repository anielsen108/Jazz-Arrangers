import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { INSTRUMENT_IDS } from './lib/ensemble';

// Ensemble: flat map of instrument id → chair count. Keys are restricted to
// the vocabulary in src/lib/ensemble.ts, so a typo fails the build.
const ensembleSchema = z
  .record(z.string(), z.number().int().positive())
  .superRefine((ensemble, ctx) => {
    for (const key of Object.keys(ensemble)) {
      if (!INSTRUMENT_IDS.includes(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown instrument id "${key}". Allowed: ${INSTRUMENT_IDS.join(', ')}`,
        });
      }
    }
  });

// The arranger pages live at the repo root in arrangers/<decade>/<slug>.md.
// All frontmatter is optional: pages without it render fine, and features
// (photo, videos, ensemble diagrams) appear as data is curated per arranger.
const arrangers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './arrangers' }),
  schema: z
    .object({
      photo: z
        .object({
          src: z.string().startsWith('/images/'),
          credit: z.string(),
          license: z.string(),
          source: z.string().url().optional(),
        })
        .optional(),
      videos: z
        .array(
          z.object({
            id: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'YouTube ID must be 11 chars'),
            title: z.string(),
            piece: z.string().optional(),
          })
        )
        .optional(),
      pieces: z
        .array(
          z.object({
            slug: z.string().regex(/^[a-z0-9-]+$/),
            title: z.string(),
            album: z.string().optional(),
            year: z.number().int().optional(),
            note: z.string().optional(),
            ensemble: ensembleSchema,
          })
        )
        .optional(),
    })
    .strict(),
});

export const collections = { arrangers };
