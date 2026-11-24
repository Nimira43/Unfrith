import { createRandom } from '../core/random.js'
import { createTilemap } from './tilemap.js'
import { T } from './tiles.js'

const W = 96
const H = 50
const CELL = 6
const NCX = 10
const NCY = 8

export const BASE = { x: 64, y: 12, w: 28, h: 25 }

export function generateTunnels(seed) {
  const rng = createRandom(seed)
  const map = createTilemap(W, H)
  for (let i = 0; i < W * H; i++) map.tiles[i] = T.CITY_WALL

  const ox = (cx) => 2 + cx * CELL
  const oy = (cy) => 2 + cy * CELL
  const carve = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) map.set(x, y, T.ROAD)
  }
  const cellId = (cx, cy) => cy * NCX + cx

  const entryRow = rng.int(2, 5)
  const doorRow = rng.pick([4, 5])
  const startCell = cellId(0, entryRow)
  const doorCell = cellId(NCX - 1, doorRow)

  const links = new Set()
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const neighbours = (id) => {
    const cx = id % NCX
    const cy = Math.floor(id / NCX)
    const out = []
    if (cx > 0) out.push(id - 1)
    if (cx < NCX - 1) out.push(id + 1)
    if (cy > 0) out.push(id - NCX)
    if (cy < NCY - 1) out.push(id + NCX)
    return out
  }

  const seen = new Set([startCell])
  const stack = [startCell]
  while (stack.length) {
    const cur = stack[stack.length - 1]
    const options = neighbours(cur).filter((n) => !seen.has(n))
    if (!options.length) {
      stack.pop()
      continue
    }
    const n = rng.pick(options)
    links.add(key(cur, n))
    seen.add(n)
    stack.push(n)
  }

  for (let id = 0; id < NCX * NCY; id++) {
    for (const n of neighbours(id))
      if (n > id && rng.chance(0.12)) links.add(key(id, n))
  }

  for (let cy = 0; cy < NCY; cy++) {
    for (let cx = 0; cx < NCX; cx++) {
      carve(ox(cx), oy(cy), 3, 3)
      const id = cellId(cx, cy)
      if (cx < NCX - 1 && links.has(key(id, id + 1)))
        carve(ox(cx) + 3, oy(cy), 3, 3)
      if (cy < NCY - 1 && links.has(key(id, id + NCX)))
        carve(ox(cx), oy(cy) + 3, 3, 3)
    }
  }

  carve(1, oy(entryRow), 1, 3)
  carve(ox(NCX - 1) + 3, oy(doorRow), BASE.x - (ox(NCX - 1) + 3), 3)

  carve(BASE.x, BASE.y, BASE.w, BASE.h)
  const exitRows = [23, 24, 25]
  for (const y of exitRows) map.set(BASE.x + BASE.w, y, T.EXIT)

  const props = []
  const prop = (type, x, y, w, h, solid = true) => {
    props.push({ type, x, y, w, h })
    if (solid)
      for (let yy = y; yy < y + h; yy++)
        for (let xx = x; xx < x + w; xx++) map.set(xx, yy, T.PROP)
  }
  prop('board', 74, 12, 6, 1)
  prop('desk', 66, 14, 3, 2)
  prop('medtable', 86, 18, 3, 2)
  prop('table', 70, 19, 4, 2)
  prop('armchair', 75, 24, 2, 2)
  prop('rug', 72, 22, 8, 6, false)
  prop('bunk', 75, 32, 2, 4)
  prop('bunk', 79, 32, 2, 4)
  prop('generator', 87, 32, 4, 4)
  prop('stores', 66, 36, 6, 1)
  props.sort((a, b) => (a.type === 'rug' ? -1 : b.type === 'rug' ? 1 : 0))

  const decor = {
    chalkWall: { x: 82, y: BASE.y - 1, w: 9 },
    arch: { x: BASE.x - 1, y: 19, h: 4 },
    deadDrop: { tx: BASE.x - 1, ty: 30 },
    grate: { tx: 0, ty: oy(entryRow), h: 3 },
  }

  const isWall = (x, y) => map.get(x, y) === T.CITY_WALL
  const isFloor = (x, y) => map.get(x, y) === T.ROAD
  const spots = []
  for (let y = 2; y < H - 2; y++) {
    for (let x = 3; x < BASE.x - 4; x++) {
      if (!isWall(x, y)) continue
      if (
        isFloor(x, y - 1) &&
        isWall(x, y + 1) &&
        isWall(x - 1, y) &&
        isWall(x + 1, y)
      )
        spots.push([x, y])
      else if (
        isFloor(x, y + 1) &&
        isWall(x, y - 1) &&
        isWall(x - 1, y) &&
        isWall(x + 1, y)
      )
        spots.push([x, y])
      else if (
        isFloor(x - 1, y) &&
        isWall(x + 1, y) &&
        isWall(x, y - 1) &&
        isWall(x, y + 1)
      )
        spots.push([x, y])
      else if (
        isFloor(x + 1, y) &&
        isWall(x - 1, y) &&
        isWall(x, y - 1) &&
        isWall(x, y + 1)
      )
        spots.push([x, y])
    }
  }
  rng.shuffle(spots)
  const alcoves = []
  for (const [x, y] of spots) {
    if (alcoves.length >= 14) break
    if (alcoves.some((a) => Math.abs(a.tx - x) + Math.abs(a.ty - y) < 6))
      continue
    map.set(x, y, T.DOORWAY)
    alcoves.push({ tx: x, ty: y })
  }

  const route = solveCells(startCell, doorCell, links, neighbours, key)
  const centre = (id) => ({
    tx: ox(id % NCX) + 1,
    ty: oy(Math.floor(id / NCX)) + 1,
  })
  const pick = (f) =>
    route[
      Math.min(route.length - 1, Math.max(0, Math.floor(route.length * f)))
    ]
  const patrolCells = [pick(0.45), pick(0.7), pick(0.95)]
  const branch = neighbours(pick(0.6)).find(
    (n) => links.has(key(n, pick(0.6))) && !route.includes(n),
  )
  if (branch !== undefined) patrolCells.splice(1, 0, branch)
  const guards = [{ route: patrolCells.map(centre) }]

  const rubble = []
  for (let r = 0; r < 4; r++) {
    const cx = rng.int(1, NCX - 2)
    const cy = rng.int(0, NCY - 1)
    rubble.push({
      tx: ox(cx) + rng.int(0, 2),
      ty: oy(cy) + rng.int(0, 2),
      stones: 3,
    })
  }

  const lamps = []
  for (let k = 0; k < 4; k++) {
    const c = rng.pick(route)
    lamps.push({ ...centre(c), radius: 90, colour: 'sodium', strength: 0.6 })
  }
  for (const [x, y] of [
    [70, 16],
    [84, 15],
    [70, 30],
    [84, 29],
    [77, 21],
  ]) {
    lamps.push({
      tx: x,
      ty: y,
      radius: 180,
      colour: 'resistance-amber',
      strength: 1,
      base: true,
    })
  }

  const homes = {
    theo: { x: 67.5, y: 17, idle: 'still' },
    ruth: { x: 83, y: 13.5, idle: 'pace', to: { x: 89, y: 13.5 } },
    irfan: { x: 85, y: 30, idle: 'wander', radius: 2 },
    angelica: { x: 85, y: 18.5, idle: 'still' },
    nathan: { x: 89.5, y: 22, idle: 'pace', to: { x: 89.5, y: 27 } },
    divine: { x: 77.5, y: 24.5, idle: 'still' },
    doc: { x: 66, y: 21, idle: 'wander', radius: 1.5 },
    paula: { x: 69, y: 33, idle: 'wander', radius: 2 },
  }

  return {
    seed,
    map,
    start: { tx: 2, ty: oy(entryRow) + 1 },
    guards,
    rubble,
    lamps,
    props,
    decor,
    homes,
    boardSpot: { tx: 77, ty: 14 },
    exitTiles: { tx: BASE.x + BASE.w, ty: exitRows[0], h: exitRows.length },
  }
}

function solveCells(start, goal, links, neighbours, key) {
  const prev = new Map([[start, null]])
  const q = [start]
  while (q.length) {
    const cur = q.shift()
    if (cur === goal) break
    for (const n of neighbours(cur)) {
      if (!prev.has(n) && links.has(key(cur, n))) {
        prev.set(n, cur)
        q.push(n)
      }
    }
  }
  const path = []
  for (let c = goal; c !== null && c !== undefined; c = prev.get(c))
    path.push(c)
  return path.reverse()
}
