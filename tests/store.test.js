suite("Store", (t) => {
  t("index stays consistent across every kind of mutation", (app) => {
    const FT = app.FT;
    const { data, ids } = familyFixture(FT);
    const st = FT.createStore(data, null);
    const kids = (id) => st.children(id).map(p => p.firstName).join(",");
    assert.equal(kids(ids.father), "Marko,Iva");
    const x = st.addPerson({ firstName: "Newkid" });
    st.addParent(x.id, ids.father);
    assert.equal(kids(ids.father), "Marko,Iva,Newkid", "after addParent");
    st.removeParent(x.id, ids.father);
    assert.equal(kids(ids.father), "Marko,Iva", "after removeParent");
    st.removePerson(ids.sister);
    assert.equal(kids(ids.father), "Marko", "after removePerson");
    assert.equal(st.person(ids.sister), null);
    const m = st.findMarriage(ids.me, ids.wife);
    assert.ok(m, "marriage found");
    st.removeMarriage(m.id);
    assert.equal(st.findMarriage(ids.me, ids.wife), null, "after removeMarriage");
    assert.equal(st.partners(ids.me).length, 1, "still a co-parent via Luka");
  });

  t("children() returns a copy callers can't corrupt", (app) => {
    const { data, ids } = familyFixture(app.FT);
    const st = app.FT.createStore(data, null);
    st.children(ids.father).length = 0;
    assert.equal(st.children(ids.father).length, 2);
  });

  t("siblings include half-siblings, in tree order", (app) => {
    const { data, ids } = familyFixture(app.FT);
    const st = app.FT.createStore(data, null);
    assert.deepEqual(st.siblings(ids.me).map(p => p.firstName), ["Iva", "Goran"]);
  });

  t("addParent refuses loops and self-parenting", (app) => {
    const { data, ids } = familyFixture(app.FT);
    const st = app.FT.createStore(data, null);
    assert.equal(st.addParent(ids.me, ids.me).ok, false);
    const r = st.addParent(ids.gf, ids.grandson);
    assert.equal(r.ok, false); assert.includes(r.reason, "loop");
  });

  t("removePerson cleans every reference, including 'me'", (app) => {
    const { data, ids } = familyFixture(app.FT);
    const st = app.FT.createStore(data, null);
    const ph = st.addPhoto({ filename: "a.jpg" }); st.tagPerson(ph.id, ids.me);
    st.removePerson(ids.me);
    assert.ok(!data.people.some(p => p.parentIds.includes(ids.me)), "no parent links left");
    assert.ok(!data.marriages.some(m => m.spouseIds.includes(ids.me)), "no marriages left");
    assert.ok(!data.photos.some(p => p.tags.some(t => t.personId === ids.me)), "no photo tags left");
    assert.equal(data.settings.homePersonId, null, "homePersonId cleared");
  });

  t("partners() unions spouses and unmarried co-parents", (app) => {
    const { data, ids } = familyFixture(app.FT);
    const st = app.FT.createStore(data, null);
    const names = st.partners(ids.mother).map(x => x.person.firstName).sort();
    assert.deepEqual(names, ["Petar", "Zivko"]);
    const petar = st.partners(ids.mother).find(x => x.person.id === ids.petar);
    assert.equal(petar.marriage, null); assert.equal(petar.children.length, 1);
  });

  t("relationshipPath finds the shortest route", (app) => {
    const { data, ids } = familyFixture(app.FT);
    const st = app.FT.createStore(data, null);
    const path = st.relationshipPath(ids.me, ids.cousin);
    assert.deepEqual(path.map(s => s.rel), ["self", "parent", "parent", "child", "child"]);
    assert.equal(st.relationshipPath(ids.me, st.addPerson({ firstName: "Stranger" }).id), null);
  });
});
