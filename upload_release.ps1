# PowerShell Script to automate GitHub Release creation and asset upload

$ErrorActionPreference = "Stop"

write-host "======================================="
write-host "  GITHUB AUTOMATED RELEASE CREATOR"
write-host "======================================="
write-host ""

# 1. Load version from package.json
if (-not (Test-Path "package.json")) {
    write-error "package.json nicht gefunden! Bitte stelle sicher, dass du das Skript aus dem fjoste-app Ordner aufrufst."
    exit 1
}

$packageJson = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
$version = $packageJson.version
$repo = "Niconoop/FJOSTE-App"
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

# 2.2. Manage Gemini API Key (for AI changelog generation)
$geminiKeyFile = "../.gemini_key"
$geminiKey = ""
if (Test-Path $geminiKeyFile) {
    $geminiKey = (Get-Content $geminiKeyFile -Raw).Trim()
}

if (-not $geminiKey) {
    write-host "Kein gespeicherter Gemini API Key gefunden."
    write-host "Bitte erstelle einen kostenlosen API-Key unter: https://aistudio.google.com/"
    write-host ""
    $geminiKey = Read-Host -Prompt "Gemini API Key eingeben"
    if (-not $geminiKey) {
        write-error "Kein Gemini API Key angegeben. AI-Changelog-Generierung abgebrochen."
        exit 1
    }
    $geminiKey = $geminiKey.Trim()
    $geminiKey | Out-File -FilePath $geminiKeyFile -NoNewline -Encoding utf8
    write-host "Key wurde lokal in .gemini_key gespeichert."
}


# 2.5. Generate and push CHANGELOG.md if not already present
$changelogPath = "../CHANGELOG.md"
if (Test-Path $changelogPath) {
    $currentChangelog = Get-Content -Raw -Encoding UTF8 $changelogPath
    # Check if the version header is already in the file (supporting ## [1.0.2] or ## 1.0.2 or ## [v1.0.2] formats)
    if ($currentChangelog -notmatch "##\s*\[?v?$($version.Replace('.', '\.'))\]?") {
        write-host "Version v$version nicht im CHANGELOG.md gefunden. Generiere automatischen Eintrag..."
        
        # Get the previous tag name to gather commits since then
        $lastTag = ""
        try {
            $tags = git tag --sort=-v:refname
            foreach ($t in $tags) {
                # Look for a tag that is not the current version tag
                if ($t -ne "v$version" -and $t -ne $version) {
                    $lastTag = $t
                    break
                }
            }
        } catch {}
        
        # Generate Git Diff to analyze changes (excluding lockfiles, built outputs, etc.)
        $gitDiff = ""
        try {
            if ($lastTag) {
                write-host "Generiere Git-Diff zwischen $lastTag und HEAD..."
                $gitDiff = git diff "$lastTag..HEAD" -- . ":(exclude)package-lock.json" ":(exclude)*.map" ":(exclude)dist*" ":(exclude)node_modules*"
            } else {
                write-host "Kein vorheriger Tag gefunden. Generiere Diff der letzten 5 Commits..."
                $gitDiff = git diff "HEAD~5..HEAD" -- . ":(exclude)package-lock.json" ":(exclude)*.map" ":(exclude)dist*" ":(exclude)node_modules*"
            }
        } catch {
            write-warning "Git-Diff konnte nicht generiert werden."
        }

        # Query Gemini API to summarize changes
        $releaseBody = ""
        if ($gitDiff) {
            write-host "Rufe Gemini API auf, um Änderungen automatisch zu analysieren und zusammenzufassen..."
            try {
                $prompt = @"
Du bist ein professioneller Release-Manager. Deine Aufgabe ist es, aus dem folgenden Git-Diff ein übersichtliches, gut strukturiertes und professionelles Changelog in deutscher Sprache für die App-Version v$version zu generieren.

Regeln:
1. Gruppiere die Änderungen in die folgenden Abschnitte (nur wenn relevante Änderungen vorhanden sind):
   - ### 🚀 Neue Features
   - ### 🐛 Fehlerbehebungen
   - ### 🗑️ Entfernt
   - ### 🔄 Änderungen und Verbesserungen
2. Schreibe für jede Änderung einen kurzen, prägnanten Stichpunkt auf Deutsch.
3. Nenne konkrete technische Verbesserungen (z. B. welche Dateipfade, APIs oder Funktionen geändert wurden), aber halte es für Anwender verständlich.
4. Ignoriere rein kosmetische Änderungen (wie Leerzeilen, Formatierung, kleine Kommentar-Updates), es sei denn, sie sind wichtig.
5. Gib NUR das reine Markdown zurück (keine Code-Blöcke drumherum, fange direkt mit den Überschriften an).

Hier ist der Git-Diff:
$gitDiff
"@

                $body = @{
                    contents = @(
                        @{
                            parts = @(
                                @{
                                    text = $prompt
                                }
                            )
                        }
                    )
                } | ConvertTo-Json -Depth 10

                $uri = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$geminiKey"
                $response = Invoke-RestMethod -Uri $uri -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType "application/json; charset=utf-8"
                
                $releaseBody = $response.candidates[0].content.parts[0].text
                
                # Strip markdown code block wrappers if Gemini included them
                if ($releaseBody -match '(?s)^\s*```(?:markdown)?\r?\n?(.*?)\s*```\s*$') {
                    $releaseBody = $Matches[1].Trim()
                }
                $releaseBody = $releaseBody.Trim()
            } catch {
                write-warning "Fehler bei der Kommunikation mit der Gemini API: $_"
            }
        }

        if (-not $releaseBody) {
            write-host "Gemini-Changelog fehlgeschlagen. Nutze Fallback..."
            $releaseBody = "### 🔄 Änderungen und Verbesserungen`r`n- Wartungsarbeiten und kleinere Verbesserungen"
        }

        # Format the new entry
        $dateStr = Get-Date -Format "dd-MM-yyyy"
        $newEntry = "## [$version] - $dateStr`r`n`r`n" + $releaseBody + "`r`n`r`n"
        
        # Prepend entry to the existing changelog content
        $updatedChangelog = $newEntry + $currentChangelog
        [System.IO.File]::WriteAllText((Resolve-Path $changelogPath), $updatedChangelog, [System.Text.Encoding]::UTF8)
        write-host "[OK] CHANGELOG.md erfolgreich mit $commitCount Eintraegen aktualisiert."
        
        # Commit and push updated CHANGELOG.md to the current branch using the parent repository context
        try {
            write-host "Committe und pushe aktualisierten CHANGELOG.md..."
            $branch = (git -C .. branch --show-current).Trim()
            if (-not $branch) { $branch = "main" }
            git -C .. add CHANGELOG.md
            git -C .. commit -m "docs: update CHANGELOG.md for v$version [skip ci]"
            git -C .. push origin $branch
            write-host "[OK] CHANGELOG.md committed and pushed to origin/$branch."
        } catch {
            write-warning "Fehler beim Committen/Pushen des CHANGELOG.md: $_"
        }
    } else {
        write-host "Version v$version bereits im CHANGELOG.md vorhanden."
    }
}

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
    $releaseBody = "Release fuer Version v$version. Automatisch hochgeladen durch das FJOSTE Upload Tool."
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
    "dist-app/FJOSTE App Setup.exe",
    "dist-app/FJOSTE App.exe"
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
