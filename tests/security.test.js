/* A shared tree file or GEDCOM is untrusted input. Nothing in it may run code. */
suite("Security", (t) => {
  const EVIL = `<img src=x onerror="window.__xss='name'">`;
  const EVIL_ID = `p1"><img src=x onerror="window.__xss='id'">`;

  function hostileTree(FT) {
    return FT.parseTreeFile(JSON.stringify({
      treeName: `<img src=x onerror="window.__xss='treename'">`,
      people: [
        { id: EVIL_ID, firstName: EVIL, lastName: EVIL, occupation: EVIL, notes: EVIL, sex: "M",
          birth: { date: { original: EVIL, year: 1950, month: 5, day: 2 }, place: EVIL }, parentIds: [] },
        { id: "p2", firstName: "Kid", parentIds: [EVIL_ID], birth: { date: FT.util.parseDate("2 MAY 1980"), place: "" } }
      ],
      marriages: [], layout: {},
      photos: [{ id: "ph1", filename: EVIL, caption: EVIL, tags: [{ personId: EVIL_ID }], dataUrl: `data:image/png;base64,x" onerror="window.__xss='photo'` }],
      settings: { homePersonId: EVIL_ID }
    })).data;
  }

  t("hostile names, ids, places and photos never execute", async (app) => {
    const FT = app.FT;
    FT.openTree(hostileTree(FT), {});
    const id = FT.state.data.people[0].id;
    for (const v of ["family", "pedigree", "list", "timeline"]) { FT.state.currentView = v; FT.render(); await tick(30); }
    FT.openPanel(id); await tick(30);
    FT.openPanel("p2"); await tick(30);
    const s = app.document.getElementById("searchInput"); s.value = "img"; s.dispatchEvent(new app.Event("input")); await tick(30);
    await tick(100);
    assert.equal(app.__xss, undefined, "script ran via: " + app.__xss);
    assert.equal(app.document.querySelectorAll("img[onerror]").length, 0, "an <img onerror> reached the DOM");
  });

  t("a Content-Security-Policy blocks all network access", async (app) => {
    const meta = app.document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    assert.ok(meta, "CSP meta tag present");
    assert.includes(meta.content, "connect-src 'none'");
    let blocked = false;
    try { await app.fetch("https://example.com/leak?x=1"); } catch (e) { blocked = true; }
    assert.ok(blocked, "fetch to the internet must be refused");
  });
});
