import { describe, expect, it } from "vitest";
import { addParticipant, parseParticipantInput } from "@/modules/meetings/participant-input";

describe("parseParticipantInput", () => {
  it("parses a bare name", () => {
    expect(parseParticipantInput("Priya Shah")).toEqual({
      ok: true,
      participant: { name: "Priya Shah", email: null },
    });
  });

  it("parses 'Name <email>'", () => {
    expect(parseParticipantInput("Priya Shah <priya@acme.com>")).toEqual({
      ok: true,
      participant: { name: "Priya Shah", email: "priya@acme.com" },
    });
  });

  it("collapses extra whitespace everywhere", () => {
    expect(parseParticipantInput("   Priya \t  Shah   <  priya@acme.com  >  ")).toEqual({
      ok: true,
      participant: { name: "Priya Shah", email: "priya@acme.com" },
    });
  });

  it("rejects empty and whitespace-only input", () => {
    expect(parseParticipantInput("").ok).toBe(false);
    expect(parseParticipantInput("   ").ok).toBe(false);
  });

  it.each([
    "Priya <priya>",
    "Priya <priya@acme>",
    "Priya <@acme.com>",
    "Priya <>",
    "Priya <a b@c.com>",
  ])("rejects the invalid email in %s", (input) => {
    expect(parseParticipantInput(input).ok).toBe(false);
  });

  it("rejects an email without a name and malformed brackets", () => {
    expect(parseParticipantInput("<priya@acme.com>").ok).toBe(false);
    expect(parseParticipantInput("Priya <priya@acme.com").ok).toBe(false);
  });

  it("rejects names over the backend limit", () => {
    expect(parseParticipantInput("x".repeat(101)).ok).toBe(false);
    expect(parseParticipantInput("x".repeat(100)).ok).toBe(true);
  });
});

describe("addParticipant", () => {
  const priya = { name: "Priya", email: null };

  it("appends new people", () => {
    const result = addParticipant([priya], { name: "Rahul", email: null });
    expect(result.added).toBe(true);
    expect(result.list).toHaveLength(2);
  });

  it("ignores duplicates by name, case-insensitively", () => {
    const result = addParticipant([priya], { name: "PRIYA", email: "p@acme.com" });
    expect(result.added).toBe(false);
    expect(result.list).toEqual([priya]);
  });
});
