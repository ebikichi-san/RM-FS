import Link from "next/link";
import { ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { HERO_SUBTEXT, HERO_TITLE } from "@/lib/copy";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-16">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Chinese Wall · Autonomous PDCA</p>
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">{HERO_TITLE}</h1>
        <p className="max-w-2xl text-slate-300">{HERO_SUBTEXT}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/assess/demo"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 font-semibold text-slate-950"
          >
            デモ診断を開始 <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/demo"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3"
          >
            ダッシュボード
          </Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <ShieldAlert className="mb-3 h-5 w-5 text-rose-300" />
          <h2 className="font-semibold">重大リスク（即応）</h2>
          <p className="mt-2 text-sm text-slate-400">
            MFA未導入・職務未分離・過重労働の未管理・法務内部体制なしなどは、総合点に関係なく即応対象とします。
          </p>
        </Card>
        <Card>
          <Sparkles className="mb-3 h-5 w-5 text-sky-300" />
          <h2 className="font-semibold">認識ギャップ</h2>
          <p className="mt-2 text-sm text-slate-400">
            経営認識と現場実態の視点の相違を率で示します。36%以上は未把握リスクとして要観察・要補強です。
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">3階層アクセス</h2>
          <p className="mt-2 text-sm text-slate-400">
            プラットフォームは生ログ保持、Partnerは属性クロス、クライアントはマスク済みサマリー。
          </p>
        </Card>
      </div>
    </main>
  );
}
