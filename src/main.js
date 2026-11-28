import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/stardos-stencil/400.css'
import '@fontsource/stardos-stencil/700.css'
import '@fontsource/special-elite/400.css'

import './styles/theme.css'
import './styles/main.css'

import { fitFrame, setupCanvas } from './core/display.js'
import { fonts } from './core/palette.js'
import { startLoop } from './core/loop.js'
import { scenes } from './core/scenes.js'
import { initInput, input } from './core/input.js'
import { unlockAudio } from './core/audio.js'
import { createTaskbar } from './ui/taskbar.js'
import { createTitleScene } from './scenes/title.js'
import { createLevel1 } from './scenes/level1.js'
import { createSafePassage } from './scenes/safePassage.js'
import { createLevel2 } from './scenes/level2.js'
import { createBoard } from './ui/board.js'
import { gameState } from './systems/gameState.js'

const frame = document.getElementById('frame')
const canvas = document.getElementById('game')

async function boot() {
  fitFrame(frame)
  const ctx = setupCanvas(canvas)
  initInput(canvas)
  const taskbar = createTaskbar()

  await Promise.all([
    document.fonts.load(`700 196px ${fonts.title}`, 'Unfriþ'),
    document.fonts.load(`italic 500 30px ${fonts.main}`),
    document.fonts.load(`500 22px ${fonts.main}`),
    document.fonts.load(`22px ${fonts.mono}`),
  ])

  const board = createBoard()
  const goTitle = () => scenes.switchTo(title)
  const goPassage2 = () =>
    scenes.switchTo(
      createSafePassage({ passage: 2, taskbar, board, onExit: goTitle }),
    )
  const goLevel2 = () =>
    scenes.switchTo(createLevel2({ taskbar, onExit: goPassage2 }))
  const goPassage1 = () =>
    scenes.switchTo(
      createSafePassage({ passage: 1, taskbar, board, onExit: goLevel2 }),
    )
  const startGame = () => {
    unlockAudio()
    input.clear()
    gameState.newGame() 
    scenes.switchTo(createLevel1({ taskbar, onExit: goPassage1 }))
  }
  const title = createTitleScene({ taskbar, onStart: startGame })

  const jump = import.meta.env.DEV
    ? new URLSearchParams(location.search).get('level')
    : null
  const jumps = { sp1: goPassage1, l2: goLevel2, sp2: goPassage2 }
  if (jumps[jump]) {
    gameState.newGame()
    const carried = ['roster', 'ledger', 'telegram']
    if (jump === 'sp2') carried.push('checkpoint', 'ashby', 'photographs')
    carried.forEach((id) => gameState.addEvidence(id))
    if (jump !== 'sp1') gameState.boardUnlocked = true
    window.__game = gameState
    unlockAudio()
    jumps[jump]()
    startLoop({
      update: (dt) => {
        scenes.update(dt)
        input.endFrame()
      },
      render: () => scenes.render(ctx),
    })
    return
  }
  window.__game = import.meta.env.DEV ? gameState : undefined

  scenes.switchTo(title)

  startLoop({
    update: (dt) => {
      scenes.update(dt)
      input.endFrame() 
    },
    render: () => scenes.render(ctx),
  })
}

boot()
