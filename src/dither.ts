import type { BuiltInWallpaper, DitherMethod, WallpaperId } from './types'

/**
 * The signature of this desktop: every wallpaper is a procedurally drawn
 * grayscale scene that is then reduced to 1-bit with a real dithering
 * algorithm (ordered Bayer or Floyd–Steinberg error diffusion) on a canvas.
 * No CSS filters anywhere — this is the "Ghostline" halftone look.
 */

// Bayer 8x8 ordered-dither matrix, thresholds normalized to 0..255.
const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
].map((m) => ((m + 0.5) / 64) * 255)

export function orderedDither(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): void {
  for (let y = 0; y < h; y++) {
    const row = y % 8
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const out = data[i] > BAYER8[row * 8 + (x % 8)] ? 255 : 0
      data[i] = out
      data[i + 1] = out
      data[i + 2] = out
    }
  }
}

/** Floyd–Steinberg error diffusion with serpentine scanning. */
export function floydDither(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): void {
  for (let y = 0; y < h; y++) {
    const left = y % 2 === 0
    for (let k = 0; k < w; k++) {
      const x = left ? k : w - 1 - k
      const i = (y * w + x) * 4
      const old = data[i]
      const nw = old > 127 ? 255 : 0
      data[i] = nw
      data[i + 1] = nw
      data[i + 2] = nw
      const err = old - nw
      if (err === 0) continue
      const push = (px: number, py: number, wgt: number) => {
        if (px < 0 || px >= w || py < 0 || py >= h) return
        const j = (py * w + px) * 4
        data[j] = data[j] + (err * wgt) / 16
        data[j + 1] = data[j]
        data[j + 2] = data[j]
      }
      const nx = left ? x + 1 : x - 1
      push(nx, y, 7)
      push(left ? x - 1 : x + 1, y + 1, 3)
      push(x, y + 1, 5)
      push(nx, y + 1, 1)
    }
  }
}

/** Deterministic PRNG so each wallpaper id always renders the same picture. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function addNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number,
  rnd: () => number,
): void {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 2 * amount
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

// ---------------------------------------------------------------------------
// Grayscale scene painters. Everything stays dark-ish so the light UI chrome
// and white icon labels read well against the 1-bit result.
// ---------------------------------------------------------------------------

type Painter = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rnd: () => number,
) => void

function paintHalftone(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number): void {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.38, w * 0.02, w * 0.5, h * 0.5, Math.max(w, h) * 0.75)
  g.addColorStop(0, '#f4f4f4')
  g.addColorStop(0.32, '#9e9e9e')
  g.addColorStop(0.68, '#2c2c2c')
  g.addColorStop(1, '#060606')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  addNoise(ctx, w, h, 16, rnd)
}

function ridge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseY: number,
  amp: number,
  color: string,
  rnd: () => number,
  snow: boolean,
): void {
  const xs: number[] = [0, w]
  const ys: number[] = [baseY - rnd() * amp, baseY - rnd() * amp]
  for (let step = 0; step < 6; step++) {
    const next: Array<[number, number]> = []
    for (let i = 0; i < xs.length - 1; i++) {
      const mx = (xs[i] + xs[i + 1]) / 2
      const my = (ys[i] + ys[i + 1]) / 2 + (rnd() - 0.5) * amp * (1 - (step + 1) / 8)
      next.push([mx, my])
    }
    const nx: number[] = []
    const ny: number[] = []
    for (let i = 0; i < xs.length; i++) {
      nx.push(xs[i])
      ny.push(ys[i])
      if (i < next.length) {
        nx.push(next[i][0])
        ny.push(next[i][1])
      }
    }
    xs.length = 0
    ys.length = 0
    xs.push(...nx)
    ys.push(...ny)
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i], ys[i])
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
  if (snow) {
    ctx.fillStyle = '#cfcfcf'
    for (let i = 1; i < xs.length - 1; i++) {
      const y0 = ys[i - 1]
      const y1 = ys[i]
      const y2 = ys[i + 1]
      if (y1 < y0 && y1 < y2 && y1 < baseY - amp * 0.5) {
        ctx.beginPath()
        ctx.moveTo(xs[i] - 11, y1 + 1)
        ctx.lineTo(xs[i] + 11, y1 + 1)
        ctx.lineTo(xs[i] + 5, y1 - 12)
        ctx.lineTo(xs[i], y1 - 8)
        ctx.lineTo(xs[i] - 5, y1 - 12)
        ctx.closePath()
        ctx.fill()
      }
    }
  }
}

function paintMountains(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#0b0b0b')
  sky.addColorStop(0.55, '#3d3d3d')
  sky.addColorStop(1, '#1c1c1c')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#f2f2f2'
  ctx.beginPath()
  ctx.arc(w * 0.76, h * 0.2, h * 0.085, 0, Math.PI * 2)
  ctx.fill()
  ridge(ctx, w, h, h * 0.52, h * 0.16, '#5b5b5b', rnd, true)
  ridge(ctx, w, h, h * 0.75, h * 0.2, '#141414', rnd, false)
  ctx.fillStyle = '#080808'
  ctx.fillRect(0, h * 0.88, w, h * 0.12)
  addNoise(ctx, w, h, 10, rnd)
}

function paintCity(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#080808')
  sky.addColorStop(0.72, '#3a3a3a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#e8e8e8'
  ctx.beginPath()
  ctx.arc(w * 0.72, h * 0.14, h * 0.05, 0, Math.PI * 2)
  ctx.fill()
  const groundY = h * 0.92
  ctx.fillStyle = '#050505'
  ctx.fillRect(0, groundY, w, h - groundY)
  let x = -20
  while (x < w + 20) {
    const bw = 26 + rnd() * 44
    const bh = h * (0.18 + rnd() * 0.42)
    const bx = x + rnd() * 10
    const by = groundY - bh
    ctx.fillStyle = '#101010'
    ctx.fillRect(bx, by, bw, bh)
    if (bh > h * 0.45 && rnd() < 0.5) {
      ctx.fillStyle = '#101010'
      ctx.fillRect(bx + bw / 2 - 1, by - 14, 2, 14)
      ctx.fillStyle = '#8c8c8c'
      ctx.fillRect(bx + bw / 2 - 1, by - 17, 2, 3)
    }
    for (let wy = by + 8; wy < groundY - 8; wy += 9) {
      for (let wx2 = bx + 5; wx2 < bx + bw - 4; wx2 += 7) {
        if (rnd() < 0.15) {
          ctx.fillStyle = '#dcdcdc'
          ctx.fillRect(wx2, wy, 3, 4)
        } else if (rnd() < 0.1) {
          ctx.fillStyle = '#858585'
          ctx.fillRect(wx2, wy, 3, 4)
        }
      }
    }
    x += bw + 4 + rnd() * 14
  }
  addNoise(ctx, w, h, 8, rnd)
}

function paintFlower(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#1a1a1a')
  g.addColorStop(1, '#090909')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const cx = w * 0.5
  const cy = h * 0.36
  ctx.fillStyle = '#2a2a2a'
  ctx.fillRect(cx - 3, cy + 22, 6, h * 0.5)
  ctx.fillStyle = '#3c3c3c'
  ctx.beginPath()
  ctx.ellipse(cx - 28, cy + 66, 22, 8, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx + 28, cy + 96, 22, 8, 0.5, 0, Math.PI * 2)
  ctx.fill()
  const petals = 12
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2
    ctx.fillStyle = i % 2 === 0 ? '#e8e8e8' : '#9a9a9a'
    ctx.beginPath()
    ctx.ellipse(cx + Math.cos(a) * 27, cy + Math.sin(a) * 27, 16, 30, a, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    ctx.fillStyle = i % 2 === 0 ? '#f0f0f0' : '#bdbdbd'
    ctx.beginPath()
    ctx.ellipse(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13, 9, 16, a, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#f5f5f5'
  ctx.beginPath()
  ctx.arc(cx, cy, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#181818'
  ctx.beginPath()
  ctx.arc(cx, cy, 3, 0, Math.PI * 2)
  ctx.fill()
  addNoise(ctx, w, h, 8, rnd)
}

const PAINTERS: Record<BuiltInWallpaper, Painter> = {
  halftone: paintHalftone,
  mountains: paintMountains,
  city: paintCity,
  flower: paintFlower,
}

const SEEDS: Record<BuiltInWallpaper, number> = {
  halftone: 11,
  mountains: 22,
  city: 33,
  flower: 44,
}

/** Recode pixels to grayscale (luma) in place. */
function luma(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
  }
}

function applyDither(data: Uint8ClampedArray, w: number, h: number, method: DitherMethod): void {
  if (method === 'bayer') orderedDither(data, w, h)
  else floydDither(data, w, h)
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

/** Downscale an image data URL to at most maxEdge pixels on the long edge. */
export async function downscaleImage(dataUrl: string, maxEdge = 1024): Promise<string> {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  return c.toDataURL('image/jpeg', 0.85)
}

/**
 * Render a wallpaper id to a data URL.
 * Built-ins paint a procedural grayscale scene and reduce it to 1-bit with
 * the dithering algorithms. `user:*` ids draw the uploaded photo (cover-fit)
 * with no halftone film — clean grayscale by default, or full color when
 * `color` is set. Either way the UI itself stays strictly monochrome.
 */
export async function renderWallpaper(
  id: WallpaperId,
  method: DitherMethod,
  w = 800,
  h = 500,
  source?: string,
  color = false,
): Promise<string> {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return ''

  if (id.startsWith('user:')) {
    // Imported photos render clean — no halftone film — so the desktop and
    // its text stay readable. Grayscale by default, full color on request.
    if (!source) {
      const rnd = mulberry32(SEEDS.halftone + w * 7 + h)
      PAINTERS.halftone(ctx, w, h, rnd)
      const img = ctx.getImageData(0, 0, w, h).data
      applyDither(img, w, h, method)
      ctx.putImageData(new ImageData(img, w, h), 0, 0)
      return c.toDataURL('image/png')
    }
    const photo = await loadImage(source)
    const s = Math.max(w / photo.width, h / photo.height)
    ctx.drawImage(
      photo,
      (w - photo.width * s) / 2,
      (h - photo.height * s) / 2,
      photo.width * s,
      photo.height * s,
    )
    const img = ctx.getImageData(0, 0, w, h).data
    if (!color) luma(img)
    ctx.putImageData(new ImageData(img, w, h), 0, 0)
    return c.toDataURL('image/jpeg', 0.85)
  }

  const rnd = mulberry32(SEEDS[id as BuiltInWallpaper] + w * 7 + h)
  PAINTERS[id as BuiltInWallpaper](ctx, w, h, rnd)
  const data = ctx.getImageData(0, 0, w, h).data
  applyDither(data, w, h, method)
  ctx.putImageData(new ImageData(data, w, h), 0, 0)
  return c.toDataURL('image/png')
}
