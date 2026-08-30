# Finite Witness

## Inspiration

Mathematical conjectures often fail for a small, concrete reason, but finding that reason can take more time than understanding it. Existing graph tools usually split the work: a person operates a visual interface, while an automated system works in a separate script or notebook. The two views drift apart.

Finite Witness asks what becomes possible when a person and an agent share the same live mathematical workspace. The agent can turn a verbal direction into structured constraints, exhaustively search finite graphs, and preserve exact evidence. The person can immediately see the smallest witness, inspect every metric, and decide what the mathematics means.

## What it does

Finite Witness is an interactive conjecture laboratory for finite simple graphs. A user can combine assumptions such as connectivity, minimum degree, bipartiteness, parity, edge surplus, and diameter with one of several graph conclusions. The app then enumerates every labeled simple graph up to the selected size and returns the first counterexample.

The result is an inspectable graph rather than a bare “false” answer. Finite Witness reports its vertices, edges, degree sequence, triangle count, diameter, and bipartite status, together with the exact number of candidate graphs searched. If no witness appears within the bound, the interface explicitly calls the result finite evidence rather than proof.

## Why WebMCP is essential

WebMCP turns the app from a visual calculator into a shared reasoning surface. The page exposes six tools that let an agent read the current workspace, load a scenario, configure a conjecture, run the exhaustive search, save the witness, and suggest stronger premises. Every agent action uses the same functions as the visible controls and updates the same graph on screen.

This creates a useful division of work. The agent handles structured translation, exhaustive execution, and evidence bookkeeping. The human keeps visual control, checks the actual witness, and makes the creative mathematical decision about what to try next. Without WebMCP, the agent would have to guess at form controls or work in a separate environment whose state the person cannot directly inspect.

## How we built it

The app is dependency-free HTML, CSS, and modern JavaScript. Graphs are encoded as integer edge masks. The search engine enumerates all `2^(n choose 2)` labeled simple graphs in increasing vertex order and computes connectivity, degree sequence, triangles, bipartiteness, diameter, cycle structure, and perfect matching existence. A Web Worker keeps the interface responsive.

WebMCP tools are registered in the top-level page with `document.modelContext.registerTool`. Their JSON Schemas keep inputs narrow, and tool responses include the resulting claim, graph, metrics, and search counts so an agent can verify the outcome. The human interface still works when WebMCP is unavailable.

## Challenges

The main challenge was making agent operations and human controls share one source of truth. A second challenge was preserving mathematical honesty: an exhaustive search within a finite bound can refute a claim, but failure to find a witness is not a proof. That distinction appears in both the UI and every relevant tool response.

## Accomplishments

- Six working WebMCP tools with read and write workflows.
- A complete visual product rather than a protocol demonstration.
- Exact exhaustive search through all simple graphs up to six vertices.
- Reproducible witness records stored in the browser.
- A dependency-free public deployment with no account or API key required.

## What we learned

Agent-native design works best when tools expose meaningful domain operations, not copies of buttons. “Search for the smallest counterexample” is a stable mathematical action. It remains useful even if the interface changes completely.

## What's next

The next step is a small declarative language for custom graph predicates, followed by canonical graph generation to extend exhaustive search beyond six vertices. A later version could support finite algebraic structures while preserving the same human-agent evidence workflow.

## Built with

HTML5, CSS, JavaScript ES modules, Web Workers, SVG, WebMCP, browser local storage, Node.js test runner, GitHub Pages, OpenAI Codex
