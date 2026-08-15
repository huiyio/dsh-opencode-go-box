// Client half of the dsh-opencode-go-usage plugin.
// Hand-written browser bundle in the lazy-CJS format the client module loader
// expects: it only REGISTERS the factory; the body runs at materialization.
// It mounts the opencodeUsage Remote, registers a settings.section sidebar
// entry ("OpenCode Go"), and renders the usage page.
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
    };

    // Client-side Remote contribution. The result codec is a pass-through
    // parser: the Host already validates the business result against its own
    // zod schema before it crosses the wire, and this side only needs the
    // descriptor's strict shape to mount and call.
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
            typeSymbol: "dsh-opencode-go-usage#OpencodeUsageResult",
            schema: { parse(value) { return value; } },
          },
        },
      ],
    };

    // Reference plan limits for context only; the endpoint reports percent,
    // and these can drift with plan changes.
    const LIMITS = { rolling: "$12", weekly: "$30", monthly: "$60" };

    const styles = {
      wrap: { maxWidth: 720, display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" },
      title: { fontSize: 16, fontWeight: 600, margin: 0 },
      hint: { color: "var(--dsw-alias-label-tertiary)", fontSize: 13, lineHeight: 1.6, margin: 0 },
      error: { color: "var(--dsw-alias-state-error-primary)", fontSize: 13, lineHeight: 1.6, margin: 0 },
      card: { border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-3)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 },
      cardHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
      cardName: { fontSize: 14, fontWeight: 600, margin: 0 },
      cardMeta: { color: "var(--dsw-alias-label-tertiary)", fontSize: 12, margin: 0 },
      barTrack: { height: 8, borderRadius: 4, background: "var(--dsw-alias-bg-layer-1)", overflow: "hidden" },
      barFill: { height: "100%", borderRadius: 4, background: "var(--dsw-alias-state-business-primary)", transition: "width .2s ease" },
      row: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--dsw-alias-label-secondary)", gap: 8 },
      button: { alignSelf: "flex-start", border: "1px solid var(--dsw-alias-border-l2)", color: "var(--dsw-alias-label-primary)", font: "inherit", cursor: "pointer", background: "transparent", borderRadius: 6, padding: "5px 12px" },
    };

    function fmtReset(resetsAt, t) {
      if (!resetsAt) return t("unknown");
      const d = new Date(resetsAt);
      if (Number.isNaN(d.getTime())) return resetsAt;
      return d.toLocaleString();
    }

    function WindowCard(props) {
      const { name, limit, windowData, t } = props;
      const percent = windowData && typeof windowData.percent === "number" ? windowData.percent : null;
      const pct = percent === null ? 0 : Math.max(0, Math.min(100, percent));
      return React.createElement("div", { style: styles.card },
        React.createElement("div", { style: styles.cardHead },
          React.createElement("h3", { style: styles.cardName }, name),
          React.createElement("p", { style: styles.cardMeta }, t("limit") + ": " + limit),
        ),
        React.createElement("div", { style: styles.barTrack },
          React.createElement("div", { style: { ...styles.barFill, width: pct + "%" } }),
        ),
        React.createElement("div", { style: styles.row },
          React.createElement("span", null, percent === null ? t("unknown") : percent + "%"),
          React.createElement("span", null, t("reset") + ": " + fmtReset(windowData && windowData.resetsAt, t)),
        ),
      );
    }

    function makePanel(query, t) {
      function UsagePanel() {
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

        if (state.kind === "loading") {
          return React.createElement("div", { style: styles.wrap },
            React.createElement("p", { style: styles.hint }, t("loading")),
          );
        }
        if (state.kind === "failure") {
          return React.createElement("div", { style: styles.wrap },
            React.createElement("p", { style: styles.error }, state.message),
            React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
          );
        }

        const value = state.value || {};
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
        return React.createElement("div", { style: styles.wrap },
          React.createElement("h2", { style: styles.title }, t("title")),
          React.createElement(WindowCard, { name: t("rolling"), limit: LIMITS.rolling, windowData: usage.rolling, t }),
          React.createElement(WindowCard, { name: t("weekly"), limit: LIMITS.weekly, windowData: usage.weekly, t }),
          React.createElement(WindowCard, { name: t("monthly"), limit: LIMITS.monthly, windowData: usage.monthly, t }),
          React.createElement("button", { style: styles.button, onClick: load }, t("refresh")),
        );
      }
      return UsagePanel;
    }

    function apply(ctx) {
      const mountReady = ctx.remote.$mount(TYPERT_REMOTE);
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "opencode-go-usage: dictionaries");
      const t = ctx.locale.bind(NS);

      const query = async () => {
        await mountReady;
        const api = ctx.get("remote.opencodeUsage") ?? (ctx.remote && ctx.remote.opencodeUsage);
        if (!api) throw new Error("opencodeUsage remote is unavailable");
        return api.usage();
      };
      const UsagePanel = makePanel(query, t);

      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "opencode-go",
        order: 40,
        label: () => t("nav"),
        locale: NS,
      }, UsagePanel));
    }

    exports.NS = NS;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
