import { fireEvent, screen } from "@testing-library/react-native";
import { renderScreen } from "@/test-utils/renderScreen";
import type { ManagedUser } from "@/shared/api";
import { UsersList } from "../UsersList";

const ME: ManagedUser = { id: "1", username: "mark", role: "admin", is_active: true, created_at: "2026-01-02T00:00:00Z", holdings_count: 3 };
const SARA: ManagedUser = { id: "2", username: "sara.b", role: "user", is_active: false, created_at: "2026-02-03T00:00:00Z", holdings_count: 1 };

function setup(busyId: string | null = null) {
  const handlers = { onResetPassword: jest.fn(), onToggleActive: jest.fn(), onDelete: jest.fn() };
  return { handlers, view: renderScreen(<UsersList users={[ME, SARA]} busyId={busyId} currentUserId="1" {...handlers} />) };
}

describe("UsersList", () => {
  it("shows role, status and holdings on each card", async () => {
    await setup().view;
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByText("Disabled")).toBeTruthy();
    expect(screen.getByText("1 holding")).toBeTruthy();
    expect(screen.getByText("3 holdings")).toBeTruthy();
  });

  it("expands a card to its actions", async () => {
    const { handlers, view } = setup();
    await view;
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    expect(screen.getByText(/^Added /)).toBeTruthy();
    await fireEvent.press(screen.getByText("Enable"));
    expect(handlers.onToggleActive).toHaveBeenCalledWith(SARA);
    await fireEvent.press(screen.getByText("Delete"));
    expect(handlers.onDelete).toHaveBeenCalledWith(SARA);
  });

  it("explains why you cannot disable or delete yourself", async () => {
    await setup().view;
    await fireEvent.press(screen.getByLabelText("mark, show actions"));
    expect(screen.getByText("This is you")).toBeTruthy();
    expect(screen.queryByText("Disable")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
    expect(screen.getByText("Reset password")).toBeTruthy();
  });

  it("says so when there are no users", async () => {
    await renderScreen(<UsersList users={[]} busyId={null} currentUserId="1" onResetPassword={jest.fn()} onToggleActive={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText("No users yet.")).toBeTruthy();
  });
});
