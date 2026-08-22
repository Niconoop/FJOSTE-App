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
    downloadUrl = "https://openpipeclub.com/download/setup.exe"
    portableUrl = "https://openpipeclub.com/download/portable.exe"
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

    write-host ""
    write-host "======================================="
    write-host "FERTIG! Release v$version ist online auf Cloudflare R2!"
    write-host "======================================="
} catch {
    write-error "Cloudflare R2 Upload fehlgeschlagen oder wrangler nicht verfuegbar: $_"
    exit 1
}
