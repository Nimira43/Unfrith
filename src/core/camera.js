export function createCamera(viewW, viewH) {
  const cam = {
    x: 0,
    y: 0,
    viewW,
    viewH,
    shake: 0,

    follow(target, mapW, mapH, dt, snap = false) {
      const tx = target.x - viewW / 2
      const ty = target.y - viewH / 2
      const k = snap ? 1 : 1 - Math.exp(-dt * 8)
      cam.x += (tx - cam.x) * k
      cam.y += (ty - cam.y) * k
      cam.x = Math.max(0, Math.min(mapW - viewW, cam.x))
      cam.y = Math.max(0, Math.min(mapH - viewH, cam.y))
      cam.shake = Math.max(0, cam.shake - dt * 20)
    },

    offset() {
      const sx = cam.shake ? (Math.random() - 0.5) * cam.shake : 0
      const sy = cam.shake ? (Math.random() - 0.5) * cam.shake : 0
      return { x: Math.round(cam.x + sx), y: Math.round(cam.y + sy) }
    },

    toWorld(sx, sy) {
      return { x: sx + cam.x, y: sy + cam.y }
    },
  }
  return cam
}
