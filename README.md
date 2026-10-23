# 🎵 音樂AOD電腦桌布視覺播放器 (v1.5.0)

> **作品名稱**：音樂AOD電腦桌布視覺播放器 (Lively AOD Music Hub)  
> **作者**：原來如此>_<  
> **版本**：v1.5.0 (144Hz/60Hz 智慧變頻 ✖ 離屏星芒圖集 ✖ OpenCC 正體秒翻 ✖ 84% CPU 降載版)  
> **適用平台**：Windows 10 / 11 ✖ Lively Wallpaper ✖ WebView2  
> **授權協議**：MIT License  

---

## 📖 專案簡介 (Overview)

專為 Windows PC 打造的**極致純黑（OLED AOD）黑曜石液態玻璃音樂視覺播放器**。
以純黑背景（`#000000`）為基底，結合動態星空粒子漫遊/曲速穿梭引擎、物理級周長弧長積分雷射光軌、Rainmeter 專屬 14 倍動態速差調速引擎、單向無限循環平滑跑馬燈、以及 3 行光學景深同步歌詞，提供 24/7 常駐且低 CPU/GPU 負載的極致視覺體驗。

---

## 🌟 核心特性 (Key Features - v1.5.0)

1. **⚡ v1.5.0 極致 CPU/GPU 降載架構（單幀耗時大幅下降，0 漸層配置）**：
   - **播放 144Hz / 待機 60Hz 智慧變頻 (`Adaptive Frame Pacing`)**：音樂播放與曲速穿梭時全速釋放 144Hz 原生極致絲滑；暫停與待機時自動平滑切換至 60Hz，直接省下 58% 待機幀數。
   - **100% 純白向量星芒批次繪製 (`Pure-White Batched Vector Engine`)**：徹底剔除藍色色偏與模糊點陣貼圖，待機與曲速全面採用 100% 純白向量路徑批次繪製（全畫面僅 3 次繪圖呼叫），零漸層物件建立，零垃圾回收抖動。
   - **預烘焙光譜色彩池 (`Pre-Baked Chroma Styles`)**：`AuraBeamEngine` 啟動時一次性完成 180 階色彩插值與字串建構，消除每幀 45 次 `createLinearGradient` 與 180 次座標物件分配。
   - **穩定流暢景深圖層**：維持 3 行光學景深歌詞零晃動，並移除 96% 純黑膠囊底層看不見的 `backdrop-filter: blur(28px)`，大幅減輕 GPU/CPU 合成負載。
2. **🇹🇼 內建 OpenCC 臺灣正體秒翻引擎 (`S2TConverter`)**：
   - 內建 2,705 字教育部標準正體字表與歌詞語境詞庫（自動精準轉換 `頭髮/發現`、`後來/天后`、`夜裡/千里`、`吹乾`、`一隻`、`捨不得` 等），無論抓到 QQ 音樂或網易雲簡體歌詞皆在 `< 0.05ms` 內自動轉為臺灣正體中文。
3. **🎤 LyricsPlus 逐字同步引擎 ✖ LRCLIB 智慧候選評分 (LyricsEngine v1.5)**：
   - **雙源並聯抓取**：整合 `YTM_Immersion` 核心 `LyricsPlus` 鏡像群（支援 Apple Music / QQ / Musixmatch 官方毫秒級逐字 `syllabus` 時間軸）與 `LRCLIB` 雙引擎並聯檢索。
   - **智慧歌名拆解與頻道降噪 (`cleanTrackInfo`)**：自動剔除 YouTube `- Topic`、`Official MV`、`[MV]` 等雜訊，並從組合標題（如 `"BABYMONSTER - 'DESERVE' M/V"`、`"歌手 【歌名】"`）中精準分離純淨歌名與演出者。
   - **多維度候選評分 (`pickBestLrcLibHit`)**：依據曲長吻合度（誤差 $\le 2.5\text{s}$ 優先加權）、歌名/歌手精準度進行智慧排序，自動排除 `Remix`、`Live`、`Instrumental` 或殘缺歌詞。
   - **支援 `[offset:+/-ms]` 與 `<mm:ss.xx>` 增強型標籤**，並支援在歌詞區直接以**滑鼠滾輪上下微調時間差（`±0.25s`，中鍵歸零）**。
4. **⏩ 零寬字元 GSMTC 快轉隱寫隧道 ✖ 開頭首秒自校正 (Zero-Width Fast-Forward & Early Auto-Calibration)**：
   - **突破 Chromium 與 Lively Wallpaper 原生無法偵測快轉/拉進度條之限制**：內建 [`tools/browser_sync_extension`](tools/browser_sync_extension) 輕量級瀏覽器擴充功能，利用不可見零寬字元（`\u200B`/`\u200C`）將 `<video>` 即時毫秒進度隱寫入 `navigator.mediaSession.metadata.artist`，快轉或拉動進度條時瞬間同步。
   - **歌曲開頭自動校準（解決首秒開唱對位問題）**：新曲開頭自動於 1.2s 與 3.2s 發送微秒校準脈衝，確保網路歌詞下載完成瞬間立即對齊至目前正確秒數；順暢播放期完全零背景額外請求，徹底杜絕 CPU 浪費。
   - **抒情留白時間補償 (`PlaybackSession`)**：修正 GSMTC 中途刷新歸零問題，並針對歌曲間奏/氣音留白（$< 5\text{s}$）自動補償流逝秒數，確保全曲零落後。
5. **🌌 動態星空粒子 ✖ 重低音曲速穿梭 (StarfieldEngine)**：
   - 待機常態下以柔和慢速飄逸與微芒閃爍，徹底剔除高開銷 `shadowBlur` 濾鏡。
   - 重低音大鼓下潛爆發時，無延遲進入 **$32\text{ px/frame}$ 星空曲速穿梭 (Star Warp Stream)**！
6. **💫 雙層視窗剪裁 ✖ 單向無限循環跑馬燈 ✖ 30 秒分級智慧休眠協議**：
   - 嚴格由右向左（Right-to-Left）單向無限循環滾動；待機狀態下膠囊內部 0 文字純黑極致沉浸，400ms 音訊抗噪濾波杜絕 Windows 系統提示音誤喚醒。

---

## 📚 開發架構與維護指南 (Documentation)

詳細的物理公式推導、DSP 調速演算法、模組職責及維護說明，請詳閱：
👉 **[ARCHITECTURE_AND_MAINTENANCE_GUIDE.md](ARCHITECTURE_AND_MAINTENANCE_GUIDE.md)**

---

## 🚀 安裝與使用 (Installation)

### 1. 安裝 Lively 動態桌布主體
1. 下載最新極速版 [Lively_AOD_Music_Hub_v1.5.0.zip](Lively_AOD_Music_Hub_v1.5.0.zip)（穩定保底版 [Lively_AOD_Music_Hub_v1.4.0.zip](Lively_AOD_Music_Hub_v1.4.0.zip) 亦同步保留）。
2. 安裝並啟動 [Lively Wallpaper](https://rocksdanister.github.io/lively/)。
3. 將 `Lively_AOD_Music_Hub_v1.5.0.zip` 直接拖入 Lively Wallpaper 視窗中。
4. 在庫中點擊 **「音樂AOD電腦桌布視覺播放器」** 即可套用為全域動態桌布！

### 2. 啟用瀏覽器「快轉 / 拉進度條」毫秒級同步（選裝）
若要在 YouTube Music、YouTube 或 Spotify 網頁版獲得「拉動進度條瞬間同步歌詞」體驗：
1. 打開 Chrome 或 Edge 瀏覽器，網址列輸入 `chrome://extensions`（或 `edge://extensions`）。
2. 開啟右上角的 **「開發人員模式 (Developer mode)」**。
3. 點選左上角 **「載入未封裝項目 (Load unpacked)」**，選擇本專案下的 [`tools/browser_sync_extension`](tools/browser_sync_extension) 資料夾即可（零背景常駐程式、零額外記憶體負擔，直接透過 Windows 原生 GSMTC 通道秒級同步快轉進度！）。
