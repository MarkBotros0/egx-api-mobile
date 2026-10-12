import Constants, { ExecutionEnvironment } from "expo-constants";

/** True inside Expo Go, where custom native modules (push, Google sign-in) do not exist. */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
