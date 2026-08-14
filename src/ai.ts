/**
 * AI auto-fill for the Inspirations gallery.
 *
 * Sends an uploaded inspiration screenshot to a vision model on OpenRouter's
 * chat-completions API and gets back a draft tile: title + description +
 * keywords.
 *
 * Free models on OpenRouter churn constantly — slugs come and go. So instead
 * of trusting one hardcoded slug, the app asks OpenRouter for its live model
 * list, picks a free vision-capable model, and retries with the next one if
 * a model 404s. The user can still pin a specific slug in the form.
 */

export interface TileDraft {
  title: string
  description: string
  keywords: string[]
}

/** A good, currently-live default (checked against the API at runtime too). */
export const DEFAULT_MODEL = 'google/gemma-4-26b-a4b-it:free'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models'

/** Curate the design language, not the company — see AGENT.md §6/§7. */
const PROMPT = `You are the curator of a "taste-injection library" for design agents: a
collection of website and UI design languages. Look at this screenshot and
describe the visual language the way a design agent needs to reproduce it.

Return ONLY a JSON object with exactly these fields:
- "title": a short name for this design language, 2-4 words, title case.
- "description": one or two sentences naming the design pattern — materials,
  textures, palette, typography, layout, mood. Describe the design, never the
  company, and never repeat the page's own marketing copy.
- "keywords": 4 to 6 short composable phrases (2-4 words each) naming the
  visual vocabulary: palette, texture, type, layout, mood. Example:
  ["warm paper ground", "halftone CMYK dots", "mono coordinate callouts"].`

// ---------------------------------------------------------------------------
// Live model discovery
// ---------------------------------------------------------------------------

interface ModelEntry {
  id: string
  architecture?: { input_modalities?: string[] }
  pricing?: { prompt?: string | number; completion?: string | number }
}

let cachedFreeVision: string[] | null = null

/** Ask OpenRouter which free, vision-capable models exist right now. */
async function fetchFreeVisionModels(): Promise<string[]> {
  try {
    const res = await fetch(MODELS_ENDPOINT)
    if (!res.ok) return []
    const data = (await res.json()) as { data?: ModelEntry[] }
    return (data.data ?? [])
      .filter((m) => {
        const free =
          m.id.endsWith(':free') ||
          (m.pricing?.prompt === 0 || m.pricing?.prompt === '0') &&
            (m.pricing?.completion === 0 || m.pricing?.completion === '0')
        const vision = m.architecture?.input_modalities?.includes('image') ?? false
        return free && vision
      })
      .map((m) => m.id)
  } catch {
    return [] // offline or CORS-blocked — the hardcoded fallback list still runs
  }
}

/** Prefer Gemma-class models for quality; keep the list stable otherwise. */
function rankModel(id: string): number {
  if (id.includes('gemma-4')) return 0
  if (id.includes('gemma')) return 1
  if (id.includes('vl') || id.includes('vision')) return 2
  return 3
}

/** Order of models to try: user's pick first, then live free vision models. */
async function resolveCandidates(preferred: string): Promise<string[]> {
  if (cachedFreeVision === null) {
    cachedFreeVision = await fetchFreeVisionModels()
  }
  const live = cachedFreeVision ?? []
  const seen = new Set<string>()
  const out: string[] = []
  const push = (id: string) => {
    if (id && !seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  if (preferred) push(preferred)
  for (const id of [...live].sort((a, b) => rankModel(a) - rankModel(b))) push(id)
  push('openrouter/free') // router that picks any free model supporting the request
  return out
}

// ---------------------------------------------------------------------------
// The call itself
// ---------------------------------------------------------------------------

interface ApiFailure extends Error {
  status?: number
}

function extractJson(text: string): TileDraft {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1] : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('The AI response did not contain JSON — try again.')
  }
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    throw new Error('The AI response was not valid JSON — try again.')
  }
  const title = String(obj.title ?? '').trim()
  const description = String(obj.description ?? '').trim()
  const keywords = Array.isArray(obj.keywords)
    ? obj.keywords
        .map((k) => String(k).trim())
        .filter(Boolean)
        .slice(0, 8)
    : []
  if (!title && !description) {
    throw new Error('The AI response was missing its content — try again.')
  }
  return { title, description, keywords }
}

async function callOnce(imageDataUrl: string, apiKey: string, model: string): Promise<TileDraft> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'palette taste library',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      max_tokens: 500,
    }),
  })

  if (!res.ok) {
    const err = new Error(`API status ${res.status}`) as ApiFailure
    err.status = res.status
    throw err
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content ?? ''
  if (!content) throw new Error('The AI returned an empty response — try again.')
  return extractJson(content)
}

export async function describeScreenshot(
  imageDataUrl: string,
  apiKey: string,
  preferredModel: string,
): Promise<TileDraft> {
  const candidates = await resolveCandidates(preferredModel)
  let last: ApiFailure | null = null

  for (const model of candidates.slice(0, 6)) {
    try {
      return await callOnce(imageDataUrl, apiKey, model)
    } catch (e) {
      last = e as ApiFailure
      // A dead/retired model (404) or a down provider (503) — try the next
      // one. Rate limits (429) are often per-model, so those retry too.
      // Anything else (bad key, bad request) won't be fixed by another model.
      if (last.status === undefined || ![404, 503, 429].includes(last.status)) break
    }
  }

  const status = last?.status
  if (status === 401) throw new Error('Your key was rejected — check it and try again.')
  if (status === 429) throw new Error('Free-tier rate limit hit — wait a minute, then try again.')
  if (status === 404 || status === 503) {
    throw new Error('None of the free vision models answered — wait a moment and try again.')
  }
  throw new Error('The AI service replied with an error — try again.')
}
