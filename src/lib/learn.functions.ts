import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STARTER_TOPICS, STARTER_TOPIC_NAMES } from "./concepts-data";
import { chooseNext, type ConceptRow } from "./selection";

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
      return { id: choice.concept.id, name: choice.concept.name, retry: choice.kind === "retry" };
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
    return { id: inserted.id, name: inserted.name, retry: false };
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

    const { askJson } = await import("./ai.server");
    const historyBlock =
      prior && prior.length > 0
        ? "\n\nEarlier attempts in this session (oldest first), each followed by your feedback:\n" +
          prior
            .map((a, i) => `Attempt ${i + 1}:\n${a.explanation}\nYour feedback:\n${a.feedback}`)
            .join("\n---\n")
        : "";
    const out = await askJson<{ passed: boolean; feedback: string; model_answer: string }>(
      "You are a demanding tutor grading a learner's explanation of a technical concept. " +
        "Do NOT pass partial answers. Pass only when the explanation is sufficient: factually correct AND covering the essential points " +
        "(what it is, why/when it matters, key mechanics). " +
        "If anything is incorrect, vague, or missing, set passed to false and give feedback that explicitly lists " +
        "the incorrect parts and the missing parts, so the learner can revise and resubmit. " +
        "Do not reveal the full answer in the feedback — point at the gaps, do not fill them. " +
        "Be strict: when in doubt, do not pass. " +
        'Reply with only JSON: {"passed": boolean, "feedback": "2-5 sentences naming exactly what was wrong and what is missing", ' +
        '"model_answer": "a clear, concise explanation of the concept in 4-8 sentences, markdown allowed"}.',
      `Topic: ${concept.topic}\nConcept: ${concept.name}${historyBlock}\n\nLearner's latest explanation:\n${data.explanation}`,
    );
    const passed = out.passed === true;
    const feedback = String(out.feedback ?? "");
    const model_answer = passed ? String(out.model_answer ?? "") : "";

    const { error: aErr } = await supabase.from("attempts").insert({
      user_id: userId,
      concept_id: concept.id,
      explanation: data.explanation,
      passed,
      feedback,
      model_answer,
    });
    if (aErr) throw new Error(aErr.message);
    const { error: uErr } = await supabase
      .from("concepts")
      .update({
        status: passed ? "passed" : "rejected",
        attempts: concept.attempts + 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", concept.id);
    if (uErr) throw new Error(uErr.message);
    return { passed, feedback, model_answer };
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
