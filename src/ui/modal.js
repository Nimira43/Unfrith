import { input } from '../core/input.js'

const root = document.getElementById('modal')
const titleEl = document.getElementById('modal-title')
const bodyEl = document.getElementById('modal-body')
const closeBtn = document.getElementById('modal-close')

let onClose = null
let pendingChoices = null
let chosen

closeBtn.addEventListener('click', () => modal.close())

bodyEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-choice]')
  if (!btn || !pendingChoices) return
  chosen = pendingChoices[Number(btn.dataset.choice)].value
  modal.close(true)
})

window.addEventListener(
  'keydown',
  (e) => {
    if (!modal.isOpen || pendingChoices) return
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      modal.close()
    }
  },
  true,
)

export const modal = {
  isOpen: false,

  open(
    title,
    html,
    { closeLabel = 'Close', then = null, choices = null } = {},
  ) {
    titleEl.textContent = title
    bodyEl.innerHTML =
      html +
      (choices
        ? `<div class="modal__choices">${choices
            .map(
              (c, k) =>
                `<button class="btn ${k === 0 ? 'btn--primary' : ''}" type="button" data-choice="${k}">${c.label}</button>`,
            )
            .join('')}</div>`
        : '')
    pendingChoices = choices
    chosen = undefined
    closeBtn.hidden = !!choices
    closeBtn.textContent = closeLabel
    onClose = then
    root.hidden = false
    modal.isOpen = true
    input.clear()
    ;(choices ? bodyEl.querySelector('[data-choice]') : closeBtn)?.focus()
  },

  close(fromChoice = false) {
    if (!modal.isOpen) return
    if (pendingChoices && !fromChoice) return 
    root.hidden = true
    modal.isOpen = false
    input.clear()
    closeBtn.blur()
    closeBtn.hidden = false
    const fn = onClose
    const value = chosen
    onClose = null
    pendingChoices = null
    chosen = undefined
    fn?.(value)
  },
}
