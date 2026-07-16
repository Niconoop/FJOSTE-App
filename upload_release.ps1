# PowerShell Script to automate GitHub Release creation and asset upload

$ErrorActionPreference = "Stop"

write-host "======================================="
write-host "  GITHUB AUTOMATED RELEASE CREATOR"
write-host "======================================="
write-host ""

# 1. Load version from package.json
if (-not (Test-Path "package.json")) {
    write-error "package.json nicht gefunden! Bitte stelle sicher, dass du das Skript aus dem openpipeclub-app Ordner aufrufst."
    exit 1
}

$packageJson = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
$version = $packageJson.version
$repo = "Niconoop/Open-Pipe-Club-App"
$tokenFile = "../.github_token"

write-host "Erkannte App-Version: v$version"

# 2. Manage GitHub Token (PAT)
$token = ""
if (Test-Path $tokenFile) {
    $token = (Get-Content $tokenFile -Raw).Trim()
}

if (-not $token) {
    write-host "Kein gespeicherter GitHub Personal Access Token (PAT) gefunden."
    write-host "Bitte erstelle einen Token unter: https://github.com/settings/tokens"
    write-host "Der Token benoetigt das Recht 'repo'."
    write-host ""
    $token = Read-Host -Prompt "GitHub PAT (Token) eingeben"
    if (-not $token) {
        write-error "Kein Token angegeben. Vorgang abgebrochen."
        exit 1
    }
    $token = $token.Trim()
    $token | Out-File -FilePath $tokenFile -NoNewline -Encoding utf8
    write-host "Token wurde lokal in .github_token gespeichert (wird von Git ignoriert)."
}

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

# 2.5. Verify version is the top entry in CHANGELOG.md
$changelogPath = "../CHANGELOG.md"
if (-not (Test-Path $changelogPath)) {
    write-error "CHANGELOG.md nicht gefunden! Bitte stelle sicher, dass die Datei im Hauptverzeichnis existiert."
    exit 1
}

# Read lines of CHANGELOG.md to find the first version header
$lines = Get-Content -Encoding UTF8 $changelogPath
$topVersion = ""
foreach ($line in $lines) {
    if ($line -match "^##\s*\[?v?([0-9]+\.[0-9]+\.[0-9]+)\]?") {
        $topVersion = $Matches[1]
        break
    }
}

if ($topVersion -ne $version) {
    write-error "Die Version v$version aus package.json stimmt nicht mit der neuesten Version v$topVersion im CHANGELOG.md ueberein! Bitte pflege die Version v$version zuerst als obersten Eintrag im CHANGELOG.md ein."
    exit 1
}

write-host "Version v$version erfolgreich als oberster Eintrag im CHANGELOG.md validiert."

# 3. Create and push Git Tag
write-host ""
write-host "[1/3] Erstelle Git-Tag v$version..."
try {
    # Check if tag already exists and delete it locally/remotely to allow overwrite if needed
    git tag -d "v$version" 2>$null
    git push origin :refs/tags/"v$version" 2>$null
} catch {}

try {
    git tag -a "v$version" -m "Release v$version"
    git push origin "v$version"
    write-host "[OK] Tag v$version erfolgreich gepusht."
} catch {
    write-warning "Git-Tag konnte nicht erstellt/gepusht werden. Eventuell existiert es bereits."
}

# 4. Extract the latest changelog entry from CHANGELOG.md
$releaseBody = ""
$changelogPath = "../CHANGELOG.md"
if (Test-Path $changelogPath) {
    $lines = Get-Content -Encoding UTF8 $changelogPath
    $started = $false
    $changelogLines = @()
    foreach ($line in $lines) {
        # Match the first header starting with ## (the latest version entry)
        if ($line -match "^##\s") {
            if (-not $started) {
                $started = $true
                continue
            } else {
                # We reached the second ## header, so stop
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
    $releaseBody = "Release fuer Version v$version. Automatisch hochgeladen durch das Open Pipe Club Upload Tool."
}

# 5. Create Release on GitHub
write-host ""
write-host "[2/3] Erstelle GitHub-Release v$version..."
$bodyJson = @{
    tag_name = "v$version"
    target_commitish = "main"
    name = "v$version"
    body = $releaseBody
    draft = $false
    prerelease = $false
} | ConvertTo-Json

# Convert JSON to a UTF-8 byte array to prevent PowerShell 5.1 from mangling German characters (umlauts/eszett)
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)

# Check if release already exists, delete it if so to allow clean re-upload
try {
    $checkUrl = "https://api.github.com/repos/$repo/releases/tags/v$version"
    $existingRelease = Invoke-RestMethod -Uri $checkUrl -Method Get -Headers $headers -ErrorAction SilentlyContinue
    if ($existingRelease) {
        write-host "Existierendes Release v$version gefunden. Loesche altes Release..."
        $deleteUrl = "https://api.github.com/repos/$repo/releases/$($existingRelease.id)"
        Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $headers
    }
} catch {}

# Post new release
$response = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases" -Method Post -Headers $headers -Body $bodyBytes -ContentType "application/json; charset=utf-8"
$uploadUrl = $response.upload_url -replace '\{\?name,label\}', ''
write-host "[OK] Release v$version auf GitHub erstellt."

# 5. Upload Assets (.exe files)
write-host ""
write-host "[3/3] Lade Setup- und Portable-Dateien hoch..."

$files = @(
    "dist-app/Open Pipe Club App Setup.exe",
    "dist-app/Open Pipe Club App.exe"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $fileName = Split-Path $file -Leaf
        write-host "Lese Datei: $fileName..."
        $fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $file))
        
        write-host "Lade hoch: $fileName..."
        $uploadHeaders = @{
            "Authorization" = "token $token"
            "Content-Type" = "application/octet-stream"
        }
        
        $uploadResponse = Invoke-RestMethod -Uri "$($uploadUrl)?name=$fileName" -Method Post -Headers $uploadHeaders -Body $fileBytes
        write-host "[OK] $fileName erfolgreich hochgeladen."
    } else {
        write-warning "Datei nicht gefunden: $file. Bitte stelle sicher, dass du zuerst 'npm run dist' ausgefuehrt hast."
    }
}

write-host ""
write-host "======================================="
write-host "FERTIG! Release v$version ist online."
write-host "======================================="
