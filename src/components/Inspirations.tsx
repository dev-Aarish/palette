import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { InspirationTile } from '../types'
import { coverImage, TILE_IMAGE_W, TILE_IMAGE_H } from '../dither'
import { DEFAULT_MODEL, describeScreenshot } from '../ai'

/**
 * The Inspirations folder — a colourful bento gallery that starts empty.
 * The rest of the OS is strictly monochrome; this is where colour lives.
 * Every tile is user-added: a name, an optional screenshot, and — when the
 * user wants — details drafted by a free OpenRouter vision model.
 */

function loadStr(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function saveStr(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — the key just won't be remembered */
  }
}

interface Props {
  tiles: InspirationTile[]
  onAdd(tile: Omit<InspirationTile, 'accent'>): void
  onRemove(id: string): void
}

export function InspirationsContent({ tiles, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState<InspirationTile | null>(null)

  // Escape leaves the add form back to the grid.
  useEffect(() => {
    if (!adding) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAdding(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding])

  // Escape closes the tile detail modal.
  useEffect(() => {
    if (!viewing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewing(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewing])

  if (adding) {
    return <AddForm onAdd={onAdd} onCancel={() => setAdding(false)} />
  }

  return (
    <div className="insp-wrap">
      <div className="gallery-grid">
        {tiles.length === 0 && (
          <div className="empty-library">
            Your taste library is empty.
            {'\n\n'}
            Add the first design language you want to keep — a name, and a
            screenshot if you have one. It becomes a tile, in colour.
          </div>
        )}
        {tiles.map((tile, i) => (
          <Tile
            key={tile.id}
            tile={tile}
            hero={i % 7 === 0}
            onOpen={() => setViewing(tile)}
            onRemove={() => onRemove(tile.id)}
          />
        ))}
        <AddTile onAdd={() => setAdding(true)} />
      </div>
      <div className="win-status insp-status">
        Tiles are yours — add inspirations and they live in this folder. Right-click
        the desktop → New Folder to add your own folders.
      </div>
      {viewing && <TileDetail tile={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gallery tiles
// ---------------------------------------------------------------------------

function Tile({
  tile,
  hero,
  onOpen,
  onRemove,
}: {
  tile: InspirationTile
  hero: boolean
  onOpen(): void
  onRemove(): void
}) {
  const style = { '--tile-accent': tile.accent } as CSSProperties
  const tip = tile.keywords?.length ? tile.keywords.join(' · ') : undefined
  return (
    <div
      className={`tile${hero ? ' hero' : ''}`}
      style={style}
      title={tip}
      role="button"
      tabIndex={0}
      aria-label={`View ${tile.title}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className={`tile-art${tile.image ? '' : ' plain'}`}>
        {tile.image ? (
          <img src={tile.image} alt={tile.title} />
        ) : (
          <span className="tile-mono">{tile.title.slice(0, 1).toUpperCase()}</span>
        )}
        <button
          className="tile-del"
          aria-label={`Remove ${tile.title}`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        />
      </div>
      <div className="tile-foot">
        <span className="tile-title">{tile.title}</span>
        {tile.description && <span className="tile-desc">{tile.description}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tile detail modal — the full story behind one inspiration
// ---------------------------------------------------------------------------

/**
 * The two prompts every entry ships, per AGENT.md §4 — synthesized on the fly
 * from the tile's own vocabulary (description + keywords), so even a bare
 * title-only tile is copy-paste-ready.
 */

/** §4.1 — reproduce the look in a single generated image. */
function buildImageRecipe(tile: InspirationTile): string {
  const vocab = tile.keywords?.length
    ? tile.keywords.join(', ')
    : 'the palette, texture, type and mood that define this language'
  const premise = tile.description?.trim() || `A design language called "${tile.title}".`
  const paletteClause = tile.palette?.length
    ? `STRICT palette — these exact colors only: ${tile.palette.join(' ')}. No other colors.`
    : 'Palette locked to what the vocabulary implies — no colors outside it.'
  const typeClause = tile.typography
    ? `Typography: ${tile.typography}`
    : 'Type treatment matching the language above.'
  return [
    `Image Recipe — ${tile.title}`,
    '',
    'Target: Higgsfield gpt_image_2 @ 2K',
    '',
    `[SUBJECT], rendered in the "${tile.title}" design language:`,
    premise,
    '',
    'Lock the style signature to exactly this vocabulary — nothing else:',
    `${vocab}.`,
    paletteClause,
    typeClause,
    'Soft even studio light, isolated on a clean white ground with generous',
    'empty space above for type.',
  ].join('\n')
}

/** §4.2 — a self-contained brief for building an entire site in the language. */
function buildCopyBrief(tile: InspirationTile): string {
  const vocab = tile.keywords ?? []
  const premise = tile.description?.trim() || `A design language called "${tile.title}".`
  const lines = [
    `Copy Brief — ${tile.title}`,
    '',
    `Build an entire website in the "${tile.title}" design language. This brief`,
    'is self-contained — do not ask for the reference image.',
    '',
    `Premise: ${premise}`,
  ]
  if (tile.palette?.length) {
    lines.push('', 'Palette (use these exact hex values, nothing else):')
    for (const c of tile.palette) lines.push(`  • ${c}`)
  }
  if (tile.typography) {
    lines.push('', `Typography: ${tile.typography}`)
  }
  if (vocab.length) {
    lines.push('', 'Visual vocabulary — pull every design decision from these, and only these:')
    for (const k of vocab) lines.push(`  • ${k}`)
  }
  lines.push(
    '',
    'Build it out as a complete, coherent site:',
    '  • Structure — a layout and composition logic that fits the language.',
    '  • Copy tone — write in the register this language calls for, with sample microcopy.',
    '  • Mood — the emotional register, held consistent on every page.',
  )
  return lines.join('\n')
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

function TileDetail({ tile, onClose }: { tile: InspirationTile; onClose: () => void }) {
  const style = { '--tile-accent': tile.accent } as CSSProperties
  const [copied, setCopied] = useState<'recipe' | 'brief' | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const copy = async (which: 'recipe' | 'brief') => {
    const text = which === 'recipe' ? buildImageRecipe(tile) : buildCopyBrief(tile)
    if (!(await copyText(text))) return
    setCopied(which)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(null), 1600)
  }

  return (
    <div className="insp-modal-backdrop" onClick={onClose}>
      <div
        className="insp-modal"
        style={style}
        role="dialog"
        aria-modal="true"
        aria-label={tile.title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="insp-modal-head">
          <span className="insp-modal-title">{tile.title}</span>
          <button
            className="tile-del insp-modal-close"
            aria-label={`Close ${tile.title}`}
            onClick={onClose}
          />
        </header>
        <div className={`insp-modal-art${tile.image ? '' : ' plain'}`}>
          {tile.image ? (
            <img src={tile.image} alt={tile.title} />
          ) : (
            <span className="insp-modal-mono">{tile.title.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="insp-modal-body">
          {tile.description ? (
            <p className="insp-modal-desc">{tile.description}</p>
          ) : (
            <p className="insp-modal-desc muted">
              No description yet — this tile is just a name for now.
            </p>
          )}
          {tile.palette?.length ? (
            <div className="palette-row" aria-label="Palette">
              {tile.palette.map((c) => (
                <span key={c} className="palette-item">
                  <span className="palette-chip" style={{ background: c }} />
                  <span className="palette-hex">{c}</span>
                </span>
              ))}
            </div>
          ) : null}
          {tile.typography ? <p className="insp-modal-type">{tile.typography}</p> : null}
          {tile.keywords?.length ? (
            <div className="chip-row">
              {tile.keywords.map((k) => (
                <span key={k} className="chip">
                  {k}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <footer className="insp-modal-actions">
          <button
            className={`btn${copied === 'recipe' ? ' copied' : ''}`}
            onClick={() => copy('recipe')}
            title="Reproduce this design language in one generated image — copies a ready-to-paste prompt."
          >
            {copied === 'recipe' ? 'Copied ✓' : 'Image Recipe'}
          </button>
          <button
            className={`btn${copied === 'brief' ? ' copied' : ''}`}
            onClick={() => copy('brief')}
            title="A self-contained brief for building an entire site in this design language — copies it."
          >
            {copied === 'brief' ? 'Copied ✓' : 'Copy Brief'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function AddTile({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="add-tile"
      role="button"
      tabIndex={0}
      aria-label="Add inspiration"
      onClick={onAdd}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAdd()
        }
      }}
    >
      <span className="add-plus" style={{ color: 'var(--gray-dark)' }}>
        +
      </span>
      <span className="add-label">Add inspiration</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add form — a title, an optional screenshot, and AI-drafted details
// ---------------------------------------------------------------------------

function AddForm({
  onAdd,
  onCancel,
}: {
  onAdd(tile: Omit<InspirationTile, 'accent'>): void
  onCancel(): void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState('')
  const [palette, setPalette] = useState<string[]>([])
  const [typography, setTypography] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiKey, setAiKey] = useState(() => loadStr('palette.aiKey', ''))
  const [aiModel, setAiModel] = useState(() => loadStr('palette.aiModel', DEFAULT_MODEL))
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    setBusy(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = () => reject(r.error ?? new Error('Could not read file'))
        r.readAsDataURL(file)
      })
      setImage(await coverImage(dataUrl, TILE_IMAGE_W, TILE_IMAGE_H))
    } catch {
      /* unreadable image — keep whatever preview was there */
    } finally {
      setBusy(false)
    }
  }

  const autoFill = async () => {
    if (!image || !aiKey.trim()) return
    setAiBusy(true)
    setAiError(null)
    try {
      const draft = await describeScreenshot(image, aiKey.trim(), aiModel.trim() || DEFAULT_MODEL)
      if (draft.title) setTitle(draft.title)
      if (draft.description) setDescription(draft.description)
      if (draft.keywords.length) setKeywords(draft.keywords.join(', '))
      if (draft.palette?.length) setPalette(draft.palette)
      if (draft.typography) setTypography(draft.typography)
      saveStr('palette.aiKey', aiKey.trim())
      saveStr('palette.aiModel', aiModel.trim() || DEFAULT_MODEL)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Something went wrong — try again.')
    } finally {
      setAiBusy(false)
    }
  }

  const keywordList = keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  const canAdd = title.trim().length > 0

  const submit = () => {
    if (!canAdd) return
    onAdd({
      id: `insp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      image,
      description: description.trim() || undefined,
      keywords: keywordList.length ? keywordList : undefined,
      palette: palette.length ? palette : undefined,
      typography: typography.trim() || undefined,
    })
    onCancel()
  }

  return (
    <form
      className="insp-form"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="win-toolbar">
        <button type="button" className="btn" onClick={onCancel}>
          ← Inspirations
        </button>
        <span className="win-status">new tile</span>
      </div>

      <div className="detail-title">Add an inspiration</div>
      <div className="detail-sub">
        Name it, add a screenshot, and let the AI draft the details for you.
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="insp-title">
          Title
        </label>
        <input
          id="insp-title"
          className="field"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. halftone editorial site"
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="insp-desc">
          Description
        </label>
        <input
          id="insp-desc"
          className="field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="what this design language looks like — the AI can write it"
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="insp-keywords">
          Keywords
        </label>
        <input
          id="insp-keywords"
          className="field"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="comma separated, e.g. warm paper ground, halftone dots"
        />
      </div>

      <div className="form-row">
        <span className="form-label">Image (optional)</span>
        <div className="form-img">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            {image ? 'Replace image…' : 'Add image…'}
          </button>
          {image && (
            <button type="button" className="btn" onClick={() => setImage(null)}>
              Remove
            </button>
          )}
        </div>
        <div className={`form-preview${image ? '' : ' empty'}`}>
          {image ? <img src={image} alt="preview" /> : busy ? 'loading…' : 'no image yet'}
        </div>
      </div>

      <div className="ai-box">
        <span className="form-label">AI auto-fill</span>
        <div className="ai-row">
          <input
            className="field ai-key"
            type="text"
            placeholder="OpenRouter key — sk-or-…"
            value={aiKey}
            onChange={(e) => setAiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <input
            className="field ai-model"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            title="OpenRouter model slug — the default is a free vision model"
          />
          <button type="button" className="btn" onClick={autoFill} disabled={!image || !aiKey.trim() || aiBusy}>
            {aiBusy ? 'Reading…' : '✨ Auto-fill from image'}
          </button>
        </div>
        <span className="ai-hint">
          {image
            ? 'The AI looks at your screenshot and drafts the title, description, keywords, an exact hex palette and the typography — free on OpenRouter. It picks a working free vision model automatically.'
            : 'Add an image above and the AI can describe it for you.'}
        </span>
        {aiError && <span className="ai-err">{aiError}</span>}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn" disabled={!canAdd}>
          Add to library
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
