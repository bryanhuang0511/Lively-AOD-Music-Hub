# 🚀 Lively AOD Music Hub v1.2.0 深度優化與架構規範記錄檔

> **建立時間**：2026-08-31 21:45
> **核心目標**：記錄夥伴實測反饋的全部問題、底層根因、修復演算法與 30 秒極致純黑待機規範。

---

## 📋 一、夥伴反饋問題與需求清單 (Issue & Requirements)

### 1. 🐞 跑馬燈（Marquee）重大顯示 Bug
- **現象**：超長歌名（如 YouTube MV、BABYMONSTER 等）滾動時，未顯現的後半段字沒有跑出來，反而直接變成黑屏或消失。
- **根本原因**：
  - `.capsule-title` 自身同時設定了 `max-width: 650px` 與 `overflow: hidden`。
  - 當文字移動時，移動的是被限制在 650px 內的截斷內容，導致超出的文字根本沒有被瀏覽器排版渲染，直接被裁掉。
- **修復方案**：
  - **雙層容器架構 (Two-Layer Box Model)**：
    - 外層視窗容器 `.capsule-title-wrapper`：`max-width: 620px; overflow: hidden; white-space: nowrap;`
    - 內層文字元素 `.capsule-title`：`display: inline-block; white-space: nowrap; max-width: none;`
  - **平滑循環跑馬燈演算法**：
    - 精確計算 `overflow = scrollWidth - clientWidth`。
    - 若 `overflow > 10px`，動態綁定 CSS 動畫：停頓 2.5 秒 ➔ 平滑位移 `-overflow` 像素露出所有未顯示文字 ➔ 停頓 2.5 秒 ➔ 平滑返回起點。

---

### 2. 🌌 待機時膠囊「0 文字極致純黑」規範 (Pure Obsidian Standby)
- **規範細節**：
  - 待機（STANDBY）時，膠囊內部**不需要顯示任何字（包含 `STANDBY`、`AOD MUSIC HUB` 一律消隱）**！
  - 膠囊內部維持 **100% 深邃黑曜石透明玻璃狀態**，歌詞區域也為 **100% 純黑**。
  - **外圍呼吸的 RGB 恆定弧長雷射光軌** 與 **背景星空粒子** 依然優雅漫遊與呼吸。
  - 當有系統聲音時，才顯現 `PURE AUDIO STREAM` / `SYSTEM AUDIO`；當有音樂時，顯現歌名與歌手。

---

### 3. ⏱️ 30 秒分級休眠與音源切換協定 (30s Tiered Sleep Protocol)
- **規範細節**：
  - **0 ~ 30 秒短暫暫停**：
    - 視為一般暫停，保留當前歌曲資訊與歌詞畫面，方便使用者短暫暫停。
    - 若在 30 秒內重新播放，大概率是同一首歌，歌詞無縫繼續推進。
  - **> 30 秒無音訊 / 關閉音樂軟體**：
    - 自動進入「30 秒極致純黑待機休眠」。
    - 膠囊內字體平滑消隱（0 文字），歌詞清空（純黑）。
  - **休眠後切換至其他音源（YouTube 影片 / 遊戲 / 系統音效）**：
    - 由於已過 30 秒脫鉤，電腦發出聲音時自動以 `PURE AUDIO STREAM` 啟動，絕不誤跑上一首已關閉歌曲的歌詞！

---

## 🛠️ 二、實作檔案清單 (Implementation Map)

| 檔案路徑 | 修改目的 |
| :--- | :--- |
| `index.html` | 在膠囊內部建立 `.capsule-title-wrapper` 視窗剪裁容器。 |
| `css/style.css` | 重構跑馬燈雙層 CSS 樣式與待機 0 文字純黑樣式。 |
| `js/app.js` | 實裝 30 秒休眠倒數計時器、跑馬燈真實寬度計算器、待機文字消隱控制器。 |
| `js/lyrics_engine.js` | 確保待機時歌詞區域 100% 純黑消隱。 |
| `LivelyInfo.json` | 維護版本號與發布資訊。 |
