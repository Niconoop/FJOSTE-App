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

# 2. Verify version is the top entry in CHANGELOG.md
$changelogPath = "../CHANGELOG.md"
if (-not (Test-Path $changelogPath)) {
    $changelogPath = "CHANGELOG.md"
}

if (Test-Path $changelogPath) {
    $lines = Get-Content -Encoding UTF8 $changelogPath
    $topVersion = ""
    foreach ($line in $lines) {
        if ($line -match "^##\s*\[?v?([0-9]+\.[0-9]+\.[0-9]+)\]?") {
            $topVersion = $Matches[1]
            break
        }
    }

    if ($topVersion -and ($topVersion -ne $version)) {
        write-error "Die Version v$version aus package.json stimmt nicht mit der neuesten Version v$topVersion im CHANGELOG.md ueberein! Bitte pflege die Version v$version zuerst als obersten Eintrag im CHANGELOG.md ein."
        exit 1
    }
    write-host "Version v$version erfolgreich im CHANGELOG.md validiert."
} else {
    write-warning "Kein CHANGELOG.md gefunden. Ueberspringe Version-Validierung."
}

# 3. Extract the latest changelog entry from CHANGELOG.md
$releaseBody = ""
if (Test-Path $changelogPath) {
    $lines = Get-Content -Encoding UTF8 $changelogPath
    $started = $false
    $changelogLines = @()
    foreach ($line in $lines) {
        if ($line -match "^##\s") {
            if (-not $started) {
                $started = $true
                continue
            } else {
                break
            }
        }
        if ($started) {
            $changelogLines += $line
        }
    }
    if ($changelogLines.Count -gt 0) {
        $releaseBody = ($changelogLines -join "`n").Trim()
    }
}

if (-not $releaseBody) {
    $releaseBody = "Release fuer Version v$version. Automatisch hochgeladen durch das Cloudflare R2 Upload Tool."
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

Set-Content -Path "dist-app/latest.json" -Value $latestManifest -Encoding UTF8

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
