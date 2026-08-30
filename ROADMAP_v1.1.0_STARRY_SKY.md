# 🌌 Lively AOD Music Hub - v1.1.0 星空時空穿梭版概念規劃書

> **專案名稱**：音樂 AOD 電腦桌布視覺播放器 (Lively AOD Music Hub)  
> **規劃版本**：`v1.1.0` (Starfield Warp Edition / 星空時空穿梭更新版)  
> **基礎版本**：`v1.0.0` (Pristine Base / 純黑黑曜石經典版)  
> **記錄日期**：2026-08-31  
> **狀態**：💡 靈感構想存檔 (Idea Backlog / Pending Development)

---

## 🎯 1. 版本定位與共存策略 (Version Strategy)

- **雙版本並存**：
  - `v1.0.0`：維持現有極致純黑、無背景干擾的黑曜石經典版本（Pristine Base）。
  - `v1.1.0`：以 `v1.0.0` 為基底新增「星空宇宙背景特效」的可選/衍生更新版本。
- **純視覺層特效**：
  - 核心播放器、3 行光學景深歌詞（LyricsEngine）、雷射光軌（AuraBeamEngine）及音訊監聽（AudioListener）架構保持 100% 相容與繼承，僅在背景層疊加動態星空粒子 Canvas。

---

## ✨ 2. 核心視覺特效構想 (Visual & Motion Concept)

### 2.1 稀疏極簡星點分佈 (Sparse Starfield)
- **點位不密集**：維持 AOD（Always-On Display）優雅深邃的留白美感，星點數量適中、不喧賓奪主，避免畫面雜亂。
- **質感星芒**：星點具備細膩的透明度變化（Alpha Fade）與柔和微光。

### 2.2 靜態/無音樂狀態：悠閒慢速漂移 (Idle Ambient Drift)
- **觸發情境**：播放器暫停、靜音或無音樂播放時。
- **動態表現**：星點以極慢且舒緩的速度悠閒浮動/漂移（Gentle Ambient Drift），營造沉靜放鬆的宇宙深空氛圍。

### 2.3 音樂震動爆發狀態：時空穿梭流線 (Warp Drive FX)
- **觸發情境**：音樂播放中，隨重低音（Bass）及整體音量（AudioLevel）振幅聯動。
- **動態表現**：
  - 畫面呈現如同**星際曲速飛行 / 時空穿梭隧道（Warp Speed / Starfield Warp）**的視覺效果。
  - 星點從畫面中心點（Center Origin）向四周外圍放射狀高速延伸拉伸、穿梭奔流。
  - 低音大鼓（Kick Drum）瞬態下潛時，流線速度與光芒長度隨之爆發拉長。

### 2.4 音樂轉弱與暫停：平滑慣性放慢 (Smooth Inertial Deceleration)
- **動態表現**：
  - 當樂曲轉入輕柔段落、尾奏或手動暫停時，穿梭流線不會突兀中斷。
  - 具備平滑阻尼與指數衰減（Inertial Decay），自然減速收攏回慢速漂移模式。

---

## 🛠️ 3. 技術實現架構預研 (Technical Architecture Draft)

```mermaid
flowchart TD
    A[AudioListener 音訊監聽] -->|即時 Bass / Master Level| B(StarfieldEngine 粒子引擎)
    B -->|無音樂 / 音量低| C[Idle Mode: 慢速 2D 平移漂移]
    B -->|重低音震動爆發| D[Warp Mode: 中心徑向 3D 穿梭噴射]
    B -->|音量平緩下降| E[Inertial Decay: 阻尼平滑減速]
    
    C --> F[Canvas 2D 背景渲染層 (z-index: 0)]
    D --> F
    E --> F
    
    F --> G[上層: 黑曜石播放器 + AuraBeam + 歌詞 (z-index: 10)]
```

### 3.1 粒子系統數學模型 (3D-to-2D Perspective Projection)
- 每個星點物件包含 3D 坐標與透視深度：
  $$\text{Star} = \{ x, y, z, pz, \text{size}, \text{alpha} \}$$
- 投影轉換：
  $$X' = \frac{x}{z} \cdot f + \text{centerX}, \quad Y' = \frac{y}{z} \cdot f + \text{centerY}$$
- 速度動態驅動：
  $$v_z = v_{\text{idle}} + \text{AudioLevel} \cdot v_{\text{warp\_scale}}$$
- 當 $z \le 0$ 時重置回遠端，並記錄上一幀投影位置 $(pX', pY')$ 以繪製放射光軌線段（Radial Warp Line）。

### 3.2 效能與硬體負載控制
- 使用輕量純原生 Canvas 2D API 繪製，嚴格控制星點總數（預估 80~150 顆）。
- 無音訊時限制重繪負載，貫徹 **近乎 0% GPU 待機消耗** 的極致效能標準。

---

## 📌 4. 後續開發 Checkpoint (Next Steps When Ready)

- [ ] 於 `js/` 目錄新增 `starfield_engine.js` 模組。
- [ ] 在 `index.html` 的背景層加入 `#starfield-canvas`。
- [ ] 整合 `audio_listener.js` 與 `starfield_engine.js` 的能量響應回調。
- [ ] 調校低密度星點的漂移速度、曲速拉伸半徑與顏色漸層。
- [ ] 驗證與現有 `v1.0.0` 的獨立切換/並存打包設定。

---
*本文件由 AI 夥伴依據語音想法完整整理建檔，待夥伴後續想要實作時即可即時調用！*
