import { TILE } from '../core/display.js'
import { palette, fonts } from '../core/palette.js'
import { createRandom } from '../core/random.js'
import { T } from './tiles.js'
import { BASE } from './tunnelGen.js'

export function createTunnelRenderer(level) {
  const { map } = level
  const layer = document.createElement('canvas')
  layer.width = map.pxW
  layer.height = map.pxH
  const g = layer.getContext('2d')
  const rng = createRandom(level.seed ^ 0x7a11)

  const C = {
    brick: palette.get('tunnel-brick'),
    damp: palette.get('tunnel-damp'),
    floor: palette.get('tunnel-floor'),
    water: palette.get('tunnel-water'),
    soot: palette.get('soot'),
    c900: palette.get('concrete-900'),
    c700: palette.get('concrete-700'),
    c500: palette.get('concrete-500'),
    c300: palette.get('concrete-300'),
    paper: palette.get('paper'),
    paperDim: palette.get('paper-dim'),
    amber: palette.get('resistance-amber'),
    red: palette.get('regime-red'),
    baseFloor: palette.get('base-floor'),
    wood: palette.get('base-wood'),
    rug: palette.get('base-rug'),
    forest: palette.get('forest-600'),
  }

  const inBase = (tx, ty) => tx >= BASE.x && tx < BASE.x + BASE.w && ty >= BASE.y && ty < BASE.y + BASE.h
  const floorish = (t) => t === T.ROAD || t === T.PROP || t === T.EXIT || t === T.DOORWAY

  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const t = map.get(tx, ty)
      const x = tx * TILE
      const y = ty * TILE
      if (t === T.CITY_WALL) {
        const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => floorish(map.get(tx + ox, ty + oy)))
        if (faces) drawBrick(x, y)
        else {
          g.fillStyle = C.soot
          g.fillRect(x, y, TILE, TILE)
        }
      } else if (inBase(tx, ty) || t === T.PROP) {
        g.fillStyle = C.baseFloor
        g.fillRect(x, y, TILE, TILE)
        g.fillStyle = C.c900
        g.fillRect(x, y + 7, TILE, 1)
        g.fillRect(x, y + 15, TILE, 1)
        g.fillRect(x + ((tx * 7 + ty * 3) % 16), y, 1, 7)
      } else if (t === T.ROAD || t === T.EXIT) {
        g.fillStyle = C.floor
        g.fillRect(x, y, TILE, TILE)
        g.fillStyle = C.damp
        for (let k = 0; k < 4; k++) g.fillRect(x + rng.int(0, 15), y + rng.int(0, 15), 2, 1)
        if (rng.chance(0.04)) {
          g.fillStyle = C.water
          g.beginPath()
          g.ellipse(x + 8, y + 8, 5 + rng.int(0, 6), 3 + rng.int(0, 3), 0, 0, Math.PI * 2)
          g.fill()
        }
      }
    }
  }

  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (map.get(tx, ty) !== T.DOORWAY) continue
      const x = tx * TILE
      const y = ty * TILE
      g.fillStyle = C.soot
      g.fillRect(x, y, TILE, TILE)
      g.fillStyle = C.c700
      const open =
        floorish(map.get(tx, ty - 1)) ? 'n' : floorish(map.get(tx, ty + 1)) ? 's' : floorish(map.get(tx - 1, ty)) ? 'w' : 'e'
      if (open !== 'n') g.fillRect(x, y, TILE, 2)
      if (open !== 's') g.fillRect(x, y + TILE - 2, TILE, 2)
      if (open !== 'w') g.fillRect(x, y, 2, TILE)
      if (open !== 'e') g.fillRect(x + TILE - 2, y, 2, TILE)
    }
  }

  const { chalkWall, arch, deadDrop, grate } = level.decor

  g.save()
  g.fillStyle = C.paperDim
  g.globalAlpha = 0.75
  g.font = `9px ${fonts.mono}`
  const sums = ['17÷3=?', 'Σ n', 'x+y', '4:10', '√2', '½×6', '∴']
  for (let k = 0; k < chalkWall.w; k++) {
    g.fillText(sums[k % sums.length], (chalkWall.x + k) * TILE + 1, chalkWall.y * TILE + 11)
  }
  g.restore()
  
  {
    const x = arch.x * TILE
    const y = arch.y * TILE
    const h = arch.h * TILE
    g.fillStyle = C.c500
    g.fillRect(x + 2, y, 12, h)
    g.fillStyle = C.c300
    for (let k = 0; k < arch.h * 2; k++) g.fillRect(x + 3, y + k * 8 + 1, 10, 6)
    g.fillStyle = C.soot
    g.fillRect(x + 6, y + 6, 4, h - 12)
  }

  {
    const x = deadDrop.tx * TILE
    const y = deadDrop.ty * TILE
    g.fillStyle = C.c500
    g.fillRect(x + 9, y + 5, 7, 5)
    g.fillStyle = C.soot
    g.fillRect(x + 9, y + 10, 7, 1)
  }

  {
    const x = grate.tx * TILE
    const y = grate.ty * TILE
    g.fillStyle = C.c700
    g.fillRect(x + 4, y, 8, grate.h * TILE)
    g.fillStyle = C.soot
    for (let k = 0; k < grate.h * 4; k++) g.fillRect(x + 4, y + k * 4 + 1, 8, 2)
  }

  {
    const e = level.exitTiles
    const x = e.tx * TILE
    const y = e.ty * TILE
    g.fillStyle = C.wood
    g.fillRect(x, y, TILE, e.h * TILE)
    g.fillStyle = C.soot
    g.fillRect(x, y, TILE, 2)
    g.fillRect(x, y + e.h * TILE - 2, TILE, 2)
    g.fillRect(x + 7, y + 2, 1, e.h * TILE - 4)
    g.fillStyle = C.amber
    g.fillRect(x + 3, y + (e.h * TILE) / 2, 2, 3)
  }

  for (const p of level.props) drawProp(p)

  function drawProp(p) {
    const x = p.x * TILE
    const y = p.y * TILE
    const w = p.w * TILE
    const h = p.h * TILE
    switch (p.type) {
      case 'board': {
        g.fillStyle = C.wood
        g.fillRect(x, y, w, h)
        g.fillStyle = '#8a6a44' 
        g.fillRect(x + 2, y + 2, w - 4, h - 4)
        const cards = 7
        for (let k = 0; k < cards; k++) {
          g.fillStyle = k % 3 === 0 ? C.red : C.paper
          g.fillRect(x + 6 + k * 12, y + 4 + (k % 2) * 3, 8, 6)
        }
        g.strokeStyle = C.red
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(x + 10, y + 7)
        g.lineTo(x + 46, y + 10)
        g.lineTo(x + 82, y + 7)
        g.stroke()
        break
      }
      case 'desk':
      case 'table':
      case 'medtable': {
        g.fillStyle = p.type === 'medtable' ? C.c500 : C.wood
        g.fillRect(x + 1, y + 1, w - 2, h - 2)
        g.fillStyle = C.soot
        g.fillRect(x + 1, y + h - 3, w - 2, 2)
        if (p.type === 'desk') {
          g.fillStyle = C.c700 // typewriter
          g.fillRect(x + 6, y + 6, 14, 9)
          g.fillStyle = C.paper
          g.fillRect(x + 9, y + 3, 8, 5)
          g.fillRect(x + 28, y + 8, 9, 12)
        } else if (p.type === 'medtable') {
          g.fillStyle = C.paper
          g.fillRect(x + 4, y + 5, 10, 8)
          g.fillStyle = C.forest
          g.fillRect(x + 20, y + 6, 4, 8)
          g.fillRect(x + 27, y + 9, 4, 5)
        } else {
          g.fillStyle = C.paper
          g.fillRect(x + 10, y + 8, 12, 9)
          g.fillStyle = C.c300
          g.fillRect(x + 36, y + 10, 6, 6)
        }
        break
      }
      case 'armchair':
        g.fillStyle = '#5b2f3a'
        g.fillRect(x + 2, y + 2, w - 4, h - 4)
        g.fillStyle = '#41212a'
        g.fillRect(x + 2, y + 2, w - 4, 6)
        g.fillRect(x + 2, y + 2, 5, h - 4)
        g.fillRect(x + w - 7, y + 2, 5, h - 4)
        break
      case 'rug':
        g.fillStyle = C.rug
        g.fillRect(x + 4, y + 4, w - 8, h - 8)
        g.strokeStyle = C.amber
        g.globalAlpha = 0.35
        g.strokeRect(x + 10, y + 10, w - 20, h - 20)
        g.globalAlpha = 1
        break
      case 'bunk':
        g.fillStyle = C.c700
        g.fillRect(x + 1, y + 1, w - 2, h - 2)
        g.fillStyle = C.c500
        g.fillRect(x + 3, y + 3, w - 6, h - 6)
        g.fillStyle = C.paperDim
        g.fillRect(x + 4, y + 4, w - 8, 8)
        break
      case 'generator':
        g.fillStyle = C.c700
        g.fillRect(x + 2, y + 2, w - 4, h - 4)
        g.fillStyle = C.c500
        for (let k = 0; k < 5; k++) g.fillRect(x + 6, y + 8 + k * 9, w - 12, 3)
        g.fillStyle = C.amber
        g.fillRect(x + w - 12, y + 6, 4, 4)
        g.strokeStyle = C.soot 
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(x, y + 20)
        g.quadraticCurveTo(x - 40, y - 10, x - 90, y - 40)
        g.stroke()
        break
      case 'stores':
        g.fillStyle = C.wood
        g.fillRect(x, y, w, h)
        for (let k = 0; k < p.w * 3; k++) {
          g.fillStyle = k % 4 === 0 ? C.red : C.c300 
          g.fillRect(x + 2 + k * 5, y + 4, 4, 7)
        }
        break
      default:
        break
    }
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
    if (rng.chance(0.15)) {
      g.fillStyle = C.water 
      g.globalAlpha = 0.5
      g.fillRect(x + rng.int(2, 12), y, 2, TILE)
      g.globalAlpha = 1
    }
  }

  return {
    drawBase(ctx, cam) {
      ctx.drawImage(layer, cam.x, cam.y, cam.viewW, cam.viewH, 0, 0, cam.viewW, cam.viewH)
    },
  }
}
