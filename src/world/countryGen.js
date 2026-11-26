import { createRandom } from "../core/random.js";
import { createTilemap } from "./tilemap.js";
import { findPath } from "./pathfinding.js";
import { T } from "./tiles.js";

const W = 180;
const H = 110;

export function generateValidCountry(seed) {
  for (let k = 0; k < 30; k++) {
    const level = generateCountry((seed + k * 7907) >>> 0);
    if (level.valid) return level;
  }
  return generateCountry(seed);
}

export function generateCountry(seed) {
  const rng = createRandom(seed);
  const map = createTilemap(W, H);
  const get = map.get;
  const set = map.set;
  const inside = (x, y) => x >= 3 && y >= 3 && x < W - 3 && y < H - 3;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.min(x, y, W - 1 - x, H - 1 - y);
      set(x, y, d < 3 ? T.TREE : d < 5 ? T.FOREST : T.PAVEMENT);
    }
  }

  const n1 = valueNoise(rng, W, H, 12);
  const n2 = valueNoise(rng, W, H, 5);
  for (let y = 5; y < H - 5; y++) {
    for (let x = 5; x < W - 5; x++) {
      if (n1(x, y) * 0.75 + n2(x, y) * 0.35 > 0.68) set(x, y, T.FOREST);
    }
  }

  const ph1 = rng.next() * 6.28;
  const ph2 = rng.next() * 6.28;
  const riverX = (y) =>
    Math.round(
      88 + 9 * Math.sin(y * 0.06 + ph1) + 4 * Math.sin(y * 0.17 + ph2),
    );
  for (let y = 3; y < H - 3; y++) {
    const rx = riverX(y);
    for (let x = rx - 1; x <= rx + 1; x++) set(x, y, T.WATER);
  }

  for (let h = 0; h < 38; h++) {
    let x = rng.int(8, W - 9);
    let y = rng.int(8, H - 9);
    const horizontal = rng.chance(0.5);
    const len = rng.int(10, 28);
    let gapIn = rng.int(6, 11);
    for (let k = 0; k < len; k++) {
      if (get(x, y) !== T.PAVEMENT) break;
      if (gapIn-- <= 0) {
        gapIn = rng.int(7, 12);
        k++;
        horizontal ? (x += 2) : (y += 2);
        continue;
      }
      set(x, y, T.HEDGE);
      horizontal ? x++ : y++;
    }
  }

  const start = { x: 4, y: rng.int(30, 80) };
  const farmY = rng.int(25, 85);
  const roadEnd = { x: W - 22, y: farmY };
  const nodes = [start];
  for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      let x = 28 + gx * 38 + rng.int(-6, 6);
      const y = 20 + gy * 35 + rng.int(-6, 6);
      if (Math.abs(x - riverX(y)) < 6) x += 9;
      nodes.push({ x, y });
    }
  }
  nodes.push(roadEnd);
  const START = 0;
  const END = nodes.length - 1;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const edges = [];
  const inTree = new Set([0]);
  while (inTree.size < nodes.length) {
    let best = null;
    for (const a of inTree) {
      for (let b = 0; b < nodes.length; b++) {
        if (inTree.has(b)) continue;
        const d = dist(nodes[a], nodes[b]);
        if (!best || d < best.d) best = { a, b, d };
      }
    }
    edges.push([best.a, best.b]);
    inTree.add(best.b);
  }
  for (let k = 0; k < 4; k++) {
    const a = rng.int(1, nodes.length - 2);
    const options = nodes
      .map((n, i) => ({ i, d: dist(nodes[a], n) }))
      .filter(
        (o) =>
          o.i !== a &&
          o.i !== START &&
          !edges.some(
            ([p, q]) => (p === a && q === o.i) || (p === o.i && q === a),
          ),
      )
      .sort((p, q) => p.d - q.d);
    if (options[0] && options[0].d < 55) edges.push([a, options[0].i]);
  }

  const degree = nodes.map(
    (_, i) => edges.filter(([a, b]) => a === i || b === i).length,
  );
  const bridges = [];

  for (const [a, b] of edges) {
    const p = nodes[a];
    const q = nodes[b];
    const len = dist(p, q);
    const off = (rng.next() - 0.5) * 0.5 * len;
    const cx = (p.x + q.x) / 2 + (-(q.y - p.y) / len) * off;
    const cy = (p.y + q.y) / 2 + ((q.x - p.x) / len) * off;
    let crossed = false;
    const steps = Math.ceil(len * 2.5);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = Math.round(
        (1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * cx + t * t * q.x,
      );
      const y = Math.round(
        (1 - t) * (1 - t) * p.y + 2 * (1 - t) * t * cy + t * t * q.y,
      );
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const tx = x + ox;
          const ty = y + oy;
          if (!inside(tx, ty) && !(tx >= 0 && tx < 5)) continue;
          const t0 = get(tx, ty);
          if (t0 === T.WATER || t0 === T.BRIDGE) {
            set(tx, ty, T.BRIDGE);
            if (!crossed) {
              crossed = true;
              bridges.push({ tx: x, ty: y, edge: [a, b] });
            }
          } else {
            set(tx, ty, T.ROAD);
          }
        }
      }
    }
  }

  for (let x = roadEnd.x; x <= W - 17; x++)
    for (let y = farmY - 1; y <= farmY + 1; y++) set(x, y, T.ROAD);

  const buildings = [];
  const windows = [];
  const clearAround = (x0, y0, w, h, r) => {
    for (let y = y0 - r; y < y0 + h + r; y++) {
      for (let x = x0 - r; x < x0 + w + r; x++) {
        const t = get(x, y);
        if (inside(x, y) && (t === T.FOREST || t === T.TREE || t === T.HEDGE))
          set(x, y, T.PAVEMENT);
      }
    }
  };
  const building = (x0, y0, w, h, kind) => {
    clearAround(x0, y0, w, h, 2);
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) set(x, y, T.BUILDING);
    buildings.push({ x: x0, y: y0, w, h, kind });
  };

  const farm = { x: W - 16, y: farmY - 3, w: 7, h: 6 };
  building(farm.x, farm.y, farm.w, farm.h, "farm");
  building(W - 13, farmY + 5, 5, 4, "barn");
  for (let y = farmY - 1; y <= farmY + 1; y++) set(farm.x, y, T.EXIT);
  windows.push({ tx: farm.x + 3, ty: farm.y + 1, strong: true });

  let lodge = null;
  let bestScore = -1;
  for (let k = 0; k < 500; k++) {
    const x = rng.int(30, 150);
    const y = rng.int(12, H - 18);
    let wood = 0;
    let road = 0;
    for (let oy = -7; oy <= 7; oy++) {
      for (let ox = -7; ox <= 7; ox++) {
        const t = get(x + ox, y + oy);
        if (t === T.FOREST || t === T.TREE) wood++;
        if (t === T.ROAD || t === T.BRIDGE || t === T.WATER) road++;
      }
    }
    const score = wood - road * 6;
    if (score > bestScore) {
      bestScore = score;
      lodge = { x, y };
    }
  }
  const lodgeRect = { x: lodge.x - 3, y: lodge.y - 2, w: 6, h: 5 };
  for (let y = lodge.y - 7; y <= lodge.y + 8; y++) {
    for (let x = lodge.x - 8; x <= lodge.x + 8; x++) {
      const t = get(x, y);
      if (
        inside(x, y) &&
        (t === T.FOREST || t === T.TREE || t === T.HEDGE) &&
        Math.hypot(x - lodge.x, (y - lodge.y) * 1.2) < 7.5
      ) {
        set(x, y, T.PAVEMENT);
      }
    }
  }
  building(lodgeRect.x, lodgeRect.y, lodgeRect.w, lodgeRect.h, "lodge");
  windows.push({ tx: lodge.x, ty: lodgeRect.y + lodgeRect.h - 1 });

  const mid = nodes
    .map((n, i) => ({ i, n }))
    .filter(({ i, n }) => i !== START && i !== END && n.x > 45 && n.x < 135)
    .sort((a, b) => degree[b.i] - degree[a.i])[0];
  const cpNode = mid.n;
  const hut = { x: cpNode.x + 3, y: cpNode.y + 3, w: 3, h: 3 };
  building(hut.x, hut.y, hut.w, hut.h, "hut");
  windows.push({ tx: hut.x + 1, ty: hut.y + 1 });
  const barrier = { tx: cpNode.x, ty: cpNode.y };

  const cottageNodes = nodes
    .map((n, i) => ({ i, n }))
    .filter(({ i, n }) => i !== START && i !== END && n !== cpNode)
    .slice(0);
  rng.shuffle(cottageNodes);
  for (const { n } of cottageNodes.slice(0, 3)) {
    const cx = n.x - 7;
    const cy = n.y - 6;
    if (cx < 8 || cy < 8) continue;
    let clear = true;
    for (let y = cy - 1; y < cy + 4; y++)
      for (let x = cx - 1; x < cx + 5; x++)
        if ([T.ROAD, T.BRIDGE, T.WATER, T.BUILDING].includes(get(x, y)))
          clear = false;
    if (!clear) continue;
    building(cx, cy, 4, 3, "cottage");
    windows.push({ tx: cx + 1, ty: cy + 2 });
  }

  let wreck = null;
  const roadTiles = [];
  for (let y = 6; y < H - 6; y++)
    for (let x = 12; x < W - 24; x++)
      if (get(x, y) === T.ROAD) roadTiles.push({ x, y });
  rng.shuffle(roadTiles);
  for (const r of roadTiles) {
    if (Math.hypot(r.x - cpNode.x, r.y - cpNode.y) < 25 || r.x < 30) continue;
    for (const [ox, oy] of [
      [0, 2],
      [0, -2],
      [2, 0],
      [-2, 0],
    ]) {
      const wx = r.x + ox;
      const wy = r.y + oy;
      const ok = [0, 1].every((k) => {
        const t = get(wx + (oy ? k : 0), wy + (ox ? k : 0));
        return t === T.PAVEMENT || t === T.FOREST;
      });
      if (ok) {
        wreck = { x: wx, y: wy, w: oy ? 2 : 1, h: oy ? 1 : 2, road: r };
        break;
      }
    }
    if (wreck) break;
  }
  if (wreck)
    for (let y = wreck.y; y < wreck.y + wreck.h; y++)
      for (let x = wreck.x; x < wreck.x + wreck.w; x++) set(x, y, T.PROP);

  for (let y = 5; y < H - 5; y++) {
    for (let x = 5; x < W - 5; x++) {
      if (get(x, y) !== T.FOREST) continue;
      const nearRoad = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([ox, oy]) => [T.ROAD, T.BRIDGE].includes(get(x + ox, y + oy)));
      if (!nearRoad && rng.chance(0.14)) set(x, y, T.TREE);
    }
  }

  let ford = null;
  const fordCandidates = [];
  for (let y = 12; y < H - 12; y++) {
    if (bridges.some((b) => Math.abs(b.ty - y) < 14)) continue;
    const rx = riverX(y);
    const wooded = [-4, -3, 3, 4].filter((o) =>
      [T.FOREST, T.TREE].includes(get(rx + o, y)),
    ).length;
    fordCandidates.push({ y, rx, wooded });
  }
  fordCandidates.sort((a, b) => b.wooded - a.wooded);
  if (fordCandidates.length) {
    const f =
      fordCandidates[
        Math.floor(rng.next() * Math.min(5, fordCandidates.length))
      ];
    ford = { tx: f.rx, ty: f.y };
    for (let y = f.y - 1; y <= f.y + 1; y++) {
      for (let x = f.rx - 1; x <= f.rx + 1; x++) set(x, y, T.FORD);
      for (let x = f.rx - 5; x <= f.rx + 5; x++)
        if (get(x, y) === T.TREE || get(x, y) === T.HEDGE) set(x, y, T.FOREST);
    }
  }

  const thickets = [];
  for (let k = 0; k < 4000 && thickets.length < 34; k++) {
    const x = rng.int(6, W - 7);
    const y = rng.int(6, H - 7);
    if (get(x, y) !== T.PAVEMENT) continue;
    const by = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([ox, oy]) => [T.HEDGE, T.ROAD].includes(get(x + ox, y + oy)));
    if (
      !by ||
      thickets.some((t) => Math.abs(t.tx - x) + Math.abs(t.ty - y) < 7)
    )
      continue;
    set(x, y, T.DOORWAY);
    thickets.push({ tx: x, ty: y });
  }

  const rubble = [];
  for (let k = 0; k < 3000 && rubble.length < 14; k++) {
    const x = rng.int(8, W - 20);
    const y = rng.int(6, H - 7);
    if (get(x, y) !== T.PAVEMENT) continue;
    rubble.push({ tx: x, ty: y, stones: 3 });
  }

  const roadside = (r) => {
    for (const [ox, oy] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (!map.isSolid(r.x + ox, r.y + oy))
        return { tx: r.x + ox, ty: r.y + oy };
    return { tx: r.x, ty: r.y };
  };
  const evidence = [
    { id: "checkpoint", ...nearestOpen(map, hut.x - 1, hut.y + 1) },
    {
      id: "ashby",
      ...(wreck ? roadside(wreck.road) : nearestOpen(map, 60, 60)),
    },
    {
      id: "photographs",
      ...nearestOpen(map, lodge.x, lodgeRect.y + lodgeRect.h + 1),
    },
  ];

  const startTile = { tx: 5, ty: start.y };
  const farFromStart = (p) =>
    Math.hypot(p.tx - startTile.tx, p.ty - startTile.ty) > 28;
  const guards = [];
  guards.push({
    route: [nearestOpen(map, cpNode.x - 2, cpNode.y - 2)],
    kind: "static",
  });
  guards.push({
    route: [nearestOpen(map, cpNode.x + 2, cpNode.y + 2)],
    kind: "static",
  });
  for (const b of rng.shuffle([...bridges]).slice(0, 2)) {
    const spot =
      nearestRoad(map, b.tx - 4, b.ty) ?? nearestOpen(map, b.tx - 4, b.ty);
    if (farFromStart(spot)) guards.push({ route: [spot], kind: "static" });
  }
  guards.push({
    route: [
      nearestOpen(map, lodgeRect.x - 2, lodgeRect.y - 2),
      nearestOpen(map, lodgeRect.x + lodgeRect.w + 1, lodgeRect.y - 2),
      nearestOpen(
        map,
        lodgeRect.x + lodgeRect.w + 1,
        lodgeRect.y + lodgeRect.h + 2,
      ),
      nearestOpen(map, lodgeRect.x - 2, lodgeRect.y + lodgeRect.h + 2),
    ],
    kind: "patrol",
  });
  const patrolEdges = rng
    .shuffle(edges.filter(([a, b]) => a !== START && b !== START))
    .slice(0, 3);
  for (const [a, b] of patrolEdges) {
    const r = [
      nearestOpen(map, nodes[a].x, nodes[a].y),
      nearestOpen(map, nodes[b].x, nodes[b].y),
    ];
    if (r.every(farFromStart)) guards.push({ route: r, kind: "patrol" });
  }

  const vehicles = [];
  const pairs = [];
  for (let a = 1; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++)
      pairs.push({ a, b, d: dist(nodes[a], nodes[b]) });
  }
  pairs.sort((p, q) => q.d - p.d);
  for (const { a, b } of pairs) {
    if (vehicles.length >= 2) break;
    const route = roadPath(map, nodes[a], nodes[b]);
    if (!route || route.length < 60) continue;
    if (vehicles.some((v) => v.route[0] === route[0])) continue;
    vehicles.push({ route });
  }

  const chalkNear = (targetX) => {
    const n = nodes
      .filter((nd, i) => i !== START && i !== END && nd !== cpNode)
      .sort((p, q) => Math.abs(p.x - targetX) - Math.abs(q.x - targetX))[0];
    return nearestField(map, n.x, n.y - 3);
  };
  const checkpoints = [startTile, chalkNear(62), chalkNear(122)];

  const lights = [];
  for (const w of windows)
    lights.push({
      tx: w.tx,
      ty: w.ty,
      radius: w.strong ? 130 : 70,
      colour: "resistance-amber",
      strength: w.strong ? 0.95 : 0.6,
    });
  lights.push({
    tx: barrier.tx,
    ty: barrier.ty,
    radius: 110,
    colour: "sodium",
    strength: 0.8,
  });
  if (wreck)
    lights.push({
      tx: wreck.x,
      ty: wreck.y,
      radius: 60,
      colour: "regime-red",
      strength: 0.5,
      flicker: true,
    });

  const level = {
    seed,
    map,
    start: startTile,
    exitTiles: { tx: farm.x, ty: farmY - 1, h: 3 },
    evidence,
    checkpoints,
    guards,
    vehicles,
    rubble,
    lights,
    buildings,
    windows,
    barrier,
    wreck,
    ford,
    bridges,
    valid: true,
  };

  const targets = [{ tx: farm.x, ty: farmY }, ...evidence, ...checkpoints];
  if (ford) targets.push(ford);
  level.valid =
    !!wreck &&
    vehicles.length > 0 &&
    targets.every(
      (t) => !!findPath(map, startTile.tx, startTile.ty, t.tx, t.ty, 40000),
    );

  map.speedAt = (tx, ty) => {
    const t = get(tx, ty);
    return t === T.FOREST ? 0.58 : t === T.FORD ? 0.45 : 1;
  };
  map.coverAt = (tx, ty) => (get(tx, ty) === T.FOREST ? 0.45 : 1);

  return level;
}

function valueNoise(rng, w, h, cell) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = Array.from({ length: gw * gh }, () => rng.next());
  const at = (gx, gy) => grid[gy * gw + gx];
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = Math.floor(x / cell);
    const gy = Math.floor(y / cell);
    const fx = smooth(x / cell - gx);
    const fy = smooth(y / cell - gy);
    const a = at(gx, gy) + (at(gx + 1, gy) - at(gx, gy)) * fx;
    const b = at(gx, gy + 1) + (at(gx + 1, gy + 1) - at(gx, gy + 1)) * fx;
    return a + (b - a) * fy;
  };
}

function nearestOpen(map, tx, ty) {
  return map.nearestOpen(Math.round(tx), Math.round(ty));
}

function nearestRoad(map, tx, ty) {
  for (let r = 0; r < 8; r++) {
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (map.get(tx + ox, ty + oy) === T.ROAD)
          return { tx: tx + ox, ty: ty + oy };
      }
    }
  }
  return null;
}

function nearestField(map, tx, ty) {
  for (let r = 0; r < 10; r++) {
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (map.get(tx + ox, ty + oy) === T.PAVEMENT)
          return { tx: tx + ox, ty: ty + oy };
      }
    }
  }
  return map.nearestOpen(tx, ty);
}

function roadPath(map, a, b) {
  const isRoad = (x, y) => [T.ROAD, T.BRIDGE].includes(map.get(x, y));
  const s = nearestRoad(map, a.x, a.y);
  const g = nearestRoad(map, b.x, b.y);
  if (!s || !g) return null;
  const w = map.w;
  const prev = new Map([[s.ty * w + s.tx, -1]]);
  const q = [s.ty * w + s.tx];
  const goal = g.ty * w + g.tx;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    if (cur === goal) break;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    for (const [ox, oy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + ox;
      const ny = cy + oy;
      const ni = ny * w + nx;
      if (!prev.has(ni) && isRoad(nx, ny)) {
        prev.set(ni, cur);
        q.push(ni);
      }
    }
  }
  if (!prev.has(goal)) return null;
  const path = [];
  for (let n = goal; n !== -1; n = prev.get(n))
    path.push({ tx: n % w, ty: Math.floor(n / w) });
  return path.reverse();
}
