# `tree-data.json` format (schema version 1)

This is the complete description of the file the app saves. It's plain JSON (UTF-8, 2-space indented), so any language or tool can read it. It stays readable even if this app disappears.

A tree folder contains:

```
My Family Tree/
├── tree-data.json          ← everything below
├── tree-data.backup.json   ← the file as it was when you last opened it (written on the first save of each session)
└── photos/                 ← image files, referenced by name from tree-data.json
```

## Top level

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | number | `1`. A newer app may write a higher number; this app warns when it opens such a file, keeps fields it doesn't know, and never lowers the number. |
| `treeName` | string | Shown in the top bar. |
| `createdAt`, `updatedAt` | ISO 8601 string | |
| `settings` | object | See [Settings](#settings). |
| `people` | array of [Person](#person) | |
| `marriages` | array of [Marriage](#marriage) | Also used for divorced couples. Unmarried co-parents have **no** marriage; they're linked through a shared child. |
| `photos` | array of [Photo](#photo) | |
| `layout` | object | Reserved for manual card positions; currently unused. |

Unknown top-level fields are preserved when the app loads and saves a file.

## Person

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique within the file (the app uses `p_` + random). Never shown to users. |
| `firstName` | string | Given name(s). |
| `lastName` | string | Current surname (e.g. married name). |
| `maidenName` | string | Birth surname, if different. Only shown in the edit form. |
| `alternateNames` | string[] | Nicknames, other spellings. |
| `sex` | `"M"` \| `"F"` \| `"U"` | `U` = unknown. |
| `birth` | [Event](#event) | Always present; fields may be empty. |
| `death` | [Event](#event) \| `null` | `null` = living (or not known to have died). An Event with a null date = deceased, date unknown. |
| `occupation`, `education`, `notes` | string | `notes` may contain newlines. |
| `parentIds` | string[] | Ids of this person's parents (usually 0–2). **Children, siblings and co-parents are derived from these**; they're never stored twice. |
| `primaryPhotoId` | string \| `null` | The profile photo (a Photo id). |
| `gedcomId` | string \| `null` | The `@I…@` id the person had in an imported GEDCOM, for reference. |
| `createdAt`, `updatedAt` | ISO 8601 string | |

## Marriage

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `spouseIds` | [string, string] | Exactly two different people. |
| `date`, `divorceDate` | [Date](#date) \| `null` | |
| `place`, `notes` | string | |
| `divorced` | boolean | |

## Photo

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `filename` | string | A file name inside `photos/`. |
| `caption` | string | |
| `date` | [Date](#date) \| `null` | |
| `tags` | `{ personId, x?, y?, w?, h? }[]` | Who is in the photo. `x/y/w/h` (optional) is a box as fractions (0–1) of the image size. |
| `dataUrl` | string (optional) | Only in browsers that can't write to a folder: the image itself as a `data:image/…;base64,…` URL. |
| `pending` | boolean (optional) | `true` when the file hasn't been found (e.g. a photo reference imported from GEDCOM). |
| `sourceRef` | string (optional) | The original GEDCOM `FILE` value (often a URL) for pending photos. |

## Event

```json
{ "date": Date | null, "place": "Skopje" }
```

## Date

Dates keep **exactly what was typed** (`original`) alongside a parsed form. When a date can't be parsed, only `original` is kept and nothing is lost.

| Field | Type | Notes |
|---|---|---|
| `original` | string | As typed or imported, e.g. `"ABT 12 JAN 1980"`, `"the winter of the big snow"`. |
| `year`, `month`, `day` | number \| `null` | `month` 1–12. Any part may be missing (e.g. a birthday without a year). |
| `qualifier` | string \| `null` | GEDCOM-style: `ABT`, `EST`, `CAL`, `BEF`, `AFT`, `BET`, `FROM`, `TO`, `INT`. |
| `iso` | string \| `null` | `YYYY`, `YYYY-MM` or `YYYY-MM-DD` when the year is known. |
| `approx` | boolean | `true` for any qualified/ranged date. |

## Settings

| Field | Type | Notes |
|---|---|---|
| `defaultView` | `"family"` \| `"pedigree"` \| `"list"` \| `"timeline"` | |
| `generationDepth` | 2–6 | How many generations the Family view shows. |
| `homePersonId` | string \| `null` | Who "me" is. |
| `cardDisplay` | object | `{ size, sexColor, line1, line2, showPhoto }`: how cards look. |

## Integrity rules

The app repairs files that break these on load, and tells you what it changed:

- Every `id` is unique across people, marriages and photos.
- `parentIds`, `spouseIds`, `tags[].personId`, `primaryPhotoId` and `homePersonId` point at records that exist.
- A person is never their own parent, and a marriage has two different spouses.
- `dataUrl`, if present, is a real `data:image/…;base64,…` URL.

Loops in ancestry (someone being their own ancestor) are reported by **Data check**, not auto-repaired, because only a person can tell which link is wrong.
