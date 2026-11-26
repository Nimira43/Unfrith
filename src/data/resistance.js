export const MEMBERS = {
  theo: {
    id: "theo",
    name: "Theo Robertson",
    role: "The writer",
    coat: "#4a4038",
    hair: "#b8b2a6",
    idle: "still",
    greet:
      "You made it. Good. I was halfway through your obituary. Satirical, of course.",
    quirk:
      "Mm? Sorry — a line came to me. “The Father's love is a locked door.” Too much? It's never too much.",
    chat: "Read anything good lately? No. Nobody has. That\u2019s rather the point of me.",
    tell1: { kind: "deadDrop" },
    tell2: {
      kind: "dialogue",
      line: "My flat? Untouched. They've never once come for me. Lucky, I suppose.",
    },
  },
  ruth: {
    id: "ruth",
    name: "Ruth Morgan",
    role: "Strategist",
    coat: "#3b4448",
    hair: "#5a4632",
    idle: "pace",
    greet: "Sit down before you fall down. Then show me what you carried out.",
    quirk:
      "Seventeen patrols a night on the Harrow line. Divide by the shifts and it doesn't divide. Nothing here divides cleanly.",
    chat: "Eat something. Then sleep. Then we plan. In that order, and no arguments.",
    tell1: {
      kind: "dialogue",
      line: "Could I keep a copy of the board? For planning. Only for planning.",
    },
    tell2: {
      kind: "dialogue",
      line: "They took Daniel on Carver Road. A Friday, it was. I remember it was a Friday.",
    },
  },
  irfan: {
    id: "irfan",
    name: "Irfan Ahmed",
    role: "Organiser",
    coat: "#4b4a36",
    hair: "#1e1d1b",
    idle: "wander",
    greet: "Ah! Our ghost returns. Mind the cables — they bite.",
    quirk:
      "If the lights flicker, that's me. If they go out completely, that's also me, but I'll deny it.",
    chat: "My wife thinks I\u2019m on nights at the factory. Technically true. Very technically.",
    tell1: {
      kind: "dialogue",
      line: "Off to see the family tonight. Funny — last time I went, the CAP swept all of Digbeth.",
    },
    tell2: {
      kind: "dialogue",
      line: "Don't touch that junction box. Delicate. Very delicate. Leave it to me.",
    },
  },
  angelica: {
    id: "angelica",
    name: "Angelica Fraser",
    role: "Intel supplier",
    coat: "#5a5d58",
    hair: "#8a5a32",
    idle: "still",
    greet: "Oh — it's you. Sorry. I thought… never mind what I thought.",
    quirk:
      "Sorry. The sirens. You'd think I'd be used to them by now. I wash my hands and wash my hands.",
    chat: "There are rooms in that laboratory with no windows and no numbers on the doors.",
    tell1: {
      kind: "dialogue",
      line: "Six years I've worked in that laboratory. Here — my pass. Ignore the date. They reprint them.",
    },
    tell2: {
      kind: "dialogue",
      line: "The man at the gate? Grey coat? Just… security. He asks everyone questions.",
    },
  },
  nathan: {
    id: "nathan",
    name: "Nathan McLeod",
    role: "Leader",
    coat: "#2f3a3f",
    hair: "#7a3a22",
    idle: "pace",
    greet:
      "About time. Right. You've got paper, we've got a board. Let's see it.",
    quirk:
      "Talk, talk, talk. We should be hitting them now, while they're still asleep.",
    chat: "The docks never sleep. Neither do I, much. Sleep\u2019s for people with nothing to lose.",
    tell1: {
      kind: "dialogue",
      line: "We should move all this to the docks. Tonight. I know a warehouse. Safe as houses.",
    },
    tell2: {
      kind: "dialogue",
      line: "Every name I gave you? Lifted. All of them. Except me. Aye, I'm careful.",
    },
  },
  divine: {
    id: "divine",
    name: "Divine Gayle",
    role: "Intel gatherer",
    coat: "#5b2f3a",
    hair: "#2a1c14",
    idle: "still",
    greet:
      "Darling! You look dreadful. Colonel Ashworth spilled his port on me last night. Vile man.",
    quirk:
      "Excuse me — “No, sweetheart, Mummy will be home soon. Yes. Teeth brushed.” — Sorry. My little ones.",
    chat: "One smiles, one listens, one remembers. Terribly tiring, darling. Terribly.",
    tell1: { kind: "board" },
    tell2: {
      kind: "dialogue",
      line: "Collins takes his tea at four, always the same café. One hears things. One hears everything.",
    },
  },
  doc: {
    id: "doc",
    name: "Dr Vincent Porter-Smythe",
    role: "Strategist",
    coat: "#4e4436",
    hair: "#d6d0c4",
    idle: "wander",
    greet:
      "Ah, splendid. Do mind the arch — second century. Older than the regime by a comfortable margin.",
    quirk:
      "Victorian brick, this. Sound work. And beneath it, Roman. Do you know what the Committee did to Silbury Hill?",
    chat: "History is the one thing they cannot confiscate. They are certainly trying.",
    tell1: {
      kind: "dialogue",
      line: "I've mapped every tunnel down here. Every one. Odd — I could have sworn I had two copies.",
    },
    tell2: {
      kind: "dialogue",
      line: "The purge took Hartley, Mbeki, the Lowes… and somehow not me. One doesn't ask why.",
    },
  },
  paula: {
    id: "paula",
    name: "Paula Jones",
    role: "Organiser of the hideouts",
    coat: "#5a4a3a",
    hair: "#8c8478",
    idle: "wander",
    greet:
      "Oh, love. Look at you. Have you eaten? You haven't. Sit. Take a tin with you after.",
    quirk:
      "That's my Gethin and my Carys. Both working for them now. Both. I don't know where I went wrong.",
    chat: "There\u2019s soup on. There\u2019s always soup on. Nobody goes up those steps hungry.",
    tell1: {
      kind: "dialogue",
      line: "Which way are you heading next, love? Just so I know where to send the food.",
    },
    tell2: {
      kind: "dialogue",
      line: "The supply run? Tuesday. Same as always. Why — was there a sweep on Tuesday?",
    },
  },
};

export const MEMBER_IDS = Object.keys(MEMBERS);
