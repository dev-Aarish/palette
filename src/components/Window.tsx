import { useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { WinState } from '../types'
import { PixelIcon } from '../icons'

interface Props {
  win: WinState
  active: boolean
  onFocus(id: string): void
  onClose(id: string): void
  onMinimize(id: string): void
  onMaximize(id: string): void
  onMove(id: string, x: number, y: number): void
  onResize(id: string, w: number, h: number): void
  children: ReactNode
}

export function Window({
  win,
  active,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onMove,
  onResize,
  children,
}: Props) {
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const resz = useRef<{ px: number; py: number; ow: number; oh: number } | null>(null)

  const startDrag = (e: ReactPointerEvent) => {
    if (win.maximized) return
    if ((e.target as HTMLElement).closest('.t-btn')) return
    drag.current = { px: e.clientX, py: e.clientY, ox: win.x, oy: win.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const doDrag = (e: ReactPointerEvent) => {
    if (!drag.current) return
    onMove(win.id, drag.current.ox + (e.clientX - drag.current.px), drag.current.oy + (e.clientY - drag.current.py))
  }

  const endDrag = () => {
    drag.current = null
  }

  const startResize = (e: ReactPointerEvent) => {
    resz.current = { px: e.clientX, py: e.clientY, ow: win.w, oh: win.h }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const doResize = (e: ReactPointerEvent) => {
    if (!resz.current) return
    onResize(win.id, resz.current.ow + (e.clientX - resz.current.px), resz.current.oh + (e.clientY - resz.current.py))
  }

  const endResize = () => {
    resz.current = null
  }

  const style: CSSProperties = win.maximized
    ? { left: 0, top: 0, width: '100vw', height: 'calc(100vh - var(--taskbar-h))', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  return (
    <section
      className={`window${win.maximized ? ' maximized' : ''}`}
      style={style}
      onPointerDownCapture={() => onFocus(win.id)}
      role="dialog"
      aria-label={win.title}
      aria-hidden={win.minimized}
    >
      <header
        className={`titlebar${active ? '' : ' inactive'}`}
        onPointerDown={startDrag}
        onPointerMove={doDrag}
        onPointerUp={endDrag}
      >
        <span className="t-icon">
          <PixelIcon kind={win.kind} size={16} />
        </span>
        <span className="t-title">{win.title}</span>
        <button className="t-btn" aria-label="Minimize" onClick={() => onMinimize(win.id)}>
          <span className="g g-min" />
        </button>
        <button className="t-btn" aria-label="Maximize" onClick={() => onMaximize(win.id)}>
          <span className="g g-max" />
        </button>
        <button className="t-btn" aria-label="Close" onClick={() => onClose(win.id)}>
          <span className="g g-close" />
        </button>
      </header>
      <div className="window-body">{children}</div>
      {!win.maximized && (
        <div
          className="resize"
          onPointerDown={startResize}
          onPointerMove={doResize}
          onPointerUp={endResize}
        />
      )}
    </section>
  )
}
