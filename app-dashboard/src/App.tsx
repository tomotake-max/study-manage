import { useEffect, useState } from "react";
import type { DashboardData, SubjectName } from "shared";
import { loadData } from "./data";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./chrome/TopBar";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Dashboard } from "./screens/Dashboard";
import { Mistakes } from "./screens/Mistakes";
import { AddMistake } from "./screens/AddMistake";
import { Materials } from "./screens/Materials";
import { Calendar } from "./screens/Calendar";

type Page = "home" | "mistakes" | "add" | "materials" | "calendar";

const TITLES: Record<Page, { sub: string; title: string }> = {
  home: { sub: "Overview · ようこそ", title: "おかえりなさい、くるみさん" },
  mistakes: { sub: "Mistakes · 間違いノート", title: "間違い直し" },
  add: { sub: "Mistakes · 新規記録", title: "間違いを追加" },
  materials: { sub: "Library · テキストとテスト", title: "テキスト・テスト" },
  calendar: { sub: "Calendar · 学習記録", title: "学習カレンダー" },
};

export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [matSubject, setMatSubject] = useState<string>("all");

  useEffect(() => {
    loadData().then(setData);
  }, []);

  if (!data) return <div style={{ padding: 40 }}>読み込み中…</div>;

  const reload = () => { loadData().then(setData); };

  const updateData = (updater: (d: DashboardData) => DashboardData) => {
    setData((prev) => (prev ? updater(prev) : prev));
  };

  const go = (p: string, opts?: { subject?: string }) => {
    if (opts && opts.subject) setMatSubject(opts.subject);
    setPage(p as Page);
  };

  const onSubjectClick = (subject: SubjectName) => {
    setMatSubject(subject);
    setPage("materials");
  };

  let screen;
  if (page === "home") screen = <Dashboard data={data} />;
  else if (page === "mistakes") screen = <Mistakes data={data} onAdd={() => go("add")} onDataChange={updateData} reload={reload} />;
  else if (page === "add") screen = <AddMistake data={data} onBack={() => go("mistakes")} reload={reload} />;
  else if (page === "materials") screen = <Materials data={data} subject={matSubject} />;
  else screen = <Calendar data={data} />;

  const t = TITLES[page];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--canvas)" }}>
      <Sidebar data={data} page={page} onNavigate={go} onSubjectClick={onSubjectClick} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <TopBar
            title={t.title}
            subtitle={t.sub}
            right={
              <>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--ink-soft)",
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                  }}
                >
                  <Icon name="calendar-clock" size={16} color="var(--gold-deep)" /> {data.nextTest.name}まで{" "}
                  {data.nextTest.daysLeft} 日
                </span>
                <Button variant="solid" size="sm" iconLeft={<Icon name="plus" size={15} />} onClick={() => go("add")}>
                  記録する
                </Button>
              </>
            }
          />
        </div>
        <main style={{ flex: 1, padding: "32px 36px 56px", maxWidth: 1200, width: "100%", boxSizing: "border-box" }}>
          {screen}
        </main>
      </div>
    </div>
  );
}
