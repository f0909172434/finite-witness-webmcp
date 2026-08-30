# Finite Witness

**Find the smallest world where a claim breaks.**

Finite Witness is a local-first finite graph conjecture laboratory built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/). A person shapes a graph conjecture through the visual workbench while an AI agent can use structured WebMCP tools to configure the same claim, run the same exhaustive engine, save the witness, and suggest the next assumptions to test.

The central idea is simple: counterexample search becomes much more useful when the agent and the person share one live, inspectable workspace. The agent handles structured search and bookkeeping. The person sees the actual graph, checks the metrics, and decides how the mathematical claim should change.

## Live app

[Open Finite Witness](https://f0909172434.github.io/finite-witness-webmcp/)

No account, API key, build step, or backend is required. Saved witnesses stay in the current browser's local storage.

## Human and agent workflow

1. Choose or configure a finite simple graph conjecture.
2. Search every labeled graph in increasing vertex order, up to six vertices.
3. Inspect the first counterexample and its exact graph metrics.
4. Save the witness with the claim and search count.
5. Ask for candidate repairs, then test the revised statement again.

Finite Witness is an educational finite search tool. A claim surviving a bounded search is evidence, not a proof.

## WebMCP implementation

The top-level page registers six JavaScript WebMCP tools through `document.modelContext.registerTool`:

| Tool | Purpose |
| --- | --- |
| `get_workspace_state` | Read the visible claim, bound, latest result, and saved evidence count. |
| `load_demo_scenario` | Put a curated conjecture into the shared workbench. |
| `configure_conjecture` | Change any selected assumptions, conclusion, and search bound. |
| `search_counterexample` | Run the exhaustive engine and update the shared graph visualization. |
| `save_current_witness` | Persist the exact witness and search record in browser-local storage. |
| `suggest_conjecture_repairs` | Return stronger premises that exclude the current witness, clearly labeled as hypotheses. |

The registrations live in [`src/webmcp.js`](src/webmcp.js). Tool handlers call the same application functions used by the human interface; there is no parallel agent-only implementation. Each result includes enough state to verify what changed in the visible page.

```js
await document.modelContext.registerTool({
  name: "search_counterexample",
  description: "Exhaustively search labeled finite simple graphs in increasing vertex order for the smallest counterexample to the visible conjecture.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async () => workspace.search("agent"),
});
```

The app checks for browser support before registration and remains fully usable in ordinary browsers. Tools are registered only in the top-level page, matching the current ChatGPT in-app browser support described in the official [Site tools guide](https://learn.chatgpt.com/docs/webmcp).

## Search engine

Graphs are represented by an integer edge mask. For each vertex count, the engine enumerates all `2^(n choose 2)` labeled simple graphs. It computes connectivity, degree sequence, triangle count, bipartiteness, diameter, cycle structure, and perfect matching existence. A dedicated Web Worker keeps the visible interface responsive during enumeration.

The first admissible graph that violates the selected conclusion is returned as the minimal witness by vertex count. The app reports both the total number of candidate graphs tested and the number satisfying the selected assumptions.

## Run locally

Requirements: Python 3 and a modern browser.

```bash
git clone https://github.com/f0909172434/finite-witness-webmcp.git
cd finite-witness-webmcp
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

To inspect WebMCP tools, use ChatGPT's in-app browser or enable WebMCP testing in a supported version of Google Chrome.

## Tests

Requirements: Node.js 20 or newer.

```bash
npm test
```

The tests cover graph analysis and minimal counterexample results for the demonstration scenarios.

## Privacy and safety

- No analytics, tracking, cookies, network APIs, or user accounts.
- No user data leaves the browser.
- Saved evidence uses browser-local storage and can be cleared with site data.
- WebMCP inputs are narrow and validated by JSON Schema.
- Tool outputs distinguish finite evidence from proof.

## AI assistance disclosure

OpenAI Codex was used during the hackathon period to help plan the product, implement and review the HTML, CSS, JavaScript, tests, WebMCP registrations, documentation, and submission materials. The entrant directed the project and is responsible for the submitted work. No hosted model or AI API is used by the running application.

## License

[MIT](LICENSE) © 2026 f0909172434
