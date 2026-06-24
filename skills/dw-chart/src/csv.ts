export function dataShape(csv: string): { columns: string[]; rows: number } {
  const lines = csv.trim().split("\n");
  const columns = lines[0].split(",").map((c) => c.trim());
  return { columns, rows: Math.max(0, lines.length - 1) };
}

export function sortCsv(csv: string, dir: "asc" | "desc"): string {
  const lines = csv.trim().split("\n");
  const header = lines[0];
  const rows = lines.slice(1).map((l) => l.split(","));
  const lastIdx = header.split(",").length - 1;
  rows.sort((a, b) => {
    const d = Number(a[lastIdx]) - Number(b[lastIdx]);
    return dir === "desc" ? -d : d;
  });
  return [header, ...rows.map((r) => r.join(","))].join("\n");
}
