/**
 * A data table styled to look right both on screen (dark theme, "surface"
 * card) and on a printed page (forced to black-on-white via the global
 * @media print rules in styles.css). Shared by Reports and the Settings
 * audit trail so every printable list in the app looks consistent.
 */
export function PrintTable({
  head,
  rows,
  align,
  foot,
  dense,
  amountColorRows,
}: {
  head: string[];
  rows: string[][];
  align?: ("left" | "right")[];
  foot?: string[];
  dense?: boolean;
  amountColorRows?: ("emerald" | "destructive")[];
}) {
  const cellClass = (i: number) => (align?.[i] === "right" ? "text-right" : "text-left");
  const pad = dense ? "px-3 py-2 print:px-1.5 print:py-1" : "px-4 py-2.5 print:px-2 print:py-1.5";

  return (
    <div className="surface overflow-hidden print:border print:border-black/20 print:rounded-none print:shadow-none print:bg-transparent">
      <table className="w-full text-xs md:text-sm print:w-full print:table-fixed">
        <thead>
          <tr className="eyebrow text-left bg-muted/40 print:bg-black/5 print:tracking-normal">
            {head.map((h, i) => (
              <th key={h} className={`${pad} font-semibold print:text-[8px] print:text-black print:font-bold print:break-words ${cellClass(i)}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70 print:divide-black/10">
          {rows.map((row, ri) => (
            <tr key={ri} className="print-avoid-break">
              {row.map((cell, ci) => {
                const isAmountCol = ci === row.length - 1 && amountColorRows;
                const colorCls = isAmountCol
                  ? amountColorRows[ri] === "emerald"
                    ? "text-emerald print:text-black print:font-medium"
                    : "text-destructive print:text-black print:font-medium"
                  : "";
                return (
                  <td key={ci} className={`${pad} mono print:font-sans print:text-[9px] print:text-black print:break-words ${cellClass(ci)} ${colorCls}`}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="border-t-2 border-border font-semibold print:border-black/40">
              {foot.map((f, i) => (
                <td key={i} className={`${pad} mono print:font-sans print:text-[9px] print:text-black print:break-words ${cellClass(i)}`}>
                  {f}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
