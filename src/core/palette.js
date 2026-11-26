const cache = new Map();

export const palette = {
  get(name) {
    if (!cache.has(name)) {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${name}`)
        .trim();
      cache.set(name, value || "#ff00ff");
    }
    return cache.get(name);
  },
};

export const fonts = {
  main: '"Cormorant Garamond", Georgia, serif',
  title: '"Stardos Stencil", "Cormorant Garamond", serif',
  mono: '"Special Elite", "Courier New", monospace',
};
