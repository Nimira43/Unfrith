import { EVIDENCE, CORROBORATION, WEIGHT_DAMAGE } from "../data/evidence.js";
import { gameState } from "./gameState.js";

export const BOND_BROKEN_AT = 40;
export const RECIPIENTS = ["Committee", "CAP", "HIA"];
export const BONDS = ["Committee-CAP", "Committee-HIA", "CAP-HIA"];

export function corroborates(a, b) {
  return CORROBORATION.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

export function isLinked(a, b) {
  return gameState.links.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

export function link(a, b) {
  if (a === b) return { ok: false, message: "Choose a different document." };
  if (isLinked(a, b))
    return { ok: false, message: "These are already linked." };
  if (!corroborates(a, b))
    return {
      ok: false,
      message: "These don't tell the same story. The string won't hold.",
    };
  gameState.links.push([a, b]);
  return {
    ok: true,
    message:
      "Linked. Corroborated evidence is believed: +5 when either is leaked.",
  };
}

export function leak(id, recipient) {
  const e = EVIDENCE[id];
  if (!e || gameState.leaked[id]) return null;
  gameState.leaked[id] = recipient;

  if (recipient === e.leakTo) {
    const bonus =
      gameState.links.filter(([x, y]) => x === id || y === id).length * 5;
    const damage = WEIGHT_DAMAGE[e.weight] + bonus;
    const before = gameState.fracture[e.bond];
    gameState.fracture[e.bond] = Math.max(0, before - damage);
    const broke =
      before > BOND_BROKEN_AT && gameState.fracture[e.bond] <= BOND_BROKEN_AT;
    return {
      correct: true,
      bond: e.bond,
      damage,
      broke,
      message: broke
        ? `Trust between ${bondName(e.bond)} is broken.`
        : `It lands. Trust between ${bondName(e.bond)} weakens.${bonus ? ` (+${bonus} corroborated)` : ""}`,
    };
  }

  if (recipient === "HIA") {
    gameState.hiaSuspicion += 10;
    return {
      correct: false,
      damage: 0,
      message: "Wasted — and now the HIA knows what we hold.",
    };
  }
  gameState.hiaSuspicion += 5;
  return {
    correct: false,
    damage: 0,
    message: "It means little to them. Wasted, and word travels.",
  };
}

export function bondName(bond) {
  const [a, b] = bond.split("-");
  return `the ${a} and the ${b}`;
}

export function brokenCount() {
  return BONDS.filter((b) => gameState.fracture[b] <= BOND_BROKEN_AT).length;
}
