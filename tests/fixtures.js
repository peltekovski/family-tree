/* Test fixtures. Everything is built through the app's own store API so the
   fixtures can't drift from the real data model. All names are fictional. */
"use strict";

/**
 * A four-branch family used for kinship and layout tests. Returns { data, ids }
 * where ids maps a short key (me, father, uncle, …) to the person id.
 *
 *   Ivan ═ Maria                                   (great-grandparents)
 *   ├─ Stojan ═ Elena                              (grandparents)
 *   │   ├─ Zivko ═ Ana  (Ana also has Goran with Petar)
 *   │   │   ├─ ME ═ Sara (Sara's parents: Nikola ═ Olga)
 *   │   │   │   └─ Luka ─ Leo
 *   │   │   └─ Iva ═ Toni ─ Mila ─ Ema
 *   │   └─ Vasko ═ Lidija ─ Kiril ─ Tea
 *   └─ Vera ═ Boris ─ Dragan ─ Nada
 */
function familyFixture(FT) {
  const data = FT.emptyTree("Fixture family");
  const st = FT.createStore(data, null);
  const ids = {};
  const P = (key, firstName, sex, extra = {}) => { ids[key] = st.addPerson(Object.assign({ firstName, lastName: "Petrov", sex }, extra)).id; return ids[key]; };
  const kid = (key, name, sex, ...parents) => P(key, name, sex, { parentIds: parents.map(k => ids[k]) });
  const wed = (a, b, extra) => st.addMarriage(ids[a], ids[b], extra || {});

  P("ggf", "Ivan", "M"); P("ggm", "Maria", "F"); wed("ggf", "ggm");
  kid("gf", "Stojan", "M", "ggf", "ggm"); P("gm", "Elena", "F"); wed("gf", "gm");
  kid("greatAunt", "Vera", "F", "ggf", "ggm"); P("greatAuntHusband", "Boris", "M"); wed("greatAunt", "greatAuntHusband");
  kid("dragan", "Dragan", "M", "greatAunt", "greatAuntHusband");
  kid("nada", "Nada", "F", "dragan");
  kid("father", "Zivko", "M", "gf", "gm"); P("mother", "Ana", "F"); wed("father", "mother");
  kid("uncle", "Vasko", "M", "gf", "gm"); P("auntByMarriage", "Lidija", "F"); wed("uncle", "auntByMarriage");
  kid("cousin", "Kiril", "M", "uncle", "auntByMarriage");
  kid("cousinChild", "Tea", "F", "cousin");
  P("petar", "Petar", "M");
  kid("me", "Marko", "M", "father", "mother");
  kid("sister", "Iva", "F", "father", "mother");
  kid("halfBrother", "Goran", "M", "mother", "petar");
  P("fil", "Nikola", "M"); P("mil", "Olga", "F"); wed("fil", "mil");
  kid("wife", "Sara", "F", "fil", "mil"); wed("me", "wife");
  kid("son", "Luka", "M", "me", "wife");
  kid("grandson", "Leo", "M", "son");
  P("sisterHusband", "Toni", "M"); wed("sister", "sisterHusband");
  kid("niece", "Mila", "F", "sister", "sisterHusband");
  kid("greatNiece", "Ema", "F", "niece");
  data.settings.homePersonId = ids.me;
  return { data, ids };
}

/**
 * Deterministic synthetic tree of ~N people: founder couples, then generations
 * of couples with 1–4 children, with in-laws married in from outside.
 * Used by bench.html for performance receipts and by scale tests.
 */
function syntheticTree(FT, N, seed = 1) {
  let s = seed;
  const rnd = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x6D2B79F5 | 0) >>> 0) / 4294967296;
  const MON = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const t = FT.emptyTree("Synthetic " + N);
  const st = FT.createStore(t, null);
  let gen = [];
  for (let i = 0; i < 8; i++) gen.push(st.addPerson({ firstName: "F" + i, lastName: "Root" + (i >> 1), sex: i % 2 ? "F" : "M", birth: { date: FT.util.parseDate(String(1800 + i)), place: "X" } }));
  let y = 1800;
  while (t.people.length < N) {
    y += 25; const next = [];
    for (let i = 0; i + 1 < gen.length && t.people.length < N; i += 2) {
      let a = gen[i], b = gen[i + 1];
      if (a.sex === b.sex) b = st.addPerson({ firstName: "In" + t.people.length, lastName: "Out", sex: a.sex === "M" ? "F" : "M", birth: { date: FT.util.parseDate(String(y - 25)), place: "" } });
      st.addMarriage(a.id, b.id, { date: FT.util.parseDate(String(y - 3)) });
      const k = 1 + Math.floor(rnd() * 4);
      for (let j = 0; j < k && t.people.length < N; j++) {
        const m = Math.floor(rnd() * 12) + 1, d = Math.floor(rnd() * 28) + 1;
        next.push(st.addPerson({ firstName: "C" + t.people.length, lastName: a.lastName, sex: rnd() < .5 ? "M" : "F", parentIds: [a.id, b.id],
          birth: { date: FT.util.parseDate(`${d} ${MON[m - 1]} ${y}`), place: "Town" } }));
      }
    }
    for (let i = next.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [next[i], next[j]] = [next[j], next[i]]; }
    gen = next.length > 1 ? next : gen;
  }
  return t;
}

/** Bounding boxes of rendered cards in the current canvas, for overlap checks. */
function cardBoxes(app) {
  return [...app.document.querySelectorAll("#viewRoot .canvas .node")].map(n => ({
    id: n.dataset.id, x: parseFloat(n.style.left), y: parseFloat(n.style.top), w: n.offsetWidth, h: n.offsetHeight }));
}
function overlaps(boxes) {
  const hits = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) hits.push([a.id, b.id]);
  }
  return hits;
}
