/* Minimal in-browser test harness — no dependencies, no build step.
   Each suite runs against a freshly loaded copy of ../family-tree.html inside
   an iframe, so tests exercise the real app exactly as a user's browser does.
   Must be served over http (see tests/README.md): file:// iframes are
   cross-origin in Chrome and their window can't be scripted. */
"use strict";

const suites = [];
function suite(name, fn) { suites.push({ name, fn }); }

class AssertionError extends Error {}
const assert = {
  ok(v, msg) { if (!v) throw new AssertionError(msg || `expected truthy, got ${fmt(v)}`); },
  equal(a, b, msg) { if (a !== b) throw new AssertionError(`${msg ? msg + ": " : ""}expected ${fmt(b)}, got ${fmt(a)}`); },
  deepEqual(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new AssertionError(`${msg ? msg + ": " : ""}expected ${y}, got ${x}`); },
  includes(hay, needle, msg) { if (!String(hay).includes(needle)) throw new AssertionError(`${msg ? msg + ": " : ""}expected ${fmt(hay)} to include ${fmt(needle)}`); },
  async throws(fn, re, msg) {
    try { await fn(); } catch (e) { if (re && !re.test(e.message)) throw new AssertionError(`${msg || "throws"}: message ${fmt(e.message)} !~ ${re}`); return e; }
    throw new AssertionError(msg || "expected function to throw");
  }
};
function fmt(v) { try { return typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v) ?? String(v); } catch (e) { return String(v); } }

/* ?app=../some-other-build.html runs the tests/bench against another copy of
   the app — e.g. the previous release, for an A/B performance comparison. */
const APP_URL = new URLSearchParams(location.search).get("app") || "../family-tree.html";
/** Load a fresh app instance; resolves to its window once FT is ready. */
function freshApp() {
  return new Promise((resolve, reject) => {
    const old = document.getElementById("app-frame"); if (old) old.remove();
    const f = document.createElement("iframe");
    f.id = "app-frame"; f.src = APP_URL + "?test=" + Date.now();
    f.style.cssText = "width:1100px;height:720px;border:1px solid #ccc";
    const t = setTimeout(() => reject(new Error("app did not load within 10000 ms (is the page served over http?)")), 10000);
    f.onload = () => {
      clearTimeout(t);
      const w = f.contentWindow;
      if (!w || !w.FT) return reject(new Error("app loaded but window.FT is missing — script error in family-tree.html?"));
      resolve(w);
    };
    document.getElementById("frames").appendChild(f);
  });
}
/** Wait for pending microtasks/timers inside the app (history coalescing, async renders). */
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

async function runAll() {
  const out = document.getElementById("out");
  const only = new URLSearchParams(location.search).get("suite");
  let pass = 0, fail = 0; const failures = [];
  for (const s of suites) {
    if (only && s.name !== only) continue;
    const tests = [];
    const t = (name, fn) => tests.push({ name, fn });
    s.fn(t);
    const h = document.createElement("h2"); h.textContent = s.name; out.appendChild(h);
    for (const tc of tests) {
      const li = document.createElement("div"); li.className = "tc";
      let app;
      try {
        app = await freshApp();
        await tc.fn(app);
        pass++; li.classList.add("pass"); li.textContent = "✓ " + tc.name;
      } catch (e) {
        fail++; li.classList.add("fail");
        li.textContent = "✗ " + tc.name + " — " + (e && e.message || e);
        failures.push({ suite: s.name, test: tc.name, error: String(e && e.stack || e) });
        console.error(s.name, tc.name, e);
      }
      out.appendChild(li);
    }
  }
  const sum = document.getElementById("summary");
  sum.textContent = `${pass} passed, ${fail} failed`;
  sum.className = fail ? "fail" : "pass";
  document.title = (fail ? "FAIL " : "PASS ") + `${pass}/${pass + fail}`;
  window.__results = { pass, fail, failures, done: true };
}
