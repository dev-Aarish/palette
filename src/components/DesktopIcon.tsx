import { useRef } from 'react'
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { DesktopIcon } from '../types'
import { PixelIcon, iconForType } from '../icons'

interface Props {
  icon: DesktopIcon
  selected: boolean
  renaming: boolean
  flying: { dx: number; dy: number } | null
  onSelect(id: string): void
  onOpen(icon: DesktopIcon): void
  onMenu(e: ReactMouseEvent, icon: DesktopIcon): void
  onDrag(id: string, x: number, y: number): void
  onStartRename(id: string): void
  onRename(id: string, label: string | null): void
}

/** A freely draggable desktop icon: click to select, double-click to open. */
export function DesktopIcon({
  icon,
  selected,
  renaming,
  flying,
  onSelect,
  onOpen,
  onMenu,
  onDrag,
  onStartRename,
  onRename,
}: Props) {
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const movedRef = useRef(false)

  const down = (e: ReactPointerEvent) => {
    // Let the rename input keep its own focus and caret behavior.
    if ((e.target as HTMLElement).closest('input')) return
    e.preventDefault()
    movedRef.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, ox: icon.x, oy: icon.y }
  }

  const move = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true
    onDrag(icon.id, d.ox + dx, d.oy + dy)
  }

  const up = () => {
    if (!movedRef.current) onSelect(icon.id)
    drag.current = null
  }

  const open = () => {
    if (movedRef.current) return
    onOpen(icon)
  }

  const commitRename = (e: ReactFocusEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value.trim()
    onRename(icon.id, v || null)
  }

  const keyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter') open()
    else if (e.key === 'F2') onStartRename(icon.id)
  }

  const style = flying
    ? { left: icon.x, top: icon.y, transform: `translate(${flying.dx}px, ${flying.dy}px)`, opacity: 0 }
    : { left: icon.x, top: icon.y }

  return (
    <article
      className={`desktop-icon${selected ? ' selected' : ''}${flying ? ' fly' : ''}`}
      style={style}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('input')) return
        open()
      }}
      onContextMenu={(e) => onMenu(e, icon)}
      onKeyDown={keyDown}
      tabIndex={0}
      role="button"
      aria-label={icon.label}
    >
      <span className="glyph">
        <PixelIcon kind={iconForType(icon.type)} size={40} />
      </span>
      {renaming ? (
        <input
          className="icon-rename"
          defaultValue={icon.label}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
            else if (e.key === 'Escape') onRename(icon.id, null)
          }}
          aria-label="Icon name"
        />
      ) : (
        <span className="label">{icon.label}</span>
      )}
    </article>
  )
}
