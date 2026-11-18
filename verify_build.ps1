# verify_build.ps1 - Automated unit, 144Hz GPU benchmark, and ZIP integrity verification (ASCII only)
param(
    [string]$Version = "1.0.0",
    [string]$ZipPath = ""
)

$ErrorActionPreference = "Stop"
Push-Location -Path $PSScriptRoot
try {

if (-not $ZipPath) {
    $ZipPath = Join-Path $PSScriptRoot "releases\Lively_AOD_Music_Hub_v${Version}.zip"
}

Write-Host "== [1/4] Verify LivelyInfo.json & browser extension manifest versions =="
$info = Get-Content -Path (Join-Path $PSScriptRoot "LivelyInfo.json") -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $info.AppVersion.StartsWith($Version)) {
    throw "LivelyInfo.json AppVersion '$($info.AppVersion)' does not match '$Version'"
}
if ($info.Arguments -ne "--audio --system-nowplaying") {
    throw "LivelyInfo.json Arguments unexpected: '$($info.Arguments)'"
}
$extManifest = Get-Content -Path (Join-Path $PSScriptRoot "tools\browser_sync_extension\manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
if ($extManifest.version -ne $Version) {
    throw "Extension manifest.json version '$($extManifest.version)' does not match '$Version'"
}
Write-Host "Manifest versions OK ($Version)"

Write-Host "== [2/4] Run modular Node.js unit test suites =="
foreach ($testFile in @("tests\test_lyrics.js", "tests\test_rendering.js", "tests\test_session.js")) {
    Write-Host "Running $testFile ..."
    & node $testFile
    if ($LASTEXITCODE -ne 0) {
        throw "Unit test failed: $testFile (exit code $LASTEXITCODE)"
    }
}

Write-Host "== [3/4] Run Headless Edge WebGL2 GPU & CPU benchmark =="
& node "tests\run_perf_test.js"
if ($LASTEXITCODE -ne 0) {
    throw "Headless Edge benchmark failed (exit code $LASTEXITCODE)"
}

Write-Host "== [4/4] Verify packaged ZIP integrity =="
if (-not (Test-Path $ZipPath)) {
    throw "Packaged ZIP not found at $ZipPath. Run .\build.ps1 -PackageZip first."
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $ZipPath).Path)
try {
    $entries = $zip.Entries | ForEach-Object { $_.FullName -replace '\\', '/' }
    foreach ($req in @("LivelyInfo.json", "index.html", "css/style.css", "js/app.js", "js/starfield_engine.js", "js/aura_beam.js", "js/lyrics_engine.js", "js/playback_session.js", "js/audio_listener.js")) {
        if ($entries -notcontains $req) {
            throw "Required runtime file missing from ZIP: $req"
        }
    }
    Write-Host "ZIP verification OK: $ZipPath ($($entries.Count) entries)"
} finally {
    $zip.Dispose()
}

Write-Host "ALL LIVELY AOD MUSIC HUB VERIFICATION CHECKS PASSED"
} finally {
    Pop-Location
}
