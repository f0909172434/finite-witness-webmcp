import {
  scenarios,
  formatClaim,
  explainWitness,
  searchCounterexample,
  suggestRepairs,
} from "./graph-engine.js";
import { registerWebMCP } from "./webmcp.js";

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
};

let currentResult = null;
let currentConfig = structuredClone(scenarios.triangle);
let searchPromise = null;
let savedWitnesses = JSON.parse(localStorage.getItem("finite-witness-evidence") || "[]");

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

function writeConfig(config) {
  dom.name.value = config.name;
  dom.connected.checked = Boolean(config.assumptions.connected);
  dom.minDegree.value = config.assumptions.minDegree === null ? "none" : String(config.assumptions.minDegree);
  dom.bipartite.value = config.assumptions.bipartite;
  dom.triangleFree.checked = Boolean(config.assumptions.triangleFree);
  dom.allEven.checked = Boolean(config.assumptions.allEven);
  dom.evenOrder.checked = Boolean(config.assumptions.evenOrder);
  dom.edgeSurplus.value = config.assumptions.edgeSurplus === null ? "none" : String(config.assumptions.edgeSurplus);
  dom.maxDiameter.value = config.assumptions.maxDiameter === null ? "none" : String(config.assumptions.maxDiameter);
  dom.conclusion.value = config.conclusion;
  dom.maxVertices.value = String(config.maxVertices);
  dom.maxVerticesValue.textContent = `${config.maxVertices} vertices`;
  currentConfig = structuredClone(config);
}

function setView(view) {
  dom.empty.hidden = view !== "empty";
  dom.searching.hidden = view !== "searching";
  dom.witness.hidden = view !== "witness";
  dom.noWitness.hidden = view !== "no-witness";
  if (view !== "witness") dom.repairPanel.hidden = true;
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

function describeResult(result) {
  if (!result.found) return { found: false, tested: result.tested, admissible: result.admissible, maxVertices: result.maxVertices };
  return {
    found: true,
    minimality: `First witness in exhaustive search from 3 through ${result.graph.n} vertices`,
    graph: { vertices: result.graph.n, edges: result.graph.edges, mask: result.graph.mask },
    metrics: result.metrics,
    tested: result.tested,
    admissible: result.admissible,
    explanation: explainWitness(currentConfig, result),
  };
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

function renderResult(result) {
  dom.graphsTested.textContent = `${result.tested.toLocaleString()} graphs tested`;
  if (!result.found) {
    dom.searchState.textContent = "Survived"; dom.searchState.dataset.state = "survived";
    $("#no-witness-title").textContent = `No witness through ${result.maxVertices} vertices.`;
    setView("no-witness");
    return;
  }
  dom.searchState.textContent = "Witness found"; dom.searchState.dataset.state = "found";
  dom.witnessTitle.textContent = `${result.metrics.vertices} vertices are enough.`;
  dom.witnessExplanation.textContent = explainWitness(currentConfig, result);
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
  currentConfig = readConfig();
  setView("searching"); dom.searchState.textContent = "Searching"; dom.searchState.dataset.state = "searching"; dom.run.disabled = true;
  addActivity(`Search started: ${formatClaim(currentConfig)}`, source);
  const started = performance.now();
  searchPromise = runInWorker(currentConfig).then((result) => {
    currentResult = result; renderResult(result);
    const elapsedMs = Math.round(performance.now() - started);
    addActivity(result.found ? `Minimal witness found after ${result.tested.toLocaleString()} candidates.` : `No witness found after ${result.tested.toLocaleString()} candidates.`, source);
    return { ...describeResult(result), elapsed_ms: elapsedMs, claim: formatClaim(currentConfig) };
  }).finally(() => { dom.run.disabled = false; searchPromise = null; });
  return searchPromise;
}

function loadScenario(key, source = "human") {
  if (!scenarios[key]) throw new Error(`Unknown scenario: ${key}`);
  dom.scenario.value = key; writeConfig(structuredClone(scenarios[key])); currentResult = null; setView("empty");
  dom.searchState.textContent = "Ready"; dom.searchState.dataset.state = "ready"; dom.graphsTested.textContent = "0 graphs tested";
  addActivity(`Loaded scenario “${scenarios[key].name}”.`, source);
  return { loaded: key, config: getState().config, claim: formatClaim(currentConfig) };
}

function configure(input, source = "agent") {
  const config = readConfig();
  if (input.name !== undefined) config.name = input.name;
  const map = { connected: "connected", min_degree: "minDegree", bipartite: "bipartite", triangle_free: "triangleFree", all_even_degrees: "allEven", even_order: "evenOrder", edge_surplus: "edgeSurplus", max_diameter: "maxDiameter" };
  Object.entries(map).forEach(([external, internal]) => { if (input[external] !== undefined) config.assumptions[internal] = input[external]; });
  if (input.conclusion !== undefined) config.conclusion = input.conclusion;
  if (input.max_vertices !== undefined) config.maxVertices = input.max_vertices;
  writeConfig(config); currentResult = null; setView("empty");
  addActivity(`Conjecture configured: ${formatClaim(config)}`, source);
  return { configured: true, config, claim: formatClaim(config) };
}

function getState() {
  const config = readConfig();
  return {
    app: "Finite Witness",
    config,
    claim: formatClaim(config),
    latest_result: currentResult ? describeResult(currentResult) : null,
    saved_witness_count: savedWitnesses.length,
    search_semantics: "Exhaustive over labeled finite simple graphs, ordered by vertex count then edge-mask order.",
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
    note,
    savedAt: new Date().toISOString(),
  };
  savedWitnesses.unshift(entry); savedWitnesses = savedWitnesses.slice(0, 8); persistSaved();
  addActivity(`Saved ${entry.graph.n}-vertex witness to the evidence shelf.`, source); showToast("Witness saved to this browser");
  return { saved: true, entry };
}

function getRepairs(source = "human") {
  if (!currentResult?.found) throw new Error("No counterexample is currently visible. Run a search first.");
  const repairs = suggestRepairs(currentConfig, currentResult);
  addActivity(`Generated ${repairs.length} candidate repairs for the current witness.`, source);
  return { claim: formatClaim(currentConfig), witness_metrics: currentResult.metrics, repairs, caution: "Each repair only excludes this witness; rerun the search and do not treat it as a proof." };
}

function renderRepairs() {
  const { repairs } = getRepairs("human");
  dom.repairList.replaceChildren(...repairs.map((repair) => {
    const article = document.createElement("article"); const title = document.createElement("h4"); const body = document.createElement("p");
    title.textContent = repair.label; body.textContent = repair.rationale; article.append(title, body); return article;
  }));
  dom.repairPanel.hidden = false;
}

function renderSaved() {
  if (!savedWitnesses.length) {
    dom.savedList.innerHTML = '<div class="saved-empty"><p>No witnesses saved yet.</p><span>Find one above, then pin it here for comparison.</span></div>';
    return;
  }
  dom.savedList.replaceChildren(...savedWitnesses.map((entry, index) => {
    const article = document.createElement("article"); article.className = "saved-card";
    const count = document.createElement("span"); count.className = "saved-count"; count.textContent = String(index + 1).padStart(2, "0");
    const content = document.createElement("div"); const title = document.createElement("h3"); const claim = document.createElement("p"); const meta = document.createElement("span");
    title.textContent = entry.name; claim.textContent = entry.claim; meta.textContent = `${entry.graph.n} vertices · ${entry.metrics.edges} edges · ${entry.tested.toLocaleString()} candidates`;
    content.append(title, claim, meta); article.append(count, content); return article;
  }));
}

function onProtocolReady(tools) {
  dom.protocol.dataset.active = "true";
  dom.protocol.querySelector("span:last-child").textContent = `${tools.length} WebMCP tools live`;
  addActivity(`${tools.length} WebMCP tools registered in the top-level page.`, "agent");
}

dom.run.addEventListener("click", () => performSearch("human").catch((error) => { setView("empty"); showToast(error.message); }));
dom.scenario.addEventListener("change", () => loadScenario(dom.scenario.value));
dom.maxVertices.addEventListener("input", () => { dom.maxVerticesValue.textContent = `${dom.maxVertices.value} vertices`; });
dom.save.addEventListener("click", () => saveWitness());
dom.suggest.addEventListener("click", renderRepairs);
dom.closeRepairs.addEventListener("click", () => { dom.repairPanel.hidden = true; });
dom.copyPrompt.addEventListener("click", async () => {
  const prompt = "Use this page’s WebMCP tools to load the triangle scenario, search for the smallest counterexample, explain exactly why it breaks the claim, save the witness, and suggest two repairs. Do not call surviving a bounded search a proof.";
  await navigator.clipboard.writeText(prompt); showToast("Agent prompt copied");
});
dom.theme.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next; localStorage.setItem("finite-witness-theme", next);
});

const savedTheme = localStorage.getItem("finite-witness-theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
writeConfig(currentConfig); renderSaved();

const workspace = { getState, loadScenario, configure, search: performSearch, saveWitness, getRepairs, onProtocolReady };
registerWebMCP(workspace).then((registered) => {
  if (!registered) dom.protocol.querySelector("span:last-child").textContent = "WebMCP-ready browser needed";
}).catch((error) => {
  dom.protocol.querySelector("span:last-child").textContent = "WebMCP registration failed";
  console.error(error);
});
