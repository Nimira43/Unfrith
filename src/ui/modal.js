import { input } from '../core/input.js'

const root = document.getElementById('modal')
const titleEl = document.getElementById('modal-title')
const bodyEl = document.getElementById('modal-body')
const closeBtn = document.getElementById('modal-close')

let onClose = null

closeBtn.addEventListener('click', () => modal.close())
window.addEventListener(
  'keydown',
  (e) => {
    if (!modal.isOpen) return
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

  open(title, html, { closeLabel = 'Close', then = null } = {}) {
    titleEl.textContent = title
    bodyEl.innerHTML = html
    closeBtn.textContent = closeLabel
    onClose = then
    root.hidden = false
    modal.isOpen = true
    input.clear()
    closeBtn.focus()
  },

  close() {
    if (!modal.isOpen) return
    root.hidden = true
    modal.isOpen = false
    input.clear()
    closeBtn.blur()
    const fn = onClose
    onClose = null
    fn?.()
  },
}
