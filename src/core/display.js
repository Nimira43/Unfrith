// Scales the fixed 1280 × 720 frame (canvas + taskbar) to fit the window,
// keeping the 16:9 aspect ratio.

export const FRAME_W = 1280
export const FRAME_H = 720
export const TILE = 16

export function fitFrame(frameEl) {
  const resize = () => {
    const scale = Math.min(
      window.innerWidth / FRAME_W,
      window.innerHeight / FRAME_H,
    )
    frameEl.style.setProperty('--scale', scale.toString())
  }
  window.addEventListener('resize', resize)
  resize()
}

export function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false // keep 16 px tiles crisp
  return ctx
}
