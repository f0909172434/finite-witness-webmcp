import {
  scenarios,
  formatClaim,
  explainWitness,
  searchCounterexample,
  suggestRepairs,
  applyRepair,
  buildCertificate,
  encodeExperiment,
  decodeExperiment,
  normalizeConfig,
} from "./graph-engine.js";
import { registerWebMCP } from "./webmcp.js";
import { sanitizeEvidenceRecords } from "./evidence.js";

const $ = (selector) => document.querySelector(selector);
const dom = {
  scenario: $("#scenario-select"), name: $("#claim-name"), connected: $("#assume-connected"), minDegree: $("#assume-min-degree"),
  bipartite: $("#assume-bipartite"), triangleFree: $("#assume-triangle-free"), allEven: $("#assume-all-even"), evenOrder: $("#assume-even-order"),
  edgeSurplus: $("#assume-edge-surplus"), maxDiameter: $("#assume-max-diameter"), conclusion: $("#conclusion-select"), maxVertices: $("#max-vertices"),
  maxVerticesValue: $("#max-vertices-value"), run: $("#run-search"), searchState: $("#search-state"), graphsTested: $("#graphs-tested"),
  empty: $("#empty-state"), searching: $("#searching-state"), witness: $("#witness-state"), noWitness: $("#no-witness-state"),
  witnessTitle: $("#witness-title"), witnessExplanation: $("#witness-explanation"), metricGrid: $("#metric-grid"), graphEdges: $("#graph-edges"), graphNodes: $("#graph-nodes"),
  save: $("#save-witness"), suggest: $("#suggest-repairs"), repairPanel: $("#repair-panel"), repairList: $("#repair-list"), closeRepairs: $("#close-repairs"),
  savedList: $("#saved-list"), activity: $("#activity-log"), toast: $("#toast"), protocol: $("#webmcp-status"), copyPrompt: $("#copy-prompt"), theme: $("#theme-toggle"),
  copyExperiment: $("#copy-experiment-link"), reset: $("#reset-workspace"), copyCertificate: $("#copy-certificate"), certificateId: $("#certificate-id"), exportEvidence: $("#export-evidence"),
  liveClaim: $("#live-claim"), rigState: $("#rig-state"), rigBound: $("#rig-bound"), iteration: $("#iteration-number"),
  advanced: $("#advanced-premises"), resultPanel: $(".result-panel"), quickRun: $("#quick-run-search"),
};

let currentResult = null;
let currentConfig = structuredClone(scenarios.triangle);
let searchPromise = null;
let currentCertificate = null;
let iteration = 0;
let repairReturnFocus = null;

function readSavedWitnesses() {
  try {
    const parsed = JSON.parse(localStorage.getItem("finite-witness-evidence") || "[]");
    const sanitized = sanitizeEvidenceRecords(parsed);
    if (!Array.isArray(parsed) || sanitized.length !== parsed.length) localStorage.setItem("finite-witness-evidence", JSON.stringify(sanitized));
    return sanitized;
  } catch {
    localStorage.removeItem("finite-witness-evidence");
    return [];
  }
}

let savedWitnesses = readSavedWitnesses();

const configControls = [
  dom.scenario, dom.name, dom.connected, dom.minDegree, dom.bipartite, dom.triangleFree, dom.allEven,
  dom.evenOrder, dom.edgeSurplus, dom.maxDiameter, dom.conclusion, dom.maxVertices,
];

function readConfig() {
  return {
    name: dom.name.value.trim() || "Untitled conjecture",
    assumptions: {
      connected: dom.connected.checked,
      minDegree: dom.minDegree.value === "none" ? null : Number(dom.minDegree.value),
      bipartite: dom.bipartite.value,
      triangleFree: dom.triangleFree.checked,
      allEven: dom.allEven.checked,
      evenOrder: dom.evenOrder.checked,
      edgeSurplus: dom.edgeSurplus.value === "none" ? null : Number(dom.edgeSurplus.value),
      maxDiameter: dom.maxDiameter.value === "none" ? null : Number(dom.maxDiameter.value),
    },
    conclusion: dom.conclusion.value,
    maxVertices: Number(dom.maxVertices.value),
  };
}

function scenarioKeyForConfig(config) {
  const normalized = JSON.stringify(normalizeConfig(config));
  return Object.keys(scenarios).find((key) => JSON.stringify(normalizeConfig(scenarios[key])) === normalized) || "custom";
}

function updateClaimRig(config) {
  const normalized = normalizeConfig(config);
  const assumptions = normalized.assumptions;
  const activeAssumptions = [
    assumptions.connected,
    assumptions.minDegree !== null,
    assumptions.bipartite !== "any",
    assumptions.triangleFree,
    assumptions.allEven,
    assumptions.evenOrder,
    assumptions.edgeSurplus !== null,
    assumptions.maxDiameter !== null,
  ].filter(Boolean).length;
  document.body.style.setProperty("--tension", `${Math.min(86, 30 + activeAssumptions * 7)}%`);
  dom.liveClaim.textContent = formatClaim(normalized);
  dom.rigBound.textContent = `3 ≤ |V| ≤ ${normalized.maxVertices}`;
}

function revealResultOnSmallScreen() {
  if (!window.matchMedia("(max-width: 860px)").matches) return;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  window.requestAnimationFrame(() => dom.resultPanel.scrollIntoView({ behavior, block: "start" }));
}

function setExperience(state) {
  const labels = {
    rest: "Untested",
    armed: "Claim revised",
    searching: "Under pressure",
    broken: "Counterexample",
    bounded: "Bounded survival",
    repairing: "Repair loop",
  };
  document.body.dataset.experience = state;
  dom.rigState.textContent = labels[state] || labels.rest;
}

function writeConfig(config) {
  dom.scenario.value = scenarioKeyForConfig(config);
  dom.name.value = config.name;
  dom.connected.checked = Boolean(config.assumptions.connected);
  dom.minDegree.value = config.assumptions.minDegree === null ? "none" : String(config.assumptions.minDegree);
  dom.bipartite.value = config.assumptions.bipartite;
  dom.triangleFree.checked = Boolean(config.assumptions.triangleFree);
  dom.allEven.checked = Boolean(config.assumptions.allEven);
  dom.evenOrder.checked = Boolean(config.assumptions.evenOrder);
  dom.edgeSurplus.value = config.assumptions.edgeSurplus === null ? "none" : String(config.assumptions.edgeSurplus);
  dom.maxDiameter.value = config.assumptions.maxDiameter === null ? "none" : String(config.assumptions.maxDiameter);
  dom.advanced.open = Boolean(config.assumptions.triangleFree || config.assumptions.allEven || config.assumptions.evenOrder
    || config.assumptions.edgeSurplus !== null || config.assumptions.maxDiameter !== null);
  dom.conclusion.value = config.conclusion;
  dom.maxVertices.value = String(config.maxVertices);
  dom.maxVerticesValue.textContent = `${config.maxVertices} vertices`;
  currentConfig = structuredClone(config);
  updateClaimRig(config);
}

function setView(view) {
  dom.empty.hidden = view !== "empty";
  dom.searching.hidden = view !== "searching";
  dom.witness.hidden = view !== "witness";
  dom.noWitness.hidden = view !== "no-witness";
  if (view !== "witness" && !dom.repairPanel.hidden) closeRepairPanel({ restoreFocus: false, nextExperience: null });
  const experience = { empty: "armed", searching: "searching", witness: "broken", "no-witness": "bounded" }[view];
  if (experience) setExperience(experience);
}

function resetSearchMeta() {
  dom.searchState.textContent = "Ready";
  dom.searchState.dataset.state = "ready";
  dom.graphsTested.textContent = "0 graphs tested";
  dom.certificateId.textContent = "Generated after search";
}

function addActivity(message, source = "human") {
  const item = document.createElement("li");
  const time = document.createElement("time");
  const text = document.createElement("span");
  time.textContent = source === "agent" ? "Agent" : "Now";
  text.textContent = message;
  item.append(time, text);
  dom.activity.prepend(item);
  while (dom.activity.children.length > 5) dom.activity.lastElementChild.remove();
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("visible");
  window.setTimeout(() => dom.toast.classList.remove("visible"), 2600);
}

function describeResult(result, config = currentConfig) {
  if (!result.found) return { found: false, tested: result.tested, admissible: result.admissible, requested_range: [3, result.maxVertices], complete_range_checked: true };
  return {
    found: true,
    minimality: `First witness after exhaustively checking the declared order from 3 vertices through edge mask ${result.graph.mask} at ${result.graph.n} vertices`,
    graph: { vertices: result.graph.n, edges: result.graph.edges, mask: result.graph.mask },
    metrics: result.metrics,
    tested: result.tested,
    admissible: result.admissible,
    explanation: explainWitness(config, result),
    certificate: buildCertificate(config, result),
  };
}

function experimentUrl(config = readConfig()) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("experiment", encodeExperiment(config));
  url.hash = "workspace";
  return url.toString();
}

function graphLayout(n) {
  const cx = 280; const cy = 190; const radius = n <= 4 ? 132 : 148;
  return Array.from({ length: n }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function renderGraph(result) {
  const points = graphLayout(result.graph.n);
  dom.graphEdges.replaceChildren();
  dom.graphNodes.replaceChildren();
  result.graph.edges.forEach(([a, b]) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", points[a].x); line.setAttribute("y1", points[a].y);
    line.setAttribute("x2", points[b].x); line.setAttribute("y2", points[b].y);
    line.setAttribute("class", "graph-edge");
    dom.graphEdges.append(line);
  });
  points.forEach((point, index) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "graph-node");
    group.style.setProperty("--node-index", index);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", point.x); circle.setAttribute("cy", point.y); circle.setAttribute("r", 24);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", point.x); label.setAttribute("y", point.y + 5); label.textContent = String.fromCharCode(65 + index);
    group.append(circle, label); dom.graphNodes.append(group);
  });
}

function renderResult(result, config = currentConfig) {
  dom.graphsTested.textContent = `${result.tested.toLocaleString()} graphs tested`;
  if (!result.found) {
    currentCertificate = null;
    dom.certificateId.textContent = "Generated after search";
    dom.searchState.textContent = "Survived"; dom.searchState.dataset.state = "survived";
    $("#no-witness-title").textContent = `No witness through ${result.maxVertices} vertices.`;
    setView("no-witness");
    return;
  }
  dom.searchState.textContent = "Witness found"; dom.searchState.dataset.state = "found";
  dom.witnessTitle.textContent = `${result.metrics.vertices} vertices are enough.`;
  dom.witnessExplanation.textContent = explainWitness(config, result);
  currentCertificate = buildCertificate(config, result);
  dom.certificateId.textContent = currentCertificate.certificate_id;
  const metrics = [
    ["Vertices", result.metrics.vertices], ["Edges", result.metrics.edges], ["Degree sequence", result.metrics.degrees.join(" · ")],
    ["Triangles", result.metrics.triangles], ["Diameter", result.metrics.diameter ?? "∞"], ["Bipartite", result.metrics.bipartite ? "Yes" : "No"],
  ];
  dom.metricGrid.replaceChildren(...metrics.map(([label, value]) => {
    const wrapper = document.createElement("div"); const dt = document.createElement("dt"); const dd = document.createElement("dd");
    dt.textContent = label; dd.textContent = String(value); wrapper.append(dt, dd); return wrapper;
  }));
  renderGraph(result); setView("witness");
}

function runInWorker(config) {
  if (!("Worker" in window)) return Promise.resolve(searchCounterexample(config));
  return new Promise((resolve, reject) => {
    const worker = new Worker("src/search-worker.js", { type: "module" });
    worker.addEventListener("message", ({ data }) => { worker.terminate(); data.ok ? resolve(data.result) : reject(new Error(data.error)); });
    worker.addEventListener("error", (event) => { worker.terminate(); reject(event.error || new Error("Search worker failed")); });
    worker.postMessage({ config });
  });
}

async function performSearch(source = "human") {
  if (searchPromise) return searchPromise;
  const searchConfig = normalizeConfig(readConfig());
  currentConfig = structuredClone(searchConfig);
  iteration += 1;
  dom.iteration.textContent = String(iteration).padStart(2, "0");
  updateClaimRig(searchConfig);
  setView("searching"); dom.searchState.textContent = "Searching"; dom.searchState.dataset.state = "searching"; dom.run.disabled = true; dom.quickRun.disabled = true;
  revealResultOnSmallScreen();
  configControls.forEach((control) => { control.disabled = true; });
  addActivity(`Search started: ${formatClaim(searchConfig)}`, source);
  const started = performance.now();
  searchPromise = runInWorker(searchConfig).then((result) => {
    currentResult = result; renderResult(result, searchConfig);
    const elapsedMs = Math.round(performance.now() - started);
    addActivity(result.found ? `Minimal witness found after ${result.tested.toLocaleString()} candidates.` : `No witness found after ${result.tested.toLocaleString()} candidates.`, source);
    return { ...describeResult(result, searchConfig), elapsed_ms: elapsedMs, claim: formatClaim(searchConfig), experiment_url: experimentUrl(searchConfig) };
  }).catch((error) => {
    currentResult = null; currentCertificate = null; setView("empty");
    dom.searchState.textContent = "Search failed"; dom.searchState.dataset.state = "ready";
    addActivity(`Search failed: ${error.message}`, source);
    throw error;
  }).finally(() => {
    dom.run.disabled = false;
    dom.quickRun.disabled = false;
    configControls.forEach((control) => { control.disabled = false; });
    searchPromise = null;
  });
  return searchPromise;
}

function loadScenario(key, source = "human") {
  if (searchPromise) throw new Error("Wait for the current search to finish before loading a scenario.");
  if (!scenarios[key]) throw new Error(`Unknown scenario: ${key}`);
  dom.scenario.value = key; writeConfig(structuredClone(scenarios[key])); currentResult = null; currentCertificate = null; setView("empty");
  resetSearchMeta();
  addActivity(`Loaded scenario “${scenarios[key].name}”.`, source);
  return { loaded: key, config: getState().config, claim: formatClaim(currentConfig) };
}

function configure(input, source = "agent") {
  if (searchPromise) throw new Error("Wait for the current search to finish before changing the conjecture.");
  const config = readConfig();
  if (input.name !== undefined) config.name = input.name;
  const map = { connected: "connected", min_degree: "minDegree", bipartite: "bipartite", triangle_free: "triangleFree", all_even_degrees: "allEven", even_order: "evenOrder", edge_surplus: "edgeSurplus", max_diameter: "maxDiameter" };
  Object.entries(map).forEach(([external, internal]) => { if (input[external] !== undefined) config.assumptions[internal] = input[external]; });
  if (input.conclusion !== undefined) config.conclusion = input.conclusion;
  if (input.max_vertices !== undefined) config.maxVertices = input.max_vertices;
  const normalized = normalizeConfig(config);
  writeConfig(normalized); currentResult = null; currentCertificate = null; setView("empty");
  resetSearchMeta();
  addActivity(`Conjecture configured: ${formatClaim(config)}`, source);
  return { configured: true, config: normalized, claim: formatClaim(normalized), experiment_url: experimentUrl(normalized) };
}

function invalidateResult() {
  if (searchPromise) return;
  currentConfig = normalizeConfig(readConfig());
  updateClaimRig(currentConfig);
  dom.scenario.value = scenarioKeyForConfig(currentConfig);
  if (!currentResult) {
    setView("empty");
    return;
  }
  currentResult = null;
  currentCertificate = null;
  setView("empty");
  resetSearchMeta();
  addActivity("Conjecture changed. The previous witness was cleared until the new claim is tested.");
}

function getState() {
  const config = readConfig();
  return {
    app: "Finite Witness",
    config,
    claim: formatClaim(config),
    latest_result: currentResult ? describeResult(currentResult) : null,
    saved_witness_count: savedWitnesses.length,
    experiment_url: experimentUrl(config),
    search_semantics: "Ordered prefix search over labeled finite simple graphs with at least 3 vertices; stops at the first counterexample.",
    caution: "No witness within a finite bound is evidence, not a proof.",
  };
}

function persistSaved() {
  localStorage.setItem("finite-witness-evidence", JSON.stringify(savedWitnesses));
  renderSaved();
}

function saveWitness(note = "", source = "human") {
  if (!currentResult?.found) throw new Error("No counterexample is currently visible. Run a search first.");
  const entry = {
    id: `witness-${Date.now()}`,
    name: currentConfig.name,
    claim: formatClaim(currentConfig),
    config: structuredClone(currentConfig),
    graph: { n: currentResult.graph.n, mask: currentResult.graph.mask, edges: currentResult.graph.edges },
    metrics: currentResult.metrics,
    tested: currentResult.tested,
    certificate: buildCertificate(currentConfig, currentResult),
    note,
    savedAt: new Date().toISOString(),
  };
  savedWitnesses.unshift(entry); savedWitnesses = savedWitnesses.slice(0, 24); persistSaved();
  addActivity(`Saved ${entry.graph.n}-vertex witness to the evidence shelf.`, source); showToast("Witness saved to this browser");
  return { saved: true, entry };
}

function getRepairs(source = "human") {
  if (!currentResult?.found) throw new Error("No counterexample is currently visible. Run a search first.");
  const repairs = suggestRepairs(currentConfig, currentResult);
  if (source !== "agent") addActivity(`Generated ${repairs.length} candidate repairs for the current witness.`, source);
  return { claim: formatClaim(currentConfig), witness_metrics: currentResult.metrics, repairs, caution: "Each repair only excludes this witness; rerun the search and do not treat it as a proof." };
}

async function applyRepairAndMaybeSearch(repairId, source = "human", runSearch = true) {
  if (searchPromise) throw new Error("Wait for the current search to finish before applying a repair.");
  if (!currentResult?.found) throw new Error("No counterexample is currently visible. Run a search first.");
  const availableRepair = suggestRepairs(currentConfig, currentResult).find((repair) => repair.id === repairId);
  if (!availableRepair) throw new Error(`Repair “${repairId}” does not exclude the current witness. Request fresh suggestions first.`);
  const nextConfig = applyRepair(currentConfig, repairId);
  writeConfig(nextConfig);
  currentResult = null;
  currentCertificate = null;
  resetSearchMeta();
  setView("empty");
  addActivity(`Applied repair: ${formatClaim(nextConfig)}`, source);
  const response = { applied: true, repair_id: repairId, config: nextConfig, claim: formatClaim(nextConfig), experiment_url: experimentUrl(nextConfig) };
  if (!runSearch) return response;
  return { ...response, result: await performSearch(source) };
}

function getCertificate() {
  if (!currentResult?.found || !currentCertificate) throw new Error("No counterexample certificate is available. Run a search first.");
  return currentCertificate;
}

function setRepairBackgroundInert(value) {
  const selectors = [
    ".site-header", ".rig-header", ".rig-pressure", ".builder-panel", ".result-toolbar",
    "#empty-state", "#searching-state", "#witness-state", "#no-witness-state",
    ".agent-relay", "#evidence", ".activity-section", "footer",
  ];
  selectors.forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) element.inert = value;
  });
}

function closeRepairPanel({ restoreFocus = true, nextExperience = "broken" } = {}) {
  dom.repairPanel.hidden = true;
  setRepairBackgroundInert(false);
  if (nextExperience) setExperience(nextExperience);
  if (restoreFocus) {
    const target = repairReturnFocus?.isConnected ? repairReturnFocus : dom.suggest;
    window.requestAnimationFrame(() => target.focus());
  }
}

function handleRepairKeydown(event) {
  if (dom.repairPanel.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeRepairPanel();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...dom.repairPanel.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
    .filter((element) => !element.disabled && element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function renderRepairs() {
  const { repairs } = getRepairs("human");
  dom.repairList.replaceChildren(...repairs.map((repair) => {
    const article = document.createElement("article"); const title = document.createElement("h4"); const body = document.createElement("p"); const next = document.createElement("small"); const apply = document.createElement("button");
    title.textContent = repair.label; body.textContent = repair.rationale; next.textContent = repair.next_claim; apply.type = "button"; apply.className = "repair-apply"; apply.textContent = "Apply & retest";
    apply.addEventListener("click", () => {
      closeRepairPanel({ restoreFocus: false, nextExperience: null });
      applyRepairAndMaybeSearch(repair.id, "human", true).catch((error) => showToast(error.message));
    });
    article.append(title, body, next, apply); return article;
  }));
  repairReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : dom.suggest;
  dom.repairPanel.hidden = false;
  setRepairBackgroundInert(true);
  setExperience("repairing");
  window.requestAnimationFrame(() => dom.closeRepairs.focus());
}

function renderSaved() {
  if (!savedWitnesses.length) {
    dom.savedList.innerHTML = '<div class="saved-empty"><span class="empty-file" aria-hidden="true">∄</span><div><p>No witness filed yet.</p><span>Find one above, then preserve its certificate here.</span></div></div>';
    return;
  }
  dom.savedList.replaceChildren(...savedWitnesses.map((entry, index) => {
    const article = document.createElement("article"); article.className = "saved-card";
    const count = document.createElement("span"); count.className = "saved-count"; count.textContent = String(index + 1).padStart(2, "0");
    const content = document.createElement("div"); const title = document.createElement("h3"); const claim = document.createElement("p"); const meta = document.createElement("span"); const certificate = document.createElement("code");
    title.textContent = entry.name; claim.textContent = entry.claim; meta.textContent = `${entry.graph.n} vertices · ${entry.metrics.edges} edges · ${entry.tested.toLocaleString()} candidates`;
    certificate.textContent = entry.certificate?.certificate_id || "legacy evidence";
    content.append(title, claim, meta, certificate); article.append(count, content); return article;
  }));
}

function onProtocolReady(tools) {
  dom.protocol.dataset.active = "true";
  dom.protocol.querySelector("span:last-child").textContent = `${tools.length} WebMCP tools live`;
  addActivity(`${tools.length} WebMCP tools registered in the top-level page.`, "agent");
}

dom.run.addEventListener("click", () => performSearch("human").catch((error) => { setView("empty"); showToast(error.message); }));
dom.quickRun.addEventListener("click", () => performSearch("human").catch((error) => { setView("empty"); showToast(error.message); }));
dom.scenario.addEventListener("change", () => loadScenario(dom.scenario.value));
dom.maxVertices.addEventListener("input", () => { dom.maxVerticesValue.textContent = `${dom.maxVertices.value} vertices`; });
configControls.forEach((control) => control.addEventListener("change", invalidateResult));
dom.name.addEventListener("input", invalidateResult);
dom.maxVertices.addEventListener("input", invalidateResult);
dom.save.addEventListener("click", () => saveWitness());
dom.suggest.addEventListener("click", renderRepairs);
dom.closeRepairs.addEventListener("click", () => closeRepairPanel());
dom.repairPanel.addEventListener("keydown", handleRepairKeydown);
dom.copyExperiment.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(experimentUrl());
    showToast("Reproducible experiment link copied");
  } catch { showToast("Clipboard access is unavailable in this browser"); }
});
dom.reset.addEventListener("click", () => {
  loadScenario("triangle");
  const url = new URL(window.location.href); url.searchParams.delete("experiment"); history.replaceState(null, "", `${url.pathname}${url.hash || "#workspace"}`);
  showToast("Workspace reset");
});
dom.copyCertificate.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(getCertificate(), null, 2));
    showToast("Counterexample certificate copied");
  } catch (error) { showToast(error.message); }
});
dom.exportEvidence.addEventListener("click", () => {
  const bundle = { schema: "finite-witness/evidence-bundle-v1", exported_at: new Date().toISOString(), witnesses: savedWitnesses };
  const href = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = href; link.download = "finite-witness-evidence.json"; link.click(); URL.revokeObjectURL(href);
  showToast(`${savedWitnesses.length} evidence record${savedWitnesses.length === 1 ? "" : "s"} exported`);
});
dom.copyPrompt.addEventListener("click", async () => {
  const prompt = "Use this page’s WebMCP tools to load the triangle scenario, search for the smallest counterexample, explain exactly why it breaks the claim, save it, inspect the suggested repairs, apply one repair and retest it, then return the counterexample certificate. Do not call surviving a bounded search a proof.";
  try { await navigator.clipboard.writeText(prompt); showToast("Agent prompt copied"); }
  catch { showToast("Clipboard access is unavailable in this browser"); }
});
dom.theme.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  dom.theme.setAttribute("aria-pressed", String(next === "dark"));
  dom.theme.setAttribute("aria-label", next === "dark" ? "Restore light sheet colors" : "Invert sheet colors");
  dom.theme.querySelector(".nav-label").textContent = next === "dark" ? "Restore sheet" : "Invert sheet";
  localStorage.setItem("finite-witness-theme", next);
});

const savedTheme = localStorage.getItem("finite-witness-theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
dom.theme.setAttribute("aria-pressed", String(savedTheme === "dark"));
dom.theme.setAttribute("aria-label", savedTheme === "dark" ? "Restore light sheet colors" : "Invert sheet colors");
dom.theme.querySelector(".nav-label").textContent = savedTheme === "dark" ? "Restore sheet" : "Invert sheet";
const sharedExperiment = new URLSearchParams(window.location.search).get("experiment");
if (sharedExperiment) {
  try {
    currentConfig = decodeExperiment(sharedExperiment);
    addActivity("Loaded a reproducible experiment from the page URL.");
  } catch (error) {
    showToast(`Could not load shared experiment: ${error.message}`);
  }
}
writeConfig(currentConfig); renderSaved();

const workspace = { getState, loadScenario, configure, search: performSearch, saveWitness, getRepairs, applyRepair: applyRepairAndMaybeSearch, getCertificate, onProtocolReady };
registerWebMCP(workspace).then((registered) => {
  if (!registered) dom.protocol.querySelector("span:last-child").textContent = "WebMCP-ready browser needed";
}).catch((error) => {
  dom.protocol.querySelector("span:last-child").textContent = "WebMCP registration failed";
  console.error(error);
});
