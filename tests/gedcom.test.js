/* A small MyHeritage-style export with the quirks the parser must survive:
   BOM, CRLF, CONC/CONT, _MARNM, NOTE pointers, a single-parent family,
   a divorce, OBJE links and an INDI-level _MARNM. Names are fictional. */
const SAMPLE_GED = "﻿" + [
  "0 HEAD", "1 SOUR MYHERITAGE", "1 FILE Kovac Family.ged", "1 CHAR UTF-8",
  "0 @I1@ INDI", "1 NAME Petar /Kovac/", "2 GIVN Petar", "2 SURN Kovac", "1 SEX M",
  "1 BIRT", "2 DATE 12 MAR 1950", "2 PLAC Skopje", "1 OCCU Teacher",
  "1 NOTE Loved chess and", "2 CONC  long walks.", "2 CONT Second line.",
  "1 OBJE", "2 FILE https://example.invalid/photos/p1.jpg?x=1", "2 TITL Portrait", "2 _PRIM Y",
  "1 FAMS @F1@",
  "0 @I2@ INDI", "1 NAME Jana /Novak/", "2 _MARNM Kovac", "1 SEX F",
  "1 BIRT", "2 DATE ABT 1952", "1 DEAT", "2 DATE 2019", "1 NOTE @N1@", "1 FAMS @F1@",
  "0 @I3@ INDI", "1 NAME Ana /Kovac/", "1 SEX F", "1 BIRT", "2 DATE 1 JAN 1975", "1 FAMC @F1@",
  "0 @I4@ INDI", "1 NAME Solo", "1 SEX M", "1 FAMC @F2@",
  "0 @I5@ INDI", "1 NAME Mira /Kovac/", "1 SEX F", "1 _MARNM Horvat", "1 FAMS @F2@",
  "0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@", "1 CHIL @I3@", "1 MARR", "2 DATE 1974", "2 PLAC Ohrid", "1 DIV", "2 DATE 1990",
  "0 @F2@ FAM", "1 WIFE @I5@", "1 CHIL @I4@",
  "0 @N1@ NOTE Shared note text",
  "3 ORPHAN line with no parent",
  "0 TRLR"
].join("\r\n");

suite("GEDCOM", (t) => {
  t("parses a MyHeritage-style export", (app) => {
    const { data, report } = app.FT.parseGEDCOM(SAMPLE_GED);
    assert.equal(report.individuals, 5); assert.equal(report.families, 2);
    assert.equal(data.treeName, "Kovac Family");
    const by = (fn) => data.people.find(p => p.firstName === fn);
    const petar = by("Petar"), jana = by("Jana"), ana = by("Ana"), solo = by("Solo"), mira = by("Mira");
    assert.equal(petar.birth.date.year, 1950); assert.equal(petar.birth.place, "Skopje");
    assert.equal(petar.occupation, "Teacher");
    assert.equal(petar.notes, "Loved chess and long walks.\nSecond line.");
    assert.equal(jana.lastName, "Kovac", "married name becomes last name");
    assert.equal(jana.maidenName, "Novak", "birth surname kept as maiden name");
    assert.equal(jana.death.date.year, 2019); assert.equal(jana.notes, "Shared note text");
    assert.equal(jana.birth.date.qualifier, "ABT");
    assert.deepEqual(ana.parentIds.slice().sort(), [petar.id, jana.id].sort());
    assert.deepEqual(solo.parentIds, [mira.id], "single-parent family");
    assert.equal(mira.lastName, "Horvat"); assert.equal(mira.maidenName, "Kovac");
    const m = data.marriages[0];
    assert.equal(m.divorced, true); assert.equal(m.divorceDate.year, 1990); assert.equal(m.place, "Ohrid");
    assert.equal(data.photos.length, 1); assert.equal(data.photos[0].filename, "p1.jpg");
    assert.equal(petar.primaryPhotoId, data.photos[0].id);
    assert.ok(report.warnings.some(w => /orphan/i.test(w)), "orphaned line is reported, not fatal");
  });

  t("rejects non-text input clearly", async (app) => {
    await assert.throws(() => app.FT.parseGEDCOM(null), /GEDCOM text expected/);
  });

  t("export → import round-trips people, families, dates and names", (app) => {
    const FT = app.FT;
    const { data } = familyFixture(FT);
    const st = FT.createStore(data, null);
    const me = data.people.find(p => p.firstName === "Marko");
    st.updatePerson(me.id, { birth: { date: FT.util.parseDate("ABT 3 FEB 1985"), place: "Bitola, Macedonia" },
      occupation: "Engineer", notes: "Line one\nLine two " + "x".repeat(400), maidenName: "", alternateNames: ["Mare"] });
    const gm = data.people.find(p => p.firstName === "Elena");
    st.updatePerson(gm.id, { lastName: "Petrova", maidenName: "Ilieva", death: { date: FT.util.parseDate("2001"), place: "" } });
    const odd = data.people.find(p => p.firstName === "Vera");
    st.updatePerson(odd.id, { death: { date: null, place: "" }, birth: { date: FT.util.parseDate("the winter of the big snow"), place: "" } });
    const wed = st.findMarriage(data.people.find(p => p.firstName === "Toni").id, data.people.find(p => p.firstName === "Iva").id);
    st.updateMarriage(wed.id, { date: FT.util.parseDate("5 JUN 2010"), place: "Ohrid", divorced: true, divorceDate: FT.util.parseDate("2015") });

    const ged = FT.exportGEDCOM(data);
    assert.ok(ged.split(/\r?\n/).every(l => l.length <= 255), "no GEDCOM line exceeds 255 chars");
    const back = FT.parseGEDCOM(ged).data;

    assert.equal(back.people.length, data.people.length, "people count");
    assert.equal(back.marriages.length, data.marriages.length, "marriage count");
    const key = (d, p) => p.firstName;
    const parentsOf = (d) => Object.fromEntries(d.people.map(p => [p.firstName,
      p.parentIds.map(id => d.people.find(q => q.id === id).firstName).sort().join("+")]));
    assert.deepEqual(parentsOf(back), parentsOf(data), "every parent link survives");
    const B = (fn) => back.people.find(p => p.firstName === fn);
    assert.equal(B("Marko").birth.date.original.toUpperCase(), "ABT 3 FEB 1985");
    assert.equal(B("Marko").birth.place, "Bitola, Macedonia");
    assert.equal(B("Marko").notes, "Line one\nLine two " + "x".repeat(400), "long notes survive CONC/CONT");
    assert.deepEqual(B("Marko").alternateNames, ["Mare"]);
    assert.equal(B("Elena").lastName, "Petrova"); assert.equal(B("Elena").maidenName, "Ilieva");
    assert.equal(B("Elena").death.date.year, 2001);
    assert.ok(B("Vera").death, "deceased without a date stays deceased");
    assert.equal(B("Vera").birth.date.original, "the winter of the big snow", "free-text date kept verbatim");
    const m2 = back.marriages.find(m => m.spouseIds.includes(B("Toni").id));
    assert.equal(m2.place, "Ohrid"); assert.equal(m2.divorced, true); assert.equal(m2.divorceDate.year, 2015);
    assert.equal(m2.date.day, 5);
    assert.equal(B("Marko").sex, "M"); assert.equal(B("Iva").sex, "F");
  });

  t("the bundled sample (examples/sample-family.ged) imports cleanly", async (app) => {
    const bytes = await (await fetch("../examples/sample-family.ged")).arrayBuffer();
    const { data, report } = app.FT.parseGEDCOM(app.FT.decodeGedcomBytes(bytes));
    assert.equal(data.people.length, 24); assert.equal(data.marriages.length, 8);
    assert.deepEqual(report.warnings, []);
    assert.deepEqual(app.FT.validateTree(data).map(i => i.message), [], "no data-check issues");
    const goran = data.people.find(p => p.firstName === "Goran");
    assert.equal(goran.parentIds.length, 2, "child of an unmarried couple keeps both parents");
  });

  t("decodes UTF-8, UTF-16 and legacy 8-bit files", (app) => {
    const D = app.FT.decodeGedcomBytes;
    const u8 = new TextEncoder().encode("0 HEAD\n1 NAME Đorđe /Šubić/");
    assert.includes(D(u8), "Đorđe");
    assert.includes(D(new Uint8Array([0xEF, 0xBB, 0xBF, ...u8])), "Šubić", "UTF-8 with BOM");
    const s = "0 HEAD\n1 NAME Zoë";
    const le = new Uint8Array(2 + s.length * 2); le[0] = 0xFF; le[1] = 0xFE;
    for (let i = 0; i < s.length; i++) { le[2 + i * 2] = s.charCodeAt(i) & 255; le[3 + i * 2] = s.charCodeAt(i) >> 8; }
    assert.includes(D(le), "Zoë", "UTF-16LE with BOM");
    const latin = new Uint8Array([...new TextEncoder().encode("1 NAME Jos"), 0xE9]);  // invalid UTF-8
    assert.includes(D(latin), "José", "falls back to Windows-1252");
  });
});
