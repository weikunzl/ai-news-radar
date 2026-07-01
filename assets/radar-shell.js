(() => {
  const channel = window.RADAR_CHANNEL || (location.pathname.includes("business") ? "ai-business" : "ai-news");
  const channels = {
    "ai-news": {
      label: "AI News",
      eyebrow: "TECH / INDUSTRY SIGNALS",
      href: "./index.html",
      decision: "Track model, product, and developer-tool shifts first; treat source gaps as active intelligence debt.",
      pulseLabel: "24h AI Signal Flow",
    },
    "ai-business": {
      label: "AI Business",
      eyebrow: "BUSINESS EVIDENCE LAYER",
      href: "./business.html",
      decision: "Prioritize AI leverage cases that map to Yuanli assets, OPC mechanics, and repeatable monetization.",
      pulseLabel: "72h Business Evidence",
    },
  };

  const fmt = new Intl.NumberFormat("en-US");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));

  function shortDate(iso) {
    if (!iso) return "Loading";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(date);
  }

  async function loadJson(path) {
    const response = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} ${response.status}`);
    return response.json();
  }

  function statusClass(failed) {
    if (failed > 0) return "warn";
    return "ok";
  }

  function metric(label, value, meta = "", tone = "") {
    return `
      <div class="radar-pulse-card ${tone ? `is-${tone}` : ""}">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        ${meta ? `<em>${esc(meta)}</em>` : ""}
      </div>
    `;
  }

  function renderPulse(metrics) {
    const pulse = document.getElementById("radarPulseStrip");
    if (pulse) {
      pulse.innerHTML = metrics.map((item) => metric(item.label, item.value, item.meta, item.tone)).join("");
    }

    const side = document.getElementById("radarSidePulse");
    if (side) {
      side.innerHTML = metrics.slice(0, 4).map((item) => `
        <div class="radar-side-metric ${item.tone ? `is-${item.tone}` : ""}">
          <span>${esc(item.label)}</span>
          <strong>${esc(item.value)}</strong>
        </div>
      `).join("");
    }
  }

  function renderDecision(text, meta) {
    const decision = document.getElementById("radarHeroDecision");
    if (decision && text) decision.textContent = text;
    const decisionMeta = document.getElementById("radarHeroDecisionMeta");
    if (decisionMeta && meta) decisionMeta.textContent = meta;
    const sideUpdated = document.getElementById("radarSideUpdated");
    if (sideUpdated && meta) sideUpdated.textContent = meta;
  }

  async function loadNewsPulse() {
    const [latest, status, brief] = await Promise.all([
      loadJson("./data/latest-24h.json"),
      loadJson("./data/source-status.json"),
      loadJson("./data/daily-brief.json"),
    ]);
    const items = Array.isArray(latest.items) ? latest.items : [];
    const total = Number(latest.total_items || items.length || 0);
    const high = items.filter((item) => Number(item.ai_score || item.importance_score || 0) >= 80).length;
    const sites = Array.isArray(status.sites) ? status.sites : [];
    const failedSites = Array.isArray(status.failed_sites) ? status.failed_sites.length : 0;
    const failedFeeds = Array.isArray(status.rss_opml?.failed_feeds) ? status.rss_opml.failed_feeds.length : 0;
    const failed = failedSites + failedFeeds;
    renderDecision(
      channels["ai-news"].decision,
      `Snapshot ${shortDate(latest.generated_at || status.generated_at || brief.generated_at)}`,
    );
    renderPulse([
      { label: "AI Signals", value: fmt.format(total), meta: "topic-filtered", tone: "gold" },
      { label: "High Priority", value: fmt.format(high), meta: "score >= 80" },
      { label: "Briefs", value: fmt.format((brief.items || []).length), meta: "story-level" },
      { label: "Source Health", value: `${fmt.format(Number(status.successful_sites || 0))}/${fmt.format(sites.length)}`, meta: failed ? `${fmt.format(failed)} gaps` : "clean", tone: statusClass(failed) },
    ]);
  }

  async function loadBusinessPulse() {
    const [latest, status, stories, brief, cases] = await Promise.all([
      loadJson("./data/business-latest-24h.json"),
      loadJson("./data/business-source-status.json"),
      loadJson("./data/business-stories-merged.json"),
      loadJson("./data/business-daily-brief.json"),
      loadJson("./data/business-case-bank.json"),
    ]);
    const failed = Number(status.failed_sources || 0);
    const topCluster = (stories.clusters || [])[0];
    renderDecision(
      topCluster?.thesis || channels["ai-business"].decision,
      `Snapshot ${shortDate(latest.generated_at || status.generated_at || brief.generated_at)}`,
    );
    renderPulse([
      { label: "Evidence Signals", value: fmt.format((latest.items || []).length), meta: "English-only", tone: "gold" },
      { label: "Story Clusters", value: fmt.format((stories.clusters || []).length), meta: topCluster ? `top ${topCluster.importance_score}` : "pending" },
      { label: "OPC Cases", value: fmt.format((cases.cases || []).length), meta: "case bank" },
      { label: "Source Health", value: `${fmt.format(Number(status.successful_sources || 0))}/${fmt.format(Number(status.source_count || 0))}`, meta: failed ? `${fmt.format(failed)} gap` : "clean", tone: statusClass(failed) },
    ]);
  }

  function buildShell() {
    document.documentElement.classList.add("radar-shell-html");
    document.body.classList.add("radar-shell-body", `radar-channel-${channel}`);

    const active = channels[channel] || channels["ai-news"];
    const nav = Object.entries(channels).map(([id, item]) => `
      <a class="radar-channel-link ${id === channel ? "active" : ""}" href="${item.href}" aria-current="${id === channel ? "page" : "false"}">
        <span>${esc(item.label)}</span>
        <em>${esc(item.eyebrow)}</em>
      </a>
    `).join("");

    const aside = document.createElement("aside");
    aside.className = "radar-side";
    aside.setAttribute("aria-label", "Radar channels");
    aside.innerHTML = `
      <div class="radar-side-brand">
        <span class="radar-side-mark">YR</span>
        <div>
          <strong>Yuanli Radar</strong>
          <em>External intelligence to action</em>
        </div>
      </div>
      <nav class="radar-side-nav">${nav}</nav>
      <div class="radar-side-decision">
        <span>${esc(active.pulseLabel)}</span>
        <strong id="radarSideUpdated">Loading pulse</strong>
      </div>
      <div class="radar-side-pulse" id="radarSidePulse">
        ${metric("Status", "Loading", "", "gold")}
      </div>
      <div class="radar-side-links">
        <a href="https://github.com/moonstachain/ai-news-radar" target="_blank" rel="noopener noreferrer">GitHub Source</a>
        <a href="https://os-zk.84000.art/ai-news-radar/${channel === "ai-business" ? "business.html" : "index.html"}" target="_blank" rel="noopener noreferrer">Live Portal</a>
      </div>
    `;

    const mobile = document.createElement("nav");
    mobile.className = "radar-mobile-switch";
    mobile.setAttribute("aria-label", "Radar channels");
    mobile.innerHTML = nav;

    document.body.prepend(aside);
    document.body.prepend(mobile);
  }

  function init() {
    buildShell();
    const loader = channel === "ai-business" ? loadBusinessPulse : loadNewsPulse;
    loader().catch((error) => {
      renderDecision(channels[channel]?.decision, `Pulse failed: ${error.message}`);
      renderPulse([{ label: "Data Pulse", value: "Gap", meta: error.message, tone: "warn" }]);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
