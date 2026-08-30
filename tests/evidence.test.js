import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeEvidenceRecords } from "../src/evidence.js";

const valid = {
  name: "Triangle witness",
  claim: "A bounded claim",
  graph: { n: 4, mask: 45, edges: [[0, 1], [1, 2], [2, 3], [0, 3]] },
  metrics: { edges: 4, degrees: [2, 2, 2, 2] },
  tested: 39,
};

test("drops structurally damaged local evidence without rejecting legacy records", () => {
  assert.deepEqual(sanitizeEvidenceRecords([{}, { ...valid, metrics: null }, valid]), [valid]);
  assert.deepEqual(sanitizeEvidenceRecords({ witnesses: [valid] }), []);
});
