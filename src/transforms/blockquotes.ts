export function formatBlockquotes(text: string): string {
  return text.replace(/^>(?![ \t])/gm, "> ");
}
