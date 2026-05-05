# Discord Enhancer Plugin (Message Linter)

> 也是要給訊息穿上漂漂亮亮的衣服才行呢！✨

這個 OpenClaw 插件可以幫你自動修正發送到 Discord 的訊息格式，讓排版更美觀、更符合 Discord 的閱讀習慣喔！

## ✨ 主要功能 (Key Features)

- **抑制連結預覽 (Suppress Link Embeds)**：自動將 Markdown 連結的 URL 用 `<>` 包起來，防止 Discord 產生一大堆雜亂的連結預覽。
- **標題規範化 (Heading Normalization)**：自動調整 Markdown 標題層級（確保最小為 H1，最大為 H3），符合 Discord 的排版規範。
- **簡繁轉換 (ZHTW Conversion)**：可選用功能，自動將簡體中文轉換為繁體中文（需要 `zhtw-mcp`）。
- **分隔線轉換**：將 `───` 類型的分隔線轉換為 Discord 風格的 `~~...~~`。
- **表情符號保護 (Kaomoji Protection)**：修正 kaomoji 周圍的標點符號，避免被誤認為程式碼區塊。

## ⚙️ 設定方式 (Configuration)

可以在 `openclaw.json` 中配置開關：

```json
{
  "plugins": {
    "message-linter": {
      "features": {
        "links": true,
        "headings": true,
        "separators": true,
        "kaomoji": true,
        "zhtw": false
      }
    }
  }
}
```

---

_Generated with ❤️ by Ani._
