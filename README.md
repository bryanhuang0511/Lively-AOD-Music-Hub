# 🎵 音樂AOD電腦桌布視覺播放器 (v1.2.0)

> **作品名稱**：音樂AOD電腦桌布視覺播放器 (Lively AOD Music Hub)  
> **作者**：原來如此>_<  
> **版本**：v1.2.0 (智慧同步抗噪 ✖ 星空曲速 ✖ 單向無限跑馬燈版)  
> **適用平台**：Windows 10 / 11 ✖ Lively Wallpaper ✖ WebView2  
> **授權協議**：MIT License  

---

## 📖 專案簡介 (Overview)

專為 Windows PC 打造的**極致純黑（OLED AOD）黑曜石液態玻璃音樂視覺播放器**。
以純黑背景（`#000000`）為基底，結合動態星空粒子漫遊/曲速穿梭引擎、物理級周長弧長積分雷射光軌、Rainmeter 專屬 14 倍動態速差調速引擎、單向無限循環平滑跑馬燈、以及 3 行光學景深同步歌詞，提供 24/7 常駐且「0% GPU 待機負載」的極致視覺體驗。

---

## 🌟 核心特性 (Key Features - v1.2.0)

1. **🌌 動態星空粒子 ✖ 重低音曲速穿梭 (StarfieldEngine)**：
   - 待機與常態下以 $0.45\text{ px/frame}$ 柔和慢速漂移。
   - 重低音大鼓下潛爆發時，無延遲進入 **$32\text{ px/frame}$ 星空曲速穿梭 (Star Warp Stream)**，粒子拉伸為流線星軌！
2. **💫 雙層視窗剪裁 ✖ 單向無限循環跑馬燈 (True-Width Clipping & Marquee Loop)**：
   - 解決超長歌名（如 YouTube MV / K-Pop 曲目）截斷與黑屏 Bug。
   - 嚴格由右向左（Right-to-Left）單向無限循環滾動，開頭與結尾智慧停頓，平滑淡入淡出。
3. **💎 1.2X 純黑黑曜石液態玻璃 (Deep Obsidian Glass)**：
   - 待機（STANDBY）狀態下膠囊內部 0 文字純黑極致沉浸，短歌名與長歌名自適應黃金比例置中排版。
4. **🛡️ 400ms 音訊抗噪濾波器 ✖ 30 秒分級智慧休眠協議**：
   - 杜絕 Windows 系統提示音、短音效誤喚醒。
   - 1.6 秒進入短暫暫停（保留當前歌詞畫面）；30 秒無音訊自動進入 0 文字純黑 AOD 休眠。
5. **🎤 3 行光學景深同步歌詞 (LyricsEngine)**：
   - 首句毫秒級時間戳對齊、前奏鎖定保護、尾奏 100% 純黑消隱，支援即時點擊跳轉校準。
6. **⚡ 0% 零負載硬體加速**：
   - 純原生 HTML5 + Vanilla CSS3 + Canvas 2D，常駐記憶體僅約 30MB，CPU/GPU 佔用近乎 0.0%。

---

## 📚 開發架構與維護指南 (Documentation)

詳細的物理公式推導、DSP 調速演算法、模組職責及維護說明，請詳閱：
👉 **[ARCHITECTURE_AND_MAINTENANCE_GUIDE.md](file:///c:/Users/yexia/Documents/ShihWei/NTNU/GitHub/視覺動態效果/PC/Lively_AOD_Music_Hub/ARCHITECTURE_AND_MAINTENANCE_GUIDE.md)**

---

## 🚀 安裝與使用 (Installation)

1. 下載 [Lively_AOD_Music_Hub_v1.2.0.zip](file:///c:/Users/yexia/Documents/ShihWei/NTNU/GitHub/視覺動態效果/PC/Lively_AOD_Music_Hub/Lively_AOD_Music_Hub_v1.2.0.zip)。
2. 安裝並啟動 [Lively Wallpaper](https://rocksdanister.github.io/lively/)。
3. 將 `Lively_AOD_Music_Hub_v1.2.0.zip` 直接拖入 Lively Wallpaper 視窗中。
4. 在庫中點擊 **「音樂AOD電腦桌布視覺播放器」** 即可套用為全域動態桌布！
