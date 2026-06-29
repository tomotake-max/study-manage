import { useEffect, useState } from "react";
import type { DashboardData } from "shared";
import { loadData } from "./data";
export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  useEffect(() => { loadData().then(setData); }, []);
  if (!data) return <div style={{ padding: 40 }}>読み込み中…</div>;
  return <pre>{JSON.stringify(data.subjects, null, 2)}</pre>;
}
