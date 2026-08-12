/* ---------------------------------------------------------------------------
   Retro synthesized sound effects (Web Audio) — no audio files shipped.

   Everything else on this desktop is generated in code (pixel icons,
   dithered wallpapers), so the sounds are synthesized too: filtered-noise
   "crumple" bursts in the spirit of classic Windows recycle-bin effects.
   --------------------------------------------------------------------------- */

let ctx: AudioContext | null = null
let noiseBuf: AudioBuffer | null = null

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Browsers block audio until the user interacts with the page. Unlock on the
// first gesture so sounds keep playing for the rest of the session.
if (typeof window !== 'undefined') {
  const unlock = () => ensureCtx()
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

function cachedNoise(c: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf
  const len = c.sampleRate * 2
  noiseBuf = c.createBuffer(1, len, c.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return noiseBuf
}

/** A short filtered-noise burst that sweeps downward — a "crumple". */
function crinkle(
  c: AudioContext,
  dest: AudioNode,
  {
    start = 0,
    duration = 0.28,
    from = 2400,
    to = 700,
    q = 1.4,
    level = 0.5,
  }: {
    start?: number
    duration?: number
    from?: number
    to?: number
    q?: number
    level?: number
  },
): void {
  const t = c.currentTime + start
  const src = c.createBufferSource()
  src.buffer = cachedNoise(c)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = q
  bp.frequency.setValueAtTime(Math.max(from, 40), t)
  bp.frequency.exponentialRampToValueAtTime(Math.max(to, 40), t + duration)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(level, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(bp).connect(g).connect(dest)
  src.start(t)
  src.stop(t + duration + 0.05)
}

/** A soft landing "thunk", for when an icon reaches the bin. */
function thunk(c: AudioContext, dest: AudioNode, when: number): void {
  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(180, when)
  o.frequency.exponentialRampToValueAtTime(70, when + 0.07)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.35, when + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.09)
  o.connect(g).connect(dest)
  o.start(when)
  o.stop(when + 0.12)
}

/** A shared output bus: compressor keeps overlapping crinkles from clipping. */
function masterOut(c: AudioContext): GainNode {
  const g = c.createGain()
  g.gain.value = 0.9
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -12
  comp.knee.value = 12
  comp.ratio.value = 8
  comp.attack.value = 0.002
  comp.release.value = 0.12
  g.connect(comp).connect(c.destination)
  return g
}

/** Icon dropped into the Recycle Bin: a quick paper-toss crumple. */
export function playDeleteSound(): void {
  const c = ensureCtx()
  if (!c) return
  const master = masterOut(c)
  crinkle(c, master, { duration: 0.16, from: 2800, to: 1200, q: 1.6, level: 0.5 })
  crinkle(c, master, { start: 0.05, duration: 0.22, from: 1800, to: 600, q: 1.2, level: 0.45 })
  // The icon's fly-to-trash animation takes ~330ms — land right as it arrives.
  thunk(c, master, c.currentTime + 0.3)
}

/** Empty Recycle Bin: a longer, crunchier crumple. */
export function playEmptyBinSound(): void {
  const c = ensureCtx()
  if (!c) return
  const master = masterOut(c)
  for (let i = 0; i < 6; i++) {
    crinkle(c, master, {
      start: i * 0.09 + Math.random() * 0.03,
      duration: 0.18 + Math.random() * 0.12,
      from: 2000 + Math.random() * 1800,
      to: 400 + Math.random() * 500,
      q: 1.1 + Math.random() * 0.9,
      level: 0.3 + Math.random() * 0.25,
    })
  }
  thunk(c, master, c.currentTime + 0.75)
}
