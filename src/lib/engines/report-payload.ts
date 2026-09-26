import type { DomainScore } from "@/lib/engines/scoring";
import type { BlackBoxRisk, RedCardHit } from "@/lib/engines/red-card";
import type { DomainGap, GapRow, OwnerOtherGapRow } from "@/lib/engines/gap";

export type DepartmentSummary = {
  name: string;
  category: string;
  respondentCount: number;
  overallScore: number;
  overallStatus: string;
  gapIndex: number;
  highAlert: boolean;
  redCardForced: boolean;
  domains: DomainScore[];
  redCards: RedCardHit[];
  blackBoxRisks: BlackBoxRisk[];
};

export type GapPayload = {
  execStaff: GapRow[];
  ownerOther: OwnerOtherGapRow[];
  domainGaps: DomainGap[];
  roleDomainGaps: DomainGap[];
  roleGapIndex?: number;
};

export function parseDomainPayload(raw: string | null | undefined): {
  domains: DomainScore[];
  departmentSummaries: DepartmentSummary[];
} {
  if (!raw) return { domains: [], departmentSummaries: [] };
  const v = JSON.parse(raw) as unknown;
  if (Array.isArray(v)) return { domains: v as DomainScore[], departmentSummaries: [] };
  const obj = v as { domains?: DomainScore[]; departmentSummaries?: DepartmentSummary[] };
  return {
    domains: obj.domains ?? [],
    departmentSummaries: obj.departmentSummaries ?? [],
  };
}

export function parseRedCardPayload(raw: string | null | undefined): {
  redCards: RedCardHit[];
  blackBoxRisks: BlackBoxRisk[];
} {
  if (!raw) return { redCards: [], blackBoxRisks: [] };
  const v = JSON.parse(raw) as unknown;
  if (Array.isArray(v)) return { redCards: v as RedCardHit[], blackBoxRisks: [] };
  const obj = v as { redCards?: RedCardHit[]; blackBoxRisks?: BlackBoxRisk[] };
  return {
    redCards: obj.redCards ?? [],
    blackBoxRisks: obj.blackBoxRisks ?? [],
  };
}

export function parseGapPayload(raw: string | null | undefined): GapPayload {
  if (!raw) return { execStaff: [], ownerOther: [], domainGaps: [], roleDomainGaps: [] };
  const v = JSON.parse(raw) as unknown;
  if (Array.isArray(v)) {
    return { execStaff: v as GapRow[], ownerOther: [], domainGaps: [], roleDomainGaps: [] };
  }
  const obj = v as {
    execStaff?: GapRow[];
    breakdown?: GapRow[];
    ownerOther?: OwnerOtherGapRow[];
    domainGaps?: DomainGap[];
    roleDomainGaps?: DomainGap[];
    roleGapIndex?: number;
  };
  return {
    execStaff: obj.execStaff ?? obj.breakdown ?? [],
    ownerOther: obj.ownerOther ?? [],
    domainGaps: obj.domainGaps ?? [],
    roleDomainGaps: obj.roleDomainGaps ?? [],
    roleGapIndex: obj.roleGapIndex,
  };
}
