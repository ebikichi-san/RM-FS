import type { SystemCategory } from "@/generated/prisma";

export type DepartmentPreset = {
  name: string;
  industry: string;
  systemCategory: SystemCategory;
};

export const SYSTEM_CATEGORY_LABELS: Record<SystemCategory, string> = {
  SALES_PROCUREMENT: "営業・調達",
  BACKOFFICE: "管理・バックオフィス",
  FIELD_MANUFACTURING: "現場・製造",
  RD_TECH: "開発・技術",
  OTHER: "その他（自動分類待ち）",
};

export const DEPARTMENT_PRESETS: DepartmentPreset[] = [
  { name: "経営企画", industry: "共通", systemCategory: "BACKOFFICE" },
  { name: "総務", industry: "共通", systemCategory: "BACKOFFICE" },
  { name: "人事労務", industry: "共通", systemCategory: "BACKOFFICE" },
  { name: "経理財務", industry: "共通", systemCategory: "BACKOFFICE" },
  { name: "営業", industry: "共通", systemCategory: "SALES_PROCUREMENT" },
  { name: "購買・調達", industry: "共通", systemCategory: "SALES_PROCUREMENT" },
  { name: "情報システム", industry: "IT", systemCategory: "RD_TECH" },
  { name: "開発", industry: "IT", systemCategory: "RD_TECH" },
  { name: "現場監督", industry: "建設", systemCategory: "FIELD_MANUFACTURING" },
  { name: "施工管理", industry: "建設", systemCategory: "FIELD_MANUFACTURING" },
  { name: "製造課", industry: "製造", systemCategory: "FIELD_MANUFACTURING" },
  { name: "品質保証", industry: "製造", systemCategory: "RD_TECH" },
  { name: "看護部", industry: "医療", systemCategory: "FIELD_MANUFACTURING" },
  { name: "医事課", industry: "医療", systemCategory: "BACKOFFICE" },
  { name: "厨房", industry: "飲食", systemCategory: "FIELD_MANUFACTURING" },
  { name: "ホール", industry: "飲食", systemCategory: "SALES_PROCUREMENT" },
];

const KEYWORD_MAP: { keys: string[]; category: SystemCategory }[] = [
  { keys: ["営業", "販売", "調達", "購買", "仕入", "ホール", "店舗", "マーケ", "CS", "カスタマー"], category: "SALES_PROCUREMENT" },
  { keys: ["総務", "人事", "労務", "経理", "財務", "経営", "医事", "管理", "法務", "企画", "秘書"], category: "BACKOFFICE" },
  { keys: ["製造", "工場", "現場", "施工", "看護", "厨房", "作業", "物流", "倉庫", "配送"], category: "FIELD_MANUFACTURING" },
  { keys: ["開発", "設計", "情シス", "it", "システム", "品質", "研究", "rd", "dx", "エンジニア", "データ"], category: "RD_TECH" },
];

export function mapDepartmentToCategory(name?: string | null): SystemCategory {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return "OTHER";
  const preset = DEPARTMENT_PRESETS.find((d) => (d.name ?? "").toLowerCase() === n);
  if (preset) return preset.systemCategory;
  for (const row of KEYWORD_MAP) {
    if (row.keys.some((k) => n.includes((k ?? "").toLowerCase()))) {
      return row.category;
    }
  }
  return "OTHER";
}

export function describeDepartmentMapping(name?: string | null) {
  const systemCategory = mapDepartmentToCategory(name);
  const trimmed = (name ?? "").trim() || "未設定";
  return {
    name: trimmed,
    systemCategory,
    label: SYSTEM_CATEGORY_LABELS[systemCategory],
    isFreeText: !DEPARTMENT_PRESETS.some((d) => d.name === trimmed),
  };
}
