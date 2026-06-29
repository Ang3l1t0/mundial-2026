/* ============================================================
   Mundial 2026 — Motor de cálculo (versión OFFLINE / sin servidor)
   · Tabla de grupos con desempates FIFA completos
   · Ranking de mejores terceros
   · Resolución dinámica de la llave
   · Persistencia 100% local (localStorage) — no hay backend
   · Arranca desde la SEMILLA real (seed.js) si no hay datos guardados
   ============================================================ */

const STORE_KEY = "mundial2026.v2"; // v2: cambia la forma (semilla horneada, sin server)

// estado.group["A"][matchIndex] = { a: golesEquipoA, b: golesEquipoB } | undefined
// estado.ko[matchId] = { a, b, pen: "a"|"b"|null }
// estado.real["A"][matchIndex] = { a, b }  ← resultado OFICIAL (de la semilla), pisa lo cargado
const state = { group: {}, ko: {}, real: {} };

// Semilla con los datos reales horneados (window.SEED viene de seed.js).
function seedData() {
  const s = (typeof SEED !== "undefined" && SEED) ? SEED
          : (typeof window !== "undefined" && window.SEED) ? window.SEED
          : { group: {}, ko: {}, real: {} };
  // copia profunda para no mutar la semilla
  return JSON.parse(JSON.stringify(s));
}

// Superpone los resultados oficiales (real) sobre group: lo oficial siempre gana.
function overlayReal() {
  for (const g of Object.keys(state.real || {})) {
    if (!state.group[g]) state.group[g] = {};
    for (const idx of Object.keys(state.real[g])) {
      state.group[g][idx] = state.real[g][idx];
    }
  }
}

// Carga el estado: SÓLO local. Si hay datos guardados (predicciones del usuario)
// se usan; si no, se arranca desde la semilla real. `real` (lo oficial) siempre
// proviene de la semilla y se superpone, así nunca se pierde ni se puede editar.
// Async (devuelve Promise) sólo para no tocar el init de render.js.
function loadState() {
  const seed = seedData();
  state.real = seed.real || {};

  let loaded = null;
  try { loaded = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* noop */ }

  if (loaded && loaded.group) {
    state.group = loaded.group;
    state.ko = loaded.ko || {};
  } else {
    // primera vez: partimos de la semilla real
    state.group = seed.group || {};
    state.ko = seed.ko || {};
  }

  overlayReal();
  for (const g of GROUP_LETTERS) if (!state.group[g]) state.group[g] = {};
  return Promise.resolve();
}

// ¿El partido (g, idx) tiene resultado oficial? → input bloqueado.
function isRealGroup(g, idx) {
  return !!(state.real && state.real[g] && state.real[g][idx]);
}

// Guarda en localStorage. No hay servidor que sincronizar.
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ group: state.group, ko: state.ko }));
  } catch (e) { /* noop */ }
}

function resetState() {
  state.group = {};
  state.ko = {};
  for (const g of GROUP_LETTERS) state.group[g] = {};
  // Conservamos los resultados oficiales: el reset sólo borra predicciones.
  for (const g of Object.keys(state.real || {})) {
    state.group[g] = { ...state.real[g] };
  }
  saveState();
}

// ---- Resultado de un partido de grupo ----
function groupResult(g, idx) {
  const r = state.group[g] && state.group[g][idx];
  if (!r) return null;
  if (r.a === "" || r.b === "" || r.a == null || r.b == null) return null;
  const a = Number(r.a), b = Number(r.b);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return { a, b };
}

function groupPlayedCount(g) {
  let n = 0;
  for (let i = 0; i < ROUND_ROBIN.length; i++) if (groupResult(g, i)) n++;
  return n;
}
function groupComplete(g) { return groupPlayedCount(g) === ROUND_ROBIN.length; }
function allGroupsComplete() { return GROUP_LETTERS.every(groupComplete); }

// ---- Estadísticas base por equipo de un grupo ----
function blankStat(teamIdx) {
  return { i: teamIdx, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
}

function computeGroupStats(g) {
  const teams = GROUPS[g];
  const stats = teams.map((_, i) => blankStat(i));
  ROUND_ROBIN.forEach((pair, idx) => {
    const res = groupResult(g, idx);
    if (!res) return;
    const [ia, ib] = pair;
    const A = stats[ia], B = stats[ib];
    A.pj++; B.pj++;
    A.gf += res.a; A.gc += res.b;
    B.gf += res.b; B.gc += res.a;
    if (res.a > res.b) { A.g++; B.p++; A.pts += 3; }
    else if (res.a < res.b) { B.g++; A.p++; B.pts += 3; }
    else { A.e++; B.e++; A.pts++; B.pts++; }
  });
  stats.forEach(s => { s.dg = s.gf - s.gc; });
  return stats;
}

// ---- Mini-tabla cara a cara entre un subconjunto de equipos empatados ----
function headToHead(g, idxSet) {
  const mini = {};
  idxSet.forEach(i => { mini[i] = { pts: 0, dg: 0, gf: 0 }; });
  ROUND_ROBIN.forEach((pair, idx) => {
    const [ia, ib] = pair;
    if (!idxSet.includes(ia) || !idxSet.includes(ib)) return;
    const res = groupResult(g, idx);
    if (!res) return;
    mini[ia].gf += res.a; mini[ib].gf += res.b;
    mini[ia].dg += res.a - res.b; mini[ib].dg += res.b - res.a;
    if (res.a > res.b) mini[ia].pts += 3;
    else if (res.a < res.b) mini[ib].pts += 3;
    else { mini[ia].pts++; mini[ib].pts++; }
  });
  return mini;
}

// Comparador FIFA: pts > dg > gf > (h2h: pts > dg > gf) > sorteo (código alfabético)
function rankGroup(g) {
  const stats = computeGroupStats(g);
  const teams = GROUPS[g];

  // 1) ordenar por criterios globales
  stats.sort((x, y) => cmpOverall(x, y) || teams[x.i].code.localeCompare(teams[y.i].code));

  // 2) resolver bloques empatados en (pts,dg,gf) por cara a cara
  const result = [];
  let i = 0;
  while (i < stats.length) {
    let j = i;
    while (j + 1 < stats.length && tiedOverall(stats[j], stats[j + 1])) j++;
    if (j > i) {
      const block = stats.slice(i, j + 1);
      const idxSet = block.map(s => s.i);
      const mini = headToHead(g, idxSet);
      block.sort((x, y) =>
        (mini[y.i].pts - mini[x.i].pts) ||
        (mini[y.i].dg - mini[x.i].dg) ||
        (mini[y.i].gf - mini[x.i].gf) ||
        teams[x.i].code.localeCompare(teams[y.i].code)
      );
      result.push(...block);
    } else {
      result.push(stats[i]);
    }
    i = j + 1;
  }
  return result; // ordenado: [1º, 2º, 3º, 4º]
}

function cmpOverall(x, y) {
  return (y.pts - x.pts) || (y.dg - x.dg) || (y.gf - x.gf);
}
function tiedOverall(x, y) {
  return x.pts === y.pts && x.dg === y.dg && x.gf === y.gf;
}

// ---- Ranking de mejores terceros (sólo cuando hay datos) ----
// Devuelve array de 12 {g, stat} ordenado; los 8 primeros clasifican.
function rankThirds() {
  const thirds = GROUP_LETTERS.map(g => {
    const ranked = rankGroup(g);
    return { g, stat: ranked[2], complete: groupComplete(g) };
  });
  thirds.sort((x, y) =>
    cmpOverall(x.stat, y.stat) || x.g.localeCompare(y.g)
  );
  return thirds;
}

// ---- Resolución de slots de la llave ----
// Devuelve { team, label, decided }
function resolveSlot(slot) {
  if (!slot) return { team: null, label: "—", decided: false };
  if (slot.t === "W" || slot.t === "R") {
    const pos = slot.t === "W" ? 0 : 1;
    const label = (slot.t === "W" ? "1º " : "2º ") + slot.g;
    // Provisional: en cuanto el grupo tiene algún resultado mostramos el 1º/2º
    // actual; pasa a definitivo cuando se cargan los 6 partidos.
    if (groupPlayedCount(slot.g) > 0) {
      const ranked = rankGroup(slot.g);
      const decided = groupComplete(slot.g);
      return { team: { ...GROUPS[slot.g][ranked[pos].i], g: slot.g }, label, decided, provisional: !decided };
    }
    return { team: null, label, decided: false };
  }
  if (slot.t === "T") {
    // El cruce ganador-vs-3.º (slot.w = "1A".."1L") sale de la tabla oficial del
    // Anexo C: según QUÉ 8 grupos clasifican su tercero, a cada ganador le toca el
    // 3.º de un grupo concreto. Provisional hasta que los 12 grupos estén completos.
    const anyPlayed = GROUP_LETTERS.some(g => groupPlayedCount(g) > 0);
    if (anyPlayed) {
      const key = rankThirds().slice(0, 8).map(t => t.g).sort().join("");
      const alloc = THIRD_ALLOCATION[key];
      if (alloc && alloc[slot.w]) {
        const grp = alloc[slot.w];
        const ranked = rankGroup(grp);
        const decided = allGroupsComplete();
        return { team: { ...GROUPS[grp][ranked[2].i], g: grp }, label: "3.º " + grp, decided, provisional: !decided };
      }
    }
    return { team: null, label: "3.º", decided: false };
  }
  if (slot.t === "M") {
    const w = koWinner(slot.m);
    return { team: w, label: "Gan. " + slot.m, decided: !!w, provisional: w ? !allGroupsComplete() : false };
  }
  if (slot.t === "ML") {
    const l = koLoser(slot.m);
    return { team: l, label: "Per. " + slot.m, decided: !!l, provisional: l ? !allGroupsComplete() : false };
  }
  return { team: null, label: "—", decided: false };
}

function findKO(id) {
  if (KO.fin.id === id) return KO.fin;
  if (KO.ter.id === id) return KO.ter;
  for (const round of [KO.r32, KO.oct, KO.cua, KO.sem]) {
    const m = round.find(x => x.id === id);
    if (m) return m;
  }
  return null;
}

function koResult(id) {
  const r = state.ko[id];
  if (!r) return null;
  if (r.a === "" || r.b === "" || r.a == null || r.b == null) return null;
  const a = Number(r.a), b = Number(r.b);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  // Penales (sólo cuentan en empate): marcador opcional pa-pb.
  const pa = (r.pa === "" || r.pa == null) ? null : Number(r.pa);
  const pb = (r.pb === "" || r.pb == null) ? null : Number(r.pb);
  return {
    a, b, pen: r.pen || null,
    pa: Number.isNaN(pa) ? null : pa,
    pb: Number.isNaN(pb) ? null : pb,
  };
}

// ¿El partido se definió por penales? (empate en los 90' + penales decisivos)
function koByPens(id) {
  const res = koResult(id);
  if (!res || res.a !== res.b) return false;
  if (res.pa != null && res.pb != null && res.pa !== res.pb) return true;
  return res.pen === "a" || res.pen === "b";
}

// Ganador de un partido KO (requiere ambos slots resueltos y resultado válido)
function koWinner(id) {
  const m = findKO(id);
  if (!m) return null;
  const A = resolveSlot(m.a), B = resolveSlot(m.b);
  if (!A.team || !B.team) return null;
  const res = koResult(id);
  if (!res) return null;
  if (res.a > res.b) return A.team;
  if (res.b > res.a) return B.team;
  // empate → penales: gana quien anotó más; si no hay marcador, cae al pick previo.
  if (res.pa != null && res.pb != null && res.pa !== res.pb) return res.pa > res.pb ? A.team : B.team;
  if (res.pen === "a") return A.team;
  if (res.pen === "b") return B.team;
  return null;
}

function koLoser(id) {
  const m = findKO(id);
  if (!m) return null;
  const A = resolveSlot(m.a), B = resolveSlot(m.b);
  if (!A.team || !B.team) return null;
  const res = koResult(id);
  if (!res) return null;
  const win = koWinner(id);
  if (!win) return null;
  return win.code === A.team.code ? B.team : A.team;
}

// ---- Simulación aleatoria de todos los grupos ----
function simulateGroups() {
  for (const g of GROUP_LETTERS) {
    if (!state.group[g]) state.group[g] = {};
    for (let i = 0; i < ROUND_ROBIN.length; i++) {
      if (isRealGroup(g, i)) continue; // no pisamos resultados oficiales
      state.group[g][i] = { a: rndGoals(), b: rndGoals() };
    }
  }
  saveState();
}
function rndGoals() {
  const r = Math.random();
  if (r < 0.34) return 0;
  if (r < 0.64) return 1;
  if (r < 0.84) return 2;
  if (r < 0.95) return 3;
  return 4;
}

window.engine = {
  state, loadState, saveState, resetState,
  groupResult, groupPlayedCount, groupComplete, allGroupsComplete,
  computeGroupStats, rankGroup, rankThirds,
  resolveSlot, findKO, koResult, koWinner, koLoser, koByPens,
  simulateGroups, isRealGroup,
};
