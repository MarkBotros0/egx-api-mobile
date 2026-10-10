import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ScoreWeights } from "@/shared/types";
import {
  fetchScoreWeights,
  updateScoreWeights,
  type ScoreWeightsResponse,
} from "@/shared/api";
import {
  DEFAULT_WEIGHTS,
  FALLBACK_WEIGHT_PRESETS,
} from "@/shared/constants";
import { useAuth } from "@/auth/AuthProvider";

interface ScoreWeightsCtx {
  weights: ScoreWeights;
  draft: ScoreWeights;
  presets: Record<string, ScoreWeights>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  version: number;            // bumped after save, lets consumers know to refetch
  setDraft: (draft: ScoreWeights) => void;
  updateDraftField: (key: keyof ScoreWeights, value: number) => void;
  resetDraft: () => void;
  applyPreset: (name: string) => void;
  save: () => Promise<void>;
}

const Ctx = createContext<ScoreWeightsCtx | null>(null);

export function ScoreWeightsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [draft, setDraftState] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [presets, setPresets] = useState<Record<string, ScoreWeights>>(FALLBACK_WEIGHT_PRESETS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // Keyed on the user, not [] — weights are per-user now, and logout → login
  // as someone else is a client-side navigation with no reload, so an empty
  // dep array would leave user B looking at user A's sliders and scores.
  // Mirrors WatchlistProvider, which is scoped the same way.
  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      // Signed out: fall back to the defaults the public dashboard scores with.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ported verbatim from web: reset on sign-out
      setWeights(DEFAULT_WEIGHTS);
      setDraftState(DEFAULT_WEIGHTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchScoreWeights()
      .then((resp: ScoreWeightsResponse) => {
        if (cancelled) return;
        // Merge with DEFAULT_WEIGHTS so that a backend still returning the
        // old 5-key payload doesn't leave the new 3 categories undefined.
        const w: ScoreWeights = { ...DEFAULT_WEIGHTS, ...(resp.weights ?? {}) };
        setWeights(w);
        setDraftState(w);
        if (resp.presets) {
          const merged: Record<string, ScoreWeights> = {};
          for (const [name, preset] of Object.entries(resp.presets)) {
            merged[name] = { ...DEFAULT_WEIGHTS, ...preset };
          }
          setPresets(merged);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load weights");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const setDraft = useCallback((d: ScoreWeights) => setDraftState(d), []);

  const updateDraftField = useCallback(
    (key: keyof ScoreWeights, value: number) => {
      setDraftState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetDraft = useCallback(() => setDraftState(weights), [weights]);

  const applyPreset = useCallback(
    (name: string) => {
      const preset = presets[name];
      if (preset) setDraftState({ ...preset });
    },
    [presets]
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const resp = await updateScoreWeights(draft);
      const w = resp.weights ?? draft;
      setWeights(w);
      setDraftState(w);
      setVersion((v) => v + 1);
    } catch (e: any) {
      setError(e?.message || "Failed to save weights");
      throw e;
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const value = useMemo<ScoreWeightsCtx>(
    () => ({
      weights,
      draft,
      presets,
      loading,
      saving,
      error,
      version,
      setDraft,
      updateDraftField,
      resetDraft,
      applyPreset,
      save,
    }),
    [weights, draft, presets, loading, saving, error, version, setDraft, updateDraftField, resetDraft, applyPreset, save]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScoreWeights(): ScoreWeightsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // When rendered outside the provider (shouldn't happen in app, but guard
    // components used in storybook-like contexts), return an inert shape.
    return {
      weights: DEFAULT_WEIGHTS,
      draft: DEFAULT_WEIGHTS,
      presets: FALLBACK_WEIGHT_PRESETS,
      loading: false,
      saving: false,
      error: null,
      version: 0,
      setDraft: () => {},
      updateDraftField: () => {},
      resetDraft: () => {},
      applyPreset: () => {},
      save: async () => {},
    };
  }
  return ctx;
}

/** Normalize weights to sum to 100 for display purposes (mirrors backend math). */
export function normalizeWeights(w: ScoreWeights): ScoreWeights {
  const keys: (keyof ScoreWeights)[] = [
    "trend", "momentum", "volume", "volatility", "divergence",
    "quality", "risk_adjusted", "relative_strength",
  ];
  const total = keys.reduce((s, k) => s + (w[k] || 0), 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  const out = {} as ScoreWeights;
  for (const k of keys) {
    out[k] = +(((w[k] || 0) / total) * 100).toFixed(2);
  }
  return out;
}
