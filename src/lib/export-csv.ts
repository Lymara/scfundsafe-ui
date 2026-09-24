import type { StudentDto } from "@/lib/api";

type Cell = string | number | null | undefined;

const YEAR_LABELS: Record<number, string> = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };

/** Quote a cell for CSV, and neutralise spreadsheet formula injection (=, +, -, @). */
function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Triggers a browser download. The BOM makes Excel read the file as UTF-8 (e.g. "Ñ" in names). */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Student dues roster: Student Number, Full Name, Year Level, Section, Total Due, Total Paid, Balance, Status. */
export function studentsToCsv(students: StudentDto[]): string {
  return buildCsv(
    ["Student Number", "Full Name", "Year Level", "Section", "Total Due", "Total Paid", "Balance", "Status"],
    students.map((s) => [
      s.studentNumber,
      s.fullName,
      YEAR_LABELS[s.yearLevel] ?? String(s.yearLevel),
      s.section ?? "",
      s.totalDue.toFixed(2),
      s.totalPaid.toFixed(2),
      s.balance.toFixed(2),
      s.status,
    ]),
  );
}
