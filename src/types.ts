export type IconType =
  | 'inspirations'
  | 'folder'
  | 'wallpaper'
  | 'about'
  | 'recycle'
  | 'readme'

export interface DesktopIcon {
  id: string
  type: IconType
  label: string
  /** Desktop coordinates (top-left of the icon tile). */
  x: number
  y: number
  /** Free-form note for user-created folders. */
  note?: string
}

export interface TrashItem {
  id: string
  type: IconType
  label: string
  x: number
  y: number
  note?: string
}

export type WinContent =
  | 'about'
  | 'inspirations'
  | 'wallpaper'
  | 'recycle'
  | 'readme'
  | 'folder'

/** Pixel-art glyph available for rendering (see icons.tsx). */
export type IconKind =
  | 'folder'
  | 'newfolder'
  | 'picture'
  | 'person'
  | 'recycle'
  | 'readme'
  | 'flag'

export interface WinState {
  id: string
  content: WinContent
  title: string
  kind: IconKind
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
  maximized: boolean
  savedRect?: { x: number; y: number; w: number; h: number }
  /** For folder windows: which desktop icon this window belongs to. */
  folderIconId?: string
}

export type BuiltInWallpaper = 'halftone' | 'mountains' | 'city' | 'flower'
export type WallpaperId = BuiltInWallpaper | `user:${string}`
export type DitherMethod = 'bayer' | 'floyd'

export interface UserWallpaper {
  id: `user:${string}`
  name: string
  /** Downscaled source image (data URL) — dithered at render time. */
  dataUrl: string
}

/** One user-added tile in the Inspirations bento gallery. */
export interface InspirationTile {
  id: string
  title: string
  /** Downscaled inspiration screenshot (data URL) — null for title-only tiles. */
  image: string | null
  /** Accent colour (hex) assigned when the tile is created. */
  accent: string
  /** Optional AI-drafted description of the design language. */
  description?: string
  /** Optional AI-drafted vocabulary tags. */
  keywords?: string[]
  /** Exact hex colours extracted from the screenshot by the AI. */
  palette?: string[]
  /** One sentence on the typefaces the design uses. */
  typography?: string
}
