import { describe, expect, it } from "vitest";
import { buildMeetingPatch } from "@/modules/meetings/meeting-patch";

const original = {
  title: "Roadmap",
  meeting_date: "2026-10-01T09:30:00Z",
  participants: [
    { name: "Priya", email: "priya@acme.com" },
    { name: "Rahul", email: null },
  ],
};

describe("buildMeetingPatch", () => {
  it("is empty when nothing changed (dates by instant, participants by set)", () => {
    const patch = buildMeetingPatch(original, {
      title: "  Roadmap ",
      meeting_date: "2026-10-01T09:30:00.000Z",
      participants: [original.participants[1], original.participants[0]],
    });
    expect(patch).toEqual({});
  });

  it("sends only the title when only the title changed", () => {
    expect(buildMeetingPatch(original, { ...original, title: "Roadmap v2" })).toEqual({
      title: "Roadmap v2",
    });
  });

  it("sends the date when the instant changed", () => {
    const patch = buildMeetingPatch(original, {
      ...original,
      meeting_date: "2026-10-02T09:30:00Z",
    });
    expect(patch).toEqual({ meeting_date: "2026-10-02T09:30:00Z" });
  });

  it("sends the full participant list when it changed (add, remove or email edit)", () => {
    const added = [...original.participants, { name: "Mia", email: null }];
    expect(buildMeetingPatch(original, { ...original, participants: added }).participants).toEqual(
      added,
    );

    const removed = original.participants.slice(0, 1);
    expect(
      buildMeetingPatch(original, { ...original, participants: removed }).participants,
    ).toHaveLength(1);

    const edited = [{ name: "Priya", email: "new@acme.com" }, original.participants[1]];
    expect(buildMeetingPatch(original, { ...original, participants: edited }).participants).toEqual(
      edited,
    );
  });
});
