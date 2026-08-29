# 🎵 音樂AOD電腦桌布視覺播放器 (v1.0.0)

> **作品名稱**：音樂AOD電腦桌布視覺播放器  
> **作者**：原來如此>_<  
> **版本**：v1.0.0 (Pristine Base Release)  
> **適用平台**：Windows 10 / 11 ✖ Lively Wallpaper ✖ WebView2  
> **授權協議**：MIT License  

---

## 📖 專案簡介 (Overview)

專為 Windows PC 打造的**極致純黑（OLED AOD）黑曜石液態玻璃音樂視覺播放器**。
以純黑背景（`#000000`）為基底，結合物理級周長弧長積分雷射光軌、Rainmeter 專屬 14 倍動態速差調速引擎、以及 3 行光學景深同步滾動歌詞，提供 24/7 常駐且「0% GPU 待機負載」的極致視覺體驗。

---

## 🌟 核心特性 (Key Features)

1. **💎 1.2X 純黑黑曜石液態玻璃 (Deep Obsidian Glass)**：
   - 移除所有多餘雜質與灰色夾層，呈現深邃純黑晶體質感，內建動態液態鏡面折射光澤（Specular Sheen）。
2. **🌌 物理周長等弧長雷射光軌 (AuraBeamEngine)**：
   - 徹底解決極坐標拉伸與縮短畸變，在直線與轉彎處**100% 絕對鎖定為 500px 恆定長度**。
   - 單一路徑向量漸層渲染，**0 圓點、0 鋸齒階梯、兩端自然消隱**。
3. **🎛️ Rainmeter `AudioLevel` 14.1 倍動態調速 (DSP Engine)**：
   - **30ms 瞬態爆發 (Attack)**：重低音大鼓 Kick 下潛瞬間飆速至 $1345 \sim 1665\text{ px/s}$。
   - **330ms 慣性滑行 (Decay)**：鼓點過後平滑指數衰減回 $95\text{ px/s}$ 舒緩巡航。
4. **🎤 3 行光學景深同步歌詞 (LyricsEngine)**：
   - **0ms 根節點極速銷毀**：換曲瞬間第 0 毫秒秒清舊歌，徹底消滅畫面重疊。
   - **首句即時時間戳對齊**：新歌下載完成瞬間即刻對齊，絕不錯過第 1 秒歌詞。
   - **尾奏 100% 純黑消隱**：最後一句唱完 4 秒後自動全數淡出，螢幕乾淨純黑無殘影。
5. **⚡ 0% 零負載硬體加速**：
   - 純原生 HTML5 + Vanilla CSS3 + Canvas 2D，常駐記憶體僅約 30MB，CPU/GPU 佔用近乎 0.0%。

---

## 📚 開發架構與維護指南 (Documentation)

詳細的物理公式推導、DSP 調速演算法、模組職責及未來二開注意事項，請詳閱：
👉 **[ARCHITECTURE_AND_MAINTENANCE_GUIDE.md](file:///c:/Users/yexia/Documents/ShihWei/NTNU/GitHub/視覺動態效果/PC/Lively_AOD_Music_Hub/ARCHITECTURE_AND_MAINTENANCE_GUIDE.md)**

---

## 🚀 安裝與使用 (Installation)

1. 安裝並啟動 [Lively Wallpaper](https://rocksdanister.github.io/lively/)。
2. 將打包好的 `Lively_AOD_Music_Hub.zip` 直接拖入 Lively Wallpaper 視窗中。
3. 在庫中點擊 **「音樂AOD電腦桌布視覺播放器」** 即可套用為全域動態桌布！
