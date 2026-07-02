import type { MistakeCategory, SubjectName } from "shared";

export async function setMistakeGroupApi(id: string, group: 1 | 2): Promise<void> {
  const res = await fetch(`/api/mistakes/${encodeURIComponent(id)}/group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "振り分けの保存に失敗しました");
  }
}

export async function createMaterialApi(subject: SubjectName, title: string): Promise<{ id: string }> {
  const res = await fetch("/api/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, title }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "テキストの登録に失敗しました");
  }
  return res.json();
}

export interface CreateMistakePayload {
  subject: SubjectName;
  unit: string;
  theme: string;
  category: MistakeCategory;
  textTitle?: string;
  page?: string;
  source?: string;
  reason: string;
  question: string;
  note: string;
  count: number;
  date: string;
}

export async function createMistakeApi(payload: CreateMistakePayload): Promise<{ id: string }> {
  const res = await fetch("/api/mistakes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "間違いの保存に失敗しました");
  }
  return res.json();
}
