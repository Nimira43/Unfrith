import { MEMBER_IDS } from '../data/resistance.js'

const freshFracture = () => ({
  'Committee-CAP': 100,
  'Committee-HIA': 100,
  'CAP-HIA': 100,
})

export const gameState = {
  evidence: [], 
  leaked: {}, 
  links: [], 
  fracture: freshFracture(),
  hiaSuspicion: 0,
  informant: null, 
  newcomer: null, 
  boardUnlocked: false,
  newcomerAdmitted: null, 
  accused: null, 
  outcome: null, 

  hasEvidence: (id) => gameState.evidence.includes(id),
  addEvidence(id) {
    if (!gameState.evidence.includes(id)) gameState.evidence.push(id)
  },

  newGame() {
    gameState.evidence = []
    gameState.leaked = {}
    gameState.links = []
    gameState.fracture = freshFracture()
    gameState.hiaSuspicion = 0
    gameState.boardUnlocked = false
    gameState.informant =
      MEMBER_IDS[Math.floor(Math.random() * MEMBER_IDS.length)]
    gameState.newcomer =
      MEMBER_IDS[Math.floor(Math.random() * MEMBER_IDS.length)]
  },

  presentInPassage1: () => MEMBER_IDS.filter((id) => id !== gameState.newcomer),

  settlePassage2() {
    const { informant, newcomer, newcomerAdmitted, accused } = gameState
    const informantExposed = accused === informant
    const informantInside = informant !== newcomer || newcomerAdmitted
    gameState.outcome = {
      informantExposed,
      hiaTippedOff: !informantExposed && informantInside,
      allyLost: accused && accused !== informant ? accused : null,
      newcomerHelps:
        newcomer !== informant &&
        newcomerAdmitted === true &&
        accused !== newcomer,
    }
    return gameState.outcome
  },
}
