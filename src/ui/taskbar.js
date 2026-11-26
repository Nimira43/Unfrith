const $ = (id) => document.getElementById(id);

const TICKER_LINES = [
  "Obedience · Work · Worship",
  "Curfew protects you",
  "Report suspicious behaviour",
  "The Father watches over you",
  "Idle hands betray the nation",
  "Your neighbour is watching",
];

export function createTaskbar() {
  const el = $("taskbar");
  const alertEl = $("tb-alert");
  const tickerEl = $("tb-ticker");
  const handlers = {};
  let tickerTimer = 0;
  let tickerIndex = 0;
  let override = null;
  let overrideTimer = 0;
  let lastAlert = "";

  el.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (btn && !btn.disabled) {
      handlers[btn.dataset.action]?.();
      btn.blur();
    }
  });

  return {
    mode(m) {
      el.classList.toggle("is-title", m === "title");
    },
    on(action, fn) {
      handlers[action] = fn;
    },
    enable(action, on) {
      const btn = el.querySelector(`button[data-action="${action}"]`);
      if (btn) {
        btn.disabled = !on;
        btn.title = on ? "" : btn.title;
      }
    },
    showBell(on) {
      $("tb-bell-wrap").style.display = on ? "" : "none";
    },
    status(text) {
      $("tb-status").textContent = text;
    },
    alert(state) {
      if (state === lastAlert) return;
      lastAlert = state;
      alertEl.className = `alert alert--${state}`;
      alertEl.querySelector("b").textContent = state.toUpperCase();
    },
    evidence(n, total) {
      $("tb-evidence").textContent = `${n}/${total}`;
    },
    stones(n, max) {
      $("tb-stones").textContent = `${n}/${max}`;
    },
    bell(seconds) {
      $("tb-bell-label").textContent = "Bell";
      const s = Math.max(0, Math.ceil(seconds));
      $("tb-bell").textContent = `0:${String(s).padStart(2, "0")}`;
    },
    timer(label, seconds) {
      $("tb-bell-label").textContent = label;
      const s = Math.max(0, Math.ceil(seconds));
      $("tb-bell").textContent =
        `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    },
    announce(text, seconds = 4, warning = false) {
      override = text;
      overrideTimer = seconds;
      tickerEl.textContent = text;
      tickerEl.classList.toggle("is-warning", warning);
    },
    update(dt) {
      if (override) {
        overrideTimer -= dt;
        if (overrideTimer <= 0) {
          override = null;
          tickerEl.classList.remove("is-warning");
          tickerEl.textContent = TICKER_LINES[tickerIndex];
        }
        return;
      }
      tickerTimer += dt;
      if (tickerTimer > 7) {
        tickerTimer = 0;
        tickerIndex = (tickerIndex + 1) % TICKER_LINES.length;
        tickerEl.textContent = TICKER_LINES[tickerIndex];
      }
    },
  };
}
