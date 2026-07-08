const API = "https://api.datawrapper.de/v3";

function token(): string {
  const t = process.env.DATAWRAPPER_API_TOKEN;
  if (!t)
    throw new Error("DATAWRAPPER_API_TOKEN is not set (see /atelier/.env)");
  return t;
}
function auth(extra: Record<string, string> = {}): Record<string, string> {
  return { Authorization: `Bearer ${token()}`, ...extra };
}

export async function createChart(
  title: string,
  type: string,
): Promise<string> {
  const r = await fetch(`${API}/charts`, {
    method: "POST",
    headers: auth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ title, type }),
  });
  if (!r.ok) throw new Error(`createChart ${r.status}: ${await r.text()}`);
  return (await r.json()).id as string;
}

export async function setData(id: string, csv: string): Promise<void> {
  const r = await fetch(`${API}/charts/${id}/data`, {
    method: "PUT",
    headers: auth({ "Content-Type": "text/csv" }),
    body: csv,
  });
  if (!r.ok) throw new Error(`setData ${r.status}: ${await r.text()}`);
}

export async function patchChart(id: string, patch: object): Promise<void> {
  const r = await fetch(`${API}/charts/${id}`, {
    method: "PATCH",
    headers: auth({ "Content-Type": "application/json" }),
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`patchChart ${r.status}: ${await r.text()}`);
}

export async function publishChart(id: string): Promise<string> {
  const r = await fetch(`${API}/charts/${id}/publish`, {
    method: "POST",
    headers: auth(),
  });
  if (!r.ok) throw new Error(`publishChart ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (
    (j?.data?.publicUrl as string) ?? `https://www.datawrapper.de/_/${id}/`
  );
}

export async function exportPng(
  id: string,
  outPath: string,
  width = 600,
  height?: number,
): Promise<number> {
  // The DW export API pins the render box when BOTH width and height are given; with
  // width only it falls back to the chart's own natural aspect (the FINDING-2 defect).
  const dims = `width=${width}` + (height ? `&height=${height}` : "");
  const r = await fetch(
    `${API}/charts/${id}/export/png?unit=px&mode=rgb&${dims}&plain=false`,
    {
      headers: auth(),
    },
  );
  if (!r.ok) throw new Error(`exportPng ${r.status}: ${await r.text()}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  await Bun.write(outPath, buf);
  return buf.byteLength;
}

export async function deleteChart(id: string): Promise<void> {
  await fetch(`${API}/charts/${id}`, { method: "DELETE", headers: auth() });
}
