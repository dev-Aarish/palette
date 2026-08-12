import { useEffect, useState } from 'react'

const BOOT_LINES = [
  'PALETTE BIOS v1.00',
  '(C) 2026 taste-injection industries',
  '',
  'CPU   : 1-BIT DITHER ENGINE',
  'MEM   : 640K CONVENTIONAL OK',
  'DISK  : 32 SHADES OF GRAY FOUND',
  'GDI   : PIXEL BITMAP MODE',
  '',
  'Starting palette...',
]

/** One short, skippable boot sequence per browser session. */
export function Boot({ onDone }: { onDone(): void }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (n >= BOOT_LINES.length) {
      const t = setTimeout(onDone, 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setN(n + 1), n === 0 ? 130 : 65)
    return () => clearTimeout(t)
  }, [n, onDone])

  return (
    <div className="boot" onClick={onDone} role="button" aria-label="Skip boot, load the desktop" title="Click to skip">
      {BOOT_LINES.slice(0, n).join('\n')}
      <span className="cursor">_</span>
    </div>
  )
}

export function ShutDownDialog({
  onCancel,
  onConfirm,
}: {
  onCancel(): void
  onConfirm(): void
}) {
  return (
    <div className="shut-dialog" role="dialog" aria-label="Shut down">
      <header className="titlebar">
        <span className="t-icon">&#9632;</span>
        <span className="t-title">Shut Down palette</span>
      </header>
      <div className="body">
        You can safely shut down palette.
        {'\n\n'}
        Everything on this desktop is saved locally. Your folders, their
        notes, the wallpaper — they will all be here when you restart.
      </div>
      <div className="actions">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn" onClick={onConfirm}>
          Shut Down
        </button>
      </div>
    </div>
  )
}

export function ShutDownScreen({ onRestart }: { onRestart(): void }) {
  return (
    <div className="shut-screen">
      <div>It's now safe to turn off your computer.</div>
      <button className="btn" onClick={onRestart}>
        Restart
      </button>
    </div>
  )
}
