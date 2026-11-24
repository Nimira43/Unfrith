const events = []

export const noise = {
  emit(x, y, radius, source) {
    events.push({ x, y, radius, source })
  },
  list: () => events,
  clear: () => (events.length = 0),
}
