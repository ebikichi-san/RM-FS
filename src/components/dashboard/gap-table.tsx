"use client";

type ExecRow = {
  questionCode: string;
  questionTitle: string;
  department: string;
  executiveAnswer: string | null;
  staffAnswer: string | null;
  differs: boolean;
  masked: boolean;
};

type OwnerRow = {
  questionCode: string;
  questionTitle: string;
  ownerAnswer: string | null;
  otherAnswer: string | null;
  differs: boolean;
  masked: boolean;
};

export function GapTable({ rows }: { rows: ExecRow[] }) {
  const visible = rows.filter((r) => r.executiveAnswer || r.staffAnswer || r.masked).slice(0, 24);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">設問</th>
            <th>部署</th>
            <th>経営認識</th>
            <th>現場実態</th>
            <th>視点の相違</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={`${row.questionCode}-${row.department}-${i}`} className="border-t border-white/10">
              <td className="py-2 pr-3">
                {row.questionCode} {row.questionTitle}
              </td>
              <td>{row.department}</td>
              <td>{row.masked ? "***" : row.executiveAnswer ?? "—"}</td>
              <td>{row.masked ? "***" : row.staffAnswer ?? "—"}</td>
              <td className={row.differs ? "text-rose-300" : "text-slate-400"}>
                {row.masked ? "非表示" : row.differs ? "相違あり" : "一致"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OwnerOtherGapTable({ rows }: { rows: OwnerRow[] }) {
  const visible = rows.filter((r) => r.ownerAnswer || r.otherAnswer || r.differs || r.masked).slice(0, 30);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">設問</th>
            <th>当事者部署</th>
            <th>他部署</th>
            <th>視点の相違</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.questionCode} className="border-t border-white/10">
              <td className="py-2 pr-3">
                {row.questionCode} {row.questionTitle}
              </td>
              <td>{row.masked ? "***" : row.ownerAnswer ?? "—"}</td>
              <td>{row.masked ? "***" : row.otherAnswer ?? "—"}</td>
              <td className={row.differs ? "text-rose-300" : "text-slate-400"}>
                {row.masked ? "非表示" : row.differs ? "相違あり" : "一致"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
