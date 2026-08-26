-- ==========================================================
-- 🌊 South-to-North Wave Engine for Rainmeter
-- Propagates audio wave pulses from South Pole (Bottom 90 deg) 
-- up along both flanks to North Pole (Top 270 deg), forming 
-- the twin ears that converge and shrink into the center dip!
-- ==========================================================

local CX, CY, R
local S_Outer, S_Mid, S_Inner, S_Core
local HistoryLength = 32
local BassHistory = {}
local DelayStep = 1.35 -- Controls wave propagation speed from South to North

local angles_deg = {
    [0]=90,
    [1]=75, [2]=60, [3]=45, [4]=30, [5]=15, [6]=0, [7]=345, [8]=330, [9]=315, [10]=300, [11]=285,
    [12]=270,
    [13]=255, [14]=240, [15]=225, [16]=210, [17]=195, [18]=180, [19]=165, [20]=150, [21]=135, [22]=120, [23]=105
}

-- Gain profile along distance d (0=South Pole, 12=North Pole)
local Gains = {
    [0] = 2.15, -- South Pole Bass surge
    [1] = 1.85,
    [2] = 1.55,
    [3] = 1.25,
    [4] = 0.95,
    [5] = 0.75,
    [6] = 0.70, -- Equator / Waist
    [7] = 0.75,
    [8] = 0.95,
    [9] = 1.35,
    [10] = 2.35, -- Ear Peak (300 / 240 deg)
    [11] = 1.45, -- Ear Inner Slope
    [12] = 0.18  -- North Pole Center Dip (Swoops inward & vanishes)
}

function Initialize()
    CX = tonumber(SKIN:GetVariable("CX", "320"))
    CY = tonumber(SKIN:GetVariable("CY", "320"))
    R = tonumber(SKIN:GetVariable("R", "96"))

    S_Outer = tonumber(SKIN:GetVariable("S_Outer", "75"))
    S_Mid = tonumber(SKIN:GetVariable("S_Mid", "54"))
    S_Inner = tonumber(SKIN:GetVariable("S_Inner", "36"))
    S_Core = tonumber(SKIN:GetVariable("S_Highlight", "20"))

    for i = 1, HistoryLength do
        BassHistory[i] = 0.0
    end
end

function Update()
    -- 1. Read instantaneous audio measurements
    local mBass = SKIN:GetMeasure("M0")
    local rawBass = mBass and mBass:GetValue() or 0.0
    
    local mS10 = SKIN:GetMeasure("S10")
    local treble = mS10 and mS10:GetValue() or 0.0

    -- Shift history buffer
    table.remove(BassHistory, HistoryLength)
    table.insert(BassHistory, 1, rawBass)

    -- 2. Compute wave displacement for all 24 nodes
    local disp = {}
    local totalEnergy = 0.0

    for d = 0, 12 do
        -- Interpolate historical bass value at fractional delay
        local delayIdx = 1 + d * DelayStep
        local idxFloor = math.floor(delayIdx)
        local idxCeil = math.min(idxFloor + 1, HistoryLength)
        local frac = delayIdx - idxFloor

        local val1 = BassHistory[idxFloor] or 0.0
        local val2 = BassHistory[idxCeil] or 0.0
        local delayedVal = val1 * (1 - frac) + val2 * frac

        -- Add direct treble boost to the ears (d=10, 11) for instantaneous snappy responsiveness
        if d == 10 then
            delayedVal = delayedVal + treble * 0.45
        elseif d == 11 then
            delayedVal = delayedVal + treble * 0.30
        end

        local h = delayedVal * Gains[d]
        totalEnergy = totalEnergy + h

        -- Right flank (indices 0..12)
        disp[d] = h
        -- Left flank (mirrored indices 0, 23..12)
        if d > 0 and d < 12 then
            disp[24 - d] = h
        end
    end

    totalEnergy = totalEnergy / 13.0

    -- Dynamic Alphas based on active traveling energy
    local alphaOuter = math.min(255, math.max(0, math.floor((totalEnergy - 0.02) * 580)))
    local alphaMid = math.min(255, math.max(0, math.floor(40 + totalEnergy * 380)))
    local alphaInner = math.min(245, math.max(0, math.floor(60 + totalEnergy * 320)))
    local alphaCore = math.min(255, math.max(180, math.floor(200 + totalEnergy * 80)))

    -- 3. Construct Spline Paths for the 4 layers
    updateLayer("MeterRibbonOuter", "RibbonOuterPath", S_Outer, "210,0,160,35", "255,0,180," .. alphaOuter, "3.6", disp)
    updateLayer("MeterRibbonMid", "RibbonMidPath", S_Mid, "0,160,255,40", "0,225,255," .. alphaMid, "3.0", disp)
    updateLayer("MeterRibbonInner", "RibbonInnerPath", S_Inner, "0,230,110,45", "0,255,130," .. alphaInner, "2.2", disp)
    updateLayer("MeterRibbonCore", "RibbonCorePath", S_Core, "0,0,0,0", "255,255,255," .. alphaCore, "1.6", disp)

    return totalEnergy
end

function updateLayer(meterName, pathName, scale, fillColor, strokeColor, strokeWidth, disp)
    local ptX, ptY = {}, {}

    for i = 0, 23 do
        local ang = angles_deg[i]
        local rad = math.rad(ang)
        local cos_v = math.cos(rad)
        local sin_v = math.sin(rad)

        local h = disp[i] or 0.0
        local r_curr = R + h * scale
        ptX[i] = CX + r_curr * cos_v
        ptY[i] = CY + r_curr * sin_v
    end

    -- Midpoints for smooth C1 quadratic bezier spline
    local midX, midY = {}, {}
    for i = 0, 23 do
        local next_i = (i + 1) % 24
        local ang_i = angles_deg[i]
        local ang_next = angles_deg[next_i]
        
        local diff = (ang_next - ang_i)
        if diff > 180 then diff = diff - 360 elseif diff < -180 then diff = diff + 360 end
        local mid_ang = (ang_i + diff / 2) % 360
        local mid_rad = math.rad(mid_ang)

        local h_mid = ((disp[i] or 0.0) + (disp[next_i] or 0.0)) * 0.5
        local r_mid = R + h_mid * scale
        midX[i] = CX + r_mid * math.cos(mid_rad)
        midY[i] = CY + r_mid * math.sin(mid_rad)
    end

    -- Build Shape string & Path string separately
    local shapeStr = "Path " .. pathName .. " | Fill Color " .. fillColor .. " | Stroke Color " .. strokeColor .. " | StrokeWidth " .. strokeWidth
    local pathDef = string.format("%.2f, %.2f", midX[23], midY[23])
    
    for i = 0, 23 do
        pathDef = pathDef .. string.format(" | CurveTo %.2f, %.2f, %.2f, %.2f", midX[i], midY[i], ptX[i], ptY[i])
    end
    pathDef = pathDef .. " | ClosePath 1"

    SKIN:Bang("!SetOption", meterName, "Shape", shapeStr)
    SKIN:Bang("!SetOption", meterName, pathName, pathDef)
    SKIN:Bang("!UpdateMeter", meterName)
end
