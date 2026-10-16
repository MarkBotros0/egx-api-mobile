/**
 * Turns a tapped score alert into navigation, and refreshes this phone's push
 * registration once per signed-in app start. Renders nothing.
 */
import { router } from "expo-router";
import { useEffect } from "react";

import { routes, stockHref } from "@/lib/links";

import { type AlertTap, configureNotifications, consumeColdStartTap, isExpoGo, onAlertTap } from "./push";
import { syncRegistration } from "./registration";

function go({ symbol, market }: AlertTap): void {
  router.push(symbol === "*" ? routes.dashboard : stockHref(symbol, market));
}

export function NotificationRouter() {
  useEffect(() => {
    if (isExpoGo()) return;
    configureNotifications();
    void syncRegistration();
    const unsubscribe = onAlertTap(go);
    let active = true;
    void consumeColdStartTap()
      .then((t) => {
        if (active && t) go(t);
      })
      .catch(() => {});
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return null;
}
