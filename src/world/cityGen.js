import { createRandom } from "../core/random.js";
import { createTilemap } from "./tilemap.js";
import { T } from "./tiles.js";
import { findPath } from "./pathfinding.js";

export const PHASES = 3;

const W = 160;
const H = 100;
const STREET = 3;
const COL_BLOCKS = 11;
const ROW_BLOCKS = 7;
const GUARDS = 10;
const RUBBLE = 16;

const POSTERS = [
  { style: "red", emblem: null, lines: ["OBEY"] },
  { style: "red", emblem: null, lines: ["WORK"] },
  { style: "red", emblem: null, lines: ["WORSHIP"] },
  {
    style: "paper",
    emblem: null,
    header: "BY ORDER OF THE COMMITTEE",
    lines: ["OBEY", "WORK", "WORSHIP"],
  },
  { style: "red", emblem: "father", lines: ["THE FATHER", "LOVES YOU"] },
  {
    style: "paper",
    emblem: "father",
    header: "THE SUPREME FATHER",
    lines: ["WATCHES", "OVER YOU"],
  },
  {
    style: "paper",
    emblem: "eye",
    header: "HEAVENLY INTELLIGENCE AGENCY",
    lines: ["THE HIA", "SEES ALL"],
  },
  { style: "red", emblem: "eye", lines: ["WHO IS", "LISTENING?"] },
  { style: "red", emblem: "shield", lines: ["OBEY", "THE CAP"] },
  {
    style: "paper",
    emblem: "shield",
    header: "CORRECTIONAL ADVISORY POLICE",
    lines: ["REPORT", "DISSENT"],
  },
  {
    style: "paper",
    emblem: null,
    header: "THE COMMITTEE",
    lines: ["PROVIDES"],
  },
  { style: "red", emblem: null, lines: ["WORK IS", "WORSHIP"] },
];

export function generateCity(seed) {
  const rng = createRandom(seed);

  const colWidths = bandWidths(rng, W - 4, COL_BLOCKS, 9, 13);
  const rowWidths = bandWidths(rng, H - 4, ROW_BLOCKS, 8, 12);
  const sx = [];
  const bx = [];
  const sy = [];
  const by = [];
  let p = 2;
  for (let i = 0; i < COL_BLOCKS; i++) {
    sx.push(p);
    p += STREET;
    bx.push(p);
    p += colWidths[i];
  }
  sx.push(p);
  p = 2;
  for (let j = 0; j < ROW_BLOCKS; j++) {
    sy.push(p);
    p += STREET;
    by.push(p);
    p += rowWidths[j];
  }
  sy.push(p);

  const NX = sx.length;
  const NY = sy.length;
  const nodeId = (i, j) => j * NX + i;
  const nodeOf = (id) => ({ i: id % NX, j: Math.floor(id / NX) });

  const edges = [];
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      if (i < NX - 1)
        edges.push({ a: nodeId(i, j), b: nodeId(i + 1, j), dir: "h", i, j });
      if (j < NY - 1)
        edges.push({ a: nodeId(i, j), b: nodeId(i, j + 1), dir: "v", i, j });
    }
  }
  const adj = Array.from({ length: NX * NY }, () => []);
  edges.forEach((e, k) => {
    adj[e.a].push(k);
    adj[e.b].push(k);
  });

  const start = nodeId(0, 0);
  const exitRow = rng.int(Math.floor(NY / 2), NY - 1);
  const exit = nodeId(NX - 1, exitRow);

  const inTree = new Set();
  {
    const seen = new Set([start]);
    const stack = [start];
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const options = adj[cur].filter((k) => !seen.has(other(edges[k], cur)));
      if (!options.length) {
        stack.pop();
        continue;
      }
      const k = rng.pick(options);
      const nxt = other(edges[k], cur);
      inTree.add(k);
      seen.add(nxt);
      stack.push(nxt);
    }
  }
  edges.forEach((e, k) => {
    e.base = inTree.has(k) || rng.chance(0.18) ? "open" : "barricade";
  });

  const openKs = edges.map((e, k) => k).filter((k) => edges[k].base === "open");
  const wallKs = edges
    .map((e, k) => k)
    .filter((k) => edges[k].base === "barricade");
  let accepted = false;
  let strictPass = false;
  for (let attempt = 0; attempt < 3000 && !accepted; attempt++) {
    edges.forEach((e) => {
      e.type = e.base;
      e.closedIn = null;
    });
    const gateCount = 16 + rng.int(0, 6);
    const reopenCount = 10 + rng.int(0, 6);
    for (const k of rng.shuffle([...openKs]).slice(0, gateCount))
      makeGate(edges[k]);
    for (const k of rng.shuffle([...wallKs]).slice(0, reopenCount))
      makeGate(edges[k]);

    const strict = attempt < 2800; // relax the "all closed" rule only if we must
    const okPhases = [0, 1, 2].every((ph) => reachable(ph));
    const okClosed = !strict || !reachable(-1);
    accepted = okPhases && okClosed;
    strictPass = accepted && strict;
  }

  function makeGate(e) {
    e.type = "gate";
    const phases = rng.shuffle([0, 1, 2]);
    e.closedIn = phases.slice(0, rng.chance(0.5) ? 1 : 2);
  }

  function passable(e, phase) {
    if (e.type === "open") return true;
    if (e.type === "barricade") return false;
    if (phase === "union") return true;
    if (phase === -1) return false;
    return !e.closedIn.includes(phase);
  }

  function bfs(phase) {
    const dist = new Array(NX * NY).fill(-1);
    dist[start] = 0;
    const q = [start];
    while (q.length) {
      const cur = q.shift();
      for (const k of adj[cur]) {
        const e = edges[k];
        if (!passable(e, phase)) continue;
        const n = other(e, cur);
        if (dist[n] < 0) {
          dist[n] = dist[cur] + 1;
          q.push(n);
        }
      }
    }
    return dist;
  }

  function reachable(phase) {
    return bfs(phase)[exit] >= 0;
  }

  const map = createTilemap(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wall = x < 2 || y < 2 || x >= W - 2 || y >= H - 2;
      map.set(x, y, wall ? T.CITY_WALL : T.ROAD);
    }
  }

  const roofs = [];
  for (let bj = 0; bj < ROW_BLOCKS; bj++) {
    for (let bi = 0; bi < COL_BLOCKS; bi++) {
      const x0 = bx[bi];
      const y0 = by[bj];
      const w = colWidths[bi];
      const h = rowWidths[bj];
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const ring =
            x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
          map.set(x, y, ring ? T.PAVEMENT : T.BUILDING);
        }
      }
      const ix = x0 + 1;
      const iy = y0 + 1;
      const iw = w - 2;
      const ih = h - 2;
      let rects = [{ x: ix, y: iy, w: iw, h: ih }];
      let yard = null;
      const maxCw = Math.floor(iw / 2) - 1;
      const maxCh = Math.floor(ih / 2) - 1;
      if (maxCw >= 3 && maxCh >= 3 && rng.chance(0.45)) {
        const cw = rng.int(3, maxCw);
        const ch = rng.int(3, maxCh);
        const corner = rng.int(0, 3);
        const cx = corner % 2 === 0 ? ix : ix + iw - cw;
        const cy = corner < 2 ? iy : iy + ih - ch;
        for (let y = cy; y < cy + ch; y++) {
          for (let x = cx; x < cx + cw; x++) map.set(x, y, T.PAVEMENT);
        }
        yard = { x: cx, y: cy, w: cw, h: ch };
        const narrowX = corner % 2 === 0 ? ix + cw : ix;
        rects =
          corner < 2
            ? [
                { x: narrowX, y: iy, w: iw - cw, h: ch },
                { x: ix, y: iy + ch, w: iw, h: ih - ch },
              ]
            : [
                { x: ix, y: iy, w: iw, h: ih - ch },
                { x: narrowX, y: iy + ih - ch, w: iw - cw, h: ch },
              ];
      }
      const main = rects.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
      const roof = {
        rects,
        main,
        bounds: { x: x0, y: y0, w, h },
        shade: rng.int(0, 2),
        poster: null,
        yard,
      };
      if (rng.chance(0.5)) roof.poster = rng.pick(POSTERS);
      roofs.push(roof);

      placeDoorways(x0, y0, w, h, rng.int(2, 4));
    }
  }

  function placeDoorways(x0, y0, w, h, count) {
    const isB = (x, y) => map.get(x, y) === T.BUILDING;
    const isP = (x, y) => map.get(x, y) === T.PAVEMENT;
    const spots = [];
    for (let y = y0 + 1; y < y0 + h - 1; y++) {
      for (let x = x0 + 1; x < x0 + w - 1; x++) {
        if (!isB(x, y)) continue;
        if (isP(x, y - 1) && isB(x, y + 1) && isB(x - 1, y) && isB(x + 1, y))
          spots.push([x, y]);
        else if (
          isP(x, y + 1) &&
          isB(x, y - 1) &&
          isB(x - 1, y) &&
          isB(x + 1, y)
        )
          spots.push([x, y]);
        else if (
          isP(x - 1, y) &&
          isB(x + 1, y) &&
          isB(x, y - 1) &&
          isB(x, y + 1)
        )
          spots.push([x, y]);
        else if (
          isP(x + 1, y) &&
          isB(x - 1, y) &&
          isB(x, y - 1) &&
          isB(x, y + 1)
        )
          spots.push([x, y]);
      }
    }
    rng.shuffle(spots);
    let placed = 0;
    for (const [x, y] of spots) {
      if (placed >= count) break;
      const crowded = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ].some(([ox, oy]) => map.get(x + ox, y + oy) === T.DOORWAY);
      if (crowded) continue;
      map.set(x, y, T.DOORWAY);
      placed++;
    }
  }

  for (const e of edges) {
    if (e.type === "open") continue;
    const tilesOf = barrierTiles(e);
    for (const [x, y] of tilesOf) {
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (map.get(x + ox, y + oy) === T.DOORWAY)
            map.set(x + ox, y + oy, T.BUILDING);
        }
      }
    }
    if (e.type === "barricade") {
      for (const [x, y] of tilesOf) map.set(x, y, T.BARRICADE);
    } else {
      e.gate = map.addGate(tilesOf, e.closedIn);
    }
  }

  function barrierTiles(e) {
    const out = [];
    if (e.dir === "h") {
      const x = Math.floor((sx[e.i] + STREET + sx[e.i + 1] - 1) / 2);
      for (let y = sy[e.j] - 1; y <= sy[e.j] + STREET; y++) {
        if (map.get(x, y) !== T.CITY_WALL) out.push([x, y]);
      }
    } else {
      const y = Math.floor((sy[e.j] + STREET + sy[e.j + 1] - 1) / 2);
      for (let x = sx[e.i] - 1; x <= sx[e.i] + STREET; x++) {
        if (map.get(x, y) !== T.CITY_WALL) out.push([x, y]);
      }
    }
    return out;
  }

  for (let y = sy[exitRow]; y < sy[exitRow] + STREET; y++) {
    map.set(W - 2, y, T.EXIT);
    map.set(W - 1, y, T.EXIT);
  }

  const centre = (id) => {
    const { i, j } = nodeOf(id);
    return { tx: sx[i] + 1, ty: sy[j] + 1 };
  };

  const union = bfs("union");
  const maxDist = Math.max(...union);
  const degree = (id) =>
    adj[id].filter((k) => edges[k].type !== "barricade").length;

  const evidenceNodes = [];
  const candidates = [...Array(NX * NY).keys()]
    .filter((id) => id !== start && id !== exit && union[id] >= maxDist * 0.35)
    .sort((a, b) => degree(a) - degree(b) || union[b] - union[a]);
  for (const id of candidates) {
    if (evidenceNodes.length === 3) break;
    const n = nodeOf(id);
    const farEnough = evidenceNodes.every((o) => {
      const m = nodeOf(o);
      return Math.abs(m.i - n.i) + Math.abs(m.j - n.j) >= 5;
    });
    if (farEnough) evidenceNodes.push(id);
  }
  for (const id of candidates) {
    if (evidenceNodes.length >= 3) break;
    if (!evidenceNodes.includes(id)) evidenceNodes.push(id);
  }

  const used = new Set([...evidenceNodes, exit]);
  const nearestTo = (target) => {
    let best = null;
    for (let id = 0; id < NX * NY; id++) {
      if (used.has(id) || union[id] < 0) continue;
      if (
        !best ||
        Math.abs(union[id] - target) < Math.abs(union[best] - target)
      )
        best = id;
    }
    used.add(best);
    return best;
  };
  used.add(start);
  const checkpointNodes = [
    start,
    nearestTo(maxDist * 0.35),
    nearestTo(maxDist * 0.7),
  ];

  const rubble = [];
  const walkable = edges.filter((e) => e.type === "open");
  for (let r = 0; r < RUBBLE; r++) {
    const e = rng.pick(walkable);
    const t = segmentTile(e, rng);
    rubble.push({ tx: t.tx, ty: t.ty, stones: 3 });
  }

  function segmentTile(e, r) {
    if (e.dir === "h") {
      return {
        tx: r.int(sx[e.i] + STREET + 1, sx[e.i + 1] - 2),
        ty: sy[e.j] + r.int(0, STREET - 1),
      };
    }
    return {
      tx: sx[e.i] + r.int(0, STREET - 1),
      ty: r.int(sy[e.j] + STREET + 1, sy[e.j + 1] - 2),
    };
  }

  const guards = [];
  const spawnable = [...Array(NX * NY).keys()].filter(
    (id) => union[id] >= 4 && id !== exit,
  );
  rng.shuffle(spawnable);
  for (let g = 0; g < GUARDS && g < spawnable.length; g++) {
    const route = [spawnable[g]];
    let cur = spawnable[g];
    const steps = rng.int(2, 4);
    for (let s = 0; s < steps; s++) {
      const options = adj[cur]
        .filter((k) => edges[k].type !== "barricade")
        .map((k) => other(edges[k], cur))
        .filter((n) => !route.includes(n));
      if (!options.length) break;
      cur = rng.pick(options);
      route.push(cur);
    }
    guards.push({ route: route.map(centre) });
  }

  const lamps = [];
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      if (!rng.chance(0.35)) continue;
      const cx = sx[i] + (rng.chance(0.5) ? -1 : STREET);
      const cy = sy[j] + (rng.chance(0.5) ? -1 : STREET);
      if (map.get(cx, cy) === T.PAVEMENT) lamps.push({ tx: cx, ty: cy });
    }
  }
  const speakers = rng
    .shuffle([...Array(NX * NY).keys()])
    .slice(0, 10)
    .map(centre);

  return {
    seed,
    map,
    phases: PHASES,
    start: centre(start),
    exitTiles: { tx: W - 2, ty: sy[exitRow], h: STREET },
    evidence: evidenceNodes.map(centre),
    checkpoints: checkpointNodes.map(centre),
    rubble,
    guards,
    roofs,
    lamps,
    speakers,
    validated: accepted,
    strict: strictPass,
  };
}

function other(e, n) {
  return e.a === n ? e.b : e.a;
}

function bandWidths(rng, total, count, min, max) {
  const target = total - STREET * (count + 1);
  const widths = Array.from({ length: count }, () => rng.int(min, max));
  let sum = widths.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (sum !== target && guard++ < 10000) {
    const k = rng.int(0, count - 1);
    if (sum < target && widths[k] < max + 1) {
      widths[k]++;
      sum++;
    } else if (sum > target && widths[k] > min - 1) {
      widths[k]--;
      sum--;
    }
  }
  return widths;
}

export function generateValidCity(seed) {
  for (let k = 0; k < 50; k++) {
    const level = generateCity((seed + k * 104729) >>> 0);
    if (level.strict && checkTiles(level)) return level;
  }
  return generateCity(seed);
}

function checkTiles(level) {
  const m = level.map;
  const sx = level.start.tx;
  const sy = level.start.ty;
  const ex = level.exitTiles.tx;
  const ey = level.exitTiles.ty + 1;
  let ok = true;
  for (let ph = 0; ph < PHASES && ok; ph++) {
    m.applyPhase(ph);
    ok = !!findPath(m, sx, sy, ex, ey, 60000);
  }
  if (ok) {
    m.gates.forEach((g) => (g.closed = true));
    ok = !findPath(m, sx, sy, ex, ey, 60000);
  }
  m.applyPhase(0);
  return ok;
}
