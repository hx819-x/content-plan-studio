function el(tag, text, cls) {
  const x = document.createElement(tag);
  if (text !== undefined) x.textContent = String(text);
  if (cls) x.className = cls;
  return x;
}
function download(name, text, type = "text/plain") {
  const a = el("a");
  const url = URL.createObjectURL(
    new Blob([text], { type: type + ";charset=utf-8" }),
  );
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function notify(text, error = false) {
  const box = document.getElementById("notice");
  box.textContent = text;
  box.className = "notice" + (error ? " error" : "");
  box.hidden = false;
}
function readSmallFile(file, limit = 1000000) {
  if (!file) throw Error("请选择文件");
  if (file.size > limit) throw Error("文件超过 1 MB 限制");
  return file.text();
}
const sample = {
  project: "街角书店 · 周末共读",
  audience: "附近想恢复阅读习惯、但不想独自坚持的年轻上班族",
  objective: "看完活动说明，选择适合的一场并完成报名",
  message: "用一个周末下午，读完一个短篇，并交换一个真实观点。",
  evidence: "模拟案例。时间、场地、名额、费用和报名链接均需在真实发布前确认。",
  start: "2026-11-23",
  days: 7,
  channels: "小红书,公众号,短视频",
};
const KEY = "content-plan-studio:v1";
let state = null;
const ids = Object.keys(sample);
function setBrief(b) {
  ids.forEach((k) => (document.getElementById(k).value = b[k]));
}
function getBrief() {
  return Object.fromEntries(
    ids.map((k) => [k, document.getElementById(k).value]),
  );
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    document.getElementById("saved").textContent = "已保存到此浏览器";
  } catch (e) {
    notify("浏览器无法保存，请使用“备份 JSON”下载。", true);
  }
}
function stats() {
  const box = document.getElementById("stats");
  box.replaceChildren();
  const done = state.tasks.filter((t) => t.status === "已发布").length;
  [
    ["内容总数", state.tasks.length],
    ["已发布", done],
    ["完成比例", Math.round((done / state.tasks.length) * 100) + "%"],
  ].forEach(([a, b]) => {
    const x = el("div", undefined, "stat");
    x.append(el("span", a), el("strong", b));
    box.append(x);
  });
}
function render() {
  setBrief(state.brief);
  stats();
  const checks = document.getElementById("checks");
  checks.replaceChildren(
    ...PlanCore.checks(state.brief).map((t) => el("li", t)),
  );
  const list = document.getElementById("plan");
  list.replaceChildren();
  for (const task of state.tasks) {
    const card = el("article", undefined, "task");
    const head = el("div", undefined, "task-head");
    const time = el("time", task.date);
    time.dateTime = task.date;
    const status = el("select");
    status.setAttribute("aria-label", task.date + " 状态");
    PlanCore.STATES.forEach((s) => {
      const o = el("option", s);
      o.value = s;
      status.append(o);
    });
    status.value = task.status;
    status.onchange = () => {
      task.status = status.value;
      save();
      stats();
    };
    head.append(time, el("span", task.channel, "pill"), status);
    const title = el("input", undefined, "title-input");
    title.value = task.title;
    title.maxLength = 1000;
    title.setAttribute("aria-label", task.date + " 标题");
    title.oninput = () => {
      task.title = title.value;
      save();
    };
    const angle = el("p", task.angle + " · 观察：" + task.metric);
    const fields = el("div", undefined, "split");
    for (const [k, label] of [
      ["owner", "负责人"],
      ["note", "执行备注"],
    ]) {
      const wrap = el("label", label, "field");
      const input = el("input");
      input.value = task[k];
      input.placeholder = k === "owner" ? "待分配" : "素材、待核实信息或下一步";
      input.maxLength = 2000;
      input.oninput = () => {
        task[k] = input.value;
        save();
      };
      wrap.append(input);
      fields.append(wrap);
    }
    card.append(head, title, angle, fields);
    list.append(card);
  }
}
document.getElementById("brief").onsubmit = (e) => {
  e.preventDefault();
  try {
    state = PlanCore.build(getBrief());
    save();
    render();
    notify("已生成计划。请检查事实依据，再编辑标题和负责人。");
  } catch (e) {
    notify(e.message, true);
  }
};
document.getElementById("brief").addEventListener("input", () => {
  document.getElementById("saved").textContent =
    "左侧改动需点击“生成内容计划”应用";
});
document.getElementById("demo").onclick = () => {
  state = PlanCore.build(sample);
  save();
  render();
  notify("已加载模拟案例，非真实活动或运营成果。");
};
document.getElementById("export").onclick = () => {
  try {
    download("content-plan.md", PlanCore.markdown(state), "text/markdown");
    notify("已导出策划案。");
  } catch (e) {
    notify(e.message, true);
  }
};
document.getElementById("backup").onclick = () => {
  try {
    download(
      "content-plan.json",
      JSON.stringify(PlanCore.validate(state), null, 2),
      "application/json",
    );
    notify("已导出 JSON 备份。");
  } catch (e) {
    notify(e.message, true);
  }
};
document.getElementById("restore").onchange = async (e) => {
  try {
    const next = PlanCore.validate(
      JSON.parse(await readSmallFile(e.target.files[0])),
    );
    state = next;
    save();
    render();
    notify("已恢复备份。");
  } catch (e) {
    notify("恢复失败：" + e.message, true);
  } finally {
    e.target.value = "";
  }
};
document.getElementById("clear").onclick = () => {
  if (!confirm("清空此工具保存的草稿，并恢复模拟案例？")) return;
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
  state = PlanCore.build(sample);
  render();
  notify("已清空保存的草稿；当前显示未保存的模拟案例。");
};
try {
  const raw = localStorage.getItem(KEY);
  state = raw ? PlanCore.validate(JSON.parse(raw)) : PlanCore.build(sample);
} catch (e) {
  state = PlanCore.build(sample);
  notify("旧草稿无法读取，已显示模拟案例。", true);
}
render();
