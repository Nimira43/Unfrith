let current = null;

export const scenes = {
  switchTo(scene) {
    current?.exit?.();
    current = scene;
    current?.enter?.();
  },
  update(dt) {
    current?.update?.(dt);
  },
  render(ctx) {
    current?.render?.(ctx);
  },
};
