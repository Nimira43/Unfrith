const STEP = 1 / 60;

export function startLoop({ update, render }) {
  let last = performance.now();
  let acc = 0;

  const frame = (now) => {
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
