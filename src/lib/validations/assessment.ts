import { z } from "zod";

export const answerSchema = z.object({
  questionCode: z.string().min(1),
  answerValue: z.enum(["YES", "NO", "UNKNOWN"]),
});

export const submitAssessmentSchema = z.object({
  projectId: z.string().min(1).optional(),
  tenantName: z.string().min(1).default("デモ企業"),
  displayName: z.string().min(1).default("匿名回答者"),
  departmentName: z.string().trim().min(1).max(80),
  industryPreset: z.string().optional(),
  positionLevel: z.enum(["EXECUTIVE", "MANAGER", "STAFF"]),
  employmentType: z.enum(["REGULAR", "CONTRACT", "DISPATCH", "PART_TIME"]),
  elapsedSeconds: z.number().int().min(0).max(3600).optional(),
  timedOut: z.boolean().optional(),
  answers: z.array(answerSchema).min(1),
});

export const patchTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});

export const departmentUpsertSchema = z.object({
  name: z.string().trim().min(1).max(80),
  projectId: z.string().min(1).default("demo"),
});

export const departmentPatchSchema = z.object({
  name: z.string().trim().min(1).max(80),
  projectId: z.string().min(1).default("demo"),
});

export const userUpsertSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  role: z.enum(["CLIENT_ADMIN", "RESPONDENT", "PARTNER_CONSULTANT"]),
  departmentId: z.string().min(1).nullable().optional(),
  positionLevel: z.enum(["EXECUTIVE", "MANAGER", "STAFF"]).optional(),
  accessEnabled: z.boolean().optional(),
  projectId: z.string().min(1).default("demo"),
});

export const userPatchSchema = userUpsertSchema.partial();
