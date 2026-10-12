import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * app.json plus build-time values that must not be committed. The Google
 * Sign-In plugin needs the iOS URL scheme (the reversed iOS client id); when
 * GOOGLE_IOS_URL_SCHEME is unset the plugin is skipped and the button stays
 * hidden on iOS (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID unset too).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const scheme = process.env.GOOGLE_IOS_URL_SCHEME;
  const plugins = [...(config.plugins ?? [])];
  if (scheme) plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme: scheme }]);
  return { ...(config as ExpoConfig), plugins };
};
