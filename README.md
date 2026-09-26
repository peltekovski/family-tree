# 🌳 Family Tree

A private, offline family tree app in **one HTML file**. No install, no account, no internet, no build step. Your family's data lives in plain files on your own computer.

- **Private by design:** the page is locked down by a Content-Security-Policy, so it *cannot* send anything over the network, even if it wanted to.
- **Yours, in open formats:** a readable `tree-data.json` plus a `photos/` folder. Import from and export to **GEDCOM**, so you're never locked in.
- **Built to last:** one self-contained file with zero dependencies. Double-click it today, or in twenty years.

---

## Quick start

1. Download **[`family-tree.html`](family-tree.html)** and put it anywhere you like (e.g. a `Family Tree` folder).
2. Open it in **Chrome** or **Edge** (desktop) for the full experience. Other browsers work too; see [Browser support](#browser-support).
3. Choose **Create a New Tree** and pick an empty folder. The app creates `tree-data.json` and a `photos/` folder there.
   Or **Load an Existing Tree** and pick a folder that already has a `tree-data.json`.
4. Add people, or **Import GEDCOM** to bring in an export from MyHeritage, Ancestry, FamilySearch, Gramps, etc.
   Want to look around first? Import [`examples/sample-family.ged`](examples/sample-family.ged), a small fictional family.

Changes **autosave** to your folder a second after you make them (you can turn this off in ⚙️). **Ctrl/⌘+S** saves immediately.

> **Your whole tree is the folder.** Copy the folder (`tree-data.json` + `photos/`) to back it up or move it to another computer. To keep several trees, give each its own folder.

## Features

**Views**
- **Family**: an hourglass around one person, with ancestors above; spouses, siblings and half-siblings beside; descendants below; and aunts, uncles and cousins in their own branches.
- **Pedigree**: direct ancestors only, with collapsible branches.
- **List**: sortable and searchable.
- **Timeline**: births, marriages and deaths by decade.

**Working with people**
- Click a card to open its details panel; this never rearranges the tree. Use **🎯 Focus** in the panel to rebuild the tree around someone else.
- Each card has a **＋** (add father, mother, brother, sister, partner, son or daughter, new or existing) and a **👪** (immediate family).
- Mark yourself with **"This is me"**. The tree centres on you (**🏠 Me**), you get a ★ badge, and adding people never steals the focus.
- Relationships: add, edit or remove parents, partners (married, divorced or unmarried), siblings and children. The app asks before assuming things, such as whether a new partner is also the parent of existing children.

**Understanding the tree**
- **Relationship finder**: the correct kinship term ("1st cousin once removed", "great-aunt by marriage", "half-brother", "stepson", "sister-in-law", …) plus the path that connects two people.
- **Upcoming birthdays and anniversaries** on the tree itself (bottom-left). Closing the list leaves a 🎂 button to bring it back.
- **Data check**: flags impossible dates (born after a child, died before being born, …) and broken links.
- **Print / PDF** a person's family sheet.

**Photos**
- Add photos from a person's panel (click the avatar, use the button, or drag an image onto the panel). Tag several people in one photo by drawing boxes, and choose a profile picture.
- Photos are saved as ordinary image files in `photos/`.

**Safety nets**
- **Undo/redo** with a visual **History** panel (🕘). Jump back to any step, including an entire GEDCOM import.
- The first save of every session copies your previous file to **`tree-data.backup.json`**, so one bad edit or import can never overwrite your only copy.
- If a save fails (disk full, permission revoked, …), the status chip turns red, explains why, and keeps your changes; nothing is silently lost.
- Damaged or hand-edited `tree-data.json` files are repaired on load, and the app tells you exactly what it fixed.

**Everywhere**
- Works on phones and tablets: the toolbar wraps, and you can pinch to zoom and drag to pan.
- Keyboard accessible: cards are focusable (Enter opens them), and dialogs trap focus and close with Esc.

## GEDCOM

- **Import** handles real-world exports: UTF-8 and UTF-16, legacy ANSI files, MyHeritage's married names (`_MARNM`), notes, single-parent families, divorces, and photo references.
- **Export** (⚙️ → *Export GEDCOM*) writes standard GEDCOM 5.5.1 that other genealogy apps can read. It is round-trip tested: names (birth and married surnames), dates, including free-text ones like "the winter of the big snow", places, notes, marriages, divorces, unmarried partners and all parent links survive an export → import cycle.
- GEDCOM can only *reference* photos, not contain them. After importing from MyHeritage, the app tells you how many photo references it found. Attach the real image files later via each person's **Add photo** (or **Replace file** on a pending photo).

## Browser support

| Browser | Status |
|---|---|
| **Chrome / Edge** (desktop) | Full support. Saves go straight to your folder, with autosave and backups. |
| **Firefox / Safari / mobile browsers** | Everything works, but these browsers can't write to a folder. **Save** downloads `tree-data.json` instead, **Load** asks you to pick that file, and photos are embedded in the JSON. |

## Your data

Everything is in `tree-data.json`: human-readable JSON with `people`, `marriages`, `photos` and `settings`. Dates keep exactly what you typed alongside a parsed form, so nothing is ever lost to a date format. The full format is documented in **[docs/DATA-FORMAT.md](docs/DATA-FORMAT.md)** so your data stays usable with or without this app.

## Privacy & security

- No network access: a `Content-Security-Policy` forbids all connections, remote images, fonts and frames. The app can only show images from your own files.
- Nothing you import can run code: names, places, notes and ids are always escaped, and shared tree files and GEDCOMs are treated as untrusted input (tested in `tests/security.test.js`).
- See [SECURITY.md](SECURITY.md) to report a problem.

## Development

It's one file on purpose: **no build step, no dependencies, no frameworks.** Open `family-tree.html` and read it. It's organised into sections; search for `==== SECTION`.

**Tests** run in the browser against the real app:

```bash
python -m http.server 8765
```

Then open <http://localhost:8765/tests/index.html>. There are 50+ tests covering dates, the data store, kinship terms, GEDCOM import/export, saving and recovery, undo, security and the UI (including layout checks on large generated trees). See [tests/README.md](tests/README.md). Performance numbers come from [`tests/bench.html`](tests/bench.html).

Design decisions, with the measurements behind them, are recorded in [docs/DECISIONS.md](docs/DECISIONS.md). Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
