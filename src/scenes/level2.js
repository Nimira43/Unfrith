import { TILE } from "../core/display.js";
import { input } from "../core/input.js";
import { palette, fonts } from "../core/palette.js";
import { createCamera } from "../core/camera.js";
import { sfx, weather } from "../core/audio.js";
import { noise } from "../systems/noise.js";
import { gameState } from "../systems/gameState.js";
import { EVIDENCE, LEVEL2_EVIDENCE } from "../data/evidence.js";
import { generateValidCountry } from "../world/countryGen.js";
import { createCountryRenderer } from "../world/countryRenderer.js";
import { createLighting } from "../world/lighting.js";
import { withAlpha } from "../world/mapRenderer.js";
import { tileCentre, toTile } from "../world/tilemap.js";
import { T } from "../world/tiles.js";
import { conePoints } from "../ai/vision.js";
import { createPlayer, MAX_STONES } from "../entities/player.js";
import { createGuard, CATCH_DISTANCE } from "../entities/guard.js";
import { createVehicle, VEHICLE_CATCH } from "../entities/vehicle.js";
import { createStone, throwTarget } from "../entities/stone.js";
import { modal } from "../ui/modal.js";
import { fractureSVG, fractureSummary } from "../ui/fractureView.js";

const VIEW_W = 1280;
const VIEW_H = 640;
const REACH = 16;
const DAWN_TIME = 330;
const NIGHT_DARK = 0.84;
const TORCH_RANGE = 150;

const CAPTURE_LINES = [
  "Headlights. Doors. Hands on your collar, face down in the wet grass.",
  "A torch beam, a shout, and the long ride back to the city.",
  "The rain hid your footsteps. It could not hide you.",
];
const DAWN_LINE =
  "The sky greys over the fields. There is nowhere left to hide.";

export function createLevel2({
  taskbar,
  onExit,
  seed = (Math.random() * 2 ** 31) >>> 0,
}) {
  const level = generateValidCountry(seed);
  const { map } = level;
  const renderer = createCountryRenderer(level);
  const lighting = createLighting(VIEW_W, VIEW_H);
  const cam = createCamera(VIEW_W, VIEW_H);

  const player = createPlayer(
    tileCentre(level.start.tx),
    tileCentre(level.start.ty),
  );
  player.stones = Math.max(player.stones, 2);
  player.stepRadius = 2 * TILE; // the rain muffles footsteps
  const guards = level.guards.map((def) => createGuard(def));
  const vehicles = level.vehicles.map((def) => createVehicle(def));
  let stones = [];

  const evidence = level.evidence.map((e) => ({
    id: e.id,
    x: tileCentre(e.tx),
    y: tileCentre(e.ty),
  }));
  const rubble = level.rubble.map((r) => ({
    x: tileCentre(r.tx),
    y: tileCentre(r.ty),
    stones: r.stones,
  }));
  const checkpoints = level.checkpoints.map((c, k) => ({
    x: tileCentre(c.tx),
    y: tileCentre(c.ty),
    active: k === 0,
    remaining: DAWN_TIME,
  }));
  let checkpointIndex = 0;
  const farm = {
    x: tileCentre(level.exitTiles.tx),
    y: tileCentre(level.exitTiles.ty + 1),
  };

  let remaining = DAWN_TIME;
  let mode = "intro";
  let modeTime = 0;
  let time = 0;
  let captureLine = "";
  let banner = null;
  let prompt = null;

  let nextStrike = 8 + Math.random() * 6;
  let strikeT = -1;
  let flashId = 0;
  let foreFlicker = -1;

  const say = (text, seconds = 4, warning = false) => {
    banner = { text: text.toUpperCase(), t: seconds, warning };
  };

  if (import.meta.env.DEV) {
    window.__l2 = {
      level,
      map,
      player,
      guards,
      vehicles,
      evidence,
      checkpoints,
      mode: () => mode,
      remaining: () => remaining,
      setRemaining: (s) => (remaining = s),
      strikeNow: () => (nextStrike = 0.01),
    };
  }

  const countHere = () =>
    LEVEL2_EVIDENCE.filter((id) => gameState.hasEvidence(id)).length;
  const showEvidence = () => {
    const items = gameState.evidence
      .map((id) => {
        const e = EVIDENCE[id];
        const sent = gameState.leaked[id];
        return `<li><span class="doc-name">${e.number}. ${e.name}${sent ? ` <span class="stamp">— sent to ${sent === "Committee" ? "the Committee" : `the ${sent}`}</span>` : ""}</span><span class="doc-text">${e.text}</span></li>`;
      })
      .join("");
    modal.open(
      "Evidence",
      items
        ? `<ul>${items}</ul>`
        : '<p class="missing">You carry nothing yet.</p>',
    );
  };
  const showFracture = () => {
    modal.open(
      "The Fracture",
      `${fractureSVG()}<p>${fractureSummary()}</p><p>New documents can be pinned and leaked at the next safe house.</p>`,
    );
  };
  const showObjectives = () => {
    modal.open(
      "Objectives",
      `
      <p class="stamp">LEVEL 2 · THE COUNTRY ROADS</p>
      <ul>
        <li>Reach the <b>hideout farm</b> in the east before dawn. Follow the amber marker at the edge of the screen.</li>
        <li>Find the evidence out here (${countHere()}/3): at the CAP checkpoint, a burnt-out van, and a hunting lodge in the woods.</li>
        <li><b>Forest</b> hides you but slows you. <b>Roads</b> are fast but watched. The river can be crossed at the bridges, or somewhere quieter in the woods.</li>
        <li><b>Lightning</b> shows everything to everyone. When the sky flickers, get into cover.</li>
        <li>As dawn comes, the dark thins and they see further.</li>
      </ul>`,
    );
  };
  const showPause = () => {
    modal.open(
      "Paused",
      `
      <ul>
        <li><kbd>W A S D</kbd> or arrow keys: move · <kbd>Shift</kbd>: sneak</li>
        <li><kbd>E</kbd>: take · <kbd>Click</kbd>: throw a stone</li>
        <li>Keep still or sneak in a <b>thicket</b> to hide. The rain muffles your footsteps.</li>
      </ul>
      <p class="missing">Countryside layout ${level.seed}</p>`,
      { closeLabel: "Resume" },
    );
  };

  function restart() {
    const c = checkpoints[checkpointIndex];
    player.x = c.x;
    player.y = c.y;
    remaining = Math.max(c.remaining, 120);
    stones = [];
    guards.forEach((g) => {
      g.reset();
      if (Math.hypot(g.x - c.x, g.y - c.y) < TILE * 12) g.wait = 4;
    });
    vehicles.forEach((v) => v.reset());
    cam.follow(player, map.pxW, map.pxH, 0, true);
    mode = "play";
    say("The rain closes over your tracks.");
  }

  function capture(line) {
    mode = "capture";
    modeTime = 0;
    captureLine = line;
    sfx.capture();
    cam.shake = 6;
  }

  function darkness() {
    const p = 1 - remaining / DAWN_TIME;
    let d = NIGHT_DARK;
    if (p > 0.6) d -= ((p - 0.6) / 0.4) * 0.52;
    if (
      foreFlicker >= 0 &&
      (foreFlicker < 0.06 || (foreFlicker > 0.2 && foreFlicker < 0.25))
    )
      d = Math.min(d, 0.78);
    if (strikeT >= 0) {
      const t = strikeT;
      const f =
        t < 0.08
          ? 0.04
          : t < 0.15
            ? 0.5
            : t < 0.26
              ? 0.08
              : 0.08 + ((t - 0.26) / 0.3) * (d - 0.08);
      d = Math.min(d, f);
    }
    return Math.max(0, d);
  }

  function viewMul() {
    const p = 1 - remaining / DAWN_TIME;
    return 1 + Math.max(0, (p - 0.6) / 0.4) * 0.7;
  }

  function world() {
    return {
      map,
      player,
      noises: noise.list(),
      viewMul: viewMul(),
      coverAt: (x, y) => map.coverAt(toTile(x), toTile(y)),
      flashId: strikeT >= 0 && strikeT < 0.3 ? flashId : 0,
      onSuspicious(g) {
        if (!g._wasSuspicious) sfx.suspicious();
        g._wasSuspicious = true;
      },
      onAlert(alerted) {
        sfx.alert();
        say("Movement in the fields! All units!", 3, true);
        for (const g of guards) {
          if (
            g !== alerted &&
            g.state !== "alert" &&
            alerted.lastSeen &&
            Math.hypot(g.x - alerted.x, g.y - alerted.y) < TILE * 16
          ) {
            g.investigate(map, alerted.lastSeen.x, alerted.lastSeen.y);
            g.suspicion = Math.max(g.suspicion, 0.5);
          }
        }
      },
      onSpot(v) {
        sfx.alert();
        say("Patrol vehicle reports movement. Units respond.", 3, true);
        for (const g of guards) {
          if (
            g.state !== "alert" &&
            v.lastSeen &&
            Math.hypot(g.x - v.x, g.y - v.y) < TILE * 30
          ) {
            g.investigate(map, v.lastSeen.x, v.lastSeen.y);
            g.suspicion = Math.max(g.suspicion, 0.6);
          }
        }
      },
    };
  }

  return {
    enter() {
      taskbar.mode("game");
      taskbar.showBell(true);
      taskbar.enable("fracture", gameState.boardUnlocked);
      taskbar.on("evidence", showEvidence);
      taskbar.on("fracture", showFracture);
      taskbar.on("objectives", showObjectives);
      taskbar.on("pause", showPause);
      cam.follow(player, map.pxW, map.pxH, 0, true);
      weather.startRain();
    },

    exit() {
      weather.stopRain();
    },

    update(dt) {
      time += dt;
      modeTime += dt;
      taskbar.update(dt);
      renderer.updateRain(dt);
      if (modal.isOpen) return;
      if (banner && (banner.t -= dt) <= 0) banner = null;

      if (mode === "intro") {
        cam.follow(player, map.pxW, map.pxH, dt);
        if (input.wasPressed("enter")) {
          mode = "play";
          say("Curfew extends to the countryside. Patrols active.");
        }
        return;
      }
      if (mode === "capture") {
        if (modeTime > 1.2 && input.wasPressed("enter")) restart();
        return;
      }
      if (mode === "complete") {
        if (modeTime > 1 && input.wasPressed("enter")) onExit();
        return;
      }

      if (input.wasPressed("escape", "p")) {
        showPause();
        return;
      }

      remaining -= dt;
      if (remaining <= 0) {
        remaining = 0;
        capture(DAWN_LINE);
        return;
      }
      if (Math.abs(remaining - 90) < dt)
        say("The sky is lightening. Hurry.", 4, true);

      nextStrike -= dt;
      if (nextStrike <= 1.1 && foreFlicker < 0) foreFlicker = 0;
      if (foreFlicker >= 0) foreFlicker += dt;
      if (nextStrike <= 0) {
        flashId++;
        strikeT = 0;
        foreFlicker = -1;
        nextStrike = 9 + Math.random() * 8;
        const delay = 0.2 + Math.random() * 1.4;
        weather.thunder(delay, delay < 0.6);
        cam.shake = 2;
      }
      if (strikeT >= 0) {
        strikeT += dt;
        if (strikeT > 0.6) strikeT = -1;
      }

      player.update(dt, map);

      const m = input.mouse;
      if (m.clicked && player.stones > 0) {
        const aim = cam.toWorld(m.x, m.y);
        const land = throwTarget(map, player.x, player.y, aim.x, aim.y);
        stones.push(createStone(player.x, player.y, land.x, land.y));
        player.stones--;
        sfx.throw();
      }
      stones.forEach((s) => s.update(dt));
      stones = stones.filter((s) => !s.done);

      const w = world();
      for (const g of guards) {
        g.update(dt, w);
        if (g.state === "patrol" || g.state === "return")
          g._wasSuspicious = false;
      }
      for (const v of vehicles) v.update(dt, w);
      noise.clear();

      for (const g of guards) {
        if (
          g.state === "alert" &&
          Math.hypot(g.x - player.x, g.y - player.y) < CATCH_DISTANCE
        ) {
          capture(
            CAPTURE_LINES[Math.floor(Math.random() * CAPTURE_LINES.length)],
          );
          return;
        }
      }
      for (const v of vehicles) {
        if (Math.hypot(v.x - player.x, v.y - player.y) < VEHICLE_CATCH) {
          capture(
            "Brakes on wet tarmac. Doors. You never even heard the engine.",
          );
          return;
        }
      }

      prompt = null;
      for (const e of evidence) {
        if (
          gameState.hasEvidence(e.id) ||
          Math.hypot(e.x - player.x, e.y - player.y) >= REACH
        )
          continue;
        prompt = { x: e.x, y: e.y, text: "E — take document" };
        if (input.wasPressed("e")) {
          gameState.addEvidence(e.id);
          sfx.pickup();
          say(`Evidence found: ${EVIDENCE[e.id].name}`, 4, true);
        }
      }
      for (const r of rubble) {
        if (
          r.stones <= 0 ||
          Math.hypot(r.x - player.x, r.y - player.y) >= REACH
        )
          continue;
        const full = player.stones >= MAX_STONES;
        prompt = {
          x: r.x,
          y: r.y,
          text: full ? "Pockets full" : "E — take stones",
        };
        if (!full && input.wasPressed("e")) {
          const take = Math.min(r.stones, MAX_STONES - player.stones);
          r.stones -= take;
          player.stones += take;
          sfx.pickup();
        }
      }
      if (!prompt && map.isHiding(toTile(player.x), toTile(player.y))) {
        prompt = {
          x: player.x,
          y: player.y,
          text: player.hidden ? "Hidden" : "Keep still to hide",
        };
      }

      checkpoints.forEach((c, k) => {
        if (
          k > checkpointIndex &&
          Math.hypot(c.x - player.x, c.y - player.y) < REACH + 4
        ) {
          checkpointIndex = k;
          c.active = true;
          c.remaining = remaining;
          sfx.checkpoint();
          say(
            "A friend’s chalk mark on a stone. If caught, you start here.",
            4,
            true,
          );
        }
      });

      if (map.get(toTile(player.x), toTile(player.y)) === T.EXIT) {
        mode = "complete";
        modeTime = 0;
        sfx.checkpoint();
      }

      cam.follow(player, map.pxW, map.pxH, dt);

      const anyAlert =
        guards.some((g) => g.state === "alert") ||
        vehicles.some((v) => v.state === "stopped");
      const anySus =
        guards.some((g) => g.state === "suspicious" || g.state === "search") ||
        vehicles.some((v) => v.suspicion > 0.3);
      taskbar.alert(
        anyAlert
          ? "alerted"
          : anySus
            ? "suspicious"
            : player.hidden
              ? "hidden"
              : "unseen",
      );
      taskbar.evidence(gameState.evidence.length, 6);
      taskbar.stones(player.stones, MAX_STONES);
      taskbar.timer("Dawn", remaining);
    },

    render(ctx) {
      const off = cam.offset();
      const view = { x: off.x, y: off.y, viewW: VIEW_W, viewH: VIEW_H };

      renderer.drawBase(ctx, view);
      for (const c of checkpoints)
        drawChalk(ctx, c.x - view.x, c.y - view.y, c.active);
      for (const r of rubble)
        if (r.stones > 0) drawRubble(ctx, r.x - view.x, r.y - view.y, r.stones);
      for (const e of evidence)
        if (!gameState.hasEvidence(e.id))
          drawDocument(ctx, e.x - view.x, e.y - view.y, time);
      stones.forEach((s) => s.draw(ctx, view));
      for (const g of guards) g.drawCone(ctx, view, map);
      for (const v of vehicles) v.draw(ctx, view, time);
      for (const g of guards) g.draw(ctx, view, time);
      player.draw(ctx, view, time);

      const lights = [
        { x: player.x, y: player.y, radius: 140, strength: 0.85 },
      ];
      for (const g of guards) {
        const range = g.viewRange ?? TORCH_RANGE;
        lights.push({
          x: g.x,
          y: g.y,
          radius: range,
          strength: 1,
          colour: "searchlight",
          cone: conePoints(map, g, range, 14),
        });
        lights.push({ x: g.x, y: g.y, radius: 24, strength: 0.5 });
      }
      for (const v of vehicles) lights.push(...v.lights(map));
      for (const l of level.lights) {
        const f = l.flicker
          ? 0.7 + Math.sin(time * 11 + Math.sin(time * 3)) * 0.25
          : 1;
        lights.push({
          x: tileCentre(l.tx),
          y: tileCentre(l.ty),
          radius: l.radius,
          strength: l.strength * f,
          colour: l.colour,
        });
      }
      for (const e of evidence) {
        if (!gameState.hasEvidence(e.id))
          lights.push({
            x: e.x,
            y: e.y,
            radius: 34,
            strength: 0.6,
            colour: "resistance-amber",
          });
      }
      const dark = darkness();
      lighting.render(ctx, view, lights, dark);

      const p = 1 - remaining / DAWN_TIME;
      if (p > 0.6) {
        ctx.fillStyle = `rgba(120, 132, 146, ${((p - 0.6) / 0.4) * 0.16})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      if (strikeT >= 0 && strikeT < 0.12) {
        ctx.fillStyle = withAlpha(palette.get("lightning"), 0.22);
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      renderer.drawRain(ctx, strikeT >= 0 && strikeT < 0.3);

      drawFarmMarker(ctx, view);

      if (
        mode === "play" &&
        input.mouse.inside &&
        player.stones > 0 &&
        !modal.isOpen
      ) {
        const aim = cam.toWorld(input.mouse.x, input.mouse.y);
        const land = throwTarget(map, player.x, player.y, aim.x, aim.y);
        ctx.save();
        ctx.strokeStyle = withAlpha(palette.get("concrete-300"), 0.45);
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(player.x - view.x, player.y - view.y);
        ctx.lineTo(land.x - view.x, land.y - view.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(land.x - view.x, land.y - view.y, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (prompt && mode === "play") {
        ctx.font = `14px ${fonts.mono}`;
        ctx.textAlign = "center";
        ctx.fillStyle = palette.get("paper");
        ctx.fillText(prompt.text, prompt.x - view.x, prompt.y - view.y - 16);
      }

      if (banner && mode === "play") drawBanner(ctx);
      if (mode === "intro") drawIntro(ctx);
      if (mode === "capture") drawCapture(ctx);
      if (mode === "complete") drawComplete(ctx);
    },
  };

  function drawFarmMarker(ctx, view) {
    const fx = farm.x - view.x;
    const fy = farm.y - view.y;
    if (fx > 0 && fx < VIEW_W && fy > 0 && fy < VIEW_H) return;
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    const a = Math.atan2(fy - cy, fx - cx);
    const k = Math.min(
      (VIEW_W / 2 - 28) / Math.abs(Math.cos(a) || 1e-6),
      (VIEW_H / 2 - 28) / Math.abs(Math.sin(a) || 1e-6),
    );
    const x = cx + Math.cos(a) * k;
    const y = cy + Math.sin(a) * k;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.globalAlpha = 0.65 + Math.sin(time * 3) * 0.2;
    ctx.fillStyle = palette.get("resistance-amber");
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBanner(ctx) {
    const a = Math.min(1, banner.t * 2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `18px ${fonts.mono}`;
    const w = ctx.measureText(banner.text).width + 64;
    const x = (VIEW_W - w) / 2;
    ctx.fillStyle = "rgba(28,29,27,0.85)";
    ctx.fillRect(x, 16, w, 40);
    ctx.fillStyle = palette.get(
      banner.warning ? "resistance-amber" : "regime-red",
    );
    ctx.fillRect(x, 16, 4, 40);
    ctx.fillRect(x + w - 4, 16, 4, 40);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(banner.text, VIEW_W / 2, 37);
    ctx.restore();
  }

  function card(ctx, alpha = 0.85) {
    ctx.fillStyle = `rgba(28,29,27,${alpha})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
  }

  function drawIntro(ctx) {
    card(ctx);
    ctx.fillStyle = palette.get("paper-dim");
    ctx.font = `18px ${fonts.mono}`;
    ctx.fillText("LEVEL 2", VIEW_W / 2, 160);
    ctx.fillStyle = palette.get("paper");
    ctx.font = `700 76px ${fonts.title}`;
    ctx.fillText("The Country Roads", VIEW_W / 2, 240);
    ctx.font = `italic 500 28px ${fonts.main}`;
    ctx.fillStyle = palette.get("paper-dim");
    ctx.fillText(
      "Reach the hideout farm in the east before dawn.",
      VIEW_W / 2,
      300,
    );
    ctx.font = `500 22px ${fonts.main}`;
    ctx.fillStyle = palette.get("paper");
    const lines = [
      "Forest hides you but slows you. Roads are fast, and watched.",
      "Lightning shows everything, to everyone. When the sky flickers, get into cover.",
    ];
    lines.forEach((l, k) => ctx.fillText(l, VIEW_W / 2, 370 + k * 34));
    blink(ctx, "PRESS ENTER", 490);
  }

  function drawCapture(ctx) {
    const a = Math.min(1, modeTime / 0.8);
    card(ctx, 0.9 * a);
    ctx.globalAlpha = a;
    ctx.fillStyle = palette.get("regime-red");
    ctx.font = `700 64px ${fonts.title}`;
    ctx.fillText(
      captureLine === DAWN_LINE ? "Dawn" : "Detained",
      VIEW_W / 2,
      260,
    );
    ctx.fillStyle = palette.get("paper");
    ctx.font = `italic 500 30px ${fonts.main}`;
    ctx.fillText(captureLine, VIEW_W / 2, 320);
    ctx.globalAlpha = 1;
    if (modeTime > 1.2)
      blink(ctx, "PRESS ENTER — RETURN TO THE LAST CHALK MARK", 440);
  }

  function drawComplete(ctx) {
    const a = Math.min(1, modeTime / 0.8);
    card(ctx, 0.9 * a);
    ctx.globalAlpha = a;
    ctx.fillStyle = palette.get("resistance-amber");
    ctx.font = `700 64px ${fonts.title}`;
    ctx.fillText("The Farm", VIEW_W / 2, 230);
    ctx.fillStyle = palette.get("paper");
    ctx.font = `italic 500 28px ${fonts.main}`;
    ctx.fillText(
      "A door opens before you knock. Warmth, and the smell of wet dogs.",
      VIEW_W / 2,
      290,
    );
    ctx.font = `20px ${fonts.mono}`;
    const m = Math.floor(remaining / 60);
    const s = String(Math.floor(remaining % 60)).padStart(2, "0");
    ctx.fillText(
      `EVIDENCE FOUND HERE: ${countHere()} OF 3    ·    DARKNESS TO SPARE: ${m}:${s}`,
      VIEW_W / 2,
      350,
    );
    ctx.fillStyle = palette.get("paper-dim");
    ctx.font = `italic 500 24px ${fonts.main}`;
    ctx.fillText(
      "Safe Passage II, back to the base, is not built yet.",
      VIEW_W / 2,
      395,
    );
    ctx.globalAlpha = 1;
    if (modeTime > 1) blink(ctx, "PRESS ENTER", 480);
  }

  function blink(ctx, text, y) {
    if (Math.sin(time * 4) > -0.4) {
      ctx.fillStyle = palette.get("resistance-amber");
      ctx.font = `20px ${fonts.mono}`;
      ctx.fillText(text, VIEW_W / 2, y);
    }
  }
}

function drawChalk(ctx, x, y, active) {
  ctx.save();
  ctx.globalAlpha = active ? 0.9 : 0.45;
  ctx.fillStyle = palette.get("concrete-500");
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.get(active ? "resistance-amber" : "paper");
  ctx.font = `700 11px ${fonts.title}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("þ", x, y + 1);
  ctx.restore();
}

function drawRubble(ctx, x, y, n) {
  ctx.fillStyle = palette.get("concrete-500");
  const bits = [
    [-4, 1],
    [-1, -2],
    [2, 0],
    [0, 3],
    [4, 2],
    [-3, 4],
  ];
  bits
    .slice(0, 3 + n)
    .forEach(([bx, by]) =>
      ctx.fillRect(Math.round(x + bx) - 1, Math.round(y + by) - 1, 3, 2),
    );
}

function drawDocument(ctx, x, y, time) {
  const pulse = 0.35 + Math.sin(time * 3) * 0.15;
  const glow = ctx.createRadialGradient(x, y, 1, x, y, 16);
  glow.addColorStop(0, withAlpha(palette.get("resistance-amber"), pulse));
  glow.addColorStop(1, withAlpha(palette.get("resistance-amber"), 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - 16, y - 16, 32, 32);
  ctx.fillStyle = palette.get("paper");
  ctx.fillRect(Math.round(x) - 4, Math.round(y) - 5, 8, 10);
  ctx.fillStyle = palette.get("concrete-500");
  for (let k = 0; k < 3; k++)
    ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3 + k * 3, 6, 1);
}
