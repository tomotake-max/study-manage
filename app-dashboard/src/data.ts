import type { DashboardData } from "shared";
export async function loadData(): Promise<DashboardData> {
  const res = await fetch("/data.json");
  if (!res.ok) throw new Error("data.json not found — run `pnpm build:data`");
  return res.json();
}
