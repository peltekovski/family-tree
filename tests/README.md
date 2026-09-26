# Tests

The tests run **in a real browser, against the real app**. There's no Node, no test framework and nothing to install. Each test loads a fresh copy of `../family-tree.html` in an iframe and drives it through `window.FT`, the same objects the UI uses.

## Run them

From the repository root, start any static web server. Python's built-in one works:

```bash
python -m http.server 8765
```

Then open:

| Page | What it does |
|---|---|
| <http://localhost:8765/tests/index.html> | All tests. The page title becomes `PASS n/n` or `FAIL …`. |
| `…/tests/index.html?suite=GEDCOM` | One suite (`Dates`, `Store`, `Kinship`, `GEDCOM`, `Persistence`, `History`, `Security`, `UI`). |
| <http://localhost:8765/tests/bench.html> | Performance timings on generated trees of 500 / 2,000 / 5,000 people. |
| `…/bench.html?app=../old-copy.html` | Benchmark another build of the app, for A/B comparisons (also works for `index.html`). |

> **Why a server?** Browsers treat every `file://` page as its own origin, so the test page isn't allowed to script the app inside its iframe. Over `http://localhost` they share an origin.

For automation, `window.__results` holds `{ pass, fail, failures[], done }` once the run finishes.

## What's covered

| Suite | Covers |
|---|---|
| **Dates** | Parsing GEDCOM and typed dates; free text is never lost; display. |
| **Store** | The data model and its lookup index across every kind of edit; loop prevention; cleanup on delete. |
| **Kinship** | Relationship terms from 30+ people in a fixture family (cousins "removed", half-siblings, step-relations, in-laws, "by marriage"). |
| **GEDCOM** | Import quirks (MyHeritage), export → import round-trip, character encodings, the bundled sample. |
| **Persistence** | Saves racing edits, failed/unauthorised autosave, backups, repairing damaged files. A mock of the File System Access API stands in for the disk. |
| **History** | Undo/redo, one step per action, undoable imports, photos not duplicated per step. |
| **Security** | Hostile names, ids and photo data never execute; the CSP blocks network access. |
| **UI** | Focus on "me", layout (no overlapping cards on large generated trees with cousin marriages, at every depth), clicks vs. pans vs. pinch, dialogs, keyboard access, phone width. |

## Writing a test

```js
suite("Store", (t) => {
  t("describes the behaviour, not the implementation", (app) => {
    const { data, ids } = familyFixture(app.FT);    // fictional four-generation family
    app.FT.openTree(data, {});
    assert.equal(app.FT.describeRelationship(ids.me, ids.uncle).summary, "uncle");
  });
});
```

Add the file to the `FILES` list in `index.html`. Fixtures (`familyFixture`, `syntheticTree`) are in `fixtures.js`. Use only fictional people.
