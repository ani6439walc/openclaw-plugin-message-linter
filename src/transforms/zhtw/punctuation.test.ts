import { describe, expect, it } from "vitest";
import { applyPunctuationRules } from "./punctuation.js";

describe("zhtw punctuation rules", () => {
  it("normalizes common half-width punctuation in Chinese context", () => {
    const input = "你好,世界!真的嗎?版本:測試;請看(說明).";
    expect(applyPunctuationRules(input)).toBe(
      "你好，世界！真的嗎？版本：測試；請看（說明）。",
    );
  });

  it("recognizes supplementary-plane Han punctuation context", () => {
    expect(applyPunctuationRules("𠀀, next 𠀀. next 𠀀! next")).toBe(
      "𠀀， next 𠀀。 next 𠀀！ next",
    );
    expect(applyPunctuationRules("𠀀 text, next")).toBe("𠀀 text， next");
    expect(applyPunctuationRules("𠀀(foo)")).toBe("𠀀（foo）");
  });

  it("does not rewrite raw URLs, email addresses, or English sentences", () => {
    const input =
      "URL https://example.com/api?v=1.2, email admin@test.com, English: Hello, world! 中文,測試。";
    expect(applyPunctuationRules(input)).toBe(
      "URL https://example.com/api?v=1.2, email admin@test.com, English: Hello, world! 中文，測試。",
    );
  });

  it("does not rewrite English sentences ending with parenthesized text", () => {
    expect(applyPunctuationRules("This is a test (English). 中文結束.")).toBe(
      "This is a test (English). 中文結束。",
    );
  });

  it("normalizes periods after English terms in Chinese sentences", () => {
    expect(applyPunctuationRules("我買了 iPhone. 版本是 iOS 18.")).toBe(
      "我買了 iPhone。 版本是 iOS 18。",
    );
  });

  it("normalizes repeated ASCII periods into a full-width ellipsis", () => {
    expect(applyPunctuationRules("等等......真的嗎...好吧.")).toBe(
      "等等……真的嗎……好吧。",
    );
  });

  it("normalizes sentence-ending periods after protected URLs", () => {
    expect(applyPunctuationRules("請看 https://example.com.")).toBe(
      "請看 https://example.com。",
    );
  });

  it("preserves numeric thousands separators", () => {
    expect(applyPunctuationRules("共有 1,000 筆資料")).toBe(
      "共有 1,000 筆資料",
    );
  });

  it("normalizes Chinese parenthetical pairs without mixing widths", () => {
    expect(applyPunctuationRules("請看(說明).")).toBe("請看（說明）。");
    expect(applyPunctuationRules("中文(foo)範例")).toBe("中文（foo）範例");
  });

  it("preserves function-call-like ASCII parentheses", () => {
    expect(applyPunctuationRules("呼叫 foo(中文) 取得結果.")).toBe(
      "呼叫 foo(中文) 取得結果。",
    );
  });

  it("preserves half-width punctuation in embedded Latin clauses", () => {
    expect(
      applyPunctuationRules(
        "審查者只回了「I agree, 但這樣還不夠完整」，於是我們補上了測試計畫。",
      ),
    ).toBe(
      "審查者只回了「I agree, 但這樣還不夠完整」，於是我們補上了測試計畫。",
    );

    expect(
      applyPunctuationRules(
        "Write programs that do one thing and do it well,\n\n這句話出自 Unix 哲學",
      ),
    ).toBe(
      "Write programs that do one thing and do it well,\n\n這句話出自 Unix 哲學",
    );

    expect(
      applyPunctuationRules(
        "工程師問「Are you sure this works?」我們才決定重新跑一次",
      ),
    ).toBe("工程師問「Are you sure this works?」我們才決定重新跑一次");

    expect(
      applyPunctuationRules(
        "記錄檔只留下 file not found: 請先確認掛載點是否正確。",
      ),
    ).toBe("記錄檔只留下 file not found: 請先確認掛載點是否正確。");

    expect(
      applyPunctuationRules("他寫下 make it work; 之後才談效能與可讀性。"),
    ).toBe("他寫下 make it work; 之後才談效能與可讀性。");
  });

  it("converts punctuation after single borrowed Latin terms and title-cased proper names", () => {
    expect(
      applyPunctuationRules("這個伺服器需要 Docker,才能部署整套環境。"),
    ).toBe("這個伺服器需要 Docker，才能部署整套環境。");

    expect(applyPunctuationRules("團隊只用 Windows 11,沒有其他選擇。")).toBe(
      "團隊只用 Windows 11，沒有其他選擇。",
    );

    expect(
      applyPunctuationRules("我們用 Visual Studio Code,開發整個前端專案。"),
    ).toBe("我們用 Visual Studio Code，開發整個前端專案。");

    expect(
      applyPunctuationRules("這臺伺服器跑的是 nginx,不是別的網頁伺服器。"),
    ).toBe("這臺伺服器跑的是 nginx，不是別的網頁伺服器。");

    expect(applyPunctuationRules("他說, I agree")).toBe("他說， I agree");
  });
});
