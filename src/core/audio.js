let ctx = null
let master = null

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
}

function tone({
  freq,
  type = 'sine',
  dur = 0.3,
  gain = 0.3,
  when = 0,
  glide = null,
}) {
  if (!ctx) return
  const t = ctx.currentTime + when
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

export const sfx = {
  bell() {
    for (const strike of [0, 1.1]) {
      for (const [ratio, g] of [
        [1, 0.28],
        [2.4, 0.14],
        [3.0, 0.1],
        [4.2, 0.06],
        [5.4, 0.04],
      ]) {
        tone({ freq: 196 * ratio, dur: 2.6, gain: g, when: strike })
      }
    }
  },
  warn() {
    tone({ freq: 880, type: 'square', dur: 0.08, gain: 0.05 })
  },
  grind() {
    tone({ freq: 70, type: 'sawtooth', dur: 0.6, gain: 0.12, glide: 45 })
  },
  pickup() {
    tone({ freq: 523, dur: 0.12, gain: 0.12 })
    tone({ freq: 784, dur: 0.18, gain: 0.1, when: 0.08 })
  },
  stone() {
    tone({ freq: 240, type: 'triangle', dur: 0.08, gain: 0.2, glide: 120 })
  },
  throw() {
    tone({ freq: 400, type: 'sine', dur: 0.12, gain: 0.05, glide: 700 })
  },
  suspicious() {
    tone({ freq: 330, type: 'triangle', dur: 0.15, gain: 0.08 })
  },
  alert() {
    tone({ freq: 220, type: 'square', dur: 0.18, gain: 0.08 })
    tone({ freq: 165, type: 'square', dur: 0.3, gain: 0.08, when: 0.16 })
  },
  capture() {
    tone({ freq: 110, type: 'sawtooth', dur: 1.2, gain: 0.15, glide: 55 })
  },
  checkpoint() {
    tone({ freq: 392, dur: 0.25, gain: 0.08 })
    tone({ freq: 587, dur: 0.4, gain: 0.08, when: 0.12 })
  },
}
