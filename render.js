/* ============================================================
   Mundial 2026 — Render + interacción
   ============================================================ */
const E = window.engine;

const flagURL = (code) => `https://flagcdn.com/${code}.svg`;
const expanded = new Set(); // grupos con editor de partidos abierto

function fmtDG(n) { return n > 0 ? "+" + n : "" + n; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

/* ---------- captura/restaura foco al re-render ---------- */
function captureFocus() {
  const a = document.activeElement;
  if (a && a.dataset && a.dataset.fid) {
    return { fid: a.dataset.fid, s: a.selectionStart, e: a.selectionEnd };
  }
  return null;
}
function restoreFocus(f) {
  if (!f) return;
  const el = document.querySelector(`[data-fid="${f.fid}"]`);
  if (el) { el.focus(); try { el.setSelectionRange(f.s, f.e); } catch (e) {} }
}

/* ===================== GRUPOS ===================== */
// Grupos cuyo 3.º entra entre los 8 mejores terceros (los que clasifican).
// Provisional: se recalcula con lo que haya cargado. Vacío si no hay resultados.
function qualifiedThirdGroups() {
  const anyPlayed = GROUP_LETTERS.some(g => E.groupPlayedCount(g) > 0);
  if (!anyPlayed) return new Set();
  return new Set(E.rankThirds().slice(0, 8).map(t => t.g));
}

function standingsHTML(g, q3groups) {
  const ranked = E.rankGroup(g);
  const teams = GROUPS[g];
  let rows = "";
  ranked.forEach((s, pos) => {
    const t = teams[s.i];
    const cls = pos < 2 ? "q1" : (pos === 2 && q3groups.has(g) ? "q3" : "");
    rows += `<tr class="${cls}">
      <td class="pos">${pos + 1}</td>
      <td class="team-col"><span class="team-cell"><img src="${flagURL(t.flag)}" alt=""><span class="code">${t.code}</span></span></td>
      <td>${s.pj}</td><td>${s.gf}</td><td>${s.gc}</td><td>${fmtDG(s.dg)}</td><td class="pts">${s.pts}</td>
    </tr>`;
  });
  return `<table class="standings">
    <thead><tr><th>#</th><th class="team-col">Equipo</th><th>PJ</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function matchesHTML(g) {
  const teams = GROUPS[g];
  let rows = "";
  ROUND_ROBIN.forEach((pair, idx) => {
    const [ia, ib] = pair;
    const A = teams[ia], B = teams[ib];
    const r = (E.state.group[g] && E.state.group[g][idx]) || {};
    const va = (r.a ?? "") === "" ? "" : r.a;
    const vb = (r.b ?? "") === "" ? "" : r.b;
    // Partido con resultado oficial (API): bloqueado y marcado.
    const real = E.isRealGroup(g, idx);
    const lock = real ? "disabled" : "";
    rows += `<div class="match-row${real ? " real" : ""}">
      <div class="mt left"><span class="code">${A.code}</span><img src="${flagURL(A.flag)}" alt=""></div>
      <div class="score">
        <input data-role="gscore" data-g="${g}" data-i="${idx}" data-side="a" data-fid="g-${g}-${idx}-a"
               inputmode="numeric" maxlength="2" value="${va}" aria-label="${A.code} goles" ${lock}>
        <span class="dash">–</span>
        <input data-role="gscore" data-g="${g}" data-i="${idx}" data-side="b" data-fid="g-${g}-${idx}-b"
               inputmode="numeric" maxlength="2" value="${vb}" aria-label="${B.code} goles" ${lock}>
      </div>
      <div class="mt"><img src="${flagURL(B.flag)}" alt=""><span class="code">${B.code}</span></div>
      ${real ? '<span class="real-tag">oficial</span>' : ""}
    </div>`;
  });
  return `<div class="matches${expanded.has(g) ? "" : " hidden"}">
    <div class="matches-note">Cargá los marcadores · la tabla se reordena con reglas FIFA</div>
    ${rows}</div>`;
}

function groupCardHTML(g, q3groups) {
  const played = E.groupPlayedCount(g);
  return `<div class="group-card">
    <div class="gc-head">
      <span class="gc-letter">Grupo ${g}</span>
      <button class="gc-edit" data-action="toggle-matches" data-g="${g}">
        ${icon(expanded.has(g) ? "chevron-up" : "pencil")}
        ${expanded.has(g) ? "Cerrar" : "Resultados"} <span style="opacity:.6">${played}/6</span>
      </button>
    </div>
    ${standingsHTML(g, q3groups)}
    ${matchesHTML(g)}
  </div>`;
}

function renderGroups() {
  const q3groups = qualifiedThirdGroups();
  document.getElementById("groups").innerHTML =
    GROUP_LETTERS.map(g => groupCardHTML(g, q3groups)).join("");
}

/* ===================== LLAVE ===================== */
function slotHTML(matchId, side, slot, decidedWinner, showPens) {
  const res = E.resolveSlot(slot);
  const r = E.state.ko[matchId] || {};
  const v = (r[side] ?? "") === "" ? "" : r[side];
  let cls = "bk-slot";
  let isWinner = false;
  if (decidedWinner) {
    isWinner = res.team && decidedWinner.code === res.team.code;
    cls += isWinner ? " winner" : " loser";
  }
  // Sello "pen" sobre el ganador cuando el cruce se definió por penales.
  const penTag = (isWinner && E.koByPens(matchId)) ? '<span class="pen-win-tag">pen</span>' : "";
  const teamHTML = res.team
    ? `<div class="bk-team${res.provisional ? " prov" : ""}" title="${res.provisional ? "Provisional · cambia según los grupos" : ""}">
         <img src="${flagURL(res.team.flag)}" alt=""><span class="code">${res.team.code}</span>${penTag}${res.provisional ? '<span class="prov-tag">prov.</span>' : ""}
       </div>`
    : `<div class="bk-team"><span class="placeholder">${esc(res.label)}</span></div>`;
  const canScore = bothDecided(matchId);
  // Columna de penales pegada al marcador (sólo en empate), una por equipo.
  const penSide = side === "a" ? "pa" : "pb";
  const pv = (r[penSide] ?? "") === "" ? "" : r[penSide];
  const penInput = showPens
    ? `<input class="bk-pscore" data-role="pscore" data-id="${matchId}" data-side="${penSide}" data-fid="${penSide}-${matchId}"
              inputmode="numeric" maxlength="2" value="${pv}" aria-label="penales">`
    : "";
  return `<div class="${cls}${showPens ? " has-pen" : ""}">
    ${teamHTML}
    <input class="bk-score" data-role="kscore" data-id="${matchId}" data-side="${side}" data-fid="k-${matchId}-${side}"
           inputmode="numeric" maxlength="2" value="${v}" ${canScore ? "" : "disabled"} aria-label="goles">
    ${penInput}
  </div>`;
}

function bothDecided(id) {
  const m = E.findKO(id);
  if (!m) return false;
  return E.resolveSlot(m.a).team && E.resolveSlot(m.b).team;
}

function matchHTML(m, isFinal) {
  const win = E.koWinner(m.id);
  const res = E.koResult(m.id);
  // Empate resuelto → mostramos columna de penales junto al marcador.
  const showPens = bothDecided(m.id) && res && res.a === res.b;
  return `<div class="bk-match${isFinal ? " is-final" : ""}" data-id="${m.id}">
    <div class="bk-meta"><span class="bk-place">${m.date} · ${esc(m.city)}</span>${showPens ? '<span class="bk-penttl">Penales</span>' : ""}</div>
    ${slotHTML(m.id, "a", m.a, win, showPens)}
    ${slotHTML(m.id, "b", m.b, win, showPens)}
  </div>`;
}

function columnHTML(label, matches) {
  const cards = matches.map(m => matchHTML(m, false)).join("");
  return `<div class="bk-col">
    <div class="col-label">${label}</div>
    <div class="matchups">${cards}</div>
  </div>`;
}

function championHTML() {
  const champ = E.koWinner(KO.fin.id);
  return champ ? `<div class="champion">
      <div class="ch-label">Campeón</div>
      <div class="ch-team"><img src="${flagURL(champ.flag)}" alt=""><span class="code">${champ.code}</span></div>
    </div>` : "";
}

function centerHTML() {
  return `<div class="bk-col center">
    <div class="final-card">
      <div class="final-trophy">${icon("trophy")}<div class="ft-label">FINAL</div></div>
      ${matchHTML(KO.fin, true)}
      ${championHTML()}
      <div class="tercer">
        <div class="col-label" style="font-size:11px;margin-bottom:6px">3.º puesto</div>
        ${matchHTML(KO.ter, false)}
      </div>
    </div>
  </div>`;
}

function left(side, arr) { return arr.filter(m => m.side === side); }

// Vista móvil: rondas apiladas en vertical (cada partido con un equipo arriba y
// otro abajo). No usa el reparto L/R del cuadro de escritorio.
function mobileRoundHTML(label, matches) {
  return `<section class="bk-mround">
    <div class="bk-mlabel">${label}</div>
    <div class="bk-mgrid">${matches.map(m => matchHTML(m, false)).join("")}</div>
  </section>`;
}

// --- Árbol plegado (estilo bracket vertical): cada ronda es una fila de tarjetas
// que embudan hacia la FINAL central con líneas conectoras; abajo se refleja la
// otra mitad. Las tarjetas siguen siendo editables.
function treeRow(label, matches) {
  const cells = matches.map(m => `<div class="bk-tcell">${matchHTML(m, false)}</div>`).join("");
  const cols = `grid-template-columns:repeat(${matches.length},minmax(0,1fr))`;
  return `<div class="bk-trow"><div class="bk-tlabel">${label}</div><div class="bk-tcards" style="${cols}">${cells}</div></div>`;
}
// Conector de N celdas que fusionan pares de la ronda anterior (⊔). flip = embudo
// invertido (mitad de abajo). straight = línea recta (semi↔final).
function treeConn(cells, opts = {}) {
  const cls = "bk-conn" + (opts.flip ? " flip" : "") + (opts.straight ? " straight" : "");
  let inner = "";
  for (let i = 0; i < cells; i++) inner += `<div class="bk-merge"></div>`;
  return `<div class="${cls}">${inner}</div>`;
}

function bracketMobileHTML() {
  const octL = left("L", KO.oct), octR = left("R", KO.oct);
  const cuaL = left("L", KO.cua), cuaR = left("R", KO.cua);
  const semL = left("L", KO.sem), semR = left("R", KO.sem);
  return `<div class="bk-mobile">
    ${mobileRoundHTML("16avos de final", KO.r32)}
    <div class="bk-tree">
      ${treeRow("Octavos de final", octL)}
      ${treeConn(2)}
      ${treeRow("Cuartos de final", cuaL)}
      ${treeConn(1)}
      ${treeRow("Semifinales", semL)}
      ${treeConn(1, { straight: true })}
      <div class="bk-tfinal">
        <div class="bk-tlabel center">${icon("trophy")} Final</div>
        <div class="bk-tcards"><div class="bk-tcell">${matchHTML(KO.fin, true)}</div></div>
        ${championHTML()}
      </div>
      ${treeConn(1, { straight: true, flip: true })}
      ${treeRow("Semifinales", semR)}
      ${treeConn(1, { flip: true })}
      ${treeRow("Cuartos de final", cuaR)}
      ${treeConn(2, { flip: true })}
      ${treeRow("Octavos de final", octR)}
    </div>
    ${mobileRoundHTML("Tercer puesto", [KO.ter])}
  </div>`;
}

function renderBracket() {
  const r32L = left("L", KO.r32), r32R = left("R", KO.r32);
  const octL = left("L", KO.oct), octR = left("R", KO.oct);
  const cuaL = left("L", KO.cua), cuaR = left("R", KO.cua);
  const semL = left("L", KO.sem), semR = left("R", KO.sem);
  const desktop = `<div class="bk-desktop">` +
    columnHTML("16avos", r32L) +
    columnHTML("Octavos", octL) +
    columnHTML("Cuartos", cuaL) +
    columnHTML("Semis", semL) +
    centerHTML() +
    columnHTML("Semis", semR) +
    columnHTML("Cuartos", cuaR) +
    columnHTML("Octavos", octR) +
    columnHTML("16avos", r32R) +
    `</div>`;
  document.getElementById("bracket").innerHTML = desktop + bracketMobileHTML();
}

/* ===================== PROGRESO ===================== */
function renderProgress() {
  let played = 0;
  for (const g of GROUP_LETTERS) played += E.groupPlayedCount(g);
  const pill = document.getElementById("progress");
  if (pill) {
    pill.textContent = E.allGroupsComplete()
      ? "Fase de grupos completa · llave activa"
      : `Fase de grupos · ${played}/72 partidos`;
  }
}

/* ===================== RENDER GLOBAL ===================== */
function render() {
  const f = captureFocus();
  renderGroups();
  renderBracket();
  renderProgress();
  restoreFocus(f);
}

/* ===================== EVENTOS ===================== */
function sanitize(v) {
  if (v === "" || v == null) return "";
  let n = parseInt(String(v).replace(/[^0-9]/g, ""), 10);
  if (Number.isNaN(n)) return "";
  if (n > 30) n = 30;
  return n;
}

document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.dataset.role === "gscore") {
    const { g, i, side } = t.dataset;
    if (E.isRealGroup(g, i)) return; // resultado oficial: no editable
    if (!E.state.group[g]) E.state.group[g] = {};
    if (!E.state.group[g][i]) E.state.group[g][i] = { a: "", b: "" };
    E.state.group[g][i][side] = sanitize(t.value);
    E.saveState();
    render();
  } else if (t.dataset.role === "kscore") {
    const { id, side } = t.dataset;
    if (!E.state.ko[id]) E.state.ko[id] = { a: "", b: "", pen: null };
    E.state.ko[id][side] = sanitize(t.value);
    E.saveState();
    render();
  } else if (t.dataset.role === "pscore") {
    const { id, side } = t.dataset; // side = "pa" | "pb"
    if (!E.state.ko[id]) E.state.ko[id] = { a: "", b: "", pen: null };
    E.state.ko[id][side] = sanitize(t.value);
    E.saveState();
    render();
  }
});

document.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-action]");
  if (!btn) return;
  const a = btn.dataset.action;
  if (a === "toggle-matches") {
    const g = btn.dataset.g;
    if (expanded.has(g)) expanded.delete(g); else expanded.add(g);
    render();
  } else if (a === "reset") {
    if (confirm("¿Borrar todos los resultados cargados?")) {
      E.resetState();
      render();
      toast("Resultados borrados");
    }
  } else if (a === "simulate") {
    E.simulateGroups();
    render();
    toast("Grupos simulados · cargá la llave o simulala");
  }
});

/* ===================== TOAST ===================== */
let toastTimer = null;
function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast"; el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ===================== ICONOS (Lucide inline) ===================== */
function icon(name) {
  const p = {
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    "chevron-up": '<path d="m18 15-6-6-6 6"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    dice: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 8h.01M16 8h.01M8 16h.01M16 16h.01M12 12h.01"/>',
  }[name] || "";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

/* ===================== INIT ===================== */
document.querySelectorAll("[data-icon]").forEach(b => {
  b.insertAdjacentHTML("afterbegin", icon(b.dataset.icon));
});
E.loadState().then(() => {
  render(); // estado real horneado (semilla) o predicciones guardadas en el celular
});
render(); // primer pintado inmediato
