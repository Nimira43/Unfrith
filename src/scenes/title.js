import { palette, fonts } from '../core/palette.js'
import { FRAME_W } from '../core/display.js'

const W = FRAME_W
const H = 640
const RAIN_DROPS = 220

export function createTitleScene({ taskbar, onStart }) {
  let time = 0
  let rain = []

  const onKey = (e) => {
    if (e.key === 'Enter') onStart()
  }

  return {
    enter() {
      rain = Array.from({ length: RAIN_DROPS }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 8 + Math.random() * 14,
        speed: 520 + Math.random() * 380,
      }))
      window.addEventListener('keydown', onKey)
      taskbar.mode('title')
      taskbar.status('AWAITING ORDERS')
    },

    exit() {
      window.removeEventListener('keydown', onKey)
    },

    update(dt) {
      time += dt
      for (const d of rain) {
        d.y += d.speed * dt
        d.x -= d.speed * 0.18 * dt 
        if (d.y > H) {
          d.y = -d.len
          d.x = Math.random() * (W + 120)
        }
      }
    },

    render(ctx) {
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, palette.get('soot'))
      bg.addColorStop(1, palette.get('concrete-900'))
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.globalAlpha = 0.18
      ctx.fillStyle = palette.get('regime-red-dark')
      ctx.font = `700 92px ${fonts.title}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('OBEY · WORK · WORSHIP', W / 2, 96)
      ctx.restore()

      const angle = Math.sin(time * 0.45) * 0.75 - Math.PI / 2
      const ox = W / 2
      const oy = H + 40
      const reach = 820
      const spread = 0.16
      ctx.save()
      const beam = ctx.createRadialGradient(ox, oy, 0, ox, oy, reach)
      beam.addColorStop(0, withAlpha(palette.get('searchlight'), 0.22))
      beam.addColorStop(1, withAlpha(palette.get('searchlight'), 0))
      ctx.fillStyle = beam
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(ox + Math.cos(angle - spread) * reach, oy + Math.sin(angle - spread) * reach)
      ctx.lineTo(ox + Math.cos(angle + spread) * reach, oy + Math.sin(angle + spread) * reach)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.strokeStyle = withAlpha(palette.get('concrete-300'), 0.35)
      ctx.lineWidth = 1
      ctx.beginPath()
      for (const d of rain) {
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.len * 0.18, d.y + d.len)
      }
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = palette.get('paper')
      ctx.shadowColor = withAlpha(palette.get('soot'), 0.9)
      ctx.shadowBlur = 24
      ctx.font = `700 196px ${fonts.title}`
      ctx.fillText('Unfriþ', W / 2, 370)

      ctx.shadowBlur = 0
      ctx.fillStyle = palette.get('paper-dim')
      ctx.font = `italic 500 30px ${fonts.main}`
      ctx.fillText('discord · the breaking of the peace', W / 2, 470)

      const flicker = Math.sin(time * 3) > -0.6 && Math.random() > 0.03
      if (flicker) {
        ctx.fillStyle = palette.get('resistance-amber')
        ctx.font = `22px ${fonts.mono}`
        ctx.fillText('PRESS ENTER', W / 2, 560)
      }
      ctx.restore()
    },
  }
}

function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
