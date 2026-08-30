import { searchCounterexample } from "./graph-engine.js";

self.addEventListener("message", (event) => {
  try {
    const result = searchCounterexample(event.data.config);
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
