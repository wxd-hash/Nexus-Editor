/**
 * Pure-data stream accumulator. Does not touch the editor.
 * Each onChunk call appends to the accumulated text; the widget
 * reads `getAccumulated()` on each chunk to update its DOM.
 */
export function createStreamSession(signal: AbortSignal) {
  let accumulated = "";
  let aborted = false;

  signal.addEventListener("abort", () => {
    aborted = true;
  });

  function onChunk(delta: string): void {
    if (aborted) return;
    accumulated += delta;
  }

  return {
    onChunk,
    getAccumulated(): string {
      return accumulated;
    },
    isAborted(): boolean {
      return aborted;
    },
  };
}
