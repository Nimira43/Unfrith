export const FRAME_W = 1280
export const FRAME_H = 720
export const TILE = 16

export function fitFrame(frameEl) {
  const resize = () => {
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    const scale = Math.min(vw / FRAME_W, vh / FRAME_H)
    frameEl.style.transform = `scale(${scale})`
    frameEl.style.left = `${Math.floor((vw - FRAME_W * scale) / 2)}px`
    frameEl.style.top = `${Math.floor((vh - FRAME_H * scale) / 2)}px`
  }
  window.addEventListener('resize', resize)
  window.visualViewport?.addEventListener('resize', resize)
  resize()
}

export function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false 
  return ctx
}
