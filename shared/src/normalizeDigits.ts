/** 全角数字(０-９)を半角数字(0-9)に変換する。数字以外の文字はそのまま。 */
export function normalizeDigits(input: string): string {
  return input.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}
