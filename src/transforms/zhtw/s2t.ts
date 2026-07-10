interface TrieNode {
  children: Map<string, TrieNode>;
  value: string;
}

function buildTrie(phrases: readonly [string, string][]): TrieNode {
  const root: TrieNode = { children: new Map(), value: "" };
  for (const [key, val] of phrases) {
    let node = root;
    for (const ch of key) {
      let child = node.children.get(ch);
      if (!child) {
        child = { children: new Map(), value: "" };
        node.children.set(ch, child);
      }
      node = child;
    }
    if (!node.value) node.value = val;
  }
  return root;
}

export class S2TConverter {
  private readonly trieRoot: TrieNode;
  private readonly charMap: Map<string, string>;
  private readonly twVariantMap: Map<string, string>;

  constructor(
    phrases: readonly [string, string][],
    chars: readonly [string, string][],
    variants: readonly [string, string][],
  ) {
    this.trieRoot = buildTrie(phrases);
    this.charMap = new Map(chars);
    this.twVariantMap = new Map(variants);
  }

  convert(input: string): string {
    const inputChars = Array.from(input);
    const outChars: string[] = [];
    const protectedSet = new Set<number>();

    let i = 0;
    while (i < inputChars.length) {
      let bestEnd = 0;
      let bestVal = "";

      let node = this.trieRoot;
      let j = i;
      while (j < inputChars.length) {
        const ch = inputChars[j];
        const child = node.children.get(ch);
        if (!child) break;
        node = child;
        if (node.value) {
          bestEnd = j - i + 1;
          bestVal = node.value;
        }
        j += 1;
      }

      if (bestEnd > 0) {
        const zoneStart = outChars.length;
        for (const ch of bestVal) outChars.push(ch);
        for (let k = zoneStart; k < outChars.length; k++) protectedSet.add(k);
        i += bestEnd;
      } else {
        const ch = inputChars[i];
        outChars.push(this.charMap.get(ch) ?? ch);
        i += 1;
      }
    }

    if (this.twVariantMap.size === 0) {
      return outChars.join("");
    }

    const parts: string[] = [];
    for (let idx = 0; idx < outChars.length; idx++) {
      const ch = outChars[idx];
      parts.push(
        protectedSet.has(idx) ? ch : (this.twVariantMap.get(ch) ?? ch),
      );
    }
    return parts.join("");
  }
}
