# Design Homepage — Retro OS Desktop UI

**Concept:** A monochrome, Windows-95-style desktop interface — draggable icons, real windows (open/close/minimize), a right-click context menu, and a wallpaper switcher — rendered entirely in black, white, and shades of gray, with a dithered/halftone texture as the visual signature instead of color.

---

## 1. Reference Breakdown (from your uploaded images)

| Reference | What to take from it | What to leave out |
|---|---|---|
| **Win95 portfolio mock** | Window chrome (title bar, min/max/close), address-bar-style breadcrumb inside windows, taskbar with Start button + clock, left-aligned desktop icon grid with labels below icons | All color — teal desktop, blue title bars |
| **"Ghostline" Notepad** | Halftone/dithered imagery, high-contrast black backgrounds, pixel display type, gritty CRT-terminal mood | The horror/glitch framing — just the texture and contrast, not the theme |
| **Slack-style mock** | Simplicity of the icon shapes (clean folder silhouettes) | Rounded corners, macOS traffic-light buttons, warm color palette |

The identity is: **Win95's structure + Ghostline's texture, in strict monochrome.**

---

## 2. Visual Identity (Design Tokens)

### Color palette — grayscale only, no accent color

| Token | Hex | Use |
|---|---|---|
| `--black` | `#0A0A0A` | Primary text, borders, active title bars |
| `--charcoal` | `#2B2B2B` | Window drop-shadow, dark bevel edge |
| `--gray-dark` | `#555555` | Secondary borders, disabled states, inactive title bar text |
| `--gray-mid` | `#8C8C8C` | Bevel mid-tone, scrollbar track, inactive title bar fill |
| `--gray-light` | `#C9C9C9` | Bevel highlight, hover state, button face |
| `--off-white` | `#F2F0EA` | Desktop base background |
| `--white` | `#FFFFFF` | Window body background, active highlights |

Instead of a color accent, "selection" and "focus" states are communicated by **inverting** black/white (classic Win95 highlight behavior) — this keeps the whole UI honestly monochrome rather than sneaking in a color as a crutch.

### Typography

- **Display / titles** (window titles, Start button, icon labels): a pixel bitmap font — e.g. `Perfect DOS VGA 437` or `W95FA`
- **System UI** (menus, dialogs, taskbar clock): a monospace face — e.g. `VT323` or a plain `MS Sans Serif`-style fallback
- **Body text inside windows** (About Me, longer content): `IBM Plex Mono` or similar — readable but still terminal-flavored

### Signature texture — dithered halftone

This is the one visual idea the whole page should be remembered by: any wallpaper image (or the default wallpaper pattern) is run through a **1-bit dither filter** (Floyd–Steinberg or ordered/Bayer dithering) rather than a simple grayscale/CSS filter. This produces the newspaper-print/Ghostline look and is what makes "lots of shades of black and white" feel intentional rather than just "grayscale mode."

Optional secondary touch: a very faint CRT scanline overlay (2–4% opacity) across the viewport, toggle-able.

### Iconography

Flat, 1-bit line-art icons — crisp pixel edges, no anti-aliased blur, no gradients. Folder, wallpaper/picture, and recycle-bin icons should read like 16×16/32×32 sprite icons, not skeuomorphic renders.

---

## 3. Layout Structure

```
┌──────────────────────────────────────────────────┐
│  [Inspirations]     [Change Wallpaper]            │
│  [About Me]         [Recycle Bin]                 │
│                                                    │
│                                                    │
│              ┌─────────────────────────┐          │
│              │ ▪ About Me        _ □ X │          │
│              ├─────────────────────────┤          │
│              │  window content...      │          │
│              │                         │          │
│              └─────────────────────────┘          │
│                                                    │
├────────────────────────────────────────────────────┤
│ [Start]   [About Me]  [Inspirations]      11:39 PM │
└────────────────────────────────────────────────────┘
```

### Desktop (base layer)
- Full-bleed wallpaper (default: the dithered halftone pattern, or any photo the user picks, auto-dithered)
- Desktop icons anchored top-left, stacked vertically (~80px per icon + label)
- Icons are freely draggable and reposition wherever dropped

### Default desktop icons
1. **Inspirations** (folder)
2. **Change Wallpaper** (opens the wallpaper picker window)
3. **About Me** (folder — optional, fits the portfolio use case)
4. **Recycle Bin** (holds deleted folders)

### Taskbar (fixed, bottom)
- **Start** button, left — pixel flag-style icon
- **Open window tabs**, middle — one tab per open/minimized window, click to restore/focus
- **Clock**, right — live time, monospace digits

### Window chrome (every window)
- Title bar: icon + title (left), minimize / maximize / close as three small square buttons (right)
- **Active** window → solid black title bar. **Inactive** window → gray/hatched title bar (classic focus cue)
- Body: white background, 1–2px black border
- Scrollbars styled as chunky retro scrollbars, not native thin ones
- Drag the window by its title bar only; resize handle at the bottom-right corner (stretch goal)

### Right-click context menu
- Appears exactly at cursor position
- On empty desktop: **New Folder**, **Change Wallpaper**, **Arrange Icons**, **Refresh**
- On an existing folder icon: **Open**, **Rename**, **Delete**
- Styling: flat white background, thin black border, hard-edged drop shadow (offset 2–3px, no blur — a real shadow, not a CSS blur, to stay true to the era)

---

## 4. Core Interactions

| Action | Behavior |
|---|---|
| Drag icon | Repositions freely on the desktop |
| Drag window | Moves by title-bar grab only |
| Double-click icon | Opens the folder/window (instant or near-instant transition — retro OSes barely animated) |
| Minimize | Window collapses to a taskbar tab |
| Maximize | Window fills the viewport |
| Close | Window and its taskbar tab disappear |
| Right-click → New Folder | Adds a new icon with an editable label, default name "New Folder" |
| Right-click → Delete | Removes the icon (optionally animates toward the Recycle Bin) |
| Change Wallpaper | Opens a picker window with pre-dithered thumbnail swatches; click to apply instantly |

---

## 5. Open Questions

- **Inspirations content**: pulled from a local JSON file, or user-editable at runtime?
- **Recycle Bin**: does it actually restore deleted folders, or is it decorative?
- **Icon grid**: snap-to-grid by default, or fully free drag?
- **Persistence**: `localStorage` only, or does this need a backend?

---

## 6. Suggested Component Map (React + Vite)

`Desktop` → `DesktopIcon`, `Window`, `ContextMenu`, `Taskbar`, `WallpaperPicker`

- `react-rnd` for window drag/resize
- Global state: array of open windows (position, z-index, minimized flag), array of desktop icons (position, type, label), current wallpaper — all persisted to `localStorage`
