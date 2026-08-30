const conclusionLabels = {
  contains_triangle: "contain a triangle",
  is_cycle: "be exactly one cycle",
  is_bipartite: "be bipartite",
  has_perfect_matching: "have a perfect matching",
  has_even_edge_count: "have an even number of edges",
  diameter_at_most_2: "have diameter at most 2",
};

export const scenarios = {
  triangle: {
    name: "Minimum degree forces a triangle",
    assumptions: { connected: true, minDegree: 2, bipartite: "any", triangleFree: false, allEven: false, evenOrder: false, edgeSurplus: null, maxDiameter: null },
    conclusion: "contains_triangle",
    maxVertices: 6,
  },
  "even-cycle": {
    name: "Even degrees force one cycle",
    assumptions: { connected: true, minDegree: null, bipartite: "any", triangleFree: false, allEven: true, evenOrder: false, edgeSurplus: null, maxDiameter: null },
    conclusion: "is_cycle",
    maxVertices: 6,
  },
  "perfect-matching": {
    name: "Even connected graphs have a perfect matching",
    assumptions: { connected: true, minDegree: 1, bipartite: "any", triangleFree: false, allEven: false, evenOrder: true, edgeSurplus: null, maxDiameter: null },
    conclusion: "has_perfect_matching",
    maxVertices: 6,
  },
  diameter: {
    name: "Dense graphs have short diameter",
    assumptions: { connected: true, minDegree: 2, bipartite: "any", triangleFree: false, allEven: false, evenOrder: false, edgeSurplus: 0, maxDiameter: null },
    conclusion: "diameter_at_most_2",
    maxVertices: 6,
  },
};

export function edgePairs(n) {
  const pairs = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) pairs.push([i, j]);
  }
  return pairs;
}

export function graphFromMask(n, mask) {
  const adjacency = Array.from({ length: n }, () => []);
  const edges = [];
  edgePairs(n).forEach(([a, b], bit) => {
    if ((mask & (1 << bit)) !== 0) {
      edges.push([a, b]);
      adjacency[a].push(b);
      adjacency[b].push(a);
    }
  });
  return { n, mask, edges, adjacency };
}

function isConnected(graph) {
  if (graph.n === 0) return false;
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const current = queue.shift();
    for (const next of graph.adjacency[current]) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size === graph.n;
}

function triangleCount(graph) {
  let count = 0;
  const linked = graph.adjacency.map((neighbors) => new Set(neighbors));
  for (let a = 0; a < graph.n; a += 1) {
    for (let b = a + 1; b < graph.n; b += 1) {
      if (!linked[a].has(b)) continue;
      for (let c = b + 1; c < graph.n; c += 1) {
        if (linked[a].has(c) && linked[b].has(c)) count += 1;
      }
    }
  }
  return count;
}

function isBipartite(graph) {
  const color = Array(graph.n).fill(null);
  for (let start = 0; start < graph.n; start += 1) {
    if (color[start] !== null) continue;
    color[start] = 0;
    const queue = [start];
    while (queue.length) {
      const current = queue.shift();
      for (const next of graph.adjacency[current]) {
        if (color[next] === null) {
          color[next] = 1 - color[current];
          queue.push(next);
        } else if (color[next] === color[current]) {
          return false;
        }
      }
    }
  }
  return true;
}

function graphDiameter(graph, connected) {
  if (!connected) return null;
  let diameter = 0;
  for (let start = 0; start < graph.n; start += 1) {
    const distances = Array(graph.n).fill(-1);
    distances[start] = 0;
    const queue = [start];
    while (queue.length) {
      const current = queue.shift();
      for (const next of graph.adjacency[current]) {
        if (distances[next] === -1) {
          distances[next] = distances[current] + 1;
          queue.push(next);
        }
      }
    }
    diameter = Math.max(diameter, ...distances);
  }
  return diameter;
}

function hasPerfectMatching(graph) {
  if (graph.n % 2 === 1) return false;
  const memo = new Map();
  function match(remaining) {
    if (remaining === 0) return true;
    if (memo.has(remaining)) return memo.get(remaining);
    let first = 0;
    while ((remaining & (1 << first)) === 0) first += 1;
    const withoutFirst = remaining & ~(1 << first);
    for (const neighbor of graph.adjacency[first]) {
      if ((withoutFirst & (1 << neighbor)) !== 0 && match(withoutFirst & ~(1 << neighbor))) {
        memo.set(remaining, true);
        return true;
      }
    }
    memo.set(remaining, false);
    return false;
  }
  return match((1 << graph.n) - 1);
}

export function analyzeGraph(graph) {
  const degrees = graph.adjacency.map((neighbors) => neighbors.length);
  const connected = isConnected(graph);
  const triangles = triangleCount(graph);
  const bipartite = isBipartite(graph);
  const diameter = graphDiameter(graph, connected);
  const edgeCount = graph.edges.length;
  return {
    vertices: graph.n,
    edges: edgeCount,
    degrees,
    minDegree: Math.min(...degrees),
    maxDegree: Math.max(...degrees),
    connected,
    triangles,
    bipartite,
    diameter,
    isCycle: connected && graph.n >= 3 && degrees.every((degree) => degree === 2),
    allEven: degrees.every((degree) => degree % 2 === 0),
    perfectMatching: hasPerfectMatching(graph),
    density: graph.n > 1 ? (2 * edgeCount) / (graph.n * (graph.n - 1)) : 0,
  };
}

export function satisfiesAssumptions(metrics, assumptions) {
  if (assumptions.connected && !metrics.connected) return false;
  if (assumptions.minDegree !== null && metrics.minDegree < assumptions.minDegree) return false;
  if (assumptions.bipartite === "yes" && !metrics.bipartite) return false;
  if (assumptions.bipartite === "no" && metrics.bipartite) return false;
  if (assumptions.triangleFree && metrics.triangles > 0) return false;
  if (assumptions.allEven && !metrics.allEven) return false;
  if (assumptions.evenOrder && metrics.vertices % 2 !== 0) return false;
  if (assumptions.edgeSurplus !== null && metrics.edges < metrics.vertices + assumptions.edgeSurplus) return false;
  if (assumptions.maxDiameter !== null && (metrics.diameter === null || metrics.diameter > assumptions.maxDiameter)) return false;
  return true;
}

export function satisfiesConclusion(metrics, conclusion) {
  switch (conclusion) {
    case "contains_triangle": return metrics.triangles > 0;
    case "is_cycle": return metrics.isCycle;
    case "is_bipartite": return metrics.bipartite;
    case "has_perfect_matching": return metrics.perfectMatching;
    case "has_even_edge_count": return metrics.edges % 2 === 0;
    case "diameter_at_most_2": return metrics.diameter !== null && metrics.diameter <= 2;
    default: throw new Error(`Unknown conclusion: ${conclusion}`);
  }
}

export function searchCounterexample(config) {
  let tested = 0;
  let admissible = 0;
  for (let n = 3; n <= config.maxVertices; n += 1) {
    const possibleEdges = (n * (n - 1)) / 2;
    const graphCount = 2 ** possibleEdges;
    for (let mask = 0; mask < graphCount; mask += 1) {
      tested += 1;
      const graph = graphFromMask(n, mask);
      const metrics = analyzeGraph(graph);
      if (!satisfiesAssumptions(metrics, config.assumptions)) continue;
      admissible += 1;
      if (!satisfiesConclusion(metrics, config.conclusion)) {
        return { found: true, graph, metrics, tested, admissible, maxVertices: config.maxVertices };
      }
    }
  }
  return { found: false, tested, admissible, maxVertices: config.maxVertices };
}

export function formatClaim(config) {
  const parts = [];
  const a = config.assumptions;
  if (a.connected) parts.push("connected");
  if (a.minDegree !== null) parts.push(`minimum degree at least ${a.minDegree}`);
  if (a.bipartite === "yes") parts.push("bipartite");
  if (a.bipartite === "no") parts.push("non-bipartite");
  if (a.triangleFree) parts.push("triangle-free");
  if (a.allEven) parts.push("all degrees even");
  if (a.evenOrder) parts.push("even order");
  if (a.edgeSurplus !== null) parts.push(a.edgeSurplus === 0 ? "at least as many edges as vertices" : "at least one more edge than vertices");
  if (a.maxDiameter !== null) parts.push(`diameter at most ${a.maxDiameter}`);
  const premise = parts.length ? parts.join(", ") : "finite and simple";
  return `Every ${premise} graph must ${conclusionLabels[config.conclusion]}.`;
}

export function explainWitness(config, result) {
  const m = result.metrics;
  const claim = formatClaim(config);
  const failure = {
    contains_triangle: `it has ${m.triangles} triangles`,
    is_cycle: `its degree sequence is [${m.degrees.join(", ")}], so it is not a single cycle`,
    is_bipartite: "it contains an odd cycle and is not bipartite",
    has_perfect_matching: "no set of disjoint edges covers every vertex",
    has_even_edge_count: `it has ${m.edges} edges, an odd number`,
    diameter_at_most_2: `its diameter is ${m.diameter}`,
  }[config.conclusion];
  return `${claim} This ${m.vertices}-vertex graph satisfies every selected assumption, but ${failure}.`;
}

export function suggestRepairs(config, result) {
  if (!result?.found) return [];
  const m = result.metrics;
  const candidates = [];
  if (m.minDegree < 3 && config.assumptions.minDegree !== 3) {
    candidates.push({ id: "min-degree-3", label: "Raise the minimum degree to 3", rationale: `The witness has minimum degree ${m.minDegree}. This excludes it while preserving the graph family.` });
  }
  if (m.bipartite && config.assumptions.bipartite !== "no") {
    candidates.push({ id: "non-bipartite", label: "Require a non-bipartite graph", rationale: "The witness is bipartite, so an odd-cycle requirement removes it." });
  }
  if (m.diameter !== null && m.diameter > 2 && config.assumptions.maxDiameter !== 2) {
    candidates.push({ id: "diameter-2", label: "Cap the diameter at 2", rationale: `The witness has diameter ${m.diameter}. A short-diameter condition removes it.` });
  }
  if (m.edges < m.vertices + 1 && config.assumptions.edgeSurplus !== 1) {
    candidates.push({ id: "edge-surplus-1", label: "Require m ≥ n + 1", rationale: `The witness has n=${m.vertices} and m=${m.edges}. One additional edge of surplus excludes it.` });
  }
  if (!m.allEven && !config.assumptions.allEven) {
    candidates.push({ id: "all-even", label: "Require every degree to be even", rationale: `The degree sequence [${m.degrees.join(", ")}] violates this stronger premise.` });
  }
  return candidates.slice(0, 3);
}
