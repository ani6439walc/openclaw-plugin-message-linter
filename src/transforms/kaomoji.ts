import { isLikelyKaomojiToken } from "../utils/kaomoji.js";

const KAOMOJI_ACCENT_RE = /[`´ˋˊ]/g;
const TOKEN_RE = /[^\s，。！？；：,.!?]+/gu;

export function sanitizeTokens(text: string): string {
  return text.replace(TOKEN_RE, (token) => {
    if (!token.includes("`") && !token.includes("´")) return token;

    const stripped = token.replace(KAOMOJI_ACCENT_RE, "");
    if (!isLikelyKaomojiToken(stripped) && !isLikelyKaomojiToken(token)) {
      return token;
    }

    return token.replace(/`/g, "\u02CB").replace(/´/g, "\u02CA");
  });
}
