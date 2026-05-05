const KAOMOJI_SYMBOLS_RE =
  /[・ω▽＞＜￣＿｡•ˇ‸╬◣д◢ノ゜Д︵╥﹏∀≧◡≦☆★✧⊙°ロΣ⌒ˊˋ´⁄＼／＊〃σᴗ̀́۶ᕦᕤᓫงวᐛ｡]/u;

function looksLikeKaomoji(content: string): boolean {
  if (content.length > 25) return false;
  return KAOMOJI_SYMBOLS_RE.test(content);
}

export function sanitizeTokens(text: string): string {
  return text.replace(/[^\s]+/g, (token) => {
    if (!token.includes("`") && !token.includes("´")) return token;

    const stripped = token.replace(/[`´]/g, "");
    if (!looksLikeKaomoji(stripped) && !looksLikeKaomoji(token)) return token;

    return token.replace(/`/g, "\u02CB").replace(/´/g, "\u02CA");
  });
}
