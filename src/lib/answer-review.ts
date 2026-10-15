export type AnswerIssue = { line: string; problem: string };
export type AnswerSegment = { text: string; problems: string[] };
export type AnswerNote = { quote: string; problem: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();

/** True when one quote sits inside the other (either direction), so a slightly trimmed quote still matches. */
const overlaps = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a));

/** Breaks one line into sentence-sized pieces, keeping the original spacing so the answer still reads as written. */
const SENTENCES = /[^.!?;:]+[.!?;:]*\s*/g;
const sentences = (line: string): string[] => line.match(SENTENCES) ?? (line.length ? [line] : []);

/**
 * Splits a submitted answer into sentence-sized segments and attaches the grader's issues to the segment
 * they quote, so the wrong parts can be underlined and the rest left alone.
 * Issues that quote nothing (a gap the learner never mentioned) still come back as notes, never dropped.
 */
export function reviewAnswer(
  text: string,
  issues: AnswerIssue[],
): { segments: AnswerSegment[]; notes: AnswerNote[] } {
  const segments: AnswerSegment[] = text
    .split("\n")
    .flatMap((line) => sentences(line).map((s) => ({ text: s, problems: [] as string[] })));

  const notes: AnswerNote[] = [];
  for (const issue of issues) {
    if (!issue.problem) continue;
    const quote = norm(issue.line);
    const hit = quote ? segments.find((s) => overlaps(norm(s.text), quote)) : undefined;
    if (hit) {
      hit.problems.push(issue.problem);
      notes.push({ quote: hit.text.trim(), problem: issue.problem });
    } else {
      notes.push({ quote: quote ? issue.line.trim() : "", problem: issue.problem });
    }
  }
  return { segments, notes };
}
