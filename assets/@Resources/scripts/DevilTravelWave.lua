-- ==========================================================
-- 😈 BABYMONSTER - 2D Dual-Wing Traveling Wave Engine (Fixed Arc Return)
-- Two independent glowing demon wings (Left & Right) with
-- 100% perimeter-snapped center dip (270 deg) touching circle directly (r=R),
-- dynamic wave packets climbing from horizontal to vertical,
-- and multi-layer soft crimson bloom & laser highlight!
-- ==========================================================

local CX, CY, R
local S_Bloom, S_Plasma, S_Core, S_Highlight
local Packets = {}
local NextSpawnTick = 0
local CurrentTick = 0

-- 7 angle nodes for Left Wing (180 to 270 deg)
local left_angles = {180, 195, 210, 225, 240, 255, 270}
-- 7 angle nodes for Right Wing (0 to 270 deg)
local right_angles = {0, 345, 330, 315, 300, 285, 270}

-- Explicit return arc angles along circle perimeter:
-- Left return: 270 down to 180 deg (255, 240, 225, 210, 195, 180)
local left_return_angles = {255, 240, 225, 210, 195, 180}
-- Right return: 270 down to 360/0 deg (285, 300, 315, 330, 345, 360)
local right_return_angles = {285, 300, 315, 330, 345, 360}

-- Normalized phi position in [0, 1] for the 7 nodes (0 at equator, 1 at 270 dip)
local phi_nodes = {0.0, 0.167, 0.333, 0.500, 0.667, 0.833, 1.0}

function envelope(phi)
    if phi <= 0.0 or phi >= 1.0 then return 0.0 end
    return (math.sin(phi * math.pi) ^ 1.2) * (0.85 + 1.45 * phi)
end

function Initialize()
    CX = tonumber(SKIN:GetVariable("CX", "320"))
    CY = tonumber(SKIN:GetVariable("CY", "340"))
    R = tonumber(SKIN:GetVariable("R", "96"))

    S_Bloom = tonumber(SKIN:GetVariable("S_Bloom", "94"))
    S_Plasma = tonumber(SKIN:GetVariable("S_Plasma", "70"))
    S_Core = tonumber(SKIN:GetVariable("S_Core", "46"))
    S_Highlight = tonumber(SKIN:GetVariable("S_Highlight", "24"))

    Packets = {}
    CurrentTick = 0
    NextSpawnTick = 0
end

function Update()
    CurrentTick = CurrentTick + 1

    -- 1. Read audio measures
    local mAudio = SKIN:GetMeasure("MeasureAudioRaw")
    local mS10 = SKIN:GetMeasure("S10")
    local mBass = SKIN:GetMeasure("MeasureBass")

    local rawLevel = mAudio and mAudio:GetValue() or 0.0
    local treble = mS10 and mS10:GetValue() or 0.0
    local bass = mBass and mBass:GetValue() or 0.0

    local instantEnergy = rawLevel * 0.40 + treble * 0.45 + bass * 0.20

    -- 2. Spawn traveling wave packets from horizontal equator (phi=0)
    if instantEnergy > 0.02 and CurrentTick >= NextSpawnTick then
        table.insert(Packets, {
            pos = 0.0,
            speed = 0.048,
            amp = math.min(1.8, instantEnergy * 2.2),
            sigma = 0.22
        })
        NextSpawnTick = CurrentTick + 3
    end

    -- 3. Advance all active wave packets
    local alivePackets = {}
    for _, p in ipairs(Packets) do
        p.pos = p.pos + p.speed
        if p.pos < 1.15 then
            table.insert(alivePackets, p)
        end
    end
    Packets = alivePackets

    -- 4. Calculate traveling displacement along the 7 nodes
    local disp = {}
    local maxDisp = 0.0

    for k = 1, 7 do
        local phi = phi_nodes[k]
        if phi <= 0.0 or phi >= 1.0 then
            disp[k] = 0.0
        else
            local dSum = 0.0
            local envVal = envelope(phi)
            for _, p in ipairs(Packets) do
                local dist = (phi - p.pos) / p.sigma
                local bump = math.exp(-(dist * dist)) * p.amp
                dSum = dSum + bump
            end
            local totalD = dSum * envVal
            disp[k] = totalD
            if totalD > maxDisp then maxDisp = totalD end
        end
    end

    -- Dynamic Alphas for layered bloom
    local alphaBloom = math.min(180, math.max(0, math.floor(maxDisp * 160)))
    local alphaPlasma = math.min(255, math.max(0, math.floor(40 + maxDisp * 360)))
    local alphaCore = math.min(255, math.max(0, math.floor(70 + maxDisp * 320)))
    local alphaHl = math.min(255, math.max(180, math.floor(190 + maxDisp * 90)))

    -- 5. Construct Left and Right Wing Paths for the 4 Layers
    updateDualWings("MeterWingsBloom", "LeftBloom", "RightBloom", S_Bloom, "140,0,10,35", "255,20,40," .. alphaBloom, "6.0", disp)
    updateDualWings("MeterWingsPlasma", "LeftPlasma", "RightPlasma", S_Plasma, "215,10,25,85", "240,15,30," .. alphaPlasma, "3.0", disp)
    updateDualWings("MeterWingsCore", "LeftCore", "RightCore", S_Core, "255,35,55,105", "255,60,80," .. alphaCore, "2.0", disp)
    updateDualWings("MeterWingsHighlight", "LeftHighlight", "RightHighlight", S_Highlight, "0,0,0,0", "255,255,255," .. alphaHl, "1.4", disp)

    return maxDisp
end

function updateDualWings(meterName, leftPathName, rightPathName, scale, fillColor, strokeColor, strokeWidth, disp)
    -- 1. Left Wing Outer Points (180 to 270 deg)
    local lX, lY = {}, {}
    for k = 1, 7 do
        local ang = left_angles[k]
        local rad = math.rad(ang)
        local h = disp[k] or 0.0
        local r_curr = R + h * scale
        lX[k] = CX + r_curr * math.cos(rad)
        lY[k] = CY + r_curr * math.sin(rad)
    end

    -- Left Midpoints for C1 bezier curve
    local lMidX, lMidY = {}, {}
    for k = 1, 6 do
        local h_mid = ((disp[k] or 0.0) + (disp[k+1] or 0.0)) * 0.5
        local mid_ang = (left_angles[k] + left_angles[k+1]) / 2.0
        local mid_rad = math.rad(mid_ang)
        local r_mid = R + h_mid * scale
        lMidX[k] = CX + r_mid * math.cos(mid_rad)
        lMidY[k] = CY + r_mid * math.sin(mid_rad)
    end

    -- Build Left Wing Path: Outer wave from (CX - R, CY) to (CX, CY - R)
    local lPath = string.format("%.2f, %.2f | CurveTo %.2f, %.2f, %.2f, %.2f", lX[1], lY[1], lMidX[1], lMidY[1], lX[1], lY[1])
    for k = 2, 6 do
        lPath = lPath .. string.format(" | CurveTo %.2f, %.2f, %.2f, %.2f", lMidX[k], lMidY[k], lX[k], lY[k])
    end
    lPath = lPath .. string.format(" | CurveTo %.2f, %.2f, %.2f, %.2f", lX[7], lY[7], lX[7], lY[7])
    
    -- Explicit return along circle perimeter from 270 back to 180 deg (NO ArcTo major-arc bug!)
    for _, ret_ang in ipairs(left_return_angles) do
        local r_rad = math.rad(ret_ang)
        local rx = CX + R * math.cos(r_rad)
        local ry = CY + R * math.sin(r_rad)
        lPath = lPath .. string.format(" | LineTo %.2f, %.2f", rx, ry)
    end
    lPath = lPath .. " | ClosePath 1"

    -- 2. Right Wing Outer Points (0 to 270 deg)
    local rX, rY = {}, {}
    for k = 1, 7 do
        local ang = right_angles[k]
        local rad = math.rad(ang)
        local h = disp[k] or 0.0
        local r_curr = R + h * scale
        rX[k] = CX + r_curr * math.cos(rad)
        rY[k] = CY + r_curr * math.sin(rad)
    end

    local rMidX, rMidY = {}, {}
    for k = 1, 6 do
        local h_mid = ((disp[k] or 0.0) + (disp[k+1] or 0.0)) * 0.5
        local a1, a2 = right_angles[k], right_angles[k+1]
        if a1 == 0 then a1 = 360 end
        local mid_ang = (a1 + a2) / 2.0
        local mid_rad = math.rad(mid_ang)
        local r_mid = R + h_mid * scale
        rMidX[k] = CX + r_mid * math.cos(mid_rad)
        rMidY[k] = CY + r_mid * math.sin(mid_rad)
    end

    -- Build Right Wing Path: Outer wave from (CX + R, CY) to (CX, CY - R)
    local rPath = string.format("%.2f, %.2f | CurveTo %.2f, %.2f, %.2f, %.2f", rX[1], rY[1], rMidX[1], rMidY[1], rX[1], rY[1])
    for k = 2, 6 do
        rPath = rPath .. string.format(" | CurveTo %.2f, %.2f, %.2f, %.2f", rMidX[k], rMidY[k], rX[k], rY[k])
    end
    rPath = rPath .. string.format(" | CurveTo %.2f, %.2f, %.2f, %.2f", rX[7], rY[7], rX[7], rY[7])

    -- Explicit return along circle perimeter from 270 back to 360/0 deg (NO ArcTo major-arc bug!)
    for _, ret_ang in ipairs(right_return_angles) do
        local r_rad = math.rad(ret_ang)
        local rx = CX + R * math.cos(r_rad)
        local ry = CY + R * math.sin(r_rad)
        rPath = rPath .. string.format(" | LineTo %.2f, %.2f", rx, ry)
    end
    rPath = rPath .. " | ClosePath 1"

    -- Set options separately without raw newlines in bang
    local shapeStr1 = "Path " .. leftPathName .. " | Fill Color " .. fillColor .. " | Stroke Color " .. strokeColor .. " | StrokeWidth " .. strokeWidth
    local shapeStr2 = "Path " .. rightPathName .. " | Fill Color " .. fillColor .. " | Stroke Color " .. strokeColor .. " | StrokeWidth " .. strokeWidth

    SKIN:Bang("!SetOption", meterName, "Shape", shapeStr1)
    SKIN:Bang("!SetOption", meterName, "Shape2", shapeStr2)
    SKIN:Bang("!SetOption", meterName, leftPathName, lPath)
    SKIN:Bang("!SetOption", meterName, rightPathName, rPath)
    SKIN:Bang("!UpdateMeter", meterName)
end
