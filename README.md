# 🎵 音樂AOD電腦桌布視覺播放器 (v1.4.0)

> **作品名稱**：音樂AOD電腦桌布視覺播放器 (Lively AOD Music Hub)  
> **作者**：原來如此>_<  
> **版本**：v1.4.0 (LyricsPlus 逐字同步引擎 ✖ GSMTC 快轉隱寫通道 ✖ 92% 繪圖降載效能版)  
> **適用平台**：Windows 10 / 11 ✖ Lively Wallpaper ✖ WebView2  
> **授權協議**：MIT License  

---

## 📖 專案簡介 (Overview)

專為 Windows PC 打造的**極致純黑（OLED AOD）黑曜石液態玻璃音樂視覺播放器**。
以純黑背景（`#000000`）為基底，結合動態星空粒子漫遊/曲速穿梭引擎、物理級周長弧長積分雷射光軌、Rainmeter 專屬 14 倍動態速差調速引擎、單向無限循環平滑跑馬燈、以及 3 行光學景深同步歌詞，提供 24/7 常駐且低 CPU/GPU 負載的極致視覺體驗。

---

## 🌟 核心特性 (Key Features - v1.4.0)

1. **🎤 LyricsPlus 逐字同步引擎 ✖ LRCLIB 智慧候選評分 (LyricsEngine v1.4)**：
   - **雙源並聯抓取**：整合 `YTM_Immersion` 核心 `LyricsPlus` 鏡像群（支援 Apple Music / QQ / Musixmatch 官方毫秒級逐字 `syllabus` 時間軸）與 `LRCLIB` 雙引擎並聯檢索。
   - **智慧歌名拆解與頻道降噪 (`cleanTrackInfo`)**：自動剔除 YouTube `- Topic`、`Official MV`、`[MV]` 等雜訊，並從組合標題（如 `"BABYMONSTER - 'DESERVE' M/V"`、`"歌手 【歌名】"`）中精準分離純淨歌名與演出者。
   - **多維度候選評分 (`pickBestLrcLibHit`)**：依據曲長吻合度（誤差 $\le 2.5\text{s}$ 優先加權）、歌名/歌手精準度進行智慧排序，自動排除 `Remix`、`Live`、`Instrumental` 或殘缺歌詞。
   - **支援 `[offset:+/-ms]` 與 `<mm:ss.xx>` 增強型標籤**，並支援在歌詞區直接以**滑鼠滾輪上下微調時間差（`±0.25s`，中鍵歸零）**。
2. **⏩ 零伺服器 GSMTC 快轉隱寫通道 ✖ 本機時間軸橋接 (Fast-Forward Timeline Sync)**：
   - **突破 Lively Wallpaper 原生無法偵測快轉/拉進度條之限制**：內建 [`tools/browser_sync_extension`](tools/browser_sync_extension) 輕量級瀏覽器擴充功能（Zero-Server GSMTC Metadata Tunnel），利用 `navigator.mediaSession.metadata.album` 隱寫傳遞 `<video>` 即時毫秒進度，無須開啟任何背景伺服器即可讓 YouTube Music / YouTube 快轉瞬間對齊。
   - **抒情留白時間補償 (`PlaybackSession`)**：修正 GSMTC 中途刷新歸零問題，並針對歌曲間奏/氣音留白（$< 5\text{s}$）自動補償流逝秒數，確保全曲零落後。
3. **⚡ 92% Draw Call 繪圖降載 ✖ 零 GC 記憶體池 (AuraBeamEngine)**：
   - 採用批次連續多邊形漸變路徑繪製，描邊呼叫從每幀 540 次驟降至 45~50 次（降幅 92%）。
   - 預先配置靜態點與顏色物件池，徹底消滅每秒數萬個物件的垃圾回收（GC）抖動。
4. **🌌 動態星空粒子 ✖ 重低音曲速穿梭 (StarfieldEngine)**：
   - 待機常態下以柔和慢速飄逸與微芒閃爍，徹底剔除高開銷 `shadowBlur` 濾鏡。
   - 重低音大鼓下潛爆發時，無延遲進入 **$32\text{ px/frame}$ 星空曲速穿梭 (Star Warp Stream)**！
5. **💫 雙層視窗剪裁 ✖ 單向無限循環跑馬燈 (True-Width Clipping & Marquee Loop)**：
   - 解決超長歌名（如 YouTube MV / K-Pop 曲目）截斷與黑屏 Bug。
   - 嚴格由右向左（Right-to-Left）單向無限循環滾動，開頭與結尾智慧停頓，平滑淡入淡出。
6. **💎 1.2X 純黑黑曜石液態玻璃 ✖ 30 秒分級智慧休眠協議**：
   - 待機狀態下膠囊內部 0 文字純黑極致沉浸，400ms 音訊抗噪濾波杜絕 Windows 系統提示音誤喚醒。

---

## 📚 開發架構與維護指南 (Documentation)

詳細的物理公式推導、DSP 調速演算法、模組職責及維護說明，請詳閱：
👉 **[ARCHITECTURE_AND_MAINTENANCE_GUIDE.md](ARCHITECTURE_AND_MAINTENANCE_GUIDE.md)**

---

## 🚀 安裝與使用 (Installation)

### 1. 安裝 Lively 動態桌布主體
1. 下載 [Lively_AOD_Music_Hub_v1.4.0.zip](Lively_AOD_Music_Hub_v1.4.0.zip)。
2. 安裝並啟動 [Lively Wallpaper](https://rocksdanister.github.io/lively/)。
3. 將 `Lively_AOD_Music_Hub_v1.4.0.zip` 直接拖入 Lively Wallpaper 視窗中。
4. 在庫中點擊 **「音樂AOD電腦桌布視覺播放器」** 即可套用為全域動態桌布！

### 2. 啟用瀏覽器「快轉 / 拉進度條」毫秒級同步（選裝）
若要在 YouTube Music、YouTube 或 Spotify 網頁版獲得「拉動進度條瞬間同步歌詞」體驗：
1. 打開 Chrome 或 Edge 瀏覽器，網址列輸入 `chrome://extensions`（或 `edge://extensions`）。
2. 開啟右上角的 **「開發人員模式 (Developer mode)」**。
3. 點選左上角 **「載入未封裝項目 (Load unpacked)」**，選擇本專案下的 [`tools/browser_sync_extension`](tools/browser_sync_extension) 資料夾即可（零背景常駐程式、零額外記憶體負擔，直接透過 Windows 原生 GSMTC 通道秒級同步快轉進度！）。
