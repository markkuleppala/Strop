import { describe, expect, it } from "vitest";
import { chooseNext, type ConceptRow } from "./selection";

const row = (name: string, status: string, last: string | null = null): ConceptRow => ({
  id: name,
  name,
  status,
  last_attempt_at: last,
});

describe("chooseNext", () => {
  it("never repeats a passed concept", () => {
    const r = chooseNext({ starterNames: ["A"], rows: [row("A", "passed")], rand: 0.9 });
    expect(r.kind).toBe("generate");
  });

  it("brings a rejected concept back (oldest first) on a retry roll", () => {
    const r = chooseNext({
      starterNames: ["A", "B", "C"],
      rows: [row("A", "rejected", "2026-02-01"), row("B", "rejected", "2026-01-01")],
      rand: 0.1,
    });
    expect(r).toMatchObject({ kind: "retry", concept: { name: "B" } });
  });

  it("prefers new starter concepts when not rolling a retry", () => {
    const r = chooseNext({
      starterNames: ["A", "C"],
      rows: [row("A", "rejected", "2026-01-01")],
      rand: 0.5,
    });
    expect(r).toEqual({ kind: "starter", name: "C" });
  });

  it("asks the AI for a new concept once starters run out", () => {
    const r = chooseNext({ starterNames: ["A"], rows: [row("A", "passed")], rand: 0.1 });
    expect(r.kind).toBe("generate");
  });
});
