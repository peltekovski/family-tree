suite("Dates", (t) => {
  t("parses the common GEDCOM and typed forms", (app) => {
    const P = app.FT.util.parseDate;
    const cases = [
      ["12 JAN 1980", { year: 1980, month: 1, day: 12, qualifier: null }],
      ["Jan 12, 1980", { year: 1980, month: 1, day: 12, qualifier: null }],
      ["JAN 1980", { year: 1980, month: 1, day: null, qualifier: null }],
      ["1980", { year: 1980, month: null, day: null, qualifier: null }],
      ["1980-03-07", { year: 1980, month: 3, day: 7, qualifier: null }],
      ["ABT 1900", { year: 1900, month: null, day: null, qualifier: "ABT" }],
      ["BEF 3 MAR 1850", { year: 1850, month: 3, day: 3, qualifier: "BEF" }],
      ["BET 1900 AND 1910", { year: 1900, month: null, day: null, qualifier: "BET" }],
      ["FROM 1900 TO 1910", { year: 1900, month: null, day: null, qualifier: "FROM" }],
      ["25/12/1999", { year: 1999, month: 12, day: 25, qualifier: null }],
      ["800", { year: 800, month: null, day: null, qualifier: null }]
    ];
    for (const [input, exp] of cases) {
      const d = P(input);
      assert.deepEqual({ year: d.year, month: d.month, day: d.day, qualifier: d.qualifier }, exp, input);
      assert.equal(d.original, input, "original preserved for " + input);
    }
  });

  t("never loses text it can't understand", (app) => {
    const d = app.FT.util.parseDate("sometime in spring, maybe");
    assert.equal(d.year, null);
    assert.equal(d.original, "sometime in spring, maybe");
    assert.equal(app.FT.util.formatDate(d), "sometime in spring, maybe");
  });

  t("empty input is null, invalid parts are dropped", (app) => {
    const P = app.FT.util.parseDate;
    assert.equal(P(""), null); assert.equal(P("   "), null); assert.equal(P(null), null);
    const d = P("1980-13-40");
    assert.equal(d.year, 1980); assert.equal(d.month, null); assert.equal(d.day, null);
  });

  t("formats for display", (app) => {
    const { parseDate: P, formatDate: F } = app.FT.util;
    assert.equal(F(P("12 JAN 1980")), "12 Jan 1980");
    assert.equal(F(P("ABT 1900")), "abt 1900");
    assert.equal(F(P("MAR 1850")), "Mar 1850");
    assert.equal(F(null), "");
  });

  t("buildDate from picker parts", (app) => {
    const B = app.FT.util.buildDate;
    const d = B({ year: "1980", month: 1, day: 12, qualifier: "ABT" });
    assert.deepEqual([d.year, d.month, d.day, d.qualifier, d.original], [1980, 1, 12, "ABT", "abt 12 Jan 1980"]);
    assert.equal(B({ year: "", month: null, day: null }), null);
    const md = B({ year: "", month: 6, day: 3 });
    assert.deepEqual([md.year, md.month, md.day], [null, 6, 3], "birthday without a year is allowed");
  });
});
