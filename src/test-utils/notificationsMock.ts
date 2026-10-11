/**
 * A stand-in for expo-notifications with bare jest.fn()s. Loaded globally from
 * jest.setup.ts because AuthProvider imports the alerts registration module.
 * Tests that care about a call override it with mockResolvedValue etc.
 */
export const AndroidImportance = { DEFAULT: 3 };
export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn().mockResolvedValue(null);
export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: "undetermined" });
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: "denied" });
export const getExpoPushTokenAsync = jest.fn().mockResolvedValue({ data: "ExponentPushToken[test]" });
export const addNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
export const getLastNotificationResponseAsync = jest.fn().mockResolvedValue(null);
export const clearLastNotificationResponseAsync = jest.fn().mockResolvedValue(undefined);
