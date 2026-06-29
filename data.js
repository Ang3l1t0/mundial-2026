/* ============================================================
   Mundial 2026 — Datos base
   48 equipos · 12 grupos · formato oficial FIFA
   ============================================================ */

// flag = código flagcdn (ISO 3166-1 alpha-2, o subdivisión gb-eng / gb-sct)
const GROUPS = {
  A: [
    { code: "MEX", name: "México",        flag: "mx" },
    { code: "KOR", name: "Corea del Sur", flag: "kr" },
    { code: "CZE", name: "Chequia",       flag: "cz" },
    { code: "RSA", name: "Sudáfrica",     flag: "za" },
  ],
  B: [
    { code: "CAN", name: "Canadá",        flag: "ca" },
    { code: "SUI", name: "Suiza",         flag: "ch" },
    { code: "BIH", name: "Bosnia",        flag: "ba" },
    { code: "QAT", name: "Catar",         flag: "qa" },
  ],
  C: [
    { code: "SCO", name: "Escocia",       flag: "gb-sct" },
    { code: "BRA", name: "Brasil",        flag: "br" },
    { code: "MAR", name: "Marruecos",     flag: "ma" },
    { code: "HAI", name: "Haití",         flag: "ht" },
  ],
  D: [
    { code: "USA", name: "Estados Unidos", flag: "us" },
    { code: "AUS", name: "Australia",      flag: "au" },
    { code: "TUR", name: "Turquía",        flag: "tr" },
    { code: "PAR", name: "Paraguay",       flag: "py" },
  ],
  E: [
    { code: "GER", name: "Alemania",      flag: "de" },
    { code: "CIV", name: "Costa de Marfil", flag: "ci" },
    { code: "ECU", name: "Ecuador",       flag: "ec" },
    { code: "CUW", name: "Curazao",       flag: "cw" },
  ],
  F: [
    { code: "SWE", name: "Suecia",        flag: "se" },
    { code: "JPN", name: "Japón",         flag: "jp" },
    { code: "NED", name: "Países Bajos",  flag: "nl" },
    { code: "TUN", name: "Túnez",         flag: "tn" },
  ],
  G: [
    { code: "IRN", name: "Irán",          flag: "ir" },
    { code: "NZL", name: "Nueva Zelanda", flag: "nz" },
    { code: "BEL", name: "Bélgica",       flag: "be" },
    { code: "EGY", name: "Egipto",        flag: "eg" },
  ],
  H: [
    { code: "KSA", name: "Arabia Saudí",  flag: "sa" },
    { code: "URY", name: "Uruguay",       flag: "uy" },
    { code: "CPV", name: "Cabo Verde",    flag: "cv" },
    { code: "ESP", name: "España",        flag: "es" },
  ],
  I: [
    { code: "NOR", name: "Noruega",       flag: "no" },
    { code: "FRA", name: "Francia",       flag: "fr" },
    { code: "SEN", name: "Senegal",       flag: "sn" },
    { code: "IRQ", name: "Irak",          flag: "iq" },
  ],
  J: [
    { code: "ARG", name: "Argentina",     flag: "ar" },
    { code: "AUT", name: "Austria",       flag: "at" },
    { code: "JOR", name: "Jordania",      flag: "jo" },
    { code: "ALG", name: "Argelia",       flag: "dz" },
  ],
  K: [
    { code: "COL", name: "Colombia",      flag: "co" },
    { code: "POR", name: "Portugal",      flag: "pt" },
    { code: "COD", name: "Congo RD",      flag: "cd" },
    { code: "UZB", name: "Uzbekistán",    flag: "uz" },
  ],
  L: [
    { code: "ENG", name: "Inglaterra",    flag: "gb-eng" },
    { code: "GHA", name: "Ghana",         flag: "gh" },
    { code: "PAN", name: "Panamá",        flag: "pa" },
    { code: "CRO", name: "Croacia",       flag: "hr" },
  ],
};

const GROUP_LETTERS = Object.keys(GROUPS);

// Calendario round-robin para un grupo de 4 (índices 0–3).
// 6 partidos: J1 0-1,2-3 · J2 0-2,3-1 · J3 0-3,1-2
const ROUND_ROBIN = [
  [0, 1], [2, 3],
  [0, 2], [3, 1],
  [0, 3], [1, 2],
];

// Llave OFICIAL del Mundial 2026 (Anexo C FIFA · números de partido 73–104).
// Verificada contra el wall chart oficial + openfootball/ESPN/CBS/Fox.
// Slots: W=1.º grupo, R=2.º grupo, T=mejor tercero (w = ranura ganador-vs-3.º,
//        resuelta por THIRD_ALLOCATION según qué 8 grupos clasifican su 3.º),
//        M=ganador de partido previo, ML=perdedor (sólo 3.º puesto).
// side L = mitad que alimenta la semifinal M101; side R = la que alimenta M102.
const KO = {
  r32: [
    // ---- Mitad IZQUIERDA (→ semifinal M101) ----
    { id: "M74", a: { t: "W", g: "E" }, b: { t: "T", w: "1E" }, date: "03/07", city: "L. Ángeles",  side: "L" },
    { id: "M77", a: { t: "W", g: "I" }, b: { t: "T", w: "1I" }, date: "03/07", city: "Guadalajara", side: "L" },
    { id: "M73", a: { t: "R", g: "A" }, b: { t: "R", g: "B" }, date: "28/06", city: "Los Ángeles", side: "L" },
    { id: "M75", a: { t: "W", g: "F" }, b: { t: "R", g: "C" }, date: "30/06", city: "Vancouver",   side: "L" },
    { id: "M83", a: { t: "R", g: "K" }, b: { t: "R", g: "L" }, date: "01/07", city: "Seattle",     side: "L" },
    { id: "M84", a: { t: "W", g: "H" }, b: { t: "R", g: "J" }, date: "01/07", city: "Houston",     side: "L" },
    { id: "M81", a: { t: "W", g: "D" }, b: { t: "T", w: "1D" }, date: "01/07", city: "Dallas",      side: "L" },
    { id: "M82", a: { t: "W", g: "G" }, b: { t: "T", w: "1G" }, date: "02/07", city: "Atlanta",     side: "L" },
    // ---- Mitad DERECHA (→ semifinal M102) ----
    { id: "M76", a: { t: "W", g: "C" }, b: { t: "R", g: "F" }, date: "30/06", city: "Monterrey",   side: "R" },
    { id: "M78", a: { t: "R", g: "E" }, b: { t: "R", g: "I" }, date: "30/06", city: "Toronto",     side: "R" },
    { id: "M79", a: { t: "W", g: "A" }, b: { t: "T", w: "1A" }, date: "30/06", city: "Ciudad de Méx.", side: "R" },
    { id: "M80", a: { t: "W", g: "L" }, b: { t: "T", w: "1L" }, date: "02/07", city: "Miami",       side: "R" },
    { id: "M86", a: { t: "W", g: "J" }, b: { t: "R", g: "H" }, date: "01/07", city: "Boston",      side: "R" },
    { id: "M88", a: { t: "R", g: "D" }, b: { t: "R", g: "G" }, date: "01/07", city: "Filadelfia",  side: "R" },
    { id: "M85", a: { t: "W", g: "B" }, b: { t: "T", w: "1B" }, date: "02/07", city: "Nueva York",  side: "R" },
    { id: "M87", a: { t: "W", g: "K" }, b: { t: "T", w: "1K" }, date: "02/07", city: "Kansas City", side: "R" },
  ],
  oct: [
    { id: "M89", a: { t: "M", m: "M74" }, b: { t: "M", m: "M77" }, date: "04/07", city: "Houston",      side: "L" },
    { id: "M90", a: { t: "M", m: "M73" }, b: { t: "M", m: "M75" }, date: "05/07", city: "Los Ángeles",  side: "L" },
    { id: "M93", a: { t: "M", m: "M83" }, b: { t: "M", m: "M84" }, date: "06/07", city: "Dallas",       side: "L" },
    { id: "M94", a: { t: "M", m: "M81" }, b: { t: "M", m: "M82" }, date: "05/07", city: "Atlanta",      side: "L" },
    { id: "M91", a: { t: "M", m: "M76" }, b: { t: "M", m: "M78" }, date: "07/07", city: "Monterrey",    side: "R" },
    { id: "M92", a: { t: "M", m: "M79" }, b: { t: "M", m: "M80" }, date: "05/07", city: "Ciudad de Méx.", side: "R" },
    { id: "M95", a: { t: "M", m: "M86" }, b: { t: "M", m: "M88" }, date: "06/07", city: "Boston",       side: "R" },
    { id: "M96", a: { t: "M", m: "M85" }, b: { t: "M", m: "M87" }, date: "07/07", city: "Nueva York",   side: "R" },
  ],
  cua: [
    { id: "M97",  a: { t: "M", m: "M89" }, b: { t: "M", m: "M90" }, date: "10/07", city: "L. Ángeles",  side: "L" },
    { id: "M98",  a: { t: "M", m: "M93" }, b: { t: "M", m: "M94" }, date: "11/07", city: "Atlanta",     side: "L" },
    { id: "M99",  a: { t: "M", m: "M91" }, b: { t: "M", m: "M92" }, date: "11/07", city: "Ciudad de Méx.", side: "R" },
    { id: "M100", a: { t: "M", m: "M95" }, b: { t: "M", m: "M96" }, date: "09/07", city: "Miami",       side: "R" },
  ],
  sem: [
    { id: "M101", a: { t: "M", m: "M97" }, b: { t: "M", m: "M98" },  date: "14/07", city: "Dallas",     side: "L" },
    { id: "M102", a: { t: "M", m: "M99" }, b: { t: "M", m: "M100" }, date: "15/07", city: "Atlanta",    side: "R" },
  ],
  ter: { id: "M103", a: { t: "ML", m: "M101" }, b: { t: "ML", m: "M102" }, date: "18/07", city: "Miami" },
  fin: { id: "M104", a: { t: "M", m: "M101" }, b: { t: "M", m: "M102" }, date: "19/07", city: "Nueva York" },
};

// En el navegador exponemos los globals; en Node (server.js) exportamos para el
// mapeo de partidos de la API → grupo/índice. El mismo archivo sirve a ambos.
if (typeof window !== "undefined") {
  window.GROUPS = GROUPS;
  window.GROUP_LETTERS = GROUP_LETTERS;
  window.ROUND_ROBIN = ROUND_ROBIN;
  window.KO = KO;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GROUPS, GROUP_LETTERS, ROUND_ROBIN, KO };
}
