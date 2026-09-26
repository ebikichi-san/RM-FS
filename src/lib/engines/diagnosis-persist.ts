import type { DiagnosisAnswer, LiveDiagnosis } from "@/lib/engines/compute";
import { prisma } from "@/lib/prisma";
import { createSupabaseDataClient } from "@/lib/supabase/admin";

const TABLE = "diagnosis_results";

export type PersistDiagnosisInput = {
  projectId: string;
  sessionId?: string;
  userId?: string | null;
  departmentName: string;
  positionLevel: string;
  answers: DiagnosisAnswer[];
  diagnosis: LiveDiagnosis;
};

export type StoredDiagnosis = LiveDiagnosis & {
  id: string;
  projectId: string;
  sessionId: string | null;
  userId: string | null;
  answers: DiagnosisAnswer[];
  createdAt: string;
  source: "supabase" | "local";
};

type DiagnosisRow = {
  id: string;
  project_id: string;
  session_id: string | null;
  user_id: string | null;
  department_name: string;
  position_level: string;
  overall_score: number;
  overall_status: string;
  gap_index: number;
  role_gap_index: number;
  high_alert: boolean;
  red_card_forced: boolean;
  unknown_count: number;
  unknown_rate: number;
  answered_count: number;
  answers_json: DiagnosisAnswer[] | string;
  domains_json: LiveDiagnosis["domains"] | string;
  domain_gaps_json: LiveDiagnosis["domainGaps"] | string;
  red_cards_json: LiveDiagnosis["redCards"] | string;
  black_box_risks_json: LiveDiagnosis["blackBoxRisks"] | string;
  diagnosis_json: LiveDiagnosis | string;
  created_at: string;
};

function parseJson<T>(value: T | string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value;
}

function toInsert(input: PersistDiagnosisInput) {
  const { diagnosis } = input;
  return {
    project_id: input.projectId,
    session_id: input.sessionId ?? null,
    user_id: input.userId ?? null,
    department_name: input.departmentName,
    position_level: input.positionLevel,
    overall_score: diagnosis.overallScore,
    overall_status: diagnosis.overallStatus,
    gap_index: diagnosis.gapIndex,
    role_gap_index: diagnosis.roleGapIndex,
    high_alert: diagnosis.highAlert,
    red_card_forced: diagnosis.redCardForced,
    unknown_count: diagnosis.unknownCount,
    unknown_rate: diagnosis.unknownRate,
    answered_count: diagnosis.answeredCount,
    answers_json: input.answers,
    domains_json: diagnosis.domains,
    domain_gaps_json: diagnosis.domainGaps,
    red_cards_json: diagnosis.redCards,
    black_box_risks_json: diagnosis.blackBoxRisks,
    diagnosis_json: diagnosis,
  };
}

function rowToStored(row: DiagnosisRow, source: StoredDiagnosis["source"]): StoredDiagnosis {
  const diagnosis = parseJson<LiveDiagnosis>(row.diagnosis_json, {
    answeredCount: row.answered_count,
    totalQuestions: 70,
    unknownCount: row.unknown_count,
    unknownRate: row.unknown_rate,
    overallScore: row.overall_score,
    overallStatus: (row.overall_status as LiveDiagnosis["overallStatus"]) ?? "YELLOW",
    gapIndex: row.gap_index,
    roleGapIndex: row.role_gap_index,
    highAlert: row.high_alert,
    redCardForced: row.red_card_forced,
    redCards: parseJson(row.red_cards_json, []),
    blackBoxRisks: parseJson(row.black_box_risks_json, []),
    domains: parseJson(row.domains_json, []),
    domainGaps: parseJson(row.domain_gaps_json, []),
    roleDomainGaps: parseJson(row.domain_gaps_json, []),
    danger: { key: "caution", label: "要観察", tone: "yellow" },
    mapping: { name: row.department_name, systemCategory: "OTHER", label: row.department_name },
    respondentCount: 1,
  });
  return {
    ...diagnosis,
    id: row.id,
    projectId: row.project_id,
    sessionId: row.session_id,
    userId: row.user_id,
    answers: parseJson<DiagnosisAnswer[]>(row.answers_json, []),
    createdAt: row.created_at,
    source,
  };
}

async function saveLocal(input: PersistDiagnosisInput, supabaseId: string | null) {
  const payload = toInsert(input);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await prisma.$executeRaw`
    INSERT INTO DiagnosisResult (
      id, projectId, sessionId, userId, departmentName, positionLevel,
      overallScore, overallStatus, gapIndex, roleGapIndex, highAlert, redCardForced,
      unknownCount, unknownRate, answeredCount, answersJson, domainsJson, domainGapsJson,
      redCardsJson, blackBoxRisksJson, diagnosisJson, supabaseId, createdAt
    ) VALUES (
      ${id},
      ${payload.project_id},
      ${payload.session_id},
      ${payload.user_id},
      ${payload.department_name},
      ${payload.position_level},
      ${payload.overall_score},
      ${payload.overall_status},
      ${payload.gap_index},
      ${payload.role_gap_index},
      ${payload.high_alert},
      ${payload.red_card_forced},
      ${payload.unknown_count},
      ${payload.unknown_rate},
      ${payload.answered_count},
      ${JSON.stringify(payload.answers_json)},
      ${JSON.stringify(payload.domains_json)},
      ${JSON.stringify(payload.domain_gaps_json)},
      ${JSON.stringify(payload.red_cards_json)},
      ${JSON.stringify(payload.black_box_risks_json)},
      ${JSON.stringify(payload.diagnosis_json)},
      ${supabaseId},
      ${createdAt}
    )
  `;
  return { id };
}

async function saveSupabase(input: PersistDiagnosisInput): Promise<string | null> {
  const client = createSupabaseDataClient();
  if (!client) return null;
  const { data, error } = await client
    .from(TABLE)
    .insert(toInsert(input))
    .select("id")
    .single();
  if (error) {
    console.error("[diagnosis-persist] supabase insert failed", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function persistDiagnosisResult(input: PersistDiagnosisInput) {
  const supabaseId = await saveSupabase(input);
  const local = await saveLocal(input, supabaseId);
  return {
    id: local.id,
    supabaseId,
    saved: true,
    supabase: Boolean(supabaseId),
  };
}

export function asLiveDiagnosis(stored: StoredDiagnosis): LiveDiagnosis {
  return {
    answeredCount: stored.answeredCount,
    totalQuestions: stored.totalQuestions,
    unknownCount: stored.unknownCount,
    unknownRate: stored.unknownRate,
    overallScore: stored.overallScore,
    overallStatus: stored.overallStatus,
    gapIndex: stored.gapIndex,
    roleGapIndex: stored.roleGapIndex,
    highAlert: stored.highAlert,
    redCardForced: stored.redCardForced,
    redCards: stored.redCards,
    blackBoxRisks: stored.blackBoxRisks,
    domains: stored.domains,
    domainGaps: stored.domainGaps,
    roleDomainGaps: stored.roleDomainGaps,
    danger: stored.danger,
    mapping: stored.mapping,
    respondentCount: stored.respondentCount,
  };
}

export async function loadLatestDiagnosis(
  projectId: string,
  userId?: string | null,
): Promise<StoredDiagnosis | null> {
  const client = createSupabaseDataClient();
  if (client) {
    let query = client
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("[diagnosis-persist] supabase load failed", error.message);
    } else if (data) {
      return rowToStored(data as DiagnosisRow, "supabase");
    }
  }

  const locals = userId
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          projectId: string;
          sessionId: string | null;
          userId: string | null;
          departmentName: string;
          positionLevel: string;
          overallScore: number;
          overallStatus: string;
          gapIndex: number;
          roleGapIndex: number;
          highAlert: boolean | number;
          redCardForced: boolean | number;
          unknownCount: number;
          unknownRate: number;
          answeredCount: number;
          answersJson: string;
          domainsJson: string;
          domainGapsJson: string;
          redCardsJson: string;
          blackBoxRisksJson: string;
          diagnosisJson: string;
          createdAt: Date | string;
        }>
      >`
        SELECT * FROM DiagnosisResult
        WHERE projectId = ${projectId} AND userId = ${userId}
        ORDER BY createdAt DESC
        LIMIT 1
      `
    : await prisma.$queryRaw<
        Array<{
          id: string;
          projectId: string;
          sessionId: string | null;
          userId: string | null;
          departmentName: string;
          positionLevel: string;
          overallScore: number;
          overallStatus: string;
          gapIndex: number;
          roleGapIndex: number;
          highAlert: boolean | number;
          redCardForced: boolean | number;
          unknownCount: number;
          unknownRate: number;
          answeredCount: number;
          answersJson: string;
          domainsJson: string;
          domainGapsJson: string;
          redCardsJson: string;
          blackBoxRisksJson: string;
          diagnosisJson: string;
          createdAt: Date | string;
        }>
      >`
        SELECT * FROM DiagnosisResult
        WHERE projectId = ${projectId}
        ORDER BY createdAt DESC
        LIMIT 1
      `;
  const local = locals[0];
  if (!local) return null;
  return rowToStored(
    {
      id: local.id,
      project_id: local.projectId,
      session_id: local.sessionId,
      user_id: local.userId,
      department_name: local.departmentName,
      position_level: local.positionLevel,
      overall_score: local.overallScore,
      overall_status: local.overallStatus,
      gap_index: local.gapIndex,
      role_gap_index: local.roleGapIndex,
      high_alert: Boolean(local.highAlert),
      red_card_forced: Boolean(local.redCardForced),
      unknown_count: local.unknownCount,
      unknown_rate: local.unknownRate,
      answered_count: local.answeredCount,
      answers_json: local.answersJson,
      domains_json: local.domainsJson,
      domain_gaps_json: local.domainGapsJson,
      red_cards_json: local.redCardsJson,
      black_box_risks_json: local.blackBoxRisksJson,
      diagnosis_json: local.diagnosisJson,
      created_at:
        local.createdAt instanceof Date ? local.createdAt.toISOString() : String(local.createdAt),
    },
    "local",
  );
}
