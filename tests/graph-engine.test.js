import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeGraph,
  graphFromMask,
  searchCounterexample,
  scenarios,
  formatClaim,
  applyRepair,
  buildCertificate,
  encodeExperiment,
  decodeExperiment,
  normalizeConfig,
  suggestRepairs,
} from "../src/graph-engine.js";

test("detects the four-cycle as connected, bipartite, and triangle-free", () => {
  // Edge order for n=4: 01, 02, 03, 12, 13, 23. Select 01, 03, 12, 23.
  const cycle = graphFromMask(4, (1 << 0) | (1 << 2) | (1 << 3) | (1 << 5));
  const metrics = analyzeGraph(cycle);
  assert.equal(metrics.connected, true);
  assert.equal(metrics.bipartite, true);
  assert.equal(metrics.triangles, 0);
  assert.equal(metrics.isCycle, true);
  assert.deepEqual(metrics.degrees, [2, 2, 2, 2]);
});

test("finds a smallest counterexample to the minimum-degree triangle claim", () => {
  const result = searchCounterexample(scenarios.triangle);
  assert.equal(result.found, true);
  assert.equal(result.graph.n, 4);
  assert.equal(result.metrics.minDegree >= 2, true);
  assert.equal(result.metrics.triangles, 0);
});

test("finds a four-vertex counterexample to the perfect-matching claim", () => {
  const result = searchCounterexample(scenarios["perfect-matching"]);
  assert.equal(result.found, true);
  assert.equal(result.graph.n, 4);
  assert.equal(result.metrics.perfectMatching, false);
});

test("formats a readable, bounded-search claim", () => {
  assert.match(formatClaim(scenarios.triangle), /minimum degree at least 2/);
  assert.match(formatClaim(scenarios.triangle), /contain a triangle/);
  assert.match(formatClaim(scenarios.triangle), /at least 3 vertices/);
});

test("round-trips a normalized experiment through a shareable payload", () => {
  const config = structuredClone(scenarios.triangle);
  config.name = "A shared Δ experiment";
  assert.deepEqual(decodeExperiment(encodeExperiment(config)), config);
  assert.deepEqual(normalizeConfig({ name: "Unsafe", assumptions: { minDegree: 99 }, maxVertices: 99 }), {
    ...scenarios.triangle,
    name: "Unsafe",
  });
});

test("applies a repair without mutating the original conjecture", () => {
  const original = structuredClone(scenarios.triangle);
  const repaired = applyRepair(original, "edge-surplus-1");
  assert.equal(original.assumptions.edgeSurplus, null);
  assert.equal(repaired.assumptions.edgeSurplus, 1);
  assert.match(formatClaim(repaired), /one more edge than vertices/);
});

test("builds a deterministic counterexample certificate", () => {
  const result = searchCounterexample(scenarios.triangle);
  const first = buildCertificate(scenarios.triangle, result);
  const second = buildCertificate(scenarios.triangle, result);
  assert.deepEqual(first, second);
  assert.match(first.certificate_id, /^fw-[0-9a-f]{8}$/);
  assert.equal(first.witness.vertices, 4);
  assert.equal(first.search.candidates_tested, 39);
  assert.deepEqual(first.search.requested_range, [3, 6]);
  assert.deepEqual(first.search.searched_prefix.fully_checked_vertex_counts, [3]);
  assert.deepEqual(first.search.searched_prefix.first_counterexample_at, { vertices: 4, edge_mask: result.graph.mask });
  assert.equal("vertex_range" in first.search, false);
});

test("only suggests repairs that exclude the current witness", () => {
  const result = searchCounterexample(scenarios.triangle);
  const repairIds = suggestRepairs(scenarios.triangle, result).map((repair) => repair.id);
  assert.deepEqual(repairIds, ["min-degree-3", "non-bipartite", "edge-surplus-1"]);
  assert.equal(result.metrics.allEven, true);
  assert.equal(repairIds.includes("all-even"), false);
});
