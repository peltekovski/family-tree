# Security & privacy

## The model

- The app is a single local HTML file. It has **no server, no account and no network access**. A Content-Security-Policy in the page forbids connections, remote scripts, images, fonts and frames, so it cannot send data anywhere.
- Your data stays in the folder you choose (`tree-data.json`, `photos/`) or, in browsers without folder access, in files you download yourself.
- Tree files and GEDCOM files may come from other people and are treated as untrusted. Their contents are escaped before display, embedded images must be real `data:image/…` URLs, and damaged records are repaired on load.
- The only things kept in the browser itself are preferences (autosave, history, whether the birthday list is closed) and handles to recently opened folders. These stay in that browser's local storage and are never transmitted.

## Reporting a problem

If you find a way for a tree file, GEDCOM or photo to run code, reach the network, or corrupt or lose data, please open a GitHub issue. For something sensitive, use GitHub's **private vulnerability reporting** on this repository instead of a public issue. Include a *fictional* example file that reproduces it.
