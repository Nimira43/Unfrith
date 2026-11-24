import { TILE } from '../core/display.js'
import { palette } from '../core/palette.js'
import { canSee, angleDiff, conePoints, VIEW_RANGE } from '../ai/vision.js'
import { findPath } from '../world/pathfinding.js'
import { tileCentre, toTile } from '../world/tilemap.js'
import { withAlpha } from '../world/mapRenderer.js'

export const CAP_OFFICER = {
  name: 'CAP officer',
  speeds: { patrol: 36, suspicious: 50, alert: 84, search: 46, return: 44 },
  body: 'concrete-700',
  cap: 'regime-red',
}

const TURN_RATE = 6
const REPATH_ALERT = 0.35
const LOOK_TIME = 3
const SEARCH_TIME = 7

export function createGuard(def, kind = CAP_OFFICER) {
  const route = def.route
  const g = {
    kind,
    x: 0,
    y: 0,
    angle: 0,
    state: 'patrol',
    suspicion: 0,
    sees: false,
    path: [],
    routeIndex: 0,
    wait: 0,
    target: null,
    lastSeen: null,
    unseen: 0,
    repath: 0,
    lookTimer: 0,
    lookBase: 0,
    searchTimer: 0,
    staring: false,

    reset() {
      g.x = tileCentre(route[0].tx)
      g.y = tileCentre(route[0].ty)
      g.angle = Math.random() * Math.PI * 2
      g.state = 'patrol'
      g.suspicion = 0
      g.path = []
      g.routeIndex = route.length > 1 ? 1 : 0
      g.wait = 0.5 + Math.random() * 2
      g.target = null
      g.lastSeen = null
    },

    update(dt, world) {
      const { map, player } = world
      const dist = Math.hypot(player.x - g.x, player.y - g.y)

      const hiddenFromMe = player.hidden && !(g.state === 'alert' && dist < 28)
      g.sees = !hiddenFromMe && canSee(map, g, player.x, player.y)

      if (g.sees) {
         const rate = g.state === 'search' ? 2.2 : 0.35 + 1.4 * (1 - dist / VIEW_RANGE)
        g.suspicion = Math.min(1, g.suspicion + rate * dt)
        g.lastSeen = { x: player.x, y: player.y }
        g.unseen = 0
      } else {
        g.unseen += dt
        if (g.state !== 'alert') g.suspicion = Math.max(0, g.suspicion - 0.2 * dt)
      }

      if (g.state !== 'alert') {
        for (const n of world.noises) {
          if (Math.hypot(n.x - g.x, n.y - g.y) <= n.radius) {
            g.investigate(map, n.x, n.y)
            world.onSuspicious(g)
          }
        }
      }

      if (g.state !== 'alert' && g.suspicion >= 1) {
        g.state = 'alert'
        g.repath = 0
        world.onAlert(g)
      }

      g.staring = false
      switch (g.state) {
        case 'patrol':
          if (g.sees && g.suspicion > 0.3) {
            g.state = 'suspicious'
            g.target = { ...g.lastSeen }
            world.onSuspicious(g)
            break
          }
          if (g.wait > 0) {
            g.wait -= dt
            g.lookTimer += dt
            g.angle = g.lookBase + Math.sin(g.lookTimer * 1.5) * 0.9
            break
          }
          if (!g.path.length) {
            const wp = route[g.routeIndex]
            if (toTile(g.x) === wp.tx && toTile(g.y) === wp.ty) {
              g.routeIndex = (g.routeIndex + 1) % route.length
              g.wait = 1 + Math.random() * 1.5
              g.lookBase = g.angle
              g.lookTimer = 0
            } else {
              g.path = pathTo(map, tileCentre(wp.tx), tileCentre(wp.ty))
              if (!g.path.length) {
                g.routeIndex = (g.routeIndex + 1) % route.length
                g.wait = 1.5
                g.lookBase = g.angle
              }
            }
          }
          follow(dt, map, kind.speeds.patrol)
          break

        case 'suspicious':
          if (g.sees) {
            g.staring = true
            g.target = { ...g.lastSeen }
            g.path = []
            turnTowards(Math.atan2(player.y - g.y, player.x - g.x), dt)
            break
          }
          if (g.target && !g.path.length && !g.atTarget) {
            g.path = pathTo(map, g.target.x, g.target.y)
            g.atTarget = !g.path.length
            if (g.atTarget) {
              g.lookBase = g.angle
              g.lookTimer = 0
            }
          }
          if (g.path.length) {
            follow(dt, map, kind.speeds.suspicious)
            if (!g.path.length) {
              g.atTarget = true
              g.lookBase = g.angle
              g.lookTimer = 0
            }
          } else {
            g.lookTimer += dt
            g.angle = g.lookBase + Math.sin(g.lookTimer * 2.2) * 1.2
            if (g.lookTimer > LOOK_TIME) g.goHome()
          }
          break

        case 'alert':
          g.repath -= dt
          if (g.repath <= 0) {
            g.repath = REPATH_ALERT
            const dest = g.sees ? player : g.lastSeen
            if (dest) g.path = pathTo(map, dest.x, dest.y)
          }
          follow(dt, map, kind.speeds.alert)
          if (g.sees) turnTowards(Math.atan2(player.y - g.y, player.x - g.x), dt)
          if (!g.sees && g.unseen > 1 && !g.path.length) {
            g.state = 'search'
            g.searchTimer = SEARCH_TIME
            g.suspicion = 0.6
            g.wait = 0
          }
          break

        case 'search':
          g.searchTimer -= dt
          if (g.searchTimer <= 0) {
            g.goHome()
            break
          }
          if (g.wait > 0) {
            g.wait -= dt
            g.lookTimer += dt
            g.angle = g.lookBase + Math.sin(g.lookTimer * 2.5) * 1.3
            break
          }
          if (!g.path.length) {
            g.path = randomNearby(map, g.lastSeen ?? g, 5)
            g.wait = 0.8
            g.lookBase = g.angle
            g.lookTimer = 0
          }
          follow(dt, map, kind.speeds.search)
          break

        case 'return': {
          if (g.sees && g.suspicion > 0.3) {
            g.state = 'suspicious'
            g.target = { ...g.lastSeen }
            g.atTarget = false
            break
          }
          if (!g.path.length) {
            const wp = route[g.routeIndex]
            g.path = pathTo(map, tileCentre(wp.tx), tileCentre(wp.ty))
            if (!g.path.length) {
              g.state = 'patrol'
              g.wait = 1
            }
          }
          follow(dt, map, kind.speeds.return)
          if (!g.path.length) g.state = 'patrol'
          break
        }
      }
    },

    investigate(map, x, y) {
      g.state = 'suspicious'
      g.target = { x, y }
      g.path = pathTo(map, x, y)
      g.atTarget = !g.path.length
      g.lookBase = g.angle
      g.lookTimer = 0
    },

    goHome() {
      g.state = 'return'
      g.path = []
      g.target = null
      g.atTarget = false
      g.suspicion = Math.min(g.suspicion, 0.2)
    },

    drawCone(ctx, cam, map) {
      const pts = conePoints(map, g)
      const colour =
        g.state === 'alert' ? palette.get('regime-red')
          : g.state === 'suspicious' || g.state === 'search' ? palette.get('resistance-amber')
            : palette.get('paper')
      const alpha = g.state === 'alert' ? 0.2 : g.state === 'patrol' || g.state === 'return' ? 0.07 : 0.14
      ctx.fillStyle = withAlpha(colour, alpha)
      ctx.beginPath()
      ctx.moveTo(pts[0][0] - cam.x, pts[0][1] - cam.y)
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0] - cam.x, pts[k][1] - cam.y)
      ctx.closePath()
      ctx.fill()
    },

    draw(ctx, cam, time) {
      const x = Math.round(g.x - cam.x)
      const y = Math.round(g.y - cam.y)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(g.angle)
      ctx.fillStyle = palette.get(kind.body)
      ctx.beginPath()
      ctx.ellipse(0, 0, 4.5, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = palette.get(kind.cap)
      ctx.beginPath()
      ctx.arc(0, 0, 3.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = palette.get('regime-red-dark')
      ctx.fillRect(2.5, -2.5, 2.5, 5)
      ctx.restore()

      if (g.state === 'suspicious' || g.state === 'search' || g.state === 'alert') {
        ctx.font = '700 12px "Special Elite", monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = g.state === 'alert' ? palette.get('regime-red') : palette.get('resistance-amber')
        const bob = Math.sin(time * 6) * 1.5
        ctx.fillText(g.state === 'alert' ? '!' : '?', x, y - 11 + bob)
      }
      if (g.state !== 'alert' && g.suspicion > 0.02) {
        ctx.strokeStyle = palette.get('resistance-amber')
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2)
        ctx.stroke()
      }
    },
  }

  function turnTowards(want, dt) {
    const d = angleDiff(g.angle, want)
    const step = TURN_RATE * dt
    g.angle += Math.max(-step, Math.min(step, d))
  }

  function follow(dt, map, speed) {
    if (!g.path.length) return
    const next = g.path[0]
    if (map.isSolid(next.tx, next.ty)) {
      g.path = [] 
      return
    }
    const nx = tileCentre(next.tx)
    const ny = tileCentre(next.ty)
    const dx = nx - g.x
    const dy = ny - g.y
    const d = Math.hypot(dx, dy)
    const step = speed * dt
    if (!g.staring && d > 0.5) turnTowards(Math.atan2(dy, dx), dt)
    if (d <= step) {
      g.x = nx
      g.y = ny
      g.path.shift()
    } else {
      g.x += (dx / d) * step
      g.y += (dy / d) * step
    }
  }

  function pathTo(map, x, y) {
    let { tx, ty } = { tx: toTile(x), ty: toTile(y) }
    if (map.isSolid(tx, ty)) ({ tx, ty } = map.nearestOpen(tx, ty))
    return findPath(map, toTile(g.x), toTile(g.y), tx, ty) ?? []
  }

  function randomNearby(map, around, radius) {
    for (let k = 0; k < 8; k++) {
      const tx = toTile(around.x) + Math.round((Math.random() * 2 - 1) * radius)
      const ty = toTile(around.y) + Math.round((Math.random() * 2 - 1) * radius)
      if (map.isSolid(tx, ty)) continue
      const p = findPath(map, toTile(g.x), toTile(g.y), tx, ty, 1500)
      if (p && p.length) return p
    }
    return []
  }

  g.reset()
  return g
}

export const CATCH_DISTANCE = TILE * 0.75
