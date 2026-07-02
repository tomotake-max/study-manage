import { glob } from "glob";
import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  TextMaterial, TestNote, MistakeNote, ReportNote, SubjectName,
} from "shared";

export interface ParsedVault {
  texts: TextMaterial[]; tests: TestNote[]; mistakes: MistakeNote[]; reports: ReportNote[];
}

function category(file: string): "text" | "test" | "mistake" | "report" | null {
  if (file.includes("/教材/")) return "text";
  if (file.includes("/テスト/")) return "test";
  if (file.includes("/間違い/")) return "mistake";
  if (file.includes("/報告/")) return "report";
  return null;
}

export async function parseVault(vaultDir: string): Promise<ParsedVault> {
  const files = await glob("**/*.md", { cwd: vaultDir, absolute: true });
  const out: ParsedVault = { texts: [], tests: [], mistakes: [], reports: [] };
  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;
    const content = parsed.content.trim();
    const id = path.basename(file, ".md");
    const norm = file.split(path.sep).join("/");
    switch (category(norm)) {
      case "text": out.texts.push({
        id, subject: fm.subject as SubjectName, title: fm.title as string,
        publisher: fm.publisher as string, materialType: fm.material_type as "book" | "serial",
        todayDone: (fm.today_done as number) ?? 0,
        themes: fm.themes as TextMaterial["themes"],
        volumesTotal: fm.volumes_total as number | undefined,
        current: fm.current as TextMaterial["current"],
        volumes: fm.volumes as number[] | undefined,
      }); break;
      case "test": out.tests.push({
        id, kind: fm.kind as TestNote["kind"], subject: fm.subject as TestNote["subject"],
        name: fm.name as string, date: String(fm.date), range: fm.range as string,
        score: fm.score as number | undefined, deviation: fm.deviation as number | undefined,
        subjectDev: fm.subject_dev as TestNote["subjectDev"], done: Boolean(fm.reviewed),
      }); break;
      case "mistake": {
        const isTextCategory = fm.category === "テキスト";
        const textTitle = isTextCategory ? (fm.text_title as string | undefined) : undefined;
        const page = isTextCategory ? (fm.page as string | undefined) : undefined;
        const source = textTitle
          ? `${textTitle}${page ? ` p.${page}` : ""}`
          : (fm.source as string);
        out.mistakes.push({
          id, subject: fm.subject as SubjectName, unit: fm.unit as string, theme: fm.theme as string,
          category: fm.category as MistakeNote["category"], source,
          textTitle, page,
          reason: fm.reason as string, question: fm.question as string,
          note: content, count: (fm.count as number) ?? 1,
          date: String(fm.date), group: (fm.group as 1 | 2) ?? 1,
        });
        break;
      }
      case "report": out.reports.push({
        date: String(fm.date), plan: (fm.plan as ReportNote["plan"]) ?? [],
        studyMinutes: (fm.study_minutes as ReportNote["studyMinutes"]) ?? {},
        note: content,
      }); break;
    }
  }
  return out;
}
