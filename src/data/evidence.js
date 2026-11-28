export const EVIDENCE = {
  roster: {
    id: 'roster',
    number: 1,
    name: 'The Annotated Roster',
    level: 1,
    weight: 'minor',
    leakTo: 'CAP',
    bond: 'CAP-HIA',
    text:
      'A CAP sector duty roster. Beside each officer’s name, in neat HIA pencil: ' +
      'a grade for “reliability”. Several are marked simply: REMOVE.',
  },
  ledger: {
    id: 'ledger',
    number: 2,
    name: 'The Ration Ledger',
    level: 1,
    weight: 'minor',
    leakTo: 'CAP',
    bond: 'Committee-CAP',
    text:
      'Quarterly ration allocations. Committee households: triple issue, with sugar, ' +
      'meat and spirits. CAP barracks: reduced by a third “for the good of the nation”.',
  },
  telegram: {
    id: 'telegram',
    number: 3,
    name: 'The Torn Telegram',
    level: 1,
    weight: 'minor',
    leakTo: 'Committee',
    bond: 'Committee-HIA',
    text:
      'Half a telegram from an HIA courier. Most of it is gone. What remains reads: ' +
      '“PHASE ONE ON SCHEDULE STOP FATHER UNAWARE STOP”',
  },
  checkpoint: {
    id: 'checkpoint',
    number: 4,
    name: 'The Checkpoint Log',
    level: 2,
    weight: 'minor',
    leakTo: 'CAP',
    bond: 'CAP-HIA',
    text:
      'The night log from Checkpoint 14. Pinned inside the cover, a standing order with the HIA eye: ' +
      'vehicles bearing that mark are not to be stopped, searched or recorded. Three passed tonight.',
  },
  ashby: {
    id: 'ashby',
    number: 5,
    name: 'The Ashby Road Log',
    level: 2,
    weight: 'minor',
    leakTo: 'CAP',
    bond: 'Committee-CAP',
    text:
      'The radio log from a burnt-out CAP van. Last entry: \u201cOrdered to hold Ashby Road. No backup coming. ' +
      'Committee says the resistance will be blamed.\u201d Then nothing but static.',
  },
  photographs: {
    id: 'photographs',
    number: 6,
    name: 'The Gamekeeper\u2019s Photographs',
    level: 2,
    weight: 'major',
    leakTo: 'Committee',
    bond: 'Committee-HIA',
    text:
      'A gamekeeper\u2019s envelope of night photographs. At the hunting lodge, under a lamp: HIA Director ' +
      'James Collins shaking hands with Committee member Ian Pattinson. Neither is supposed to know the other.',
  },
}

export const LEVEL1_EVIDENCE = ['roster', 'ledger', 'telegram']
export const LEVEL2_EVIDENCE = ['checkpoint', 'ashby', 'photographs']

export const CORROBORATION = [
  ['telegram', 'dossier'],
  ['photographs', 'dossier'],
  ['roster', 'commanders'],
  ['contingency', 'salon'],
  ['ashby', 'ledger'],
]

export const WEIGHT_DAMAGE = { minor: 10, major: 20, critical: 40 }
