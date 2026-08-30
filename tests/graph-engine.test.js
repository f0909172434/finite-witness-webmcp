import test from "node:test";
import assert from "node:assert/strict";
import { analyzeGraph, graphFromMask, searchCounterexample, scenarios, formatClaim } from "../src/graph-engine.js";

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
});
