import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type {
  DesktopIcon,
  DitherMethod,
  IconKind,
  InspirationTile,
  TrashItem,
  UserWallpaper,
  WallpaperId,
  WinContent,
  WinState,
} from './types'
import { ACCENTS, defaultIcons } from './data'
import {
  coverImage,
  downscaleImage,
  loadImage,
  renderWallpaper,
  TILE_IMAGE_H,
  TILE_IMAGE_W,
} from './dither'
import { playDeleteSound, playEmptyBinSound } from './sound'
import { saveCloud, subscribeCloud } from './firebase'

import { DesktopIcon as DesktopIconView } from './components/DesktopIcon'
import { Window } from './components/Window'
import { ContextMenu } from './components/ContextMenu'
import type { MenuItem } from './components/ContextMenu'
import { Taskbar } from './components/Taskbar'
import { StartMenu } from './components/StartMenu'
import type { StartItem } from './components/StartMenu'
import { Boot, ShutDownDialog, ShutDownScreen } from './components/screens'
import { InspirationsContent } from './components/Inspirations'
import {
  AboutContent,
  FolderContent,
  ReadmeContent,
  RecycleContent,
  WallpaperContent,
} from './components/windows'

const TASKBAR_H = 40

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — the desktop still works, just doesn't persist */
  }
}

const SYSTEM_SIZES: Record<Exclude<WinContent, 'folder'>, { w: number; h: number }> = {
  about: { w: 540, h: 470 },
  inspirations: { w: 740, h: 560 },
  wallpaper: { w: 540, h: 460 },
  recycle: { w: 460, h: 360 },
  readme: { w: 560, h: 450 },
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
  /** True if the window was maximized when last closed — reopen maximized. */
  maximized?: boolean
}

const INSP_RECT_KEY = 'palette.inspRect'

function loadInspRect(): Rect | null {
  return load<Rect | null>(INSP_RECT_KEY, null)
}

function systemWindow(content: Exclude<WinContent, 'folder'>): {
  id: string
  title: string
  kind: IconKind
  w: number
  h: number
  x?: number
  y?: number
  maximized?: boolean
} {
  switch (content) {
    case 'about':
      return { id: 'sys:about', title: 'About Me', kind: 'person', ...SYSTEM_SIZES.about }
    case 'inspirations': {
      // Reopen where the user left it: size, position and maximized state.
      const r = loadInspRect()
      const base = SYSTEM_SIZES.inspirations
      const vw = window.innerWidth
      const vh = window.innerHeight - TASKBAR_H
      const w = r ? clamp(r.w, 300, vw - 10) : base.w
      const h = r ? clamp(r.h, 180, vh - 10) : base.h
      const x = r ? clamp(r.x, 6, Math.max(6, vw - w - 10)) : undefined
      const y = r ? clamp(r.y, 4, Math.max(4, vh - h - 4)) : undefined
      return {
        id: 'sys:inspirations',
        title: 'Inspirations',
        kind: 'folder',
        w,
        h,
        x,
        y,
        maximized: r?.maximized ?? false,
      }
    }
    case 'wallpaper':
      return { id: 'sys:wallpaper', title: 'Change Wallpaper', kind: 'picture', ...SYSTEM_SIZES.wallpaper }
    case 'recycle':
      return { id: 'sys:recycle', title: 'Recycle Bin', kind: 'recycle', ...SYSTEM_SIZES.recycle }
    case 'readme':
      return { id: 'sys:readme', title: 'palette.txt', kind: 'readme', ...SYSTEM_SIZES.readme }
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export default function App() {
  const [booted, setBooted] = useState(() => sessionStorage.getItem('palette.booted') === '1')
  const [icons, setIcons] = useState<DesktopIcon[]>(() => load('palette.icons', defaultIcons()))
  const [trash, setTrash] = useState<TrashItem[]>(() => load('palette.trash', []))
  const [inspirations, setInspirations] = useState<InspirationTile[]>(() => load('palette.inspirations', []))
  const [wins, setWins] = useState<WinState[]>([])
  const [userWallpapers, setUserWallpapers] = useState<UserWallpaper[]>(() => load('palette.userWallpapers', []))
  const [wallpaper, setWallpaper] = useState<WallpaperId>(() => {
    const w = load<WallpaperId>('palette.wallpaper', 'halftone')
    const ups = load<UserWallpaper[]>('palette.userWallpapers', [])
    return w.startsWith('user:') && !ups.some((u) => u.id === w) ? 'halftone' : w
  })
  const [dither, setDither] = useState<DitherMethod>(() => load('palette.dither', 'bayer'))
  const [photoColor, setPhotoColor] = useState<boolean>(() => load('palette.photoColor', false))
  const [addMsg, setAddMsg] = useState<string | null>(null)
  const [scanlines, setScanlines] = useState<boolean>(() => load('palette.scanlines', true))
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [flying, setFlying] = useState<{ id: string; dx: number; dy: number } | null>(null)
  const [shutDialog, setShutDialog] = useState(false)
  const [shutScreen, setShutScreen] = useState(false)
  const [flash, setFlash] = useState(false)
  const zRef = useRef(20)

  // Cloud sync keeps localStorage as the source of truth but mirrors the tile
  // array up to Firestore under {uid}. `localStampRef` records when the local
  // version last changed; a cloud version strictly newer than it is folded back
  // in (last-write-wins by timestamp, so edits never ping-pong).
  const localStampRef = useRef<number>(load('palette.inspStamp', 0))

  // Skip the very first (boot-time) run of the persist effect. Otherwise an
  // app that opens with an empty library would silently upload an empty
  // `{ tiles: [], updatedAt }` doc, which is exactly the empty doc seen above.
  const bootRef = useRef(true)

  // Debounced persistence + cloud mirror. localStorage always receives the
  // change; the cloud write is fire-and-forget so an offline desktop never
  // blocks an edit.
  useEffect(() => {
    const t = setTimeout(() => {
      if (bootRef.current) {
        bootRef.current = false
        return
      }
      save('palette.inspirations', inspirations)
      localStampRef.current = Date.now()
      save('palette.inspStamp', localStampRef.current)
      void saveCloud({ tiles: inspirations, updatedAt: localStampRef.current })
    }, 250)
    return () => clearTimeout(t)
  }, [inspirations])

  // Connect to Firestore and fold any newer cloud state back down once.
  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | null = null
    ;(async () => {
      unsub = await subscribeCloud((cloud) => {
        if (cancelled) return
        const localStamp = localStampRef.current
        if (cloud == null) {
          // No cloud doc yet — seed it with whatever we have locally.
          const local = load<InspirationTile[]>('palette.inspirations', [])
          if (local.length) {
            const stamp = Date.now()
            localStampRef.current = stamp
            save('palette.inspStamp', stamp)
            void saveCloud({ tiles: local, updatedAt: stamp })
          }
          return
        }
        if (cloud.updatedAt > localStamp) {
          localStampRef.current = cloud.updatedAt
          save('palette.inspStamp', cloud.updatedAt)
          save('palette.inspirations', cloud.tiles)
          setInspirations(cloud.tiles)
        }
      })
    })()
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  // One-time migration: tiles uploaded before the fixed-size crop existed kept
  // their original dimensions, so each card cropped differently. Re-run every
  // stored tile image through the same fixed-size crop once, then mark the
  // migration done so it never scans the library again.
  useEffect(() => {
    if (load('palette.inspNorm', false)) return
    let cancelled = false
    ;(async () => {
      const tiles = load<InspirationTile[]>('palette.inspirations', [])
      const out: InspirationTile[] = []
      let changed = false
      for (const t of tiles) {
        if (!t.image) {
          out.push(t)
          continue
        }
        try {
          const img = await loadImage(t.image)
          if (img.naturalWidth === TILE_IMAGE_W && img.naturalHeight === TILE_IMAGE_H) {
            out.push(t)
          } else {
            out.push({ ...t, image: await coverImage(t.image, TILE_IMAGE_W, TILE_IMAGE_H) })
            changed = true
          }
        } catch {
          // Unreadable image — keep the tile as it was.
          out.push(t)
        }
      }
      if (!cancelled && changed) setInspirations(out)
      if (!cancelled) save('palette.inspNorm', true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Remember the Inspirations window's size/position/maximized state as it
  // is dragged, resized or maximized, so the folder reopens as it was left.
  const inspWin = wins.find((w) => w.id === 'sys:inspirations')
  useEffect(() => {
    if (!inspWin) return
    const t = setTimeout(
      () =>
        save(INSP_RECT_KEY, {
          x: inspWin.x,
          y: inspWin.y,
          w: inspWin.w,
          h: inspWin.h,
          maximized: inspWin.maximized,
        }),
      250,
    )
    return () => clearTimeout(t)
  }, [inspWin?.x, inspWin?.y, inspWin?.w, inspWin?.h, inspWin?.maximized])
  useEffect(() => save('palette.wallpaper', wallpaper), [wallpaper])
  useEffect(() => save('palette.dither', dither), [dither])
  useEffect(() => save('palette.photoColor', photoColor), [photoColor])
  useEffect(() => save('palette.scanlines', scanlines), [scanlines])

  const [wallpaperUrl, setWallpaperUrl] = useState('')
  useEffect(() => {
    let live = true
    const user = wallpaper.startsWith('user:')
      ? userWallpapers.find((u) => u.id === wallpaper)
      : undefined
    const id: WallpaperId = user ? wallpaper : wallpaper.startsWith('user:') ? 'halftone' : wallpaper
    // Built-ins are dithered at a fixed pixel-grid size; imported photos are
    // clean and rendered near viewport resolution so they stay sharp.
    const dims = user
      ? {
          w: Math.min(Math.max(window.innerWidth, 1280), 1920),
          h: Math.min(Math.max(window.innerHeight - TASKBAR_H, 800), 1200),
        }
      : { w: 800, h: 500 }
    renderWallpaper(id, dither, dims.w, dims.h, user?.dataUrl, photoColor)
      .then((url) => {
        if (live) setWallpaperUrl(url)
      })
      .catch(() => {
        /* keep the previous wallpaper rather than blanking the desktop */
      })
    return () => {
      live = false
    }
  }, [wallpaper, dither, userWallpapers, photoColor])

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(r.error ?? new Error('Could not read file'))
      r.readAsDataURL(file)
    })

  // Persist the whole gallery in one write per change; if storage is full,
  // roll back to the last successfully saved list and say so.
  useEffect(() => {
    try {
      localStorage.setItem('palette.userWallpapers', JSON.stringify(userWallpapers))
    } catch {
      const saved = load<UserWallpaper[]>('palette.userWallpapers', [])
      setUserWallpapers(saved)
      setAddMsg('No more room to save wallpapers — remove one first.')
    }
  }, [userWallpapers])

  const addUserWallpaper = async (file: File) => {
    setAddMsg(null)
    let dataUrl: string
    let name: string
    try {
      dataUrl = await downscaleImage(await fileToDataUrl(file), 1024)
      name = (file.name.replace(/\.[^.]+$/, '') || 'photo').slice(0, 24)
    } catch {
      setAddMsg('Could not read that image. Try another file.')
      return
    }
    // Functional append: adding several files at once must not lose any.
    // Suffix keeps ids unique even when files finish decoding in the same ms.
    const id: `user:${string}` = `user:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
    const item: UserWallpaper = { id, name, dataUrl }
    setUserWallpapers((prev) => [...prev, item])
  }

  const removeUserWallpaper = (id: string) => {
    setUserWallpapers((prev) => prev.filter((u) => u.id !== id))
    setAddMsg(null)
    if (wallpaper === id) setWallpaper('halftone')
  }

  const activeId = useMemo(() => {
    const open = wins.filter((w) => !w.minimized)
    if (open.length === 0) return null
    return open.reduce((a, b) => (a.z > b.z ? a : b)).id
  }, [wins])

  // ------------------------------------------------------------------
  // Windows
  // ------------------------------------------------------------------

  const openWindow = (
    id: string,
    content: WinContent,
    title: string,
    kind: IconKind,
    w: number,
    h: number,
    folderIconId?: string,
    init?: { x?: number; y?: number; maximized?: boolean },
  ) => {
    setMenu(null)
    setStartOpen(false)
    setWins((prev) => {
      const existing = prev.find((wn) => wn.id === id)
      if (existing) {
        return prev.map((wn) =>
          wn.id === id ? { ...wn, minimized: false, z: ++zRef.current } : wn,
        )
      }
      const vw = window.innerWidth
      const vh = window.innerHeight - TASKBAR_H
      const cascade = prev.length * 26
      const x = init?.x !== undefined
        ? clamp(init.x, 6, Math.max(6, vw - w - 10))
        : clamp(Math.round((vw - w) / 2 - 70 + cascade), 6, Math.max(6, vw - w - 10))
      const y = init?.y !== undefined
        ? clamp(init.y, 4, Math.max(4, vh - h - 4))
        : clamp(Math.round((vh - h) / 3 + cascade * 0.8), 4, Math.max(4, vh - h - 4))
      return [
        ...prev,
        {
          id,
          content,
          title,
          kind,
          x,
          y,
          w,
          h,
          z: ++zRef.current,
          minimized: false,
          maximized: init?.maximized ?? false,
          // Remember the pre-maximize rect so un-maximizing returns there.
          savedRect:
            init?.maximized && init.x !== undefined && init.y !== undefined
              ? { x, y, w, h }
              : undefined,
          folderIconId,
        },
      ]
    })
  }

  const openFromIcon = (icon: DesktopIcon) => {
    if (icon.type === 'folder') {
      openWindow(`folder:${icon.id}`, 'folder', icon.label, 'folder', 460, 340, icon.id)
      return
    }
    const sw = systemWindow(icon.type)
    const init =
      sw.x !== undefined && sw.y !== undefined
        ? { x: sw.x, y: sw.y, maximized: sw.maximized ?? false }
        : undefined
    openWindow(sw.id, icon.type, sw.title, sw.kind, sw.w, sw.h, undefined, init)
  }

  const openSystem = (content: Exclude<WinContent, 'folder'>) => {
    const sw = systemWindow(content)
    const init =
      sw.x !== undefined && sw.y !== undefined
        ? { x: sw.x, y: sw.y, maximized: sw.maximized ?? false }
        : undefined
    openWindow(sw.id, content, sw.title, sw.kind, sw.w, sw.h, undefined, init)
  }

  const focusWin = (id: string) => {
    setWins((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: false, z: ++zRef.current } : w)))
  }

  const closeWin = (id: string) => {
    const w = wins.find((wn) => wn.id === id)
    if (id === 'sys:inspirations' && w) {
      save(INSP_RECT_KEY, { x: w.x, y: w.y, w: w.w, h: w.h, maximized: w.maximized })
    }
    setWins((prev) => prev.filter((wn) => wn.id !== id))
  }

  const minimizeWin = (id: string) => {
    setWins((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)))
  }

  const maximizeWin = (id: string) => {
    setWins((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w
        if (w.maximized) {
          const r = w.savedRect ?? { x: 60, y: 30, w: 480, h: 340 }
          return { ...w, maximized: false, savedRect: undefined, x: r.x, y: r.y, w: r.w, h: r.h }
        }
        return { ...w, maximized: true, savedRect: { x: w.x, y: w.y, w: w.w, h: w.h } }
      }),
    )
  }

  const moveWin = (id: string, x: number, y: number) => {
    setWins((prev) =>
      prev.map((w) => {
        if (w.id !== id || w.maximized) return w
        const vw = window.innerWidth
        const vh = window.innerHeight - TASKBAR_H
        return {
          ...w,
          x: clamp(x, -w.w + 80, vw - 80),
          y: clamp(y, 0, vh - 26),
        }
      }),
    )
  }

  const resizeWin = (id: string, w: number, h: number) => {
    setWins((prev) =>
      prev.map((wn) => {
        if (wn.id !== id || wn.maximized) return wn
        const vw = window.innerWidth
        const vh = window.innerHeight - TASKBAR_H
        return { ...wn, w: clamp(w, 300, vw - 10), h: clamp(h, 180, vh - 10) }
      }),
    )
  }

  // ------------------------------------------------------------------
  // Icons
  // ------------------------------------------------------------------

  const dragIcon = (id: string, x: number, y: number) => {
    const vw = window.innerWidth
    const vh = window.innerHeight - TASKBAR_H
    setIcons((prev) =>
      prev.map((ic) => (ic.id === id ? { ...ic, x: clamp(x, 0, vw - 88), y: clamp(y, 0, vh - 96) } : ic)),
    )
  }

  const startRename = (id: string) => {
    setRenameId(id)
  }

  const commitRename = (id: string, label: string | null) => {
    setRenameId(null)
    if (label == null) return
    setIcons((prev) => prev.map((ic) => (ic.id === id ? { ...ic, label } : ic)))
    setWins((prev) =>
      prev.map((w) => (w.folderIconId === id ? { ...w, title: label } : w)),
    )
  }

  const deleteIcon = (icon: DesktopIcon) => {
    playDeleteSound()
    const bin = icons.find((i) => i.type === 'recycle')
    const from = { x: icon.x + 39, y: icon.y + 24 }
    const to = bin ? { x: bin.x + 39, y: bin.y + 24 } : from
    setFlying({ id: icon.id, dx: to.x - from.x, dy: to.y - from.y })
    setTimeout(() => {
      setFlying((f) => (f?.id === icon.id ? null : f))
      setIcons((prev) => prev.filter((i) => i.id !== icon.id))
      setTrash((prev) => [...prev, { id: icon.id, type: icon.type, label: icon.label, x: icon.x, y: icon.y, note: icon.note }])
      setSelected(null)
      setRenameId(null)
      setWins((prev) => prev.filter((w) => w.folderIconId !== icon.id))
    }, 330)
  }

  const restoreItem = (item: TrashItem) => {
    setTrash((prev) => prev.filter((t) => t.id !== item.id))
    setIcons((prev) => [
      ...prev,
      { id: item.id, type: item.type, label: item.label, x: clamp(item.x, 0, window.innerWidth - 82), y: clamp(item.y, 0, window.innerHeight - 122), note: item.note },
    ])
  }

  const newFolder = () => {
    const id = `folder-${Date.now()}`
    const n = icons.length
    setIcons((prev) => [
      ...prev,
      { id, type: 'folder', label: 'New Folder', x: clamp(18 + (n % 5) * 88, 0, window.innerWidth - 82), y: clamp(14 + Math.floor(n / 5) * 96, 0, window.innerHeight - 122), note: '' },
    ])
    setRenameId(id)
  }

  const arrangeIcons = () => {
    setIcons((prev) => prev.map((ic, i) => ({ ...ic, x: 18, y: 14 + i * 96 })))
  }

  const refresh = () => {
    setFlash(true)
    setTimeout(() => setFlash(false), 190)
  }

  const noteChange = (id: string, note: string) => {
    setIcons((prev) => prev.map((ic) => (ic.id === id ? { ...ic, note } : ic)))
  }

  /** Move a gallery tile so it takes the slot of `targetId` (or the end when null). */
  const reorderInspiration = (dragId: string, targetId: string | null) => {
    setInspirations((prev) => {
      const from = prev.findIndex((t) => t.id === dragId)
      if (from === -1) return prev
      const dragged = prev[from]
      if (targetId == null) {
        if (from === prev.length - 1) return prev
        return [...prev.filter((t) => t.id !== dragId), dragged]
      }
      const rest = prev.filter((t) => t.id !== dragId)
      const to = rest.findIndex((t) => t.id === targetId)
      if (to === -1) return prev
      rest.splice(to, 0, dragged)
      return rest
    })
  }

  // ------------------------------------------------------------------
  // Menus
  // ------------------------------------------------------------------

  const deskMenuItems = (): MenuItem[] => [
    { label: 'New Folder', action: newFolder },
    { label: 'Change Wallpaper', action: () => openSystem('wallpaper') },
    { label: 'Arrange Icons', action: arrangeIcons },
    { sep: true },
    { label: 'CRT Scanlines', checked: scanlines, action: () => setScanlines((v) => !v) },
    { label: 'Refresh', action: refresh },
  ]

  const iconMenuItems = (icon: DesktopIcon): MenuItem[] => [
    { label: 'Open', action: () => openFromIcon(icon) },
    { label: 'Rename', action: () => startRename(icon.id) },
    { sep: true },
    { label: 'Delete', action: () => deleteIcon(icon) },
  ]

  const onDeskContext = (e: ReactMouseEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('.window, input, textarea, select')) return
    e.preventDefault()
    setSelected(null)
    setStartOpen(false)
    setMenu({ x: e.clientX, y: e.clientY, items: deskMenuItems() })
  }

  const onIconContext = (e: ReactMouseEvent, icon: DesktopIcon) => {
    e.preventDefault()
    e.stopPropagation()
    setSelected(icon.id)
    setStartOpen(false)
    setMenu({ x: e.clientX, y: e.clientY, items: iconMenuItems(icon) })
  }

  const startItems: StartItem[] = [
    { label: 'palette.txt', kind: 'readme', action: () => openSystem('readme') },
    { label: 'Inspirations', kind: 'folder', action: () => openSystem('inspirations') },
    { label: 'About Me', kind: 'person', action: () => openSystem('about') },
    { label: 'Change Wallpaper', kind: 'picture', action: () => openSystem('wallpaper') },
    { label: 'Recycle Bin', kind: 'recycle', action: () => openSystem('recycle') },
  ]

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const sortedWins = [...wins].sort((a, b) => a.z - b.z)

  const renderContent = (win: WinState) => {
    switch (win.content) {
      case 'about':
        return <AboutContent />
      case 'inspirations':
        return (
          <InspirationsContent
            tiles={inspirations}
            onAdd={(tile) =>
              setInspirations((prev) => [
                ...prev,
                { ...tile, accent: ACCENTS[prev.length % ACCENTS.length] },
              ])
            }
            onRemove={(id) => setInspirations((prev) => prev.filter((t) => t.id !== id))}
            onReorder={reorderInspiration}
          />
        )
      case 'wallpaper':
        return (
          <WallpaperContent
            wallpaper={wallpaper}
            dither={dither}
            scanlines={scanlines}
            photoColor={photoColor}
            userWallpapers={userWallpapers}
            addMsg={addMsg}
            onChange={setWallpaper}
            onDither={setDither}
            onScanlines={setScanlines}
            onPhotoColor={setPhotoColor}
            onAdd={addUserWallpaper}
            onRemove={removeUserWallpaper}
          />
        )
      case 'recycle':
        return (
          <RecycleContent
            trash={trash}
            onRestore={restoreItem}
            onEmpty={() => {
              playEmptyBinSound()
              setTrash([])
            }}
          />
        )
      case 'readme':
        return <ReadmeContent />
      case 'folder': {
        const icon = icons.find((i) => i.id === win.folderIconId)
        if (!icon) return null
        return <FolderContent icon={icon} onNote={noteChange} />
      }
    }
  }

  if (!booted) {
    return (
      <Boot
        onDone={() => {
          sessionStorage.setItem('palette.booted', '1')
          setBooted(true)
        }}
      />
    )
  }

  if (shutScreen) {
    return <ShutDownScreen onRestart={() => window.location.reload()} />
  }

  return (
    <div
      className={`desktop${flash ? ' flash' : ''}${wallpaper.startsWith('user:') ? ' photo' : ''}`}
      style={{ backgroundImage: `url(${wallpaperUrl})` }}
      onContextMenu={onDeskContext}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          setSelected(null)
          setMenu(null)
          setStartOpen(false)
          // Clicking the desktop background minimizes the active window.
          if (activeId) minimizeWin(activeId)
        }
      }}
    >
      {icons.map((icon) => (
        <DesktopIconView
          key={icon.id}
          icon={icon}
          selected={selected === icon.id}
          renaming={renameId === icon.id}
          flying={flying?.id === icon.id ? { dx: flying.dx, dy: flying.dy } : null}
          onSelect={(id) => setSelected(id)}
          onOpen={openFromIcon}
          onMenu={onIconContext}
          onDrag={dragIcon}
          onStartRename={startRename}
          onRename={commitRename}
        />
      ))}

      {sortedWins
        .filter((w) => !w.minimized)
        .map((w) => (
          <Window
            key={w.id}
            win={w}
            active={w.id === activeId}
            onFocus={focusWin}
            onClose={closeWin}
            onMinimize={minimizeWin}
            onMaximize={maximizeWin}
            onMove={moveWin}
            onResize={resizeWin}
          >
            {renderContent(w)}
          </Window>
        ))}

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />
      )}

      {startOpen && (
        <StartMenu
          items={startItems}
          onClose={() => setStartOpen(false)}
          onShutDown={() => setShutDialog(true)}
        />
      )}

      {shutDialog && (
        <ShutDownDialog
          onCancel={() => setShutDialog(false)}
          onConfirm={() => {
            setShutDialog(false)
            setShutScreen(true)
          }}
        />
      )}

      <Taskbar
        wins={wins}
        activeId={activeId}
        onStart={() => setStartOpen((v) => !v)}
        startOpen={startOpen}
        onTab={(id) => {
          const w = wins.find((wn) => wn.id === id)
          if (w && !w.minimized && id === activeId) minimizeWin(id)
          else focusWin(id)
        }}
      />

      {scanlines && <div className="scanlines" aria-hidden="true" />}
    </div>
  )
}
