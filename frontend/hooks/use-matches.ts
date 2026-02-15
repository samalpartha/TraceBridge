"use client";

import { useState, useEffect, useCallback } from "react";
import { getMatchesForCase, verifyMatch as apiVerifyMatch } from "@/lib/api-client";
import type { MatchCandidate } from "@/lib/types";

export function useMatches(caseId: string) {
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMatchesForCase(caseId);
      setMatches(data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const verifyMatch = useCallback(
    async (matchId: string, action: string, notes?: string) => {
      await apiVerifyMatch(matchId, action, notes);
      await refresh();
    },
    [refresh]
  );

  return { matches, loading, error, refresh, verifyMatch };
}
