(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PlanCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const STATES = ["待制作", "制作中", "待审核", "已发布"];
  const STAGES = [
    ["问题共鸣", "你的受众为什么会遇到这个问题？", "评论中的具体问题"],
    ["实用清单", "给受众一份可操作的准备清单", "收藏数 / 曝光数"],
    ["过程记录", "展示如何准备，并写清限制", "有效评论与追问"],
    ["常见疑问", "回答一个最影响行动的疑问", "问题是否被解决"],
    ["行动指引", "说清参与步骤、时间与条件", "链接点击数 / 曝光数"],
    ["细节补充", "补充容易被忽略的信息", "重复咨询的问题"],
    ["复盘与反馈", "整理真实反馈，决定下一轮修改", "实际行动数 / 点击数"],
  ];
  function date(text) {
    if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text))
      throw Error("日期格式应为 YYYY-MM-DD");
    const d = new Date(text + "T00:00:00Z");
    if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== text)
      throw Error("日期不存在");
    return d;
  }
  function clean(value, name, max = 1000) {
    if (typeof value !== "string" || !value.trim())
      throw Error("请填写" + name);
    if (value.length > max) throw Error(name + "过长");
    return value.trim();
  }
  function brief(input) {
    if (!input || typeof input !== "object") throw Error("策划输入无效");
    const b = {};
    for (const [key, label, max] of [
      ["project", "项目主题", 100],
      ["audience", "受众", 200],
      ["objective", "行动目标", 200],
      ["message", "核心信息", 1000],
    ])
      b[key] = clean(input[key], label, max);
    b.evidence =
      typeof input.evidence === "string"
        ? input.evidence.trim().slice(0, 1000)
        : "";
    b.start = clean(input.start, "开始日期", 10);
    date(b.start);
    b.days = Number(input.days);
    if (![7, 14].includes(b.days)) throw Error("计划天数只能为 7 或 14");
    b.channels = clean(input.channels, "渠道", 150)
      .split(/[,，]/)
      .map((x) => x.trim())
      .filter(Boolean);
    b.channels = [...new Set(b.channels)];
    if (!b.channels.length || b.channels.length > 6)
      throw Error("请填写 1–6 个渠道");
    return b;
  }
  function build(input) {
    const b = brief(input),
      start = date(b.start);
    return {
      schema: 1,
      brief: { ...b, channels: b.channels.join(",") },
      tasks: Array.from({ length: b.days }, (_, i) => {
        const stage = STAGES[i % 7];
        const d = new Date(+start + i * 86400000);
        return {
          id: i + 1,
          date: d.toISOString().slice(0, 10),
          channel: b.channels[i % b.channels.length],
          stage: stage[0],
          title: b.project + " · " + stage[0],
          angle: stage[1],
          metric: stage[2],
          owner: "",
          status: STATES[0],
          note: "",
        };
      }),
    };
  }
  function validate(input) {
    if (!input || input.schema !== 1) throw Error("不是本工具的备份格式");
    const b = brief(input.brief);
    if (!Array.isArray(input.tasks) || input.tasks.length !== b.days)
      throw Error("日程数量与计划天数不一致");
    const ids = new Set();
    const tasks = input.tasks.map((t) => {
      if (!t || !Number.isInteger(t.id) || ids.has(t.id))
        throw Error("日程 ID 无效或重复");
      ids.add(t.id);
      date(t.date);
      if (!STATES.includes(t.status)) throw Error("日程状态无效");
      let x = { id: t.id, date: t.date, status: t.status };
      for (const k of ["channel", "stage", "title", "angle", "metric"])
        x[k] = clean(t[k], "日程 " + k, 1000);
      for (const k of ["owner", "note"]) {
        if (typeof t[k] !== "string" || t[k].length > 2000)
          throw Error("备注或负责人格式无效");
        x[k] = t[k];
      }
      return x;
    });
    return {
      schema: 1,
      brief: { ...b, channels: b.channels.join(",") },
      tasks,
    };
  }
  function checks(b) {
    return [
      b.evidence
        ? "已记录信息依据；发布前逐条确认其真实性。"
        : "缺少信息依据：先补来源与待核实事项。",
      "确认受众能看懂核心信息，且行动入口真实可用。",
      "涉及图片、音乐、引用时确认使用授权。",
      "记录曝光、点击、行动的统计周期和口径。",
    ];
  }
  function markdown(state) {
    const x = validate(state),
      b = x.brief;
    let lines = [
      "# " + b.project,
      "",
      "> 规则模板初稿；请人工核实。",
      "",
      `- 受众：${b.audience}`,
      `- 行动目标：${b.objective}`,
      `- 核心信息：${b.message}`,
      `- 信息依据：${b.evidence || "待补充"}`,
      "",
      "## 内容日程",
    ];
    for (const t of x.tasks)
      lines.push(
        "",
        `### ${t.date} · ${t.channel} · ${t.title}`,
        `- 阶段：${t.stage}`,
        `- 内容角度：${t.angle}`,
        `- 观察指标：${t.metric}`,
        `- 负责人：${t.owner || "待分配"}`,
        `- 状态：${t.status}`,
        `- 备注：${t.note || "无"}`,
      );
    return lines.join("\n");
  }
  return { STATES, build, validate, checks, markdown, date };
});
