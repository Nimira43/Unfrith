export const gameState = {
  evidence: [],
  fracture: { 'Committee-CAP': 100, 'Committee-HIA': 100, 'CAP-HIA': 100 },
  hiaSuspicion: 0,

  hasEvidence: (id) => gameState.evidence.includes(id),
  addEvidence(id) {
    if (!gameState.evidence.includes(id)) gameState.evidence.push(id)
  },
  reset() {
    gameState.evidence = []
    gameState.fracture = {
      'Committee-CAP': 100,
      'Committee-HIA': 100,
      'CAP-HIA': 100,
    }
    gameState.hiaSuspicion = 0;
  },
}
