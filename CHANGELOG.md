# Changelog

All notable changes. The app version is shown in ⚙️ → About and in `FT.version`.

## 1.0.0 — first public release

### Added
- **GEDCOM export** (⚙️ → *Export GEDCOM*): standard GEDCOM 5.5.1 that other genealogy apps can read. It is round-trip tested and keeps birth and married surnames, free-text dates, notes, divorces, unmarried partners and every parent link.
- **Automatic backup:** the first save of each session keeps the previous file as `tree-data.backup.json`. *New tree → Replace* backs up the old tree first.
- **Damaged-file repair:** broken or hand-edited `tree-data.json` files open anyway, and the app lists exactly what it fixed.
- **Undoable GEDCOM import:** importing over a tree is one History step; Ctrl+Z brings the old tree back.
- **Half-siblings** through either parent appear in the Family view, connected to their own parent.
- **GEDCOM encodings:** UTF-16 and legacy Windows-1252 files import with correct letters. Old ANSEL files import with a warning that some accented letters may be wrong.
- **Touch:** two-finger pinch zoom and one-finger pan on phones and tablets. Trackpad zoom is smooth and proportional.
- **Keyboard and screen readers:** cards are focusable (Enter opens), dialogs are announced, trap focus, and close with Esc.
- **Privacy lock:** a Content-Security-Policy blocks all network access.
- Tests (53, in-browser), a benchmark page, a fictional sample GEDCOM, a data-format spec and decision records.

### Fixed
- An edit made while a save was still writing could be marked as saved and lost.
- A failing autosave downloaded `tree-data.json` over and over and claimed the tree was saved. It now keeps your changes, shows a red **Not saved** chip with the reason, and retries.
- Autosave could trigger the browser's permission prompt at random moments.
- The **Save** button saved silently (no "Saved" confirmation).
- Cards could overlap in larger trees (parents drifted onto neighbouring cards; people married twice could be drawn twice).
- Opening a tree centred on the first person in the file instead of on "me".
- Photo caption edits were never saved.
- Pressing **Esc** in a dialog opened from another dialog closed both.
- Undo (Ctrl+Z) could change the tree underneath an open dialog.
- The pedigree ＋/– buttons could be swallowed by canvas panning.
- Deleting the person marked "me" left a dangling reference.
- A person's name, id or photo in a shared tree file could inject HTML.
- Photo file names with unusual characters could fail to save.
- Birthdays with only a month were listed as falling on the 1st.
- Dates like "3 JUN" (no year) lost their day and month.

### Performance
- Store lookups are indexed. At 5,000 people: List view ~24× faster (≈1.6 s → 70 ms), Data check ~9× faster, Timeline ~3× faster. See `docs/DECISIONS.md` (D2).
- Undo history no longer copies embedded photos into every step.
- Searching in the List view waits for a pause in typing before re-filtering.
