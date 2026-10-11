import { errorMessage } from "../errors";

describe("errorMessage", () => {
  it("prefers the thrown message", () => {
    expect(errorMessage(new Error("Holding not found: x"))).toBe("Holding not found: x");
    expect(errorMessage("nope")).toBe("Something went wrong");
    expect(errorMessage(undefined, "Could not load")).toBe("Could not load");
  });
});
