import { fmtDateTime } from "@/lib/format";
import type { RateHistoryRow } from "../queries/rate-queries";

function fmtRate(value: number): string {
  return value.toLocaleString("es-MX", { maximumFractionDigits: 4 });
}

export function RateHistoryList({ history, baseCode }: { history: RateHistoryRow[]; baseCode: string }) {
  if (history.length === 0) {
    return <p className="text-[12.5px] text-slate-400">Sin cambios registrados.</p>;
  }
  return (
    <ol className="flex flex-col divide-y divide-line-soft">
      {history.map((h) => (
        <li key={h.historyId} className="flex items-start justify-between gap-4 py-2.5 text-[12.5px]">
          <div className="min-w-0">
            <p className="tabular font-medium text-ink">
              {h.oldRate != null && (
                <span className="text-slate-400 line-through">{fmtRate(h.oldRate)}</span>
              )}
              {h.oldRate != null && " → "}
              {fmtRate(h.newRate)} {baseCode}
            </p>
            {h.note && <p className="mt-0.5 truncate text-slate-500">{h.note}</p>}
          </div>
          <div className="flex-none text-right text-slate-400">
            <p className="tabular">{fmtDateTime(h.changedAt)}</p>
            {h.changedBy && <p className="truncate">{h.changedBy}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
