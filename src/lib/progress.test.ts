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
        { concept_id: "a", passed: true, created_at: "2026-10-01T10:00:00Z", strictness: "fair" },
        { concept_id: "b", passed: false, created_at: "2026-10-01T10:00:00Z", strictness: "strict" },
        { concept_id: "b", passed: false, created_at: "2026-10-01T10:01:00Z", strictness: "strict" },
        { concept_id: "b", passed: true, created_at: "2026-10-01T10:02:00Z", strictness: "ruthless" },
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

  it("records the grading level each concept was passed at, per topic", () => {
    const s = summarize(
      [
        { id: "a", topic: "Databases", name: "Index", status: "passed", attempts: 1 },
        { id: "b", topic: "Databases", name: "Lock", status: "passed", attempts: 2 },
        { id: "c", topic: "ML", name: "SVM", status: "passed", attempts: 1 },
        { id: "d", topic: "ML", name: "KNN", status: "new", attempts: 1 },
      ],
      [
        { concept_id: "a", passed: true, created_at: "2026-10-01T10:00:00Z", strictness: "ruthless" },
        { concept_id: "b", passed: false, created_at: "2026-10-01T10:00:00Z", strictness: "fair" },
        { concept_id: "b", passed: true, created_at: "2026-10-01T10:05:00Z", strictness: "strict" },
        { concept_id: "c", passed: true, created_at: "2026-10-02T10:00:00Z", strictness: null },
      ],
      { Databases: 10, ML: 10 },
      ["Databases", "ML"],
    );
    expect(s.passed.map((p) => [p.topic, p.name, p.level])).toEqual([
      ["Databases", "Index", "ruthless"],
      ["Databases", "Lock", "strict"],
      ["ML", "SVM", null],
    ]);
    expect(s.passedByLevel).toEqual({ fair: 0, strict: 1, ruthless: 1, unknown: 1 });
  });
});
