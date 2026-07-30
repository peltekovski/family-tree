# Family Tree

A private, offline family tree app in **one HTML file**. No install, no accounts, no internet, no build step. Your data lives in plain files you own.

## Using it

1. Double-click **`family-tree.html`** (use **Chrome** or **Edge** for the full experience).
2. Choose **Create a New Tree** and pick an empty folder — the app creates `tree-data.json` and a `photos/` folder there. Or **Load an Existing Tree** and point it at a folder that already has a `tree-data.json`.
3. Add people, or **Import GEDCOM** to bring in a `.ged` export from MyHeritage.
4. Click **Save** (or press **Ctrl/⌘-S**) to write changes straight back to your folder.

Everything for one tree is the folder: `tree-data.json` + `photos/`. **Copy that folder anywhere** to move or back up your whole tree. To keep several trees, give each its own folder and use *New tree* / *Open another tree*.

### Deploying (dev → live)
This project folder is where the app is developed. For real-world use, copy the app file next to your data:

```
cp family-tree.html "$HOME/Desktop/Family Tree/family-tree.html"
```

(Adjust the path to wherever your live `Family Tree` folder is.) The app hardcodes no paths — it works from wherever the folder currently is.

## Features
- **Views:** Family (ancestors, descendants, spouses, siblings **and** aunts/uncles + cousins), Pedigree (direct ancestors, collapsible), List (sortable, searchable), Timeline (life events by decade).
- **Select vs focus:** clicking a card opens that person's details without moving the tree. The tree is only rebuilt around someone when you press **🎯 Focus** in their panel (or 🏠 Me). Couples always keep the same order, so nothing jumps around as you browse.
- **Canvas:** pan and zoom (drag anywhere — including over a card — to move around; cards stay put), adjustable generation depth. Zoom stays within sensible limits and keeps the person in focus centred.
- **Cards:** each card has a **＋** at the bottom to add a relative (father, mother, brother, sister, partner, son, daughter — new or existing) and a **👪** at the top for that person's immediate family. Clicking the card itself opens their details.
- **"Me":** mark one person as you (**🏠** button, or *This is me* in their panel). The tree centres on you, you get a ★ badge, and adding people never steals your focus. The person the tree is built around is ringed and labelled **IN FOCUS**.
- **Upcoming birthdays** appear right on the tree (bottom-left), not buried in a menu. Closing the panel leaves a small 🎂 button in the corner — click it to bring the list back.
- **Autosave & history:** changes autosave to your folder (toggle in the ⚙️ menu); a Photoshop-style **History** panel (🕘) lets you step back and forward through changes (undo/redo, or click any step), with a configurable number of steps (default 50).
- **Card display (🎴 Cards / menu → Card display):** choose card size, colour by sex (side bar, whole card, or none), what the two lines under each name show (years, full dates, occupation, birthplace…), and toggle the photo and maiden name.
- **Click-to-edit** side panel: names, dates/places, education, occupation, notes, marriages (with divorce), parents/children/spouses.
- **Search** across the whole tree.
- **Relationship finder:** pick two people, see the kinship term and the connecting path.
- **Photos:** add one via a person's panel — click their avatar, the **Add photo** button, the **＋** box, or just **drag an image onto the panel**. **Tag** several people in one photo and it shows on each of their profiles; star one to make it that person's profile picture.
- **Reminders:** upcoming birthdays & anniversaries. **Data check:** flags impossible dates and broken links. **Print / PDF** a person's family sheet.

## GEDCOM & photos
GEDCOM files contain **links** to MyHeritage's photos, not the images themselves, so photos usually can't be pulled in automatically. After import the app tells you how many photo references it found; keep the tree and attach the real images later via each person's **Add photo** (e.g. from a MyHeritage album zip you downloaded), or **Replace file** on a pending photo.

## Browser support
- **Chrome / Edge (desktop):** full support — Save writes directly to your folder.
- **Other browsers (Firefox/Safari):** the app still works, but Load/Save fall back to file **download/upload** of `tree-data.json`, and added photos are embedded in that file instead of the `photos/` folder.

## Data format
`tree-data.json` is human-readable JSON: `people`, `marriages`, `photos`, `layout`, and `settings`. Dates keep both what you typed and a parsed form, so nothing is lost.
