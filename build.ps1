# build.ps1 - Clean isolated Lively Wallpaper ZIP packager (ASCII only)
param(
    [switch]$PackageZip,
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"
Push-Location -Path $PSScriptRoot
try {

Write-Host "== [1/4] Validate LivelyInfo.json metadata =="
$infoPath = Join-Path $PSScriptRoot "LivelyInfo.json"
if (-not (Test-Path $infoPath)) { throw "Missing LivelyInfo.json" }
$info = Get-Content -Path $infoPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($info.FileName -ne "index.html") { throw "LivelyInfo.json FileName must be 'index.html', got '$($info.FileName)'" }
if (-not $info.AppVersion.StartsWith($Version)) {
    throw "Version mismatch: LivelyInfo.json AppVersion '$($info.AppVersion)' does not start with '$Version'"
}
Write-Host "Metadata OK: Title='$($info.Title)' AppVersion='$($info.AppVersion)'"

Write-Host "== [2/4] Stage clean runtime files =="
$releasesDir = Join-Path $PSScriptRoot "releases"
New-Item -ItemType Directory -Path $releasesDir -Force | Out-Null
$zipName = "Lively_AOD_Music_Hub_v${Version}.zip"
$zipPath = Join-Path $releasesDir $zipName
Remove-Item -Force $zipPath -ErrorAction SilentlyContinue

$stageDir = Join-Path $PSScriptRoot "build\_package_stage"
if (Test-Path $stageDir) { Remove-Item -Recurse -Force $stageDir }
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

foreach ($folder in @("assets", "css", "js", "tools")) {
    $src = Join-Path $PSScriptRoot $folder
    if (Test-Path $src) {
        Copy-Item -Recurse -Force $src (Join-Path $stageDir $folder)
    }
}
foreach ($file in @("LivelyInfo.json", "index.html", "README.md", "LICENSE")) {
    $src = Join-Path $PSScriptRoot $file
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $stageDir $file)
    }
}

Write-Host "== [3/4] Compress to $zipPath =="
Compress-Archive -Path "$stageDir\*" -DestinationPath $zipPath -CompressionLevel Optimal -Force
Remove-Item -Recurse -Force (Join-Path $PSScriptRoot "build") -ErrorAction SilentlyContinue

Write-Host "== [4/4] Audit ZIP contents for purity =="
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $entries = $zip.Entries | ForEach-Object { $_.FullName -replace '\\', '/' }
    if ($entries -notcontains "LivelyInfo.json") { throw "ZIP root missing LivelyInfo.json" }
    if ($entries -notcontains "index.html") { throw "ZIP root missing index.html" }

    $forbidden = @("tests/", "docs/", "releases/", "scratch/", ".git/", "node_modules/", ".log", ".bak", ".tmp")
    foreach ($entry in $entries) {
        foreach ($bad in $forbidden) {
            if ($entry.Contains($bad)) {
                throw "Forbidden dev/temp entry found inside release ZIP: $entry"
            }
        }
    }
    $sizeKB = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
    Write-Host "PACKAGED CLEAN RELEASE ZIP: $zipPath ($($entries.Count) entries, $sizeKB KB)"
} finally {
    $zip.Dispose()
}
} finally {
    Pop-Location
}
