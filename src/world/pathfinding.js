export function findPath(map, sx, sy, gx, gy, maxNodes = 6000) {
  if (map.isSolid(gx, gy)) return null
  const w = map.w
  const start = sy * w + sx
  const goal = gy * w + gx
  if (start === goal) return []

  const g = new Map([[start, 0]])
  const came = new Map()
  const open = new Heap()
  open.push(start, h(sx, sy))
  const closed = new Set()
  let expanded = 0

  function h(x, y) {
    return Math.abs(x - gx) + Math.abs(y - gy)
  }

  while (open.size) {
    const cur = open.pop()
    if (cur === goal) break
    if (closed.has(cur)) continue
    closed.add(cur)
    if (++expanded > maxNodes) return null

    const cx = cur % w
    const cy = (cur - cx) / w
    const base = g.get(cur)

    for (const [ox, oy] of DIRS) {
      const nx = cx + ox
      const ny = cy + oy
      if (map.isSolid(nx, ny)) continue
      const ni = ny * w + nx
      const cost = base + 1
      if (cost < (g.get(ni) ?? Infinity)) {
        g.set(ni, cost)
        came.set(ni, cur)
        open.push(ni, cost + h(nx, ny))
      }
    }
  }

  if (!came.has(goal)) return null
  const path = []
  for (let n = goal; n !== start; n = came.get(n)) {
    const x = n % w
    path.push({ tx: x, ty: (n - x) / w })
  }
  return path.reverse()
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

class Heap {
  constructor() {
    this.items = []
    this.pri = []
  }
  get size() {
    return this.items.length
  }
  push(item, p) {
    const a = this.items
    const q = this.pri
    a.push(item)
    q.push(p)
    let i = a.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (q[parent] <= q[i]) break
      [a[i], a[parent]] = [a[parent], a[i]]
      [q[i], q[parent]] = [q[parent], q[i]]
      i = parent
    }
  }
  pop() {
    const a = this.items
    const q = this.pri
    const top = a[0]
    const lastItem = a.pop()
    const lastPri = q.pop()
    if (a.length) {
      a[0] = lastItem
      q[0] = lastPri
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < a.length && q[l] < q[m]) m = l
        if (r < a.length && q[r] < q[m]) m = r
        if (m === i) break
        [a[i], a[m]] = [a[m], a[i]]
        [q[i], q[m]] = [q[m], q[i]]
        i = m
      }
    }
    return top
  }
}
