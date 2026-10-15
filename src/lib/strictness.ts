export type Strictness = "fair" | "strict" | "ruthless";

export const STRICTNESS_LEVELS: { id: Strictness; label: string; hint: string }[] = [
  {
    id: "fair",
    label: "Fair",
    hint: "Passes a solid answer that gets the core idea right; small gaps get a note, not a rejection.",
  },
  {
    id: "strict",
    label: "Strict",
    hint: "Correct and complete on the essentials — what it is, why it matters, how it works — or it goes back.",
  },
  {
    id: "ruthless",
    label: "Ruthless",
    hint: "Oral-defence standard: precise, with a concrete example or trade-off. Anything vague fails.",
  },
];

export const DEFAULT_STRICTNESS: Strictness = "strict";

export function isStrictness(value: unknown): value is Strictness {
  return STRICTNESS_LEVELS.some((level) => level.id === value);
}

const RULES: Record<Strictness, string> = {
  fair:
    "You are a fair tutor grading a learner's explanation of a technical concept. " +
    "Pass when the core idea is right and the learner clearly grasps what the concept is and why it matters; " +
    "a missing example, loose wording or a minor omission is not grounds for rejection. " +
    "Only fail an answer that misses the point, states something factually wrong, or shows no real understanding. " +
    "When you fail it, name the parts that are wrong or thin so the learner can revise and resubmit.",
  strict:
    "You are a demanding tutor grading a learner's explanation of a technical concept. " +
    "Do NOT pass partial answers. Pass only when the explanation is sufficient: factually correct AND covering the essential points " +
    "(what it is, why/when it matters, key mechanics). " +
    "If anything is incorrect, vague, or missing, set passed to false and give feedback that explicitly lists " +
    "the incorrect parts and the missing parts, so the learner can revise and resubmit. " +
    "Be strict: when in doubt, do not pass.",
  ruthless:
    "You are an uncompromising examiner grading a learner's explanation of a technical concept, as if this were an oral defence. " +
    "Pass only when the explanation is correct, precise and complete: what it is, why or when it matters, " +
    "the mechanics underneath it, and at least one concrete example or trade-off, with no hand-waving or filler. " +
    "Any vagueness, imprecision or unearned confidence fails, and a merely adequate answer fails. " +
    "When you fail it, name every flaw and every gap so the learner can revise and resubmit.",
};

const FEEDBACK_RULE =
  "Do not reveal the full answer in the feedback — point at the gaps, do not fill them.";

const ANSWER_FORMAT =
  'Reply with only JSON: {"passed": boolean, "feedback": "2-5 sentences naming exactly what was wrong and what is missing", ' +
  '"model_answer": "a clear, concise explanation of the concept in 4-8 sentences, markdown allowed"}.';

/** Grading rules for one strictness level. Pure: no secrets, safe to import from the client. */
export function gradingInstructions(level: Strictness): string {
  return `${RULES[level]}\n${FEEDBACK_RULE}\n${ANSWER_FORMAT}`;
}
