const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("./core.js");
const sample = require("./sample.json");
test("cross-month dates and channel rotation", () => {
  const p = P.build({ ...sample, start: "2026-11-29" });
  assert.equal(p.tasks[2].date, "2026-12-01");
  assert.equal(p.tasks[3].channel, "小红书");
});
test("leap day accepts real date and rejects impossible dates", () => {
  assert.equal(P.date("2024-02-29").getUTCDate(), 29);
  assert.throws(() => P.date("2026-02-29"));
  assert.throws(() => P.date("2026-13-01"));
});
test("missing input and unsupported plan lengths fail", () => {
  assert.throws(() => P.build({ ...sample, project: " " }));
  assert.throws(() => P.build({ ...sample, days: 500 }));
  assert.throws(() => P.build({ ...sample, channels: "," }));
});
test("14-day plan has unique ids and exact dates", () => {
  const p = P.build({ ...sample, days: 14, start: "2026-12-25" });
  assert.equal(p.tasks.length, 14);
  assert.equal(p.tasks[13].date, "2027-01-07");
  assert.equal(new Set(p.tasks.map((t) => t.id)).size, 14);
});
test("backup validation rejects corrupted and duplicate tasks", () => {
  const p = P.build(sample);
  p.tasks[1].id = 1;
  assert.throws(() => P.validate(p));
  assert.throws(() => P.validate({ schema: 99 }));
});
test("export preserves edited notes and completion status", () => {
  const p = P.build(sample);
  p.tasks[0].note = "先核实报名人数";
  p.tasks[0].status = "已发布";
  const restored = P.validate(JSON.parse(JSON.stringify(p)));
  assert.match(P.markdown(restored), /先核实报名人数/);
  assert.match(P.markdown(restored), /状态：已发布/);
});
test("empty evidence is flagged, channels are trimmed and deduplicated", () => {
  const p = P.build({
    ...sample,
    evidence: "",
    channels: "公众号, 公众号，短视频",
  });
  assert.equal(p.brief.channels, "公众号,短视频");
  assert.match(P.checks(p.brief)[0], /缺少/);
});
