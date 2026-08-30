# Finite Witness demo script (target: 2:30)

## 0:00-0:20 | The problem

“A mathematical claim can be wrong for one small, concrete reason. Finding that reason is tedious, and automated search usually happens somewhere the learner cannot see. Finite Witness gives a person and an AI agent one shared conjecture workspace.”

## 0:20-0:50 | Human interface

“Here I am testing the claim that every connected graph with minimum degree at least two contains a triangle. The assumptions are explicit, the conclusion is selectable, and the search bound is visible. I can run the exhaustive search directly.”

## 0:50-1:15 | Minimal witness

“The first counterexample has four vertices. It is a cycle: connected, minimum degree two, and triangle-free. The app reports the graph, degree sequence, diameter, bipartite status, and the exact number of candidate graphs tested. This is a witness I can inspect, not a black-box answer.”

## 1:15-1:55 | WebMCP workflow

“The page also registers six WebMCP tools. I can ask an agent to read the workspace, load a scenario, change the graph assumptions, run the same exhaustive engine, save the current witness, and suggest repairs. These are domain operations, not button clicks. They call the same application functions and update the graph I am looking at.”

## 1:55-2:18 | Human and agent together

“After saving the witness, the agent proposes assumptions that exclude it, such as raising the minimum degree. The interface labels these as starting points rather than proofs. I decide which mathematical direction is meaningful, and the agent runs the next controlled test.”

## 2:18-2:30 | Close

“Finite Witness shows the future WebMCP makes possible: agents perform structured work inside the live web experience, while people keep context, judgment, and visual control.”
