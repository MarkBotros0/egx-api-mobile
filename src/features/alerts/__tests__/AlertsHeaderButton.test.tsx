import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/lib/links";
import { AlertsHeaderButton } from "../AlertsHeaderButton";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

it("opens the alerts screen", async () => {
  await render(<AlertsHeaderButton />);
  await fireEvent.press(screen.getByLabelText("Score alerts"));
  expect(router.push).toHaveBeenCalledWith(routes.alerts);
});
