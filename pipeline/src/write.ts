import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { SubjectName, MistakeCategory } from "shared";

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function sanitizeForFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "").trim();
}

export async function setMistakeGroup(vaultDir: string, id: string, group: 1 | 2): Promise<void> {
  if (id.includes("/") || id.includes("\\")) {
    throw new Error("invalid id");
  }
  const dir = path.join(vaultDir, "間違い");
  const file = path.join(dir, `${id}.md`);
  if (path.dirname(file) !== dir) {
    throw new Error("invalid id");
  }
  const raw = await readFile(file, "utf8");
  const parsed = matter(raw);
  parsed.data.group = group;
  await writeFile(file, matter.stringify(parsed.content, parsed.data), "utf8");
}

export async function createMaterialStub(
  vaultDir: string,
  subject: SubjectName,
  title: string,
): Promise<{ id: string }> {
  const dir = path.join(vaultDir, "教材");
  await mkdir(dir, { recursive: true });
  const id = sanitizeForFilename(title);
  if (id === "") {
    throw new Error("title required");
  }
  const file = path.join(dir, `${id}.md`);
  if (await fileExists(file)) return { id };

  const frontmatter = {
    type: "text",
    subject,
    title,
    publisher: "",
    material_type: "book",
    today_done: 0,
    themes: [],
  };
  await writeFile(file, matter.stringify("", frontmatter), "utf8");
  return { id };
}

export interface CreateMistakeInput {
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
  questionPhotoDataUrl?: string;
  answerPhotoDataUrl?: string;
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

function decodeDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    throw new Error("invalid data URL");
  }
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function savePhoto(
  vaultDir: string,
  id: string,
  suffix: "question" | "answer",
  dataUrl: string,
): Promise<string> {
  const { mimeType, buffer } = decodeDataUrl(dataUrl);
  const ext = extensionForMimeType(mimeType);
  const dir = path.join(vaultDir, "間違い", "attachments");
  await mkdir(dir, { recursive: true });
  const filename = `${id}-${suffix}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return filename;
}

export async function createMistake(
  vaultDir: string,
  fields: CreateMistakeInput,
): Promise<{ id: string }> {
  const dir = path.join(vaultDir, "間違い");
  await mkdir(dir, { recursive: true });

  const isoDate = new Date().toISOString().slice(0, 10);
  const base = sanitizeForFilename(`${isoDate}-${fields.unit || fields.theme}-${fields.theme}`);
  if (base === "") {
    throw new Error("unit/theme required");
  }
  let id = base;
  let n = 2;
  while (await fileExists(path.join(dir, `${id}.md`))) {
    id = `${base}-${n}`;
    n++;
  }

  const frontmatter: Record<string, unknown> = {
    subject: fields.subject,
    unit: fields.unit,
    theme: fields.theme,
    category: fields.category,
    reason: fields.reason,
    question: fields.question,
    count: fields.count,
    date: fields.date,
    group: 1,
  };
  if (fields.category === "テキスト") {
    frontmatter.text_title = fields.textTitle ?? "";
    frontmatter.page = fields.page ?? "";
  } else {
    frontmatter.source = fields.source ?? "";
  }

  if (fields.questionPhotoDataUrl) {
    frontmatter.question_photo = await savePhoto(vaultDir, id, "question", fields.questionPhotoDataUrl);
  }
  if (fields.answerPhotoDataUrl) {
    frontmatter.answer_photo = await savePhoto(vaultDir, id, "answer", fields.answerPhotoDataUrl);
  }

  await writeFile(path.join(dir, `${id}.md`), matter.stringify(fields.note ?? "", frontmatter), "utf8");
  return { id };
}
