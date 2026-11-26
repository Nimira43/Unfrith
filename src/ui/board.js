import { input } from "../core/input.js";
import { sfx } from "../core/audio.js";
import { EVIDENCE } from "../data/evidence.js";
import { gameState } from "../systems/gameState.js";
import { link, leak, isLinked, RECIPIENTS } from "../systems/fracture.js";
import { fractureSVG, fractureSummary } from "./fractureView.js";

const CARD_W = 168;
const CARD_H = 104;

export function createBoard() {
  const root = document.getElementById("board");
  let selected = null;
  let linking = false;
  let pending = null;
  let message = "";
  let onClose = null;

  window.addEventListener(
    "keydown",
    (e) => {
      if (!board.isOpen || e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      board.close();
    },
    true,
  );

  root.addEventListener("click", (e) => {
    const card = e.target.closest("[data-card]");
    const btn = e.target.closest("button[data-act]");
    if (card) clickCard(card.dataset.card);
    else if (btn) clickButton(btn.dataset.act, btn.dataset.to);
  });

  function clickCard(id) {
    if (linking && selected && id !== selected) {
      const r = link(selected, id);
      message = r.message;
      if (r.ok) sfx.pickup();
      linking = false;
    } else {
      selected = id;
      linking = false;
      pending = null;
      message = "";
    }
    render();
  }

  function clickButton(act, to) {
    if (act === "close") return board.close();
    if (act === "link") {
      linking = !linking;
      pending = null;
      message = linking
        ? `Choose a document to link with ${EVIDENCE[selected].name}.`
        : "";
    }
    if (act === "send") {
      if (pending !== to) {
        pending = to;
        message = `Send ${EVIDENCE[selected].name} to ${label(to)}? This cannot be undone.`;
      } else {
        const r = leak(selected, to);
        message = r.message;
        pending = null;
        r.correct ? sfx.checkpoint() : sfx.warn();
      }
    }
    if (act === "cancel") {
      pending = null;
      message = "";
    }
    render();
  }

  function cardPos(i) {
    return { x: 28 + (i % 4) * 186, y: 148 + Math.floor(i / 4) * 140 };
  }

  function render() {
    const held = gameState.evidence;
    if (selected && !held.includes(selected)) selected = null;

    const cards = held
      .map((id, i) => {
        const e = EVIDENCE[id];
        const { x, y } = cardPos(i);
        const tilt = ((e.number * 37) % 7) - 3;
        const sent = gameState.leaked[id];
        return `
        <div class="card ${selected === id ? "is-selected" : ""} ${sent ? "is-sent" : ""} ${linking && id !== selected ? "is-linkable" : ""}"
             data-card="${id}" style="left:${x}px; top:${y}px; transform: rotate(${tilt}deg)" role="button" tabindex="0">
          <i class="card__pin"></i>
          <span class="card__no">No. ${e.number}</span>
          <span class="card__name">${e.name}</span>
          ${sent ? `<span class="card__stamp">Sent to ${sent === "Committee" ? "the Committee" : `the ${sent}`}</span>` : ""}
        </div>`;
      })
      .join("");

    const strings = gameState.links
      .filter(([a, b]) => held.includes(a) && held.includes(b))
      .map(([a, b]) => {
        const pa = cardPos(held.indexOf(a));
        const pb = cardPos(held.indexOf(b));
        return `<line x1="${pa.x + CARD_W / 2}" y1="${pa.y + 10}" x2="${pb.x + CARD_W / 2}" y2="${pb.y + 10}"/>`;
      })
      .join("");

    let detail = `<p class="board__hint">Select a document to read it.</p>`;
    if (selected) {
      const e = EVIDENCE[selected];
      const sent = gameState.leaked[selected];
      const linkedTo = held
        .filter((o) => o !== selected && isLinked(selected, o))
        .map((o) => EVIDENCE[o].name);
      detail = `
        <h3 class="board__docname">${e.name}</h3>
        <p class="board__doctext">${e.text}</p>
        ${linkedTo.length ? `<p class="board__linked">Linked with: ${linkedTo.join(", ")}</p>` : ""}
        ${
          sent
            ? ""
            : `
          <div class="board__actions">
            <button class="btn ${linking ? "btn--primary" : ""}" data-act="link" type="button">${linking ? "Cancel link" : "Link with…"}</button>
          </div>
          <p class="board__sendlabel">Send it to:</p>
          <div class="board__envelopes">
            ${RECIPIENTS.map((r) => `<button class="envelope ${pending === r ? "is-pending" : ""}" data-act="send" data-to="${r}" type="button">${pending === r ? "Confirm" : label(r)}</button>`).join("")}
          </div>
          ${pending ? '<button class="btn board__cancel" data-act="cancel" type="button">Not yet</button>' : ""}`
        }`;
    }

    root.innerHTML = `
      <div class="board__panel">
        <section class="board__cork">
          <div class="board__note">
            Read each document. Ask: <b>who would be most furious to see this?</b> Send it to them.
            The wrong desk wastes it, and the HIA may learn what we hold.
            Documents that tell the same story can be <b>linked</b>, and corroborated evidence is believed.
            <span class="board__sig">— R.</span>
          </div>
          <svg class="board__strings" width="760" height="560">${strings}</svg>
          ${cards || '<p class="board__empty">Nothing pinned yet. You carried no documents out of the city.</p>'}
        </section>
        <aside class="board__side">
          <div class="board__detail">${detail}</div>
          <p class="board__message" aria-live="polite">${message}</p>
          <div class="board__fracture">${fractureSVG({ dark: true })}<p>${fractureSummary()}</p></div>
          <button class="btn btn--primary board__close" data-act="close" type="button">Leave the board</button>
        </aside>
      </div>`;
  }

  const board = {
    isOpen: false,
    open(then = null) {
      onClose = then;
      selected = gameState.evidence.find((id) => !gameState.leaked[id]) ?? null;
      linking = false;
      pending = null;
      message = "";
      render();
      root.hidden = false;
      board.isOpen = true;
      input.clear();
    },
    close() {
      root.hidden = true;
      board.isOpen = false;
      input.clear();
      const fn = onClose;
      onClose = null;
      fn?.();
    },
  };
  return board;
}

function label(r) {
  return r === "Committee" ? "The Committee" : `The ${r}`;
}
