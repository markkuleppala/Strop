import { describe, expect, it } from "vitest";
import {
  DEFAULT_STRICTNESS,
  STRICTNESS_LEVELS,
  gradingInstructions,
  isStrictness,
} from "./strictness";

describe("strictness levels", () => {
  it("offers fair, strict and ruthless in that order", () => {
    expect(STRICTNESS_LEVELS.map((l) => l.id)).toEqual(["fair", "strict", "ruthless"]);
    expect(STRICTNESS_LEVELS.map((l) => l.label)).toEqual(["Fair", "Strict", "Ruthless"]);
  });

  it("defaults to strict", () => {
    expect(DEFAULT_STRICTNESS).toBe("strict");
  });

  it("accepts only the three known levels", () => {
    expect(isStrictness("fair")).toBe(true);
    expect(isStrictness("strict")).toBe(true);
    expect(isStrictness("ruthless")).toBe(true);
    expect(isStrictness("lenient")).toBe(false);
    expect(isStrictness(undefined)).toBe(false);
  });
});

describe("gradingInstructions", () => {
  it("keeps the same JSON contract at every level", () => {
    for (const level of ["fair", "strict", "ruthless"] as const) {
      const instructions = gradingInstructions(level);
      expect(instructions).toContain('"passed": boolean');
      expect(instructions).toContain('"model_answer"');
      expect(instructions).toContain("Do not reveal the full answer in the feedback");
    }
  });

  it("makes each level demand something different", () => {
    const fair = gradingInstructions("fair");
    const strict = gradingInstructions("strict");
    const ruthless = gradingInstructions("ruthless");

    expect(new Set([fair, strict, ruthless]).size).toBe(3);

    expect(fair).toContain("not grounds for rejection");
    expect(fair).not.toContain("when in doubt, do not pass");

    expect(strict).toContain("Do NOT pass partial answers");
    expect(strict).toContain("when in doubt, do not pass");
    expect(strict).not.toContain("oral defence");

    expect(ruthless).toContain("oral defence");
    expect(ruthless).toContain("concrete example or trade-off");
    expect(ruthless).not.toContain("Do NOT pass partial answers");
  });
});
