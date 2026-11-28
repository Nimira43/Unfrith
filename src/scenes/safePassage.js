import { TILE } from '../core/display.js'
import { input } from '../core/input.js'
import { palette, fonts } from '../core/palette.js'
import { createCamera } from '../core/camera.js'
import { sfx } from '../core/audio.js'
import { noise } from '../systems/noise.js'
import { gameState } from '../systems/gameState.js'
import { brokenCount } from '../systems/fracture.js'
import { MEMBERS } from '../data/resistance.js'
import { EVIDENCE } from '../data/evidence.js'
import { generateTunnels, BASE } from '../world/tunnelGen.js'
import { createTunnelRenderer } from '../world/tunnelRenderer.js'
import { createLighting } from '../world/lighting.js'
import { withAlpha } from '../world/mapRenderer.js'
import { tileCentre, toTile } from '../world/tilemap.js'
import { T } from '../world/tiles.js'
import { conePoints } from '../ai/vision.js'
import { createPlayer, MAX_STONES } from '../entities/player.js'
import { createGuard, CATCH_DISTANCE } from '../entities/guard.js'
import { createStone, throwTarget } from '../entities/stone.js'
import { createMember } from '../entities/member.js'
import { modal } from '../ui/modal.js'
import { fractureSVG, fractureSummary } from '../ui/fractureView.js'

const VIEW_W = 1280
const VIEW_H = 640
const REACH = 20
const TORCH_RANGE = 150

const CAPTURE_LINES = [
  'A torch in your face. A boot on your back. Then the long walk up.',
  'Your footsteps echo once too often. They are waiting at the bend.',
  'The water was louder than you thought. Not loud enough.',
]

const DOOR_INSIDE = { x: 90.5, y: 24.5, idle: 'still' }
const NEWCOMER_WAIT = { x: 86.5, y: 24.5, idle: 'still' }
const NEWCOMER_HOME = { x: 82.5, y: 25.5, idle: 'still' }
const TABLE_SPOT = { tx: 71, ty: 21 }

export function createSafePassage({
  passage = 1,
  taskbar,
  board,
  onExit,
  seed = (Math.random() * 2 ** 31) >>> 0,
}) {
  const second = passage === 2
  const level = generateTunnels(
    seed,
    second ? { entry: 'south', patrols: 2 } : { entry: 'west', patrols: 1 },
  )
  const { map } = level
  const renderer = createTunnelRenderer(level)
  const lighting = createLighting(VIEW_W, VIEW_H)
  const cam = createCamera(VIEW_W, VIEW_H)

  const player = createPlayer(
    tileCentre(level.start.tx),
    tileCentre(level.start.ty),
  )
  player.stones = Math.max(player.stones, 2)
  const guards = level.guards.map((def) => createGuard(def))
  let stones = []
  const rubble = level.rubble.map((r) => ({
    x: tileCentre(r.tx),
    y: tileCentre(r.ty),
    stones: r.stones,
  }))

  const present = gameState.presentInPassage1()
  let members = present.map((id) => createMember(MEMBERS[id], level.homes[id]))
  const talked = new Set()

  const informantId = gameState.informant
  const newcomerId = gameState.newcomer
  // Passage I tells come from tell1; Passage II from tell2
  const tellOf = (id) => (second ? MEMBERS[id].tell2 : MEMBERS[id].tell1)
  const passage1Informant =
    !second && present.includes(informantId) ? informantId : null

  const boardSpot = {
    x: tileCentre(level.boardSpot.tx),
    y: tileCentre(level.boardSpot.ty),
  }
  const dropSpot = {
    x: tileCentre(level.decor.deadDrop.tx + 1),
    y: tileCentre(level.decor.deadDrop.ty),
  }
  const tableSpot = {
    x: tileCentre(TABLE_SPOT.tx),
    y: tileCentre(TABLE_SPOT.ty),
  }
  const baseEntry = { x: tileCentre(BASE.x + 1), y: player.y }

  let checkpoint = { x: player.x, y: player.y }
  let mode = 'intro' 
  let modeTime = 0
  let time = 0
  let inBase = false
  let arrivedAt = -1
  let boardVisited = false
  let deadDropUsed = false
  let deadDropDone = false
  let boardWatchTimer = 12
  let knocked = false
  let newcomer = null 
  let dialogue = null
  let banner = null
  let prompt = null
  let captureLine = ''

  const say = (text, seconds = 4, warning = false) => {
    banner = { text: text.toUpperCase(), t: seconds, warning }
  }

  if (import.meta.env.DEV) {
    window.__sp = {
      passage,
      level,
      map,
      player,
      guards,
      members: () => members,
      newcomer: () => newcomer,
      mode: () => mode,
      inBase: () => inBase,
      dialogue: () => dialogue,
      board: () => board.isOpen,
      knockNow: () => (arrivedAt = time - 100),
    }
    if (!second) window.__sp1 = window.__sp
  }

  const showEvidence = () => {
    const items = gameState.evidence
      .map((id) => {
        const e = EVIDENCE[id]
        const sent = gameState.leaked[id]
        const stamp = sent
          ? ` <span class="stamp">— sent to ${sent === 'Committee' ? 'the Committee' : `the ${sent}`}</span>`
          : ''
        return `<li><span class="doc-name">${e.number}. ${e.name}${stamp}</span><span class="doc-text">${e.text}</span></li>`
      })
      .join('')
    modal.open(
      'Evidence',
      items
        ? `<ul>${items}</ul>`
        : '<p class="missing">You carry no documents.</p>',
    )
  }
  const showFracture = () => {
    modal.open(
      'The Fracture',
      `${fractureSVG()}<p>${fractureSummary()}</p>
      <p>Trust between the three powers. Leak evidence to the power it hurts most, and the bond it names will crack.</p>`,
    )
  }
  const showObjectives = () => {
    const tasks = second
      ? `<li>Reach the base again, by a different way down. Two officers patrol the tunnels now.</li>
         <li>Pin what you found on the <b>evidence board</b>.</li>
         <li>Someone will come to the door. Decide whether to let them in.</li>
         <li>If you are sure who the informant is, call everyone to the <b>council table</b> and name them. You get <b>one</b> chance, and a wrong accusation costs a friend.</li>
         <li>Leave by the east door when you are ready.</li>`
      : `<li>Reach the resistance base at the far end of the tunnels.</li>
         <li>One CAP officer sweeps the tunnels with a torch. Alcoves in the walls are hiding places.</li>
         <li>In the base, talk to the resistance (<kbd>E</kbd>). Watch them. Not everyone is who they seem.</li>
         <li>Use the <b>evidence board</b> before leaving by the east door.</li>`
    modal.open(
      'Objectives',
      `<p class="stamp">SAFE PASSAGE ${second ? 'II' : 'I'} · ${second ? 'BACK UNDERGROUND' : 'UNDER THE CITY'}</p><ul>${tasks}</ul>`,
    )
  }
  const showPause = () => {
    modal.open(
      'Paused',
      `
      <ul>
        <li><kbd>W A S D</kbd> or arrow keys: move · <kbd>Shift</kbd>: sneak</li>
        <li><kbd>E</kbd>: talk, take, use · <kbd>Click</kbd>: throw a stone</li>
        <li>Keep still or sneak in an <b>alcove</b> to hide</li>
      </ul>`,
      { closeLabel: 'Resume' },
    )
  }

  function restart() {
    player.x = checkpoint.x
    player.y = checkpoint.y
    stones = []
    guards.forEach((g) => {
      g.reset()
      g.wait = 3
    })
    cam.follow(player, map.pxW, map.pxH, 0, true)
    mode = 'play'
    say('Nothing down here but rats.')
  }

  function open(name, role, lines, then = null) {
    dialogue = { name, role, lines, i: 0, then }
  }

  function talkTo(m) {
    const d = m.def
    const isInformant = m.id === informantId
    let lines
    if (second && m !== newcomer) {
      const third = isInformant ? d.tell2.line : d.chat2
      lines = talked.has(m.id) ? [d.quirk, third] : [d.back, d.quirk, third]
    } else if (second && m === newcomer) {
      const third = isInformant ? d.tell2.line : d.chat
      lines = talked.has(m.id) ? [d.quirk, third] : [d.greet, d.quirk, third]
    } else {
      const tell = d.tell1
      const third = isInformant && tell.kind === 'dialogue' ? tell.line : d.chat
      lines = talked.has(m.id) ? [d.quirk, third] : [d.greet, d.quirk, third]
    }
    talked.add(m.id)
    open(d.name, d.role, lines)
  }

  function host() {
    const id =
      ['nathan', 'ruth', 'paula', 'irfan'].find((h) => present.includes(h)) ??
      present[0]
    return MEMBERS[id]
  }

  function arrive() {
    inBase = true
    arrivedAt = time
    checkpoint = { ...baseEntry }
    sfx.checkpoint()
    for (const g of guards) if (g.state !== 'patrol') g.goHome()
    const h = host()
    talked.add(h.id)
    if (second) {
      open(h.name, h.role, [
        h.back,
        'Pin what you found on the board. And keep your eyes open — the CAP are asking questions in every village.',
      ])
      say('Home again. For what it’s worth.', 4, true)
    } else {
      open(h.name, h.role, [
        h.greet,
        'This is home, for what it’s worth. Talk to the others if you like. Then the board — north wall. Show us what you brought.',
      ])
      say('The resistance. You are among friends. Probably.', 4, true)
    }
  }

  // Passage I: visible tells, acted out in front of the player
  function updateTells(dt) {
    if (!passage1Informant || !inBase) return
    const tell = tellOf(passage1Informant)
    const m = members.find((x) => x.id === passage1Informant)
    if (!m) return

    if (
      tell.kind === 'deadDrop' &&
      !deadDropDone &&
      time - arrivedAt > 22 &&
      !dialogue &&
      !board.isOpen
    ) {
      deadDropDone = true
      deadDropUsed = true
      m.sendTo(map, level.decor.deadDrop.tx + 1, level.decor.deadDrop.ty, 3)
    }

    if (tell.kind === 'board' && !m.busy()) {
      boardWatchTimer -= dt
      const far =
        Math.hypot(player.x - boardSpot.x, player.y - boardSpot.y) > TILE * 9
      if (boardWatchTimer <= 0 && far && !board.isOpen) {
        boardWatchTimer = 25
        m.sendTo(map, level.boardSpot.tx - 1, level.boardSpot.ty, 6)
      }
    }
  }

  // Passage II: the knock at the door
  function updateNewcomer() {
    if (!second || knocked || !inBase || dialogue || board.isOpen) return
    if (time - arrivedAt < 10) return
    knocked = true
    sfx.warn()
    say('A knock at the east door.', 4, true)
    const def = MEMBERS[newcomerId]
    newcomer = createMember(def, DOOR_INSIDE)
    newcomer.x = DOOR_INSIDE.x * TILE
    newcomer.y = DOOR_INSIDE.y * TILE
    members.push(newcomer)
    newcomer.relocate(map, NEWCOMER_WAIT, () => {
      const h = host()
      open(def.name, '', [def.plea], () =>
        open(
          h.name,
          h.role,
          [
            'Your call, friend. You know better than any of us what’s out there.',
          ],
          decideNewcomer,
        ),
      )
    })
  }

  function decideNewcomer() {
    const def = MEMBERS[newcomerId]
    modal.open(
      'At the door',
      `<p><b>${def.name}</b> is standing in the doorway, rain running off their coat, waiting for your answer.</p>
       <p>Someone new could be a friend we badly need. Or exactly what the HIA would send.</p>`,
      {
        choices: [
          { label: 'Take them in', value: true },
          { label: 'Turn them away', value: false },
        ],
        then: (admit) => {
          gameState.newcomerAdmitted = admit
          if (admit) {
            say(`${def.name.split(' ')[0]} is one of us now.`, 4, true)
            newcomer.relocate(map, NEWCOMER_HOME)
          } else {
            say('The door closes. Footsteps fade into the rain.', 4)
            showLeaving(newcomer)
          }
        },
      },
    )
  }

  function showLeaving(m) {
    m.relocate(map, DOOR_INSIDE, () => {
      m.gone = true
      members = members.filter((x) => x !== m)
    })
  }

  // Passage II: one chance to name the informant
  function callTheTable() {
    const choices = members
      .filter((m) => !m.gone)
      .map((m) => ({ label: m.def.name, value: m.id }))
    choices.push({ label: 'Not yet', value: null })
    modal.open(
      'The council table',
      `<p>Everyone gathers round. If you name someone, they will be searched and sent away, guilty or not.</p>
       <p class="stamp">ONE CHANCE. A WRONG NAME COSTS A FRIEND.</p>`,
      {
        choices,
        then: (id) => {
          if (!id) return
          const name = MEMBERS[id].name
          modal.open(
            'Are you sure?',
            `<p>Accuse <b>${name}</b> of informing for the HIA?</p>`,
            {
              choices: [
                { label: `Accuse ${name.split(' ')[0]}`, value: true },
                { label: 'Think again', value: false },
              ],
              then: (sure) => sure && accuse(id),
            },
          )
        },
      },
    )
  }

  function accuse(id) {
    gameState.accused = id
    const guilty = id === informantId
    const accused = MEMBERS[id]
    const h = host()
    const searcher = h.id === id ? MEMBERS[present.find((p) => p !== id)] : h
    open(
      searcher.name,
      searcher.role,
      [
        `Search ${accused.name.split(' ')[0]}. Coat, boots, everything.`,
        guilty
          ? 'Sewn into the coat lining: a card with the HIA eye on it, and a time pencilled underneath. 04:10.'
          : 'Nothing. A ration book, a photograph, a pencil stub. Nothing at all.',
      ],
      () =>
        open(
          accused.name,
          accused.role,
          [
            guilty
              ? 'You’ve no idea what’s coming. None of you.'
              : 'I hope you find who you’re looking for. I won’t be here to see it.',
          ],
          () => {
            const m = members.find((x) => x.id === id)
            if (m) showLeaving(m)
            say(
              guilty
                ? 'The traitor is gone.'
                : 'A friend walks out into the rain.',
              4,
              !guilty,
            )
          },
        ),
    )
  }

  return {
    enter() {
      taskbar.mode('game')
      taskbar.showBell(false)
      taskbar.enable('fracture', gameState.boardUnlocked)
      taskbar.on('evidence', showEvidence)
      taskbar.on('fracture', showFracture)
      taskbar.on('objectives', showObjectives)
      taskbar.on('pause', showPause)
      cam.follow(player, map.pxW, map.pxH, 0, true)
    },

    exit() {
      taskbar.showBell(true)
    },

    update(dt) {
      time += dt
      modeTime += dt
      taskbar.update(dt)
      if (modal.isOpen || board.isOpen) return
      if (banner && (banner.t -= dt) <= 0) banner = null

      if (mode === 'intro') {
        cam.follow(player, map.pxW, map.pxH, dt)
        if (input.wasPressed('enter')) {
          mode = 'play'
          say(
            second
              ? 'Sector 12 culverts. Patrols doubled.'
              : 'Sector 7 drains. Patrolled hourly.',
          )
        }
        return
      }
      if (mode === 'capture') {
        if (modeTime > 1.2 && input.wasPressed('enter')) restart()
        return
      }
      if (mode === 'complete') {
        if (modeTime > 1 && input.wasPressed('enter')) onExit()
        return
      }

      if (dialogue) {
        if (input.wasPressed('e', 'enter', ' ')) {
          dialogue.i++
          if (dialogue.i >= dialogue.lines.length) {
            const then = dialogue.then
            dialogue = null
            then?.()
          }
        }
        members.forEach((m) => m.update(dt, map, player))
        return
      }

      if (input.wasPressed('escape', 'p')) {
        showPause()
        return
      }

      player.update(dt, map)
      if (!inBase && toTile(player.x) >= BASE.x) arrive()

      const m = input.mouse
      if (m.clicked && player.stones > 0 && !inBase) {
        const aim = cam.toWorld(m.x, m.y)
        const land = throwTarget(map, player.x, player.y, aim.x, aim.y)
        stones.push(createStone(player.x, player.y, land.x, land.y))
        player.stones--
        sfx.throw()
      }
      stones.forEach((s) => s.update(dt))
      stones = stones.filter((s) => !s.done)

      if (inBase) noise.clear()
      const seenPlayer = inBase ? { ...player, hidden: true } : player
      const world = {
        map,
        player: seenPlayer,
        noises: noise.list(),
        onSuspicious(g) {
          if (!g._wasSuspicious) sfx.suspicious()
          g._wasSuspicious = true
        },
        onAlert() {
          sfx.alert()
          say('Movement in the drains!', 3, true)
        },
      }
      for (const g of guards) {
        g.update(dt, world)
        if (g.state === 'patrol' || g.state === 'return')
          g._wasSuspicious = false
        if (inBase && g.state === 'alert') g.goHome()
        if (toTile(g.x) >= BASE.x - 1) g.goHome()
      }
      noise.clear()

      if (!inBase) {
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
            return
          }
        }
      }

      members.forEach((mm) => mm.update(dt, map, player))
      updateTells(dt)
      updateNewcomer()

      prompt = null
      for (const r of rubble) {
        if (
          r.stones <= 0 ||
          Math.hypot(r.x - player.x, r.y - player.y) >= REACH
        )
          continue
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

      if (inBase) {
        const near = (p, r = REACH) =>
          Math.hypot(p.x - player.x, p.y - player.y) < r
        const nearMember = members
          .filter((mm) => !mm.busy() && !mm.gone)
          .map((mm) => ({
            mm,
            d: Math.hypot(mm.x - player.x, mm.y - player.y),
          }))
          .filter((o) => o.d < REACH + 4)
          .sort((a, b) => a.d - b.d)[0]
        const canAccuse =
          second &&
          gameState.newcomerAdmitted !== null &&
          gameState.accused === null

        if (near(boardSpot, REACH + 6)) {
          prompt = {
            x: boardSpot.x,
            y: boardSpot.y - 18,
            text: 'E — the evidence board',
          }
          if (input.wasPressed('e')) {
            boardVisited = true
            gameState.boardUnlocked = true
            taskbar.enable('fracture', true)
            board.open()
          }
        } else if (canAccuse && near(tableSpot)) {
          prompt = {
            x: tableSpot.x,
            y: tableSpot.y - 10,
            text: 'E — call everyone to the table',
          }
          if (input.wasPressed('e')) callTheTable()
        } else if (near(dropSpot)) {
          prompt = { x: dropSpot.x, y: dropSpot.y, text: 'E — a loose brick' }
          if (input.wasPressed('e')) {
            open(
              'A loose brick',
              '',
              deadDropUsed
                ? [
                    'Behind it, a folded pamphlet. Blank inside, but for a time pencilled in the corner: 04:10.',
                    'Someone left this here recently. The dust around it is disturbed.',
                  ]
                : ['Behind it, a dusty hollow. Empty.'],
            )
          }
        } else if (nearMember) {
          prompt = {
            x: nearMember.mm.x,
            y: nearMember.mm.y,
            text: `E — talk to ${nearMember.mm.def.name}`,
          }
          if (input.wasPressed('e')) talkTo(nearMember.mm)
        }
      }

      if (!prompt && map.isHiding(toTile(player.x), toTile(player.y))) {
        prompt = {
          x: player.x,
          y: player.y,
          text: player.hidden ? 'Hidden' : 'Keep still to hide',
        }
      }

      if (map.get(toTile(player.x), toTile(player.y)) === T.EXIT) {
        const waitingOnNewcomer = second && gameState.newcomerAdmitted === null
        if (!boardVisited || waitingOnNewcomer) {
          player.x -= TILE
          say(
            !boardVisited
              ? 'Not yet. The board first — north wall.'
              : 'Not yet. Someone is coming.',
            3,
            true,
          )
        } else {
          if (second) gameState.settlePassage2()
          mode = 'complete'
          modeTime = 0
          sfx.checkpoint()
        }
      }

      cam.follow(player, map.pxW, map.pxH, dt)

      const anyAlert = guards.some((g) => g.state === 'alert')
      const anySus = guards.some(
        (g) => g.state === 'suspicious' || g.state === 'search',
      )
      taskbar.alert(
        inBase
          ? 'unseen'
          : anyAlert
            ? 'alerted'
            : anySus
              ? 'suspicious'
              : player.hidden
                ? 'hidden'
                : 'unseen',
      )
      taskbar.evidence(gameState.evidence.length, second ? 6 : 3)
      taskbar.stones(player.stones, MAX_STONES)
    },

    render(ctx) {
      const off = cam.offset()
      const view = { x: off.x, y: off.y, viewW: VIEW_W, viewH: VIEW_H }

      renderer.drawBase(ctx, view)
      for (const r of rubble)
        if (r.stones > 0) drawRubble(ctx, r.x - view.x, r.y - view.y, r.stones)
      stones.forEach((s) => s.draw(ctx, view))
      for (const g of guards) g.drawCone(ctx, view, map)
      for (const g of guards) g.draw(ctx, view, time)
      for (const mm of members) mm.draw(ctx, view)
      player.draw(ctx, view, time)

      const lights = [{ x: player.x, y: player.y, radius: 118, strength: 0.9 }]
      for (const g of guards) {
        lights.push({
          x: g.x,
          y: g.y,
          radius: TORCH_RANGE,
          strength: 1,
          colour: 'searchlight',
          cone: conePoints(map, g, TORCH_RANGE, 14),
        })
        lights.push({ x: g.x, y: g.y, radius: 26, strength: 0.6 })
      }
      for (const l of level.lamps) {
        const flicker = l.base ? 1 : 0.85 + Math.sin(time * 7 + l.tx) * 0.08
        lights.push({
          x: tileCentre(l.tx),
          y: tileCentre(l.ty),
          radius: l.radius,
          strength: l.strength * flicker,
          colour: l.colour,
        })
      }
      lights.push({
        x: tileCentre(BASE.x + BASE.w / 2),
        y: tileCentre(BASE.y + BASE.h / 2),
        radius: 360,
        strength: 0.7,
        colour: 'resistance-amber',
      })
      lighting.render(ctx, view, lights, 0.9)

      if (inBase) {
        ctx.font = `13px ${fonts.mono}`
        ctx.textAlign = 'center'
        for (const mm of members) {
          if (Math.hypot(mm.x - player.x, mm.y - player.y) < TILE * 7) {
            ctx.fillStyle = withAlpha(palette.get('paper'), 0.8)
            ctx.fillText(
              mm.def.name.split(' ')[0],
              mm.x - view.x,
              mm.y - view.y - 12,
            )
          }
        }
      }

      if (
        mode === 'play' &&
        !dialogue &&
        input.mouse.inside &&
        player.stones > 0 &&
        !modal.isOpen &&
        !board.isOpen &&
        !inBase
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

      if (prompt && mode === 'play' && !dialogue) {
        ctx.font = `14px ${fonts.mono}`
        ctx.textAlign = 'center'
        ctx.fillStyle = palette.get('paper')
        ctx.fillText(prompt.text, prompt.x - view.x, prompt.y - view.y - 16)
      }

      if (banner && mode === 'play') drawBanner(ctx)
      if (dialogue) drawDialogue(ctx)
      if (mode === 'intro') drawIntro(ctx)
      if (mode === 'capture') drawCapture(ctx)
      if (mode === 'complete') drawComplete(ctx)
    },
  }

  function drawDialogue(ctx) {
    const x = 160
    const y = VIEW_H - 170
    const w = VIEW_W - 320
    const h = 140
    ctx.save()
    ctx.fillStyle = 'rgba(28,29,27,0.92)'
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = palette.get('resistance-amber')
    ctx.fillRect(x, y, 4, h)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = palette.get('paper')
    ctx.font = `700 26px ${fonts.title}`
    ctx.fillText(dialogue.name, x + 28, y + 40)
    if (dialogue.role) {
      const nameW = ctx.measureText(dialogue.name).width
      ctx.font = `15px ${fonts.mono}`
      ctx.fillStyle = palette.get('paper-dim')
      ctx.fillText(dialogue.role.toUpperCase(), x + 40 + nameW, y + 38)
    }
    ctx.font = `500 24px ${fonts.main}`
    ctx.fillStyle = palette.get('paper')
    wrap(ctx, dialogue.lines[dialogue.i], x + 28, y + 76, w - 56, 28)
    ctx.font = `14px ${fonts.mono}`
    ctx.fillStyle = palette.get('resistance-amber')
    ctx.textAlign = 'right'
    const more = dialogue.i < dialogue.lines.length - 1 || dialogue.then
    ctx.fillText(more ? 'E — CONTINUE' : 'E — CLOSE', x + w - 20, y + h - 14)
    ctx.restore()
  }

  function wrap(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ')
    let line = ''
    let yy = y
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy)
        line = word
        yy += lineH
      } else line = test
    }
    ctx.fillText(line, x, yy)
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

  function card(ctx, alpha = 0.85) {
    ctx.fillStyle = `rgba(28,29,27,${alpha})`
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
  }

  function drawIntro(ctx) {
    card(ctx)
    ctx.fillStyle = palette.get('paper-dim')
    ctx.font = `18px ${fonts.mono}`
    ctx.fillText(second ? 'SAFE PASSAGE II' : 'SAFE PASSAGE I', VIEW_W / 2, 190)
    ctx.fillStyle = palette.get('paper')
    ctx.font = `700 76px ${fonts.title}`
    ctx.fillText(
      second ? 'Back Underground' : 'Under the City',
      VIEW_W / 2,
      270,
    )
    ctx.font = `italic 500 28px ${fonts.main}`
    ctx.fillStyle = palette.get('paper-dim')
    ctx.fillText(
      second
        ? 'A different way down, through the culverts. Two patrols now.'
        : 'Through the old drains to the resistance. One patrol sweeps the tunnels.',
      VIEW_W / 2,
      330,
    )
    ctx.font = `500 22px ${fonts.main}`
    ctx.fillStyle = palette.get('paper')
    ctx.fillText(
      `You carry ${gameState.evidence.length} documents.`,
      VIEW_W / 2,
      400,
    )
    blink(ctx, 'PRESS ENTER', 500)
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
    if (modeTime > 1.2) blink(ctx, 'PRESS ENTER — TRY AGAIN', 440)
  }

  function drawComplete(ctx) {
    const a = Math.min(1, modeTime / 0.8)
    card(ctx, 0.9 * a)
    ctx.globalAlpha = a
    ctx.fillStyle = palette.get('resistance-amber')
    ctx.font = `700 60px ${fonts.title}`
    ctx.fillText(
      second ? 'Out Before First Light' : 'Up the Steps, into the Night',
      VIEW_W / 2,
      220,
    )
    ctx.fillStyle = palette.get('paper')
    ctx.font = `italic 500 28px ${fonts.main}`
    ctx.fillText(
      second
        ? 'Somewhere ahead, an HIA headquarters. And a dossier with your future in it.'
        : 'Somewhere above, the countryside. And a storm coming in.',
      VIEW_W / 2,
      280,
    )
    ctx.font = `20px ${fonts.mono}`
    const leaks = Object.keys(gameState.leaked).length
    ctx.fillText(
      `LEAKS MADE: ${leaks}    ·    BONDS BROKEN: ${brokenCount()} OF 3`,
      VIEW_W / 2,
      340,
    )
    if (second) {
      const nc = MEMBERS[newcomerId].name
      const acc = gameState.accused ? MEMBERS[gameState.accused].name : null
      ctx.fillText(
        `${gameState.newcomerAdmitted ? 'TOOK IN' : 'TURNED AWAY'}: ${nc.toUpperCase()}    ·    ${acc ? `ACCUSED: ${acc.toUpperCase()}` : 'NO ONE ACCUSED'}`,
        VIEW_W / 2,
        375,
      )
    }
    ctx.fillStyle = palette.get('paper-dim')
    ctx.font = `italic 500 24px ${fonts.main}`
    ctx.fillText(
      second
        ? 'Level 3, the Headquarters, is not built yet.'
        : 'Next: the Country Roads. Reach the farm before dawn.',
      VIEW_W / 2,
      420,
    )
    ctx.globalAlpha = 1
    if (modeTime > 1) blink(ctx, 'PRESS ENTER', 490)
  }

  function blink(ctx, text, y) {
    if (Math.sin(time * 4) > -0.4) {
      ctx.fillStyle = palette.get('resistance-amber')
      ctx.font = `20px ${fonts.mono}`
      ctx.fillText(text, VIEW_W / 2, y)
    }
  }
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
}
