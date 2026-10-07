import { describe, expect, it } from "vitest";
import { getGreeting } from "@/modules/home/utils";

describe("getGreeting", () => {
  it.each([
    [0, "Good night"],
    [4, "Good night"],
    [5, "Good morning"],
    [11, "Good morning"],
    [12, "Good afternoon"],
    [16, "Good afternoon"],
    [17, "Good evening"],
    [20, "Good evening"],
    [21, "Good night"],
    [23, "Good night"],
  ])("hour %i → %s", (hour, expected) => {
    expect(getGreeting(hour)).toBe(expected);
  });
});
