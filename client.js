// Client half of the dsh-opencode-go-usage plugin.
// Hand-written browser bundle in the lazy-CJS format the client module loader
// expects: it only REGISTERS the factory; the body runs at materialization.
// It mounts the opencodeUsage Remote (usage / dshUsage / dshSessionMessages),
// registers a settings.section page ("OpenCode Go") with two tabs, and a
// color-coded quota widget under the composer.
window.__ModuleLoader__.load({
  id: "dsh-opencode-go-usage",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const NS = "settings.opencodeGoUsage";
    const inject = ["slots", "locale", "remote"];

    const zh = {
      nav: "OpenCode Go",
      title: "OpenCode Go 用量",
      loading: "查询中…",
      notInModels: "尚未在「设置 → 模型」中添加 opencode-go。请先添加后再查询。",
      noApiKey: "未找到 OpenCode Go API Key（OPENCODE_GO_API_KEY / auth.json）。",
      unauthorized: "API Key 无效或已过期（401）。",
      network: "网络请求失败，请稍后重试。",
      httpError: "接口返回 HTTP {status}。",
      badJson: "接口响应解析失败。",
      refresh: "刷新",
      rolling: "5 小时滚动",
      weekly: "每周",
      monthly: "每月",
      limit: "限额",
      reset: "重置",
      status: "状态",
      unknown: "未知",
      tabQuota: "额度",
      tabDsh: "DSH 会话明细",
      dshHint: "统计 DeepSeek Harness 中使用 opencode-go 模型的会话（数据来自 DSH 会话日志，无需本机安装 OpenCode 客户端）。",
      dshEmpty: "还没有使用 opencode-go 模型的会话记录。",
      dshFailed: "读取 DSH 会话数据失败：",
      dshScanned: "已扫描最近 {n} 个会话",
      dshTotals: "累计",
      dshSessions: "会话列表",
      dshModel: "模型",
      dshTime: "时间",
      dshMsgs: "消息",
      dshIn: "输入",
      dshOut: "输出",
      dshReason: "推理",
      dshCache: "缓存",
      dshExpand: "明细",
      dshCollapse: "收起",
      dshStepsTitle: "每次调用用量",
      dshStepRow: "第 {turn} 轮 · 第 {step} 步",
      dshStepCapped: "仅显示最近 400 次调用",
      dockNotConfigured: "OpenCode Go 未配置",
      dockFailed: "OpenCode Go 查询失败",
      dockReset: "重置",
    };
    const en = {
      nav: "OpenCode Go",
      title: "OpenCode Go usage",
      loading: "Loading…",
      notInModels: "opencode-go is not added under Settings → Models yet. Add it first.",
      noApiKey: "No OpenCode Go API key found (OPENCODE_GO_API_KEY / auth.json).",
      unauthorized: "API key is invalid or expired (401).",
      network: "Network request failed, try again later.",
      httpError: "HTTP {status} from the usage endpoint.",
      badJson: "Failed to parse the usage response.",
      refresh: "Refresh",
      rolling: "5h rolling",
      weekly: "Weekly",
      monthly: "Monthly",
      limit: "limit",
      reset: "resets",
      status: "status",
      unknown: "unknown",
      tabQuota: "Quota",
      tabDsh: "DSH sessions",
      dshHint: "DeepSeek Harness sessions that used the opencode-go model (from DSH session logs; no local OpenCode client required).",
      dshEmpty: "No sessions using the opencode-go model yet.",
      dshFailed: "Failed to read DSH session data: ",
      dshScanned: "Scanned the latest {n} sessions",
      dshTotals: "Totals",
      dshSessions: "Sessions",
      dshModel: "Model",
      dshTime: "Time",
      dshMsgs: "Msgs",
      dshIn: "Input",
      dshOut: "Output",
      dshReason: "Reasoning",
      dshCache: "Cache",
      dshExpand: "Detail",
      dshCollapse: "Hide",
      dshStepsTitle: "Per-call usage",
      dshStepRow: "Turn {turn} · Step {step}",
      dshStepCapped: "Showing the latest 400 calls only",
      dockNotConfigured: "OpenCode Go not configured",
      dockFailed: "OpenCode Go query failed",
      dockReset: "resets",
    };

    // Client-side Remote contribution. Result codecs are pass-through
    // parsers: the Host already validates every business result against its
    // own zod schemas before they cross the wire, and this side only needs
    // the descriptors' strict shape to mount and call.
    const TYPERT_REMOTE = {
      package: "dsh-opencode-go-usage",
      descriptors: [
        {
          id: "dsh-opencode-go-usage#opencodeUsage/usage",
          service: "opencodeUsage",
          namespace: "opencodeUsage",
          method: "usage",
          invocation: { kind: "direct" },
          parameters: [],
          result: {
            mode: "strict",
            typeSymbol: "dsh-opencode-go-usage#UsageResult",
            schema: { parse(value) { return value; } },
          },
        },
        {
          id: "dsh-opencode-go-usage#opencodeUsage/dshUsage",
          service: "opencodeUsage",
          namespace: "opencodeUsage",
          method: "dshUsage",
          invocation: { kind: "direct" },
          parameters: [],
          result: {
            mode: "strict",
            typeSymbol: "dsh-opencode-go-usage#DshUsageResult",
            schema: { parse(value) { return value; } },
          },
        },
        {
          id: "dsh-opencode-go-usage#opencodeUsage/dshSessionMessages",
          service: "opencodeUsage",
          namespace: "opencodeUsage",
          method: "dshSessionMessages",
          invocation: { kind: "direct" },
          parameters: [{
            name: "sessionId",
            wire: "sessionId",
            source: "json",
            codec: {
              mode: "strict",
              typeSymbol: "dsh-opencode-go-usage#opencodeUsage/dshSessionMessages:sessionId",
              schema: { parse(value) { return value; } },
            },
          }],
          result: {
            mode: "strict",
            typeSymbol: "dsh-opencode-go-usage#DshSessionMessagesResult",
            schema: { parse(value) { return value; } },
          },
        },
      ],
    };

    // Fallback plan limits; the Host usage() response carries the current
    // limits and overrides these.
    const LIMITS = { rolling: "$12", weekly: "$30", monthly: "$60" };

    const colors = {
      ok: "var(--dsw-alias-state-success-primary, #3d9a50)",
      warn: "var(--dsw-alias-state-warn-label, #d98c2b)",
      danger: "var(--dsw-alias-state-error-primary, #d64545)",
      muted: "var(--dsw-alias-label-tertiary, #9a9a9a)",
      text: "var(--dsw-alias-label-primary, #e8e8e8)",
      text2: "var(--dsw-alias-label-secondary, #cfcfcf)",
    };

    const styles = {
      wrap: { maxWidth: 720, display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" },
      title: { fontSize: 16, fontWeight: 600, margin: 0 },
      hint: { color: colors.muted, fontSize: 13, lineHeight: 1.6, margin: 0 },
      error: { color: colors.danger, fontSize: 13, lineHeight: 1.6, margin: 0 },
      card: { border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-3)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 },
      cardHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
      cardName: { fontSize: 14, fontWeight: 600, margin: 0 },
      cardMeta: { color: colors.muted, fontSize: 12, margin: 0 },
      barTrack: { height: 8, borderRadius: 4, background: "var(--dsw-alias-bg-layer-1)", overflow: "hidden" },
      barFill: { height: "100%", borderRadius: 4, background: "var(--dsw-alias-state-business-primary)", transition: "width .2s ease" },
      row: { display: "flex", justifyContent: "space-between", fontSize: 12, color: colors.text2, gap: 8 },
      button: { alignSelf: "flex-start", border: "1px solid var(--dsw-alias-border-l2)", color: colors.text, font: "inherit", cursor: "pointer", background: "transparent", borderRadius: 6, padding: "5px 12px" },
      tabBar: { display: "flex", gap: 4, borderBottom: "1px solid var(--dsw-alias-border-l2)", paddingBottom: 0 },
      tab: { border: "none", background: "transparent", color: colors.muted, font: "inherit", fontSize: 13, cursor: "pointer", padding: "6px 14px", borderBottom: "2px solid transparent" },
      tabActive: { color: colors.text, borderBottomColor: "var(--dsw-alias-state-business-primary)" },
      table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
      th: { textAlign: "left", color: colors.muted, fontWeight: 500, padding: "6px 8px", borderBottom: "1px solid var(--dsw-alias-border-l2)" },
      td: { padding: "6px 8px", borderBottom: "1px solid var(--dsw-alias-border-l2)", color: colors.text2, verticalAlign: "top" },
      mono: { fontVariantNumeric: "tabular-nums" },
      stepList: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflowY: "auto" },
      stepRow: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: colors.text2, padding: "3px 0" },
      dockWrap: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: colors.text2, padding: "0 2px" },
      dot: { width: 7, height: 7, borderRadius: 999, background: colors.muted, flexShrink: 0 },
    };

    function fmtTime(iso) {
      if (typeof iso !== "string" || iso.length === 0) return "";
      try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleString();
      } catch (e) {
        return iso;
      }
    }

    function fmtCountdown(resetsAt) {
      if (typeof resetsAt !== "string" || resetsAt.length === 0) return "";
      const diff = new Date(resetsAt).getTime() - Date.now();
      if (Number.isNaN(diff)) return "";
      if (diff <= 0) return "0m";
      const mins = Math.floor(diff / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? h + "h" + (m < 10 ? "0" : "") + m + "m" : m + "m";
    }

    function statusOf(percent, thresholds) {
      if (typeof percent !== "number") return null;
      const danger = thresholds && typeof thresholds.danger === "number" ? thresholds.danger : 85;
      const warn = thresholds && typeof thresholds.warn === "number" ? thresholds.warn : 60;
      if (percent >= danger) return "danger";
      if (percent >= warn) return "warn";
      return "ok";
    }

    function WindowCard(props) {
      const { name, limit, windowData, thresholds, t } = props;
      const percent = windowData && typeof windowData.percent === "number" ? windowData.percent : null;
      const pct = percent === null ? 0 : Math.max(0, Math.min(100, percent));
      const status = statusOf(percent, thresholds);
      const barColor = status === "ok" ? colors.ok : status === "warn" ? colors.warn : status === "danger" ? colors.danger : "var(--dsw-alias-state-business-primary)";
      return React.createElement("div", { style: styles.card },
        React.createElement("div", { style: styles.cardHead },
          React.createElement("h3", { style: styles.cardName }, name),
          React.createElement("p", { style: styles.cardMeta }, t("limit") + ": " + (limit || "?")),
        ),
        React.createElement("div", { style: styles.barTrack },
          React.createElement("div", { style: { ...styles.barFill, width: pct + "%", background: barColor } }),
        ),
        React.createElement("div", { style: styles.row },
          React.createElement("span", { style: { color: status ? barColor : undefined } }, percent === null ? t("unknown") : percent + "%"),
          React.createElement("span", null, t("reset") + ": " + (windowData && windowData.resetsAt ? fmtTime(windowData.resetsAt) : t("unknown"))),
        ),
      );
    }

    function QuotaView(props) {
      const { value, t, load } = props;
      if (value.configured !== true) {
        const msg = value.reason === "no-api-key" ? t("noApiKey") : t("notInModels");
        return React.createElement("div", { style: styles.wrap },
          React.createElement("p", { style: styles.error }, msg),
          React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
        );
      }
      if (value.error) {
        let msg = value.error;
        if (value.error === "unauthorized") msg = t("unauthorized");
        else if (value.error === "network") msg = t("network");
        else if (value.error === "bad-json") msg = t("badJson");
        else if (value.error.startsWith("http-")) msg = t("httpError").replace("{status}", value.error.slice(5));
        return React.createElement("div", { style: styles.wrap },
          React.createElement("p", { style: styles.error }, msg),
          React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
        );
      }
      const usage = value.usage || {};
      const limits = value.limits || LIMITS;
      return React.createElement("div", { style: styles.wrap },
        React.createElement("h2", { style: styles.title }, t("title")),
        React.createElement(WindowCard, { name: t("rolling"), limit: limits.rolling, windowData: usage.rolling, thresholds: value.thresholds, t }),
        React.createElement(WindowCard, { name: t("weekly"), limit: limits.weekly, windowData: usage.weekly, thresholds: value.thresholds, t }),
        React.createElement(WindowCard, { name: t("monthly"), limit: limits.monthly, windowData: usage.monthly, thresholds: value.thresholds, t }),
        React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
      );
    }

    function DshPanel(props) {
      const { getApi, t } = props;
      const [state, setState] = React.useState({ kind: "loading" });
      const [expanded, setExpanded] = React.useState(null);
      const [detail, setDetail] = React.useState({ kind: "idle" });

      const load = React.useCallback(() => {
        setState({ kind: "loading" });
        setExpanded(null);
        setDetail({ kind: "idle" });
        Promise.resolve()
          .then(() => getApi())
          .then((api) => api.dshUsage())
          .then((result) => {
            if (!result || result.ok === false) {
              setState({ kind: "failed", message: (result && result.error && result.error.message) || "remote failed" });
              return;
            }
            setState({ kind: "done", value: result.value });
          })
          .catch((e) => setState({ kind: "failed", message: String((e && e.message) || e) }));
      }, [getApi]);

      React.useEffect(() => { load(); }, [load]);

      const toggle = (sessionId) => {
        if (expanded === sessionId) {
          setExpanded(null);
          setDetail({ kind: "idle" });
          return;
        }
        setExpanded(sessionId);
        setDetail({ kind: "loading" });
        Promise.resolve()
          .then(() => getApi())
          .then((api) => api.dshSessionMessages(sessionId))
          .then((result) => {
            if (!result || result.ok === false) {
              setDetail({ kind: "failed", message: (result && result.error && result.error.message) || "remote failed" });
              return;
            }
            setDetail({ kind: "done", value: result.value });
          })
          .catch((e) => setDetail({ kind: "failed", message: String((e && e.message) || e) }));
      };

      if (state.kind === "loading") {
        return React.createElement("div", { style: styles.wrap }, React.createElement("p", { style: styles.hint }, t("loading")));
      }
      if (state.kind === "failed") {
        return React.createElement("div", { style: styles.wrap },
          React.createElement("p", { style: styles.error }, t("dshFailed") + state.message),
          React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
        );
      }
      const value = state.value || {};
      if (value.ok !== true) {
        return React.createElement("div", { style: styles.wrap },
          React.createElement("p", { style: styles.error }, typeof value.message === "string" ? value.message : t("dshFailed")),
          React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
        );
      }
      const sessions = Array.isArray(value.sessions) ? value.sessions : [];
      if (sessions.length === 0) {
        return React.createElement("div", { style: styles.wrap },
          React.createElement("p", { style: styles.hint }, t("dshHint")),
          React.createElement("p", { style: styles.hint }, t("dshEmpty")),
          React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
        );
      }
      const totals = value.totals || {};
      const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : "0");
      return React.createElement("div", { style: styles.wrap },
        React.createElement("p", { style: styles.hint }, t("dshHint")),
        React.createElement("p", { style: styles.hint }, t("dshScanned").replace("{n}", String(value.scanned ?? 0))),
        React.createElement("div", { style: styles.card },
          React.createElement("div", { style: styles.cardHead },
            React.createElement("h3", { style: styles.cardName }, t("dshTotals")),
            React.createElement("p", { style: styles.cardMeta }, sessions.length + " sessions"),
          ),
          React.createElement("div", { style: styles.row },
            React.createElement("span", null, t("dshIn") + ": " + fmt(totals.inputTokens + (totals.cacheReadTokens || 0) + (totals.cacheWriteTokens || 0))),
            React.createElement("span", null, t("dshOut") + ": " + fmt(totals.outputTokens)),
            React.createElement("span", null, t("dshReason") + ": " + fmt(totals.reasoningTokens)),
          ),
        ),
        React.createElement("h3", { style: styles.cardName }, t("dshSessions")),
        sessions.map((session) => {
          const open = expanded === session.sessionId;
          return React.createElement("div", { key: session.sessionId, style: styles.card },
            React.createElement("div", { style: styles.cardHead },
              React.createElement("h3", { style: styles.cardName }, session.title || session.sessionId.slice(0, 8)),
              React.createElement("p", { style: styles.cardMeta }, (session.model || "?") + (session.variant ? "/" + session.variant : "")),
            ),
            React.createElement("div", { style: styles.row },
              React.createElement("span", null, t("dshTime") + ": " + fmtTime(session.createdAt)),
              React.createElement("span", null, t("dshMsgs") + ": " + session.messageCount),
            ),
            React.createElement("div", { style: styles.row },
              React.createElement("span", { style: styles.mono }, t("dshIn") + " " + fmt(session.totals.inputTokens + (session.totals.cacheReadTokens || 0) + (session.totals.cacheWriteTokens || 0))),
              React.createElement("span", { style: styles.mono }, t("dshOut") + " " + fmt(session.totals.outputTokens)),
              React.createElement("span", { style: styles.mono }, t("dshReason") + " " + fmt(session.totals.reasoningTokens)),
            ),
            React.createElement("button", { style: styles.button, onClick: () => toggle(session.sessionId) }, open ? t("dshCollapse") : t("dshExpand")),
            open ? React.createElement("div", null,
              detail.kind === "loading" ? React.createElement("p", { style: styles.hint }, t("loading"))
                : detail.kind === "failed" ? React.createElement("p", { style: styles.error }, t("dshFailed") + detail.message)
                : React.createElement("div", null,
                  React.createElement("p", { style: styles.cardMeta }, t("dshStepsTitle") + (detail.value && detail.value.steps && detail.value.steps.length >= 400 ? " · " + t("dshStepCapped") : "")),
                  React.createElement("div", { style: styles.stepList },
                    (detail.value && detail.value.steps ? detail.value.steps : []).map((step, index) => React.createElement("div", { key: index, style: styles.stepRow },
                      React.createElement("span", null, t("dshStepRow").replace("{turn}", step.turn).replace("{step}", step.step)),
                      React.createElement("span", { style: styles.mono }, "in " + fmt(step.inputTokens) + " · out " + fmt(step.outputTokens) + " · r " + fmt(step.reasoningTokens)),
                    )),
                  ),
                ),
            ) : null,
          );
        }),
        React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
      );
    }

    function makePanel(query, getApi, t) {
      function UsagePanel() {
        const [tab, setTab] = React.useState("quota");
        const [state, setState] = React.useState({ kind: "loading" });

        const load = React.useCallback(() => {
          setState({ kind: "loading" });
          Promise.resolve()
            .then(() => query())
            .then((result) => {
              if (!result || result.ok === false) {
                setState({ kind: "failure", message: (result && result.error && result.error.message) || "remote failed" });
                return;
              }
              setState({ kind: "done", value: result.value });
            })
            .catch((e) => setState({ kind: "failure", message: String((e && e.message) || e) }));
        }, []);

        React.useEffect(() => { load(); }, [load]);

        const tabButton = (id, label) => React.createElement("button", {
          key: id,
          style: { ...styles.tab, ...(tab === id ? styles.tabActive : {}) },
          onClick: () => setTab(id),
        }, label);

        let body = null;
        if (tab === "dsh") {
          body = React.createElement(DshPanel, { getApi, t });
        } else if (state.kind === "loading") {
          body = React.createElement("div", { style: styles.wrap }, React.createElement("p", { style: styles.hint }, t("loading")));
        } else if (state.kind === "failure") {
          body = React.createElement("div", { style: styles.wrap },
            React.createElement("p", { style: styles.error }, state.message),
            React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
          );
        } else {
          body = React.createElement(QuotaView, { value: state.value || {}, t, load });
        }

        return React.createElement("div", { style: styles.wrap },
          React.createElement("div", { style: styles.tabBar },
            tabButton("quota", t("tabQuota")),
            tabButton("dsh", t("tabDsh")),
          ),
          body,
        );
      }
      return UsagePanel;
    }

    function makeDock(query, t, timer) {
      return function DockWidget() {
        const [state, setState] = React.useState({ kind: "loading" });

        React.useEffect(() => {
          let cancelled = false;
          const run = () => {
            Promise.resolve()
              .then(() => query())
              .then((result) => {
                if (cancelled) return;
                if (!result || result.ok === false) {
                  setState({ kind: "failed" });
                  return;
                }
                setState({ kind: "done", value: result.value });
              })
              .catch(() => {
                if (!cancelled) setState({ kind: "failed" });
              });
          };
          run();
          let dispose = null;
          if (timer && typeof timer.interval === "function") {
            dispose = timer.interval(run, 30000);
          }
          return () => {
            cancelled = true;
            if (dispose) dispose();
          };
        }, []);

        let text = t("dockNotConfigured");
        let color = colors.muted;
        if (state.kind === "failed") {
          text = t("dockFailed");
        } else if (state.kind === "done") {
          const value = state.value || {};
          if (value.configured === true && value.error === null && value.usage) {
            const u = value.usage;
            const rp = u.rolling && typeof u.rolling.percent === "number" ? u.rolling.percent : null;
            const wp = u.weekly && typeof u.weekly.percent === "number" ? u.weekly.percent : null;
            const mp = u.monthly && typeof u.monthly.percent === "number" ? u.monthly.percent : null;
            const status = statusOf(rp, value.thresholds);
            color = status === "ok" ? colors.ok : status === "warn" ? colors.warn : status === "danger" ? colors.danger : colors.muted;
            const parts = [
              "5h " + (rp === null ? "—" : rp + "%"),
              t("weekly") + " " + (wp === null ? "—" : wp + "%"),
              t("monthly") + " " + (mp === null ? "—" : mp + "%"),
            ];
            const countdown = u.rolling && u.rolling.resetsAt ? fmtCountdown(u.rolling.resetsAt) : "";
            if (countdown) parts.push(t("dockReset") + " " + countdown);
            text = parts.join(" · ");
          }
        }
        return React.createElement("div", { style: styles.dockWrap, title: text },
          React.createElement("span", { style: { ...styles.dot, background: color } }),
          React.createElement("span", null, text),
        );
      };
    }

    function apply(ctx) {
      const mountReady = ctx.remote.$mount(TYPERT_REMOTE);
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "opencode-go-usage: dictionaries");
      const t = ctx.locale.bind(NS);

      const getApi = async () => {
        await mountReady;
        const api = ctx.get("remote.opencodeUsage") ?? (ctx.remote && ctx.remote.opencodeUsage);
        if (!api) throw new Error("opencodeUsage remote is unavailable");
        return api;
      };
      const query = async () => {
        const api = await getApi();
        return api.usage();
      };
      const timer = ctx.get("timer");
      const UsagePanel = makePanel(query, getApi, t);
      const DockWidget = makeDock(query, t, timer);

      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "opencode-go",
        order: 40,
        label: () => t("nav"),
        locale: NS,
      }, UsagePanel));

      ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
        name: "conversation.composer.dock",
        id: "opencode-go-usage",
        order: 10,
        label: () => t("nav"),
        locale: NS,
      }, DockWidget));
    }

    exports.NS = NS;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
