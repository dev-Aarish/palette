import { useEffect, useState } from 'react'
import type { WinState } from '../types'
import { PixelIcon } from '../icons'

interface Props {
  wins: WinState[]
  activeId: string | null
  onStart(): void
  startOpen: boolean
  onTab(id: string): void
}

export function Taskbar({ wins, activeId, onStart, startOpen, onTab }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const clock = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <footer className="taskbar">
      <button className={`start-btn${startOpen ? ' open' : ''}`} onClick={onStart} aria-haspopup="menu">
        <PixelIcon kind="flag" size={17} />
        Start
      </button>
      <div className="tabs" role="tablist">
        {wins.map((w) => (
          <button
            key={w.id}
            className={`tab${w.id === activeId && !w.minimized ? ' active' : ''}`}
            onClick={() => onTab(w.id)}
            role="tab"
            aria-selected={w.id === activeId && !w.minimized}
          >
            <PixelIcon kind={w.kind} size={16} />
            <span className="tab-label">{w.title}</span>
          </button>
        ))}
      </div>
      <div className="tray">
        <div className="clock" role="timer">
          {clock}
        </div>
      </div>
    </footer>
  )
}
