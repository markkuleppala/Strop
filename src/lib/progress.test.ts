import { describe, expect, it } from "vitest";
import { streak, summarize } from "./progress";

describe("progress", () => {
  it("counts a concept as first-try only when its first attempt passed", () => {
    const s = summarize(
      [
        { id: "a", topic: "T", name: "A", status: "passed", attempts: 1 },
        { id: "b", topic: "T", name: "B", status: "passed", attempts: 3 },
      ],
      [
        { concept_id: "a", passed: true, created_at: "2026-10-01T10:00:00Z" },
        { concept_id: "b", passed: false, created_at: "2026-10-01T10:00:00Z" },
        { concept_id: "b", passed: false, created_at: "2026-10-01T10:01:00Z" },
        { concept_id: "b", passed: true, created_at: "2026-10-01T10:02:00Z" },
      ],
      { T: 10 },
      ["T"],
    );
    expect(s.firstTryRate).toBe(0.5);
    expect(s.avgRevisions).toBe(2);
    expect(s.mastered).toBe(2);
  });

  it("streak counts consecutive days ending today or yesterday", () => {
    const today = new Date("2026-10-15T12:00:00Z");
    expect(streak(["2026-10-14T09:00:00Z", "2026-10-13T09:00:00Z"], today)).toBe(2);
    expect(streak(["2026-10-12T09:00:00Z"], today)).toBe(0);
  });
});
