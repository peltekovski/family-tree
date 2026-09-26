/* An in-memory stand-in for the File System Access API. `gate` lets a test hold
   a write open (to simulate a slow disk) and `failWrites` makes writes throw. */
function mockDir(app, files = {}) {
  const store = new Map(Object.entries(files));
  const ctl = { writes: [], gate: null, failWrites: false, permission: "granted", requested: 0 };
  const fileHandle = (name) => ({
    kind: "file", name,
    async getFile() { if (!store.has(name)) throw new DOMException("missing", "NotFoundError"); return new app.File([store.get(name)], name); },
    async createWritable() {
      if (ctl.failWrites) throw new DOMException("disk full", "QuotaExceededError");
      let buf = "";
      return {
        async write(c) { buf += typeof c === "string" ? c : await new Response(c).text(); },
        async close() { if (ctl.gate) await ctl.gate; store.set(name, buf); ctl.writes.push({ name, len: buf.length }); }
      };
    },
    async queryPermission() { return ctl.permission; },
    async requestPermission() { ctl.requested++; return ctl.permission; }
  });
  const dir = {
    kind: "directory", name: "Mock",
    async getFileHandle(name, opts = {}) {
      if (!store.has(name)) { if (!opts.create) throw new DOMException("missing", "NotFoundError"); store.set(name, ""); }
      return fileHandle(name);
    },
    async getDirectoryHandle() { return dir; },
    async queryPermission() { return ctl.permission; }, async requestPermission() { return ctl.permission; },
    async isSameEntry(o) { return o === dir; }
  };
  return { dir, store, ctl, fileHandle };
}
/** Count file downloads the app triggers (anchor clicks with a download attribute). */
function spyDownloads(app) {
  const spy = { count: 0 };
  const orig = app.HTMLAnchorElement.prototype.click;
  app.HTMLAnchorElement.prototype.click = function () { if (this.download) { spy.count++; return; } return orig.call(this); };
  return spy;
}
async function openWithMock(app, files) {
  const FT = app.FT;
  const m = mockDir(app, files || { "tree-data.json": FT.serializeTree(familyFixture(FT).data) });
  const fh = await m.dir.getFileHandle("tree-data.json");
  const data = FT.normalizeLoaded(JSON.parse(m.store.get("tree-data.json")));
  FT.openTree(data, { dirHandle: m.dir, fileHandle: fh });
  return m;
}
const waitFor = async (cond, ms = 3000, what = "condition") => {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) throw new Error(`timed out after ${ms} ms waiting for ${what}`); await tick(20); }
};

suite("Persistence", (t) => {
  t("an edit made while a save is in flight is not marked saved", async (app) => {
    const FT = app.FT;
    app.FT.prefs.autosave = false;
    const m = await openWithMock(app);
    FT.state.store.addPerson({ firstName: "First" });
    let release; m.ctl.gate = new Promise(r => release = r);
    const p1 = FT.saveFlow(true);
    await tick(10);
    FT.state.store.addPerson({ firstName: "DuringSave" });   // lands while the write is blocked
    release(); m.ctl.gate = null;
    await p1; await tick(30);
    assert.equal(FT.state.dirty, true, "the in-flight save must not clear the newer change");
    await FT.saveFlow(true);
    assert.includes(m.store.get("tree-data.json"), "DuringSave");
    assert.equal(FT.state.dirty, false);
  });

  t("a save requested during another save runs afterwards", async (app) => {
    const FT = app.FT; FT.prefs.autosave = false;
    const m = await openWithMock(app);
    FT.state.store.addPerson({ firstName: "A1" });
    let release; m.ctl.gate = new Promise(r => release = r);
    const p1 = FT.saveFlow(true);
    await tick(10);
    FT.state.store.addPerson({ firstName: "A2" });
    const p2 = FT.saveFlow(true);                         // must not be silently dropped
    release(); m.ctl.gate = null;
    await p1; await p2;
    await waitFor(() => !FT.state.dirty, 2000, "second save");
    assert.includes(m.store.get("tree-data.json"), "A2");
  });

  t("failed autosave keeps changes, shows an error, and never spams downloads", async (app) => {
    const FT = app.FT; FT.prefs.autosave = true;
    const m = await openWithMock(app);
    const dl = spyDownloads(app);
    m.ctl.failWrites = true;
    FT.state.store.addPerson({ firstName: "X" });
    await FT.saveFlow(true); await FT.saveFlow(true); await FT.saveFlow(true);
    assert.equal(dl.count, 0, "silent saves must not download files");
    assert.equal(FT.state.dirty, true);
    const chip = app.document.getElementById("saveState");
    assert.equal(chip.dataset.status, "error");
    assert.includes(chip.title, "disk full", "the chip explains the failure");
  });

  t("autosave never prompts for permission (no user gesture)", async (app) => {
    const FT = app.FT; FT.prefs.autosave = true;
    const m = await openWithMock(app);
    m.ctl.permission = "prompt";
    FT.state.store.addPerson({ firstName: "Y" });
    await FT.saveFlow(true);
    assert.equal(m.ctl.requested, 0, "requestPermission needs a click; autosave must not call it");
    assert.equal(FT.state.dirty, true);
    assert.equal(app.document.getElementById("saveState").dataset.status, "error");
  });

  t("the first save of a session keeps a backup of the previous file", async (app) => {
    const FT = app.FT; FT.prefs.autosave = false;
    const m = await openWithMock(app);
    const before = m.store.get("tree-data.json");
    FT.state.store.addPerson({ firstName: "B1" });
    await FT.saveFlow(true);
    assert.equal(m.store.get("tree-data.backup.json"), before, "backup holds the file as it was when opened");
    FT.state.store.addPerson({ firstName: "B2" });
    await FT.saveFlow(true);
    assert.equal(m.store.get("tree-data.backup.json"), before, "later saves in the same session don't overwrite the backup");
  });

  t("the Save button saves loudly (not silently)", async (app) => {
    const FT = app.FT; FT.prefs.autosave = false;
    await openWithMock(app);
    FT.state.store.addPerson({ firstName: "Z" });
    app.document.getElementById("btnSave").click();
    await waitFor(() => !FT.state.dirty, 2000, "save");
    const toasts = [...app.document.querySelectorAll("#toast .toast")].map(e => e.textContent);
    assert.ok(toasts.some(s => /saved/i.test(s)), "expected a 'Saved' toast, got " + JSON.stringify(toasts));
  });

  t("loading repairs broken files instead of crashing", (app) => {
    const FT = app.FT;
    const raw = {
      treeName: "Broken",
      people: [
        { id: "p1", firstName: "Ok", parentIds: ["p2", "ghost", "p1"] },
        { id: "p2", firstName: "Dup" }, { id: "p2", firstName: "Dup again" },
        { firstName: "No id" }, null, "junk",
        { id: "p3", firstName: 42, sex: "X", birth: "1990", parentIds: "p1" }
      ],
      marriages: [{ id: "m1", spouseIds: ["p1", "p2"] }, { id: "m2", spouseIds: ["p1"] }, { spouseIds: ["p1", "nobody"] }, 7],
      photos: [{ id: "ph1", filename: "a.jpg", tags: [{ personId: "ghost" }, { personId: "p1" }], dataUrl: "javascript:alert(1)" }],
      settings: { homePersonId: "ghost" }
    };
    const { data, repairs } = FT.parseTreeFile(JSON.stringify(raw));
    assert.deepEqual(data.people.map(p => p.firstName), ["Ok", "Dup", "Dup again", "No id", "42"], "every real person kept, in order");
    assert.ok(new Set(data.people.map(p => p.id)).size === data.people.length, "ids unique");
    assert.equal(data.people[1].id, "p2", "the first holder of a duplicated id keeps it");
    const p1 = data.people.find(p => p.id === "p1");
    assert.deepEqual(p1.parentIds, ["p2"], "dangling, self and duplicate-target links dropped");
    const p3 = data.people.find(p => p.id === "p3");
    assert.equal(p3.firstName, "42"); assert.equal(p3.sex, "U"); assert.deepEqual(p3.parentIds, []);
    assert.equal(p3.birth.date.year, 1990, "string dates are parsed, not discarded");
    assert.equal(data.marriages.length, 1, "only the valid marriage survives");
    assert.deepEqual(data.photos[0].tags.map(t => t.personId), ["p1"]);
    assert.equal(data.photos[0].dataUrl, undefined, "non-image data URLs are dropped");
    assert.equal(data.settings.homePersonId, null);
    assert.ok(repairs.length >= 6, "each repair is reported: " + repairs.join(" | "));
    FT.openTree(data, {});   // must render without throwing
  });

  t("refuses things that are not a tree, with a clear message", async (app) => {
    await assert.throws(() => app.FT.parseTreeFile("not json"), /not valid JSON/i);
    await assert.throws(() => app.FT.parseTreeFile("[1,2]"), /doesn't look like a family tree/i);
    await assert.throws(() => app.FT.parseTreeFile('{"hello":1}'), /doesn't look like a family tree/i);
  });

  t("files from a newer app version are flagged", (app) => {
    const { repairs } = app.FT.parseTreeFile(JSON.stringify({ schemaVersion: 99, people: [] }));
    assert.ok(repairs.some(r => /newer version/i.test(r)), repairs.join(" | "));
  });
});
