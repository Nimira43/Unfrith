// Reads the colour variables from theme.css so canvas drawing and CSS share one palette.
// Usage: palette.get('regime-red') → '#9e2b25'

const cache = new Map()

export const palette = {
  get(name) {
    if (!cache.has(name)) {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${name}`)
        .trim()
      cache.set(name, value || '#ff00ff') // magenta = missing colour, easy to spot
    }
    return cache.get(name)
  },
}

// Fonts as canvas font-family strings.
export const fonts = {
  main: "'Cormorant Garamond', Georgia, serif",
  title: "'Stardos Stencil', 'Cormorant Garamond', serif",
  mono: "'Special Elite', 'Courier New', monospace",
}
