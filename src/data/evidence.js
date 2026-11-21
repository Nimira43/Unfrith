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
}

export const LEVEL1_EVIDENCE = ['roster', 'ledger', 'telegram']
