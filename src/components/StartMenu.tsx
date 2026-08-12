import type { IconKind } from '../types'
import { PixelIcon } from '../icons'

export interface StartItem {
  label: string
  kind: IconKind
  action(): void
}

interface Props {
  items: StartItem[]
  onClose(): void
  onShutDown(): void
}

/** The Start menu: a vertical "palette" wordmark band + program list. */
export function StartMenu({ items, onClose, onShutDown }: Props) {
  return (
    <nav className="start-menu" role="menu" aria-label="Start menu">
      <div className="start-band">palette</div>
      <div className="start-items">
        {items.map((it) => (
          <button
            key={it.label}
            className="start-item"
            role="menuitem"
            onClick={() => {
              it.action()
              onClose()
            }}
          >
            <PixelIcon kind={it.kind} size={18} />
            {it.label}
          </button>
        ))}
        <div className="start-sep" />
        <button
          className="start-item"
          role="menuitem"
          onClick={() => {
            onShutDown()
            onClose()
          }}
        >
          <PixelIcon kind="flag" size={18} />
          Shut Down…
        </button>
      </div>
    </nav>
  )
}
