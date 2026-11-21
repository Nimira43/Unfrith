import { TILE } from '../core/display.js'
import { input } from '../core/input.js'
import { palette } from '../core/palette.js'
import { noise } from '../systems/noise.js'
import { toTile } from '../world/tilemap.js'

const WALK = 72
const SNEAK = 38
const STEP_EVERY = 0.34
const STEP_RADIUS = 3 * TILE

export const MAX_STONES = 5

export function createPlayer(x, y) {
  const p = {
    x,
    y,
    hw: 5,
    hh: 5,
    angle: 0,
    moving: false,
    sneaking: false,
    hidden: false,
    stones: 2,
    stepTimer: 0,
    still: 0,

    update(dt, map) {
      let dx = 0
      let dy = 0
      if (input.isDown('a', 'arrowleft')) dx -= 1
      if (input.isDown('d', 'arrowright')) dx += 1
      if (input.isDown('w', 'arrowup')) dy -= 1
      if (input.isDown('s', 'arrowdown')) dy += 1

      p.sneaking = input.isDown('shift')
      p.moving = dx !== 0 || dy !== 0

      if (p.moving) {
        const len = Math.hypot(dx, dy)
        const speed = p.sneaking ? SNEAK : WALK
        p.angle = Math.atan2(dy, dx)
        moveAxis(map, (dx / len) * speed * dt, 0)
        moveAxis(map, 0, (dy / len) * speed * dt)
        p.still = 0

        if (!p.sneaking) {
          p.stepTimer -= dt
          if (p.stepTimer <= 0) {
            p.stepTimer = STEP_EVERY
            noise.emit(p.x, p.y, STEP_RADIUS, 'step')
          }
        }
      } else {
        p.still += dt
        p.stepTimer = 0
      }

      p.hidden =
        map.isHiding(toTile(p.x), toTile(p.y)) &&
        (p.sneaking || p.still > 0.25)
    },

    draw(ctx, cam, time) {
      const x = Math.round(p.x - cam.x)
      const y = Math.round(p.y - cam.y)
      ctx.save()
      ctx.globalAlpha = p.hidden ? 0.45 : 1

      ctx.strokeStyle = palette.get('resistance-amber')
      ctx.globalAlpha *= 0.55 + Math.sin(time * 3) * 0.15
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = p.hidden ? 0.45 : 1

      ctx.translate(x, y)
      ctx.rotate(p.angle)
      ctx.fillStyle = '#262624'
      ctx.beginPath()
      ctx.ellipse(0, 0, 5, 6.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#121312'
      ctx.beginPath()
      ctx.moveTo(4.5, 0)
      ctx.quadraticCurveTo(1, -4.5, -2.5, -3)
      ctx.quadraticCurveTo(-4, 0, -2.5, 3)
      ctx.quadraticCurveTo(1, 4.5, 4.5, 0)
      ctx.fill()
      ctx.restore()
    },
  }

  function moveAxis(map, mx, my) {
    const nx = p.x + mx
    const ny = p.y + my
    if (!map.boxHitsSolid(nx, ny, p.hw, p.hh)) {
      p.x = nx
      p.y = ny
    }
  }

  return p
}
