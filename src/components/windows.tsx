import { useEffect, useRef, useState } from 'react'
import type { DitherMethod, DesktopIcon, TrashItem, UserWallpaper, WallpaperId } from '../types'
import { README_TEXT, WALLPAPERS } from '../data'
import { renderWallpaper } from '../dither'
import { PixelIcon } from '../icons'

// ---------------------------------------------------------------------------
// About Me
// ---------------------------------------------------------------------------

export function AboutContent() {
  return (
    <div>
      <p className="para">
        palette is a taste-injection library for design agents.
        {'\n\n'}
        A curated collection of website and UI design patterns — not a
        portfolio, not a link-dump — built so that an agent (or a human,
        mid-hackathon) can pull a coherent, non-generic visual language and
        apply it to a new project instead of defaulting to templated,
        forgettable UI.
        {'\n\n'}
        Every entry answers two questions on demand:
      </p>
      <table className="sys-table">
        <tbody>
          <tr>
            <td>?</td>
            <td>What does this design language look like?</td>
          </tr>
          <tr>
            <td>?</td>
            <td>Give me something I can hand to a model to reproduce it.</td>
          </tr>
        </tbody>
      </table>
      <p className="para">
        {'\n'}
        This desktop is one of those patterns, running as its own demo: strict
        monochrome, wallpapers dithered on a real canvas (no CSS filters),
        pixel type.
      </p>
      <div className="chip-row">
        <span className="chip">Dither Mono</span>
        <span className="chip">1-bit</span>
        <span className="chip">live</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Change Wallpaper — live-dithered swatches
// ---------------------------------------------------------------------------

interface WallpaperProps {
  wallpaper: WallpaperId
  dither: DitherMethod
  scanlines: boolean
  photoColor: boolean
  userWallpapers: UserWallpaper[]
  addMsg: string | null
  onChange(id: WallpaperId): void
  onDither(m: DitherMethod): void
  onScanlines(v: boolean): void
  onPhotoColor(v: boolean): void
  onAdd(file: File): void
  onRemove(id: string): void
}

/** A swatch preview: the wallpaper rendered live, in miniature. */
function SwatchImage({
  id,
  method,
  source,
  color,
  w,
  h,
}: {
  id: WallpaperId
  method: DitherMethod
  source?: string
  color?: boolean
  w: number
  h: number
}) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let live = true
    renderWallpaper(id, method, w, h, source, color)
      .then((u) => {
        if (live) setUrl(u)
      })
      .catch(() => {
        /* unreadable image — leave the swatch box empty */
      })
    return () => {
      live = false
    }
  }, [id, method, source, color, w, h])
  return <img src={url} alt="" style={{ visibility: url ? 'visible' : 'hidden' }} />
}

export function WallpaperContent({
  wallpaper,
  dither,
  scanlines,
  photoColor,
  userWallpapers,
  addMsg,
  onChange,
  onDither,
  onScanlines,
  onPhotoColor,
  onAdd,
  onRemove,
}: WallpaperProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const pickFiles = (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/')) onAdd(f)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <p className="swatch-hint">
        The built-in wallpapers are dithered to 1-bit halftone on a canvas.
        Your imported photos stay clean — no halftone film — shown in
        monochrome or full color, however you like. Click a swatch to apply,
        or add your own.
      </p>
      <div className="win-toolbar">
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Add wallpaper…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => pickFiles(e.target.files)}
        />
        <label title="Applies to the built-in wallpapers only; imported photos are always shown clean.">
          Dither built-ins
          <select
            className="field"
            value={dither}
            onChange={(e) => onDither(e.target.value as DitherMethod)}
          >
            <option value="bayer">Ordered (Bayer)</option>
            <option value="floyd">Error diffusion (Floyd–Steinberg)</option>
          </select>
        </label>
        <label
          className="win-status"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          title="Only imported photos — the built-in wallpapers stay dithered monochrome."
        >
          <input
            type="checkbox"
            checked={photoColor}
            onChange={(e) => onPhotoColor(e.target.checked)}
          />
          Color imported photos
        </label>
        <label className="win-status" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <input
            type="checkbox"
            checked={scanlines}
            onChange={(e) => onScanlines(e.target.checked)}
          />
          CRT scanlines
        </label>
      </div>
      {addMsg && (
        <p className="swatch-err" role="alert">
          {addMsg}
        </p>
      )}
      <div className="swatch-grid">
        {WALLPAPERS.map((t) => (
          <button
            key={t.id}
            className={`swatch${t.id === wallpaper ? ' selected' : ''}`}
            onClick={() => onChange(t.id)}
            aria-pressed={t.id === wallpaper}
          >
            <SwatchImage id={t.id} method={dither} w={176} h={110} />
            <span className="swatch-name">{t.name}</span>
          </button>
        ))}
        {userWallpapers.map((u) => (
          <div key={u.id} className={`swatch${u.id === wallpaper ? ' selected' : ''}`}>
            <button
              className="swatch-main"
              onClick={() => onChange(u.id)}
              aria-pressed={u.id === wallpaper}
            >
              <SwatchImage id={u.id} method={dither} source={u.dataUrl} color={photoColor} w={176} h={110} />
              <span className="swatch-name">{u.name}</span>
            </button>
            <button
              className="swatch-del"
              aria-label={`Remove ${u.name}`}
              onClick={() => onRemove(u.id)}
            />
          </div>
        ))}
        <div
          className={`swatch add-swatch${drag ? ' drag' : ''}`}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={(e) => {
            const rt = e.relatedTarget as Node | null
            if (rt && e.currentTarget.contains(rt)) return
            setDrag(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            pickFiles(e.dataTransfer.files)
          }}
          role="button"
          tabIndex={0}
          aria-label="Add wallpaper: click or drop an image here"
          title="Click or drop an image here"
        >
          <span className="add-plus">+</span>
          <span className="swatch-name">Add wallpaper</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recycle Bin
// ---------------------------------------------------------------------------

interface RecycleProps {
  trash: TrashItem[]
  onRestore(item: TrashItem): void
  onEmpty(): void
}

export function RecycleContent({ trash, onRestore, onEmpty }: RecycleProps) {
  return (
    <div>
      <div className="win-toolbar">
        <button className="btn" disabled={trash.length === 0} onClick={onEmpty}>
          Empty Recycle Bin
        </button>
        <span className="win-status">{trash.length} object{trash.length === 1 ? '' : 's'}</span>
      </div>
      {trash.length === 0 ? (
        <p className="empty-state">
          The Recycle Bin is empty.
          {'\n\n'}
          Deleted folders come here. Right-click a desktop icon → Delete to
          try it, then restore it from this window.
        </p>
      ) : (
        <div>
          {trash.map((item) => (
            <div key={item.id} className="trash-row">
              <PixelIcon kind={item.type === 'wallpaper' ? 'picture' : 'folder'} size={18} />
              <span className="t-name">{item.label}</span>
              <button className="btn" onClick={() => onRestore(item)}>
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// palette.txt (README)
// ---------------------------------------------------------------------------

export function ReadmeContent() {
  return <pre className="para">{README_TEXT}</pre>
}

// ---------------------------------------------------------------------------
// User folder note
// ---------------------------------------------------------------------------

interface FolderProps {
  icon: DesktopIcon
  onNote(id: string, note: string): void
}

export function FolderContent({ icon, onNote }: FolderProps) {
  const [value, setValue] = useState(icon.note ?? '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <div className="win-status">
        {value.trim()
          ? 'Anything you type here is saved to this folder, locally.'
          : 'This folder is empty. Type a note to keep it — it is saved as you type.'}
      </div>
      <textarea
        className="note-area"
        value={value}
        placeholder="Type a note for this folder…"
        onChange={(e) => {
          setValue(e.target.value)
          onNote(icon.id, e.target.value)
        }}
        aria-label={`Note for ${icon.label}`}
      />
    </div>
  )
}
