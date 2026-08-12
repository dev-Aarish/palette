# AGENT.md — Design Taste Library

> Working name only — rename freely. This file defines *what the project is and what it's for*, not how it looks. UI/layout/component work is explicitly out of scope here (see "Out of Scope" below) and will be handled in a separate session.

## 1. Mission

This project is a **taste-injection library for design agents**. It is a curated collection of website/UI design *patterns* — not a portfolio, not a link-dump — built so that an AI agent (or a human, mid-hackathon) can quickly pull a coherent, non-generic visual language and apply it to a new project instead of defaulting to templated, forgettable UI.

Every entry in the library exists to answer two questions on demand:
1. **"What does this design language look like, and what words describe it?"** — the vocabulary.
2. **"Give me something I can hand directly to a model to reproduce or extend it."** — the reusable prompt.

The library is not trying to be exhaustive design history. It's trying to be a **precise, reusable vocabulary** — the kind of specificity that turns "make it look clean and modern" into something an agent can actually execute against.

## 2. What This Project Is (and Isn't)

- It **is** a structured content library: entries, categories, keywords, and two kinds of ready-to-use prompts per entry.
- It **is** meant to be queried/browsed by an agent mid-task ("give me 3 design languages tagged data-as-texture") as much as by a person.
- It **is not** a scraper or a place that silently claims other people's screenshots as original work — see §6 on attribution.
- It **is not**, for this phase, a place to browse to live websites by clicking through — link-checkout is an explicit future phase (§7).
- It **is not** where layout, navigation, component structure, or visual styling *of this library site itself* get decided. That's deliberately deferred.

## 3. Core Content Unit: the Entry

Every item in the library is one **Entry**. An entry represents a single design pattern — either lifted from a real, named website, or an invented/synthesized style that doesn't map to one specific site.

Suggested schema (storage format is an implementation detail for later — JSON, YAML, or a DB row can all satisfy this shape):

```
Entry:
  id: string                     # stable slug, e.g. "stillness-voxel-meditation"
  index: number                  # position/ordinal within the full set
  title: string                  # the design/style name, OR the real website's name
  subtitle: string                # short descriptor, e.g. "editorial x voxel 3D"
  category: enum(TaxonomyCategory)   # exactly one primary bucket — see §5
  is_reference_style: boolean     # true if this pattern is drawn from a real, existing site
  source:
    website_name: string | null   # null if invented / not tied to a real site
    website_url: string | null    # deferred field — see §7, leave null for now
  image:
    path_or_url: string
    alt_text: string               # plain description, for accessibility + agent context
  description: string             # one-sentence premise, e.g. "The meditation landscape is
                                   # built from blocks - digital material, calm subject."
  keywords: string[]               # short tag phrases naming the visual vocabulary
                                    # e.g. "halftone CMYK dot texture", "muted blue-coral-green palette"
  image_recipe:
    target_model: string           # e.g. "Higgsfield gpt_image_2"
    resolution: string             # e.g. "2K"
    subject_placeholder: string    # the default [SUBJECT] filled in for this example
    style_prompt: string           # the fixed, subject-independent style description — see §4.1
  copy_brief: string               # the full, self-contained prompt for generating an entire
                                    # website in this design language — see §4.2
```

Notes on the fields:
- `keywords` are short, composable phrases, not full sentences — they're meant to be scanned and recombined, not read as prose.
- `is_reference_style` matters: it's how the library distinguishes "this is a documented pattern from a real product" from "this is a synthesized style nobody has actually shipped." Both are useful; they should never be presented as the same kind of thing.
- `category` is single-select from a closed taxonomy (§5). Everything else that doesn't fit cleanly is a `keyword`, not a new category.

## 4. The Two Prompt Artifacts

Each entry ships two distinct, purpose-built prompts. They are not the same prompt at different lengths — they do different jobs and should be authored differently.

### 4.1 Image Recipe

**Purpose:** reproduce or inject *this specific visual pattern* into a single generated image, for a specific image model.

Authoring rules:
- Always declare the **target model and resolution** up front (e.g. "send to Higgsfield gpt_image_2 @ 2K"). Different models respond to different prompt shapes — the recipe should be written for one named target, not generically.
- Always isolate a **`[SUBJECT]` placeholder**. The subject is the only thing that should change between uses of the same recipe — everything else (palette, texture, lighting, composition) is the fixed "signature" of the style and must not move.
- Lock the **palette explicitly and restrictively** (e.g. "STRICT muted palette: slate-blue and dusty navy... no browns"). Vague palette language ("earthy tones") is not reusable — name the actual colors and state what's excluded.
- Specify **material/texture and rendering style** as a fixed clause (e.g. "built entirely from small 3D voxels, Minecraft-diorama style, low fidelity").
- Specify **lighting and composition** as fixed clauses (e.g. "soft even studio light, isolated diorama on a clean white ground with generous empty space above for type").
- The recipe should be a single copy-pasteable block, not a list of instructions — someone should be able to fill the placeholder and paste the whole thing directly into the target tool.

### 4.2 Copy Brief

**Purpose:** generate an entire website's worth of design decisions in this language — not one image. This is the prompt an agent hands to itself (or another model) when actually building a hackathon project.

Authoring rules:
- Must be **self-contained** — an agent with no other context should be able to build a coherent, on-brand site from this brief alone.
- Should translate the entry's `keywords` and `description` into concrete, buildable direction: palette, typographic voice, tone of copy, structural/compositional logic, and the emotional register the design is going for.
- Should **not** duplicate the Image Recipe's literal image-generation syntax (model name, resolution parameter) — it's a design brief, not a render command.
- Should read as something a competent design-minded builder could execute against without needing to see the reference image at all.

## 5. Design Taxonomy & Vocabulary

The taxonomy is **two-tiered**:

1. **Primary category** — exactly one per entry, mutually exclusive, and together they cover 100% of entries. This is the main organizing axis (what you'd click a tab for).
2. **Secondary tags** — cross-cutting, non-exclusive flags layered on top. `is_reference_style` is the first one of these (an entry can be *both* "Print-Tech Paper" *and* "reference style" at once — the tag counts don't have to sum to the total).

Treat new categories as expensive — adding one should mean "this pattern recurs enough to deserve its own bucket," not "this one entry didn't fit anywhere." One-off patterns are better served by richer `keywords` on an existing category than by a category of size one.

### Starter categories

These are seeded from the entries observed so far. Definitions are a first pass — refine as more entries are added, and add categories only when a genuinely new recurring pattern shows up.

| Category | What it captures (working definition) |
|---|---|
| **Print-Tech Paper** | Digital interfaces that borrow the material language of print production — halftone/CMYK dot textures, warm paper-toned grounds, mono/monospace technical callouts and coordinate labels layered over otherwise clean editorial layouts. |
| **Data-as-Texture** | Real or realistic data (transaction records, coordinates, timestamps) rendered as ambient visual texture or illustration rather than as functional UI — the data becomes decoration that signals credibility/precision. |
| **Vast Quiet Cinematic** | Large-scale, sparse, atmospheric compositions — generous negative space, a single small focal subject, muted or desaturated palettes; evokes stillness/scale over density. |
| **Dither Mono** | Monochrome or near-monochrome imagery built from dithered/halftone patterning rather than smooth gradients or flat color. |
| **Classical Remix** | Classical/architectural motifs (columns, statuary, archival photography of monuments) recontextualized into a modern product/interface frame. |
| **Glitched Antiquity** | Classical or archival source material deliberately corrupted, fragmented, or digitally distorted — old-meets-broken-digital. |
| **Illustrated Storybook** | Custom illustration (not photography or 3D render) carrying a narrative, hand-crafted, editorial tone. |
| *(secondary tag)* **Reference Style** | Not a bucket of its own — a flag meaning "`is_reference_style: true`," i.e. this pattern is documented from a real, named, currently-live product rather than synthesized. |

Each category should eventually accumulate its own small **vocabulary word-bank** — the recurring keyword phrases that show up across its entries (e.g. Print-Tech Paper entries keep reusing "halftone," "mono callouts," "paper ground"). That word-bank is itself useful output: it's what lets an agent later generate a *new* entry in an existing category that still feels consistent with the others.

## 6. Curation Workflow

For each new entry added to the library:

1. Capture the source image (screenshot or render).
2. Assign `title` / `subtitle`, and determine `is_reference_style` — is this from a real, named site, or synthesized?
3. If real: record the accurate `website_name`. Leave `website_url` null for now (§7).
4. Slot it into exactly one existing `category`. Only propose a new category if it clearly doesn't fit any existing bucket *and* you'd expect more entries like it later.
5. Write the `description` — one plain sentence stating subject + material/mood, no fluff.
6. Extract 4–7 `keywords` — short, composable, non-overlapping phrases.
7. Write the `image_recipe` per §4.1.
8. Write the `copy_brief` per §4.2.

## 7. Attribution & Content Integrity

- When an entry is tagged `is_reference_style: true` and tied to a real product, its `website_name` must be accurate — never invented or guessed.
- `website_url` is intentionally left out of the schema's active use for now, per the stated future phase — don't populate it speculatively, and don't fabricate a URL to fill the field.
- Descriptions and keywords should describe the *design pattern*, not reproduce marketing copy or text verbatim from the source site.

## 8. Out of Scope for This Session

Deliberately not decided here — to be handled in a separate session:
- Visual design, layout, and component structure of the library site itself.
- Any card, grid, modal, or navigation UI.
- Tech stack / framework choice for the frontend.

Also explicitly deferred (not a "different session" issue, just not yet):
- Live website link browsing/checkout (`website_url` going from stored-but-inert to actually clickable/functional).

## 9. Open Questions for Next Session

- Final project name.
- Whether entries are hand-curated only, or whether there's eventually an intake flow for submitting new ones.
- Storage/backend choice (flat files vs. database) — schema in §3 is intentionally storage-agnostic so this can be decided later without reshaping the content model.
