# Contributing

Thanks for helping! This project has a few deliberate constraints. They're what let people trust it with their family's history for decades.

## The rules

1. **One file.** The app is `family-tree.html`: all HTML, CSS and JavaScript. Please don't split it, add a build step, or add dependencies (no npm packages, no CDNs, no fonts from the web).
2. **No network, ever.** The Content-Security-Policy blocks it, and features must not need it.
3. **Never lose data.** Anything that reads or writes `tree-data.json` must keep unknown fields, report repairs instead of silently dropping things, and fail loudly (with the reason) instead of pretending to succeed.
4. **Untrusted input.** Tree files and GEDCOMs come from other people. Never put their text into `innerHTML` unescaped; use `U.escapeHtml`, `textContent`, or DOM properties.
5. **Every number needs a reason.** If you add a limit, timeout or size, write down in a comment (or in [docs/DECISIONS.md](docs/DECISIONS.md)) what it protects against and how it was measured.

## Workflow

- Read the relevant `==== SECTION` of `family-tree.html` first; the comments explain why things are the way they are.
- Run the tests before and after your change (see [tests/README.md](tests/README.md)), and add a test at the boundary where your change is visible.
- For performance work, run `tests/bench.html` before and after on the same machine, and include both numbers in the pull request.
- Update `README.md`, `docs/DATA-FORMAT.md` and `CHANGELOG.md` when behaviour or the file format changes.
- Test data must be fictional. Never commit a real family's tree; `.gitignore` excludes `tree-data.json`, `photos/` and `*.ged` for this reason.

## Changing the file format

Bump `SCHEMA_VERSION` only for changes an older version would misread. Keep loading every older version (`normalizeLoaded`), and document the change in `docs/DATA-FORMAT.md` and `CHANGELOG.md`.
