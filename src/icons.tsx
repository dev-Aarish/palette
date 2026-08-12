import type { IconKind, IconType } from './types'

/**
 * Flat 1-bit pixel-art icons on a 16x16 grid, drawn as evenodd SVG paths
 * so cutouts (windows, petals of light) read as the background showing
 * through. shape-rendering keeps edges crisp.
 */
const PATHS: Record<IconKind, string> = {
  folder:
    'M1,2h7l2,2h5v9H1z M2,9h12v1H2z',
  newfolder:
    'M1,2h7l2,2h5v9H1z M6.5,5.5h2v2h2v2h-2v2h-2v-2h-2v-2h2z',
  picture:
    'M1,3h14v10H1z M8.5,5h3.5v3.5H8.5z M3,11.5l3-3.5 3,3.5z',
  person:
    'M5.5,3.5h5v5h-5z M2.5,12.5c0-3,2.5-5.5,5.5-5.5s5.5,2.5,5.5,5.5v1h-11z',
  recycle:
    'M6,0.5h4v2.5h-4z M2,3h12v2H2z M3,5.2h10l-1.4,9.8H4.4z M6.2,8.8h3.6L8,12z',
  readme:
    'M4,1h9v13h-9z M10,1l3,3h-3z M6,6h6v1H6z M6,9h6v1H6z M6,12h4v1H6z',
  flag:
    'M0,0h16v16H0z M3,3h4.5v4.5H3z M8.5,8.5H13V13H8.5z',
}

export function PixelIcon({
  kind,
  size = 32,
  label,
}: {
  kind: IconKind
  size?: number
  label?: string
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
    >
      {label ? <title>{label}</title> : null}
      <path fill="currentColor" fillRule="evenodd" d={PATHS[kind]} />
    </svg>
  )
}

export function iconForType(type: IconType): IconKind {
  switch (type) {
    case 'inspirations':
    case 'folder':
      return 'folder'
    case 'wallpaper':
      return 'picture'
    case 'about':
      return 'person'
    case 'recycle':
      return 'recycle'
    case 'readme':
      return 'readme'
  }
}
