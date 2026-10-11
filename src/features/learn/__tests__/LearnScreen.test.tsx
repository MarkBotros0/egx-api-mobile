import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ALL_CONCEPTS, TOTAL_CONCEPTS } from "@/shared/curriculum";
import { searchConcepts } from "@/shared/learn";
import { renderScreen } from "@/test-utils/renderScreen";
import { LearnScreen } from "../LearnScreen";

jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@/test-utils/asyncStorageMock"));
jest.mock("@react-native-community/slider", () => jest.requireActual("@/test-utils/sliderMock"));
jest.mock("@/shared/api", () => ({ fetchAnalysis: jest.fn(() => new Promise(() => {})) }));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue(undefined);
  storage.removeItem.mockResolvedValue(undefined);
});

describe("LearnScreen", () => {
  it("opens on the hero, the progress count and the first module", async () => {
    await renderScreen(<LearnScreen />);
    await waitFor(() => expect(screen.getByText(`0 of ${TOTAL_CONCEPTS} read`)).toBeTruthy());
    expect(screen.getByText("one idea at a time.")).toBeTruthy();
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
  });

  it("counts a concept read, and reset clears it", async () => {
    await renderScreen(<LearnScreen />);
    await waitFor(() => expect(screen.getByText(`0 of ${TOTAL_CONCEPTS} read`)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Mark What is a Stock? read"));
    expect(screen.getByText(`1 of ${TOTAL_CONCEPTS} read`)).toBeTruthy();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText("Reset reading progress"));
    expect(screen.getByText(`0 of ${TOTAL_CONCEPTS} read`)).toBeTruthy();
  });

  it("searches with punctuation folded and shows the live count", async () => {
    await renderScreen(<LearnScreen />);
    const n = searchConcepts(ALL_CONCEPTS, "stop loss")!.length;
    await fireEvent.changeText(screen.getByLabelText("Search all concepts"), "stop loss");
    expect(screen.getByText(`${n} ${n === 1 ? "concept" : "concepts"} match “stop loss”`)).toBeTruthy();
    expect(screen.getAllByText(String(n)).length).toBeGreaterThan(0); // the live count in the field
    expect(screen.queryByLabelText(/^Module 1:/)).toBeNull(); // pills hide while searching
  });

  it("says so when nothing matches, and clearing restores the path", async () => {
    await renderScreen(<LearnScreen />);
    await fireEvent.changeText(screen.getByLabelText("Search all concepts"), "zzzz");
    expect(screen.getByText("Nothing matches that yet.")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Clear search"));
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
    expect(screen.getByLabelText(/^Module 1: Foundations/)).toBeTruthy();
  });

  it("collapses and reopens a module from its header", async () => {
    await renderScreen(<LearnScreen />);
    await fireEvent.press(screen.getByTestId("module-market-basics"));
    expect(screen.queryByText("What is a Stock?")).toBeNull();
    expect(screen.getByTestId("module-market-basics").props.accessibilityState).toMatchObject({ expanded: false });
    await fireEvent.press(screen.getByTestId("module-market-basics"));
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
  });
});
