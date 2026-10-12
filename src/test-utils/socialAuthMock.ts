import { createElement } from "react";
import { Pressable } from "react-native";

export const googleMock = {
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({ type: "success", data: { idToken: "google-id-token", user: { name: "Mark" } } })),
  },
  isSuccessResponse: (r: { type: string }) => r.type === "success",
  isErrorWithCode: () => false,
  statusCodes: { SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED", IN_PROGRESS: "IN_PROGRESS" },
};

export const appleMock = {
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: jest.fn(async () => ({
    identityToken: "apple-identity-token",
    authorizationCode: "apple-code",
    fullName: { givenName: "Mark", familyName: "B" },
  })),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButton: (props: { onPress: () => void }) =>
    createElement(Pressable, { testID: "apple-button", onPress: props.onPress }),
  AppleAuthenticationButtonType: { CONTINUE: 1 },
  AppleAuthenticationButtonStyle: { WHITE: 0 },
};
