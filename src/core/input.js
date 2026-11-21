const down = new Set()
const pressed = new Set()
const mouse = { x: 0, y: 0, clicked: false, inside: false }

let canvasEl = null

export function initInput(canvas) {
  canvasEl = canvas

  window.addEventListener('keydown', (e) => {
    const k = normalise(e.key)
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k))
      e.preventDefault()
    if (!down.has(k)) pressed.add(k)
    down.add(k)
  })

  window.addEventListener('keyup', (e) => down.delete(normalise(e.key)))
  window.addEventListener('blur', () => down.clear())

  canvas.addEventListener('mousemove', (e) => {
    const p = toCanvas(e)
    mouse.x = p.x
    mouse.y = p.y
    mouse.inside = true
  })
  canvas.addEventListener('mouseleave', () => (mouse.inside = false))
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return
    const p = toCanvas(e)
    mouse.x = p.x
    mouse.y = p.y
    mouse.clicked = true
  })
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())
}

function toCanvas(e) {
  const r = canvasEl.getBoundingClientRect()
  return {
    x: ((e.clientX - r.left) / r.width) * canvasEl.width,
    y: ((e.clientY - r.top) / r.height) * canvasEl.height,
  }
}

function normalise(key) {
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase()
}

export const input = {
  isDown: (...keys) => keys.some((k) => down.has(k)),
  wasPressed: (...keys) => keys.some((k) => pressed.has(k)),
  mouse,
  endFrame() {
    pressed.clear()
    mouse.clicked = false
  },
  clear() {
    down.clear()
    pressed.clear()
    mouse.clicked = false
  },
}
