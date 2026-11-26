import { TILE } from "../core/display.js";
import { T, SOLID, HIDING } from "./tiles.js";

export function createTilemap(w, h) {
  const tiles = new Uint8Array(w * h);
  const gateAt = new Int16Array(w * h).fill(-1);
  const gates = [];

  const map = {
    w,
    h,
    tiles,
    gates,
    pxW: w * TILE,
    pxH: h * TILE,

    idx: (tx, ty) => ty * w + tx,
    inBounds: (tx, ty) => tx >= 0 && ty >= 0 && tx < w && ty < h,
    get: (tx, ty) => (map.inBounds(tx, ty) ? tiles[ty * w + tx] : T.CITY_WALL),
    set: (tx, ty, t) => {
      if (map.inBounds(tx, ty)) tiles[ty * w + tx] = t;
    },

    addGate(tileList, closedIn) {
      const id = gates.length;
      const gate = {
        id,
        tiles: [],
        closedIn: new Set(closedIn),
        closed: false,
        warning: false,
      };
      for (const [tx, ty] of tileList) {
        const i = ty * w + tx;
        tiles[i] = T.GATE;
        gateAt[i] = id;
        gate.tiles.push(i);
      }
      gates.push(gate);
      return gate;
    },

    gateAtTile: (tx, ty) => (map.inBounds(tx, ty) ? gateAt[ty * w + tx] : -1),

    applyPhase(phase) {
      const changed = [];
      for (const g of gates) {
        const shouldClose = g.closedIn.has(phase);
        if (shouldClose !== g.closed) {
          g.closed = shouldClose;
          changed.push(g);
        }
        g.warning = false;
      }
      return changed;
    },

    warnPhase(nextPhase) {
      for (const g of gates) g.warning = g.closedIn.has(nextPhase) !== g.closed;
    },

    isSolid(tx, ty) {
      if (!map.inBounds(tx, ty)) return true;
      const i = ty * w + tx;
      const t = tiles[i];
      if (t === T.GATE) return gates[gateAt[i]].closed;
      return SOLID.has(t);
    },

    isHiding: (tx, ty) => HIDING.has(map.get(tx, ty)),

    solidAtPx: (px, py) =>
      map.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)),

    boxHitsSolid(x, y, hw, hh) {
      const x0 = Math.floor((x - hw) / TILE);
      const x1 = Math.floor((x + hw - 0.001) / TILE);
      const y0 = Math.floor((y - hh) / TILE);
      const y1 = Math.floor((y + hh - 0.001) / TILE);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (map.isSolid(tx, ty)) return true;
        }
      }
      return false;
    },

    lineOfSight(x0, y0, x1, y1) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const steps = Math.ceil(Math.hypot(dx, dy) / 4);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        if (map.solidAtPx(x0 + dx * t, y0 + dy * t)) return false;
      }
      return true;
    },

    rayLength(x, y, angle, maxLen) {
      const cx = Math.cos(angle);
      const cy = Math.sin(angle);
      for (let d = 0; d <= maxLen; d += 4) {
        if (map.solidAtPx(x + cx * d, y + cy * d)) return Math.max(0, d - 4);
      }
      return maxLen;
    },

    nearestOpen(tx, ty) {
      if (!map.isSolid(tx, ty)) return { tx, ty };
      const seen = new Uint8Array(w * h);
      const queue = [[tx, ty]];
      seen[ty * w + tx] = 1;
      while (queue.length) {
        const [cx, cy] = queue.shift();
        for (const [ox, oy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + ox;
          const ny = cy + oy;
          if (!map.inBounds(nx, ny) || seen[ny * w + nx]) continue;
          if (!map.isSolid(nx, ny)) return { tx: nx, ty: ny };
          seen[ny * w + nx] = 1;
          queue.push([nx, ny]);
        }
      }
      return { tx, ty };
    },
  };

  return map;
}

export const tileCentre = (t) => t * TILE + TILE / 2;
export const toTile = (px) => Math.floor(px / TILE);
