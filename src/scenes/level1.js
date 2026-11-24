import { TILE } from '../core/display.js'
import { input } from '../core/input.js'
import { palette, fonts } from '../core/palette.js'
import { createCamera } from '../core/camera.js'
import { sfx } from '../core/audio.js'
import { noise } from '../systems/noise.js'
import { gameState } from '../systems/gameState.js'
import { EVIDENCE, LEVEL1_EVIDENCE } from '../data/evidence.js'
import { generateValidCity } from '../world/cityGen.js'
import { createMapRenderer, withAlpha } from '../world/mapRenderer.js'
import { tileCentre, toTile } from '../world/tilemap.js'
import { T } from '../world/tiles.js'
import { createPlayer, MAX_STONES } from '../entities/player.js'
import { createGuard, CATCH_DISTANCE } from '../entities/guard.js'
import { createStone, throwTarget } from '../entities/stone.js'
import { modal } from '../ui/modal.js'

const VIEW_W = 1280
const VIEW_H = 640
const BELL_INTERVAL = 22
const BELL_WARNING = 4
const REACH = 14

const CAPTURE_LINES = [
  'The cell door slams. You hear the key turn.',
  'A hand on your collar. A voice in your ear: “You! Stop!”',
  'Boots on wet stone. A torch in your eyes. Then nothing.',
  'They do not ask your name. They do not need to.',
]

export function createLevel1({
  taskbar,
  onExit,
  seed = (Math.random() * 2 ** 31) >>> 0,
}) {
  const level = generateValidCity(seed)
  const { map } = level
  const renderer = createMapRenderer(level)
  const cam = createCamera(VIEW_W, VIEW_H)

  const player = createPlayer(
    tileCentre(level.start.tx),
    tileCentre(level.start.ty),
  )
  const guards = level.guards.map((def) => createGuard(def))
  let stones = []

  const evidence = level.evidence.map((pos, k) => ({
    id: LEVEL1_EVIDENCE[k],
    x: tileCentre(pos.tx),
    y: tileCentre(pos.ty),
  }))
  const rubble = level.rubble.map((r) => ({
    x: tileCentre(r.tx),
    y: tileCentre(r.ty),
    stones: r.stones,
  }))
  const checkpoints = level.checkpoints.map((c, k) => ({
    x: tileCentre(c.tx),
    y: tileCentre(c.ty),
    active: k === 0,
  }))
  let checkpointIndex = 0

  let phase = 0
  let bellTimer = BELL_INTERVAL
  let warned = false
  let lastWarnSecond = -1

  let mode = 'intro'
  let modeTime = 0
  let captureLine = ''
  let time = 0
  let prompt = null
  let banner = null

  const say = (text, seconds = 4, warning = false) => {
    banner = { text: text.toUpperCase(), t: seconds, warning }
  }

  map.applyPhase(phase)

  if (import.meta.env.DEV) {
    window.__level1 = {
      level,
      map,
      player,
      guards,
      checkpoints,
      evidence,
      bellSoon: () => (bellTimer = BELL_WARNING + 0.5),
      mode: () => mode,
    }
  }

  const showEvidence = () => {
    const items = LEVEL1_EVIDENCE.map((id) => {
      const e = EVIDENCE[id]
      return gameState.hasEvidence(id)
        ? `<li><span class='doc-name'>${e.number}. ${e.name}</span><span class='doc-text'>${e.text}</span></li>`
        : `<li class='missing'>Not yet found</li>`
    }).join('')
    modal.open(
      'Evidence',
      `<p>Documents carried out of the city.</p><ul>${items}</ul>`,
    )
  }
  const showObjectives = () => {
    modal.open(
      'Objectives',
      `
      <p class='stamp'>LEVEL 1 · THE CITY MAZE</p>
      <ul>
        <li>Escape the city through the gate in the <b>east wall</b>.</li>
        <li>Find the evidence hidden in the city (${countFound()}/3). Optional, but the resistance needs it.</li>
        <li>When the curfew bell rings, the walls move. Walls about to move <b>flicker red</b>.</li>
        <li>Chalk marks on the ground are <b>checkpoints</b>.</li>
      </ul>`,
    )
  }
  const showPause = () => {
    modal.open(
      'Paused',
      `
      <ul>
        <li><kbd>W A S D</kbd> or arrow keys: move</li>
        <li><kbd>Shift</kbd>: sneak (silent, slower)</li>
        <li><kbd>E</kbd>: take evidence or stones</li>
        <li><kbd>Click</kbd>: throw a stone where you aim</li>
        <li>Keep still or sneak in a <b>doorway</b> to hide</li>
        <li><kbd>Esc</kbd>: pause</li>
      </ul>
      <p class='missing'>City layout ${level.seed}</p>`,
      { closeLabel: 'Resume' },
    )
  }

  function countFound() {
    return LEVEL1_EVIDENCE.filter((id) => gameState.hasEvidence(id)).length
  }

  function pushOutOfWalls() {
    if (map.boxHitsSolid(player.x, player.y, player.hw, player.hh)) {
      const t = map.nearestOpen(toTile(player.x), toTile(player.y))
      player.x = tileCentre(t.tx)
      player.y = tileCentre(t.ty)
    }
    for (const g of guards) {
      if (map.isSolid(toTile(g.x), toTile(g.y))) {
        const t = map.nearestOpen(toTile(g.x), toTile(g.y))
        g.x = tileCentre(t.tx)
        g.y = tileCentre(t.ty)
      }
      g.path = []
    }
  }

  function restartFromCheckpoint() {
    const c = checkpoints[checkpointIndex]
    player.x = c.x
    player.y = c.y
    player.stones = Math.max(player.stones, 2)
    stones = []
    guards.forEach((g) => g.reset())

    for (const g of guards) {
      if (Math.hypot(g.x - c.x, g.y - c.y) < TILE * 10) g.wait = 4
    }
    pushOutOfWalls()
    cam.follow(player, map.pxW, map.pxH, 0, true)
    mode = 'play'
    say('Return to your posts. Nothing happened here.')
  }

  function ringBell() {
    phase = (phase + 1) % level.phases
    const changed = map.applyPhase(phase)
    sfx.bell()
    if (changed.length) sfx.grind()
    cam.shake = 5
    pushOutOfWalls()
    say('The bell tolls. The city is reordered.')
  }

  function world() {
    return {
      map,
      player,
      noises: noise.list(),
      onSuspicious(g) {
        if (!g._wasSuspicious) sfx.suspicious()
        g._wasSuspicious = true
      },
      onAlert(alerted) {
        sfx.alert()
        say('Disturbance reported. All officers respond.', 3, true)

        for (const g of guards) {
          if (g === alerted || g.state === 'alert') continue
          if (
            Math.hypot(g.x - alerted.x, g.y - alerted.y) < TILE * 12 &&
            alerted.lastSeen
          ) {
            g.investigate(map, alerted.lastSeen.x, alerted.lastSeen.y)
            g.suspicion = Math.max(g.suspicion, 0.5)
          }
        }
      },
    }
  }

  return {
    enter() {
      taskbar.mode('game')
      taskbar.on('evidence', showEvidence)
      taskbar.on('objectives', showObjectives)
      taskbar.on('pause', showPause)
      taskbar.enable('fracture', false)
      taskbar.showBell(true)
      cam.follow(player, map.pxW, map.pxH, 0, true)
    },

    exit() {},

    update(dt) {
      time += dt
      modeTime += dt
      taskbar.update(dt)
      if (modal.isOpen) return
      if (banner && (banner.t -= dt) <= 0) banner = null

      if (mode === 'intro') {
        cam.follow(player, map.pxW, map.pxH, dt)
        if (input.wasPressed('enter')) {
          mode = 'play'
          say('Curfew is in force. Remain indoors.')
        }
        return
      }

      if (mode === 'capture') {
        if (modeTime > 1.2 && input.wasPressed('enter'))
          restartFromCheckpoint()
        return
      }

      if (mode === 'complete') {
        if (modeTime > 1 && input.wasPressed('enter')) onExit()
        return
      }

      if (input.wasPressed('escape', 'p')) {
        showPause()
        return
      }

      bellTimer -= dt
      if (bellTimer <= BELL_WARNING && !warned) {
        warned = true
        map.warnPhase((phase + 1) % level.phases)
        say(
          'Curfew bell imminent. Stand clear of the barriers.',
          BELL_WARNING,
          true,
        )
        taskbar.announce('Bell imminent', BELL_WARNING, true)
      }
      if (warned) {
        const s = Math.ceil(bellTimer)
        if (s !== lastWarnSecond && s > 0) {
          lastWarnSecond = s
          sfx.warn()
        }
      }
      if (bellTimer <= 0) {
        ringBell()
        bellTimer = BELL_INTERVAL
        warned = false
        lastWarnSecond = -1
      }

      player.update(dt, map)

      const m = input.mouse
      if (m.clicked && player.stones > 0) {
        const aim = cam.toWorld(m.x, m.y)
        const land = throwTarget(map, player.x, player.y, aim.x, aim.y)
        stones.push(createStone(player.x, player.y, land.x, land.y))
        player.stones--
        sfx.throw()
      }
      stones.forEach((s) => s.update(dt))
      stones = stones.filter((s) => !s.done)

      const w = world()
      for (const g of guards) {
        g.update(dt, w)
        if (g.state === 'patrol' || g.state === 'return')
          g._wasSuspicious = false
      }
      noise.clear()

      for (const g of guards) {
        if (
          g.state === 'alert' &&
          Math.hypot(g.x - player.x, g.y - player.y) < CATCH_DISTANCE
        ) {
          mode = 'capture'
          modeTime = 0
          captureLine =
            CAPTURE_LINES[Math.floor(Math.random() * CAPTURE_LINES.length)]
          sfx.capture()
          cam.shake = 6
          break
        }
      }

      prompt = null
      for (const e of evidence) {
        if (gameState.hasEvidence(e.id)) continue
        if (Math.hypot(e.x - player.x, e.y - player.y) < REACH) {
          prompt = { x: e.x, y: e.y, text: 'E — take document' }
          if (input.wasPressed('e')) {
            gameState.addEvidence(e.id)
            sfx.pickup()
            say(`Evidence found: ${EVIDENCE[e.id].name}`, 4, true)
          }
        }
      }
      for (const r of rubble) {
        if (r.stones <= 0) continue
        if (Math.hypot(r.x - player.x, r.y - player.y) < REACH) {
          const full = player.stones >= MAX_STONES
          prompt = {
            x: r.x,
            y: r.y,
            text: full ? 'Pockets full' : 'E — take stones',
          }
          if (!full && input.wasPressed('e')) {
            const take = Math.min(r.stones, MAX_STONES - player.stones)
            r.stones -= take
            player.stones += take
            sfx.pickup()
          }
        }
      }

      if (!prompt && map.isHiding(toTile(player.x), toTile(player.y))) {
        prompt = {
          x: player.x,
          y: player.y,
          text: player.hidden ? 'Hidden' : 'Keep still to hide',
        }
      }

      checkpoints.forEach((c, k) => {
        if (
          k > checkpointIndex &&
          Math.hypot(c.x - player.x, c.y - player.y) < REACH
        ) {
          checkpointIndex = k
          c.active = true
          sfx.checkpoint()
          say('A friend’s chalk mark. If caught, you start here.', 4, true)
        }
      })

      if (map.get(toTile(player.x), toTile(player.y)) === T.EXIT) {
        mode = 'complete'
        modeTime = 0
        sfx.checkpoint()
      }

      cam.follow(player, map.pxW, map.pxH, dt)

      const anyAlert = guards.some((g) => g.state === 'alert')
      const anySus = guards.some(
        (g) => g.state === 'suspicious' || g.state === 'search',
      )
      taskbar.alert(
        anyAlert
          ? 'alerted'
          : anySus
            ? 'suspicious'
            : player.hidden
              ? 'hidden'
              : 'unseen',
      )
      taskbar.evidence(countFound(), 3)
      taskbar.stones(player.stones, MAX_STONES)
      taskbar.bell(bellTimer)
    },

    render(ctx) {
      const off = cam.offset()
      const view = { x: off.x, y: off.y, viewW: VIEW_W, viewH: VIEW_H }

      renderer.drawBase(ctx, view)

      for (const c of checkpoints)
        drawChalk(ctx, c.x - view.x, c.y - view.y, c.active)
      for (const r of rubble)
        if (r.stones > 0) drawRubble(ctx, r.x - view.x, r.y - view.y, r.stones)
      for (const e of evidence) {
        if (!gameState.hasEvidence(e.id))
          drawDocument(ctx, e.x - view.x, e.y - view.y, time)
      }

      renderer.drawDynamic(ctx, view, time)
      for (const g of guards) g.drawCone(ctx, view, map)
      stones.forEach((s) => s.draw(ctx, view))
      for (const g of guards) g.draw(ctx, view, time)
      player.draw(ctx, view, time)
      renderer.drawLamps(ctx, view)

      const v = ctx.createRadialGradient(
        VIEW_W / 2,
        VIEW_H / 2,
        VIEW_H * 0.45,
        VIEW_W / 2,
        VIEW_H / 2,
        VIEW_W * 0.7,
      )
      v.addColorStop(0, 'rgba(28,29,27,0)')
      v.addColorStop(1, 'rgba(28,29,27,0.55)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, VIEW_W, VIEW_H)

      if (
        mode === 'play' &&
        input.mouse.inside &&
        player.stones > 0 &&
        !modal.isOpen
      ) {
        const aim = cam.toWorld(input.mouse.x, input.mouse.y)
        const land = throwTarget(map, player.x, player.y, aim.x, aim.y)
        ctx.save()
        ctx.strokeStyle = withAlpha(palette.get('concrete-300'), 0.45)
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(player.x - view.x, player.y - view.y)
        ctx.lineTo(land.x - view.x, land.y - view.y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(land.x - view.x, land.y - view.y, 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      if (prompt && mode === 'play') {
        ctx.font = `14px ${fonts.mono}`
        ctx.textAlign = 'center'
        ctx.fillStyle = palette.get('paper')
        ctx.fillText(prompt.text, prompt.x - view.x, prompt.y - view.y - 14)
      }

      if (banner && mode === 'play') drawBanner(ctx)

      if (mode === 'intro') drawIntro(ctx)
      if (mode === 'capture') drawCapture(ctx)
      if (mode === 'complete') drawComplete(ctx)
    },
  }

  function card(ctx, alpha = 0.82) {
    ctx.fillStyle = `rgba(28,29,27,${alpha})`
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
  }

  function drawIntro(ctx) {
    card(ctx)
    ctx.fillStyle = palette.get('paper-dim')
    ctx.font = `18px ${fonts.mono}`
    ctx.fillText('LEVEL 1', VIEW_W / 2, 170)
    ctx.fillStyle = palette.get('paper')
    ctx.font = `700 76px ${fonts.title}`
    ctx.fillText('The City Maze', VIEW_W / 2, 250)
    ctx.font = `italic 500 28px ${fonts.main}`
    ctx.fillStyle = palette.get('paper-dim')
    ctx.fillText(
      'Escape the city. When the curfew bells ring, the walls move.',
      VIEW_W / 2,
      310,
    )
    ctx.font = `500 22px ${fonts.main}`
    ctx.fillStyle = palette.get('paper')
    const lines = [
      'Move: W A S D or arrows    ·    Sneak: Shift    ·    Take: E',
      'Throw a stone: click where you aim    ·    Hide: keep still in a doorway',
    ]
    lines.forEach((l, k) => ctx.fillText(l, VIEW_W / 2, 390 + k * 34))
    blinkPrompt(ctx, 'PRESS ENTER', 500)
  }

  function drawCapture(ctx) {
    const a = Math.min(1, modeTime / 0.8)
    card(ctx, 0.9 * a)
    ctx.globalAlpha = a
    ctx.fillStyle = palette.get('regime-red')
    ctx.font = `700 64px ${fonts.title}`
    ctx.fillText('Detained', VIEW_W / 2, 260)
    ctx.fillStyle = palette.get('paper')
    ctx.font = `italic 500 30px ${fonts.main}`
    ctx.fillText(captureLine, VIEW_W / 2, 320)
    ctx.globalAlpha = 1
    if (modeTime > 1.2)
      blinkPrompt(ctx, 'PRESS ENTER — RETURN TO THE LAST CHALK MARK', 440)
  }

  function drawComplete(ctx) {
    const a = Math.min(1, modeTime / 0.8)
    card(ctx, 0.88 * a)
    ctx.globalAlpha = a
    ctx.fillStyle = palette.get('resistance-amber')
    ctx.font = `700 64px ${fonts.title}`
    ctx.fillText('Beyond the Wall', VIEW_W / 2, 240)
    ctx.fillStyle = palette.get('paper')
    ctx.font = `italic 500 30px ${fonts.main}`
    ctx.fillText(
      'You slip through the city gate and into the dark.',
      VIEW_W / 2,
      300,
    )
    ctx.font = `20px ${fonts.mono}`
    ctx.fillText(`EVIDENCE CARRIED: ${countFound()} OF 3`, VIEW_W / 2, 360)
    ctx.fillStyle = palette.get('paper-dim')
    ctx.font = `italic 500 24px ${fonts.main}`
    ctx.fillText(
      'Next: Safe Passage I. The tunnels, and the people waiting there.',
      VIEW_W / 2,
      400,
    )
    ctx.globalAlpha = 1
    if (modeTime > 1) blinkPrompt(ctx, 'PRESS ENTER', 480)
  }

  function drawBanner(ctx) {
    const a = Math.min(1, banner.t * 2)
    ctx.save()
    ctx.globalAlpha = a
    ctx.font = `18px ${fonts.mono}`
    const w = ctx.measureText(banner.text).width + 64
    const x = (VIEW_W - w) / 2
    ctx.fillStyle = 'rgba(28,29,27,0.85)'
    ctx.fillRect(x, 16, w, 40)
    ctx.fillStyle = palette.get(
      banner.warning ? 'resistance-amber' : 'regime-red',
    )
    ctx.fillRect(x, 16, 4, 40)
    ctx.fillRect(x + w - 4, 16, 4, 40)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(banner.text, VIEW_W / 2, 37)
    ctx.restore()
  }

  function blinkPrompt(ctx, text, y) {
    if (Math.sin(time * 4) > -0.4) {
      ctx.fillStyle = palette.get('resistance-amber')
      ctx.font = `20px ${fonts.mono}`
      ctx.fillText(text, VIEW_W / 2, y)
    }
  }
}

function drawChalk(ctx, x, y, active) {
  ctx.save()
  ctx.globalAlpha = active ? 0.9 : 0.4
  ctx.strokeStyle = palette.get(active ? 'resistance-amber' : 'paper-dim')
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, 7, 0, Math.PI * 2)
  ctx.stroke()
  ctx.font = `700 12px ${fonts.title}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = ctx.strokeStyle
  ctx.fillText('þ', x, y + 1)
  ctx.restore()
}

function drawRubble(ctx, x, y, n) {
  ctx.fillStyle = palette.get('concrete-500')
  const bits = [
    [-4, 1],
    [-1, -2],
    [2, 0],
    [0, 3],
    [4, 2],
    [-3, 4],
  ]
  bits
    .slice(0, 3 + n)
    .forEach(([bx, by]) =>
      ctx.fillRect(Math.round(x + bx) - 1, Math.round(y + by) - 1, 3, 2),
    )
  ctx.fillStyle = palette.get('concrete-300')
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2)
}

function drawDocument(ctx, x, y, time) {
  const pulse = 0.35 + Math.sin(time * 3) * 0.15
  const glow = ctx.createRadialGradient(x, y, 1, x, y, 16)
  glow.addColorStop(0, withAlpha(palette.get('resistance-amber'), pulse))
  glow.addColorStop(1, withAlpha(palette.get('resistance-amber'), 0))
  ctx.fillStyle = glow
  ctx.fillRect(x - 16, y - 16, 32, 32)
  ctx.fillStyle = palette.get('paper')
  ctx.fillRect(Math.round(x) - 4, Math.round(y) - 5, 8, 10)
  ctx.fillStyle = palette.get('concrete-500')
  for (let k = 0; k < 3; k++)
    ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3 + k * 3, 6, 1)
}
