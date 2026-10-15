import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STARTER_TOPICS, STARTER_TOPIC_NAMES } from "./concepts-data";
import { chooseNext, type ConceptRow } from "./selection";
import { DEFAULT_STRICTNESS, gradingInstructions, isStrictness, type Strictness } from "./strictness";

export type TopicSummary = { name: string; custom: boolean; passed: number; rejected: number; total: number };

export const listTopics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: custom, error: e1 }, { data: concepts, error: e2 }] = await Promise.all([
      supabase.from("topics").select("name").order("created_at"),
      supabase.from("concepts").select("topic,status"),
    ]);
    if (e1 || e2) throw new Error((e1 ?? e2)!.message);
    const names = [...STARTER_TOPIC_NAMES, ...(custom ?? []).map((t) => t.name)];
    return names.map<TopicSummary>((name) => {
      const rows = (concepts ?? []).filter((c) => c.topic === name);
      return {
        name,
        custom: !STARTER_TOPICS[name],
        passed: rows.filter((r) => r.status === "passed").length,
        rejected: rows.filter((r) => r.status === "rejected").length,
        total: STARTER_TOPICS[name]?.length ?? 0,
      };
    });
  });

export const addTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => ({ name: String(d.name).trim().slice(0, 80) }))
  .handler(async ({ data, context }) => {
    if (!data.name) throw new Error("Topic name is required.");
    if (STARTER_TOPICS[data.name]) return { ok: true };
    const { error } = await context.supabase.from("topics").insert({ name: data.name, user_id: context.userId });
    if (error && error.code !== "23505") throw new Error(error.message);
    return { ok: true };
  });

export const deleteTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => ({ name: String(d.name) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("topics").delete().eq("name", data.name);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStrictness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_settings")
      .select("strictness")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const stored = data?.strictness;
    return { strictness: (isStrictness(stored) ? stored : DEFAULT_STRICTNESS) as Strictness };
  });

export const setStrictness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { strictness: string }) => {
    const level = String(d.strictness);
    if (!isStrictness(level)) throw new Error("Unknown strictness level.");
    return { strictness: level as Strictness };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_settings")
      .upsert(
        { user_id: context.userId, strictness: data.strictness, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { strictness: data.strictness };
  });

export const nextConcept = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic: string }) => ({ topic: String(d.topic) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("concepts")
      .select("id,name,status,last_attempt_at")
      .eq("topic", data.topic);
    if (error) throw new Error(error.message);

    const choice = chooseNext({
      starterNames: STARTER_TOPICS[data.topic] ?? [],
      rows: (rows ?? []) as ConceptRow[],
      rand: Math.random(),
    });

    if (choice.kind === "retry" || choice.kind === "pending") {
      const { data: last } = await supabase
        .from("attempts")
        .select("explanation,feedback")
        .eq("concept_id", choice.concept.id)
        .eq("passed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        id: choice.concept.id,
        name: choice.concept.name,
        retry: choice.kind === "retry",
        previous: last ? { explanation: last.explanation, feedback: last.feedback } : null,
      };
    }

    let name: string;
    let source = "starter";
    if (choice.kind === "starter") {
      name = choice.name;
    } else {
      const { askJson } = await import("./ai.server");
      const known = (rows ?? []).map((r) => r.name);
      const out = await askJson<{ concept: string }>(
        "You curate study concepts. Reply with only JSON: {\"concept\": \"<name>\"}.",
        `Topic: ${data.topic}\nSuggest ONE important concept (2-6 words) a learner should be able to explain. ` +
          `It must be different from all of these: ${known.length ? known.join("; ") : "(none yet)"}.`,
      );
      name = String(out.concept ?? "").trim().slice(0, 120);
      if (!name) throw new Error("Could not come up with a new concept. Try again.");
      source = "ai";
    }

    const { data: inserted, error: insErr } = await supabase
      .from("concepts")
      .upsert({ user_id: userId, topic: data.topic, name, source }, { onConflict: "user_id,topic,name" })
      .select("id,name")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { id: inserted.id, name: inserted.name, retry: false, previous: null };
  });

export const gradeExplanation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conceptId: string; explanation: string }) => ({
    conceptId: String(d.conceptId),
    explanation: String(d.explanation).slice(0, 6000),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.explanation.trim().length < 10) throw new Error("Write a bit more before submitting.");
    const { data: concept, error } = await supabase
      .from("concepts")
      .select("id,name,topic,attempts")
      .eq("id", data.conceptId)
      .single();
    if (error) throw new Error(error.message);

    const { data: prior } = await supabase
      .from("attempts")
      .select("explanation,feedback")
      .eq("concept_id", concept.id)
      .order("created_at", { ascending: true })
      .limit(10);

    const { data: settings } = await supabase
      .from("user_settings")
      .select("strictness")
      .eq("user_id", userId)
      .maybeSingle();
    const level: Strictness = isStrictness(settings?.strictness) ? settings.strictness : DEFAULT_STRICTNESS;

    const { askJson } = await import("./ai.server");
    const historyBlock =
      prior && prior.length > 0
        ? "\n\nEarlier attempts in this session (oldest first), each followed by your feedback:\n" +
          prior
            .map((a, i) => `Attempt ${i + 1}:\n${a.explanation}\nYour feedback:\n${a.feedback}`)
            .join("\n---\n")
        : "";
    const out = await askJson<{
      passed: boolean;
      feedback: string;
      model_answer: string;
      issues?: { line?: unknown; problem?: unknown }[];
    }>(
      gradingInstructions(level),
      `Topic: ${concept.topic}\nConcept: ${concept.name}${historyBlock}\n\nLearner's latest explanation:\n${data.explanation}`,
    );
    const passed = out.passed === true;
    const feedback = String(out.feedback ?? "");
    const model_answer = passed ? String(out.model_answer ?? "") : "";
    const issues = (Array.isArray(out.issues) ? out.issues : [])
      .map((i) => ({
        line: String(i?.line ?? "").slice(0, 400),
        problem: String(i?.problem ?? "").slice(0, 600),
      }))
      .filter((i) => i.problem)
      .slice(0, 12);

    const { error: aErr } = await supabase.from("attempts").insert({
      user_id: userId,
      concept_id: concept.id,
      explanation: data.explanation,
      passed,
      feedback,
      model_answer,
      strictness: level,
    });
    if (aErr) throw new Error(aErr.message);
    const { error: uErr } = await supabase
      .from("concepts")
      .update({
        status: passed ? "passed" : "new",
        attempts: concept.attempts + 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", concept.id);
    if (uErr) throw new Error(uErr.message);
    return { passed, feedback, model_answer, strictness: level, issues };
  });

export const topicHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic: string }) => ({ topic: String(d.topic) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("concepts")
      .select("id,name,status,attempts,last_attempt_at")
      .eq("topic", data.topic)
      .neq("status", "new")
      .order("last_attempt_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [c, a, t] = await Promise.all([
      supabase.from("concepts").select("id,topic,name,status,attempts"),
      supabase.from("attempts").select("concept_id,passed,created_at,strictness").order("created_at", { ascending: false }).limit(2000),
      supabase.from("topics").select("name").order("created_at"),
    ]);
    const err = c.error ?? a.error ?? t.error;
    if (err) throw new Error(err.message);
    const { summarize } = await import("./progress");
    const counts = Object.fromEntries(Object.entries(STARTER_TOPICS).map(([k, v]) => [k, v.length]));
    return summarize(c.data ?? [], a.data ?? [], counts, [...STARTER_TOPIC_NAMES, ...(t.data ?? []).map((x) => x.name)]);
  });
