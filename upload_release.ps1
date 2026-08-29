# PowerShell Script to automate Cloudflare R2 Release Upload

$ErrorActionPreference = "Stop"

write-host "======================================="
write-host "  CLOUDFLARE R2 RELEASE UPLOADER"
write-host "======================================="
write-host ""

# 1. Load version from package.json
if (-not (Test-Path "package.json")) {
    write-error "package.json nicht gefunden! Bitte stelle sicher, dass du das Skript aus dem opc-app Ordner aufrufst."
    exit 1
}

$packageJson = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
$version = $packageJson.version

write-host "Erkannte App-Version: v$version"

# 2. Extract changelog for version v$version from CHANGELOG.md (if available)
$changelogPath = "../CHANGELOG.md"
if (-not (Test-Path $changelogPath)) {
    $changelogPath = "CHANGELOG.md"
}

$releaseBody = ""

if (Test-Path $changelogPath) {
    $lines = Get-Content -Encoding UTF8 $changelogPath
    $matchingVersionFound = $false
    $changelogLines = @()

    foreach ($line in $lines) {
        if ($line -match "^##\s*\[?v?([0-9]+\.[0-9]+\.[0-9]+)\]?") {
            $parsedVersion = $Matches[1]
            if ($parsedVersion -eq $version) {
                $matchingVersionFound = $true
                continue
            } elseif ($matchingVersionFound) {
                # Reached the next version section header
                break
            }
        }
        if ($matchingVersionFound) {
            $changelogLines += $line
        }
    }

    if ($matchingVersionFound -and $changelogLines.Count -gt 0) {
        $releaseBody = ($changelogLines -join "`n").Trim()
        write-host "Changelog fuer Version v$version erfolgreich aus CHANGELOG.md geladen."
    } else {
        write-warning "Kein passender Eintrag fuer Version v$version im CHANGELOG.md gefunden. Verwende Standard-Changelog ('Bugfixes und Performance-Optimierungen')."
    }
} else {
    write-warning "Kein CHANGELOG.md gefunden. Verwende Standard-Changelog ('Bugfixes und Performance-Optimierungen')."
}

if (-not $releaseBody) {
    $releaseBody = "Bugfixes und Performance-Optimierungen."
}

# 4. Generate Manifest (latest.json)
if (-not (Test-Path "dist-app")) {
    New-Item -ItemType Directory -Path "dist-app" -Force | Out-Null
}

$latestManifest = @{
    latestVersion = $version
    version = $version
    releaseNotes = $releaseBody
    pub_date = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    downloadUrl = "https://open-pipe-club-backend.nicohertling09.workers.dev/api/updates/download/setup.exe"
    portableUrl = "https://open-pipe-club-backend.nicohertling09.workers.dev/api/updates/download/portable.exe"
} | ConvertTo-Json -Depth 5

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "dist-app/latest.json"), $latestManifest, $utf8NoBom)

# 5. Upload Manifest & Assets to Cloudflare R2
write-host ""
write-host "[Cloudflare R2] Lade Release zu Cloudflare R2 hoch..."

try {
    write-host "Lade releases/latest.json zu R2..."
    npx wrangler r2 object put "open-pipe-club-storage/releases/latest.json" --file="dist-app/latest.json" --remote

    if (Test-Path "dist-app/Open Pipe Club App Setup.exe") {
        write-host "Lade releases/latest/setup.exe zu R2..."
        npx wrangler r2 object put "open-pipe-club-storage/releases/latest/setup.exe" --file="dist-app/Open Pipe Club App Setup.exe" --remote
        npx wrangler r2 object put "open-pipe-club-storage/releases/v$version/setup.exe" --file="dist-app/Open Pipe Club App Setup.exe" --remote
        write-host "[OK] Setup.exe hochgeladen."
    } else {
        write-warning "Setup.exe nicht in dist-app/ gefunden."
    }

    if (Test-Path "dist-app/Open Pipe Club App.exe") {
        write-host "Lade releases/latest/portable.exe zu R2..."
        npx wrangler r2 object put "open-pipe-club-storage/releases/latest/portable.exe" --file="dist-app/Open Pipe Club App.exe" --remote
        npx wrangler r2 object put "open-pipe-club-storage/releases/v$version/portable.exe" --file="dist-app/Open Pipe Club App.exe" --remote
        write-host "[OK] Portable.exe hochgeladen."
    } else {
        write-warning "Portable.exe nicht in dist-app/ gefunden."
    }

    # Upload OPCGameBridge plugin if compiled
    $pluginDll = "../OPCGameBridge/x64/Release/OPCGameBridge.dll"
    if (Test-Path $pluginDll) {
        write-host "Lade OPCGameBridge Plugin zu R2 hoch..."
        $pluginHash = (Get-FileHash -Path $pluginDll -Algorithm SHA256).Hash.ToLower()
        $pluginSize = (Get-Item $pluginDll).Length
        $pluginManifest = @{
            pluginVersion = $version
            version = $version
            name = "OPCGameBridge"
            sha256 = $pluginHash
            size = $pluginSize
            pub_date = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
            downloadUrl = "https://open-pipe-club-backend.nicohertling09.workers.dev/api/plugin/download/OPCGameBridge.dll"
            iniUrl = "https://open-pipe-club-backend.nicohertling09.workers.dev/api/plugin/download/OPCGameBridge.ini"
            releaseNotes = "OPCGameBridge C++ Plugin fuer ETS2 / ATS"
        } | ConvertTo-Json -Depth 5
        [System.IO.File]::WriteAllText((Join-Path (Get-Location) "dist-app/plugin_latest.json"), $pluginManifest, $utf8NoBom)
        npx wrangler r2 object put "open-pipe-club-storage/plugins/latest.json" --file="dist-app/plugin_latest.json" --remote
        npx wrangler r2 object put "open-pipe-club-storage/plugins/OPCGameBridge.dll" --file="$pluginDll" --remote
        $pluginIni = "../OPCGameBridge/x64/Release/OPCGameBridge.ini"
        if (Test-Path $pluginIni) {
            npx wrangler r2 object put "open-pipe-club-storage/plugins/OPCGameBridge.ini" --file="$pluginIni" --remote
        }
        write-host "[OK] OPCGameBridge Plugin hochgeladen."
    }

    write-host ""
    write-host "======================================="
    write-host "FERTIG! Release v$version ist online auf Cloudflare R2!"
    write-host "======================================="
} catch {
    write-error "Cloudflare R2 Upload fehlgeschlagen oder wrangler nicht verfuegbar: $_"
    exit 1
}
