# Finite Witness

## Inspiration

Mathematical conjectures often fail for a small, concrete reason. A universal statement may survive a thousand examples and still end with one graph. Existing graph tools usually split the work: a person operates a visual interface, while an automated system works in a separate script or notebook. The two views drift apart.

Finite Witness asks what becomes possible when a person and an agent share the same live mathematical workspace. Its `∀ → ∃` pressure rig makes the logic visible: the person frames the universal claim, the agent or person runs the declared search, and the first existential witness occupies the same sheet. The person can inspect every metric and decide what the mathematics means.

## What it does

Finite Witness is an interactive conjecture laboratory for finite simple graphs. A user can combine assumptions such as connectivity, minimum degree, bipartiteness, parity, edge surplus, and diameter with one of several graph conclusions. The live header rewrites the resulting universal statement as controls change. The app then checks labeled graphs from three vertices upward and stops at the first counterexample or the selected upper bound.

The result is an inspectable graph rather than a bare “false” answer. Finite Witness reports its vertices, edges, degree sequence, triangle count, diameter, and bipartite status, together with the exact number of candidate graphs searched. If no witness appears within the bound, the interface explicitly calls the result finite evidence rather than proof.

Each witness also receives a deterministic certificate containing the normalized claim, labeled edge mask and edge list, metrics, enumeration order, and exact search counts. Experiments can be shared by URL, filed in the witness archive, and exported as a versioned JSON evidence bundle. Candidate repairs explicitly feed the current witness into the next claim before the rig runs again.

## Why WebMCP is essential

WebMCP turns the app from a visual calculator into a shared reasoning surface. The page exposes eight tools that let an agent read the current workspace, load a scenario, configure a conjecture, run the exhaustive search, save the witness, suggest stronger premises, apply a repair and retest it, and retrieve the counterexample certificate. Every agent action uses the same functions as the visible controls and updates the same graph on screen.

This creates a useful division of work. The agent handles structured translation, exhaustive execution, and evidence bookkeeping. The human keeps visual control, checks the actual witness, and makes the creative mathematical decision about what to try next. Without WebMCP, the agent would have to guess at form controls or work in a separate environment whose state the person cannot directly inspect.

## How we built it

The app is dependency-free HTML, CSS, and modern JavaScript. Graphs are encoded as integer edge masks. The search engine checks labeled simple graphs in increasing vertex and edge-mask order until it finds a counterexample or reaches the selected bound. It computes connectivity, degree sequence, triangles, bipartiteness, diameter, cycle structure, and perfect matching existence. A Web Worker keeps the interface responsive.

WebMCP tools are registered in the top-level page with `document.modelContext.registerTool`. Their JSON Schemas keep inputs narrow, and tool responses include the resulting claim, graph, metrics, and search counts so an agent can verify the outcome. The human interface still works when WebMCP is unavailable.

## Challenges

The first challenge was making agent operations and human controls share one source of truth. Changing a visible assumption invalidates the earlier result immediately, so stale evidence cannot be mistaken for a result about the revised claim. The second was preserving mathematical honesty: an exhaustive search within a finite bound can refute a claim, but failure to find a witness is not a proof. The interface gives that outcome its own bounded-survival state. The final challenge was visual: every control, transition, and result had to express the same `∀ → ∃` argument instead of looking like a collection of dashboard cards.

## Accomplishments

- Eight working WebMCP tools with read, write, repair-loop, and certificate workflows.
- A complete visual product rather than a protocol demonstration.
- Exact ordered search across labeled simple graphs with three to six vertices, stopping at the first counterexample and recording the searched prefix precisely.
- Shareable experiments and deterministic witness certificates.
- Reproducible witness records stored locally and exportable as JSON.
- A dependency-free public deployment with no account or API key required.
- A responsive proof-sheet interface whose universal, witness, and repair states follow the actual search state.

## What we learned

Agent-native design works best when tools expose meaningful domain operations, not copies of buttons. “Search for the smallest counterexample” is a stable mathematical action. The interface can then give that action a strong visual consequence without changing the tool contract.

## What's next

The next step is a small declarative language for custom graph predicates, followed by canonical graph generation to extend exhaustive search beyond six vertices. A later version could support finite algebraic structures while preserving the same human-agent evidence workflow.

## Built with

HTML5, CSS, JavaScript ES modules, Web Workers, SVG, WebMCP, browser local storage, Node.js test runner, GitHub Pages, OpenAI Codex
