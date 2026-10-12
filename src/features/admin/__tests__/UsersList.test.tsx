import { fireEvent, screen } from "@testing-library/react-native";
import { renderScreen } from "@/test-utils/renderScreen";
import type { ManagedUser } from "@/shared/api";
import { UsersList } from "../UsersList";

const ME: ManagedUser = {
  id: "1",
  email: "mark@example.com",
  name: "Mark",
  role: "admin",
  is_active: true,
  email_verified: true,
  methods: ["password", "google"],
  created_at: "2026-01-02T00:00:00Z",
  holdings_count: 3,
};
const SARA: ManagedUser = {
  id: "2",
  email: "sara@example.com",
  name: "",
  role: "user",
  is_active: false,
  email_verified: false,
  methods: [],
  created_at: "2026-02-03T00:00:00Z",
  holdings_count: 1,
};

function setup(users: ManagedUser[] = [ME, SARA], busyId: string | null = null) {
  const handlers = { onSendReset: jest.fn(), onToggleActive: jest.fn(), onDelete: jest.fn() };
  return { handlers, view: renderScreen(<UsersList users={users} busyId={busyId} currentUserId="1" {...handlers} />) };
}

describe("UsersList", () => {
  it("shows role, status and holdings on each card", async () => {
    await setup().view;
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByText("Disabled")).toBeTruthy();
    expect(screen.getByText("1 holding")).toBeTruthy();
    expect(screen.getByText("3 holdings")).toBeTruthy();
  });

  it("titles a user by name with the email beneath, or by email alone without a name", async () => {
    await setup().view;
    expect(screen.getByText("Mark")).toBeTruthy();
    expect(screen.getByText("mark@example.com")).toBeTruthy();
    // SARA has no name: her email is the title, shown once.
    expect(screen.getAllByText("sara@example.com")).toHaveLength(1);
  });

  it("badges sign-in methods, and Pending for an unverified account with no method", async () => {
    await setup().view;
    expect(screen.getByText("Password")).toBeTruthy();
    expect(screen.getByText("Google")).toBeTruthy();
    expect(screen.getAllByText("Pending")).toHaveLength(1);
    expect(screen.queryByText("Invited")).toBeNull();
    expect(screen.queryByText("Unverified")).toBeNull();
  });

  it("badges Unverified only when an unverified account has a method", async () => {
    const LINKED: ManagedUser = { ...SARA, id: "3", email: "lin@example.com", methods: ["apple"] };
    await setup([ME, LINKED]).view;
    expect(screen.getByText("Apple")).toBeTruthy();
    expect(screen.getAllByText("Unverified")).toHaveLength(1);
    expect(screen.queryByText("Pending")).toBeNull();
  });

  it("adds no status badge to a verified account with no method yet", async () => {
    const SEEDED: ManagedUser = { ...ME, id: "4", email: "seed@example.com", name: "", methods: [] };
    await setup([SEEDED]).view;
    expect(screen.queryByText("Pending")).toBeNull();
    expect(screen.queryByText("Unverified")).toBeNull();
    expect(screen.queryByText("Invited")).toBeNull();
  });

  it("expands a card to its actions", async () => {
    const { handlers, view } = setup();
    await view;
    await fireEvent.press(screen.getByLabelText("sara@example.com, show actions"));
    expect(screen.getByText(/^Added /)).toBeTruthy();
    await fireEvent.press(screen.getByText("Send reset email"));
    expect(handlers.onSendReset).toHaveBeenCalledWith(SARA);
    await fireEvent.press(screen.getByText("Enable"));
    expect(handlers.onToggleActive).toHaveBeenCalledWith(SARA);
    await fireEvent.press(screen.getByText("Delete"));
    expect(handlers.onDelete).toHaveBeenCalledWith(SARA);
  });

  it("explains why you cannot disable or delete yourself", async () => {
    await setup().view;
    await fireEvent.press(screen.getByLabelText("mark@example.com, show actions"));
    expect(screen.getByText("This is you")).toBeTruthy();
    expect(screen.queryByText("Disable")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
    expect(screen.getByText("Send reset email")).toBeTruthy();
  });

  it("falls back to a dash when the created date cannot be read", async () => {
    await setup([{ ...SARA, created_at: "nope" }]).view;
    await fireEvent.press(screen.getByLabelText("sara@example.com, show actions"));
    expect(screen.getByText("Added —")).toBeTruthy();
  });

  it("says so when there are no users", async () => {
    await setup([]).view;
    expect(screen.getByText("No users yet.")).toBeTruthy();
  });
});
