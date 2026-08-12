import type { BuiltInWallpaper, DesktopIcon, InspirationEntry } from './types'

export const WALLPAPERS: Array<{ id: BuiltInWallpaper; name: string; hint: string }> = [
  { id: 'halftone', name: 'Halftone', hint: 'the default — a print dot pattern' },
  { id: 'mountains', name: 'Mountains', hint: 'dithered photograph, made in code' },
  { id: 'city', name: 'City', hint: 'skyline at night, windows lit' },
  { id: 'flower', name: 'Flower', hint: 'petals reduced to 1-bit' },
]

export function defaultIcons(): DesktopIcon[] {
  return [
    { id: 'ic-inspirations', type: 'inspirations', label: 'Inspirations', x: 18, y: 14 },
    { id: 'ic-wallpaper', type: 'wallpaper', label: 'Change Wallpaper', x: 18, y: 108 },
    { id: 'ic-about', type: 'about', label: 'About Me', x: 18, y: 202 },
    { id: 'ic-recycle', type: 'recycle', label: 'Recycle Bin', x: 18, y: 296 },
  ]
}

/**
 * The palette library's own taxonomy (from AGENT.md §5) — the Inspirations
 * folder demonstrates the library's content model with its real entries.
 */
export const INSPIRATIONS: InspirationEntry[] = [
  {
    id: 'dither-mono',
    title: 'Dither Mono',
    subtitle: 'monochrome from patterning, not flat color',
    category: 'Print-Tech Paper / Dither Mono',
    definition:
      'Monochrome or near-monochrome imagery built from dithered or halftone patterning rather than smooth gradients or flat color. This desktop is a member of this category, running as its own demo.',
    keywords: ['1-bit dither', 'halftone dots', 'Bayer matrix', 'error diffusion', 'high-contrast black'],
  },
  {
    id: 'print-tech-paper',
    title: 'Print-Tech Paper',
    subtitle: 'interfaces that borrow print production materials',
    category: 'Print-Tech Paper',
    definition:
      'Digital interfaces that borrow the material language of print production — halftone and CMYK dot textures, warm paper-toned grounds, mono technical callouts and coordinate labels layered over otherwise clean editorial layouts.',
    keywords: ['halftone CMYK dot texture', 'paper ground', 'mono callouts', 'coordinate labels', 'muted blue-coral-green palette'],
  },
  {
    id: 'data-as-texture',
    title: 'Data-as-Texture',
    subtitle: 'records, coordinates and timestamps as decoration',
    category: 'Data-as-Texture',
    definition:
      'Real or realistic data — transaction records, coordinates, timestamps — rendered as ambient visual texture or illustration rather than as functional UI; the data becomes decoration that signals credibility and precision.',
    keywords: ['transaction records', 'coordinates', 'timestamps', 'data-as-decoration', 'credibility'],
  },
  {
    id: 'vast-quiet-cinematic',
    title: 'Vast Quiet Cinematic',
    subtitle: 'one small subject in a lot of space',
    category: 'Vast Quiet Cinematic',
    definition:
      'Large-scale, sparse, atmospheric compositions — generous negative space, a single small focal subject, muted or desaturated palettes; evokes stillness and scale over density.',
    keywords: ['negative space', 'single focal subject', 'muted palette', 'stillness', 'scale'],
  },
  {
    id: 'classical-remix',
    title: 'Classical Remix',
    subtitle: 'columns, statuary, archival monuments',
    category: 'Classical Remix',
    definition:
      'Classical and architectural motifs — columns, statuary, archival photography of monuments — recontextualized into a modern product or interface frame.',
    keywords: ['columns', 'statuary', 'archival photography', 'monuments', 'recontextualized'],
  },
  {
    id: 'glitched-antiquity',
    title: 'Glitched Antiquity',
    subtitle: 'old material, deliberately corrupted',
    category: 'Glitched Antiquity',
    definition:
      'Classical or archival source material deliberately corrupted, fragmented, or digitally distorted — old meets broken-digital.',
    keywords: ['corruption', 'fragmentation', 'datamosh', 'old-meets-broken-digital'],
  },
  {
    id: 'illustrated-storybook',
    title: 'Illustrated Storybook',
    subtitle: 'custom illustration carrying a narrative',
    category: 'Illustrated Storybook',
    definition:
      'Custom illustration — not photography or 3D render — carrying a narrative; hand-crafted, editorial tone.',
    keywords: ['custom illustration', 'narrative', 'hand-crafted', 'editorial tone'],
  },
  {
    id: 'reference-style',
    title: 'Reference Style',
    subtitle: 'secondary tag, not a bucket of its own',
    category: 'Reference Style',
    definition:
      'A flag, not a category: a pattern documented from a real, named, currently-live product rather than synthesized. Both kinds belong in the library — they are never presented as the same kind of thing.',
    keywords: ['is_reference_style', 'real product', 'attribution', 'website_name'],
  },
]

export const README_TEXT = `palette — a taste-injection library for design agents

A curated collection of website and UI design patterns. Not a
portfolio, not a link-dump. Built so that an agent (or a human,
mid-hackathon) can pull a coherent, non-generic visual language
instead of defaulting to templated, forgettable UI.

Every entry ships two things:
  1. a vocabulary — what the language looks like, in words an
     agent can act on
  2. two prompts — an image recipe to regenerate the look, and
     a copy brief to build an entire site in that language

Each entry answers two questions on demand:
  "What does this design language look like?"
  "Give me something I can hand directly to a model."

Open the Inspirations folder to browse the taxonomy. Right-click
the desktop for more.`

export const ABOUT_TEXT = `palette is a taste-injection library for design agents.

A curated collection of website and UI design patterns — not a
portfolio, not a link-dump — built so that an agent (or a human,
mid-hackathon) can pull a coherent, non-generic visual language
and apply it to a new project instead of defaulting to templated,
forgettable UI.

Every entry in the library answers two questions on demand:

  ? "What does this design language look like?"
  ? "Give me something I can hand to a model to reproduce it."

This desktop is one of those patterns, running as its own demo:
strict monochrome, wallpapers dithered on a real canvas (no CSS
filters), pixel type. Category: Dither Mono. Live.`
