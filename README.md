# Unfriþ

*Unfriþ* (Old English: **discord, the breaking of the peace**) is an overhead 2D stealth game set in an alternative, totalitarian Britain.

> Obedience · Work · Worship

---

## The setting

Britain's history ran as we know it until the 1950s. Then it went another way.

There is no monarchy and no parliament. The country is ruled by **the Supreme Father**, a leader seen only on posters, screens and loudspeakers. His orders are carried out by three powers:

- **The Committee**: the governing body, filled with the Supreme Father's family and sycophants.
- **The CAP** (Correctional Advisory Police): military police who enforce everyday law on the streets. Brutal thugs.
- **The HIA** (Heavenly Intelligence Agency): the Committee's network of spies, who crush any form of resistance.

They look united. They are not.

## The game

You are part of a growing resistance. Your task is to gather intelligence, turn the regime's powers against each other, and give the people the moment they need to rise.

- **You never fight.** No weapons and no violence. You survive by stealth, patience and distraction.
- **You are nobody.** The game never tells you who you are: no name, no face, no voice. Who you are is up to you.
- **Evidence is your weapon.** What you find matters, and so does who you let see it.
- **Trust no one completely.** Not even your friends.

Journey from a walled city through the storm-lashed countryside, a regime headquarters and hidden tunnels, all the way to the open sea.

## Tech

- **Vite** + **vanilla JavaScript** (ES modules)
- **Canvas 2D** for the game; **HTML/CSS** for the taskbar and modals
- Overhead view, **16 × 16 px tiles**
- Fixed **1280 × 720** frame (1280 × 640 play area + 80 px taskbar), scaled to fit the window

### Fonts

Self-hosted through [Fontsource](https://fontsource.org), so no external requests are made.

| Role | Font |
| --- | --- |
| Main (body, dialogue, menus) | Cormorant Garamond |
| Title (titles, level names) | Stardos Stencil |
| Monospace (documents, logs, taskbar data) | Special Elite |

### Colour

Bleak, but never pure black and white. Every colour is a CSS variable in `src/styles/theme.css`, and the canvas reads the same variables through `src/core/palette.js`.

| Group | Character |
| --- | --- |
| Core | Soot, concrete greys, paper |
| Regime | Regime red, the loudest colour in the game |
| Resistance | Warm amber light |
| City | Wet slate, brick, sodium street lamps |
| Countryside | Dark forest greens, tarmac, lightning |
| Headquarters | Sterile mint green, grimy greys, fluorescent light |
| Tunnels | Damp brick, dark water |
| Docks and sea | Deep sea blues, fog, rust, searchlights |

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrow keys | Move |
| Shift | Sneak: slower, but silent |
| E | Take documents or stones; talk; use the evidence board |
| Mouse click | Throw a stone where you aim |
| Esc / P | Pause |

Keep still (or sneak) in a doorway or alcove to hide. Footsteps carry; stones carry further.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # production build to dist/
npm run preview   # serve the production build
```

## Project structure

```
unfrith/
  index.html          # canvas + taskbar
  src/
    main.js           # boot: fonts, display, loop, first scene
    core/             # display scaling, palette, loop, scene manager
    world/            # tiles, tile map, A* pathfinding, city and tunnel generators, renderers, lighting
    entities/         # player, guards, stones, resistance members
    ai/               # vision cones
    systems/          # noise events, game state, the Fracture
    data/             # evidence catalogue, the resistance
    scenes/           # title screen, levels, endings
    ui/               # taskbar, modals, the evidence board
    styles/           # theme.css (fonts + palette), main.css (layout)
  public/
    levels/           # level data
    assets/           # sprites, tiles, audio
```

## Status

**v0.3.0: Level 1 and Safe Passage I.**

- **Level 1, The City Maze:** a procedurally generated city (L-shaped buildings, hiding doorways, rooftop propaganda posters) whose walls shift whenever the curfew bell rings. Every generated city is checked to be escapable in every phase.
- **Safe Passage I, Under the City:** dark tunnels with a torch-carrying patrol and alcoves to hide in, leading to the resistance base, where the people who will help you are waiting. Some of them, at least.
- **The evidence board:** read what you carried out, string together documents that tell the same story, and decide which power sees each one.
- **Core:** input, camera, fixed-step loop, scenes, synthesised audio, guard AI with vision cones, hearing and stone distraction, a lighting layer, taskbar and modals.

Next: Level 2, the Country Roads.
