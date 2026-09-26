suite("Kinship", (t) => {
  // describeRelationship(A, B) answers "B is A's ___".
  const FROM_ME = [
    ["father", "father"], ["mother", "mother"], ["gf", "grandfather"], ["gm", "grandmother"],
    ["ggf", "great-grandfather"], ["ggm", "great-grandmother"],
    ["sister", "sister"], ["halfBrother", "half-brother"],
    ["uncle", "uncle"], ["auntByMarriage", "aunt by marriage"],
    ["cousin", "1st cousin"], ["cousinChild", "1st cousin once removed"],
    ["greatAunt", "great-aunt"], ["greatAuntHusband", "great-uncle by marriage"],
    ["dragan", "1st cousin once removed"], ["nada", "2nd cousin"],
    ["wife", "wife"], ["mil", "mother-in-law"], ["fil", "father-in-law"],
    ["son", "son"], ["grandson", "grandson"],
    ["niece", "niece"], ["greatNiece", "great-niece"],
    ["sisterHusband", "brother-in-law"]
  ];

  t("everyone as seen from 'me'", (app) => {
    const { data, ids } = familyFixture(app.FT);
    app.FT.openTree(data, {});
    const bad = [];
    for (const [key, expected] of FROM_ME) {
      const got = app.FT.describeRelationship(ids.me, ids[key]).summary;
      if (got !== expected) bad.push(`${key}: expected "${expected}", got "${got}"`);
    }
    assert.ok(!bad.length, bad.join("; "));
  });

  t("other directions: step, in-law, cousin removed", (app) => {
    const { data, ids } = familyFixture(app.FT);
    app.FT.openTree(data, {});
    const R = (a, b) => app.FT.describeRelationship(ids[a], ids[b]).summary;
    assert.equal(R("halfBrother", "father"), "stepfather");
    assert.equal(R("father", "halfBrother"), "stepson");
    assert.equal(R("wife", "sister"), "sister-in-law");
    assert.equal(R("cousinChild", "me"), "1st cousin once removed");
    assert.equal(R("son", "me"), "father");
    assert.equal(R("grandson", "father"), "great-grandfather");
    assert.equal(R("me", "me"), "the same person");
  });

  t("unknown sex uses neutral words", (app) => {
    const K = app.FT.kinshipTerm;
    assert.equal(K(2, 1, "U"), "aunt/uncle");
    assert.equal(K(1, 2, "U"), "niece/nephew");
    assert.equal(K(1, 1, "U"), "sibling");
    assert.equal(K(4, 0, "U"), "great-great-grandparent");
    assert.equal(K(4, 2, "M"), "1st cousin twice removed");
    assert.equal(K(4, 4, "M"), "3rd cousin");
  });

  t("half-sibling needs both parents known on both sides", (app) => {
    const FT = app.FT;
    const data = FT.emptyTree(); const st = FT.createStore(data, null);
    const mum = st.addPerson({ firstName: "Mum", sex: "F" });
    const a = st.addPerson({ firstName: "A", sex: "M", parentIds: [mum.id] });
    const b = st.addPerson({ firstName: "B", sex: "M", parentIds: [mum.id] });
    FT.openTree(data, {});
    assert.equal(FT.describeRelationship(a.id, b.id).summary, "brother", "second parent unknown → not claimed as half");
  });

  t("unrelated people get no term", (app) => {
    const FT = app.FT;
    const data = FT.emptyTree(); const st = FT.createStore(data, null);
    const a = st.addPerson({ firstName: "A" }), b = st.addPerson({ firstName: "B" });
    FT.openTree(data, {});
    assert.equal(FT.describeRelationship(a.id, b.id).summary, null);
  });
});
