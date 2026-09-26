suite("UI", (t) => {
  t("opening a tree centres on 'me', not the first person", (app) => {
    const FT = app.FT;
    const { data, ids } = familyFixture(FT);
    FT.openTree(data, {});
    assert.equal(FT.views.getFocus(), ids.me);
    assert.ok(app.document.querySelector(`.node.focus[data-id="${ids.me}"]`), "me is ringed as IN FOCUS");
  });

  t("family view shows uncles, cousins and great-aunts without overlaps", (app) => {
    const FT = app.FT;
    const { data, ids } = familyFixture(FT);
    FT.openTree(data, {});
    const shown = new Set(cardBoxes(app).map(b => b.id));
    for (const k of ["father", "mother", "gf", "gm", "ggf", "ggm", "sister", "halfBrother", "uncle", "cousin", "greatAunt", "wife", "son"])
      assert.ok(shown.has(ids[k]), k + " should be on the canvas");
    assert.deepEqual(overlaps(cardBoxes(app)), [], "cards overlap");
  });

  t("family view has no overlaps at any depth on large trees", (app) => {
    // Synthetic trees marry across branches at random, so they're full of
    // cousin marriages and remarriages — the hard cases for the layout.
    const FT = app.FT;
    const layoutErrors = [];
    const origErr = app.console.error;
    app.console.error = (...a) => { if (String(a[0]).startsWith("[layout]")) layoutErrors.push(a.join(" ")); else origErr.apply(app.console, a); };
    for (const seed of [1, 7, 42]) {
      const data = syntheticTree(FT, 1500, seed);
      FT.openTree(data, {});
      for (const depth of [2, 3, 4, 5, 6]) {
        for (const pick of [0.3, 0.5, 0.8, 0.95]) {
          FT.state.data.settings.generationDepth = depth;
          FT.state.focusId = data.people[Math.floor(data.people.length * pick)].id;
          FT.render();
          const o = overlaps(cardBoxes(app));
          assert.deepEqual(o, [], `seed ${seed}, depth ${depth}, person #${Math.floor(data.people.length * pick)}`);
        }
      }
    }
    assert.deepEqual(layoutErrors, [], "layout tripwire fired");
  });

  t("clicking a card selects it without re-rooting or swapping a couple", (app) => {
    const FT = app.FT;
    const { data, ids } = familyFixture(FT);
    FT.openTree(data, {});
    const xOf = (id) => parseFloat(app.document.querySelector(`.node[data-id="${id}"]`).style.left);
    const before = [xOf(ids.me), xOf(ids.wife)];
    FT.views.onNodeClick(ids.wife, "family");
    assert.equal(FT.views.getFocus(), ids.me);
    assert.deepEqual([xOf(ids.me), xOf(ids.wife)], before);
    assert.ok(app.document.getElementById("sidePanel").classList.contains("open"));
  });

  t("overlay buttons are never captured by canvas panning", (app) => {
    const FT = app.FT;
    const { data } = familyFixture(FT);
    FT.openTree(data, {});
    FT.state.currentView = "pedigree"; FT.render();
    const toggle = app.document.querySelector("#viewRoot .canvas .ped-toggle");
    assert.ok(toggle, "pedigree has expand/collapse toggles");
    assert.equal(FT.views.canvasClaimsPointer(toggle), false, "pedigree toggle");
    FT.prefs.upcomingHidden = true;
    for (const sel of [".controls button", ".controls select"]) {
      const el = app.document.querySelector("#viewRoot " + sel);
      assert.equal(FT.views.canvasClaimsPointer(el), false, sel);
    }
    const card = app.document.querySelector("#viewRoot .canvas .node .nm");
    assert.equal(FT.views.canvasClaimsPointer(card), true, "a card body starts a pan/click");
    assert.equal(FT.views.canvasClaimsPointer(app.document.querySelector("#viewRoot .canvas")), true, "empty canvas pans");
  });

  t("pedigree toggle collapses and expands", (app) => {
    const FT = app.FT;
    const { data } = familyFixture(FT);
    FT.openTree(data, {});
    FT.state.currentView = "pedigree"; FT.render();
    const n0 = app.document.querySelectorAll("#viewRoot .node").length;
    app.document.querySelector("#viewRoot .ped-toggle").click();
    const n1 = app.document.querySelectorAll("#viewRoot .node").length;
    assert.ok(n1 < n0, `collapse should hide ancestors (${n0} → ${n1})`);
  });

  t("birthday widget closes and reopens", (app) => {
    const FT = app.FT;
    const { data, ids } = familyFixture(FT);
    const soon = new Date(Date.now() + 3 * 864e5);
    data.people.find(p => p.id === ids.sister).birth = { date: FT.util.buildDate({ year: 1990, month: soon.getMonth() + 1, day: soon.getDate() }), place: "" };
    FT.prefs.upcomingHidden = false;
    FT.openTree(data, {});
    app.document.querySelector(".upcoming .up-x").click();
    const pill = app.document.querySelector(".upcoming-pill");
    assert.ok(pill && !app.document.querySelector(".upcoming"), "collapsed to a pill");
    pill.click();
    assert.ok(app.document.querySelector(".upcoming"), "reopened");
  });

  t("birthdays without a known day are not listed as 'the 1st'", (app) => {
    const FT = app.FT;
    const data = FT.emptyTree(); const st = FT.createStore(data, null);
    const nextMonth = ((new Date().getMonth() + 1) % 12) + 1;
    st.addPerson({ firstName: "MonthOnly", birth: { date: FT.util.buildDate({ year: 1980, month: nextMonth }), place: "" } });
    FT.openTree(data, {});
    assert.equal(FT.upcomingEvents(60).length, 0);
  });

  t("Esc closes only the top dialog", async (app) => {
    const FT = app.FT;
    FT.openTree(familyFixture(FT).data, {});
    let outer = "open", inner = "open";
    FT.modal({ title: "Outer", body: "a" }).then(() => outer = "closed");
    FT.modal({ title: "Inner", body: "b" }).then(() => inner = "closed");
    app.document.dispatchEvent(new app.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    assert.equal(inner, "closed"); assert.equal(outer, "open");
    assert.equal(app.document.querySelectorAll(".modal-back").length, 1);
  });

  t("dialogs are announced to screen readers", (app) => {
    const FT = app.FT;
    FT.openTree(familyFixture(FT).data, {});
    FT.modal({ title: "Accessible", body: "x" });
    const box = app.document.querySelector(".modal");
    assert.equal(box.getAttribute("role"), "dialog"); assert.equal(box.getAttribute("aria-modal"), "true");
    assert.equal(app.document.getElementById(box.getAttribute("aria-labelledby")).textContent, "Accessible");
  });

  t("photo caption edits are saved", async (app) => {
    const FT = app.FT;
    const { data, ids } = familyFixture(FT);
    FT.openTree(data, {});
    const ph = FT.state.store.addPhoto({ filename: "x.png" }); ph.dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    FT.state.store.tagPerson(ph.id, ids.me);
    const done = FT.openPhotoModal(ph.id, ids.me);
    await tick(30);
    const cap = app.document.querySelector(".modal .tagger input");
    cap.value = "Summer 1999";
    [...app.document.querySelectorAll(".modal footer button")].find(b => b.textContent === "Done").click();
    await done;
    assert.equal(FT.state.store.photo(ph.id).caption, "Summer 1999");
  });

  t("cards can be opened from the keyboard", (app) => {
    const FT = app.FT;
    const { data, ids } = familyFixture(FT);
    FT.openTree(data, {});
    const card = app.document.querySelector(`.node[data-id="${ids.uncle}"]`);
    assert.equal(card.tabIndex, 0, "cards are focusable");
    assert.ok(card.getAttribute("aria-label"), "cards have an accessible name");
    card.dispatchEvent(new app.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    assert.equal(FT.views.panelId, ids.uncle);
  });

  t("adding a relative never steals the focus from 'me'", async (app) => {
    const FT = app.FT;
    const { data, ids } = familyFixture(FT);
    FT.openTree(data, {});
    FT.linkRelative(ids.uncle, FT.state.store.addPerson({ firstName: "NewKid" }).id, "child");
    FT.render();
    assert.equal(FT.views.getFocus(), ids.me);
    const kid = FT.state.data.people.find(p => p.firstName === "NewKid");
    assert.deepEqual(kid.parentIds.slice().sort(), [ids.uncle, ids.auntByMarriage].sort(), "co-parent auto-linked");
  });

  t("two-finger pinch zooms, one finger pans, a tap opens a card", (app) => {
    const FT = app.FT;
    const { data, ids } = familyFixture(FT);
    FT.openTree(data, {});
    const vr = app.document.getElementById("viewRoot");
    const card = app.document.querySelector(`.node[data-id="${ids.uncle}"] .nm`);
    const ev = (type, id, x, y, target = vr) => target.dispatchEvent(new app.PointerEvent(type, { pointerId: id, pointerType: "touch", clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
    const cam = () => ({ ...FT.views.cam.family });
    const s0 = cam().s;
    ev("pointerdown", 1, 300, 300); ev("pointerdown", 2, 400, 300);
    ev("pointermove", 2, 500, 300);                     // fingers twice as far apart
    ev("pointerup", 2, 500, 300); ev("pointerup", 1, 300, 300);
    const s1 = cam().s;
    assert.ok(Math.abs(s1 / s0 - 2) < 0.01 || s1 === 2.0, `pinch should double the zoom (${s0} → ${s1})`);
    assert.equal(FT.views.panelId || null, null, "a pinch is not a tap");
    const x0 = cam().x;
    ev("pointerdown", 3, 200, 200); ev("pointermove", 3, 260, 200); ev("pointerup", 3, 260, 200);
    assert.equal(Math.round(cam().x - x0), 60, "one-finger drag pans");
    const r = card.getBoundingClientRect();
    ev("pointerdown", 4, r.x + 5, r.y + 5, card); ev("pointerup", 4, r.x + 5, r.y + 5, card);
    assert.equal(FT.views.panelId, ids.uncle, "tap opens the card");
  });

  t("renders at phone width without horizontal page scroll", async (app) => {
    const frame = document.getElementById("app-frame");
    frame.style.width = "375px"; frame.style.height = "740px";
    await tick(50);
    const FT = app.FT;
    FT.openTree(familyFixture(FT).data, {});
    for (const v of ["family", "list", "timeline", "pedigree"]) {
      FT.state.currentView = v; FT.render(); await tick(10);
      assert.ok(app.document.documentElement.scrollWidth <= 375, `${v}: page is ${app.document.documentElement.scrollWidth}px wide`);
    }
  });
});
