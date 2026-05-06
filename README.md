# Message Linter

> 也是要給訊息穿上漂漂亮亮的衣服才行呢！✨

這個 OpenClaw 插件可以幫你自動修正發送到通訊軟體的訊息格式，讓排版更美觀、更符合閱讀習慣喔！

## 🚀 前置條件 (Prerequisites)

若要啟用 **簡繁轉換 (ZHTW Conversion)** 功能，您必須在系統中安裝 `zhtw-mcp` 執行檔：

1. **下載與安裝**：請前往 [wei840222/zhtw-mcp](https://github.com/wei840222/zhtw-mcp) 依照說明進行安裝。
2. **路徑配置**：確保 `zhtw-mcp` 執行檔位於您的 `PATH` 中，或放置於 `~/.local/bin/zhtw-mcp`。

## ✨ 主要功能 (Key Features)

- **抑制連結預覽 (Suppress Link Embeds)**：自動將 Markdown 連結的 URL 用 `<>` 包起來，防止產生雜亂的位址預覽。這對於含有多個連結的訊息特別有用。
- **標題規範化 (Heading Normalization)**：自動調整 Markdown 標題層級，確保最小為 H1，最大為 H3，讓排版更具層次感。
- **高品質簡繁轉換 (ZHTW Conversion)**：利用 `zhtw-mcp` 進行上下文感知的轉換（lexical contextual），並支援台灣正體中文習慣（ROC-centric）與歐化中文檢測。
- **分隔線美化**：將 `───` 或等效的分隔線自動轉換為更美觀的樣式。
- **表情符號保護 (Kaomoji Protection)**：修正 Kaomoji (例如 `(＞///＜)`) 周圍的格式，避免因標點符號問題被誤判為程式碼區塊。包含針對重音符號與反引號的淨化最佳化。
- **區塊引用格式化 (Blockquote Formatting)**：支援 Discord 相容的區塊引用解析與轉換。

## ⚙️ 設定方式 (Configuration)

請在您的 `openclaw.json` (或插件配置區塊) 中進行設定：

```json
{
  "plugins": {
    "message-linter": {
      "features": {
        "links": true,
        "headings": true,
        "separators": true,
        "kaomoji": true,
        "zhtw": true 
      }
    }
  }
}
```

> **注意**：`zhtw` 功能預設為關閉，請在確認安裝 `zhtw-mcp` 後手動開啟。

---

_Generated with ❤️ by Ani._
