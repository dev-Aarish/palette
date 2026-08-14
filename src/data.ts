import type { BuiltInWallpaper, DesktopIcon } from './types'

export const WALLPAPERS: Array<{ id: BuiltInWallpaper; name: string; hint: string }> = [
  { id: 'halftone', name: 'Halftone', hint: 'the default — a print dot pattern' },
  { id: 'mountains', name: 'Mountains', hint: 'dithered photograph, made in code' },
  { id: 'city', name: 'City', hint: 'skyline at night, windows lit' },
  { id: 'flower', name: 'Flower', hint: 'petals reduced to 1-bit' },
]

/**
 * The Inspirations gallery's accent palette. Tiles cycle through these in
 * order at creation, so a freshly added tile is always colourful even before
 * it has an image. Every colour keeps white text readable.
 */
export const ACCENTS = [
  '#D62828', // crimson
  '#F77F00', // orange
  '#B45309', // amber
  '#0F766E', // teal
  '#1D6FB8', // blue
  '#4338CA', // indigo
  '#6A4C93', // violet
  '#C2185B', // magenta
]

export function defaultIcons(): DesktopIcon[] {
  return [
    { id: 'ic-inspirations', type: 'inspirations', label: 'Inspirations', x: 18, y: 14 },
    { id: 'ic-wallpaper', type: 'wallpaper', label: 'Change Wallpaper', x: 18, y: 108 },
    { id: 'ic-about', type: 'about', label: 'About Me', x: 18, y: 202 },
    { id: 'ic-recycle', type: 'recycle', label: 'Recycle Bin', x: 18, y: 296 },
  ]
}

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

Open the Inspirations folder to browse — and add to — the taste
library. Right-click the desktop for more.`

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
