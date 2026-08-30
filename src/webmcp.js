const objectSchema = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

export async function registerWebMCP(workspace) {
  const modelContext = document.modelContext;
  if (typeof modelContext?.registerTool !== "function") return false;

  const tools = [
    {
      name: "get_workspace_state",
      description: "Read the current Finite Witness conjecture, search bound, latest result, and saved evidence without changing the workspace.",
      inputSchema: objectSchema({}),
      annotations: { readOnlyHint: true },
      execute: async () => workspace.getState(),
    },
    {
      name: "load_demo_scenario",
      description: "Load one curated graph conjecture into the visible workbench so the person and agent can inspect and test it together.",
      inputSchema: objectSchema({
        scenario: { type: "string", enum: ["triangle", "even-cycle", "perfect-matching", "diameter"], description: "The curated conjecture to load." },
      }, ["scenario"]),
      execute: async ({ scenario }) => workspace.loadScenario(scenario, "agent"),
    },
    {
      name: "configure_conjecture",
      description: "Configure a finite simple graph conjecture in the visible workbench. Omitted fields keep their current values. This changes the shared page but does not run a search.",
      inputSchema: objectSchema({
        name: { type: "string", minLength: 1, maxLength: 72 },
        connected: { type: "boolean" },
        min_degree: { type: ["integer", "null"], minimum: 0, maximum: 3 },
        bipartite: { type: "string", enum: ["any", "yes", "no"] },
        triangle_free: { type: "boolean" },
        all_even_degrees: { type: "boolean" },
        even_order: { type: "boolean" },
        edge_surplus: { type: ["integer", "null"], enum: [null, 0, 1] },
        max_diameter: { type: ["integer", "null"], enum: [null, 2, 3] },
        conclusion: { type: "string", enum: ["contains_triangle", "is_cycle", "is_bipartite", "has_perfect_matching", "has_even_edge_count", "diameter_at_most_2"] },
        max_vertices: { type: "integer", minimum: 3, maximum: 6 },
      }),
      execute: async (input) => workspace.configure(input, "agent"),
    },
    {
      name: "search_counterexample",
      description: "Exhaustively search labeled finite simple graphs in increasing vertex order for the smallest counterexample to the visible conjecture. Updates the shared visualization and returns exact metrics and search counts.",
      inputSchema: objectSchema({}),
      execute: async () => workspace.search("agent"),
    },
    {
      name: "save_current_witness",
      description: "Save the current counterexample and its exact conjecture, metrics, and search count to the browser-local evidence shelf. Requires a counterexample to be visible.",
      inputSchema: objectSchema({
        note: { type: "string", maxLength: 180, description: "Optional short reason for saving this witness." },
      }),
      execute: async ({ note = "" }) => workspace.saveWitness(note, "agent"),
    },
    {
      name: "suggest_conjecture_repairs",
      description: "Return up to three stronger assumptions that exclude the current counterexample. Suggestions are explicitly hypotheses for the next search, not proofs.",
      inputSchema: objectSchema({}),
      annotations: { readOnlyHint: true },
      execute: async () => workspace.getRepairs("agent"),
    },
  ];

  for (const tool of tools) await modelContext.registerTool(tool);
  workspace.onProtocolReady(tools.map(({ name, description, annotations }) => ({ name, description, annotations })));
  return true;
}
