suite("History", (t) => {
  t("undo and redo walk through edits", async (app) => {
    const FT = app.FT;
    FT.openTree(familyFixture(FT).data, {});
    const n = FT.state.data.people.length;
    FT.state.pendingLabel = "Add person"; FT.state.store.addPerson({ firstName: "H1" }); await tick();
    FT.state.pendingLabel = "Add person"; FT.state.store.addPerson({ firstName: "H2" }); await tick();
    assert.equal(FT.state.data.people.length, n + 2);
    FT.history.undo(); assert.equal(FT.state.data.people.length, n + 1);
    FT.history.undo(); assert.equal(FT.state.data.people.length, n);
    FT.history.redo(); assert.equal(FT.state.data.people.length, n + 1);
    assert.equal(FT.history.states[FT.history.cur].label, "Add person");
  });

  t("several store calls from one action are one step", async (app) => {
    const FT = app.FT;
    FT.openTree(familyFixture(FT).data, {});
    const before = FT.history.states.length;
    const p = FT.state.store.addPerson({ firstName: "Kid" });
    FT.state.store.addParent(p.id, FT.state.data.settings.homePersonId);
    await tick();
    assert.equal(FT.history.states.length, before + 1);
  });

  t("importing a GEDCOM can be undone", async (app) => {
    const FT = app.FT;
    FT.openTree(familyFixture(FT).data, {});
    const n = FT.state.data.people.length;
    const done = FT.importGEDCOMText(SAMPLE_GED);
    await tick(20);
    const keep = [...app.document.querySelectorAll(".modal footer button")].find(b => /keep/i.test(b.textContent));
    assert.ok(keep, "import summary shows a Keep button"); keep.click();
    await done; await tick();
    assert.equal(FT.state.data.people.length, 5, "imported tree is open");
    FT.history.undo();
    assert.equal(FT.state.data.people.length, n, "undo brings the previous tree back");
  });

  t("embedded photos are stored once, not once per history step", async (app) => {
    const FT = app.FT;
    FT.openTree(familyFixture(FT).data, {});
    const big = "data:image/png;base64," + "A".repeat(200000);
    const ph = FT.state.store.addPhoto({ filename: "big.png" }); ph.dataUrl = big; FT.state.store.touch();
    await tick();
    for (let i = 0; i < 10; i++) { FT.state.store.addPerson({ firstName: "E" + i }); await tick(); }
    const worst = Math.max(...FT.history.states.map(s => s.json.length));
    assert.ok(worst < big.length, `a snapshot is ${worst} chars; photo data (${big.length}) must not be inside it`);
    FT.history.jumpTo(FT.history.states.length - 5);
    assert.equal(FT.state.store.photo(ph.id).dataUrl, big, "restored snapshot rehydrates the photo");
  });

  t("undo is ignored while a dialog is open", async (app) => {
    const FT = app.FT;
    FT.openTree(familyFixture(FT).data, {});
    FT.state.store.addPerson({ firstName: "U1" }); await tick();
    const n = FT.state.data.people.length;
    FT.modal({ title: "Hi", body: "x" });
    app.dispatchEvent(new app.KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
    assert.equal(FT.state.data.people.length, n);
  });
});
