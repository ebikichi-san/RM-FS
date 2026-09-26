export const RISK_DOMAINS = [
  { id: 1, code: "labor", nameJa: "労務・コンプラ", nameEn: "Labor & Compliance", weight: 1.2 },
  { id: 2, code: "it", nameJa: "IT・セキュリティ", nameEn: "IT & Security", weight: 1.3 },
  { id: 3, code: "finance", nameJa: "財務・会計不正", nameEn: "Finance & Fraud", weight: 1.3 },
  { id: 4, code: "bcp", nameJa: "事業継続 (BCP)", nameEn: "Business Continuity", weight: 1.0 },
  { id: 5, code: "legal", nameJa: "法務・契約", nameEn: "Legal & Contracts", weight: 1.4 },
  { id: 6, code: "org", nameJa: "組織・属人化", nameEn: "Organization", weight: 0.9 },
  { id: 7, code: "strategy", nameJa: "経営・事業戦略", nameEn: "Strategy", weight: 1.0 },
] as const;

export type OwnerCategory =
  | "SALES_PROCUREMENT"
  | "BACKOFFICE"
  | "FIELD_MANUFACTURING"
  | "RD_TECH"
  | "OTHER";

export const DOMAIN_OWNERS: Record<number, OwnerCategory[]> = {
  1: ["BACKOFFICE"],
  2: ["RD_TECH"],
  3: ["BACKOFFICE"],
  4: ["BACKOFFICE", "FIELD_MANUFACTURING"],
  5: ["BACKOFFICE"],
  6: ["BACKOFFICE"],
  7: ["BACKOFFICE"],
};

export type QuestionSeed = {
  code: string;
  domainId: number;
  title: string;
  text: string;
  importanceLevel: number;
  isRedCardTrigger: boolean;
  redCardReason?: string;
  ownerCategories: OwnerCategory[];
  taskTitle: string;
  taskPriority: "CRITICAL" | "HIGH" | "MEDIUM";
  taskDifficulty: number;
  estimatedHours: number;
  recommendedRole: string;
  steps: string[];
};

function q(
  domainId: number,
  n: number,
  title: string,
  text: string,
  importanceLevel: number,
  extra: Partial<QuestionSeed> = {},
): QuestionSeed {
  const red = extra.isRedCardTrigger ?? false;
  return {
    code: `Q${domainId}-${n}`,
    domainId,
    title,
    text,
    importanceLevel,
    isRedCardTrigger: red,
    redCardReason: extra.redCardReason,
    ownerCategories: extra.ownerCategories ?? DOMAIN_OWNERS[domainId] ?? ["OTHER"],
    taskTitle: extra.taskTitle ?? `${title}の是正`,
    taskPriority: extra.taskPriority ?? (red || importanceLevel >= 5 ? "CRITICAL" : importanceLevel >= 4 ? "HIGH" : "MEDIUM"),
    taskDifficulty: extra.taskDifficulty ?? 2,
    estimatedHours: extra.estimatedHours ?? (importanceLevel >= 5 ? 10 : 6),
    recommendedRole: extra.recommendedRole ?? "管理職",
    steps: extra.steps ?? ["現状の事実確認", "是正方針の決定", "担当と期限の割当", "完了証跡の保管"],
  };
}

export const QUESTIONS: QuestionSeed[] = [
  q(1, 1, "客観的勤怠打刻", "タイムカードやクラウド勤怠など、本人申告に依存しない客観的な打刻手段が全拠点で運用されていますか？", 5, {
    recommendedRole: "労務担当 / 管理職",
    taskTitle: "客観的勤怠システムの全拠点展開",
  }),
  q(1, 2, "36協定超過アラート", "36協定の上限接近を自動検知し、過重労働を放置しないアラート運用がありますか？", 5, {
    isRedCardTrigger: true,
    redCardReason: "過重労働放置（36協定超過の未管理）",
    taskTitle: "36協定超過の自動アラート導入",
    recommendedRole: "労務担当",
  }),
  q(1, 3, "ハラスメント窓口の有効周知", "ハラスメント相談窓口が社内で実効的に周知され、匿名で到達できる状態ですか？", 4, {
    recommendedRole: "人事 / コンプライアンス",
  }),
  q(1, 4, "労働条件の書面明示", "雇用時に労働条件通知書（賃金・労働時間含む）が漏れなく交付されていますか？", 4, {
    recommendedRole: "人事労務",
  }),
  q(1, 5, "年次有給休暇の取得管理", "年5日取得義務を含む有給取得状況を個人単位でモニタリングしていますか？", 4, {
    recommendedRole: "労務担当",
  }),
  q(1, 6, "就業規則の最新化", "法改正を反映した就業規則の見直しが、少なくとも年1回実施されていますか？", 3, {
    recommendedRole: "人事 / 社労士",
  }),
  q(1, 7, "外国人雇用の在留資格確認", "外国人従業員の在留資格・期限を入社時および更新時に確認する台帳運用がありますか？", 4, {
    recommendedRole: "人事労務",
  }),
  q(1, 8, "安全衛生の実施", "安全衛生委員会またはそれに代わる巡視・記録が法定どおり実施されていますか？", 3, {
    recommendedRole: "安全衛生担当",
  }),
  q(1, 9, "未払い残業の点検", "固定残業代やみなし労働が実態と乖離していないか、定期的に点検していますか？", 5, {
    recommendedRole: "労務 / 経営",
    taskPriority: "HIGH",
  }),
  q(1, 10, "育児・介護休業の周知", "育児・介護休業制度が現場まで周知され、取得実績または取得しやすい運用がありますか？", 3, {
    recommendedRole: "人事",
  }),

  q(2, 1, "多要素認証 (MFA)", "社内システムおよびクラウドサービスへのログインに多要素認証が必須化されていますか？", 5, {
    isRedCardTrigger: true,
    redCardReason: "MFA未導入",
    taskTitle: "全アカウントへのMFA必須化",
    recommendedRole: "情シス",
  }),
  q(2, 2, "退職者アカウント即時削除", "退職・契約終了当日にアカウント無効化が完了する運用（チェックリスト含む）がありますか？", 5, {
    isRedCardTrigger: true,
    redCardReason: "退職者アカウントの放置リスク",
    recommendedRole: "情シス / 人事",
  }),
  q(2, 3, "シャドーITと隔離バックアップ", "未承認SaaSの把握と、本番から隔離されたバックアップ（isolated backup）が運用されていますか？", 4, {
    recommendedRole: "情シス",
  }),
  q(2, 4, "権限の最小化", "業務上不要な管理者権限が放置されていないか、四半期ごとに棚卸ししていますか？", 4, {
    recommendedRole: "情シス",
  }),
  q(2, 5, "パスワード／秘密情報ポリシー", "共有パスワード禁止と秘密情報の保管場所が文書化され、守られていますか？", 4, {
    recommendedRole: "情シス",
  }),
  q(2, 6, "セキュリティ教育", "全社員向けのフィッシング／情報取扱い研修が年1回以上実施されていますか？", 3, {
    recommendedRole: "情シス / 人事",
  }),
  q(2, 7, "アクセスログの保全", "重要システムの認証・操作ログが改ざん困難な形で一定期間保全されていますか？", 4, {
    recommendedRole: "情シス",
  }),
  q(2, 8, "ランサムウェア復旧訓練", "バックアップからの復旧手順を、机上または実機で年1回以上試していますか？", 4, {
    recommendedRole: "情シス / BCP担当",
  }),
  q(2, 9, "端末の暗号化", "ノートPC・モバイルのディスク暗号化と紛失時の遠隔ロックが可能ですか？", 4, {
    recommendedRole: "情シス",
  }),
  q(2, 10, "脆弱性パッチ運用", "OS・ミドルウェアの重大パッチを期限付きで適用する運用がありますか？", 4, {
    recommendedRole: "情シス",
  }),

  q(3, 1, "職務分掌（Wチェック）", "振込権限と記帳権限が分離され、同一人物が完結できないダブルチェックになっていますか？", 5, {
    isRedCardTrigger: true,
    redCardReason: "職務未分離（振込と記帳の兼務）",
    recommendedRole: "経理責任者 / 経営",
  }),
  q(3, 2, "資金繰り可視化", "13週資金繰りなど、近い将来のキャッシュが見える化され、経営が週次で把握できますか？", 4, {
    recommendedRole: "経理 / 経営",
  }),
  q(3, 3, "請求書の改ざん防止", "請求書・振込先変更は原本確認と別担当者承認が必須になっていますか？", 5, {
    recommendedRole: "経理",
  }),
  q(3, 4, "小口現金・現物管理", "小口現金や金券類の残高確認が、担当者以外によって定期実施されていますか？", 3, {
    recommendedRole: "経理 / 総務",
  }),
  q(3, 5, "与信・売掛管理", "売掛の滞留と与信枠超過を月次で確認し、回収アクションが決まっていますか？", 4, {
    recommendedRole: "経理 / 営業管理",
  }),
  q(3, 6, "在庫・資産の実査", "棚卸や固定資産の実在確認が、記録付きで実施されていますか？", 3, {
    recommendedRole: "経理 / 現場",
  }),
  q(3, 7, "経費承認フロー", "交際費・高額経費に事前承認と領収書突合のルールがありますか？", 3, {
    recommendedRole: "経理",
  }),
  q(3, 8, "税務・申告カレンダー", "申告期限と証憑準備のカレンダーが経理以外の経営にも共有されていますか？", 3, {
    recommendedRole: "経理 / 税理士",
  }),
  q(3, 9, "会計不正ホットライン", "経理不正を通報できる経路が、経理部門から独立して存在しますか？", 4, {
    recommendedRole: "コンプライアンス",
  }),
  q(3, 10, "月次決算の締め", "月次決算の締め日と遅延理由の報告が定着していますか？", 3, {
    recommendedRole: "経理責任者",
  }),

  q(4, 1, "目標復旧時間 (RTO)", "基幹業務ごとに目標復旧時間（RTO）が定義され、関係者に共有されていますか？", 4, {
    recommendedRole: "BCP担当 / 経営",
  }),
  q(4, 2, "代替サプライチェーン/システム", "主要仕入先・システムの代替手段が事前に確保されていますか？", 4, {
    recommendedRole: "調達 / 情シス",
  }),
  q(4, 3, "緊急指揮系統", "災害・障害時の緊急指揮系統（代行者含む）が文書化され、連絡テスト済みですか？", 4, {
    recommendedRole: "経営 / 総務",
  }),
  q(4, 4, "安否確認手段", "従業員の安否確認ツールまたは代替連絡網が年1回以上テストされていますか？", 3, {
    recommendedRole: "総務 / 人事",
  }),
  q(4, 5, "バックアップ世代管理", "重要データのバックアップ世代と保管場所（オフサイト含む）が定義されていますか？", 4, {
    recommendedRole: "情シス",
  }),
  q(4, 6, "重要拠点の分散", "本社機能が単一拠点に依存しすぎない代替執務の想定がありますか？", 3, {
    recommendedRole: "経営 / 総務",
  }),
  q(4, 7, "備蓄・初動キット", "初動に必要な連絡先リスト・備蓄・権限代行書類がすぐ取り出せますか？", 3, {
    recommendedRole: "総務",
  }),
  q(4, 8, "BCP訓練", "机上または実働のBCP訓練が直近12か月以内に実施されていますか？", 4, {
    recommendedRole: "BCP担当",
  }),
  q(4, 9, "通信の冗長", "インターネットや電話が止まった場合の代替通信手段がありますか？", 3, {
    recommendedRole: "情シス / 総務",
  }),
  q(4, 10, "保険カバーの確認", "火災・賠償・サイバー等の保険カバーが年次で見直されていますか？", 3, {
    recommendedRole: "総務 / 経営",
  }),

  q(5, 1, "内部体制（チェックシート）", "契約・リーガル判断のための社内チェックシートや目利きルールがありますか？（無知の即死防止）", 5, {
    isRedCardTrigger: true,
    redCardReason: "法務内部体制なし（Q5-1 2段階自衛の第1段欠落）",
    recommendedRole: "法務担当 / 経営",
  }),
  q(5, 2, "外部エスカレーション", "弁護士・リーガルテック等のプロへ繋ぐ金額・リスクの閾値ルールが明文化されていますか？", 5, {
    isRedCardTrigger: true,
    redCardReason: "外部エスカレーション閾値なし（2段階自衛の第2段欠落）",
    recommendedRole: "経営 / 法務",
  }),
  q(5, 3, "雛形最新化", "フリーランス新法・下請法等を反映した契約雛形の定期見直しができていますか？", 4, {
    recommendedRole: "法務 / 外部弁護士",
  }),
  q(5, 4, "契約台帳", "締結済み契約の期限・自動更新・解約条件が台帳で追えますか？", 4, {
    recommendedRole: "法務 / 総務",
  }),
  q(5, 5, "秘密保持の運用", "NDA未締結のまま機微情報を外部に渡さないルールが現場で守られていますか？", 4, {
    recommendedRole: "法務 / 営業",
  }),
  q(5, 6, "反社・相手方確認", "新規取引先の反社チェックまたは同等の確認が手順化されていますか？", 4, {
    recommendedRole: "総務 / 法務",
  }),
  q(5, 7, "個人情報の同意取得", "個人情報の取得・委託に必要な同意と案内が最新法令に沿っていますか？", 4, {
    recommendedRole: "法務 / 情シス",
  }),
  q(5, 8, "利用規約・約款の更新", "顧客向け規約の改定履歴と告知手順が決まっていますか？", 3, {
    recommendedRole: "法務",
  }),
  q(5, 9, "下請法・フリーランス新法", "支払サイト・書面交付など下請/フリーランス新法の運用チェックがありますか？", 4, {
    recommendedRole: "法務 / 経理",
  }),
  q(5, 10, "知財・成果物の帰属", "外注・共同開発の知財帰属が契約で明確になっていますか？", 3, {
    recommendedRole: "法務 / 開発",
  }),

  q(6, 1, "業務マニュアル化", "主要業務がマニュアル化され、担当者不在でも最低限回る状態ですか？", 4, {
    recommendedRole: "現場管理職",
  }),
  q(6, 2, "離職予兆検知", "勤怠・面談・パルスサーベイ等から離職予兆を捉える仕組みがありますか？", 3, {
    recommendedRole: "人事",
  }),
  q(6, 3, "ナレッジのクラウド集約", "個人PCや口頭に散在せず、ナレッジがクラウド上に集約されていますか？", 3, {
    recommendedRole: "情シス / 現場",
  }),
  q(6, 4, "キーパーソンの後継", "売上や運営を一人に依存する業務に、後継者またはバックアップ担当がいますか？", 4, {
    recommendedRole: "経営 / 人事",
  }),
  q(6, 5, "権限委譲の文書化", "決裁権限表が最新で、不在時の代行が定義されていますか？", 3, {
    recommendedRole: "総務 / 経営",
  }),
  q(6, 6, "1on1・面談の定着", "管理職による定期面談が実施され、記録が残っていますか？", 3, {
    recommendedRole: "人事 / 管理職",
  }),
  q(6, 7, "評価制度の透明性", "評価基準が公開され、結果のフィードバックが行われていますか？", 3, {
    recommendedRole: "人事",
  }),
  q(6, 8, "兼務過多の把握", "一人が複数のクリティカル業務を兼務しすぎていないか、可視化していますか？", 4, {
    recommendedRole: "経営 / 人事",
  }),
  q(6, 9, "オンボーディング", "入社30/90日の教育チェックリストがありますか？", 3, {
    recommendedRole: "人事 / 現場",
  }),
  q(6, 10, "組織図・役割の最新化", "組織図と職務分掌が実態と一致するよう更新されていますか？", 3, {
    recommendedRole: "総務 / 経営",
  }),

  q(7, 1, "特定顧客依存度", "特定顧客への売上依存が30〜50%超になっていないか、定期的にモニタリングしていますか？", 4, {
    recommendedRole: "経営 / 営業責任者",
    ownerCategories: ["BACKOFFICE", "SALES_PROCUREMENT"],
  }),
  q(7, 2, "原価モニタリング・価格転嫁", "原価変動をモニタリングし、必要な価格転嫁の判断プロセスがありますか？", 4, {
    recommendedRole: "経営 / 経理",
  }),
  q(7, 3, "定期戦略レビュー", "少なくとも四半期ごとに経営・事業戦略のレビュー会議が実施されていますか？", 3, {
    recommendedRole: "経営",
  }),
  q(7, 4, "中期計画の文書化", "3年程度の中期方針（市場・人員・投資）が文書化されていますか？", 3, {
    recommendedRole: "経営",
  }),
  q(7, 5, "KPIの可視化", "売上・粗利・キャッシュのKPIが経営と現場で共有されていますか？", 4, {
    recommendedRole: "経営 / 管理部門",
  }),
  q(7, 6, "競合・市場モニタ", "競合・規制・需要の変化を定期的に取り込む担当がいますか？", 3, {
    recommendedRole: "経営企画 / 営業",
  }),
  q(7, 7, "新規事業のゲート", "新規投資・新規事業にGo/No-Goの判断基準がありますか？", 3, {
    recommendedRole: "経営",
  }),
  q(7, 8, "資金調達の備え", "借入枠や資金繰り悪化時の打ち手が事前に検討されていますか？", 4, {
    recommendedRole: "経営 / 経理",
  }),
  q(7, 9, "法令・政策ウォッチ", "自社に影響する法改正・補助金・規制を追う担当または顧問がいますか？", 3, {
    recommendedRole: "経営 / 総務",
  }),
  q(7, 10, "撤退・縮小の基準", "不採算事業の撤退・縮小を判断する定量基準がありますか？", 3, {
    recommendedRole: "経営",
  }),
];

if (QUESTIONS.length !== 70) {
  throw new Error(`Expected 70 questions, got ${QUESTIONS.length}`);
}

export const RED_CARD_RULES = [
  { code: "RC-OVERTIME", questionCode: "Q1-2", triggerOnUnknown: true, description: "過重労働放置" },
  { code: "RC-MFA", questionCode: "Q2-1", triggerOnUnknown: true, description: "MFA未導入" },
  { code: "RC-OFFBOARD", questionCode: "Q2-2", triggerOnUnknown: true, description: "退職者アカウント未削除" },
  { code: "RC-DUTY", questionCode: "Q3-1", triggerOnUnknown: true, description: "職務未分離" },
  { code: "RC-LEGAL-INTERNAL", questionCode: "Q5-1", triggerOnUnknown: true, description: "法務内部体制欠落" },
  { code: "RC-LEGAL-ESC", questionCode: "Q5-2", triggerOnUnknown: true, description: "外部エスカレーション欠落" },
];
