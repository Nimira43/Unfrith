import { TILE } from "../core/display.js";
import { findPath } from "../world/pathfinding.js";
import { tileCentre, toTile } from "../world/tilemap.js";

const WALK = 26;

export function createMember(def, home) {
  const m = {
    def,
    id: def.id,
    x: home.x * TILE,
    y: home.y * TILE,
    angle: Math.PI / 2,
    target: null,
    path: [],
    pause: 1 + Math.random() * 2,
    task: null,
    paceLeg: 0,

    busy: () => !!m.task,

    sendTo(map, tx, ty, wait = 3) {
      m.task = { stage: "go", wait };
      m.path = findPath(map, toTile(m.x), toTile(m.y), tx, ty, 8000) ?? [];
    },

    update(dt, map, player) {
      if (m.task) return runTask(dt, map);
      const near = Math.hypot(player.x - m.x, player.y - m.y) < TILE * 2.5;

      if (near || home.idle === "still") {
        if (near) m.angle = Math.atan2(player.y - m.y, player.x - m.x);
        return;
      }

      if (!m.target) {
        m.pause -= dt;
        if (m.pause > 0) return;
        if (home.idle === "pace") {
          m.paceLeg = 1 - m.paceLeg;
          const p = m.paceLeg ? home.to : home;
          m.target = { x: p.x * TILE, y: p.y * TILE };
        } else {
          for (let k = 0; k < 6 && !m.target; k++) {
            const tx = home.x + (Math.random() * 2 - 1) * home.radius;
            const ty = home.y + (Math.random() * 2 - 1) * home.radius;
            if (!map.isSolid(Math.floor(tx), Math.floor(ty)))
              m.target = { x: tx * TILE, y: ty * TILE };
          }
        }
        m.pause = 2 + Math.random() * 3;
      }

      if (m.target) {
        const dx = m.target.x - m.x;
        const dy = m.target.y - m.y;
        const d = Math.hypot(dx, dy);
        if (d < 1) {
          m.target = null;
          return;
        }
        const step = Math.min(d, WALK * dt);
        const nx = m.x + (dx / d) * step;
        const ny = m.y + (dy / d) * step;
        if (map.boxHitsSolid(nx, ny, 4, 4)) {
          m.target = null;
          return;
        }
        m.x = nx;
        m.y = ny;
        m.angle = Math.atan2(dy, dx);
      }
    },

    draw(ctx, cam) {
      const x = Math.round(m.x - cam.x);
      const y = Math.round(m.y - cam.y);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(m.angle);
      ctx.fillStyle = def.coat;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.hair;
      ctx.beginPath();
      ctx.arc(0.5, 0, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  };

  function runTask(dt, map) {
    const t = m.task;
    if (t.stage === "wait") {
      t.wait -= dt;
      if (t.wait <= 0) {
        t.stage = "back";
        m.path =
          findPath(
            map,
            toTile(m.x),
            toTile(m.y),
            Math.floor(home.x),
            Math.floor(home.y),
            8000,
          ) ?? [];
      }
      return;
    }
    if (!m.path.length) {
      if (t.stage === "go") t.stage = "wait";
      else {
        m.task = null;
        m.x = home.x * TILE;
        m.y = home.y * TILE;
      }
      return;
    }
    const next = m.path[0];
    const nx = tileCentre(next.tx);
    const ny = tileCentre(next.ty);
    const dx = nx - m.x;
    const dy = ny - m.y;
    const d = Math.hypot(dx, dy);
    const step = WALK * 1.3 * dt;
    if (d <= step) {
      m.x = nx;
      m.y = ny;
      m.path.shift();
    } else {
      m.x += (dx / d) * step;
      m.y += (dy / d) * step;
      m.angle = Math.atan2(dy, dx);
    }
  }

  return m;
}
