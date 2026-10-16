/**
 * Score alerts: whether, for which stocks, and how big a move. Every control
 * saves immediately; a failed save puts the control back. Turning alerts on is
 * the moment we ask the OS for permission — never earlier.
 */
import { useCallback, useEffect, useState } from "react";
import { Switch, View } from "react-native";

import { V } from "@/shared/learnVisuals";
import {
  AppText,
  Card,
  CardSkeleton,
  Button,
  ErrorState,
  Screen,
  SegmentedControl,
} from "@/ui";

import { fetchAlertPreferences, saveAlertPreferences } from "./api";
import {
  type AlertPreferences,
  DEFAULT_PREFERENCES,
  SCOPE_OPTIONS,
  THRESHOLD_CHOICES,
  type Threshold,
  thresholdLabel,
} from "./options";
import { isExpoGo } from "./push";
import { deviceRegistered, enableAlertsOnDevice, type EnableResult } from "./registration";

const EXPO_GO =
  "Alerts need the installed app build. They can't be delivered in Expo Go.";
const REASONS: Record<Exclude<EnableResult, { ok: true }>["reason"], string> = {
  denied:
    "Notifications are blocked for Borsa Compass. Allow them in your phone's Settings, then try again.",
  unavailable: "This device can't receive push notifications.",
  network: "Couldn't reach the server. Try again.",
  "expo-go": EXPO_GO,
};
const SAVE_FAILED = "Couldn't save. Try again.";

const thresholdOptions = THRESHOLD_CHOICES.map((t) => ({
  value: t === null ? "off" : String(t),
  label: thresholdLabel(t),
}));
const toThreshold = (v: string): Threshold =>
  v === "off" ? null : (Number(v) as Threshold);
const fromThreshold = (t: Threshold): string =>
  t === null ? "off" : String(t);

export function AlertsScreen() {
  const expoGo = isExpoGo();
  const [prefs, setPrefs] = useState<AlertPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // null = not checked yet. The switch shows the ACCOUNT's flag; this says
  // whether THIS phone holds a token (a second phone may not).
  const [registered, setRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    fetchAlertPreferences().then(
      (p) => live && setPrefs(p),
      () => live && setLoadError("Couldn't load your alert settings."),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const accountOn = prefs?.enabled === true;
  useEffect(() => {
    if (!accountOn || expoGo) return;
    let live = true;
    void deviceRegistered().then((r) => live && setRegistered(r));
    return () => {
      live = false;
    };
  }, [accountOn, expoGo]);

  const enableHere = useCallback(async () => {
    if (busy) return;
    setNotice(null);
    setBusy(true);
    try {
      const result = await enableAlertsOnDevice();
      if (result.ok) setRegistered(true);
      else setNotice(REASONS[result.reason]);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const save = useCallback(
    async (next: AlertPreferences) => {
      const previous = prefs ?? DEFAULT_PREFERENCES;
      setPrefs(next);
      setNotice(null);
      try {
        setPrefs(await saveAlertPreferences(next));
      } catch {
        setPrefs(previous);
        setNotice(SAVE_FAILED);
      }
    },
    [prefs],
  );

  const toggle = useCallback(
    async (on: boolean) => {
      if (!prefs || busy) return;
      setNotice(null);
      if (!on) return save({ ...prefs, enabled: false });
      setBusy(true);
      try {
        const result = await enableAlertsOnDevice();
        if (!result.ok) {
          setNotice(REASONS[result.reason]);
          return;
        }
        setRegistered(true);
        await save({ ...prefs, enabled: true });
      } finally {
        setBusy(false);
      }
    },
    [prefs, busy, save],
  );

  if (loadError) {
    return (
      <Screen>
        <View className="pt-4">
          <ErrorState
            message={loadError}
            onRetry={() => {
              setLoadError(null);
              setAttempt((n) => n + 1);
            }}
          />
        </View>
      </Screen>
    );
  }
  if (!prefs) {
    return (
      <Screen>
        <View className="pt-4">
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  const controlsOff = expoGo || !prefs.enabled;
  return (
    <Screen>
      <View className="gap-4 pt-4">
        {expoGo ? (
          <Card>
            <AppText className="text-sm text-white/70">{EXPO_GO}</AppText>
          </Card>
        ) : null}

        <Card>
          <View className="min-h-[44px] flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <AppText className="font-sans-semibold text-white">
                Score alerts
              </AppText>
              <AppText className="text-xs text-white/50">
                A push when a score moves a lot in one session.
              </AppText>
            </View>
            <Switch
              accessibilityLabel="Score alerts"
              value={prefs.enabled}
              disabled={expoGo || busy}
              onValueChange={(v) => void toggle(v)}
              trackColor={{ true: V.accent, false: "rgba(255,255,255,0.15)" }}
            />
          </View>
          {prefs.enabled && !expoGo && registered === false ? (
            <View className="mt-3 gap-2">
              <AppText className="text-xs text-white/50">
                Alerts are on for your account, but this phone isn&apos;t set up to
                receive them yet.
              </AppText>
              <Button
                label="Turn on for this phone"
                variant="secondary"
                loading={busy}
                onPress={() => void enableHere()}
              />
            </View>
          ) : null}
          {notice ? (
            <AppText className="mt-2 text-xs text-loss">{notice}</AppText>
          ) : null}
        </Card>

        <View
          className={`gap-4 ${controlsOff ? "opacity-50" : ""}`}
          style={{ pointerEvents: controlsOff ? "none" : "auto" }}
        >
          <View className="gap-2">
            <AppText className="text-sm text-white/70">Which stocks</AppText>
            <SegmentedControl
              disabled={controlsOff}
              options={SCOPE_OPTIONS}
              value={prefs.scope}
              onChange={(scope) => void save({ ...prefs, scope })}
            />
          </View>
          <View className="gap-2">
            <AppText className="text-sm text-white/70">
              Notify when a score rises by (points)
            </AppText>
            <SegmentedControl
              disabled={controlsOff}
              accessibilityLabelPrefix="Rises by"
              options={thresholdOptions}
              value={fromThreshold(prefs.rise_threshold)}
              onChange={(v) =>
                void save({ ...prefs, rise_threshold: toThreshold(v) })
              }
            />
          </View>
          <View className="gap-2">
            <AppText className="text-sm text-white/70">
              Notify when a score falls by (points)
            </AppText>
            <SegmentedControl
              disabled={controlsOff}
              accessibilityLabelPrefix="Falls by"
              options={thresholdOptions}
              value={fromThreshold(prefs.fall_threshold)}
              onChange={(v) =>
                void save({ ...prefs, fall_threshold: toThreshold(v) })
              }
            />
          </View>
        </View>

        <View className="gap-2">
          <AppText className="text-xs text-white/50">
            Scores move with price and volume. A change in score is information,
            not advice.
          </AppText>
          <AppText className="text-xs text-white/40">
            Points are on the 0–100 score. Alerts arrive while the market is
            open, at most once per stock and direction per day, and never
            between 22:00 and 08:00 in that market&apos;s own time (Cairo for
            EGX stocks, New York for US stocks).
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
