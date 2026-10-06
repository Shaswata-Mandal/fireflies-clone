import { describe, expect, it } from "vitest";
import { clampTime, isVideoUrl, parseTimeParam } from "@/modules/player/utils";

describe("clampTime", () => {
  it("keeps values inside [0, duration]", () => {
    expect(clampTime(5_000, 10_000)).toBe(5_000);
    expect(clampTime(-1, 10_000)).toBe(0);
    expect(clampTime(10_001, 10_000)).toBe(10_000);
  });

  it("maps NaN to 0 and never exceeds a zero duration", () => {
    expect(clampTime(Number.NaN, 10_000)).toBe(0);
    expect(clampTime(500, 0)).toBe(0);
  });
});

describe("parseTimeParam", () => {
  it("parses a plain integer", () => {
    expect(parseTimeParam("655000")).toBe(655_000);
    expect(parseTimeParam("0")).toBe(0);
  });

  it.each([null, "", "abc", "-5", "12.5", "1e3", " 10", "99999999999999999999"])(
    "ignores %s",
    (value) => {
      expect(parseTimeParam(value)).toBeNull();
    },
  );
});

describe("isVideoUrl", () => {
  it("detects video extensions regardless of case and query string", () => {
    expect(isVideoUrl("https://cdn.example.com/a/meeting.MP4?token=x")).toBe(true);
    expect(isVideoUrl("/media/clip.webm#t=10")).toBe(true);
  });

  it("treats everything else as audio", () => {
    expect(isVideoUrl("https://cdn.example.com/meeting.mp3")).toBe(false);
    expect(isVideoUrl("https://cdn.example.com/mp4/stream")).toBe(false);
  });
});
