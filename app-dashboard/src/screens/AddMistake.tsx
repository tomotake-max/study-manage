import { useState, useRef } from "react";
import type { DashboardData, MistakeCategory, SubjectName } from "shared";
import { SectionTitle } from "../chrome/SectionTitle";
import { Button } from "../ui/Button";
import { Pill } from "../ui/Pill";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

// Declare global types for Google API (gapi = Picker library, google.accounts = Google Identity Services for OAuth)
declare global {
  var gapi: any;
  interface Window {
    google: any;
  }
  interface ImportMeta {
    env: {
      VITE_GOOGLE_CLIENT_ID: string;
      VITE_GOOGLE_API_KEY: string;
    };
  }
}

// Cache the GIS token client and any access token already granted this session,
// so we don't show the Google consent popup on every click.
let gisTokenClient: any = null;
let cachedAccessToken: string | null = null;

function getAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (cachedAccessToken) {
      resolve(cachedAccessToken);
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services がまだ読み込まれていません。少し待って再試行してください。"));
      return;
    }
    if (!gisTokenClient) {
      gisTokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: () => {}, // overridden per-request below
      });
    }
    gisTokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(new Error(resp.error));
        return;
      }
      cachedAccessToken = resp.access_token;
      resolve(resp.access_token);
    };
    gisTokenClient.requestAccessToken({ prompt: cachedAccessToken ? "" : "consent" });
  });
}

const CATEGORIES: MistakeCategory[] = ["テキスト", "復習テスト", "公開テスト"];
const SUBJECTS: SubjectName[] = ["算数", "国語", "理科", "社会"];

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  background: "var(--surface)",
  color: "var(--ink)",
  padding: "9px 12px",
  fontFamily: "var(--font-body)",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontFamily: "var(--font-body)",
  fontSize: 13,
  color: "var(--ink-soft)",
  fontWeight: 600,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

interface UploadSlotProps {
  icon: string;
  label: string;
  hint: string;
  onFileSelected: (file: File, preview: string) => void;
  /** 答案・解答など、先に見えると直しの意味がなくなる写真用。
   *  選択後は伏せ字（ぼかし）表示にし、クリックでその場限り表示する。 */
  concealAfterSelect?: boolean;
}

function UploadSlot({ icon, label, hint, onFileSelected, concealAfterSelect }: UploadSlotProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConcealed = concealAfterSelect && preview && !revealed;

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const previewUrl = event.target?.result as string;
        setPreview(previewUrl);
        setRevealed(false);
        onFileSelected(file, previewUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const openGooglePicker = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    if (!clientId || !apiKey) {
      alert("Google API の設定 (.env.local) が見つかりません");
      return;
    }

    setIsLoading(true);
    try {
      const accessToken = await getAccessToken(clientId);
      await loadPickerLibrary();
      showPicker(accessToken, apiKey);
    } catch (error) {
      console.error("Google 認証に失敗しました:", error);
      alert("Google ドライブへの接続に失敗しました。もう一度お試しください。");
      setIsLoading(false);
    }
  };

  const loadPickerLibrary = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!gapi) {
        reject(new Error("Google API スクリプトが読み込まれていません"));
        return;
      }
      if ((window as any).google?.picker) {
        resolve();
        return;
      }
      gapi.load("picker", { callback: () => resolve(), onerror: () => reject(new Error("Picker の読み込みに失敗しました")) });
    });
  };

  const showPicker = (accessToken: string, apiKey: string) => {
    const picker = new (window as any).google.picker.PickerBuilder()
      .addView((window as any).google.picker.ViewId.DOCS_IMAGES)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data: any) => pickerCallback(data, accessToken))
      .build();
    picker.setVisible(true);
    // Picker UI is now shown; clear the button's loading state.
    setIsLoading(false);
  };

  const pickerCallback = (data: any, accessToken: string) => {
    if (data.action === (window as any).google.picker.Action.PICKED) {
      const file = data.docs[0];
      setIsLoading(true);
      downloadDriveFile(file, accessToken);
    }
  };

  const downloadDriveFile = async (file: any, accessToken: string) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const driveFile = new File([blob], file.name, { type: blob.type });

      const reader = new FileReader();
      reader.onload = (event) => {
        const previewUrl = event.target?.result as string;
        setPreview(previewUrl);
        setRevealed(false);
        onFileSelected(driveFile, previewUrl);
        setIsLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error downloading file from Drive:", error);
      alert("ファイルのダウンロードに失敗しました");
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {preview && (
        <div
          style={{
            position: "relative",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            border: "1px solid var(--line)",
          }}
        >
          <img
            src={preview}
            alt="Preview"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: 200,
              objectFit: "cover",
              display: "block",
              filter: isConcealed ? "blur(18px)" : "none",
              transform: isConcealed ? "scale(1.1)" : "none",
              transition: "filter var(--dur) var(--ease-organic)",
            }}
          />
          {isConcealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                border: "none",
                background: "rgba(44,42,38,0.35)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily: "var(--font-body)",
              }}
            >
              <Icon name="eye" size={22} />
              <span style={{ fontSize: 13 }}>クリックして表示</span>
            </button>
          )}
          {!isConcealed && concealAfterSelect && (
            <button
              type="button"
              onClick={() => setRevealed(false)}
              title="もう一度隠す"
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                border: "none",
                borderRadius: "var(--radius-pill)",
                background: "rgba(44,42,38,0.55)",
                color: "#fff",
                cursor: "pointer",
                padding: "4px 8px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontFamily: "var(--font-body)",
              }}
            >
              <Icon name="eye-off" size={12} /> 隠す
            </button>
          )}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          style={{
            border: "1px dashed var(--line-strong)",
            background: "var(--surface-sunken)",
            borderRadius: "var(--radius-md)",
            height: preview ? 80 : 150,
            width: "100%",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "grid",
            placeItems: "center",
            color: "var(--ink-faint)",
            transition: "all var(--dur) var(--ease-organic)",
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <div style={{ textAlign: "center", fontFamily: "var(--font-body)" }}>
            <Icon name={icon} size={preview ? 20 : 26} />
            <div style={{ marginTop: 4, fontSize: preview ? 12 : 14, color: "var(--ink-soft)" }}>
              {isLoading ? "読み込み中..." : "ファイルを選択"}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={openGooglePicker}
          disabled={isLoading}
          style={{
            border: "1px dashed var(--line-strong)",
            background: "var(--surface-sunken)",
            borderRadius: "var(--radius-md)",
            height: preview ? 80 : 150,
            width: "100%",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "grid",
            placeItems: "center",
            color: "var(--ink-faint)",
            transition: "all var(--dur) var(--ease-organic)",
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <div style={{ textAlign: "center", fontFamily: "var(--font-body)" }}>
            <Icon name="cloud" size={preview ? 20 : 26} />
            <div style={{ marginTop: 4, fontSize: preview ? 12 : 14, color: "var(--ink-soft)" }}>
              {isLoading ? "読み込み中..." : "Google ドライブ"}
            </div>
          </div>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLocalFileSelect}
        style={{ display: "none" }}
      />
      {preview && (
        <button
          type="button"
          onClick={() => {
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          style={{
            border: "none",
            background: "none",
            color: "var(--ink-soft)",
            cursor: "pointer",
            fontSize: 12,
            textDecoration: "underline",
            padding: 0,
          }}
        >
          削除
        </button>
      )}
    </div>
  );
}

export function AddMistake(props: { data: DashboardData; onBack: () => void }) {
  const { reasons } = props.data;
  const [cat, setCat] = useState<MistakeCategory>(CATEGORIES[0]);
  const [subject, setSubject] = useState<SubjectName>(SUBJECTS[0]);
  const [reason, setReason] = useState<string>(reasons[0] ?? "");
  const [unit, setUnit] = useState("");
  const [theme, setTheme] = useState("");
  const [source, setSource] = useState("");
  const [question, setQuestion] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [photo1, setPhoto1] = useState<File | null>(null);
  const [photo1Preview, setPhoto1Preview] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<File | null>(null);
  const [photo2Preview, setPhoto2Preview] = useState<string | null>(null);

  const isText = cat === "テキスト";

  function handleSave() {
    // In Phase 1, files are stored in state but not actually persisted
    // In Phase 2, these would be uploaded to a server or storage service
    console.log("Saving mistake with photos:", {
      photo1: photo1?.name,
      photo2: photo2?.name,
    });
    setSaved(true);
    setTimeout(() => props.onBack(), 700);
  }

  const handlePhoto1Selected = (file: File, preview: string) => {
    setPhoto1(file);
    setPhoto1Preview(preview);
  };

  const handlePhoto2Selected = (file: File, preview: string) => {
    setPhoto2(file);
    setPhoto2Preview(preview);
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <button
        type="button"
        onClick={props.onBack}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "var(--ink-soft)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-body)",
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        <Icon name="arrow-left" size={16} /> 間違い直しに戻る
      </button>

      <SectionTitle eyebrow="New entry · 間違いを記録" title="間違えた問題を追加" />

      <Card style={{ padding: 32 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>どこで間違えた？ · カテゴリ</div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 22 }}>
          {CATEGORIES.map((c) => (
            <Pill key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </Pill>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <Field label="科目">
            <select style={fieldStyle} value={subject} onChange={(e) => setSubject(e.target.value as SubjectName)}>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label={isText ? "単元" : "出題範囲"}>
            <input
              style={fieldStyle}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={isText ? "速さ" : "速さ・旅人算"}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
          <Field label={isText ? "細目（テーマ）" : "テスト名"}>
            <input
              style={fieldStyle}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={isText ? "追い越し" : "第18回 復習テスト"}
            />
          </Field>
          <Field label={isText ? "出典 · ページ" : "日付"}>
            <input
              style={fieldStyle}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={isText ? "速さテキスト p.32" : "6/21"}
            />
          </Field>
        </div>

        <div style={{ marginTop: 22 }}>
          <Field label="問題のタイトル">
            <input
              style={fieldStyle}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="兄が弟を追い越すのにかかる時間"
            />
          </Field>
        </div>

        <div style={{ marginTop: 26 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>アップロード · テキスト と テスト</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <div style={labelStyle}>{isText ? "テキストの該当箇所" : "問題用紙"}</div>
              <UploadSlot icon="book-open" label={isText ? "テキストの該当箇所" : "問題用紙"} hint="クリックして写真を追加" onFileSelected={handlePhoto1Selected} />
            </div>
            <div>
              <div style={labelStyle}>答案・解答用紙</div>
              <UploadSlot
                icon="file-text"
                label="答案・解答用紙"
                hint="間違えた答案を追加"
                onFileSelected={handlePhoto2Selected}
                concealAfterSelect
              />
            </div>
          </div>
        </div>

        <div style={{ margin: "28px 0", borderTop: "1px solid var(--line)" }} />

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>間違いの理由</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {reasons.map((r) => (
              <Pill key={r} active={reason === r} onClick={() => setReason(r)}>
                {r}
              </Pill>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Field label="わからなかったところ・気づき">
            <textarea
              style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.6 }}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="追い越しは『差÷速さの差』。和で割らないよう注意。"
            />
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 28 }}>
          {saved && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--success)",
                fontFamily: "var(--font-body)",
                fontSize: 14,
              }}
            >
              <Icon name="check-circle" size={16} /> 保存しました
            </span>
          )}
          <Button variant="ghost" onClick={props.onBack}>
            キャンセル
          </Button>
          <Button variant="solid" iconLeft={<Icon name="check" size={16} />} onClick={handleSave}>
            間違いを保存
          </Button>
        </div>
      </Card>
    </div>
  );
}
