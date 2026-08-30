# Final submission fields

## Project name

Finite Witness

## Tagline

Put a universal claim under pressure. Find the one graph that breaks it.

## YouTube title

Finite Witness | One Graph Is Enough — WebMCP Counterexample Search

## YouTube description

Finite Witness is a finite graph conjecture laboratory built for the OpenAI WebMCP Challenge.

The 119-second demo records the core workflow: a person shapes a graph conjecture, the engine finds its first counterexample in the declared order, and an agent saves the witness and suggests the next assumptions to test. The current v1.2 app presents that workflow as a `∀ → ∃` conjecture pressure rig and adds direct repair-and-retest plus deterministic counterexample certificates.

Live app: https://f0909172434.github.io/finite-witness-webmcp/

Source code: https://github.com/f0909172434/finite-witness-webmcp

The top-level page registers eight WebMCP tools for reading the workspace, loading scenarios, configuring conjectures, running counterexample search, saving evidence, suggesting and applying repairs, and retrieving deterministic counterexample certificates. The app uses the same logic for human controls and agent calls.

Built by Chih-Kai Wang during the challenge period. OpenAI Codex assisted with implementation, testing, documentation, and submission materials. The running app uses no hosted AI API and sends no user data to a server.

## Live application

https://f0909172434.github.io/finite-witness-webmcp/

## Public repository

https://github.com/f0909172434/finite-witness-webmcp

## Built with

HTML5, CSS, JavaScript, Web Workers, SVG, WebMCP, local storage, Node.js test runner, GitHub Pages, OpenAI Codex

## Short implementation note

Finite Witness registers eight tools in the top-level page with `document.modelContext.registerTool`. Each tool calls the same workspace functions used by the visible controls. Inputs use narrow JSON Schemas, and outputs include the resulting claim, graph, metrics, search counts, repair patches, and deterministic certificate so an agent can verify each change.

## Screenshot order

1. `assets/screenshots/01-hero.png`
2. `assets/screenshots/02-counterexample-workbench.png`
3. `assets/screenshots/03-agent-repair-loop.png`
4. `assets/screenshots/04-evidence-shelf.png`
5. `assets/screenshots/05-mobile-certificate.png`
6. `assets/screenshots/06-mobile-repair-loop.png`
