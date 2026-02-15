"use client";

import { useState, useCallback, useRef } from "react";
import type { SearchPipelineEvent } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

export function useSearchStream() {
  const [events, setEvents] = useState<SearchPipelineEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startSearch = useCallback(async (caseId: string) => {
    setEvents([]);
    setIsRunning(true);
    setError(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_URL}/api/search/run-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      // Proper SSE buffering (cookbook pattern)
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep incomplete last line in buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as SearchPipelineEvent;
            setEvents((prev) => [...prev, event]);
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setIsRunning(false);
    }
  }, []);

  const stopSearch = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const latestEvent = events[events.length - 1] || null;
  const isComplete = latestEvent?.type === "PIPELINE_COMPLETE";

  return { events, isRunning, isComplete, error, latestEvent, startSearch, stopSearch };
}
