// Fixed-step game loop: update runs at a steady 60 Hz, render runs every frame.

const STEP = 1 / 60

export function startLoop({ update, render }) {
  let last = performance.now()
  let acc = 0

  const frame = (now) => {
    acc += Math.min((now - last) / 1000, 0.25) // clamp after tab switches
    last = now
    while (acc >= STEP) {
      update(STEP)
      acc -= STEP
    }
    render()
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}
