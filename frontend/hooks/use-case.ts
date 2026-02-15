"use client";

import { useState, useEffect, useCallback } from "react";
import { getCase, getCases, getMatchesForCase } from "@/lib/api-client";
import type { Case, MatchCandidate } from "@/lib/types";

export function useCases(status?: string) {
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCases(status);
      setCases(data.cases || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { cases, total, loading, error, refresh };
}

export function useCaseDetail(id: string) {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [caseRes, matchRes] = await Promise.all([
        getCase(id),
        getMatchesForCase(id).catch(() => []),
      ]);
      setCaseData(caseRes);
      setMatches(matchRes || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { caseData, matches, loading, error, refresh };
}
