import { describe, expect, it } from "vitest";
import { reviewAnswer } from "./answer-review";

describe("reviewAnswer", () => {
  const answer = "An index speeds up reads. It also speeds up writes. That is the whole idea.";

  it("marks only the quoted sentence, leaving the correct ones clean", () => {
    const { segments, notes } = reviewAnswer(answer, [
      { line: "It also speeds up writes.", problem: "Indexes slow writes down." },
    ]);
    expect(segments.map((s) => s.problems.length)).toEqual([0, 1, 0]);
    expect(segments[1]?.text.trim()).toBe("It also speeds up writes.");
    expect(notes).toEqual([{ quote: "It also speeds up writes.", problem: "Indexes slow writes down." }]);
  });

  it("keeps a gap the learner never mentioned as a note without underlining anything", () => {
    const { segments, notes } = reviewAnswer(answer, [
      { line: "", problem: "You never said what an index costs on disk." },
    ]);
    expect(segments.every((s) => s.problems.length === 0)).toBe(true);
    expect(notes).toEqual([{ quote: "", problem: "You never said what an index costs on disk." }]);
  });

  it("surfaces an issue whose quote is not in the answer instead of dropping it", () => {
    const { segments, notes } = reviewAnswer(answer, [
      { line: "Indexes are stored as skip lists.", problem: "That is not how a B-tree index works." },
    ]);
    expect(segments.every((s) => s.problems.length === 0)).toBe(true);
    expect(notes[0]).toEqual({
      quote: "Indexes are stored as skip lists.",
      problem: "That is not how a B-tree index works.",
    });
  });

  it("matches a quote whose whitespace or quoting differs from the answer", () => {
    const { segments } = reviewAnswer("A lock  blocks writers.\nIt is cheap.", [
      { line: '"a lock blocks writers"', problem: "Too vague to pass." },
    ]);
    expect(segments[0]?.problems).toEqual(["Too vague to pass."]);
    expect(segments[1]?.problems).toEqual([]);
  });
});
