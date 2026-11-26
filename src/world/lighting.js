import { palette } from "../core/palette.js";
import { withAlpha } from "./mapRenderer.js";

export function createLighting(w, h) {
  const layer = document.createElement("canvas");
  layer.width = w;
  layer.height = h;
  const g = layer.getContext("2d");

  return {
    render(ctx, cam, lights, darkness = 0.93) {
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, w, h);
      g.fillStyle = `rgba(10, 12, 10, ${darkness})`;
      g.fillRect(0, 0, w, h);

      g.globalCompositeOperation = "destination-out";
      for (const l of lights) {
        const x = l.x - cam.x;
        const y = l.y - cam.y;
        if (
          x < -l.radius ||
          y < -l.radius ||
          x > w + l.radius ||
          y > h + l.radius
        )
          continue;
        const grad = g.createRadialGradient(x, y, 0, x, y, l.radius);
        grad.addColorStop(0, `rgba(0,0,0,${l.strength})`);
        grad.addColorStop(0.6, `rgba(0,0,0,${l.strength * 0.6})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        if (l.cone) {
          g.beginPath();
          g.moveTo(l.cone[0][0] - cam.x, l.cone[0][1] - cam.y);
          for (let k = 1; k < l.cone.length; k++)
            g.lineTo(l.cone[k][0] - cam.x, l.cone[k][1] - cam.y);
          g.closePath();
          g.fill();
        } else {
          g.fillRect(x - l.radius, y - l.radius, l.radius * 2, l.radius * 2);
        }
      }

      ctx.drawImage(layer, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const l of lights) {
        if (!l.colour) continue;
        const x = l.x - cam.x;
        const y = l.y - cam.y;
        if (
          x < -l.radius ||
          y < -l.radius ||
          x > w + l.radius ||
          y > h + l.radius
        )
          continue;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, l.radius * 0.8);
        grad.addColorStop(
          0,
          withAlpha(palette.get(l.colour), 0.16 * l.strength),
        );
        grad.addColorStop(1, withAlpha(palette.get(l.colour), 0));
        ctx.fillStyle = grad;
        ctx.fillRect(x - l.radius, y - l.radius, l.radius * 2, l.radius * 2);
      }
      ctx.restore();
    },
  };
}
