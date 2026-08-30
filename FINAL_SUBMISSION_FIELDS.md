# Final submission fields

## Project name

Finite Witness

## Tagline

Find, inspect, and revise finite counterexamples with a human and an agent in one live workspace.

## YouTube title

Finite Witness | Human-Agent Counterexample Search with WebMCP

## YouTube description

Finite Witness is a finite graph conjecture laboratory built for the OpenAI WebMCP Challenge.

The 119-second demo shows a person shaping a graph conjecture, the exhaustive engine finding its smallest counterexample, and an agent using WebMCP tools to save the witness and suggest the next assumptions to test.

Live app: https://f0909172434.github.io/finite-witness-webmcp/

Source code: https://github.com/f0909172434/finite-witness-webmcp

The top-level page registers six WebMCP tools for reading the workspace, loading scenarios, configuring conjectures, running counterexample search, saving evidence, and suggesting repairs. The app uses the same logic for human controls and agent calls.

Built by Chih-Kai Wang during the challenge period. OpenAI Codex assisted with implementation, testing, documentation, and submission materials. The running app uses no hosted AI API and sends no user data to a server.

## Live application

https://f0909172434.github.io/finite-witness-webmcp/

## Public repository

https://github.com/f0909172434/finite-witness-webmcp

## Built with

HTML5, CSS, JavaScript, Web Workers, SVG, WebMCP, local storage, Node.js test runner, GitHub Pages, OpenAI Codex

## Short implementation note

Finite Witness registers six tools in the top-level page with `document.modelContext.registerTool`. Each tool calls the same workspace functions used by the visible controls. Inputs use narrow JSON Schemas, and outputs include the resulting claim, graph, metrics, and search counts so an agent can verify the change.

## Screenshot order

1. `assets/screenshots/01-hero.png`
2. `assets/screenshots/02-counterexample-workbench.png`
3. `assets/screenshots/03-agent-repair-loop.png`
4. `assets/screenshots/04-evidence-shelf.png`
