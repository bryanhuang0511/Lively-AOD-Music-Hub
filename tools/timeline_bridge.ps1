# ============================================================================
# 🌌 Lively AOD Music Hub - Real-Time Timeline & Fast-Forward Sync Bridge
# ============================================================================
# Breaks Lively Wallpaper's native GSMTC limitation by exposing real-time
# playback Position (seconds), Duration, and Play/Pause state on:
#   GET  http://127.0.0.1:8974/timeline
#   POST http://127.0.0.1:8974/push     (from optional Browser Extension)
# ============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await-WinRT($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(1500) | Out-Null
    if ($netTask.IsCompleted) { return $netTask.Result }
    return $null
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
$sessionManager = Await-WinRT ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

# State from optional Browser Extension direct <video> hook
$script:browserPush = @{
    timestamp = [DateTimeOffset]::MinValue
    title     = ""
    artist    = ""
    position  = 0.0
    duration  = 0.0
    isPlaying = $false
}

function Get-LiveTimelineState {
    $now = [DateTimeOffset]::Now

    # 1. If Browser Extension pushed direct <video>.currentTime within last 2.5s, prefer it (1ms precision!)
    if (($now - $script:browserPush.timestamp).TotalSeconds -lt 2.5 -and $script:browserPush.title) {
        $elapsed = if ($script:browserPush.isPlaying) { ($now - $script:browserPush.timestamp).TotalSeconds } else { 0.0 }
        return @{
            active    = $true
            source    = "browser_extension"
            title     = $script:browserPush.title
            artist    = $script:browserPush.artist
            position  = [math]::Round($script:browserPush.position + $elapsed, 3)
            duration  = [math]::Round($script:browserPush.duration, 2)
            isPlaying = [bool]$script:browserPush.isPlaying
        }
    }

    # 2. Otherwise read Windows 10/11 GSMTC TimelineProperties directly
    if (-not $sessionManager) {
        return @{ active = $false }
    }

    $session = $sessionManager.GetCurrentSession()
    if (-not $session) {
        return @{ active = $false }
    }

    try {
        $info = Await-WinRT ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        $tl = $session.GetTimelineProperties()
        $pb = $session.GetPlaybackInfo()

        $isPlaying = ($pb.PlaybackStatus.ToString() -eq 'Playing')
        $rawPos = $tl.Position.TotalSeconds
        $endSec = $tl.EndTime.TotalSeconds

        $realPos = $rawPos
        if ($isPlaying -and $tl.LastUpdatedTime.Year -gt 2000) {
            $delta = ($now - $tl.LastUpdatedTime).TotalSeconds
            if ($delta -ge 0 -and $delta -lt 3600) {
                $realPos = $rawPos + $delta
            }
        }
        if ($endSec -gt 0 -and $realPos -gt $endSec) {
            $realPos = $endSec
        }

        return @{
            active    = $true
            source    = "windows_gsmtc"
            title     = if ($info) { [string]$info.Title } else { "" }
            artist    = if ($info) { [string]$info.Artist } else { "" }
            album     = if ($info) { [string]$info.AlbumTitle } else { "" }
            position  = [math]::Round($realPos, 3)
            duration  = [math]::Round($endSec, 2)
            isPlaying = $isPlaying
        }
    } catch {
        return @{ active = $false }
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:8974/")
$listener.Start()
Write-Host "🌌 Lively AOD Timeline Bridge listening on http://127.0.0.1:8974/timeline ..."

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $res.Headers.Add("Access-Control-Allow-Origin", "*")
        $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
        $res.ContentType = "application/json; charset=utf-8"

        if ($req.HttpMethod -eq "OPTIONS") {
            $res.StatusCode = 204
            $res.Close()
            continue
        }

        if ($req.HttpMethod -eq "POST" -and $req.Url.AbsolutePath -eq "/push") {
            try {
                $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                $data = $body | ConvertFrom-Json
                if ($data) {
                    $script:browserPush.timestamp = [DateTimeOffset]::Now
                    $script:browserPush.title     = [string]$data.title
                    $script:browserPush.artist    = [string]$data.artist
                    $script:browserPush.position  = [double]$data.position
                    $script:browserPush.duration  = [double]$data.duration
                    $script:browserPush.isPlaying = [bool]$data.isPlaying
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $res.StatusCode = 400
            }
            $res.Close()
            continue
        }

        $state = Get-LiveTimelineState
        $json = $state | ConvertTo-Json -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
    }
} finally {
    $listener.Stop()
}
