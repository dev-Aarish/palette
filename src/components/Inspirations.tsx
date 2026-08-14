import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { InspirationTile } from '../types'
import { downscaleImage } from '../dither'
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

  // Escape leaves the add form back to the grid.
  useEffect(() => {
    if (!adding) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAdding(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding])

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
          <Tile key={tile.id} tile={tile} hero={i % 7 === 0} onRemove={() => onRemove(tile.id)} />
        ))}
        <AddTile onAdd={() => setAdding(true)} />
      </div>
      <div className="win-status insp-status">
        Tiles are yours — add inspirations and they live in this folder. Right-click
        the desktop → New Folder to add your own folders.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gallery tiles
// ---------------------------------------------------------------------------

function Tile({ tile, hero, onRemove }: { tile: InspirationTile; hero: boolean; onRemove: () => void }) {
  const style = { '--tile-accent': tile.accent } as CSSProperties
  const tip = tile.keywords?.length ? tile.keywords.join(' · ') : undefined
  return (
    <div className={`tile${hero ? ' hero' : ''}`} style={style} title={tip}>
      <div className={`tile-art${tile.image ? '' : ' plain'}`}>
        {tile.image ? (
          <img src={tile.image} alt={tile.title} />
        ) : (
          <span className="tile-mono">{tile.title.slice(0, 1).toUpperCase()}</span>
        )}
        <button className="tile-del" aria-label={`Remove ${tile.title}`} onClick={onRemove} />
      </div>
      <div className="tile-foot">
        <span className="tile-title">{tile.title}</span>
        {tile.description && <span className="tile-desc">{tile.description}</span>}
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
      setImage(await downscaleImage(dataUrl, 1024))
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
            ? 'The AI looks at your screenshot and drafts the title, description and keywords — free on OpenRouter. It picks a working free vision model automatically.'
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
