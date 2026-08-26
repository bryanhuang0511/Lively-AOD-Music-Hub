# 🌌 Desktop AOD Cyberpunk Music Hub (Lively Wallpaper)
> **全域桌面 AOD 音樂中樞：動態流光共振器 × 實時歌詞滾動 × BABYMONSTER 惡魔黑紅科技美學**

---

## 📖 專案願景 (Vision & Concept)

將手機端頂級的 **Always-On-Display (AOD) 音樂播放器體驗** 完整移植並升級至 PC 桌面！

藉由 **Lively Wallpaper** 強大的 WebGL / Canvas / Web Audio 硬體加速引擎，徹底解放 NVIDIA RTX 4060 顯卡的渲染效能，告別 Rainmeter 向量筆觸的生硬限制，實現**真正的次像素 GPU 高斯發光（True Bloom）、流體波浪角向推進、實時動態滾動歌詞與懸浮星塵微粒**！

---

## 🎨 核心模組架構設計 (System Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        🌌 Desktop AOD Canvas Layer                      │
│                                                                        │
│   ✨ 飄渺暗黑星塵微粒系統 (Ambient Embers & Space Dust Particle System)    │
│                                                                        │
│                      😈 雙獨立流體惡魔翼瓣 (Fluid Demon Wings)           │
│                     ╭───────────────────────────╮                      │
│                    │    BM 惡魔徽章 / 專輯封面    │                      │
│                    │     (808 Sub-Bass 共振跳動) │                      │
│                     ╰───────────────────────────╯                      │
│                                                                        │
│                 🎵 歌曲資訊：BABYMONSTER - SHEESH                      │
│               [ 01:24 ━━━━━━━━━●────────────────── 02:58 ]             │
│                                                                        │
│              🌟 實時流光滾動歌詞引擎 (Live Glowing Synced Lyrics)       │
│           " Got them all jumping, making them SHEESH "                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 四大核心功能模組

### 1. 😈 雙獨立流體惡魔翼瓣 (Dual-Wing Fluid Resonator)
- **角向波包位移推進（Angular Wave Propagation）**：
  - 音訊節奏落下時，能量波包自水平軸（$180^\circ$ 與 $0^\circ$）點火；
  - 波峰沿著外緣圓弧向上滑動位移至雙耳頂點（$240^\circ$ 與 $300^\circ$）；
  - 順著內側斜坡向頂部中央（$270^\circ$）匯聚收斂，以極致俐落的 V 型切口**100% 貼死在中央圓環 $(CX, CY - R)$（間距精準為 0）**！
- **真 GPU 次像素柔和發光（True Bloom & Feathering）**：
  - 多層高斯模糊（Gaussian Blur）與發光著色器，徹底告別生硬線框，呈現如液體火焰般向外暈開的頂級質感。
- **下半圓嚴格零面積**：
  - 下方（$0^\circ \sim 180^\circ$）維持純淨圓弧，完全無臃腫贅肉。

### 2. 🌟 實時動態滾動歌詞引擎 (Live Synced Lyrics Engine)
- **智慧同步滾動**：
  - 支援 LRC 格式實時解析與時間軸精準對齊；
  - 當前句以純白/緋紅高光放大置中，上一句與下一句帶有漸層半透明景深景散（Depth of Field）；
- **卡拉 OK 流光特效**：
  - 文字伴隨音樂節奏產生細微的光暈波動與粒子溢出效果。

### 3. 🎵 智慧音訊中樞與專輯呼吸 (Smart Audio Hub & Bass Resonator)
- **Lively Audio API 深度整合**：
  - 原生掛載 `window.livelyAudioListener(audioArray)`，實時捕獲 Windows 系統 128 頻段音訊流；
- **808 重低音呼吸跳動**：
  - 中央圓形 BM 徽章 / 專輯封面依據 Sub-Bass 能量等比擴散呼吸。

### 4. 🌌 沉浸式暗黑星塵背景 (Ambient Space Dust & Embers)
- 背景點綴極慢速漂浮的微光火星與星塵粒子；
- 重低音大鼓炸裂時，背景伴隨微幅的全局深緋色環境光呼吸（Subtle Ambient Flash）。

---

## 🎨 色彩與設計規範 (Design Tokens)

| 代號 | 色彩名稱 | HEX / RGBA | 用途說明 |
| :--- | :--- | :--- | :--- |
| **Obsidian** | 曜石深黑 | `#0A0B0E` / `rgba(10, 11, 14, 1.0)` | 全局背景基底與陰影沉積 |
| **Crimson** | 血月深緋 | `#D70A1E` / `rgba(215, 10, 30, 0.85)` | 翼瓣主體流體漸層與光暈充填 |
| **Demon Red**| 惡魔熾紅 | `#FF192D` / `rgba(255, 25, 45, 1.0)` | 波峰邊緣發光與脈衝高光 |
| **Platinum** | 鈦金純白 | `#FFFFFF` / `rgba(255, 255, 255, 0.95)` | 科技激光骨架、當前焦點歌詞 |
| **Dark Smoke**| 冥府血霧 | `rgba(140, 0, 10, 0.35)` | 外層漫射發光羽化層（Bloom Layer） |

---

## 📁 專案檔案結構 (Project Structure)

```text
Lively_AOD_Music_Hub/
├── README.md               # 本架構藍圖主檔
├── LivelyInfo.json         # Lively Wallpaper 桌面設定檔
├── index.html              # 桌面 AOD 主畫布頁面
├── css/
│   └── style.css           # 科技感 AOD 排版、歌詞發光與動畫樣式
├── js/
│   ├── app.js              # 主應用入口與初始化
│   ├── audio_listener.js   # Lively Audio API 128 頻段監聽引擎
│   ├── demon_visualizer.js # WebGL/Canvas 2D 雙翼流體波包渲染器
│   ├── lyrics_engine.js    # 實時歌詞滾動與解析引擎
│   └── particles.js        # 暗黑星塵微粒系統
└── assets/
    ├── BM.jpg              # 中央預設 BABYMONSTER 徽章
    ├── demo_track.mp3      # 預覽示範音訊 (選用)
    └── demo_lyrics.lrc     # 示範同步歌詞檔案 (選用)
```

---

## 🛠️ 執行與部署指引 (Deployment Guide)

1. **本機瀏覽器即時預覽 / 調校**：
   - 雙擊開啟 `index.html`，支援直接拖入本機 MP3 與 LRC 檔案進行全功能即時視聽測試。
2. **導入 Lively Wallpaper**：
   - 開啟 **Lively Wallpaper** 軟體；
   - 點擊「新增桌布（Add Wallpaper）」➜ 直接將 `Lively_AOD_Music_Hub` 資料夾拖入；
   - 立即享受 RTX 4060 硬體加速的 144FPS 全域桌面 AOD 音樂盛宴！

---
*Created by Antigravity & Partner for the Ultimate Desktop Music Experience 🌟🔥*
