import { palette } from '../core/palette.js'
import { canSee, conePoints, angleDiff } from '../ai/vision.js'
import { tileCentre } from '../world/tilemap.js'

export const HEADLIGHT_RANGE = 200
export const HEADLIGHT_HALF = 0.34
const SPEED = 92
const STOP_TIME = 6

export function createVehicle(def) {
  const route = def.route
  const v = {
    x: 0,
    y: 0,
    heading: 0,
    beam: 0, 
    i: 0,
    dir: 1,
    speed: 0,
    state: 'drive', 
    stopTimer: 0,
    suspicion: 0,
    sees: false,
    lastSeen: null,

    reset() {
      v.i = route.length - 1 
      v.dir = -1
      v.x = tileCentre(route[v.i].tx)
      v.y = tileCentre(route[v.i].ty)
      const n = route[v.i - 1]
      v.heading = Math.atan2(tileCentre(n.ty) - v.y, tileCentre(n.tx) - v.x)
      v.beam = v.heading
      v.state = 'drive'
      v.suspicion = 0
      v.speed = 0
    },

    update(dt, world) {
      const { map, player } = world
      const cover = world.coverAt ? world.coverAt(player.x, player.y) : 1
      const range = HEADLIGHT_RANGE * cover * Math.max(1, world.viewMul ?? 1)
      const eye = { x: v.x, y: v.y, angle: v.beam }
      v.sees =
        !player.hidden &&
        canSee(map, eye, player.x, player.y, range, HEADLIGHT_HALF)

      if (world.flashId && world.flashId !== v._flashId) {
        v._flashId = world.flashId
        if (
          !player.hidden &&
          canSee(map, eye, player.x, player.y, range * 1.6, Math.PI * 0.6)
        )
          v.suspicion = Math.min(1, v.suspicion + 0.5)
      }

      if (v.sees) {
        const d = Math.hypot(player.x - v.x, player.y - v.y)
        v.suspicion = Math.min(
          1,
          v.suspicion + (0.7 + 1.6 * Math.max(0, 1 - d / range)) * dt,
        )
        v.lastSeen = { x: player.x, y: player.y }
      } else if (v.state === 'drive') {
        v.suspicion = Math.max(0, v.suspicion - 0.3 * dt)
      }

      if (v.state === 'drive' && v.suspicion >= 1) {
        v.state = 'stopped'
        v.stopTimer = STOP_TIME
        world.onSpot(v)
      }

      if (v.state === 'stopped') {
        v.speed = Math.max(0, v.speed - 220 * dt)
        const want = v.sees
          ? Math.atan2(player.y - v.y, player.x - v.x)
          : v.beam
        v.beam += Math.max(-3 * dt, Math.min(3 * dt, angleDiff(v.beam, want)))
        if (v.sees) v.stopTimer = Math.max(v.stopTimer, 2)
        v.stopTimer -= dt
        if (v.stopTimer <= 0) {
          v.state = 'drive'
          v.suspicion = 0.3
        }
        return
      }

      v.speed = Math.min(SPEED, v.speed + 60 * dt)
      const target = route[v.i]
      const tx = tileCentre(target.tx)
      const ty = tileCentre(target.ty)
      const dx = tx - v.x
      const dy = ty - v.y
      const dist = Math.hypot(dx, dy)
      if (dist < 4) {
        v.i += v.dir
        if (v.i < 0 || v.i >= route.length) {
          v.dir = -v.dir
          v.i += v.dir * 2
        }
        return
      }
      const want = Math.atan2(dy, dx)
      v.heading += Math.max(
        -4 * dt,
        Math.min(4 * dt, angleDiff(v.heading, want)),
      )
      v.beam += Math.max(
        -5 * dt,
        Math.min(5 * dt, angleDiff(v.beam, v.heading)),
      )
      const step = Math.min(v.speed * dt, dist)
      v.x += (dx / dist) * step
      v.y += (dy / dist) * step
    },

    lights(map) {
      const fx = v.x + Math.cos(v.heading) * 12
      const fy = v.y + Math.sin(v.heading) * 12
      return [
        {
          x: fx,
          y: fy,
          radius: HEADLIGHT_RANGE,
          strength: 1,
          colour: v.state === 'stopped' ? 'regime-red' : 'searchlight',
          cone: conePoints(
            map,
            { x: fx, y: fy, angle: v.beam },
            HEADLIGHT_RANGE,
            16,
            HEADLIGHT_HALF,
          ),
        },
        { x: v.x, y: v.y, radius: 30, strength: 0.5 },
      ]
    },

    draw(ctx, cam, time) {
      const x = v.x - cam.x
      const y = v.y - cam.y
      ctx.save()
      ctx.translate(Math.round(x), Math.round(y))
      ctx.rotate(v.heading)
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(-13, -6, 28, 14)
      ctx.fillStyle = palette.get('soot')
      ctx.fillRect(-14, -7, 28, 14)
      ctx.fillStyle = palette.get('concrete-700')
      ctx.fillRect(-10, -5, 16, 10) 
      ctx.fillStyle = palette.get('regime-red')
      ctx.fillRect(-8, -1, 12, 2) 
      ctx.fillStyle = palette.get('concrete-500')
      ctx.fillRect(7, -5, 4, 10) 
      ctx.fillStyle = palette.get('paper')
      ctx.fillRect(13, -6, 2, 3) 
      ctx.fillRect(13, 3, 2, 3)
      ctx.fillStyle = palette.get('regime-red')
      ctx.fillRect(-14, -6, 2, 3) 
      ctx.fillRect(-14, 3, 2, 3)
      if (v.state === 'stopped' && Math.floor(time * 6) % 2) {
        ctx.fillStyle = palette.get('regime-red') 
        ctx.fillRect(-4, -3, 5, 6)
      }
      ctx.restore()
    },
  }

  v.reset()
  return v
}

export const VEHICLE_CATCH = 15
