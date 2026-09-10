import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scenarios, normalizeConfig, searchCounterexample, buildCertificate, graphFromMask, analyzeGraph } from '../src/graph-engine.js';

function check(certificate, replay = true) {
  const dir = mkdtempSync(join(tmpdir(), 'finite-check-'));
  try {
    const file = join(dir, 'certificate.json');
    writeFileSync(file, JSON.stringify(certificate));
    const run = spawnSync(process.env.PYTHON || 'python3', ['tools/verify_certificate.py', file, ...(replay ? ['--replay-search'] : [])], { encoding: 'utf8', timeout: 20000 });
    assert.ifError(run.error);
    assert.ok(run.stdout, run.stderr);
    return { code: run.status, ...JSON.parse(run.stdout) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const make = (value = scenarios.triangle) => {
  const config = normalizeConfig(value); return buildCertificate(config, searchCounterexample(config));
};

for (const [name, config] of Object.entries(scenarios)) {
  test(`independent Python checker replays ${name}`, () => {
    const result = check(make(config));
    assert.equal(result.code, 0, result.error);
    assert.equal(result.first_in_declared_order, 'VERIFIED');
  });
}
test('fast witness validity explicitly leaves firstness unchecked', () => {
  const result = check(make(), false);
  assert.equal(result.witness_valid, true); assert.equal(result.first_in_declared_order, 'NOT_CHECKED');
});
for (const [name, mutate] of [
  ['edges', c => { c.witness.edges.pop(); }],
  ['metrics', c => { c.witness.metrics.triangles++; }],
  ['claim', c => { c.claim = 'All graphs contain triangles.'; }],
  ['bound', c => { c.config.maxVertices = 7; }],
  ['boolean-as-degree', c => { c.config.assumptions.minDegree = true; }],
  ['boolean metric', c => { c.witness.metrics.triangles = false; }],
  ['boolean nested degree', c => { c.witness.metrics.degrees[0] = true; }],
  ['boolean stopping point', c => { c.search.searched_prefix.first_counterexample_at.vertices = true; }],
  ['prefix length', c => { c.search.candidates_tested++; }],
  ['admissible count', c => { c.search.admissible_graphs_in_searched_prefix++; }],
  ['conclusion', c => { c.config.conclusion = 'unknown'; }],
]) {
  test(`rejects altered ${name}`, () => { const c = make(); mutate(c); assert.equal(check(c).code, 1); });
}
test('valid later witness passes witness-only checks but fails firstness replay', () => {
  const config = normalizeConfig(scenarios.triangle);
  // Another labeled C4, later than the first mask 30.
  const graph = graphFromMask(4, 45), metrics = analyzeGraph(graph);
  const c = buildCertificate(config, { found: true, graph, metrics, tested: 54, admissible: 10, maxVertices: 6 });
  assert.equal(check(c, false).code, 0);
  const result = check(c, true);
  assert.equal(result.code, 1); assert.match(result.error, /earlier counterexample/);
});
