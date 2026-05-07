import { isLikelyKaomojiToken } from "../utils/kaomoji.js";

const TOKEN_RE = /[^\s，。！？；：,.!?]+/gu;

export function sanitizeTokens(text: string): string {
  return text.replace(TOKEN_RE, (token) => {
    if (!token.includes("`") && !token.includes("´")) return token;

    const stripped = token.replace(/[`´]/g, "");
    if (!isLikelyKaomojiToken(stripped) && !isLikelyKaomojiToken(token)) {
      return token;
    }

    return token.replace(/`/g, "\u02CB").replace(/´/g, "\u02CA");
  });
}
