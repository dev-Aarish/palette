import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface MenuItem {
  label?: string
  action?: () => void
  sep?: boolean
  checked?: boolean
  disabled?: boolean
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose(): void
}

/** Flat white menu with a hard-edged shadow, at exactly the cursor. */
export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const [idx, setIdx] = useState(-1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const nx = Math.min(x, window.innerWidth - r.width - 4)
    const ny = Math.min(y, window.innerHeight - r.height - 4)
    setPos({ x: Math.max(0, nx), y: Math.max(0, ny) })
  }, [x, y])

  useEffect(() => {
    // Close on outside interaction, but never on clicks that start inside the
    // menu itself — otherwise the item's click event never reaches it.
    const close = (e: Event) => {
      const el = ref.current
      if (el && e.target instanceof Node && el.contains(e.target)) return
      onClose()
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('blur', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [onClose])

  const actives = items.map((it, i) => (it.sep || it.disabled ? -1 : i)).filter((i) => i >= 0)

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const cur = actives.indexOf(idx)
      setIdx(actives[(cur + 1) % actives.length])
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const cur = actives.indexOf(idx)
      setIdx(actives[(cur - 1 + actives.length) % actives.length])
    } else if (e.key === 'Enter') {
      const item = idx >= 0 ? items[idx] : undefined
      if (item?.action) {
        item.action()
        onClose()
      }
    }
  }

  return (
    <div
      ref={ref}
      className="ctx"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKey}
      tabIndex={-1}
      role="menu"
    >
      {items.map((it, i) =>
        it.sep ? (
          <div key={i} className="ctx-sep" role="separator" />
        ) : (
          <button
            key={i}
            className="ctx-item"
            role="menuitem"
            disabled={it.disabled}
            onMouseEnter={() => setIdx(i)}
            onFocus={() => setIdx(i)}
            onClick={() => {
              it.action?.()
              onClose()
            }}
          >
            {it.label}
            {it.checked ? <span className="check">&#10003;</span> : null}
          </button>
        ),
      )}
    </div>
  )
}
