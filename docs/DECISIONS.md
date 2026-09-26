# Decision records

Short notes on choices that aren't obvious from the code, with the evidence behind them. Newest last. Measurements: Chrome on a Windows 11 laptop, generated trees from `tests/fixtures.js` (`syntheticTree`), via `tests/bench.html` or an interleaved A/B of two builds.

---

## D1. One HTML file, no build, no dependencies

**Context.** A family tree outlives frameworks and package registries. The app must still open in 20 years.
**Options.** (a) Modern build pipeline with modules and npm packages. (b) One self-contained file.
**Chosen.** (b). Everything is inlined; code is organised in `==== SECTION` blocks inside the file.
**Cost / landmines.** One ~200 KB file needs discipline to navigate. Section banners, and tests that drive the public `window.FT` surface, keep it manageable.
**Revisit if.** The file becomes unreadable despite sections. Even then, the *delivered* artifact should stay a single file.

## D2. Indexed store lookups

**Context.** `children()`, `partners()`, `person()` and friends scanned the whole `people` array on every call. The List view calls them per row, so rendering was O(n²).
**Receipt (before).** 5,000 people: List render 1,223 ms; `children()` for everyone 651 ms, `partners()` 866 ms.
**Chosen.** A lazily built index (id → person, id → children, id → marriages, id → photos), rebuilt in one O(n) pass after any mutation. Every mutating store method ends in `touch()`, which drops the index.
**Receipt (after, interleaved A/B, 5,000 people).** List 1,583–1,842 ms → 67–71 ms; Data check 1,147–1,235 ms → 126–134 ms; Timeline 141 → 43 ms; Family 19–25 → 8 ms.
**Landmine.** Code outside the store that edits `parentIds`/`spouseIds`/`tags` directly must call `store.invalidate()`, or queries go stale. The single place that does this (the GEDCOM parser) does so; this rule is written at the top of the store.

## D3. Saving: revisions, one writer, no silent fallbacks

**Context.** (1) A save that finished after a newer edit marked that edit as saved, so it could be lost on close. (2) A failed autosave fell back to *downloading a file*, once a second, and marked the tree saved. (3) Autosave called `requestPermission`, which throws without a user gesture, and that also fell back to downloading.
**Chosen.**
- Every change bumps `state.rev`. A save records the revision it serialised, and clears "unsaved" only if nothing changed while writing.
- Saves never overlap. A save requested mid-write sets a flag, and the running save loops once more if the tree changed. All callers await the same promise.
- Autosave never prompts and never downloads. On failure the chip turns red with the reason, and the next edit or a click retries. A manual Save that fails offers *Try again* / *Download a copy*. A downloaded copy doesn't count as saved when a folder is in use.
- Autosave delay: 1 s (a UX choice, not a budget). `beforeunload` always prompts while unsaved, because a write can't be awaited there.
**Evidence.** `tests/persistence.test.js`, using a mock File System Access API with a gate that holds a write open.

## D4. `tree-data.backup.json`, once per session

**Context.** With autosave, one bad import or mass edit would overwrite the only copy within a second.
**Chosen.** Before the first write of a session, copy the file as it is on disk to `tree-data.backup.json`. "Replace with new tree" backs up first and aborts if it can't. Only one backup is kept: it doubles disk use at most, and it holds "how the tree was when I opened it", which is what people reach for.
**Revisit if.** Users need older generations; rotate `backup-1..N` then.

## D5. Load = repair + report, never crash

**Context.** A hand-edited or partly written file crashed rendering later, far from the cause.
**Chosen.** `normalizeLoaded` coerces every record (ids unique, links pointing at real people, dates in shape, images really images), keeps unknown fields for forward compatibility, and lists each repair. The UI shows the list. Only input that isn't a tree at all is rejected, with a message pointing at the backup.

## D6. History stores embedded photos once

**Context.** Undo keeps up to *N* full snapshots (default 50). In browsers without folder access, photos are embedded as `data:` URLs, so each snapshot copied every photo.
**Receipt.** One 200 KB image across 11 steps: 2.2 MB of duplicate strings. A real 3 MB photo across 50 steps is about 200 MB.
**Chosen.** Snapshots replace `dataUrl` strings of 256 chars or more with a token; the string is kept once in `History.blobs` and put back on restore. 256 is just "bigger than a token"; smaller values aren't worth it.

## D7. Content-Security-Policy

**Chosen.** `default-src 'none'`, inline script/style allowed (the app *is* inline), `img-src data: blob:`, `connect-src 'none'`. The privacy promise ("your data never leaves your computer") is enforced by the browser rather than by convention. It also means that even an escaping bug couldn't leak data.
**Cost.** `'unsafe-inline'` scripts are required by D1, so the CSP doesn't stop injected inline code from *running*. Escaping (tested) prevents injection; the CSP prevents exfiltration.

## D8. Family layout: bands, not centring by subtree width

**Context.** Cards overlapped in larger trees. The parent was centred at `child.x + child.sub/2`, which adds a subtree width to a card position, so whenever a child's descendants were wider than the child, the parent drifted onto its neighbour. Separately, a person married twice could be claimed as a partner by one node and placed again with their other spouse.
**Chosen.** Each subtree owns the band `[left, left + width)`. A parent is centred over its first and last child *cards* and clamped inside its band. Each person is claimed once (as a node or as a partner). A tripwire logs `[layout] … overlapping` if two cards in a row ever overlap.
**Evidence.** `tests/ui.test.js` renders 60 layouts: three seeds × depths 2–6 × four focus people, on 1,500-person trees with random cousin marriages. There are zero overlaps and the tripwire stays silent.
**Also.** Half-siblings through either parent are shown, hanging from their own parent's card. Collateral lines (aunts, uncles, cousins) stop one generation below the focus person, to keep the canvas from growing with distant cousins.

## D9. GEDCOM export mapping

**Chosen.** GEDCOM 5.5.1, UTF-8, CRLF. Birth surname goes in `SURN`, current surname in `_MARNM` (MyHeritage's convention, which our importer already reads). Unmarried co-parents get `_UNMARRIED Y`; the importer also understands `_STAT NOT MARRIED` and GEDCOM 7 `NO MARR`. Dates the app couldn't structure become date phrases `(…)`, and exact dates whose typed text says more become `INT <date> (<text>)`, so the typed text survives a round trip. Values are split at 200 chars with `CONC` (GEDCOM's limit is 255 per line), never next to a space.
**Evidence.** Round-trip test in `tests/gedcom.test.js`.
**Not included.** Image bytes (GEDCOM can't hold them) and app-only settings.

## D10. Tests in the browser, against the real app

**Context.** No Node on the development machine, and the product *is* a browser page.
**Chosen.** A roughly 80-line harness loads a fresh app per test in an iframe (served over http, since `file://` iframes can't be scripted) and asserts through `window.FT`. Test files are cache-busted: a cached stale test once passed silently during development.
**Revisit if.** CI is added. The same pages can be driven by a headless browser that reads `window.__results`.
