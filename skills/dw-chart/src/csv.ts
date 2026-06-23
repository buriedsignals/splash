export function dataShape(csv: string): { columns: string[]; rows: number } {
  const lines = csv.trim().split("\n");
  const columns = lines[0].split(",").map((c) => c.trim());
  return { columns, rows: Math.max(0, lines.length - 1) };
}
