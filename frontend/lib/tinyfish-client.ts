/**
 * TinyFish Web Agent SSE client
 * Following cookbook patterns from https://github.com/tinyfish-io/tinyfish-cookbook
 *
 * Event types from TinyFish API:
 *   STARTED       - { runId, timestamp }
 *   STREAMING_URL - { streamingUrl } (live browser view, ~24h)
 *   PROGRESS      - { purpose } (action description)
 *   HEARTBEAT     - keep-alive
 *   COMPLETE      - { status: COMPLETED|FAILED|CANCELLED, resultJson, error }
 */

export interface TinyFishCallbacks {
  onStarted?: (runId: string) => void;
  onStreamUrl?: (url: string) => void;
  onStep?: (purpose: string) => void;
  onComplete?: (
    result: Record<string, unknown> | null,
    status: string
  ) => void;
  onError?: (error: string) => void;
}

export async function runTinyFishAutomation(
  url: string,
  goal: string,
  callbacks?: TinyFishCallbacks,
  browserProfile: "lite" | "stealth" = "lite"
): Promise<Record<string, unknown> | null> {
  const res = await fetch("/api/tinyfish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, goal, browser_profile: browserProfile }),
  });

  if (!res.ok) {
    const err = await res.text();
    callbacks?.onError?.(err);
    return null;
  }

  const reader = res.body?.getReader();
  if (!reader) return null;

  const decoder = new TextDecoder();
  let result: Record<string, unknown> | null = null;
  // Buffer for handling chunked SSE lines (cookbook pattern)
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last partial line in buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      try {
        const event = JSON.parse(line.slice(6));

        switch (event.type) {
          case "STARTED":
            callbacks?.onStarted?.(event.runId);
            break;
          case "STREAMING_URL":
            callbacks?.onStreamUrl?.(event.streamingUrl);
            break;
          case "PROGRESS":
            callbacks?.onStep?.(event.purpose || "Processing...");
            break;
          case "HEARTBEAT":
            // Keep-alive, no action needed
            break;
          case "COMPLETE":
            if (event.status === "COMPLETED") {
              result = event.resultJson || event.result || null;
              callbacks?.onComplete?.(result, event.status);
            } else {
              // FAILED or CANCELLED
              callbacks?.onError?.(
                event.error || `Automation ${event.status}`
              );
            }
            break;
        }
      } catch {
        // Skip malformed lines
      }
    }
  }

  return result;
}

/**
 * Run multiple TinyFish automations in parallel (cookbook pattern).
 * Returns settled results for each URL.
 */
export async function runTinyFishParallel(
  tasks: Array<{ url: string; goal: string }>,
  callbacks?: TinyFishCallbacks
): Promise<Array<PromiseSettledResult<Record<string, unknown> | null>>> {
  return Promise.allSettled(
    tasks.map((task) => runTinyFishAutomation(task.url, task.goal, callbacks))
  );
}

// Parse SSE event lines (shared helper)
export function parseSSELine(line: string): Record<string, unknown> | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}

export function isCompleteEvent(event: Record<string, unknown>): boolean {
  return event.type === "COMPLETE" && event.status === "COMPLETED";
}

export function isErrorEvent(event: Record<string, unknown>): boolean {
  return (
    event.type === "COMPLETE" &&
    (event.status === "FAILED" || event.status === "CANCELLED")
  );
}
