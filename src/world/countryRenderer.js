import { TILE } from '../core/display.js'
import { palette } from '../core/palette.js'
import { createRandom } from '../core/random.js'
import { T } from './tiles.js'
import { withAlpha } from './mapRenderer.js'

export function createCountryRenderer(level) {
  const { map } = level
  const layer = document.createElement('canvas')
  layer.width = map.pxW
  layer.height = map.pxH
  const g = layer.getContext('2d')
  const rng = createRandom(level.seed ^ 0xc0de)

  const C = {
    field: palette.get('country-field'),
    field2: palette.get('country-field-2'),
    hedge: palette.get('country-hedge'),
    water: palette.get('country-water'),
    mud: palette.get('country-mud'),
    roof: palette.get('country-roof'),
    tarmac: palette.get('country-tarmac'),
    f950: palette.get('forest-950'),
    f800: palette.get('forest-800'),
    f600: palette.get('forest-600'),
    moss: palette.get('forest-moss'),
    soot: palette.get('soot'),
    c900: palette.get('concrete-900'),
    c700: palette.get('concrete-700'),
    c500: palette.get('concrete-500'),
    c300: palette.get('concrete-300'),
    paper: palette.get('paper'),
    amber: palette.get('resistance-amber'),
    red: palette.get('regime-red'),
    redDark: palette.get('regime-red-dark'),
    brick: palette.get('city-brick'),
    wood: palette.get('base-wood'),
    rust: palette.get('dock-rust'),
  }

  const isRoadish = (t) => t === T.ROAD || t === T.BRIDGE

  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const t = map.get(tx, ty)
      const x = tx * TILE
      const y = ty * TILE
      switch (t) {
        case T.PAVEMENT:
        case T.DOORWAY:
        case T.EXIT:
        case T.PROP:
        case T.BUILDING:
          g.fillStyle =
            (Math.floor(tx / 9) + Math.floor(ty / 7)) % 2 ? C.field : C.field2
          g.fillRect(x, y, TILE, TILE)
          g.fillStyle = C.f950
          g.globalAlpha = 0.35
          g.fillRect(x, y + (tx % 2 ? 4 : 11), TILE, 1)
          g.globalAlpha = 1
          break
        case T.FOREST:
        case T.TREE:
          g.fillStyle = C.f950
          g.fillRect(x, y, TILE, TILE)
          g.fillStyle = C.f800
          for (let k = 0; k < 3; k++)
            g.fillRect(x + rng.int(0, 13), y + rng.int(0, 13), 3, 2)
          break
        case T.ROAD:
          g.fillStyle = C.tarmac
          g.fillRect(x, y, TILE, TILE)
          g.fillStyle = C.c900
          for (let k = 0; k < 3; k++)
            g.fillRect(x + rng.int(0, 15), y + rng.int(0, 15), 1, 1)
          g.fillStyle = C.mud
          if (!isRoadish(map.get(tx, ty - 1))) g.fillRect(x, y, TILE, 2)
          if (!isRoadish(map.get(tx, ty + 1)))
            g.fillRect(x, y + TILE - 2, TILE, 2)
          if (!isRoadish(map.get(tx - 1, ty))) g.fillRect(x, y, 2, TILE)
          if (!isRoadish(map.get(tx + 1, ty)))
            g.fillRect(x + TILE - 2, y, 2, TILE)
          if (rng.chance(0.03)) {
            g.fillStyle = C.water
            g.beginPath()
            g.ellipse(x + 8, y + 8, 5, 3, 0, 0, Math.PI * 2)
            g.fill()
          }
          break
        case T.BRIDGE:
          g.fillStyle = C.c500
          g.fillRect(x, y, TILE, TILE)
          g.fillStyle = C.c700
          g.fillRect(x, y + 7, TILE, 1)
          g.fillStyle = C.c300
          if (!isRoadish(map.get(tx, ty - 1))) g.fillRect(x, y, TILE, 3) 
          if (!isRoadish(map.get(tx, ty + 1)))
            g.fillRect(x, y + TILE - 3, TILE, 3)
          if (!isRoadish(map.get(tx - 1, ty))) g.fillRect(x, y, 3, TILE)
          if (!isRoadish(map.get(tx + 1, ty)))
            g.fillRect(x + TILE - 3, y, 3, TILE)
          break
        case T.WATER:
          g.fillStyle = C.water
          g.fillRect(x, y, TILE, TILE)
          g.fillStyle = C.c700
          g.globalAlpha = 0.35
          g.fillRect(x + rng.int(0, 8), y + rng.int(2, 13), 6, 1)
          g.globalAlpha = 1
          break
        case T.FORD:
          g.fillStyle = C.water
          g.fillRect(x, y, TILE, TILE)
          g.fillStyle = C.c500 
          g.beginPath()
          g.ellipse(
            x + 5 + rng.int(0, 5),
            y + 5 + rng.int(0, 5),
            3,
            2.5,
            0,
            0,
            Math.PI * 2,
          )
          g.fill()
          break
        case T.HEDGE:
          g.fillStyle = C.hedge
          g.fillRect(x, y, TILE, TILE)
          g.fillStyle = C.f600
          for (let k = 0; k < 6; k++)
            g.fillRect(x + rng.int(0, 13), y + rng.int(0, 13), 3, 3)
          break
        default:
          break
      }
    }
  }

  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (map.get(tx, ty) !== T.DOORWAY) continue
      const cx = tx * TILE + 8
      const cy = ty * TILE + 8
      g.fillStyle = C.f950
      g.beginPath()
      g.arc(cx, cy, 9, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = C.f800
      for (let k = 0; k < 7; k++) {
        g.beginPath()
        g.arc(cx + rng.int(-6, 6), cy + rng.int(-6, 6), 3, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = C.moss
      g.globalAlpha = 0.6
      g.fillRect(cx - 3, cy - 5, 2, 2)
      g.fillRect(cx + 3, cy + 1, 2, 2)
      g.globalAlpha = 1
    }
  }

  for (const b of level.buildings) {
    const x = b.x * TILE
    const y = b.y * TILE
    const w = b.w * TILE
    const h = b.h * TILE
    const roof =
      b.kind === 'lodge'
        ? C.wood
        : b.kind === 'hut'
          ? C.c700
          : b.kind === 'barn'
            ? C.rust
            : C.roof
    g.fillStyle = C.soot
    g.fillRect(x + 3, y + 3, w, h)
    g.fillStyle = roof
    g.fillRect(x, y, w, h)
    g.fillStyle = withAlpha('#000000', 0.25)
    g.fillRect(x, y + h / 2, w, h / 2)
    g.fillStyle = C.c300
    g.globalAlpha = 0.35
    g.fillRect(x, y + h / 2 - 1, w, 2)
    g.globalAlpha = 1
    g.fillStyle = withAlpha('#000000', 0.18)
    for (let yy = y + 4; yy < y + h; yy += 5) g.fillRect(x, yy, w, 1)
    if (b.kind === 'farm' || b.kind === 'cottage') {
      g.fillStyle = C.brick // chimney
      g.fillRect(x + w - 14, y + 4, 7, 7)
    }
  }
  for (const wdw of level.windows) {
    g.fillStyle = C.amber
    g.fillRect(wdw.tx * TILE + 5, wdw.ty * TILE + 6, 6, 4)
  }

  {
    const e = level.exitTiles
    g.fillStyle = C.wood
    g.fillRect(e.tx * TILE, e.ty * TILE, 6, e.h * TILE)
    g.fillStyle = C.amber
    g.fillRect(e.tx * TILE + 1, (e.ty + 1) * TILE + 6, 2, 3)
  }

  {
    const bx = level.barrier.tx * TILE
    const by = level.barrier.ty * TILE
    for (let k = 0; k < 6; k++) {
      g.fillStyle = k % 2 ? C.paper : C.red
      g.fillRect(bx - 24 + k * 8, by - 26, 8, 4)
    }
    g.fillStyle = C.c500
    g.fillRect(bx - 28, by - 30, 4, 12)
  }

  if (level.wreck) {
    const wx = level.wreck.x * TILE
    const wy = level.wreck.y * TILE
    const ww = level.wreck.w * TILE
    const wh = level.wreck.h * TILE
    g.save()
    g.translate(wx + ww / 2, wy + wh / 2)
    if (level.wreck.h > level.wreck.w) g.rotate(Math.PI / 2)
    g.fillStyle = C.soot
    g.fillRect(-15, -7, 30, 14)
    g.fillStyle = C.rust
    g.fillRect(-13, -5, 9, 10)
    g.fillRect(4, -4, 8, 3)
    g.fillStyle = C.redDark
    g.fillRect(-2, -6, 3, 12)
    g.restore()
  }

  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (map.get(tx, ty) !== T.TREE) continue
      const cx = tx * TILE + 8 + rng.int(-2, 2)
      const cy = ty * TILE + 8 + rng.int(-2, 2)
      const r = 9 + rng.int(0, 4)
      g.fillStyle = withAlpha('#000000', 0.35)
      g.beginPath()
      g.arc(cx + 3, cy + 3, r, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = rng.chance(0.5) ? C.f800 : C.f600
      g.beginPath()
      g.arc(cx, cy, r, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = C.moss
      g.globalAlpha = 0.35
      g.beginPath()
      g.arc(cx - r * 0.3, cy - r * 0.3, r * 0.45, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
    }
  }

  const DROPS = 300
  const drops = Array.from({ length: DROPS }, () => ({
    x: Math.random() * 1400,
    y: Math.random() * 700,
    len: 10 + Math.random() * 16,
    speed: 700 + Math.random() * 400,
  }))

  return {
    drawBase(ctx, cam) {
      ctx.drawImage(
        layer,
        cam.x,
        cam.y,
        cam.viewW,
        cam.viewH,
        0,
        0,
        cam.viewW,
        cam.viewH,
      )
    },

    updateRain(dt) {
      for (const d of drops) {
        d.y += d.speed * dt
        d.x -= d.speed * 0.28 * dt
        if (d.y > 660) {
          d.y = -d.len
          d.x = Math.random() * 1500
        }
      }
    },

    drawRain(ctx, flash) {
      ctx.save()
      ctx.strokeStyle = withAlpha(C.c300, flash ? 0.6 : 0.28)
      ctx.lineWidth = 1
      ctx.beginPath()
      for (const d of drops) {
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.len * 0.28, d.y + d.len)
      }
      ctx.stroke()
      ctx.restore()
    },
  }
}
