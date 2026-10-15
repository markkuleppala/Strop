export type AnswerIssue = { line: string; problem: string };
export type AnswerLine = { text: string; problems: string[] };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();

/** True when one quote sits inside the other (either direction), so a slightly trimmed quote still matches. */
const overlaps = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a));

/**
 * Splits a submitted answer into lines and attaches the grader's issues to the line they quote.
 * Issues with no quote (something the learner left out entirely) come back as `unmissing` notes.
 */
export function reviewAnswer(text: string, issues: AnswerIssue[]): { lines: AnswerLine[]; missing: AnswerIssue[] } {
  const lines: AnswerLine[] = text.split("\n").map((t) => ({ text: t, problems: [] }));
  const missing: AnswerIssue[] = [];
  for (const issue of issues) {
    const quote = norm(issue.line);
    if (!quote || !issue.problem) {
      if (issue.problem) missing.push(issue);
      continue;
    }
    const hit = lines.find((l) => overlaps(norm(l.text), quote));
    if (hit) hit.problems.push(issue.problem);
    else missing.push(issue);
  }
  return { lines, missing };
}
