import { gameState } from '../systems/gameState.js'
import { BOND_BROKEN_AT } from '../systems/fracture.js'

const P = {
  HIA: [150, 34],
  Committee: [36, 206],
  CAP: [264, 206],
}

export function fractureSVG({ dark = false } = {}) {
  const ink = dark ? 'var(--paper)' : 'var(--soot)'
  const quiet = dark ? 'var(--paper-dim)' : 'var(--concrete-700)'
  const sides = [
    ['Committee', 'HIA', 'Committee-HIA'],
    ['HIA', 'CAP', 'CAP-HIA'],
    ['Committee', 'CAP', 'Committee-CAP'],
  ]

  let out = `<svg viewBox="-50 0 400 240" class="fracture" role="img" aria-label="The Fracture: trust between the Committee, the CAP and the HIA">`

  for (const [a, b, bond] of sides) {
    const value = gameState.fracture[bond]
    const broken = value <= BOND_BROKEN_AT
    const [x1, y1] = P[a]
    const [x2, y2] = P[b]
    const colour = broken ? 'var(--regime-red)' : ink

    if (broken) {
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2
      const gx = (x2 - x1) * 0.07
      const gy = (y2 - y1) * 0.07
      out += line(x1, y1, mx - gx, my - gy, colour, 3)
      out += line(mx + gx, my + gy, x2, y2, colour, 3)
    } else {
      out += line(x1, y1, x2, y2, colour, 3)
    }

    const cracks = Math.round((100 - value) / 10)
    const len = Math.hypot(x2 - x1, y2 - y1)
    const nx = -(y2 - y1) / len
    const ny = (x2 - x1) / len
    for (let k = 0; k < cracks; k++) {
      const t = 0.15 + (0.7 * (k + 0.5)) / Math.max(cracks, 1)
      const cx = x1 + (x2 - x1) * t
      const cy = y1 + (y2 - y1) * t
      const s = k % 2 ? 1 : -1
      out += `<polyline points="${cx},${cy} ${cx + nx * 6 * s + 2},${cy + ny * 6 * s} ${cx + nx * 3 * s - 2},${cy + ny * 3 * s + 3} ${cx + nx * 10 * s},${cy + ny * 10 * s}" fill="none" stroke="${colour}" stroke-width="1.2"/>`
    }

    const mx = (x1 + x2) / 2 - nx * 16
    const my = (y1 + y2) / 2 - ny * 16 + 4
    out += `<text x="${mx}" y="${my}" text-anchor="middle" font-family="var(--font-mono)" font-size="13" fill="${broken ? 'var(--regime-red)' : quiet}">${value}</text>`
  }

  for (const [name, [x, y]] of Object.entries(P)) {
    out += `<circle cx="${x}" cy="${y}" r="7" fill="var(--regime-red-dark)" stroke="${ink}" stroke-width="1.5"/>`
    const ty = name === 'HIA' ? y - 14 : y + 26
    out += `<text x="${x}" y="${ty}" text-anchor="middle" font-family="var(--font-title)" font-size="17" fill="${ink}">${name === 'Committee' ? 'The Committee' : `The ${name}`}</text>`
  }

  out += '</svg>'
  return out
}

function line(x1, y1, x2, y2, colour, w) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-width="${w}" stroke-linecap="round"/>`
}

export function fractureSummary() {
  const broken = Object.values(gameState.fracture).filter(
    (v) => v <= BOND_BROKEN_AT,
  ).length
  return `Bonds broken: <b>${broken} of 3</b>. A bond breaks at ${BOND_BROKEN_AT} or below.`
}
