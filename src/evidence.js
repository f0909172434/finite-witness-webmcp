function isEdgeList(value, vertexCount) {
  return Array.isArray(value) && value.every((edge) => Array.isArray(edge)
    && edge.length === 2
    && edge.every((vertex) => Number.isInteger(vertex) && vertex >= 0 && vertex < vertexCount));
}

export function isEvidenceRecord(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (typeof entry.name !== "string" || typeof entry.claim !== "string") return false;
  if (!entry.graph || !Number.isInteger(entry.graph.n) || entry.graph.n < 1 || entry.graph.n > 6) return false;
  if (!Number.isInteger(entry.graph.mask) || entry.graph.mask < 0 || !isEdgeList(entry.graph.edges, entry.graph.n)) return false;
  if (!entry.metrics || !Number.isInteger(entry.metrics.edges) || !Array.isArray(entry.metrics.degrees)) return false;
  if (!Number.isInteger(entry.tested) || entry.tested < 1) return false;
  return true;
}

export function sanitizeEvidenceRecords(value, limit = 24) {
  if (!Array.isArray(value)) return [];
  return value.filter(isEvidenceRecord).slice(0, limit);
}
