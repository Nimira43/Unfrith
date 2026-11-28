import { TILE } from '../core/display.js'
import { palette, fonts } from '../core/palette.js'
import { createRandom } from '../core/random.js'
import { T } from './tiles.js'

export function createMapRenderer(level) {
  const { map } = level
  const layer = document.createElement('canvas')
  layer.width = map.pxW
  layer.height = map.pxH
  const g = layer.getContext('2d')
  g.imageSmoothingEnabled = false
  const rng = createRandom(level.seed ^ 0x5eed)

  const C = {
    road: palette.get('city-slate'),
    puddle: palette.get('city-puddle'),
    pave: palette.get('city-pavement'),
    kerb: palette.get('city-kerb'),
    brick: palette.get('city-brick'),
    soot: palette.get('soot'),
    c900: palette.get('concrete-900'),
    c700: palette.get('concrete-700'),
    c500: palette.get('concrete-500'),
    c300: palette.get('concrete-300'),
    red: palette.get('regime-red'),
    redDark: palette.get('regime-red-dark'),
    amber: palette.get('resistance-amber'),
    paper: palette.get('paper'),
    sodium: palette.get('sodium'),
    glass: palette.get('city-glass'),
    roofs: [
      palette.get('city-roof'),
      palette.get('city-roof-2'),
      palette.get('city-roof-3'),
    ],
  }

  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const t = map.get(tx, ty)
      const x = tx * TILE
      const y = ty * TILE
      switch (t) {
        case T.ROAD:
        case T.GATE:
        case T.EXIT:
          g.fillStyle = C.road
          g.fillRect(x, y, TILE, TILE)
          speckle(x, y, C.c900, 3)
          if (rng.chance(0.012)) {
            g.fillStyle = C.puddle
            g.globalAlpha = 0.7
            g.beginPath()
            g.ellipse(
              x + 8,
              y + 8,
              4 + rng.int(0, 6),
              3 + rng.int(0, 3),
              0,
              0,
              Math.PI * 2,
            )
            g.fill()
            g.globalAlpha = 1
          }
          if (t === T.GATE) {
            g.fillStyle = C.c900
            g.fillRect(x, y + 7, TILE, 2)
            g.fillRect(x + 7, y, 2, TILE)
          }
          break
        case T.PAVEMENT:
          g.fillStyle = C.pave
          g.fillRect(x, y, TILE, TILE)
          g.fillStyle = C.c900
          g.fillRect(x, y + TILE - 1, TILE, 1) 
          g.fillRect(x + TILE - 1, y, 1, TILE)
          speckle(x, y, C.kerb, 2)
          break
        case T.CITY_WALL:
          drawBrick(x, y)
          break
        case T.BARRICADE:
          drawBarricade(x, y)
          break
        case T.DOORWAY:
          g.fillStyle = C.pave
          g.fillRect(x, y, TILE, TILE) 
          break
        default:
          break 
      }
    }
  }

  const isRoof = (tx, ty) => map.get(tx, ty) === T.BUILDING

  for (const r of level.roofs) {
    g.fillStyle = C.roofs[r.shade]
    for (const rc of r.rects)
      g.fillRect(rc.x * TILE, rc.y * TILE, rc.w * TILE, rc.h * TILE)

    const b = r.bounds
    for (let ty = b.y; ty < b.y + b.h; ty++) {
      for (let tx = b.x; tx < b.x + b.w; tx++) {
        if (!isRoof(tx, ty)) continue
        const x = tx * TILE
        const y = ty * TILE
        g.fillStyle = C.c500
        if (!isRoof(tx, ty - 1)) g.fillRect(x, y, TILE, 2)
        if (!isRoof(tx - 1, ty)) g.fillRect(x, y, 2, TILE)
        g.fillStyle = C.soot
        if (!isRoof(tx, ty + 1)) g.fillRect(x, y + TILE - 3, TILE, 3)
        if (!isRoof(tx + 1, ty)) g.fillRect(x + TILE - 3, y, 3, TILE)
      }
    }

    const posterBox = r.poster ? posterRect(r.main) : null
    for (const rc of r.rects) {
      const x = rc.x * TILE
      const y = rc.y * TILE
      const w = rc.w * TILE
      const h = rc.h * TILE
      const items = Math.floor((rc.w * rc.h) / 16)
      for (let k = 0; k < items; k++) {
        const ix = x + 8 + rng.int(0, Math.max(0, w - 32))
        const iy = y + 8 + rng.int(0, Math.max(0, h - 32))
        if (
          posterBox &&
          ix + 20 > posterBox.x &&
          ix < posterBox.x + posterBox.w &&
          iy + 14 > posterBox.y &&
          iy < posterBox.y + posterBox.h
        )
          continue
        drawClutter(ix, iy, rng.int(0, 2))
      }
    }

    if (r.yard) {
      const yx = r.yard.x * TILE
      const yy = r.yard.y * TILE
      for (let k = 0; k < 3; k++) {
        const bx2 = yx + 4 + rng.int(0, r.yard.w * TILE - 16)
        const by2 = yy + 4 + rng.int(0, r.yard.h * TILE - 16)
        if (rng.chance(0.5)) {
          g.fillStyle = C.c700
          g.beginPath()
          g.arc(bx2 + 5, by2 + 5, 5, 0, Math.PI * 2)
          g.fill()
          g.fillStyle = C.c900
          g.beginPath()
          g.arc(bx2 + 5, by2 + 5, 3, 0, Math.PI * 2)
          g.fill()
        } else {
          g.fillStyle = C.c700 
          g.fillRect(bx2, by2, 11, 11)
          g.fillStyle = C.c900
          g.fillRect(bx2, by2 + 5, 11, 1)
          g.fillRect(bx2 + 5, by2, 1, 11)
        }
      }
    }

    if (posterBox) drawPoster(posterBox, r.poster)
  }

  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (map.get(tx, ty) !== T.DOORWAY) continue
      const x = tx * TILE
      const y = ty * TILE
      const open =
        map.get(tx, ty - 1) === T.PAVEMENT
          ? 'n'
          : map.get(tx, ty + 1) === T.PAVEMENT
            ? 's'
            : map.get(tx - 1, ty) === T.PAVEMENT
              ? 'w'
              : 'e'
      g.fillStyle = C.soot
      g.fillRect(x, y, TILE, TILE)
      g.fillStyle = C.c500
      if (open !== 'n') g.fillRect(x, y, TILE, 2)
      if (open !== 's') g.fillRect(x, y + TILE - 2, TILE, 2)
      if (open !== 'w') g.fillRect(x, y, 2, TILE)
      if (open !== 'e') g.fillRect(x + TILE - 2, y, 2, TILE)
      g.fillStyle = C.c300
      g.globalAlpha = 0.5
      if (open === 'n') g.fillRect(x + 3, y, TILE - 6, 2)
      if (open === 's') g.fillRect(x + 3, y + TILE - 2, TILE - 6, 2)
      if (open === 'w') g.fillRect(x, y + 3, 2, TILE - 6)
      if (open === 'e') g.fillRect(x + TILE - 2, y + 3, 2, TILE - 6)
      g.globalAlpha = 1
    }
  }

  for (const l of level.lamps) {
    g.fillStyle = C.c300
    g.fillRect(l.tx * TILE + 6, l.ty * TILE + 6, 4, 4)
  }
  for (const s of level.speakers) {
    const x = s.tx * TILE
    const y = s.ty * TILE
    g.fillStyle = C.c700
    g.fillRect(x + 6, y + 6, 4, 4)
    g.fillStyle = C.redDark
    g.fillRect(x + 2, y + 3, 4, 3)
    g.fillRect(x + 10, y + 10, 4, 3)
  }

  function drawClutter(ix, iy, kind) {
    if (kind === 0) {
      g.fillStyle = C.c700
      g.fillRect(ix, iy, 10, 10)
      g.fillStyle = C.c900
      g.fillRect(ix + 2, iy + 2, 6, 6)
    } else if (kind === 1) {
      g.fillStyle = C.glass
      g.fillRect(ix, iy, 18, 8)
      g.fillStyle = C.c700
      g.fillRect(ix + 8, iy, 2, 8)
    } else {
      g.fillStyle = C.c500
      g.fillRect(ix, iy, 8, 12)
      g.fillStyle = C.soot
      g.fillRect(ix + 2, iy + 2, 4, 4)
    }
  }

  function posterRect(rc) {
    const x = rc.x * TILE + 18
    const y = rc.y * TILE + 18
    const w = rc.w * TILE - 36
    const h = rc.h * TILE - 36
    const ph = Math.min(h, w * 0.62)
    const pw = Math.min(w, ph * 1.9)
    return {
      x: Math.round(x + (w - pw) / 2),
      y: Math.round(y + (h - ph) / 2),
      w: Math.round(pw),
      h: Math.round(ph),
    }
  }

  function drawPoster(box, poster) {
    const { x, y, w, h } = box
    const red = poster.style === 'red'
    const bg = red ? C.red : C.paper
    const ink = red ? C.paper : C.soot

    g.save()
    g.globalAlpha = 0.86 
    g.fillStyle = C.soot
    g.fillRect(x - 2, y - 2, w + 4, h + 4)
    g.fillStyle = bg
    g.fillRect(x, y, w, h)

    let top = y
    if (poster.header) {
      const hh = Math.max(10, Math.round(h * 0.17))
      g.fillStyle = red ? C.soot : C.red
      g.fillRect(x, y, w, hh)
      g.fillStyle = C.paper
      g.font = `${Math.floor(hh * 0.62)}px ${fonts.mono}`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      fitText(poster.header, x + w / 2, y + hh / 2 + 1, w - 8)
      top = y + hh
    }

    let textX = x
    let textW = w
    if (poster.emblem) {
      const size = Math.min(h - (top - y) - 8, w * 0.36)
      const ex = x + 6 + size / 2
      const ey = top + (y + h - top) / 2
      drawEmblem(poster.emblem, ex, ey, size, red)
      textX = x + size + 10
      textW = w - size - 14
    }

    const lines = poster.lines
    const areaH = y + h - top
    const longest = Math.max(...lines.map((l) => l.length))
    const size = Math.floor(
      Math.min(
        (areaH * 0.78) / lines.length,
        (textW * 0.92) / (longest * 0.62),
      ),
    )
    g.fillStyle = ink
    g.font = `700 ${size}px ${fonts.title}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const lineH = size * 1.02
    const firstY = top + areaH / 2 - ((lines.length - 1) * lineH) / 2
    lines.forEach((l, k) =>
      g.fillText(l, textX + textW / 2, firstY + k * lineH + size * 0.04),
    )

    g.fillStyle = C.roofs[0]
    g.beginPath()
    g.moveTo(x + w + 2, y - 2)
    g.lineTo(x + w - 7, y - 2)
    g.lineTo(x + w + 2, y + 7)
    g.fill()
    g.globalAlpha = 0.12
    g.fillStyle = C.soot
    for (let k = 0; k < 5; k++)
      g.fillRect(
        x + rng.int(4, w - 6),
        y + rng.int(0, h / 3),
        2,
        rng.int(h / 3, h),
      )
    g.restore()
  }

  function fitText(text, cx, cy, maxW) {
    const w = g.measureText(text).width
    if (w > maxW) {
      g.save()
      g.translate(cx, cy)
      g.scale(maxW / w, 1)
      g.fillText(text, 0, 0)
      g.restore()
    } else {
      g.fillText(text, cx, cy)
    }
  }

  function drawEmblem(kind, cx, cy, size, onRed) {
    const r = size / 2
    const dark = onRed ? C.soot : C.soot
    const light = onRed ? C.paper : C.red
    g.save()
    if (kind === 'father') {
      g.strokeStyle = light
      g.lineWidth = Math.max(1, size * 0.04)
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2
        g.beginPath()
        g.moveTo(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55)
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        g.stroke()
      }
      g.fillStyle = dark
      g.beginPath()
      g.arc(cx, cy - r * 0.18, r * 0.3, 0, Math.PI * 2) 
      g.fill()
      g.beginPath()
      g.ellipse(cx, cy + r * 0.62, r * 0.55, r * 0.38, 0, Math.PI, 0) 
      g.fill()
    } else if (kind === 'eye') {
      g.fillStyle = light
      g.beginPath()
      g.moveTo(cx - r, cy)
      g.quadraticCurveTo(cx, cy - r * 0.95, cx + r, cy)
      g.quadraticCurveTo(cx, cy + r * 0.95, cx - r, cy)
      g.fill()
      g.fillStyle = dark
      g.beginPath()
      g.arc(cx, cy, r * 0.32, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = light
      g.beginPath()
      g.arc(cx - r * 0.1, cy - r * 0.1, r * 0.09, 0, Math.PI * 2)
      g.fill()
    } else if (kind === 'shield') {
      g.fillStyle = dark
      g.beginPath()
      g.moveTo(cx - r * 0.75, cy - r * 0.85)
      g.lineTo(cx + r * 0.75, cy - r * 0.85)
      g.lineTo(cx + r * 0.75, cy)
      g.quadraticCurveTo(cx + r * 0.7, cy + r * 0.7, cx, cy + r)
      g.quadraticCurveTo(cx - r * 0.7, cy + r * 0.7, cx - r * 0.75, cy)
      g.closePath()
      g.fill()
      g.fillStyle = light
      g.font = `700 ${Math.floor(r * 0.6)}px ${fonts.title}`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('CAP', cx, cy - r * 0.05)
    }
    g.restore()
  }

  function speckle(x, y, colour, n) {
    g.fillStyle = colour
    for (let k = 0; k < n; k++)
      g.fillRect(x + rng.int(0, 15), y + rng.int(0, 15), 1, 1)
  }

  function drawBrick(x, y) {
    g.fillStyle = C.brick
    g.fillRect(x, y, TILE, TILE)
    g.fillStyle = C.soot
    for (let row = 0; row < 4; row++) {
      g.fillRect(x, y + row * 4 + 3, TILE, 1)
      const off = row % 2 ? 0 : 4
      g.fillRect(x + off, y + row * 4, 1, 3)
      g.fillRect(x + off + 8, y + row * 4, 1, 3)
    }
  }

  function drawBarricade(x, y) {
    g.fillStyle = C.c500
    g.fillRect(x, y, TILE, TILE)
    g.save()
    g.beginPath()
    g.rect(x + 1, y + 1, TILE - 2, TILE - 2)
    g.clip()
    g.fillStyle = C.redDark
    for (let s = -16; s < 16; s += 6) {
      g.beginPath()
      g.moveTo(x + s, y + TILE)
      g.lineTo(x + s + 3, y + TILE)
      g.lineTo(x + s + 3 + TILE, y)
      g.lineTo(x + s + TILE, y)
      g.fill()
    }
    g.restore()
    g.fillStyle = C.soot
    g.fillRect(x, y + TILE - 2, TILE, 2)
  }

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

    drawDynamic(ctx, cam, time) {
      for (const gate of map.gates) {
        const flash = gate.warning && Math.floor(time * 8) % 2 === 0
        if (!gate.closed && !gate.warning) continue
        for (const i of gate.tiles) {
          const tx = i % map.w
          const ty = (i - tx) / map.w
          const x = tx * TILE - cam.x
          const y = ty * TILE - cam.y
          if (x < -TILE || y < -TILE || x > cam.viewW || y > cam.viewH) continue
          if (gate.closed) {
            ctx.fillStyle = C.c700
            ctx.fillRect(x, y, TILE, TILE)
            ctx.fillStyle = C.c500
            for (let s = 1; s < TILE; s += 4) ctx.fillRect(x, y + s, TILE, 2)
            ctx.fillStyle = C.soot
            ctx.fillRect(x, y + TILE - 2, TILE, 2)
            if (flash) {
              ctx.strokeStyle = C.red
              ctx.lineWidth = 2
              ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2)
            }
          } else if (flash) {
            ctx.globalAlpha = 0.45
            ctx.fillStyle = C.red
            ctx.fillRect(x, y, TILE, TILE)
            ctx.globalAlpha = 1
          }
        }
      }

      const ex = level.exitTiles.tx * TILE - cam.x
      const ey = level.exitTiles.ty * TILE - cam.y
      const eh = level.exitTiles.h * TILE
      if (ex > -200 && ex < cam.viewW + 200) {
        const glow = ctx.createRadialGradient(
          ex + 16,
          ey + eh / 2,
          4,
          ex + 16,
          ey + eh / 2,
          90,
        )
        glow.addColorStop(0, withAlpha(C.amber, 0.5 + Math.sin(time * 2) * 0.1))
        glow.addColorStop(1, withAlpha(C.amber, 0))
        ctx.fillStyle = glow
        ctx.fillRect(ex - 90, ey - 90, 200, eh + 180)
      }
    },

    drawLamps(ctx, cam) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const l of level.lamps) {
        const x = l.tx * TILE + 8 - cam.x
        const y = l.ty * TILE + 8 - cam.y
        if (x < -60 || y < -60 || x > cam.viewW + 60 || y > cam.viewH + 60)
          continue
        const glow = ctx.createRadialGradient(x, y, 2, x, y, 52)
        glow.addColorStop(0, withAlpha(C.sodium, 0.28))
        glow.addColorStop(1, withAlpha(C.sodium, 0))
        ctx.fillStyle = glow
        ctx.fillRect(x - 52, y - 52, 104, 104)
      }
      ctx.restore()
    },
  }
}

export function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
