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

  const goTitle = () => scenes.switchTo(title)
  const startGame = () => {
    unlockAudio()
    input.clear()
    scenes.switchTo(createLevel1({ taskbar, onExit: goTitle }))
  }
  const title = createTitleScene({ taskbar, onStart: startGame })

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
