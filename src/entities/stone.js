import { TILE } from '../core/display.js'
import { palette } from '../core/palette.js'
import { sfx } from '../core/audio.js'
import { noise } from '../systems/noise.js'

export const THROW_RANGE = 9 * TILE
const NOISE_RADIUS = 7 * TILE

export function throwTarget(map, fromX, fromY, toX, toY) {
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const want = Math.min(Math.hypot(toX - fromX, toY - fromY), THROW_RANGE)
  const reach = map.rayLength(fromX, fromY, angle, want)
  return {
    x: fromX + Math.cos(angle) * reach,
    y: fromY + Math.sin(angle) * reach,
  }
}

export function createStone(fromX, fromY, toX, toY) {
  const dist = Math.hypot(toX - fromX, toY - fromY)
  const duration = 0.25 + dist / 360
  const s = {
    t: 0,
    duration,
    landed: false,
    ripple: 0,
    done: false,

    update(dt) {
      if (!s.landed) {
        s.t += dt
        if (s.t >= duration) {
          s.landed = true
          noise.emit(toX, toY, NOISE_RADIUS, 'stone')
          sfx.stone()
        }
      } else {
        s.ripple += dt
        if (s.ripple > 0.8) s.done = true
      }
    },

    draw(ctx, cam) {
      if (!s.landed) {
        const k = s.t / duration
        const x = fromX + (toX - fromX) * k - cam.x
        const y = fromY + (toY - fromY) * k - cam.y
        const lift = Math.sin(k * Math.PI) * (8 + dist * 0.12)
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 2)
        ctx.fillStyle = palette.get('concrete-300')
        ctx.fillRect(Math.round(x) - 1, Math.round(y - lift) - 1, 3, 3)
      } else {
        const k = s.ripple / 0.8
        ctx.strokeStyle = palette.get('concrete-300')
        ctx.globalAlpha = 1 - k
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(toX - cam.x, toY - cam.y, 4 + k * 26, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    },
  }
  return s
}
