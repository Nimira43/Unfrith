export const VIEW_RANGE = 128;
export const VIEW_HALF = 0.62;
const CLOSE_SENSE = 20;

export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function canSee(
  map,
  guard,
  tx,
  ty,
  range = VIEW_RANGE,
  half = VIEW_HALF,
) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  const inCone = Math.abs(angleDiff(guard.angle, Math.atan2(dy, dx))) <= half;
  if (!inCone && dist > CLOSE_SENSE) return false;
  return map.lineOfSight(guard.x, guard.y, tx, ty);
}

export function conePoints(
  map,
  guard,
  range = VIEW_RANGE,
  rays = 18,
  half = VIEW_HALF,
  angle = guard.angle,
  ox = guard.x,
  oy = guard.y,
) {
  const pts = [[ox, oy]];
  for (let r = 0; r <= rays; r++) {
    const a = angle - half + (r / rays) * half * 2;
    const len = map.rayLength(ox, oy, a, range);
    pts.push([ox + Math.cos(a) * len, oy + Math.sin(a) * len]);
  }
  return pts;
}
