// Unfriþ — entry point

import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
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
import { createTitleScene } from './scenes/title.js'

const frame = document.getElementById('frame')
const canvas = document.getElementById('game')
const statusEl = document.getElementById('taskbar-status')

const setStatus = (text) => {
  statusEl.textContent = text
}

async function boot() {
  fitFrame(frame)
  const ctx = setupCanvas(canvas)

  // Canvas text needs the fonts loaded before the first draw.
  await Promise.all([
    document.fonts.load(`700 196px ${fonts.title}`, 'Unfriþ'),
    document.fonts.load(`italic 500 30px ${fonts.main}`),
    document.fonts.load(`22px ${fonts.mono}`),
  ])

  scenes.switchTo(createTitleScene({ setStatus }))

  startLoop({
    update: (dt) => scenes.update(dt),
    render: () => scenes.render(ctx),
  })
}

boot()
