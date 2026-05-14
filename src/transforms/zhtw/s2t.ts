export class S2TConverter {
  private readonly phrasesByFirstChar: Map<string, Array<[string, string]>>;
  private readonly charMap: Map<string, string>;
  private readonly twVariantMap: Map<string, string>;

  constructor(
    phrases: readonly [string, string][],
    chars: readonly [string, string][],
    variants: readonly [string, string][],
  ) {
    const byFirst = new Map<string, Array<[string, string]>>();
    for (const [key, val] of phrases) {
      const first = key[0];
      let arr = byFirst.get(first);
      if (!arr) {
        arr = [];
        byFirst.set(first, arr);
      }
      arr.push([key, val]);
    }
    this.phrasesByFirstChar = byFirst;
    this.charMap = new Map(chars);
    this.twVariantMap = new Map(variants);
  }

  convert(input: string): string {
    const outChars: string[] = [];
    const protectedZones: Array<[number, number]> = [];

    let i = 0;
    while (i < input.length) {
      let matched = false;
      const candidates = this.phrasesByFirstChar.get(input[i]);

      if (candidates) {
        for (const [key, val] of candidates) {
          if (input.startsWith(key, i)) {
            const zoneStart = outChars.length;
            for (const ch of val) {
              outChars.push(ch);
            }
            protectedZones.push([zoneStart, outChars.length]);
            i += key.length;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        const ch = input[i];
        outChars.push(this.charMap.get(ch) ?? ch);
        i += 1;
      }
    }

    if (this.twVariantMap.size === 0) {
      return outChars.join("");
    }

    let result = "";
    let zoneIdx = 0;
    for (let idx = 0; idx < outChars.length; idx++) {
      const ch = outChars[idx];
      while (
        zoneIdx < protectedZones.length &&
        protectedZones[zoneIdx][1] <= idx
      ) {
        zoneIdx++;
      }
      const inZone =
        zoneIdx < protectedZones.length && idx >= protectedZones[zoneIdx][0];
      result += inZone ? ch : (this.twVariantMap.get(ch) ?? ch);
    }

    return result;
  }
}
